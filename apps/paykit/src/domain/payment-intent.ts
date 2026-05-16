// PRD v0.2 §8.1 — zod schema for create intent input + amount validation.

import { z } from "zod";
import { isValidXrpAmount } from "./drops";

export const createPaymentIntentSchema = z.object({
  amount: z.string().refine(isValidXrpAmount, { message: "invalid_amount_format" }),
  asset: z.literal("XRP").default("XRP"),
  orderId: z.string().min(1).max(128),
  resourceId: z.string().min(1).max(128).optional(),
  mode: z.literal("checkout").default("checkout"),
  webhookUrl: z.string().url().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreatePaymentIntentBody = z.infer<typeof createPaymentIntentSchema>;
