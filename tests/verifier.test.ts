/**
 * 9-단계 검증 — basic correctness tests.
 *
 * Covers the canonical attack scenarios from README "두 가지 함정과 우리의 답":
 *   - Happy path (all 9 gates pass)
 *   - Partial Payment exploit (Gate 7 must reject)
 *   - Duplicate tx hash (Gate 9 must mark requires_review)
 *   - tesSUCCESS-but-wrong-destination (Gate 4 must reject)
 *   - Wrong delivered_amount (Gate 6 must reject)
 *   - Memo intent id mismatch (Gate 8 must reject)
 */

import { describe, expect, it } from 'vitest';
import {
  InMemoryProcessedTxHashStore,
  verifyPayment,
  type PaymentIntent,
  type XrplTxResponse,
} from '../src/index.js';

const TF_PARTIAL_PAYMENT = 0x00020000;

const baseIntent: PaymentIntent = {
  id: 'xpk:abc123',
  merchantOrderId: 'order_test_001',
  destination: 'rNeAi6oLaxGyH3PNijKH4N3Pp8BygKVLCN',
  amount: { kind: 'xrp', drops: '1000000' },
  status: 'pending',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  createdAt: new Date().toISOString(),
};

function hex(s: string): string {
  return Buffer.from(s, 'utf8').toString('hex').toUpperCase();
}

function makeTx(overrides: Partial<XrplTxResponse> = {}): XrplTxResponse {
  return {
    validated: true,
    TransactionType: 'Payment',
    Destination: baseIntent.destination,
    Flags: 0,
    Amount: '1000000',
    Memos: [
      {
        Memo: {
          MemoType: hex('xpk:intent'),
          MemoData: hex(baseIntent.id),
        },
      },
    ],
    hash: 'A1'.repeat(32),
    ledger_index: 100,
    meta: {
      TransactionResult: 'tesSUCCESS',
      delivered_amount: '1000000',
    },
    ...overrides,
  };
}

describe('verifyPayment — 9-단계 검증', () => {
  it('all 9 gates pass on a clean payment', async () => {
    const store = new InMemoryProcessedTxHashStore();
    const result = await verifyPayment(baseIntent, makeTx(), store);
    expect(result.verified).toBe(true);
    expect(result.suggestedStatus).toBe('succeeded');
    expect(result.gates.every((g) => g.passed)).toBe(true);
  });

  it('Gate 7 rejects tfPartialPayment exploit', async () => {
    const tx = makeTx({
      Flags: TF_PARTIAL_PAYMENT,
      meta: { TransactionResult: 'tesSUCCESS', delivered_amount: '1' }, // 1 drop, not 1M
    });
    const result = await verifyPayment(baseIntent, tx, new InMemoryProcessedTxHashStore());
    expect(result.verified).toBe(false);
    expect(result.suggestedStatus).toBe('failed');
    const gate7 = result.gates.find((g) => g.gate === 'notPartialPayment');
    expect(gate7?.passed).toBe(false);
  });

  it('Gate 9 marks duplicate tx hash as requires_review (not failed)', async () => {
    const store = new InMemoryProcessedTxHashStore();
    await store.add(makeTx().hash); // pre-existing
    const result = await verifyPayment(baseIntent, makeTx(), store);
    expect(result.verified).toBe(false);
    expect(result.suggestedStatus).toBe('requires_review');
    const gate9 = result.gates.find((g) => g.gate === 'txHashUnused');
    expect(gate9?.passed).toBe(false);
  });

  it('Gate 4 rejects wrong destination', async () => {
    const tx = makeTx({ Destination: 'rWrongAddress0000000000000000000000' });
    const result = await verifyPayment(baseIntent, tx, new InMemoryProcessedTxHashStore());
    expect(result.verified).toBe(false);
    const gate4 = result.gates.find((g) => g.gate === 'destinationMatch');
    expect(gate4?.passed).toBe(false);
  });

  it('Gate 6 rejects under-delivery', async () => {
    const tx = makeTx({ meta: { TransactionResult: 'tesSUCCESS', delivered_amount: '500000' } });
    const result = await verifyPayment(baseIntent, tx, new InMemoryProcessedTxHashStore());
    expect(result.verified).toBe(false);
    const gate6 = result.gates.find((g) => g.gate === 'deliveredAmountExact');
    expect(gate6?.passed).toBe(false);
  });

  it('Gate 8 rejects memo with wrong intent id', async () => {
    const tx = makeTx({
      Memos: [
        {
          Memo: {
            MemoType: hex('xpk:intent'),
            MemoData: hex('xpk:DIFFERENT_INTENT'),
          },
        },
      ],
    });
    const result = await verifyPayment(baseIntent, tx, new InMemoryProcessedTxHashStore());
    expect(result.verified).toBe(false);
    const gate8 = result.gates.find((g) => g.gate === 'memoIntentIdMatch');
    expect(gate8?.passed).toBe(false);
  });

  it('Gate 2 rejects non-tesSUCCESS result', async () => {
    const tx = makeTx({ meta: { TransactionResult: 'tecPATH_PARTIAL', delivered_amount: '1000000' } });
    const result = await verifyPayment(baseIntent, tx, new InMemoryProcessedTxHashStore());
    expect(result.verified).toBe(false);
    const gate2 = result.gates.find((g) => g.gate === 'tesSUCCESS');
    expect(gate2?.passed).toBe(false);
  });

  it('Gate 5 vacuously passes when intent has no DestinationTag', async () => {
    const result = await verifyPayment(baseIntent, makeTx(), new InMemoryProcessedTxHashStore());
    const gate5 = result.gates.find((g) => g.gate === 'destinationTagMatch');
    expect(gate5?.passed).toBe(true);
  });

  it('Gate 5 enforces DestinationTag when intent sets one', async () => {
    const intent = { ...baseIntent, destinationTag: 42 };
    const tx = makeTx({ DestinationTag: 7 }); // wrong
    const result = await verifyPayment(intent, tx, new InMemoryProcessedTxHashStore());
    expect(result.verified).toBe(false);
    const gate5 = result.gates.find((g) => g.gate === 'destinationTagMatch');
    expect(gate5?.passed).toBe(false);
  });
});
