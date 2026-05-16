// PRD v0.2 §8.4 — POST /api/v1/payment_intents/:intentId/verify

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/src/db/client";
import { reconcilePayment } from "@/src/services/reconcile-payment";
import { refreshXamanPayloadStatus } from "@/src/services/xaman-mode";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { intentId: string } }) {
  const intent = await db.query.paymentIntents.findFirst({
    where: eq(schema.paymentIntents.id, params.intentId),
  });
  if (!intent) return NextResponse.json({ error: "intent_not_found" }, { status: 404 });

  let txHash: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.txHash === "string") txHash = body.txHash;
  } catch {
    // body optional
  }

  if (!txHash && intent.xamanPayloadId) {
    const status = await refreshXamanPayloadStatus(intent.xamanPayloadId, intent);
    if (status.txHash) txHash = status.txHash;
  }

  if (!txHash) {
    return NextResponse.json({ ok: false, reason: "tx_hash_required" }, { status: 400 });
  }

  const result = await reconcilePayment(intent.id, txHash);
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
