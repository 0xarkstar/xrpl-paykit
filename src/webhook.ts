/**
 * Signed Webhook — Stripe-compatible HMAC-SHA256
 *
 * Two responsibilities:
 *
 *   1. EMITTER (merchant-bound):
 *      - Sign event payload with HMAC-SHA256(secret, body)
 *      - POST to merchant's webhook URL
 *      - Retry with exponential backoff up to 7 attempts (~80h total)
 *      - Include Idempotency-Key for safe replay
 *
 *   2. VERIFIER (merchant SDK side):
 *      - Constant-time signature comparison
 *      - Reject stale timestamps (replay protection)
 *      - Merchant verifies inbound webhook before trusting payload
 *
 * Header format (matches Stripe):
 *
 *   XPK-Signature: t=<unix_ms>,v1=<hex_hmac_sha256>
 *
 * The signed string is `${t}.${rawBody}` (timestamp-binding prevents
 * replay attacks across time windows).
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  WebhookDeliveryOptions,
  WebhookEvent,
} from './types.js';
import { DEFAULT_WEBHOOK_OPTIONS, PayKitError } from './types.js';

// =====================================================================
// Signature: generate
// =====================================================================

/**
 * Compute the canonical `XPK-Signature` header value for a webhook payload.
 *
 * @param rawBody — the exact request body that will be sent (must be byte-identical to what verifier sees)
 * @param secret — merchant's webhook signing secret
 * @param timestampMs — unix epoch milliseconds (defaults to now)
 */
export function signWebhook(rawBody: string, secret: string, timestampMs: number = Date.now()): string {
  const signed = `${timestampMs}.${rawBody}`;
  const hmac = createHmac('sha256', secret).update(signed).digest('hex');
  return `t=${timestampMs},v1=${hmac}`;
}

// =====================================================================
// Signature: verify (merchant SDK side)
// =====================================================================

export interface VerifyOptions {
  /**
   * Maximum acceptable age of the timestamp, in milliseconds.
   * Default: 5 minutes. Reject older timestamps as potential replays.
   */
  readonly toleranceMs?: number;
}

/**
 * Verify an inbound webhook signature.
 *
 * Returns true iff:
 *   1. Header is well-formed (`t=…,v1=…`)
 *   2. HMAC matches (constant-time comparison)
 *   3. Timestamp is within tolerance window
 *
 * Never trust a webhook payload before this returns true.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  options: VerifyOptions = {}
): boolean {
  const toleranceMs = options.toleranceMs ?? 5 * 60 * 1000;

  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) return false;

  // 1. Age check.
  const age = Date.now() - parsed.timestamp;
  if (age < 0 || age > toleranceMs) return false;

  // 2. Recompute expected signature.
  const expectedSigned = `${parsed.timestamp}.${rawBody}`;
  const expectedHmac = createHmac('sha256', secret).update(expectedSigned).digest('hex');

  // 3. Constant-time compare.
  const expectedBuf = Buffer.from(expectedHmac, 'hex');
  const receivedBuf = Buffer.from(parsed.v1, 'hex');
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

interface ParsedSignature {
  readonly timestamp: number;
  readonly v1: string;
}

function parseSignatureHeader(header: string): ParsedSignature | undefined {
  // Expected: t=<unix_ms>,v1=<hex>
  const parts = header.split(',').map((s) => s.trim());
  let timestamp: number | undefined;
  let v1: string | undefined;
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === 't') {
      const n = Number(value);
      if (Number.isFinite(n)) timestamp = n;
    } else if (key === 'v1') {
      v1 = value;
    }
  }
  if (timestamp === undefined || v1 === undefined) return undefined;
  return { timestamp, v1 };
}

// =====================================================================
// Emitter: delivery with retry
// =====================================================================

/**
 * Default retry backoff schedule, in milliseconds.
 *
 * Total budget: 5s + 30s + 5m + 30m + 2h + 12h + 24h ≈ ~38 hours
 * for max attempts = 7. (Stripe quotes "up to 3 days" — same order.)
 */
export const DEFAULT_BACKOFF_SCHEDULE_MS: ReadonlyArray<number> = [
  5_000,
  30_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  12 * 60 * 60_000,
  24 * 60 * 60_000,
];

export interface DeliveryAttempt {
  readonly attempt: number; // 1-based
  readonly url: string;
  readonly httpStatus?: number;
  readonly error?: string;
  readonly timestampMs: number;
}

export interface DeliveryResult {
  readonly delivered: boolean;
  readonly attempts: ReadonlyArray<DeliveryAttempt>;
  readonly finalHttpStatus?: number;
}

/**
 * Send a webhook event to a single URL with retry.
 *
 * MVP behavior (stub):
 *   - Each attempt POSTs JSON body with signature header.
 *   - 2xx = delivered (stop)
 *   - 4xx (except 408/429) = drop (don't retry — merchant config error)
 *   - 5xx / 408 / 429 / network error = retry per backoff schedule
 *
 * Production should run this in a durable queue (Postgres SKIP LOCKED,
 * Redis Streams, SQS, etc.) — the in-process sleep approach below is
 * NOT survival-grade and is for SDK demos only.
 */
export async function deliverWebhook(
  url: string,
  event: WebhookEvent,
  secret: string,
  options?: Partial<WebhookDeliveryOptions>,
  sleepFn: (ms: number) => Promise<void> = defaultSleep
): Promise<DeliveryResult> {
  const opts: WebhookDeliveryOptions = { ...DEFAULT_WEBHOOK_OPTIONS, ...options };
  const backoff = DEFAULT_BACKOFF_SCHEDULE_MS;
  const rawBody = JSON.stringify(event);
  const idempotencyKey = event.id;

  const attempts: DeliveryAttempt[] = [];

  for (let i = 0; i < opts.maxAttempts; i++) {
    const attemptNum = i + 1;
    const timestampMs = Date.now();
    const signature = signWebhook(rawBody, secret, timestampMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [opts.signatureHeader]: signature,
          [opts.idempotencyHeader]: idempotencyKey,
        },
        body: rawBody,
      });

      attempts.push({ attempt: attemptNum, url, httpStatus: response.status, timestampMs });

      if (response.status >= 200 && response.status < 300) {
        return { delivered: true, attempts, finalHttpStatus: response.status };
      }

      // 4xx that we should NOT retry: definite client error.
      // 408 (timeout), 429 (rate limit) are retried.
      if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
        return { delivered: false, attempts, finalHttpStatus: response.status };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      attempts.push({ attempt: attemptNum, url, error: msg, timestampMs });
    }

    // If this was the last attempt, don't sleep.
    if (i + 1 >= opts.maxAttempts) break;

    const wait = backoff[Math.min(i, backoff.length - 1)] ?? 24 * 60 * 60_000;
    await sleepFn(wait);
  }

  return { delivered: false, attempts };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =====================================================================
// Convenience: bind secret + url at construction
// =====================================================================

export class WebhookEmitter {
  constructor(
    private readonly url: string,
    private readonly secret: string,
    private readonly options?: Partial<WebhookDeliveryOptions>
  ) {
    if (!url) throw new PayKitError('INVALID_CONFIG', 'webhook url required');
    if (!secret) throw new PayKitError('INVALID_CONFIG', 'webhook secret required');
  }

  send(event: WebhookEvent): Promise<DeliveryResult> {
    return deliverWebhook(this.url, event, this.secret, this.options);
  }
}
