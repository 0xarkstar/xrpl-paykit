// PRD v0.2 §11 — Drizzle schema for SQLite.

import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const paymentIntents = sqliteTable(
  "payment_intents",
  {
    id: text("id").primaryKey(),
    status: text("status").notNull().default("created"),
    amountXrp: text("amount_xrp").notNull(),
    amountDrops: text("amount_drops").notNull(),
    asset: text("asset").notNull().default("XRP"),
    destinationAddress: text("destination_address").notNull(),
    orderId: text("order_id").notNull(),
    resourceId: text("resource_id"),
    mode: text("mode").notNull().default("checkout"),
    memoHex: text("memo_hex"),
    webhookUrl: text("webhook_url"),
    successUrl: text("success_url"),
    cancelUrl: text("cancel_url"),
    xamanPayloadId: text("xaman_payload_id"),
    xamanPayloadUrl: text("xaman_payload_url"),
    txHash: text("tx_hash"),
    metadataJson: text("metadata_json"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => ({
    txHashUnique: uniqueIndex("payment_intents_tx_hash_unq").on(t.txHash),
    orderIdIdx: index("payment_intents_order_id_idx").on(t.orderId),
    statusIdx: index("payment_intents_status_idx").on(t.status),
    expiresAtIdx: index("payment_intents_expires_at_idx").on(t.expiresAt),
  }),
);

export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    intentId: text("intent_id").notNull(),
    type: text("type").notNull(),
    payloadJson: text("payload_json").notNull(),
    deliveryStatus: text("delivery_status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
  },
  (t) => ({
    intentTypeUnique: uniqueIndex("webhook_events_intent_type_unq").on(t.intentId, t.type),
  }),
);

export type PaymentIntentRow = typeof paymentIntents.$inferSelect;
export type NewPaymentIntent = typeof paymentIntents.$inferInsert;
export type WebhookEventRow = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
