// PRD v0.2 §8.4 — 9 verification conditions.
// In mock mode this resolves against a fixtures map; in real mode it queries XRPL testnet.

import type { VerifyReason } from "@paykit/sdk";
import { decodeMemoFromTx, PAYKIT_MEMO_TYPE } from "../domain/memo";
import { env } from "../config";
import { isMockMode } from "../services/xaman-mode";
import { getFixtureTx } from "./fixtures/index";

export interface VerifyExpectations {
  intentId: string;
  destination: string;
  amountDrops: string;
}

export interface RawXrplTx {
  validated?: boolean;
  TransactionType?: string;
  Destination?: string;
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
  if (tx.validated !== true) return { ok: false, reason: "tx_not_validated" };
  if (tx.meta?.TransactionResult !== "tesSUCCESS") {
    return { ok: false, reason: "tx_failed", detail: { result: tx.meta?.TransactionResult } };
  }
  if (tx.TransactionType !== "Payment") return { ok: false, reason: "not_payment" };
  if (tx.Destination !== expected.destination) {
    return { ok: false, reason: "wrong_destination", detail: { destination: tx.Destination } };
  }

  const delivered = tx.meta?.delivered_amount;
  if (typeof delivered !== "string") {
    // Non-XRP delivered_amount or partial payment not supported in MVP.
    return { ok: false, reason: "partial_payment_not_supported" };
  }
  if (delivered !== expected.amountDrops) {
    return { ok: false, reason: "wrong_amount", detail: { expected: expected.amountDrops, actual: delivered } };
  }

  const memo = decodeMemoFromTx(tx.Memos);
  if (!memo) return { ok: false, reason: "missing_memo", detail: { memoType: PAYKIT_MEMO_TYPE } };
  if (memo.intentId !== expected.intentId) {
    return { ok: false, reason: "intent_mismatch", detail: { memo } };
  }

  return { ok: true, tx };
}
