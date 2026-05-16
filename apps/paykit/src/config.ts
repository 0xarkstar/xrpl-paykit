// PRD v0.2 §10·§12 — env validated via zod.

import { z } from "zod";

const schema = z.object({
  PAYKIT_DATABASE_URL: z.string().min(1).default("file:./paykit.db"),
  PAYKIT_API_KEY: z.string().min(16, "PAYKIT_API_KEY must be at least 16 chars"),
  PAYKIT_WEBHOOK_SECRET: z.string().min(16, "PAYKIT_WEBHOOK_SECRET must be at least 16 chars"),
  PAYKIT_BASE_URL: z.string().url().default("http://localhost:3000"),
  PAYKIT_WEBHOOK_URL_ALLOWLIST: z.string().default("http://localhost:3001/api/paykit-webhook"),

  XRPL_NETWORK: z.enum(["testnet"]).default("testnet"),
  XRPL_RPC_URL: z.string().min(1).default("wss://s.altnet.rippletest.net:51233"),
  PAYKIT_MERCHANT_XRPL_ADDRESS: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined))
    .refine((v) => v === undefined || /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(v), {
      message: "invalid_xrpl_address",
    }),

  XAMAN_MODE: z.enum(["mock", "real"]).default("mock"),
  XAMAN_API_KEY: z.string().optional().transform((v) => (v && v.trim() ? v.trim() : undefined)),
  XAMAN_API_SECRET: z.string().optional().transform((v) => (v && v.trim() ? v.trim() : undefined)),
});

export const env = schema.parse(process.env);

export function getMerchantAddress(): string {
  // Mock 모드 + 미설정 시 fixture 주소 사용 (testnet 검증용 placeholder).
  return env.PAYKIT_MERCHANT_XRPL_ADDRESS ?? "rPaYKitMockMerchantAddressXXXXXXXXXX";
}

export function getAllowlistedWebhookUrls(): string[] {
  return env.PAYKIT_WEBHOOK_URL_ALLOWLIST.split(",").map((s) => s.trim()).filter(Boolean);
}

export function isAllowedWebhookUrl(url: string): boolean {
  return getAllowlistedWebhookUrls().includes(url);
}

export function getXamanMode(): "mock" | "real" {
  if (env.XAMAN_MODE === "real" && env.XAMAN_API_KEY && env.XAMAN_API_SECRET) {
    return "real";
  }
  return "mock";
}
