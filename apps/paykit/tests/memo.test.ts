import { describe, it, expect } from "vitest";
import { encodeMemoForIntent, decodeMemoFromTx, PAYKIT_MEMO_TYPE, stringToHex } from "../src/domain/memo";

describe("memo encoding", () => {
  it("encodes and decodes round-trip", () => {
    const encoded = encodeMemoForIntent({ intentId: "pi_abc", orderId: "ORD-1", resourceId: "res-1" });
    expect(encoded.MemoType).toBe(stringToHex(PAYKIT_MEMO_TYPE));

    const decoded = decodeMemoFromTx([{ Memo: encoded }]);
    expect(decoded?.intentId).toBe("pi_abc");
    expect(decoded?.orderId).toBe("ORD-1");
    expect(decoded?.resourceId).toBe("res-1");
  });

  it("returns null for missing paykit memo", () => {
    const decoded = decodeMemoFromTx([{ Memo: { MemoType: stringToHex("other"), MemoData: stringToHex("{}") } }]);
    expect(decoded).toBeNull();
  });

  it("returns null for malformed json", () => {
    const decoded = decodeMemoFromTx([{
      Memo: {
        MemoType: stringToHex(PAYKIT_MEMO_TYPE),
        MemoData: stringToHex("not json"),
      },
    }]);
    expect(decoded).toBeNull();
  });
});
