// Real Xaman SDK adapter. Lazy-imported so mock mode works without xumm-sdk installed.

import type { PaymentIntentRow } from "../db/schema";
import { env } from "../config";
import { encodeMemoForIntent } from "../domain/memo";

export async function createRealPayload(intent: PaymentIntentRow) {
  const { XummSdk } = await import("xumm-sdk");
  const sdk = new XummSdk(env.XAMAN_API_KEY!, env.XAMAN_API_SECRET!);
  const memo = encodeMemoForIntent({
    intentId: intent.id,
    orderId: intent.orderId,
    resourceId: intent.resourceId ?? undefined,
  });
  const created = await sdk.payload.create({
    txjson: {
      TransactionType: "Payment",
      Destination: intent.destinationAddress,
      Amount: intent.amountDrops,
      Memos: [{ Memo: memo }],
    } as any,
    options: {
      submit: true,
      expire: 5,
      return_url: {
        web: `${env.PAYKIT_BASE_URL}/checkout/${intent.id}`,
      },
    },
  });
  if (!created) throw new Error("xaman_create_failed");
  return {
    payloadId: created.uuid,
    payloadUrl: created.next.always,
  };
}

export async function getRealPayloadStatus(payloadId: string) {
  const { XummSdk } = await import("xumm-sdk");
  const sdk = new XummSdk(env.XAMAN_API_KEY!, env.XAMAN_API_SECRET!);
  const status = await sdk.payload.get(payloadId);
  return {
    signed: status?.meta.signed === true,
    rejected: status?.meta.signed === false && status?.meta.cancelled === true,
    expired: status?.meta.expired === true,
    txHash: status?.response.txid ?? null,
  };
}
