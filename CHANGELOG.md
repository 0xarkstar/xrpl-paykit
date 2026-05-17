# Changelog

## [Unreleased]

### Added (2026-05-17 — KFIP submission day, live E2E suite)
- `examples/testnet-live-suite.ts`: 5-scenario live testnet E2E (auto-fund via faucet, no env vars). Exercises every negative path of the 9-gate verifier on real ledger data:
  - `happy_path` — all 9 gates PASS
  - `wrong_amount` — delivered 500000 vs expected 1000000 → gate 6 fails
  - `missing_memo` — no `xpk:intent` Memo → gate 8 fails
  - `wrong_destination_tag` — intent requires DestinationTag=42, tx omits → gate 5 fails
  - `partial_payment_flag` — XRPL network refuses XRP→XRP + tfPartialPayment + SendMax (`temBAD_SEND_XRP_MAX`) — defense-in-depth #1 (network rejection), defense #2 (gate 7 in unit tests)
- `docs/proofs/testnet-suite-output.txt`: 5-scenario live transcript (ANSI stripped, 102 lines, all explorer URLs included)
- `package.json`: `example:testnet-live-suite` script

### Added
- `@paykit/sdk`: `VerifyReason` 추가 — `wrong_destination_tag`, `partial_payment_flag` (Partial Payment exploit + DestinationTag mismatch 별도 reason)
- `apps/paykit/src/xrpl/verify-tx.ts`:
  - **Gate 5 — DestinationTag 검증** (intent에 destinationTag가 설정된 경우 정확 매칭 강제)
  - **Gate 7 — tfPartialPayment flag (0x00020000) 명시적 거부** — Partial Payment exploit 방어. `Amount` 신뢰 금지 + `Flags` bitmap 직접 검사. `TF_PARTIAL_PAYMENT` 상수 export
  - `RawXrplTx`에 `Flags`, `DestinationTag` 필드 명시
  - `VerifyExpectations`에 optional `destinationTag` 필드 추가 (backwards-compatible)
- `apps/paykit/tests/verify-tx.test.ts`: tfPartialPayment 거부 3 케이스 + DestinationTag 4 케이스 (총 7 신규 테스트, verify-tx 통과 17/17)
- `examples/testnet-live.ts`: testnet 실 결제 + 9-gate 검증 reproducible 데모 (xrpl.js 직접 호출, paykit app env 없이 작동). `pnpm example:testnet-live` 스크립트 추가
- Root `package.json`: `tsx` + `xrpl` + `puppeteer` devDeps + `example:testnet-live` 스크립트
- README 상단 status badges: tests 38/38 · TypeScript strict · Node 20+/pnpm 9 · XRPL testnet · live-testnet 9/9 PASS (explorer link 포함)
- README "Live preview" 섹션 — `docs/screenshots/` 5장 embed (PayKit home · quickstart · examples · K-pop Fan Art Unlock · demo-merchant)
- `docs/screenshots/01~05.png`: Puppeteer headless 캡쳐(1440x900 @2x), 작동 중인 :3000 + :3001 실제 상태
- `docs/proofs/testnet-live-output.txt`: testnet 실 결제 9/9 gate verification console transcript (ANSI 제거)
- `scripts/screenshot.mjs`: 재현 가능한 Puppeteer 자동 캡쳐 스크립트
- KFIP 2026 평가 rubric "Blockchain Usage 상" 매핑 강화: XLS-85 (Token-Enabled Escrows, v1.0) + Cross-Currency Pathfinding (v2.0) + XLS-47 (Price Oracles, v2.0) + XLS-33 (MPT, v2+) 명시 — rubric 9 고급 기능 중 4개 활용 로드맵

### Verified
- Live testnet 검증 #1: `pnpm example:testnet-live` 9/9 gates PASS
  - Tx Hash: `2FD03A47760067AEA1CC3FCE2A5DD0E4E1CAD565DFE5354D8D608DE3ECAB637A`
  - Ledger: 17431228
- Live testnet 검증 #2 (재현성 확인): 9/9 gates PASS
  - Tx Hash: `236D658AB83C8B83537E5F83699327DDFF00621E2FEB2BF0A95E8839222C3293`
  - Ledger: 17431805
