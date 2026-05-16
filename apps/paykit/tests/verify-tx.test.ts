// PRD §8.4 — 9 verification conditions. We exercise the pure check function via a fixture-injected mock.

import { describe, it, expect } from "vitest";
import { stringToHex, PAYKIT_MEMO_TYPE } from "../src/domain/memo";

// Pull the check function indirectly via the fixture-driven verifier.
import { verifyXrplTransaction, type RawXrplTx } from "../src/xrpl/verify-tx";
import * as xamanMode from "../src/services/xaman-mode";
import * as fixturesMod from "../src/xrpl/fixtures";

// Force mock mode regardless of env, and patch the fixture store with hand-crafted txs.
beforeAllMockMode();

function buildTx(overrides: Partial<RawXrplTx> = {}): RawXrplTx {
  return {
    validated: true,
    TransactionType: "Payment",
    Destination: "rMerchantTestAddressXXXXXXXXXXXXXXX",
    Memos: [{
      Memo: {
        MemoType: stringToHex(PAYKIT_MEMO_TYPE),
        MemoFormat: stringToHex("application/json"),
        MemoData: stringToHex(JSON.stringify({ intentId: "pi_TEST", orderId: "ORD-1" })),
      },
    }],
    meta: {
      TransactionResult: "tesSUCCESS",
      delivered_amount: "1250000",
    },
    ...overrides,
  };
}

function withFixture(hash: string, tx: RawXrplTx) {
  // Directly reach into the dynamicFixtures map via overrideFixture/registerMockFixture isn't enough,
  // so we monkey-patch getFixtureTx for this test only.
  vi.spyOn(fixturesMod, "getFixtureTx").mockImplementation((h) => (h === hash ? tx : null));
}

describe("verifyXrplTransaction (mock mode)", () => {
  const expected = { intentId: "pi_TEST", destination: "rMerchantTestAddressXXXXXXXXXXXXXXX", amountDrops: "1250000" };

  it("passes 9 conditions on happy path", async () => {
    withFixture("HASH_OK", buildTx());
    const result = await verifyXrplTransaction("HASH_OK", expected);
    expect(result.ok).toBe(true);
  });

  it("fails when tx not found", async () => {
    withFixture("HASH_OK", buildTx()); // any
    const result = await verifyXrplTransaction("MISSING_HASH", expected);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("tx_not_found");
  });

  it("fails when not validated", async () => {
    withFixture("HASH_NV", buildTx({ validated: false }));
    const r = await verifyXrplTransaction("HASH_NV", expected);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("tx_not_validated");
  });

  it("fails when tx failed result", async () => {
    withFixture("HASH_FAIL", buildTx({ meta: { TransactionResult: "tecPATH_DRY", delivered_amount: "1250000" } }));
    const r = await verifyXrplTransaction("HASH_FAIL", expected);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("tx_failed");
  });

  it("fails when not a payment", async () => {
    withFixture("HASH_OFFER", buildTx({ TransactionType: "OfferCreate" }));
    const r = await verifyXrplTransaction("HASH_OFFER", expected);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not_payment");
  });

  it("fails wrong destination", async () => {
    withFixture("HASH_DEST", buildTx({ Destination: "rOtherAddressXXXXXXXXXXXXXXXXXXXXXX" }));
    const r = await verifyXrplTransaction("HASH_DEST", expected);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("wrong_destination");
  });

  it("fails partial payment when delivered_amount is object", async () => {
    withFixture("HASH_PARTIAL", buildTx({ meta: { TransactionResult: "tesSUCCESS", delivered_amount: { value: "1.25" } as any } }));
    const r = await verifyXrplTransaction("HASH_PARTIAL", expected);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("partial_payment_not_supported");
  });

  it("fails wrong amount", async () => {
    withFixture("HASH_AMT", buildTx({ meta: { TransactionResult: "tesSUCCESS", delivered_amount: "1000000" } }));
    const r = await verifyXrplTransaction("HASH_AMT", expected);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("wrong_amount");
  });

  it("fails missing memo", async () => {
    withFixture("HASH_NOMEMO", buildTx({ Memos: [] }));
    const r = await verifyXrplTransaction("HASH_NOMEMO", expected);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("missing_memo");
  });

  it("fails intent mismatch", async () => {
    withFixture("HASH_MISMATCH", buildTx({
      Memos: [{
        Memo: {
          MemoType: stringToHex(PAYKIT_MEMO_TYPE),
          MemoFormat: stringToHex("application/json"),
          MemoData: stringToHex(JSON.stringify({ intentId: "pi_OTHER", orderId: "ORD-1" })),
        },
      }],
    }));
    const r = await verifyXrplTransaction("HASH_MISMATCH", expected);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("intent_mismatch");
  });
});

function beforeAllMockMode() {
  // declared at top so we don't accidentally run real xrpl.js.
  // Vitest hoists vi.mock automatically, so simulate via spyOn at file load.
  vi.spyOn(xamanMode, "isMockMode").mockReturnValue(true);
}

// vitest globals
import { vi } from "vitest";
