// Mock-only endpoint: lets the checkout page trigger simulate-approve when XAMAN_MODE=mock.
// PRD §17.1 — keep mock affordance separate from real flow.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/src/db/client";
import { simulateApprove, isMockMode } from "@/src/services/xaman-mode";
import { reconcilePayment } from "@/src/services/reconcile-payment";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isMockMode()) {
    return NextResponse.json({ error: "mock_only" }, { status: 403 });
  }
  const { intentId } = await req.json();
  if (!intentId || typeof intentId !== "string") {
    return NextResponse.json({ error: "intent_id_required" }, { status: 400 });
  }
  const intent = await db.query.paymentIntents.findFirst({
    where: eq(schema.paymentIntents.id, intentId),
  });
  if (!intent) return NextResponse.json({ error: "intent_not_found" }, { status: 404 });

  // Belt-and-suspenders: re-register the mock fixture here in case the checkout page hasn't
  // hit ensureXamanPayload (e.g. user POST'd this endpoint directly during tests).
  const { registerMockFixture } = await import("@/src/xrpl/fixtures");
  registerMockFixture({
    id: intent.id,
    orderId: intent.orderId,
    resourceId: intent.resourceId,
    amountDrops: intent.amountDrops,
  });

  const { txHash } = simulateApprove(intent);
  const result = await reconcilePayment(intentId, txHash);
  return NextResponse.json({ ...result, txHash }, { status: 200 });
}
