// Provide dummy env vars so src/config.ts zod schema passes at module load.
// Tests should not depend on the real .env — they exercise pure logic + fixtures.

process.env.PAYKIT_API_KEY ??= "test_api_key_0000000000000000000000000000000000000000000000000000000000";
process.env.PAYKIT_WEBHOOK_SECRET ??= "test_webhook_secret_00000000000000000000000000000000000000000000000000000000";
process.env.PAYKIT_DATABASE_URL ??= "file:./paykit-test.db";
process.env.PAYKIT_BASE_URL ??= "http://localhost:3000";
process.env.PAYKIT_WEBHOOK_URL_ALLOWLIST ??= "http://localhost:3001/api/paykit-webhook";
process.env.XRPL_NETWORK ??= "testnet";
process.env.XRPL_RPC_URL ??= "wss://s.altnet.rippletest.net:51233";
process.env.XAMAN_MODE ??= "mock";
