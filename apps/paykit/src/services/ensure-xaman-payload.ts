// Ensure a Xaman payload exists for an intent; reuse the one persisted on the row.

import { eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { assertTransition } from "../domain/payment-intent-state";
import { createXamanPayloadForIntent, isMockMode } from "./xaman-mode";
import { registerMockFixture } from "../xrpl/fixtures/index";
import type { PaymentIntentRow } from "../db/schema";

export async function ensureXamanPayload(intent: PaymentIntentRow): Promise<PaymentIntentRow> {
  if (intent.xamanPayloadId && intent.xamanPayloadUrl) return intent;

  const payload = await createXamanPayloadForIntent(intent);

  // Mock mode also pre-registers a fixture tx so verify can succeed when simulate is clicked.
  if (isMockMode()) {
    registerMockFixture({
      id: intent.id,
      orderId: intent.orderId,
      resourceId: intent.resourceId,
      amountDrops: intent.amountDrops,
    });
  }

  const nextStatus = intent.status === "created" ? "pending" : intent.status;
  if (nextStatus !== intent.status) {
    assertTransition(intent.status as any, nextStatus as any);
  }
  const now = new Date();
  await db.update(schema.paymentIntents)
    .set({
      xamanPayloadId: payload.payloadId,
      xamanPayloadUrl: payload.payloadUrl,
      status: nextStatus,
      updatedAt: now,
    })
    .where(eq(schema.paymentIntents.id, intent.id));

  return {
    ...intent,
    xamanPayloadId: payload.payloadId,
    xamanPayloadUrl: payload.payloadUrl,
    status: nextStatus as PaymentIntentRow["status"],
    updatedAt: now,
  };
}
