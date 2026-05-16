// Public-safe polling endpoint used by the checkout page.
// Returns only fields safe to expose to the browser (no memo, secret, etc.).

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/src/db/client";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { intentId: string } }) {
  const intent = await db.query.paymentIntents.findFirst({
    where: eq(schema.paymentIntents.id, params.intentId),
  });
  if (!intent) {
    return NextResponse.json({ error: "intent_not_found" }, { status: 404 });
  }
  return NextResponse.json(
    {
      id: intent.id,
      status: intent.status,
      txHash: intent.txHash,
      orderId: intent.orderId,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
