/**
 * 9-단계 ledger 검증 (Verified Reconciliation)
 *
 * PayKit's core differentiator. AND-combined 9 gates that turn an XRPL
 * transaction into ground-truth payment confirmation.
 *
 * Why 9 gates and not "Xaman signed = paid"?
 *
 *   Xaman returns success on user signature only. The signed tx may
 *   still fail on the ledger (insufficient balance, claimed by destination,
 *   tfPartialPayment exploit, memo mismatch, etc.). The ONLY ground truth
 *   is the validated XRPL ledger, and even there 8 additional invariants
 *   must hold simultaneously.
 *
 * Gate order is intentional: cheapest checks first to short-circuit on
 * obvious failures before more expensive lookups (Gate 9 hits the
 * processed-hashes store).
 *
 * See README "두 가지 함정과 우리의 답" for the canonical attack scenarios
 * each gate defends against.
 */

import type {
  GateResult,
  PaymentAmount,
  PaymentAmountLike,
  PaymentIntent,
  VerificationResult,
  XrplMemoWrapper,
  XrplTxResponse,
} from './types.js';

// =====================================================================
// Public API
// =====================================================================

/**
 * Verify an XRPL transaction against a PaymentIntent.
 *
 * @param intent — the merchant-side expected state
 * @param tx — the XRPL `tx` response (validated ledger preferred)
 * @param processedTxHashStore — read-side of the processed-hashes UNIQUE store
 *                               (used for Gate 9 duplicate detection)
 */
export async function verifyPayment(
  intent: PaymentIntent,
  tx: XrplTxResponse,
  processedTxHashStore: ProcessedTxHashStore
): Promise<VerificationResult> {
  const gates: GateResult[] = [];

  // Gate 1: validated ledger only
  gates.push(gate1_validated(tx));

  // Gate 2: tesSUCCESS — many other result codes (tec*, ter*) still create
  // a validated tx that did NOT transfer funds. Only tesSUCCESS is final.
  gates.push(gate2_tesSUCCESS(tx));

  // Gate 3: TransactionType === 'Payment'
  gates.push(gate3_isPayment(tx));

  // Gate 4: Destination matches the intent
  gates.push(gate4_destinationMatch(tx, intent));

  // Gate 5: DestinationTag matches when intent specifies one
  gates.push(gate5_destinationTagMatch(tx, intent));

  // Gate 6: delivered_amount EXACT match (NOT tx.Amount — Amount is the
  //         sender's authorized maximum, not what arrived. Always read
  //         delivered_amount from meta.)
  gates.push(gate6_deliveredAmountExact(tx, intent));

  // Gate 7: Reject tfPartialPayment flag
  gates.push(gate7_notPartialPayment(tx));

  // Gate 8: Memo decode + intent id match
  gates.push(gate8_memoIntentIdMatch(tx, intent));

  // Gate 9: txHash never processed before (UNIQUE)
  gates.push(await gate9_txHashUnused(tx, processedTxHashStore));

  const verified = gates.every((g) => g.passed);

  // Outcome mapping:
  //   - All gates pass            -> 'succeeded'
  //   - Gate 9 fails (duplicate)  -> 'requires_review' (operator decides)
  //   - Any other gate fails      -> 'failed' (deterministic rejection)
  let suggestedStatus: VerificationResult['suggestedStatus'];
  if (verified) {
    suggestedStatus = 'succeeded';
  } else if (gates.find((g) => g.gate === 'txHashUnused' && !g.passed)) {
    suggestedStatus = 'requires_review';
  } else {
    suggestedStatus = 'failed';
  }

  return {
    verified,
    gates,
    txHash: verified ? tx.hash : undefined,
    ledgerIndex: tx.ledger_index,
    suggestedStatus,
  };
}

// =====================================================================
// Gate implementations
// =====================================================================

function gate1_validated(tx: XrplTxResponse): GateResult {
  return {
    gate: 'validated',
    passed: tx.validated === true,
    reason: tx.validated === true ? undefined : 'tx.validated !== true',
  };
}

function gate2_tesSUCCESS(tx: XrplTxResponse): GateResult {
  const result = tx.meta.TransactionResult;
  return {
    gate: 'tesSUCCESS',
    passed: result === 'tesSUCCESS',
    reason: result === 'tesSUCCESS' ? undefined : `TransactionResult=${result}`,
  };
}

function gate3_isPayment(tx: XrplTxResponse): GateResult {
  return {
    gate: 'isPayment',
    passed: tx.TransactionType === 'Payment',
    reason: tx.TransactionType === 'Payment' ? undefined : `TransactionType=${tx.TransactionType}`,
  };
}

function gate4_destinationMatch(tx: XrplTxResponse, intent: PaymentIntent): GateResult {
  const matched = tx.Destination === intent.destination;
  return {
    gate: 'destinationMatch',
    passed: matched,
    reason: matched ? undefined : `expected ${intent.destination}, got ${tx.Destination ?? '<missing>'}`,
  };
}

function gate5_destinationTagMatch(tx: XrplTxResponse, intent: PaymentIntent): GateResult {
  // When intent does NOT specify a DestinationTag, this gate is vacuously
  // true (no constraint to enforce). When it does, mismatch is a hard fail.
  if (intent.destinationTag === undefined) {
    return { gate: 'destinationTagMatch', passed: true };
  }
  const matched = tx.DestinationTag === intent.destinationTag;
  return {
    gate: 'destinationTagMatch',
    passed: matched,
    reason: matched
      ? undefined
      : `expected DestinationTag=${intent.destinationTag}, got ${tx.DestinationTag ?? '<missing>'}`,
  };
}

