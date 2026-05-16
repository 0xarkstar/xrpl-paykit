// PRD v0.2 §8.3 — Xaman real/mock toggle adapter.

import { getXamanMode } from "../config";
import { createMockPayload, getMockPayloadStatus, simulateApprove } from "../xaman/mock";
import { createRealPayload, getRealPayloadStatus } from "../xaman/client";
import type { PaymentIntentRow } from "../db/schema";

export interface XamanPayloadHandle {
  payloadId: string;
  payloadUrl: string;
}

export interface XamanPayloadStatus {
  signed: boolean;
  rejected: boolean;
  expired: boolean;
  txHash: string | null;
}

export async function createXamanPayloadForIntent(intent: PaymentIntentRow): Promise<XamanPayloadHandle> {
  return getXamanMode() === "real" ? createRealPayload(intent) : createMockPayload(intent);
}

export async function refreshXamanPayloadStatus(payloadId: string, intent: PaymentIntentRow): Promise<XamanPayloadStatus> {
  return getXamanMode() === "real" ? getRealPayloadStatus(payloadId) : getMockPayloadStatus(payloadId, intent);
}

export function isMockMode(): boolean {
  return getXamanMode() === "mock";
}

export { simulateApprove };
