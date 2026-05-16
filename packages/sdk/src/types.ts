// PRD v0.2 §11 — entity types shared between paykit core, demo merchant, and SDK consumers.

export type IntentStatus =
  | "created"
  | "pending"
  | "succeeded"
  | "failed"
  | "expired"
  | "requires_review";

export type IntentMode = "checkout";

export type Asset = "XRP";

export interface PaymentIntent {
  id: string;
  status: IntentStatus;
  amount: string;                  // human readable, e.g. "1.25"
  asset: Asset;
  orderId: string;
  resourceId?: string | null;
  mode: IntentMode;
  checkoutUrl?: string;
  txHash?: string | null;
  metadata?: Record<string, unknown> | null;
  expiresAt: string;               // ISO
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePaymentIntentInput {
  amount: string;
  asset?: Asset;                   // default XRP
  orderId: string;
  resourceId?: string;
  mode?: IntentMode;               // default checkout
  webhookUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, unknown>;
}

export type WebhookEventType = "payment_intent.succeeded" | "payment_intent.failed" | "payment_intent.expired";

export interface WebhookEvent<T = PaymentIntent> {
  id: string;
  type: WebhookEventType;
  created: string;                 // ISO
  data: { object: T };
}

export type VerifyReason =
  | "tx_not_found"
  | "tx_not_validated"
  | "tx_failed"
  | "not_payment"
  | "wrong_destination"
  | "wrong_amount"
  | "partial_payment_not_supported"
  | "missing_memo"
  | "memo_decode_failed"
  | "intent_mismatch"
  | "duplicate_tx"
  | "intent_expired";

export interface VerifySuccess {
  ok: true;
  intent: PaymentIntent;
}

export interface VerifyFailure {
  ok: false;
  reason: VerifyReason;
  detail?: Record<string, unknown>;
}

export type VerifyResult = VerifySuccess | VerifyFailure;
