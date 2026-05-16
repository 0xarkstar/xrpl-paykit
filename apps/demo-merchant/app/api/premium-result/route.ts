// paid 상태가 아니면 premium content 반환 금지. ?paid=1 query는 신뢰 X (PRD §13.4).

import { NextResponse } from "next/server";
import { getOrder } from "@/src/orders";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "order_id_required" }, { status: 400 });

  const order = getOrder(orderId);
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  if (order.state !== "paid" && order.state !== "unlocked") {
    return NextResponse.json({ error: "locked", state: order.state }, { status: 402 });
  }

  return NextResponse.json({
    content:
      "✓ 검증된 결제 후 표시되는 프리미엄 콘텐츠 — 한국 RWA 8편 통합 인사이트.\n" +
      "결제는 XRPL 원장에서 직접 검증되었으며, signed webhook 으로 backend 상태가 변경되었습니다.\n" +
      "(이 응답은 orders[orderId].state === 'paid' | 'unlocked' 일 때만 반환됩니다.)",
  });
}
