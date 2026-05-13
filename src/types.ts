/**
 * XRPL PayKit — Core types
 *
 * PRD v0.3 frozen. All values match the canonical spec; no drift.
 * See README "9-단계 검증" and "두 가지 함정과 우리의 답".
 */

// =====================================================================
// PaymentIntent — what the merchant creates before sending user to checkout
// =====================================================================

export interface PaymentIntent {
  /** Server-issued unique intent id (used as memo for ledger correlation). */
  readonly id: string;

  /** Merchant's order reference (free-form, opaque to PayKit). */
  readonly merchantOrderId: string;

  /** Destination XRPL classic address (where payment must arrive). */
  readonly destination: string;

  /**
   * Optional XRPL DestinationTag for merchant-side disambiguation.
   * When set, verification Gate 5 requires exact match.
   */
  readonly destinationTag?: number;

  /** Expected amount, exact (no Partial Payment tolerated — Gate 7). */
  readonly amount: PaymentAmount;

  /** PaymentIntent state. */
  readonly status: PaymentStatus;

  /** ISO timestamp when intent expires; after this, status -> 'expired'. */
  readonly expiresAt: string;

  /** ISO timestamp of creation. */
  readonly createdAt: string;

  /** Optional metadata the merchant can attach (returned in webhook). */
  readonly metadata?: Record<string, string>;
}

// =====================================================================
// PaymentAmount — handles XRP (drops) vs IOU (3-field) divergence
// =====================================================================

/** Native XRP amount in drops (string to avoid Number precision loss). */
export interface XrpAmount {
  readonly kind: 'xrp';
  /** Amount in drops (1 XRP = 1_000_000 drops). */
  readonly drops: string;
}

/** IOU (issued currency) amount. */
export interface IouAmount {
  readonly kind: 'iou';
  /** Currency code (3 letters or 40-hex). */
  readonly currency: string;
  /** Issuer XRPL classic address. */
  readonly issuer: string;
  /** Decimal value as string. */
  readonly value: string;
}

export type PaymentAmount = XrpAmount | IouAmount;

// =====================================================================
// PaymentStatus — explicit state machine
// =====================================================================

/**
 * Payment lifecycle states.
 *
 * Transitions:
 *   created -> pending (user opened checkout, signed in Xaman)
 *   pending -> succeeded (9 gates passed)
 *   pending -> failed (any gate failed deterministically)
 *   pending -> requires_review (ambiguous result, e.g. duplicate tx hash)
 *   created/pending -> expired (expiresAt passed without confirmation)
 *
 * `requires_review` is a deliberate non-recoverable state until a
 * merchant operator inspects and resolves.
 */
export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'expired'
  | 'requires_review';

// =====================================================================
// VerificationResult — the 9-gate decision
// =====================================================================

export interface VerificationResult {
  /** True iff ALL 9 gates passed (AND combination). */
  readonly verified: boolean;

  /** Per-gate pass/fail with optional reason. */
  readonly gates: ReadonlyArray<GateResult>;

  /** Validated XRPL transaction hash (only meaningful when verified). */
  readonly txHash?: string;

  /** Validated ledger index. */
  readonly ledgerIndex?: number;

  /** Recommended terminal status: 'succeeded' | 'failed' | 'requires_review'. */
  readonly suggestedStatus: 'succeeded' | 'failed' | 'requires_review';
}

export interface GateResult {
  readonly gate: VerificationGate;
  readonly passed: boolean;
  readonly reason?: string;
}

/** The 9 verification gates, in canonical order. */
export type VerificationGate =
  | 'validated'              // Gate 1: result.validated === true
  | 'tesSUCCESS'             // Gate 2: meta.TransactionResult === 'tesSUCCESS'
  | 'isPayment'              // Gate 3: TransactionType === 'Payment'
  | 'destinationMatch'       // Gate 4: result.Destination === intent.destination
  | 'destinationTagMatch'    // Gate 5: result.DestinationTag === intent.destinationTag (when set)
  | 'deliveredAmountExact'   // Gate 6: meta.delivered_amount EXACTLY matches intent.amount
  | 'notPartialPayment'      // Gate 7: (Flags & 0x00020000) === 0  -- tfPartialPayment rejected
  | 'memoIntentIdMatch'      // Gate 8: Memo decode -> memo.intentId === intent.id
  | 'txHashUnused';          // Gate 9: txHash NOT previously processed (UNIQUE constraint)