function gate6_deliveredAmountExact(tx: XrplTxResponse, intent: PaymentIntent): GateResult {
  const delivered = tx.meta.delivered_amount;
  if (delivered === undefined) {
    return {
      gate: 'deliveredAmountExact',
      passed: false,
      reason: 'meta.delivered_amount missing',
    };
  }
  const matched = amountsEqual(delivered, intent.amount);
  return {
    gate: 'deliveredAmountExact',
    passed: matched,
    reason: matched ? undefined : `delivered ${JSON.stringify(delivered)} != intent ${JSON.stringify(intent.amount)}`,
  };
}

/**
 * tfPartialPayment flag value: 0x00020000.
 *
 * When set, `Amount` is treated as the sender's MAXIMUM, and any subset
 * may be delivered (down to 1 drop). This is the textbook XRPL payment
 * exploit if a naive receiver trusts `Amount`. PayKit always rejects.
 */
const TF_PARTIAL_PAYMENT = 0x00020000;

function gate7_notPartialPayment(tx: XrplTxResponse): GateResult {
  const isPartial = (tx.Flags & TF_PARTIAL_PAYMENT) !== 0;
  return {
    gate: 'notPartialPayment',
    passed: !isPartial,
    reason: isPartial ? `tfPartialPayment flag set (Flags=0x${tx.Flags.toString(16)})` : undefined,
  };
}

function gate8_memoIntentIdMatch(tx: XrplTxResponse, intent: PaymentIntent): GateResult {
  const decoded = decodeIntentIdMemo(tx.Memos);
  if (decoded === undefined) {
    return { gate: 'memoIntentIdMatch', passed: false, reason: 'no decodable intent id memo found' };
  }
  const matched = decoded === intent.id;
  return {
    gate: 'memoIntentIdMatch',
    passed: matched,
    reason: matched ? undefined : `memo intentId=${decoded} != intent.id=${intent.id}`,
  };
}

async function gate9_txHashUnused(
  tx: XrplTxResponse,
  store: ProcessedTxHashStore
): Promise<GateResult> {
  const used = await store.has(tx.hash);
  return {
    gate: 'txHashUnused',
    passed: !used,
    reason: used ? `txHash=${tx.hash} already processed (UNIQUE violation)` : undefined,
  };
}

// =====================================================================
// Helpers
// =====================================================================

/**
 * Strict amount equality.
 *
 * XRP: string drops compared as decimal strings (no Number coercion).
 * IOU: currency + issuer + value all-exact (whitespace-trimmed).
 */
function amountsEqual(a: PaymentAmountLike, b: PaymentAmount): boolean {
  if (typeof a === 'string') {
    // XRP drops on the wire
    if (b.kind !== 'xrp') return false;
    return a === b.drops;
  }
  // IOU object
  if (b.kind !== 'iou') return false;
  return a.currency === b.currency && a.issuer === b.issuer && a.value === b.value;
}

/**
 * Decode a PayKit intent id from XRPL Memos.
 *
 * PayKit writes intent id as a hex-encoded UTF-8 string with
 * MemoType = hex('xpk:intent') and MemoFormat = hex('text/plain').
 *
 * Returns the decoded intent id, or undefined if no matching memo found.
 */
function decodeIntentIdMemo(memos: ReadonlyArray<XrplMemoWrapper> | undefined): string | undefined {
  if (!memos || memos.length === 0) return undefined;
  const TARGET_TYPE_HEX = utf8ToHex('xpk:intent');
  for (const wrapper of memos) {
    const memo = wrapper.Memo;
    if (memo.MemoType !== TARGET_TYPE_HEX) continue;
    if (memo.MemoData === undefined) continue;
    try {
      return hexToUtf8(memo.MemoData);
    } catch {
      // Invalid hex — skip and continue searching.
      continue;
    }
  }
  return undefined;
}

function utf8ToHex(s: string): string {
  return Buffer.from(s, 'utf8').toString('hex').toUpperCase();
}

function hexToUtf8(hex: string): string {
  return Buffer.from(hex, 'hex').toString('utf8');
}

// =====================================================================
// ProcessedTxHashStore — pluggable backend for Gate 9
// =====================================================================

/**
 * Backend interface for the "tx hash UNIQUE" constraint.
 *
 * In production this should be backed by a database with a UNIQUE index
 * on the hash column. For MVP / tests, an in-memory Set works.
 *
 * Implementations must guarantee: `has(hash)` + `add(hash)` is atomic
 * under concurrent verification (otherwise Gate 9 has a TOCTOU race
 * and the same tx can unlock two orders).
 */
export interface ProcessedTxHashStore {
  has(hash: string): Promise<boolean>;
  add(hash: string): Promise<void>;
}

/** In-memory store. NOT safe for multi-process — use only for tests/MVP. */
export class InMemoryProcessedTxHashStore implements ProcessedTxHashStore {
  private readonly set = new Set<string>();
  async has(hash: string): Promise<boolean> {
    return this.set.has(hash);
  }
  async add(hash: string): Promise<void> {
    this.set.add(hash);
  }
}
