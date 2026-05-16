// PRD v0.2 §8.2 — Hosted checkout page.

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/src/db/client";
import { ensureXamanPayload } from "@/src/services/ensure-xaman-payload";
import { isMockMode } from "@/src/services/xaman-mode";
import { CheckoutClient } from "./checkout-client";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: { intentId: string } }) {
  let intent = await db.query.paymentIntents.findFirst({
    where: eq(schema.paymentIntents.id, params.intentId),
  });
  if (!intent) notFound();

  // Lazy-create the Xaman payload (and a mock fixture) the first time the page is viewed.
  if (!intent.xamanPayloadId) {
    intent = await ensureXamanPayload(intent);
  }

  return (
    <CheckoutClient
      intentId={intent.id}
      amount={intent.amountXrp}
      asset={intent.asset}
      destinationAddress={intent.destinationAddress}
      orderId={intent.orderId}
      resourceId={intent.resourceId}
      payloadUrl={intent.xamanPayloadUrl ?? ""}
      initialStatus={intent.status}
      mockMode={isMockMode()}
    />
  );
}
