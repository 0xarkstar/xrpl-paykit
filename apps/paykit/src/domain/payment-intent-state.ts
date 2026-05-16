// PRD v0.2 §8.5 — intent state machine.

import type { IntentStatus } from "@paykit/sdk";
export type { IntentStatus };

const VALID_TRANSITIONS: Record<IntentStatus, IntentStatus[]> = {
  created: ["pending", "expired"],
  pending: ["succeeded", "failed", "expired"],
  succeeded: [],
  failed: [],
  expired: ["requires_review"],
  requires_review: ["succeeded"],
};

export function canTransition(from: IntentStatus, to: IntentStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: IntentStatus, to: IntentStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`invalid_transition: ${from} -> ${to}`);
  }
}

export function isTerminal(status: IntentStatus): boolean {
  return status === "succeeded" || status === "failed";
}
