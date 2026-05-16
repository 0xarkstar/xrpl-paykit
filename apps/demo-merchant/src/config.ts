// Demo merchant runtime config — keeps PayKit credentials and base URLs in one place.

export const config = {
  paykitBaseUrl: process.env.PAYKIT_BASE_URL ?? "http://localhost:3000",
  paykitApiKey: process.env.DEMO_MERCHANT_PAYKIT_API_KEY ?? process.env.PAYKIT_API_KEY ?? "",
  paykitWebhookSecret: process.env.DEMO_MERCHANT_PAYKIT_WEBHOOK_SECRET ?? process.env.PAYKIT_WEBHOOK_SECRET ?? "",
  merchantBaseUrl: process.env.DEMO_MERCHANT_BASE_URL ?? "http://localhost:3001",
};
