import { describe, it, expect, vi } from "vitest";
import { PaykitClient } from "./client";

describe("PaykitClient", () => {
  it("sends bearer auth + JSON body for create", async () => {
    const fetchMock = vi.fn(async (url: string, init: any) => {
      expect(url).toBe("http://localhost:3000/api/v1/payment_intents");
      expect(init.method).toBe("POST");
      expect(init.headers.Authorization).toBe("Bearer test_key");
      const body = JSON.parse(init.body);
      expect(body.amount).toBe("1.25");
      expect(body.orderId).toBe("ORD-1");
      return new Response(JSON.stringify({
        id: "pi_test", status: "created", amount: "1.25", asset: "XRP", orderId: "ORD-1",
        mode: "checkout", expiresAt: new Date().toISOString(),
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });

    const paykit = new PaykitClient({
      apiKey: "test_key",
      baseUrl: "http://localhost:3000",
      fetch: fetchMock as any,
    });

    const intent = await paykit.paymentIntents.create({ amount: "1.25", orderId: "ORD-1" });
    expect(intent.id).toBe("pi_test");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("throws on non-2xx response", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "bad" }), { status: 400 }));
    const paykit = new PaykitClient({
      apiKey: "test_key",
      baseUrl: "http://localhost:3000",
      fetch: fetchMock as any,
    });
    await expect(paykit.paymentIntents.retrieve("pi_x")).rejects.toThrowError(/400/);
  });
});
