/**
 * Live testnet end-to-end verification.
 *
 *   1. Connects to XRPL testnet
 *   2. Creates a PaymentIntent
 *   3. Sends real testnet XRP from a sender wallet to the merchant wallet
 *      with the intent id encoded in a Memo
 *   4. Waits for the validated ledger
 *   5. Fetches the tx via xrpl.js
 *   6. Runs the 9-단계 verifier
 *   7. Prints per-gate results + final verdict
 *
 * Wallets are funded via testnet faucet. Run with:
 *
 *   SENDER_SEED=sEd... MERCHANT_ADDRESS=r... npx tsx examples/testnet-live.ts
 *
 * Default values use the wallets generated for KFIP 2026 demo.
 */

import { Client, Wallet, convertStringToHex } from 'xrpl';
import {
  Checkout,
  InMemoryIntentStore,
  InMemoryProcessedTxHashStore,
  verifyPayment,
  type PayKitConfig,
  type XrplTxResponse,
} from '../src/index.js';

// =====================================================================
// Config
// =====================================================================

const XRPL_TESTNET = 'wss://s.altnet.rippletest.net:51233';
const EXPLORER = 'https://livenet.xrpl.org';

const SENDER_SEED = process.env.SENDER_SEED ?? 'sEd7uT8UsCG5sB2d2MZq1zFrbgs98Go';
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS ?? 'r9pQfgH67CdxMzi8d21cJg4o1eixnfawwb';

const config: PayKitConfig = {
  xrplEndpoint: XRPL_TESTNET,
  merchantAddress: MERCHANT_ADDRESS,
  webhookSecret: 'whsec_demo_testnet_live',
};

// =====================================================================
// Pipeline
// =====================================================================

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('XRPL PayKit — Live Testnet End-to-End Verification');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. PaymentIntent
  const checkout = new Checkout(config, new InMemoryIntentStore());
  const intent = await checkout.createIntent({
    merchantOrderId: 'order_kfip_demo_001',
    amount: { kind: 'xrp', drops: '1000000' }, // 1 XRP
    metadata: { sku: 'bluenode-event-ticket-001' },
  });

  console.log('\n[1] PaymentIntent created');
  console.log('    id        :', intent.id);
  console.log('    destination:', intent.destination);
  console.log('    amount    :', '1 XRP (1,000,000 drops)');

  // 2. Connect to XRPL testnet
  const client = new Client(XRPL_TESTNET);
  await client.connect();
  console.log('\n[2] Connected to XRPL testnet:', XRPL_TESTNET);

  try {
    // 3. Build Payment with intent-id Memo (Gate 8 requirement)
    const wallet = Wallet.fromSeed(SENDER_SEED);
    console.log('    sender    :', wallet.address);

    const memoTypeHex = convertStringToHex('xpk:intent');
    const memoDataHex = convertStringToHex(intent.id);
    const memoFormatHex = convertStringToHex('text/plain');

    const prepared = await client.autofill({
      TransactionType: 'Payment',
      Account: wallet.address,
      Destination: intent.destination,
      Amount: '1000000',
      Memos: [
        {
          Memo: {
            MemoType: memoTypeHex,
            MemoData: memoDataHex,
            MemoFormat: memoFormatHex,
          },
        },
      ],
    });

    // 4. Sign and submit
    const signed = wallet.sign(prepared);
    console.log('\n[3] Submitting payment to testnet...');
    const submitResult = await client.submitAndWait(signed.tx_blob);

    const txHash = signed.hash;
    const ledgerIndex = (submitResult.result as { ledger_index?: number }).ledger_index;
    console.log('    tx hash   :', txHash);
    console.log('    ledger    :', ledgerIndex);
    console.log('    explorer  :', `${EXPLORER}/transactions/${txHash}?network=testnet`);

    // 5. Fetch tx for verification (proves we're not trusting submit response)
    console.log('\n[4] Fetching tx from ledger for verification...');
    const txResp = await client.request({
      command: 'tx',
      transaction: txHash,
      binary: false,
    });

    const result = txResp.result as Record<string, unknown>;
    const meta = result.meta as Record<string, unknown> | undefined;
    const txJson = (result.tx_json ?? {}) as Record<string, unknown>;

    // 6. Normalize to PayKit's XrplTxResponse shape (XRPL API ≥ 2.0 returns fields under tx_json)
    const ledgerTx: XrplTxResponse = {
      validated: result.validated === true,
      TransactionType: ((result.TransactionType ?? txJson.TransactionType) as string),
      Destination: (result.Destination ?? txJson.Destination) as string | undefined,
      DestinationTag: (result.DestinationTag ?? txJson.DestinationTag) as number | undefined,
      Flags: ((result.Flags ?? txJson.Flags ?? 0) as number),
      Amount: (result.Amount ?? txJson.Amount) as string | undefined,
      Memos: (result.Memos ?? txJson.Memos) as XrplTxResponse['Memos'],
      hash: (result.hash ?? txHash) as string,
      ledger_index: result.ledger_index as number | undefined,
      meta: {
        TransactionResult: (meta?.TransactionResult ?? 'tesSUCCESS') as string,
        delivered_amount: (meta?.delivered_amount ?? meta?.['DeliveredAmount']) as string | undefined,
      },
    };

    // 7. Run 9-단계 verifier
    console.log('\n[5] Running 9-단계 verifier...');
    const txStore = new InMemoryProcessedTxHashStore();
    const verification = await verifyPayment(intent, ledgerTx, txStore);

    console.log('\n    Per-gate results:');
    for (const g of verification.gates) {
      const mark = g.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
      console.log(`      [${mark}] ${g.gate}${g.reason ? '  — ' + g.reason : ''}`);
    }

    console.log('\n[6] Verdict');
    console.log('    verified      :', verification.verified ? '\x1b[32mtrue\x1b[0m' : '\x1b[31mfalse\x1b[0m');
    console.log('    final status  :', verification.suggestedStatus);
    console.log('    tx hash       :', verification.txHash ?? '(n/a)');
    console.log('    ledger index  :', verification.ledgerIndex);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Live verification:', verification.verified ? 'PASS ✓' : 'FAIL ✗');
    console.log('Explorer:', `${EXPLORER}/transactions/${txHash}?network=testnet`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } finally {
    await client.disconnect();
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
