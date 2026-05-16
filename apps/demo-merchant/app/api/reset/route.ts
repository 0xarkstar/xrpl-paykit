// Demo 전용 — orders + events 메모리 스토어 초기화.
// PRD scope 밖. 실제 production PayKit엔 없을 엔드포인트.

import { NextResponse } from "next/server";
import { resetAll } from "@/src/orders";

export const runtime = "nodejs";

export async function POST() {
  resetAll();
  return NextResponse.json({ ok: true });
}
