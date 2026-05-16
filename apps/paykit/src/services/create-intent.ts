// PRD v0.2 §8.1 — create payment intent service.

import { ulid } from "ulid";
import { db, schema } from "../db/client";
import type { CreatePaymentIntentBody } from "../domain/payment-intent";
import { xrpToDropsString } from "../domain/drops";
import { encodeMemoForIntent } from "../domain/memo";
import { env, getMerchantAddress, isAllowedWebhookUrl } from "../config";
import type { PaymentIntent } from "@paykit/sdk";

const INTENT_TTL_MS = 15 * 60 * 1000;     // 15 minutes per PRD §8.1 expiresAt default.

export class CreateIntentError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export async function createIntent(body: CreatePaymentIntentBody): Promise<PaymentIntent> {
  if (body.webhookUrl && !isAllowedWebhookUrl(body.webhookUrl)) {
    throw new CreateIntentError("webhook_url_not_allowlisted", "webhook_url_not_allowlisted");
  }

  const id = `pi_${ulid()}`;
  const amountDrops = xrpToDropsString(body.amount);
  const destination = getMerchantAddress();
  const memo = encodeMemoForIntent({
    intentId: id,
    orderId: body.orderId,
    resourceId: body.resourceId,
  });
  const memoHex = JSON.stringify(memo);          // stored for debugging only; rebuild on signing

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INTENT_TTL_MS);
  const checkoutUrl = `${env.PAYKIT_BASE_URL}/checkout/${id}`;

  await db.insert(schema.paymentIntents).values({
    id,
    status: "created",
    amountXrp: body.amount,
    amountDrops,
    asset: body.asset,
    destinationAddress: destination,
    orderId: body.orderId,
    resourceId: body.resourceId,
    mode: body.mode,
    memoHex,
    webhookUrl: body.webhookUrl,
    successUrl: body.successUrl,
    cancelUrl: body.cancelUrl,
    xamanPayloadId: null,
    xamanPayloadUrl: null,
    txHash: null,
    metadataJson: body.metadata ? JSON.stringify(body.metadata) : null,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    status: "created",
    amount: body.amount,
    asset: body.asset,
    orderId: body.orderId,
    resourceId: body.resourceId ?? null,
    mode: body.mode,
    checkoutUrl,
    txHash: null,
    metadata: body.metadata ?? null,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
