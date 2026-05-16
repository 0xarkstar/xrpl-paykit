// Fixture XRPL transactions used by mock mode.
// Mirror the shape of a real `tx` response (validated, TransactionType, Destination, Memos, meta.delivered_amount).

import { stringToHex, PAYKIT_MEMO_TYPE } from "../../domain/memo";
import { mockTxHashForIntent } from "../../xaman/mock";
import type { RawXrplTx } from "../verify-tx";
import { getMerchantAddress } from "../../config";

const dynamicFixtures = new Map<string, RawXrplTx>();

export function registerMockFixture(intent: {
  id: string;
  orderId: string;
  resourceId?: string | null;
  amountDrops: string;
}): { txHash: string } {
  const txHash = mockTxHashForIntent(intent.id);
  const memoBody = JSON.stringify({
    intentId: intent.id,
    orderId: intent.orderId,
    resourceId: intent.resourceId ?? undefined,
  });
  const tx: RawXrplTx = {
    validated: true,
    TransactionType: "Payment",
    Destination: getMerchantAddress(),
    Memos: [
      {
        Memo: {
          MemoType: stringToHex(PAYKIT_MEMO_TYPE),
          MemoFormat: stringToHex("application/json"),
          MemoData: stringToHex(memoBody),
        },
      },
    ],
    meta: {
      TransactionResult: "tesSUCCESS",
      delivered_amount: intent.amountDrops,
    },
  };
  dynamicFixtures.set(txHash, tx);
  return { txHash };
}

export function getFixtureTx(txHash: string): RawXrplTx | null {
  return dynamicFixtures.get(txHash) ?? null;
}

export function overrideFixture(txHash: string, patch: Partial<RawXrplTx>) {
  const existing = dynamicFixtures.get(txHash);
  if (!existing) return;
  dynamicFixtures.set(txHash, { ...existing, ...patch });
}
