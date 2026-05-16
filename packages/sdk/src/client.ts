// PRD v0.2 §15 — minimal SDK DX example.

import type { CreatePaymentIntentInput, PaymentIntent, VerifyResult } from "./types";

export interface PaykitClientOptions {
  apiKey: string;
  baseUrl: string;                   // e.g., http://localhost:3000
  fetch?: typeof globalThis.fetch;   // override for testing
}

export class PaykitClient {
  readonly paymentIntents: PaymentIntentsResource;

  constructor(private readonly opts: PaykitClientOptions) {
    this.paymentIntents = new PaymentIntentsResource(opts);
  }
}

class PaymentIntentsResource {
  constructor(private readonly opts: PaykitClientOptions) {}

  async create(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    return this.request<PaymentIntent>("POST", "/api/v1/payment_intents", input);
  }

  async retrieve(intentId: string): Promise<PaymentIntent> {
    return this.request<PaymentIntent>("GET", `/api/v1/payment_intents/${intentId}`);
  }

  async verify(intentId: string, txHash?: string): Promise<VerifyResult> {
    return this.request<VerifyResult>("POST", `/api/v1/payment_intents/${intentId}/verify`, txHash ? { txHash } : {});
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const fetchImpl = this.opts.fetch ?? globalThis.fetch;
    const url = `${this.opts.baseUrl}${path}`;
    const res = await fetchImpl(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.opts.apiKey}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed: any;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
    if (!res.ok) {
      const err = new Error(`PayKit ${method} ${path} failed: ${res.status}`);
      (err as any).status = res.status;
      (err as any).body = parsed;
      throw err;
    }
    return parsed as T;
  }
}
