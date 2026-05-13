/**
 * PaymentIntent state machine.
 *
 * Canonical transition table. PayKit refuses transitions not listed here,
 * which prevents:
 *   - "succeeded" being clobbered by a late ledger event
 *   - "failed" being silently retried into "succeeded"
 *   - "expired" being un-expired
 *
 * Once a payment reaches a terminal state (succeeded / failed / expired /
 * requires_review), no further transitions are allowed.
 */

import type { PaymentStatus } from './types.js';

// =====================================================================
// Transition table
// =====================================================================

const ALLOWED_TRANSITIONS: Record<PaymentStatus, ReadonlyArray<PaymentStatus>> = {
  // Just created — user has not interacted with checkout yet.
  created: ['pending', 'expired'],

  // User opened checkout / signed in Xaman. Awaiting ledger verification.
  pending: ['succeeded', 'failed', 'expired', 'requires_review'],

  // All 9 gates passed. Terminal.
  succeeded: [],

  // Deterministic gate failure. Terminal.
  // (No auto-retry: the failure is in the ledger, not in PayKit's processing.)
  failed: [],

  // Window passed without confirmation. Terminal.
  expired: [],

  // Gate 9 (duplicate tx hash) or other ambiguous result. Operator must
  // resolve manually. Terminal until operator action (out-of-band).
  requires_review: [],
};

// =====================================================================
// Public API
// =====================================================================

/**
 * Returns true iff transitioning from `from` to `to` is allowed.
 *
 * Self-transitions (e.g., pending -> pending) are NOT allowed — caller
 * should noop instead.
 */
export function isTransitionAllowed(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Terminal states: no further transitions possible.
 */
export const TERMINAL_STATES: ReadonlySet<PaymentStatus> = new Set([
  'succeeded',
  'failed',
  'expired',
  'requires_review',
]);

export function isTerminal(status: PaymentStatus): boolean {
  return TERMINAL_STATES.has(status);
}
