// PRD v0.2 §8.1 — POST /api/v1/payment_intents

import { NextResponse } from "next/server";
import { createPaymentIntentSchema } from "@/src/domain/payment-intent";
import { createIntent, CreateIntentError } from "@/src/services/create-intent";
import { AmountFormatError } from "@/src/domain/drops";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = createPaymentIntentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const intent = await createIntent(parsed.data);
    return NextResponse.json(intent, { status: 200 });
  } catch (e) {
    if (e instanceof CreateIntentError) {
      return NextResponse.json({ error: e.code }, { status: 400 });
    }
    if (e instanceof AmountFormatError) {
      return NextResponse.json({ error: "invalid_amount_format" }, { status: 400 });
    }
    return NextResponse.json({ error: "internal", message: String((e as any)?.message ?? e) }, { status: 500 });
  }
}
