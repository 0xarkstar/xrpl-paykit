# Changelog

## [Unreleased]

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
  - Explorer: https://livenet.xrpl.org/transactions/2FD03A47760067AEA1CC3FCE2A5DD0E4E1CAD565DFE5354D8D608DE3ECAB637A?network=testnet
- Live testnet 검증 #2 (재현성 확인): 9/9 gates PASS
  - Tx Hash: `236D658AB83C8B83537E5F83699327DDFF00621E2FEB2BF0A95E8839222C3293`
  - Explorer: https://livenet.xrpl.org/transactions/236D658AB83C8B83537E5F83699327DDFF00621E2FEB2BF0A95E8839222C3293?network=testnet
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
