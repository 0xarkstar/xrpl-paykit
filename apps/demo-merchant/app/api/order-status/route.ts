// demo merchant client polling endpoint — returns order state + recent events.

import { NextResponse } from "next/server";
import { getOrder, getEvents, getOrCreateOrder } from "@/src/orders";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "order_id_required" }, { status: 400 });

  // ensure exists so the UI's first load returns a sane locked state.
  const order = getOrder(orderId) ?? getOrCreateOrder(orderId, "premium-search-result");
  return NextResponse.json({
    state: order.state,
    intentId: order.intentId,
    txHash: order.txHash,
    events: getEvents(),
  }, { headers: { "Cache-Control": "no-store" } });
}
