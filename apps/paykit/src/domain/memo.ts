// PRD v0.2 §8.3 — XRPL Memo encode/decode. paykit.intent MemoType.

export const PAYKIT_MEMO_TYPE = "paykit.intent";

export interface PayKitMemoBody {
  intentId: string;
  orderId: string;
  resourceId?: string;
}

export function stringToHex(s: string): string {
  return Buffer.from(s, "utf8").toString("hex").toUpperCase();
}

export function hexToString(hex: string): string {
  try {
    return Buffer.from(hex, "hex").toString("utf8");
  } catch {
    return "";
  }
}

export function encodeMemoForIntent(body: PayKitMemoBody): {
  MemoType: string;
  MemoFormat: string;
  MemoData: string;
} {
  return {
    MemoType: stringToHex(PAYKIT_MEMO_TYPE),
    MemoFormat: stringToHex("application/json"),
    MemoData: stringToHex(JSON.stringify(body)),
  };
}

export interface RawMemo {
  Memo?: {
    MemoType?: string;
    MemoFormat?: string;
    MemoData?: string;
  };
}

export function decodeMemoFromTx(memos: RawMemo[] | undefined): PayKitMemoBody | null {
  if (!memos) return null;
  for (const m of memos) {
    const type = hexToString(m.Memo?.MemoType ?? "");
    if (type !== PAYKIT_MEMO_TYPE) continue;
    const dataHex = m.Memo?.MemoData ?? "";
    try {
      const parsed = JSON.parse(hexToString(dataHex));
      if (typeof parsed.intentId === "string" && typeof parsed.orderId === "string") {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}
