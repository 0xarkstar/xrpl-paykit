/**
 * XRPL PayKit — public API surface.
 *
 * Merchant integration in 5 lines:
 *
 *   import { Checkout, InMemoryIntentStore } from '@xrpl-paykit/sdk';
 *   const checkout = new Checkout(config, new InMemoryIntentStore());
 *   const intent = await checkout.createIntent({ merchantOrderId, amount });
 *   const url = checkout.getCheckoutUrl(intent.id);
 *   res.redirect(url);  // → user signs in Xaman → PayKit verifies → webhook fires
 *
 * Webhook receive (Express):
 *
 *   app.post('/webhook', express.raw({ type: '*\/*' }), (req, res) => {
 *     const ok = verifyWebhookSignature(req.body.toString(), req.header('XPK-Signature')!, secret);
 *     if (!ok) return res.status(400).end();
 *     const event = JSON.parse(req.body.toString());
 *     // event.type === 'payment_intent.succeeded' → unlock the order
 *   });
 */

// Types
export type {
  PaymentIntent,
  PaymentStatus,
  PaymentAmount,
  XrpAmount,
  IouAmount,
  PaymentAmountLike,
  VerificationResult,
  VerificationGate,
  GateResult,
  WebhookEvent,
  WebhookEventType,
  WebhookEventData,
  WebhookDeliveryOptions,
  XrplTxResponse,
  XrplMemoWrapper,
  PayKitConfig,
  PayKitErrorCode,
} from './types.js';

export { PayKitError, DEFAULT_WEBHOOK_OPTIONS } from './types.js';

// Verification (9-단계 검증)
export {
  verifyPayment,
  InMemoryProcessedTxHashStore,
} from './verifier.js';

export type { ProcessedTxHashStore } from './verifier.js';

// Hosted Checkout
export {
  Checkout,
  InMemoryIntentStore,
} from './checkout.js';

export type {
  CreateIntentParams,
  IntentStore,
} from './checkout.js';

// Signed Webhook
export {
  signWebhook,
  verifyWebhookSignature,
  deliverWebhook,
  WebhookEmitter,
  DEFAULT_BACKOFF_SCHEDULE_MS,
} from './webhook.js';

export type {
  VerifyOptions,
  DeliveryAttempt,
  DeliveryResult,
} from './webhook.js';

// State machine
export {
  isTransitionAllowed,
  isTerminal,
  TERMINAL_STATES,
} from './state-machine.js';
