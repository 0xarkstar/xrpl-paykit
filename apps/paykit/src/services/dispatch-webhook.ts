// PRD v0.2 §8.6 — signed webhook dispatch (delivered separately from payment success).

import { signEvent } from "@paykit/sdk";
import type { WebhookEvent, PaymentIntent } from "@paykit/sdk";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { env } from "../config";
import { rowToPaymentIntent } from "./intent-mapping";
import type { PaymentIntentRow } from "../db/schema";

export async function dispatchSucceededWebhook(intent: PaymentIntentRow): Promise<void> {
  if (!intent.webhookUrl) return;

  const event: WebhookEvent<PaymentIntent> = {
    id: `evt_${intent.id}_succeeded`,
    type: "payment_intent.succeeded",
    created: new Date().toISOString(),
    data: { object: rowToPaymentIntent(intent) },
  };
  const rawBody = JSON.stringify(event);
  const signature = signEvent({ rawBody, secret: env.PAYKIT_WEBHOOK_SECRET });

  // Idempotent insert — deterministic event id + UNIQUE (intentId, type).
  try {
    await db.insert(schema.webhookEvents).values({
      id: event.id,
      intentId: intent.id,
      type: event.type,
      payloadJson: rawBody,
      deliveryStatus: "pending",
      attempts: 0,
      lastError: null,
      createdAt: new Date(),
      deliveredAt: null,
    });
  } catch (e) {
    // already exists — idempotent.
  }

  try {
    const res = await fetch(intent.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PayKit-Signature": signature,
      },
      body: rawBody,
    });
    if (!res.ok) throw new Error(`merchant_${res.status}`);
    await db.update(schema.webhookEvents)
      .set({ deliveryStatus: "delivered", deliveredAt: new Date(), attempts: 1 })
      .where(eq(schema.webhookEvents.id, event.id));
  } catch (e: any) {
    await db.update(schema.webhookEvents)
      .set({ deliveryStatus: "failed", lastError: String(e?.message ?? e), attempts: 1 })
      .where(eq(schema.webhookEvents.id, event.id));
    // Payment success itself is not rolled back (PRD §8.6).
  }
}
