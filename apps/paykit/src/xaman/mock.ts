// Mock Xaman adapter — used when XAMAN_MODE=mock or API key missing.
// PRD §17.1: keep mock fallback so demo works even without Xaman creds.

import type { PaymentIntentRow } from "../db/schema";
import { env } from "../config";

// Track simulated approvals in process memory keyed by payloadId.
const mockApprovals = new Map<string, { txHash: string }>();

export async function createMockPayload(intent: PaymentIntentRow) {
  const payloadId = `mock_${intent.id}`;
  return {
    payloadId,
    payloadUrl: `${env.PAYKIT_BASE_URL}/checkout/${intent.id}?mock=1`,
  };
}

export async function getMockPayloadStatus(payloadId: string, intent: PaymentIntentRow) {
  const approved = mockApprovals.get(payloadId);
  return {
    signed: Boolean(approved),
    rejected: false,
    expired: false,
    txHash: approved?.txHash ?? null,
  };
}

export function simulateApprove(intent: PaymentIntentRow): { txHash: string } {
  const txHash = mockTxHashForIntent(intent.id);
  mockApprovals.set(`mock_${intent.id}`, { txHash });
  return { txHash };
}

export function mockTxHashForIntent(intentId: string): string {
  // deterministic 64-char hex (XRPL tx hash format) derived from intent id.
  // Used by mock XRPL verifier to pair the fixture with the right intent.
  const seed = intentId.padEnd(32, "x");
  return Buffer.from(seed).toString("hex").padEnd(64, "0").slice(0, 64).toUpperCase();
}
