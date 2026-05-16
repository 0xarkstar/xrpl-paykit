// PRD v0.2 §8.4 — 9 verification conditions.
// In mock mode this resolves against a fixtures map; in real mode it queries XRPL testnet.

import type { VerifyReason } from "@paykit/sdk";
import { decodeMemoFromTx, PAYKIT_MEMO_TYPE } from "../domain/memo";
import { env } from "../config";
import { isMockMode } from "../services/xaman-mode";
import { getFixtureTx } from "./fixtures/index";

/**
 * tfPartialPayment flag bit value.
 *
 * When set, `Amount` is treated as the sender's MAXIMUM and any subset may
 * be delivered — down to a single drop. A naive receiver that trusts
 * `Amount` is the textbook XRPL payment exploit. PayKit always rejects.
 *
 * See https://xrpl.org/partial-payments.html
 */
export const TF_PARTIAL_PAYMENT = 0x00020000;

export interface VerifyExpectations {
  intentId: string;
  destination: string;
  amountDrops: string;
  /** Optional DestinationTag — when set, the transaction's tag must match exactly. */
  destinationTag?: number;
}

export interface RawXrplTx {
  validated?: boolean;
  TransactionType?: string;
  Destination?: string;
  /** XRPL DestinationTag (PaymentIntent-level merchant disambiguation). */
  DestinationTag?: number;
  /** Transaction flags bitmap. `tfPartialPayment` (0x00020000) is always rejected. */
  Flags?: number;
  Memos?: any[];
  meta?: {
    TransactionResult?: string;
    delivered_amount?: string | { value?: string } | unknown;
  };
}

export type LedgerVerifyResult =
  | { ok: true; tx: RawXrplTx }
  | { ok: false; reason: VerifyReason; detail?: Record<string, unknown> };

export async function verifyXrplTransaction(
  txHash: string,
  expected: VerifyExpectations,
): Promise<LedgerVerifyResult> {
  const tx = isMockMode() ? getFixtureTx(txHash) : await fetchRealTx(txHash);
  if (!tx) return { ok: false, reason: "tx_not_found" };
  return runChecks(tx, expected);
}

async function fetchRealTx(txHash: string): Promise<RawXrplTx | null> {
  const { Client } = await import("xrpl");
  const client = new Client(env.XRPL_RPC_URL);
  await client.connect();
  try {
    const resp = await client.request({ command: "tx", transaction: txHash });
    return resp.result as unknown as RawXrplTx;
  } catch {
    return null;
  } finally {
    await client.disconnect();
  }
}

function runChecks(tx: RawXrplTx, expected: VerifyExpectations): LedgerVerifyResult {
  // Gate 1: validated ledger.
  if (tx.validated !== true) return { ok: false, reason: "tx_not_validated" };

  // Gate 2: tesSUCCESS — many other result codes (tec*, ter*) still produce
  // a validated tx that did NOT transfer funds. Only tesSUCCESS is final.
  if (tx.meta?.TransactionResult !== "tesSUCCESS") {
    return { ok: false, reason: "tx_failed", detail: { result: tx.meta?.TransactionResult } };
  }

  // Gate 3: TransactionType === Payment.
  if (tx.TransactionType !== "Payment") return { ok: false, reason: "not_payment" };

  // Gate 4: Destination match.
  if (tx.Destination !== expected.destination) {
    return { ok: false, reason: "wrong_destination", detail: { destination: tx.Destination } };
  }

  // Gate 5: DestinationTag match (only enforced when intent specifies one).
  // When intent has no DestinationTag, this gate is vacuously true.
  if (expected.destinationTag !== undefined && tx.DestinationTag !== expected.destinationTag) {
    return {
      ok: false,
      reason: "wrong_destination_tag",
      detail: { expected: expected.destinationTag, actual: tx.DestinationTag ?? null },
    };
  }

  // Gate 7: Reject tfPartialPayment flag.
  // Checked before amount comparison because, when set, `Amount` is the
  // sender's max — any subset (down to 1 drop) may be the real `delivered_amount`.
  // Trusting amount under tfPartialPayment is the textbook XRPL receiver bug.
  if (typeof tx.Flags === "number" && (tx.Flags & TF_PARTIAL_PAYMENT) !== 0) {
    return {
      ok: false,
      reason: "partial_payment_flag",
      detail: { flags: `0x${tx.Flags.toString(16)}`, tfPartialPayment: TF_PARTIAL_PAYMENT },
    };
  }

  // Gate 6: delivered_amount EXACT match (NOT tx.Amount — Amount is the
  // sender's authorized maximum, not what arrived; always read delivered_amount).
  const delivered = tx.meta?.delivered_amount;
  if (typeof delivered !== "string") {
    // Non-XRP delivered_amount (IOU object) — not supported in MVP.
    return { ok: false, reason: "partial_payment_not_supported" };
  }
  if (delivered !== expected.amountDrops) {
    return { ok: false, reason: "wrong_amount", detail: { expected: expected.amountDrops, actual: delivered } };
  }

  // Gate 8: Memo decode + intentId match.
  const memo = decodeMemoFromTx(tx.Memos);
  if (!memo) return { ok: false, reason: "missing_memo", detail: { memoType: PAYKIT_MEMO_TYPE } };
  if (memo.intentId !== expected.intentId) {
    return { ok: false, reason: "intent_mismatch", detail: { memo } };
  }

  // Gate 9 (tx hash uniqueness) is enforced at the reconciler level
  // (services/reconcile-payment.ts) via DB UNIQUE constraint + race-safe lookup,
  // because the "previously used" state is system-wide, not tx-local.

  return { ok: true, tx };
}
