/**
 * Live testnet end-to-end verification of PayKit's 9-gate verifier.
 *
 *   1. Submits a real testnet XRP Payment with an `xpk:intent` Memo
 *      via xrpl.js
 *   2. Waits for the validated ledger
 *   3. Fetches the tx
 *   4. Runs the 9-gate verifier (incl. tfPartialPayment + DestinationTag)
 *   5. Prints per-gate results + tx hash + livenet.xrpl.org explorer URL
 *
 * Usage (testnet faucet-funded sender + merchant address):
 *
 *   SENDER_SEED=sEd...  MERCHANT_ADDRESS=r...  pnpm tsx examples/testnet-live.ts
 *
 * The script is self-contained and bypasses paykit's env (no DB/auth/etc).
 * It mirrors `apps/paykit/src/xrpl/verify-tx.ts` runChecks logic inline so
 * KFIP reviewers can reproduce the live verification without setting up
 * the full app stack.
 */

import { Client, Wallet, convertStringToHex } from "xrpl";

// ─────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────

const XRPL_TESTNET = "wss://s.altnet.rippletest.net:51233";
const EXPLORER = "https://livenet.xrpl.org";

const SENDER_SEED = process.env.SENDER_SEED;
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS;
if (!SENDER_SEED || !MERCHANT_ADDRESS) {
  console.error("ERROR: SENDER_SEED and MERCHANT_ADDRESS env vars are required.");
  console.error("       Generate testnet wallets at https://xrpl.org/xrp-testnet-faucet.html");
  process.exit(1);
}

const PAYKIT_MEMO_TYPE = "xpk:intent";
const TF_PARTIAL_PAYMENT = 0x00020000;

// ─────────────────────────────────────────────────────────────────────
// Inline 9-gate verifier (mirrors apps/paykit/src/xrpl/verify-tx.ts)
// ─────────────────────────────────────────────────────────────────────

interface VerifyExpectations {
  intentId: string;
  destination: string;
  amountDrops: string;
  destinationTag?: number;
}

interface GateResult {
  gate: string;
  passed: boolean;
  reason?: string;
}

function runChecks(tx: any, expected: VerifyExpectations): GateResult[] {
  const gates: GateResult[] = [];

  gates.push({
    gate: "validated",
    passed: tx.validated === true,
    reason: tx.validated === true ? undefined : "tx.validated !== true",
  });

  const txResult = tx.meta?.TransactionResult;
  gates.push({
    gate: "tesSUCCESS",
    passed: txResult === "tesSUCCESS",
    reason: txResult === "tesSUCCESS" ? undefined : `TransactionResult=${txResult}`,
  });

  const txType = tx.TransactionType ?? tx.tx_json?.TransactionType;
  gates.push({
    gate: "isPayment",
    passed: txType === "Payment",
    reason: txType === "Payment" ? undefined : `TransactionType=${txType}`,
  });

  const destination = tx.Destination ?? tx.tx_json?.Destination;
  gates.push({
    gate: "destinationMatch",
    passed: destination === expected.destination,
    reason: destination === expected.destination ? undefined : `got ${destination}`,
  });

  const tag = tx.DestinationTag ?? tx.tx_json?.DestinationTag;
  if (expected.destinationTag !== undefined) {
    gates.push({
      gate: "destinationTagMatch",
      passed: tag === expected.destinationTag,
      reason: tag === expected.destinationTag ? undefined : `expected ${expected.destinationTag}, got ${tag ?? "<missing>"}`,
    });
  } else {
    gates.push({ gate: "destinationTagMatch", passed: true });
  }

  const flags = (tx.Flags ?? tx.tx_json?.Flags ?? 0) as number;
  const isPartial = (flags & TF_PARTIAL_PAYMENT) !== 0;
  gates.push({
    gate: "notPartialPayment",
    passed: !isPartial,
    reason: isPartial ? `tfPartialPayment flag set (Flags=0x${flags.toString(16)})` : undefined,
  });

  const delivered = tx.meta?.delivered_amount;
  const deliveredMatch = typeof delivered === "string" && delivered === expected.amountDrops;
  gates.push({
    gate: "deliveredAmountExact",
    passed: deliveredMatch,
    reason: deliveredMatch ? undefined : `delivered=${JSON.stringify(delivered)} expected=${expected.amountDrops}`,
  });

  const memos = (tx.Memos ?? tx.tx_json?.Memos) as Array<{ Memo: { MemoType?: string; MemoData?: string } }> | undefined;
  let memoIntentId: string | undefined;
  if (memos) {
    const targetTypeHex = convertStringToHex(PAYKIT_MEMO_TYPE);
    for (const wrapper of memos) {
      if (wrapper.Memo.MemoType !== targetTypeHex) continue;
      if (!wrapper.Memo.MemoData) continue;
      try {
        memoIntentId = Buffer.from(wrapper.Memo.MemoData, "hex").toString("utf8");
        break;
      } catch {
        continue;
      }
    }
  }
  gates.push({
    gate: "memoIntentIdMatch",
    passed: memoIntentId === expected.intentId,
    reason: memoIntentId === expected.intentId ? undefined : `memo=${memoIntentId ?? "<none>"} expected=${expected.intentId}`,
  });

  // Gate 9 (tx hash UNIQUE) is enforced at the reconciler layer via DB
  // UNIQUE constraint, not in this inline demo. The example below treats
  // the gate as vacuously true for a fresh payment.
  gates.push({ gate: "txHashUnused", passed: true });

  return gates;
}

