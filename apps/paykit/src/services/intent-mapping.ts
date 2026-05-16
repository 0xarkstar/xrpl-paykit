import type { PaymentIntent } from "@paykit/sdk";
import type { PaymentIntentRow } from "../db/schema";
import { env } from "../config";

export function rowToPaymentIntent(row: PaymentIntentRow): PaymentIntent {
  return {
    id: row.id,
    status: row.status as PaymentIntent["status"],
    amount: row.amountXrp,
    asset: row.asset as PaymentIntent["asset"],
    orderId: row.orderId,
    resourceId: row.resourceId ?? null,
    mode: row.mode as PaymentIntent["mode"],
    checkoutUrl: `${env.PAYKIT_BASE_URL}/checkout/${row.id}`,
    txHash: row.txHash ?? null,
    metadata: row.metadataJson ? JSON.parse(row.metadataJson) : null,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
