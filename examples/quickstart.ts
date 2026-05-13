/**
 * Quickstart — 5-line merchant integration of XRPL PayKit.
 *
 * Run with: `npx tsx examples/quickstart.ts`
 *
 * Demonstrates the merchant-facing happy path:
 *   1. Configure PayKit with a receiving address + webhook secret.
 *   2. Create a PaymentIntent for an order.
 *   3. Get the hosted checkout URL to redirect the user.
 *   4. (Later) verify an inbound webhook signature.
 *   5. (Server side) verify the XRPL transaction against the intent.
 *
 * No XRPL connection required for this demo — uses in-memory stores
 * and a synthesized XRPL tx response.
 */

import {
  Checkout,
  InMemoryIntentStore,
  InMemoryProcessedTxHashStore,
  signWebhook,
  verifyPayment,
  verifyWebhookSignature,
  type PayKitConfig,
  type WebhookEvent,
  type XrplTxResponse,
} from '../src/index.js';

// ---------------------------------------------------------------------
// 1. Configure
// ---------------------------------------------------------------------

const config: PayKitConfig = {
  xrplEndpoint: 'wss://s.altnet.rippletest.net:51233',
  merchantAddress: 'rNeAi6oLaxGyH3PNijKH4N3Pp8BygKVLCN', // testnet wallet
  webhookSecret: 'whsec_demo_replace_in_production_please',
};

const checkout = new Checkout(config, new InMemoryIntentStore());
const txHashStore = new InMemoryProcessedTxHashStore();

// ---------------------------------------------------------------------
// 2. Create a PaymentIntent
// ---------------------------------------------------------------------

const intent = await checkout.createIntent({
  merchantOrderId: 'order_demo_001',
  amount: { kind: 'xrp', drops: '1000000' }, // 1 XRP
  metadata: { sku: 'bluenode-merch-t-shirt-L' },
});

console.log('[1] intent created:');
console.log('    id =', intent.id);
console.log('    status =', intent.status);
console.log('    expiresAt =', intent.expiresAt);

// ---------------------------------------------------------------------
// 3. Redirect user to hosted checkout
// ---------------------------------------------------------------------

const checkoutUrl = checkout.getCheckoutUrl(intent.id);
console.log('\n[2] redirect user to:', checkoutUrl);

// ---------------------------------------------------------------------
// 4. Webhook signing/verification round-trip (demo)
// ---------------------------------------------------------------------

const event: WebhookEvent = {
  id: 'evt_demo_001',
  type: 'payment_intent.succeeded',
  created: Date.now(),
  apiVersion: '0.0.1',
  data: { kind: 'payment_intent', intent },
};

const rawBody = JSON.stringify(event);
const signature = signWebhook(rawBody, config.webhookSecret);

console.log('\n[3] webhook signed:');
console.log('    XPK-Signature =', signature.slice(0, 60), '...');

const verified = verifyWebhookSignature(rawBody, signature, config.webhookSecret);
console.log('    verifier accepts =', verified);

const tampered = verifyWebhookSignature(rawBody + 'x', signature, config.webhookSecret);
console.log('    verifier rejects tampered body =', !tampered);

// ---------------------------------------------------------------------
// 5. Ledger verification (9 gates) against a synthesized XRPL tx
// ---------------------------------------------------------------------

// In production this comes from xrpl.js `client.request({ command: 'tx', transaction: hash })`.
// For demo we synthesize a tx that should pass all 9 gates.
const TF_PARTIAL_PAYMENT_FLAG = 0x00020000;
const intentIdHex = Buffer.from(intent.id, 'utf8').toString('hex').toUpperCase();
const memoTypeHex = Buffer.from('xpk:intent', 'utf8').toString('hex').toUpperCase();

const goodTx: XrplTxResponse = {
  validated: true,
  TransactionType: 'Payment',
  Destination: intent.destination,
  Flags: 0, // No tfPartialPayment
  Amount: '1000000',
  Memos: [
    {
      Memo: {
        MemoType: memoTypeHex,
        MemoData: intentIdHex,
        MemoFormat: Buffer.from('text/plain', 'utf8').toString('hex').toUpperCase(),
      },
    },
  ],
  hash: 'A1B2C3D4E5F60718A1B2C3D4E5F60718A1B2C3D4E5F60718A1B2C3D4E5F60718',
  ledger_index: 12345678,
  meta: {
    TransactionResult: 'tesSUCCESS',
    delivered_amount: '1000000',
  },
};

const verification = await verifyPayment(intent, goodTx, txHashStore);
console.log('\n[4] 9-단계 검증 result:');
console.log('    verified =', verification.verified);
console.log('    suggestedStatus =', verification.suggestedStatus);
console.log('    gates:');
for (const g of verification.gates) {
  console.log(`      [${g.passed ? '✓' : '✗'}] ${g.gate}${g.reason ? ' — ' + g.reason : ''}`);
}

// ---------------------------------------------------------------------
// Sanity check: tampered Partial Payment exploit should be REJECTED
// ---------------------------------------------------------------------

const exploitTx: XrplTxResponse = {
  ...goodTx,
  Flags: TF_PARTIAL_PAYMENT_FLAG, // attacker sets tfPartialPayment
  Amount: '1000000', // declared 1 XRP
  meta: {
    TransactionResult: 'tesSUCCESS',
    delivered_amount: '1', // actually delivered 1 drop
  },
};

const exploitResult = await verifyPayment(intent, exploitTx, new InMemoryProcessedTxHashStore());
console.log('\n[5] Partial Payment exploit attempt:');
console.log('    verified =', exploitResult.verified, '(should be false)');
console.log('    suggestedStatus =', exploitResult.suggestedStatus);
const failedGates = exploitResult.gates.filter((g) => !g.passed).map((g) => g.gate);
console.log('    failed gates =', failedGates);
