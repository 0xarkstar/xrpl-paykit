// PRD v0.2 §8.3 — Xaman fallback callback. Primary path is polling.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(_req: Request) {
  // Status updates happen via polling; we accept the callback for completeness.
  return NextResponse.json({ ok: true });
}