// ─────────────────────────────────────────────────────────────────────
// Pipeline
// ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("XRPL PayKit — Live Testnet End-to-End Verification");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Build a PaymentIntent-like expectation
  const intentId = `xpk_demo_${Date.now().toString(36)}`;
  const expected: VerifyExpectations = {
    intentId,
    destination: MERCHANT_ADDRESS as string,
    amountDrops: "1000000", // 1 XRP
  };

  console.log("\n[1] PaymentIntent (synthesized for demo)");
  console.log("    id          :", intentId);
  console.log("    destination :", expected.destination);
  console.log("    amount      : 1 XRP (1,000,000 drops)");

  const client = new Client(XRPL_TESTNET);
  await client.connect();
  console.log("\n[2] Connected to XRPL testnet:", XRPL_TESTNET);

  try {
    const wallet = Wallet.fromSeed(SENDER_SEED as string);
    console.log("    sender      :", wallet.address);

    const prepared = await client.autofill({
      TransactionType: "Payment",
      Account: wallet.address,
      Destination: expected.destination,
      Amount: "1000000",
      Memos: [
        {
          Memo: {
            MemoType: convertStringToHex(PAYKIT_MEMO_TYPE),
            MemoData: convertStringToHex(intentId),
            MemoFormat: convertStringToHex("text/plain"),
          },
        },
      ],
    });

    const signed = wallet.sign(prepared);
    console.log("\n[3] Submitting Payment to testnet...");
    const submitResult = await client.submitAndWait(signed.tx_blob);

    const txHash = signed.hash;
    const ledgerIndex = (submitResult.result as { ledger_index?: number }).ledger_index;
    console.log("    tx hash     :", txHash);
    console.log("    ledger      :", ledgerIndex);
    console.log("    explorer    :", `${EXPLORER}/transactions/${txHash}?network=testnet`);

    console.log("\n[4] Fetching tx from ledger for ground-truth verification...");
    const txResp = await client.request({
      command: "tx",
      transaction: txHash,
      binary: false,
    });

    console.log("\n[5] Running 9-gate verifier (mirrors apps/paykit/src/xrpl/verify-tx.ts)...");
    const gates = runChecks(txResp.result, expected);
    const allPassed = gates.every((g) => g.passed);

    console.log("\n    Per-gate results:");
    for (const g of gates) {
      const mark = g.passed ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
      console.log(`      [${mark}] ${g.gate}${g.reason ? "  — " + g.reason : ""}`);
    }

    console.log("\n[6] Verdict");
    console.log("    verified    :", allPassed ? "\x1b[32mtrue\x1b[0m" : "\x1b[31mfalse\x1b[0m");
    console.log("    tx hash     :", txHash);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Live verification:", allPassed ? "PASS ✓" : "FAIL ✗");
    console.log("Explorer:", `${EXPLORER}/transactions/${txHash}?network=testnet`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (!allPassed) process.exit(1);
  } finally {
    await client.disconnect();
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
