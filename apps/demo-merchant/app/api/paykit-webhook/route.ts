// PRD §8.6 · §8.7 — PayKit signed webhook 수신. raw body + HMAC 검증 후 orders 갱신.

import { NextResponse } from "next/server";
import { constructEvent, WebhookSignatureError, type WebhookEvent, type PaymentIntent } from "@paykit/sdk";
import { appendEvent, setOrderState } from "@/src/orders";
import { config } from "@/src/config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("PayKit-Signature");
  try {
    const event = constructEvent<WebhookEvent<PaymentIntent>>({
      rawBody,
      signatureHeader,
      secret: config.paykitWebhookSecret,
    });
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      setOrderState(intent.orderId, {
        intentId: intent.id,
        txHash: intent.txHash ?? undefined,
        state: "paid",
      });
      appendEvent("xrpl.tx.validated", intent.txHash ?? "(no tx)", intent.txHash ?? undefined);
      appendEvent("webhook.received", `evt_${intent.id.replace(/^pi_/, "").slice(0, 8)}...`);
      // Flip to unlocked on the same beat so the UI animates.
      setOrderState(intent.orderId, { state: "unlocked" });
      appendEvent("resource.unlocked", intent.resourceId ?? "(resource)");
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof WebhookSignatureError) {
      appendEvent("webhook.rejected", e.code);
      return NextResponse.json({ error: e.code }, { status: 401 });
    }
    appendEvent("webhook.error", String(e?.message ?? e));
    return NextResponse.json({ error: "webhook_handler_error", message: String(e?.message ?? e) }, { status: 500 });
  }
}
