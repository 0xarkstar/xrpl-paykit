// PRD v0.2 §8.6 — HMAC-SHA256 signed webhook. Raw body based. Timestamp skew. Constant-time.

import crypto from "node:crypto";
import type { WebhookEvent } from "./types";

export class WebhookSignatureError extends Error {
  constructor(
    message: string,
    public readonly code: "missing_header" | "malformed_header" | "timestamp_skew" | "signature_mismatch",
  ) {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

const DEFAULT_TOLERANCE_SECONDS = 300;

export function signEvent(opts: {
  rawBody: string;
  secret: string;
  timestamp?: number;
}): string {
  const t = opts.timestamp ?? Math.floor(Date.now() / 1000);
  const baseString = `${t}.${opts.rawBody}`;
  const sig = crypto.createHmac("sha256", opts.secret).update(baseString).digest("hex");
  return `t=${t},v1=${sig}`;
}

export function constructEvent<T = WebhookEvent>(opts: {
  rawBody: string;
  signatureHeader: string | null | undefined;
  secret: string;
  tolerance?: number;
}): T {
  if (!opts.signatureHeader) {
    throw new WebhookSignatureError("missing PayKit-Signature header", "missing_header");
  }

  const parts = opts.signatureHeader.split(",");
  let t: number | null = null;
  let v1: string | null = null;
  for (const part of parts) {
    const [k, v] = part.split("=");
    if (k === "t" && v) {
      const parsed = parseInt(v, 10);
      if (!Number.isFinite(parsed)) continue;
      t = parsed;
    } else if (k === "v1" && v) {
      v1 = v;
    }
  }
  if (t === null || v1 === null) {
    throw new WebhookSignatureError("malformed PayKit-Signature header", "malformed_header");
  }

  const tolerance = opts.tolerance ?? DEFAULT_TOLERANCE_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - t) > tolerance) {
    throw new WebhookSignatureError("timestamp skew exceeds tolerance", "timestamp_skew");
  }

  const baseString = `${t}.${opts.rawBody}`;
  const expectedHex = crypto.createHmac("sha256", opts.secret).update(baseString).digest("hex");

  const provided = safeHexToBuffer(v1);
  const expected = Buffer.from(expectedHex, "hex");
  if (!provided || provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw new WebhookSignatureError("signature mismatch", "signature_mismatch");
  }

  return JSON.parse(opts.rawBody) as T;
}

function safeHexToBuffer(s: string): Buffer | null {
  if (!/^[0-9a-fA-F]+$/.test(s) || s.length % 2 !== 0) return null;
  try {
    return Buffer.from(s, "hex");
  } catch {
    return null;
  }
}
