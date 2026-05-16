// merchant → PayKit: payment intent 생성 + 결제 진입 URL 반환.

import { NextResponse } from "next/server";
import { getPaykitClient } from "@/src/paykit-client";
import { config } from "@/src/config";
import { appendEvent, getOrCreateOrder, setOrderState } from "@/src/orders";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const orderId = body.orderId ?? "ORD-PAYKIT-DEMO-1";
  const resourceId = body.resourceId ?? "premium-search-result";
  const amount = body.amount ?? "1.25";

  const order = getOrCreateOrder(orderId, resourceId);
  if (order.state === "paid" || order.state === "unlocked") {
    return NextResponse.json({ alreadyUnlocked: true, checkoutUrl: null }, { status: 200 });
  }

  const paykit = getPaykitClient();
  try {
    const intent = await paykit.paymentIntents.create({
      amount,
      orderId,
      resourceId,
      webhookUrl: `${config.merchantBaseUrl}/api/paykit-webhook`,
      successUrl: `${config.merchantBaseUrl}?paid=1`,
      cancelUrl: `${config.merchantBaseUrl}?canceled=1`,
      metadata: { demoUserId: "demo-user-1" },
    });

    setOrderState(orderId, { intentId: intent.id, state: "waiting_for_payment" });
    appendEvent("payment_intent.created", `pi_${intent.id.replace(/^pi_/, "").slice(0, 10)}...`);
    appendEvent("checkout.opened", `→ ${intent.checkoutUrl}`);

    return NextResponse.json({ checkoutUrl: intent.checkoutUrl, intentId: intent.id }, { status: 200 });
  } catch (e: any) {
    appendEvent("error", String(e?.message ?? e));
    return NextResponse.json({ error: "paykit_failed", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
