/**
 * Hosted Checkout — merchant 결제 UI 0줄
 *
 * The merchant calls `createIntent()` and redirects the user to
 * `getCheckoutUrl(intentId)`. PayKit handles:
 *   - Xaman QR + deep link generation
 *   - 3-stage UX visualization (Wallet Approved → Ledger Verified → Unlocked)
 *   - Mobile↔Desktop redirect failover (Xaman redirect is unreliable;
 *     we always verify on the ledger, not on Xaman's response)
 *
 * Merchant integration is one function call. Verification + webhook
 * delivery + state machine are PayKit's responsibility.
 */

import { randomBytes } from 'node:crypto';
import type {
  PayKitConfig,
  PaymentAmount,
  PaymentIntent,
  PaymentStatus,
} from './types.js';
import { PayKitError } from './types.js';
import { isTransitionAllowed } from './state-machine.js';

// =====================================================================
// CreateIntent params
// =====================================================================

export interface CreateIntentParams {
  /** Merchant's order reference (free-form). */
  readonly merchantOrderId: string;

  /** Amount to charge. */
  readonly amount: PaymentAmount;

  /** Optional XRPL DestinationTag. */
  readonly destinationTag?: number;

  /** Optional override for destination (defaults to config.merchantAddress). */
  readonly destination?: string;

  /**
   * Intent lifetime in seconds. After this window the intent transitions
   * to 'expired' and stops accepting payments. Default: 15 minutes.
   */
  readonly expiresInSeconds?: number;

  /** Free-form metadata returned in webhook payload. */
  readonly metadata?: Record<string, string>;
}

// =====================================================================
// Checkout
// =====================================================================

export class Checkout {
  constructor(
    private readonly config: PayKitConfig,
    private readonly store: IntentStore
  ) {}

  /**
   * Create a PaymentIntent. Returns immediately with status='created'.
   * The intent id is what the user's transaction Memo MUST contain
   * (verification Gate 8 enforces this).
   */
  async createIntent(params: CreateIntentParams): Promise<PaymentIntent> {
    validateAmount(params.amount);

    const id = generateIntentId(this.config.memoPrefix ?? 'xpk:');
    const now = Date.now();
    const ttl = (params.expiresInSeconds ?? 15 * 60) * 1000;

    const intent: PaymentIntent = {
      id,
      merchantOrderId: params.merchantOrderId,
      destination: params.destination ?? this.config.merchantAddress,
      destinationTag: params.destinationTag,
      amount: params.amount,
      status: 'created',
      expiresAt: new Date(now + ttl).toISOString(),
      createdAt: new Date(now).toISOString(),
      metadata: params.metadata,
    };

    await this.store.put(intent);
    return intent;
  }

  /**
   * Get the user-facing hosted checkout URL for a given intent.
   *
   * The URL is served by PayKit's hosted-checkout component (not part
   * of this SDK package — see `xrpl-paykit/hosted-checkout` repo).
   * The component fetches intent state by id, renders Xaman QR +
   * deep link + 3-stage progress, polls verification, and shows
   * unlock confirmation.
   */
  getCheckoutUrl(intentId: string, options?: { baseUrl?: string }): string {
    const base = options?.baseUrl ?? 'https://checkout.xrpl-paykit.dev';
    return `${base}/i/${encodeURIComponent(intentId)}`;
  }

  /** Retrieve an intent by id. */
  async getIntent(intentId: string): Promise<PaymentIntent> {
    const intent = await this.store.get(intentId);
    if (!intent) {
      throw new PayKitError('INTENT_NOT_FOUND', `intent not found: ${intentId}`);
    }
    return intent;
  }

  /**
   * Apply a status transition. Returns the updated intent.
   * Throws if the transition is not allowed by the state machine.
   *
   * (See state-machine.ts for the canonical transition table.)
   */
  async transitionStatus(intentId: string, next: PaymentStatus): Promise<PaymentIntent> {
    const current = await this.getIntent(intentId);
    const allowed = isTransitionAllowed(current.status, next);
    if (!allowed) {
      throw new PayKitError(
        'VERIFICATION_FAILED',
        `disallowed transition: ${current.status} -> ${next}`
      );
    }
    const updated: PaymentIntent = { ...current, status: next };
    await this.store.put(updated);
    return updated;
  }
}

// =====================================================================
// Intent storage (pluggable)
// =====================================================================

export interface IntentStore {
  put(intent: PaymentIntent): Promise<void>;
  get(id: string): Promise<PaymentIntent | undefined>;
}

export class InMemoryIntentStore implements IntentStore {
  private readonly map = new Map<string, PaymentIntent>();
  async put(intent: PaymentIntent): Promise<void> {
    this.map.set(intent.id, intent);
  }
  async get(id: string): Promise<PaymentIntent | undefined> {
    return this.map.get(id);
  }
}

// =====================================================================
// Helpers
// =====================================================================

function generateIntentId(prefix: string): string {
  return `${prefix}${randomBytes(12).toString('hex')}`;
}

function validateAmount(amount: PaymentAmount): void {
  if (amount.kind === 'xrp') {
    if (!/^[0-9]+$/.test(amount.drops)) {
      throw new PayKitError('INVALID_AMOUNT', `XRP drops must be non-negative integer string: ${amount.drops}`);
    }
    if (amount.drops === '0') {
      throw new PayKitError('INVALID_AMOUNT', 'XRP amount cannot be zero');
    }
  } else {
    if (amount.currency.length === 0 || amount.issuer.length === 0 || amount.value.length === 0) {
      throw new PayKitError('INVALID_AMOUNT', 'IOU amount fields must all be non-empty');
    }
  }
}

