import { describe, it, expect } from "vitest";
import { signEvent, constructEvent, WebhookSignatureError } from "./webhooks";

const SECRET = "test_webhook_secret_at_least_32_chars_xx";

function buildSignedRequest(body: object, opts?: { secret?: string; timestamp?: number; mutate?: (sig: string) => string }) {
  const rawBody = JSON.stringify(body);
  let sig = signEvent({ rawBody, secret: opts?.secret ?? SECRET, timestamp: opts?.timestamp });
  if (opts?.mutate) sig = opts.mutate(sig);
  return { rawBody, sig };
}

describe("constructEvent", () => {
  it("verifies a signed event", () => {
    const { rawBody, sig } = buildSignedRequest({ id: "evt_1", type: "payment_intent.succeeded" });
    const event = constructEvent({ rawBody, signatureHeader: sig, secret: SECRET });
    expect((event as any).id).toBe("evt_1");
  });

  it("throws on missing header", () => {
    expect(() => constructEvent({ rawBody: "{}", signatureHeader: null, secret: SECRET }))
      .toThrowError(WebhookSignatureError);
  });

  it("throws on malformed header (no t or v1)", () => {
    expect(() => constructEvent({ rawBody: "{}", signatureHeader: "garbage", secret: SECRET }))
      .toThrowError(WebhookSignatureError);
    expect(() => constructEvent({ rawBody: "{}", signatureHeader: "t=123", secret: SECRET }))
      .toThrowError(WebhookSignatureError);
  });

  it("throws on timestamp skew", () => {
    const old = Math.floor(Date.now() / 1000) - 10000;
    const { rawBody, sig } = buildSignedRequest({ id: "evt_2" }, { timestamp: old });
    expect(() => constructEvent({ rawBody, signatureHeader: sig, secret: SECRET, tolerance: 300 }))
      .toThrowError(WebhookSignatureError);
  });

  it("rejects mismatched signature (wrong secret)", () => {
    const { rawBody, sig } = buildSignedRequest({ id: "evt_3" });
    expect(() => constructEvent({ rawBody, signatureHeader: sig, secret: "different_secret_xxxxxxxxxxxxxxxxx" }))
      .toThrowError(WebhookSignatureError);
  });

  it("rejects mutated signature", () => {
    const { rawBody, sig } = buildSignedRequest({ id: "evt_4" }, {
      mutate: (s) => s.replace(/v1=[0-9a-f]/, "v1=z"),
    });
    expect(() => constructEvent({ rawBody, signatureHeader: sig, secret: SECRET }))
      .toThrowError(WebhookSignatureError);
  });

  it("rejects mutated raw body (signature won't match)", () => {
    const { sig } = buildSignedRequest({ id: "evt_5" });
    const tampered = JSON.stringify({ id: "evt_5_TAMPERED" });
    expect(() => constructEvent({ rawBody: tampered, signatureHeader: sig, secret: SECRET }))
      .toThrowError(WebhookSignatureError);
  });
});
