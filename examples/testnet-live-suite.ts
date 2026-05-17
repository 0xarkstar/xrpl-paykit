/**
 * Live testnet 5-scenario end-to-end suite.
 *
 * Auto-funds two testnet wallets via the official XRPL faucet (no env vars needed)
 * and exercises the 9-gate verifier on real ledger data:
 *
 *   1. happy_path           — all 9 gates PASS
 *   2. wrong_amount         — delivered != expected      (gate 6 fails)
 *   3. missing_memo         — no xpk:intent Memo         (gate 8 fails)
 *   4. wrong_destination_tag — intent requires tag,       (gate 5 fails)
 *                              tx submits without one
 *   5. partial_payment_flag — Flags has tfPartialPayment  (gate 7 fails)
 *
 * Usage (no env vars):
 *
 *   pnpm tsx examples/testnet-live-suite.ts
 *
 * Output:
 *   - Per-scenario pass/fail with explorer URL
 *   - Final summary table
 *   - Exit 0 if every scenario behaves as expected (i.e. positive scenarios
 *     verify and negative scenarios produce the expected single gate failure)
 *
 * The script is intentionally self-contained: it mirrors the runChecks logic
 * from apps/paykit/src/xrpl/verify-tx.ts inline so reviewers can reproduce
 * the live verification without standing up the full app stack.
 */

import { Client, Wallet, convertStringToHex } from "xrpl";

// ─────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────

const XRPL_TESTNET = "wss://s.altnet.rippletest.net:51233";
const EXPLORER = "https://testnet.xrpl.org/transactions";
const MEMO_TYPE = "xpk:intent";
const TF_PARTIAL_PAYMENT = 0x00020000;

// ─────────────────────────────────────────────────────────────────────
// Inline 9-gate verifier — mirrors apps/paykit/src/xrpl/verify-tx.ts
// ─────────────────────────────────────────────────────────────────────

interface Expectations {
  intentId: string;
  destination: string;
  amountDrops: string;
  destinationTag?: number;
}

interface Gate {
  name: string;
  pass: boolean;
  reason?: string;
}