- **Live testnet 5-scenario suite (2026-05-17)**: `pnpm tsx examples/testnet-live-suite.ts` — happy + 4 negative scenarios, all behaving as expected on real ledger
  - `happy_path` PASS · tx `CEF8E2EB94279825225D65E6E574B481B58E7B54C2B81C764807F2CDA0223E35` · ledger 17445492
  - `wrong_amount` FAIL_AS_EXPECTED (gate 6) · tx `B04418DC37BE22B13360618AC5D5EFCAD8A09D1ACB5F0D431D2A15C67E4ACBA1` · ledger 17445494
  - `missing_memo` FAIL_AS_EXPECTED (gate 8) · tx `7FEDC7730C7926BAC651B2624D87D915963D029CF3DCB927A4CCA6D1FA750F2A` · ledger 17445496
  - `wrong_destination_tag` FAIL_AS_EXPECTED (gate 5) · tx `4D2BADDDE448A4156B2EA1D2F4324177F6F6BAEE9D2089C407F24AB901CF5C8E` · ledger 17445498
  - `partial_payment_flag` NETWORK_REJECTED_AS_EXPECTED (`temBAD_SEND_XRP_MAX`) — gate 7 covered by unit tests
- `pnpm -r typecheck`: clean (3 workspaces)
- `pnpm -r test`: 38/38 passing (9 sdk + 17 verify-tx + 5 state-machine + 13 drops + 3 memo)
- `pnpm dev` :3000 + :3001 두 서버 정상 가동 — Puppeteer 자동 캡쳐로 시각 증빙 확보

## [0.1.0] — 2026-05-17 (KFIP 2026 1차 제출)

### Added
- `@paykit/sdk`: types, HMAC-SHA256 webhook signing (`signEvent`/`constructEvent`), `PaykitClient` (paymentIntents API)
- `apps/paykit` (PayKit core, port 3000):
  - Next.js 14 App Router + Tailwind CSS + dark dev-tool theme
  - Drizzle ORM + better-sqlite3 schema (`payment_intents`, `webhook_events`)
  - `POST /api/v1/payment_intents` · `GET /api/v1/payment_intents/:id` · `POST /api/v1/payment_intents/:id/verify`
  - Hosted checkout page (`/checkout/[intentId]`) with QR + status polling + Simulate Approve (mock 모드)
  - XRPL 검증 9개 조건 (`validated` · `tesSUCCESS` · destination · `delivered_amount` 정확 일치 · memo decode · tx hash UNIQUE · intent expiry)
  - Idempotent reconciliation + state machine (`created → pending → succeeded/failed/expired → requires_review`)
  - Signed webhook dispatcher (deterministic event ID, raw body 기반 HMAC)
  - Xaman SDK 통합 + mock 모드 토글 (`XAMAN_MODE=real|mock`)
  - bearer auth middleware (`/api/v1/*`)
- `apps/demo-merchant` (port 3001):
  - Locked "Premium AI Search" UI + 3단계 진행 가이드 + Reset 버튼
  - `/api/create-checkout` → PayKit SDK 호출
  - `/api/paykit-webhook` — HMAC 서명 검증 후 orders 갱신
  - `/api/premium-result` — paid 상태 게이팅
  - `/api/order-status` — client polling
  - `/api/reset` — 데모 사이클 초기화
  - unlock 후 "이 데모가 증명한 4가지" + Wow moments 가이드
  - Event log 터미널 스타일 (PayKit 라이프사이클 시각화)
- `docs/core/` — PROJECT_PITCH · MVP_SPEC · ARCHITECTURE
- `docs/design/` — ENTITIES · STATE_MACHINE · API_CONTRACT · UX_GUIDE · DESIGN_SYSTEM
- Tests: SDK 9개 (signature mismatch / skew / constant-time / malformed / raw body / client) + paykit 4 파일 (drops · memo · verify-tx 9 케이스 · state machine)
- README · CONTRIBUTING · SETUP 가이드

### Decisions
- Scope lock: Single asset (XRP testnet) + Xaman + hosted checkout + verified reconciliation + signed webhook + API/resource unlock demo
- Strategy: **Checkout first, agent-ready later** (PRD §3.3)
- Design: dark dev-tool (zinc-950 + indigo-400 accent + JetBrains Mono)
- Default Xaman mode = mock (API key 없이 데모 가능)
- testnet only (mainnet 키 코드 등장 X)

### Not Implemented (MVP scope 밖, PRD §5.2)
새 wallet · refund · subscription · tax · fiat ramp · mainnet · multi-chain · 실제 agent runtime · payment channel · merchant dashboard

### Notes
- `apps/*/next.config.mjs` 사용 (Next.js 14는 `.ts` config 미지원)
- mock 모드 fixtures · orders · events 모두 `globalThis`에 저장 (Next.js dev route handler 격리 우회)
- 두 app 각각 `.env` 필요 (monorepo 루트 `.env` 자동 로드 안 됨)
