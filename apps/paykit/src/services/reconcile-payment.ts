// PRD v0.2 §8.4·§8.5 — verify XRPL tx + idempotently mark intent succeeded + dispatch webhook.

import { eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { assertTransition } from "../domain/payment-intent-state";
import { verifyXrplTransaction } from "../xrpl/verify-tx";
import { dispatchSucceededWebhook } from "./dispatch-webhook";
import type { VerifyResult } from "@paykit/sdk";
import { rowToPaymentIntent } from "./intent-mapping";

export async function reconcilePayment(intentId: string, txHash: string): Promise<VerifyResult> {
  const intent = await db.query.paymentIntents.findFirst({
    where: eq(schema.paymentIntents.id, intentId),
  });
  if (!intent) return { ok: false, reason: "tx_not_found", detail: { reason: "intent_missing" } };

  if (intent.status === "succeeded") {
    if (intent.txHash === txHash) {
      // Idempotent — already done.
      return { ok: true, intent: rowToPaymentIntent(intent) };
    }
    return { ok: false, reason: "duplicate_tx", detail: { originalTxHash: intent.txHash } };
  }

  if (intent.expiresAt.getTime() < Date.now()) {
    // Expired before payment — late valid-looking payment needs human review.
    await markRequiresReview(intentId);
    return { ok: false, reason: "intent_expired" };
  }

  const verifyResult = await verifyXrplTransaction(txHash, {
    intentId,
    destination: intent.destinationAddress,
    amountDrops: intent.amountDrops,
  });
  if (!verifyResult.ok) return verifyResult;

  // tx hash uniqueness — guard against the same tx being applied to a different intent.
  const collision = await db.query.paymentIntents.findFirst({
    where: eq(schema.paymentIntents.txHash, txHash),
  });
  if (collision && collision.id !== intentId) {
    return { ok: false, reason: "duplicate_tx", detail: { originalIntent: collision.id } };
  }

  assertTransition(intent.status as any, "succeeded");

  const now = new Date();
  await db.update(schema.paymentIntents)
    .set({ status: "succeeded", txHash, updatedAt: now })
    .where(eq(schema.paymentIntents.id, intentId));

  const updated = { ...intent, status: "succeeded" as const, txHash, updatedAt: now };
  await dispatchSucceededWebhook(updated);

  return { ok: true, intent: rowToPaymentIntent(updated) };
}

async function markRequiresReview(intentId: string) {
  await db.update(schema.paymentIntents)
    .set({ status: "requires_review", updatedAt: new Date() })
    .where(eq(schema.paymentIntents.id, intentId));
}