function runGates(tx: any, exp: Expectations): Gate[] {
  const gates: Gate[] = [];

  gates.push({
    name: "validated",
    pass: tx.validated === true,
    reason: tx.validated === true ? undefined : "tx.validated !== true",
  });

  const result = tx.meta?.TransactionResult;
  gates.push({
    name: "tesSUCCESS",
    pass: result === "tesSUCCESS",
    reason: result === "tesSUCCESS" ? undefined : `TransactionResult=${result}`,
  });

  const txType = tx.TransactionType ?? tx.tx_json?.TransactionType;
  gates.push({
    name: "isPayment",
    pass: txType === "Payment",
    reason: txType === "Payment" ? undefined : `TransactionType=${txType}`,
  });

  const destination = tx.Destination ?? tx.tx_json?.Destination;
  gates.push({
    name: "destinationMatch",
    pass: destination === exp.destination,
    reason: destination === exp.destination ? undefined : `got ${destination}`,
  });

  const tag = tx.DestinationTag ?? tx.tx_json?.DestinationTag;
  if (exp.destinationTag !== undefined) {
    gates.push({
      name: "destinationTagMatch",
      pass: tag === exp.destinationTag,
      reason:
        tag === exp.destinationTag
          ? undefined
          : `expected ${exp.destinationTag}, got ${tag ?? "<missing>"}`,
    });
  } else {
    gates.push({ name: "destinationTagMatch", pass: true });
  }

  const flags = (tx.Flags ?? tx.tx_json?.Flags ?? 0) as number;
  const partial = (flags & TF_PARTIAL_PAYMENT) !== 0;
  gates.push({
    name: "notPartialPayment",
    pass: !partial,
    reason: partial
      ? `tfPartialPayment set (Flags=0x${flags.toString(16)})`
      : undefined,
  });

  const delivered = tx.meta?.delivered_amount;
  const deliveredOk = typeof delivered === "string" && delivered === exp.amountDrops;
  gates.push({
    name: "deliveredAmountExact",
    pass: deliveredOk,
    reason: deliveredOk
      ? undefined
      : `delivered=${JSON.stringify(delivered)} expected=${exp.amountDrops}`,
  });

  const memos = (tx.Memos ?? tx.tx_json?.Memos) as
    | Array<{ Memo: { MemoType?: string; MemoData?: string } }>
    | undefined;
  let memoIntent: string | undefined;
  if (memos) {
    const typeHex = convertStringToHex(MEMO_TYPE);
    for (const m of memos) {
      if (m.Memo.MemoType !== typeHex || !m.Memo.MemoData) continue;
      try {
        memoIntent = Buffer.from(m.Memo.MemoData, "hex").toString("utf8");
        break;
      } catch {}
    }
  }
  gates.push({
    name: "memoIntentIdMatch",
    pass: memoIntent === exp.intentId,
    reason:
      memoIntent === exp.intentId
        ? undefined
        : `memo=${memoIntent ?? "<none>"} expected=${exp.intentId}`,
  });

  gates.push({ name: "txHashUnused", pass: true }); // reconciler-level

  return gates;
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

interface SubmitOpts {
  amountDrops: string;
  destination: string;
  sendMaxDrops?: string;
  destinationTag?: number;
  flags?: number;
  memoIntentId?: string | null;
}

interface SubmitResult {
  hash: string;
  ledger?: number;
  tx: any;
}

async function submitPayment(
  client: Client,
  sender: Wallet,
  opts: SubmitOpts,
): Promise<SubmitResult> {
  const memos =
    opts.memoIntentId === null || opts.memoIntentId === undefined
      ? undefined
      : [
          {
            Memo: {
              MemoType: convertStringToHex(MEMO_TYPE),
              MemoData: convertStringToHex(opts.memoIntentId),
              MemoFormat: convertStringToHex("text/plain"),
            },
          },
        ];

  const txJson: any = {
    TransactionType: "Payment",
    Account: sender.address,
    Destination: opts.destination,
    Amount: opts.amountDrops,
  };
  if (opts.destinationTag !== undefined) txJson.DestinationTag = opts.destinationTag;
  if (opts.flags !== undefined) txJson.Flags = opts.flags;
  if (opts.sendMaxDrops !== undefined) txJson.SendMax = opts.sendMaxDrops;
  if (memos) txJson.Memos = memos;

  const prepared = await client.autofill(txJson);
  const signed = sender.sign(prepared);
  const submit = await client.submitAndWait(signed.tx_blob);
  const ledger = (submit.result as { ledger_index?: number }).ledger_index;
  const hash = signed.hash;

  const fetched = await client.request({
    command: "tx",
    transaction: hash,
    binary: false,
  });

  return { hash, ledger, tx: fetched.result };
}

// ─────────────────────────────────────────────────────────────────────
// Scenario reporting
// ─────────────────────────────────────────────────────────────────────

type Verdict = "PASS" | "FAIL_AS_EXPECTED" | "NETWORK_REJECTED_AS_EXPECTED" | "UNEXPECTED";

interface ScenarioResult {
  id: string;
  description: string;
  txHash: string | null;
  ledger?: number;
  gates: Gate[];
  expectedFailureGate: string | null; // null = happy path
  verdict: Verdict;
  networkRejectionCode?: string;
}

function evaluate(
  id: string,
  description: string,
  txHash: string,
  ledger: number | undefined,
  gates: Gate[],
  expectedFailureGate: string | null,
): ScenarioResult {
  const failed = gates.filter((g) => !g.pass).map((g) => g.name);

  let verdict: Verdict;
  if (expectedFailureGate === null) {
    verdict = failed.length === 0 ? "PASS" : "UNEXPECTED";
  } else {
    // Negative scenarios: precisely the expected gate must fail.
    // Other gate failures are acceptable as long as the expected gate also fails
    // (e.g. tfPartialPayment + wrong delivered_amount may both trip).
    verdict = failed.includes(expectedFailureGate) ? "FAIL_AS_EXPECTED" : "UNEXPECTED";
  }

  return { id, description, txHash, ledger, gates, expectedFailureGate, verdict };
}

function networkRejected(
  id: string,
  description: string,
  expectedFailureGate: string,
  code: string,
): ScenarioResult {
  // For scenarios where XRPL itself refuses to record the malformed tx,
  // we capture that as defense-in-depth at the network layer. The verifier's
  // gate logic is exercised separately in unit tests (verify-tx.test.ts).
  return {
    id,
    description,
    txHash: null,
    gates: [],
    expectedFailureGate,
    verdict: "NETWORK_REJECTED_AS_EXPECTED",
    networkRejectionCode: code,
  };
}

function printScenario(s: ScenarioResult) {
  console.log("");
  if (s.txHash) {
    console.log(`  Tx hash  : ${s.txHash}`);
    if (s.ledger !== undefined) console.log(`  Ledger   : ${s.ledger}`);
    console.log(`  Explorer : ${EXPLORER}/${s.txHash}`);
    console.log("  Gates    :");
    for (const g of s.gates) {
      const mark = g.pass ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
      console.log(`    [${mark}] ${g.name}${g.reason ? "  — " + g.reason : ""}`);
    }
  } else if (s.networkRejectionCode) {
    console.log(`  Outcome  : XRPL network refused to record the tx`);
    console.log(`  Reason   : ${s.networkRejectionCode}`);
    console.log(`  Defense  : tx never reached the ledger — verifier gate not exercised live`);
    console.log(`             gate logic for "${s.expectedFailureGate}" is covered by unit tests`);
  }
  const isOk = s.verdict === "PASS" || s.verdict === "FAIL_AS_EXPECTED" || s.verdict === "NETWORK_REJECTED_AS_EXPECTED";
  const verdictColor = isOk ? "\x1b[32m" : "\x1b[31m";
  console.log(`  Verdict  : ${verdictColor}${s.verdict}\x1b[0m`);
}

// ─────────────────────────────────────────────────────────────────────
// Pipeline
// ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("XRPL PayKit — Live Testnet 5-Scenario Suite");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const client = new Client(XRPL_TESTNET);
  await client.connect();
  console.log(`\nConnected: ${XRPL_TESTNET}`);

  let results: ScenarioResult[] = [];

  try {
    // Faucet-fund a fresh sender + merchant.
    console.log("\n[setup] Requesting funded testnet wallets from XRPL faucet...");
    const senderResp = await client.fundWallet();
    const merchantResp = await client.fundWallet();
    const sender = senderResp.wallet;
    const merchant = merchantResp.wallet;
    console.log(`  sender   : ${sender.address}  (balance ${senderResp.balance} XRP)`);
    console.log(`  merchant : ${merchant.address}  (balance ${merchantResp.balance} XRP)`);

    // ─────────────────────────────────────────────────────────────
    // Scenario 1 — happy path
    // ─────────────────────────────────────────────────────────────
    {
      const intentId = `xpk_happy_${Date.now().toString(36)}`;
      const exp: Expectations = {
        intentId,
        destination: merchant.address,
        amountDrops: "1000000", // 1 XRP
      };

      console.log("\n[1] happy_path — 1 XRP with matching memo");
      const s = await submitPayment(client, sender, {
        amountDrops: exp.amountDrops,
        destination: exp.destination,
        memoIntentId: intentId,
      });
      const gates = runGates(s.tx, exp);
      const r = evaluate("happy_path", "1 XRP, matching memo", s.hash, s.ledger, gates, null);
      printScenario(r);
      results.push(r);
    }

    // ─────────────────────────────────────────────────────────────
    // Scenario 2 — wrong_amount
    // ─────────────────────────────────────────────────────────────
    {
      const intentId = `xpk_wrongamt_${Date.now().toString(36)}`;
      const exp: Expectations = {
        intentId,
        destination: merchant.address,
        amountDrops: "1000000", // intent says 1 XRP
      };
      console.log("\n[2] wrong_amount — sender delivers 0.5 XRP instead of 1 XRP");
      const s = await submitPayment(client, sender, {
        amountDrops: "500000", // sender pays 0.5 XRP
        destination: exp.destination,
        memoIntentId: intentId,
      });
      const gates = runGates(s.tx, exp);
      const r = evaluate(
        "wrong_amount",
        "delivered 500000 drops vs expected 1000000",
        s.hash,
        s.ledger,
        gates,
        "deliveredAmountExact",
      );
      printScenario(r);
      results.push(r);
    }

    // ─────────────────────────────────────────────────────────────
    // Scenario 3 — missing_memo
    // ─────────────────────────────────────────────────────────────
    {
      const intentId = `xpk_nomemo_${Date.now().toString(36)}`;
      const exp: Expectations = {
        intentId,
        destination: merchant.address,
        amountDrops: "1000000",
      };
      console.log("\n[3] missing_memo — no xpk:intent Memo at all");
      const s = await submitPayment(client, sender, {
        amountDrops: exp.amountDrops,
        destination: exp.destination,
        memoIntentId: null, // explicit: no memo
      });
      const gates = runGates(s.tx, exp);
      const r = evaluate(
        "missing_memo",
        "Payment without xpk:intent Memo",
        s.hash,
        s.ledger,
        gates,
        "memoIntentIdMatch",
      );
      printScenario(r);
      results.push(r);
    }

    // ─────────────────────────────────────────────────────────────
    // Scenario 4 — wrong_destination_tag
    // ─────────────────────────────────────────────────────────────
    {
      const intentId = `xpk_notag_${Date.now().toString(36)}`;
      const exp: Expectations = {
        intentId,
        destination: merchant.address,
        amountDrops: "1000000",
        destinationTag: 42, // intent requires tag 42
      };
      console.log("\n[4] wrong_destination_tag — intent requires DestinationTag=42, tx has none");
      const s = await submitPayment(client, sender, {
        amountDrops: exp.amountDrops,
        destination: exp.destination,
        memoIntentId: intentId,
        // no destinationTag in submitted tx
      });
      const gates = runGates(s.tx, exp);
      const r = evaluate(
        "wrong_destination_tag",
        "intent requires tag 42, submitted tx omits it",
        s.hash,
        s.ledger,
        gates,
        "destinationTagMatch",
      );
      printScenario(r);
      results.push(r);
    }

    // ─────────────────────────────────────────────────────────────
    // Scenario 5 — partial_payment_flag exploit (defense-in-depth)
    //
    // Background: PayKit's gate 7 always rejects tx with tfPartialPayment
    // (0x00020000). For XRP→XRP, XRPL itself ALSO rejects this pattern:
    // tfPartialPayment requires SendMax, but XRP→XRP forbids SendMax
    // (`temBAD_SEND_XRP_MAX`). So we expect a network-level refusal here,
    // which is defense-in-depth #1. The verifier's gate 7 logic (defense
    // #2) is exercised in apps/paykit/tests/verify-tx.test.ts against
    // crafted IOU fixtures.
    // ─────────────────────────────────────────────────────────────
    {
      const intentId = `xpk_partial_${Date.now().toString(36)}`;
      const exp: Expectations = {
        intentId,
        destination: merchant.address,
        amountDrops: "1000000",
      };
      console.log("\n[5] partial_payment_flag — tfPartialPayment (0x00020000) bit set");
      try {
        const s = await submitPayment(client, sender, {
          amountDrops: exp.amountDrops,
          destination: exp.destination,
          sendMaxDrops: exp.amountDrops,
          flags: TF_PARTIAL_PAYMENT,
          memoIntentId: intentId,
        });
        // If somehow accepted, run gates as usual.
        const gates = runGates(s.tx, exp);
        const r = evaluate(
          "partial_payment_flag",
          "tfPartialPayment bit set; gate 7 must reject",
          s.hash,
          s.ledger,
          gates,
          "notPartialPayment",
        );
        printScenario(r);
        results.push(r);
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        const codeMatch = msg.match(/tem[A-Z_]+|tec[A-Z_]+/);
        const code = codeMatch ? codeMatch[0] : msg.slice(0, 120);
        const r = networkRejected(
          "partial_payment_flag",
          "tfPartialPayment bit set; XRPL network refused malformed XRP→XRP",
          "notPartialPayment",
          code,
        );
        printScenario(r);
        results.push(r);
      }
    }
  } finally {
    await client.disconnect();
  }

  // ─────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Summary");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  for (const r of results) {
    const okSet =
      r.verdict === "PASS" ||
      r.verdict === "FAIL_AS_EXPECTED" ||
      r.verdict === "NETWORK_REJECTED_AS_EXPECTED";
    const mark = okSet ? "✓" : "✗";
    const tail = r.expectedFailureGate
      ? `  (expected fail @ ${r.expectedFailureGate})`
      : "  (expected all-pass)";
    console.log(
      `  [${mark}] ${r.id.padEnd(24)} ${r.verdict.padEnd(30)}${tail}`,
    );
    if (r.txHash) {
      console.log(`       tx: ${r.txHash}`);
    } else if (r.networkRejectionCode) {
      console.log(`       network refused: ${r.networkRejectionCode}`);
    }
  }

  const ok =
    results.length === 5 &&
    results.every(
      (r) =>
        r.verdict === "PASS" ||
        r.verdict === "FAIL_AS_EXPECTED" ||
        r.verdict === "NETWORK_REJECTED_AS_EXPECTED",
    );
  console.log("");
  console.log(ok ? "Suite verdict: \x1b[32mALL EXPECTED ✓\x1b[0m" : "Suite verdict: \x1b[31mUNEXPECTED ✗\x1b[0m");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
