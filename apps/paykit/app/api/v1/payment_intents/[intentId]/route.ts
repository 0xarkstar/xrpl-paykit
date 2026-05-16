// PRD v0.2 §8.1 — GET /api/v1/payment_intents/:intentId

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/src/db/client";
import { rowToPaymentIntent } from "@/src/services/intent-mapping";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { intentId: string } }) {
  const intent = await db.query.paymentIntents.findFirst({
    where: eq(schema.paymentIntents.id, params.intentId),
  });
  if (!intent) {
    return NextResponse.json({ error: "intent_not_found" }, { status: 404 });
  }
  return NextResponse.json(rowToPaymentIntent(intent), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