// =====================================================================
// Webhook payload — Stripe-compatible HMAC-SHA256 signed
// =====================================================================

export interface WebhookEvent {
  /** Unique event id (server-issued, idempotency key). */
  readonly id: string;

  /** Event type discriminator. */
  readonly type: WebhookEventType;

  /** Unix epoch milliseconds. */
  readonly created: number;

  /** API version that produced this event. */
  readonly apiVersion: string;

  /** Event payload (shape depends on type). */
  readonly data: WebhookEventData;
}

export type WebhookEventType =
  | 'payment_intent.created'
  | 'payment_intent.pending'
  | 'payment_intent.succeeded'
  | 'payment_intent.failed'
  | 'payment_intent.expired'
  | 'payment_intent.requires_review';

export type WebhookEventData =
  | { kind: 'payment_intent'; intent: PaymentIntent; verification?: VerificationResult };

export interface WebhookDeliveryOptions {
  /**
   * Retry budget — matches Stripe (7 attempts over ~80 hours).
   * Default backoff: 5s, 30s, 5m, 30m, 2h, 12h, 24h.
   */
  readonly maxAttempts: number;

  /** Idempotency key header name (default: `Idempotency-Key`). */
  readonly idempotencyHeader: string;

  /** HMAC signature header name (default: `XPK-Signature`). */
  readonly signatureHeader: string;
}

export const DEFAULT_WEBHOOK_OPTIONS: WebhookDeliveryOptions = {
  maxAttempts: 7,
  idempotencyHeader: 'Idempotency-Key',
  signatureHeader: 'XPK-Signature',
};

// =====================================================================
// XRPL transaction shape (minimal — we don't model the whole rippled API)
// =====================================================================

/** Subset of XRPL `tx` response that PayKit verification consumes. */
export interface XrplTxResponse {
  readonly validated: boolean;
  readonly TransactionType: string;
  readonly Destination?: string;
  readonly DestinationTag?: number;
  readonly Flags: number;
  readonly Amount?: PaymentAmountLike;
  readonly Memos?: ReadonlyArray<XrplMemoWrapper>;
  readonly hash: string;
  readonly ledger_index?: number;
  readonly meta: {
    readonly TransactionResult: string;
    readonly delivered_amount?: PaymentAmountLike;
  };
}

/** XRPL amount shape on the wire (string for XRP drops, object for IOU). */
export type PaymentAmountLike = string | {
  readonly currency: string;
  readonly issuer: string;
  readonly value: string;
};

export interface XrplMemoWrapper {
  readonly Memo: {
    readonly MemoType?: string;
    readonly MemoData?: string;
    readonly MemoFormat?: string;
  };
}

// =====================================================================
// SDK config
// =====================================================================

export interface PayKitConfig {
  /** XRPL JSON-RPC or WebSocket endpoint (e.g., `wss://s.altnet.rippletest.net:51233`). */
  readonly xrplEndpoint: string;

  /** Merchant's receiving address (default destination for all intents). */
  readonly merchantAddress: string;

  /** Webhook secret for HMAC-SHA256 signing. */
  readonly webhookSecret: string;

  /** Optional override for webhook delivery options. */
  readonly webhookOptions?: Partial<WebhookDeliveryOptions>;

  /** Memo identifier prefix used to namespace intent ids (default: `xpk:`). */
  readonly memoPrefix?: string;
}

// =====================================================================
// Errors
// =====================================================================

export class PayKitError extends Error {
  constructor(public readonly code: PayKitErrorCode, message: string) {
    super(message);
    this.name = 'PayKitError';
  }
}

export type PayKitErrorCode =
  | 'INTENT_NOT_FOUND'
  | 'INTENT_EXPIRED'
  | 'INVALID_AMOUNT'
  | 'VERIFICATION_FAILED'
  | 'DUPLICATE_TX_HASH'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'XRPL_RPC_ERROR'
  | 'INVALID_CONFIG';
