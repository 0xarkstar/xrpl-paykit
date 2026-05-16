# KFIP 2026 1차 신청서 ↔ 코드/문서 매핑

> 본 문서는 KFIP 2026 1차 제출 신청서의 각 섹션이 본 리포지토리의 어디에 구현·증빙되어 있는지 reviewer가 빠르게 navigate할 수 있도록 제공하는 인덱스입니다.

## 매핑 테이블

| 신청서 섹션 | 신청서 내용 | 본 리포 구현·증빙 |
|---|---|---|
| **§2-1 한 줄 정의** | "XRPL PayKit은 Stripe 호환 checkout + payment intent + signed webhook 개발자 도구" | [`README.md`](../README.md) (Hero), [`docs/PRD.md` §1](./PRD.md), [`docs/core/PROJECT_PITCH.md`](./core/PROJECT_PITCH.md) |
| **§2-2 핵심 가치 (1) 수수료** | "0.5–1% vs 카드 2.5–3% vs Patreon 5–12% vs MakeStar 5–10%" | [`docs/PRD.md` §12](./PRD.md) (Business Model) |
| **§2-2 (2) 속도** | "3–5초 finality + ~$0.0002 fee" | [`docs/PRD.md` §4](./PRD.md) (Why XRPL) |
| **§2-2 (3) 보안·투명성** | "9-단계 검증 + tfPartialPayment 명시 거부 + 머천트 측 다층 방어" | [`docs/PRD.md` §8.4 + §8.8](./PRD.md), [`apps/paykit/src/xrpl/verify-tx.ts`](../apps/paykit/src/xrpl/verify-tx.ts), [`SECURITY.md`](../SECURITY.md) |
| **§2-2 (4) t54.ai 보완재** | "네트워크 측 + 머천트 측 보완 포지션" | [`docs/PRD.md` §3 + §11](./PRD.md) |
| **§2-2 (5) Bluenode 운영 정당성** | "100% Bluenode 멤버, 외부 영입 0명" | [`README.md` Team 섹션](../README.md), [`docs/PRD.md` §13](./PRD.md) |
| **§2-2 (6) XRPL 프리미티브 로드맵** | "XLS-85 + Cross-Currency + XLS-47 + XLS-33" | [`docs/PRD.md` §4.3 + §11](./PRD.md), [`README.md` Roadmap](../README.md) |
| **§2-3 주요 기능** | "Hosted Checkout · Verified Reconciliation · Signed Webhook · Fan Art Image Unlock 데모 · 상태 머신" | [`docs/PRD.md` §3 + §8](./PRD.md), [`apps/paykit/src/`](../apps/paykit/src), [`packages/sdk/src/`](../packages/sdk/src) |
| **§2-4 타깃** | "Bluenode internal · K-pop Fan Art · AI/SaaS Pay-Per-Call" | [`docs/PRD.md` §5](./PRD.md), [`apps/demo-merchant/`](../apps/demo-merchant) (Premium AI Search), [`apps/paykit/app/examples/kpop/`](../apps/paykit/app/examples/kpop) (Fan Art) |
| **§2-5 BM** | "거래 수수료 0.5–1% · 단계별 수익화 MVP/v1.0/v2.0" | [`docs/PRD.md` §12](./PRD.md), [`README.md` Roadmap](../README.md) |
| **§3-1 문제 정의** | "한국 개발자 XRPL 결제 통합 문제 · 6-item pain list" | [`docs/PRD.md` §2](./PRD.md), [`docs/core/PROJECT_PITCH.md`](./core/PROJECT_PITCH.md) |
| **§3-2 시장 규모** | "151 한국 AI 스타트업 · K-pop 글로벌 팬덤 · x402 Coinbase" | [`docs/PRD.md` §2.2](./PRD.md) (Hard citations) |
| **§3-3 기존 한계** | "Ripple Payments · CoinPayments · t54.ai · 카드사 · Patreon 비교" | [`docs/PRD.md` §2.3](./PRD.md), [`docs/core/PROJECT_PITCH.md`](./core/PROJECT_PITCH.md) |
| **§3-4 차별성 (1)~(7)** | "머천트 측 SDK · 9-단계 · t54.ai 보완재 · Stripe DX · Bluenode · XRPL EVM 경험 · XLS-85+Cross-Currency+XLS-47+XLS-33" | [`docs/PRD.md` §3 + §4 + §13](./PRD.md), [`packages/sdk/`](../packages/sdk), [`apps/paykit/src/xrpl/verify-tx.ts`](../apps/paykit/src/xrpl/verify-tx.ts) |
| **§3-5 XRPL 선택 이유 (1)~(7)** | "finality · fee · native primitives · Ripple Korea 2026 · 결제 검증 · EVM Sidechain · 한국 핀테크 fit" | [`docs/PRD.md` §4](./PRD.md) |
| **§4-1 GitHub 레포** | https://github.com/0xarkstar/xrpl-paykit | [`README.md`](../README.md) Hero + [`docs/SETUP.md`](./SETUP.md) |
| **§4-2 XRPL 지갑** | sender `rNeAi6oLaxGyH3PNijKH4N3Pp8BygKVLCN` · merchant `r9pQfgH67CdxMzi8d21cJg4o1eixnfawwb` · 9/9 PASS Tx | [`examples/testnet-live.ts`](../examples/testnet-live.ts), [`docs/proofs/testnet-live-output.txt`](./proofs/testnet-live-output.txt), [explorer link →](https://livenet.xrpl.org/transactions/2FD03A47760067AEA1CC3FCE2A5DD0E4E1CAD565DFE5354D8D608DE3ECAB637A?network=testnet) |
| **§4-3 프로토타입** | "monorepo 3-layer + xrpl.js 실 연동 + 9/9 PASS 2건 재현 + 본선 데모 시나리오" | [`docs/PRD.md` §7](./PRD.md) (Demo Scenarios), [`docs/screenshots/`](./screenshots/), [`examples/testnet-live.ts`](../examples/testnet-live.ts) |
| **§5-1 진행단계** | "☑ MVP개발" | [`docs/PRD.md` §6](./PRD.md) (MVP Scope Lock), [`README.md` Status](../README.md) |
| **서명** | 2026-05-17 / 대표자 (인) | (사용자 작성 영역) |

## 평가 rubric 4 항목 ↔ 본 리포 매핑

KFIP 2026 평가 기준 4 항목별로 본 리포의 어디서 증빙되는지:

### ① 생태계 논제 적합성 (Thesis Fit)
- **카테고리**: Global Payments & FX (1차) + AI-Powered Finance (2차)
- **증빙**: [`docs/PRD.md` §1·§5·§11`](./PRD.md), [`apps/demo-merchant/`](../apps/demo-merchant), [`apps/paykit/app/examples/kpop/`](../apps/paykit/app/examples/kpop)

### ② 블록체인 활용도 (Blockchain Usage)
- **XRPL 고유 기능 4개 활용 로드맵**: XLS-85 (v1.0) · Cross-Currency Pathfinding (v2.0) · XLS-47 (v2.0) · XLS-33 MPT (v2+)
- **9-gate verify**: tfPartialPayment 명시 거부 + DestinationTag + delivered_amount native 검증
- **증빙**: [`docs/PRD.md` §4 + §8.4 + §11`](./PRD.md), [`apps/paykit/src/xrpl/verify-tx.ts`](../apps/paykit/src/xrpl/verify-tx.ts), [`SECURITY.md`](../SECURITY.md)

### ③ 프로덕트 완성도 (Product Readiness)
- **monorepo 3-layer**: packages/sdk + apps/paykit (Next.js 14 + drizzle + better-sqlite3) + apps/demo-merchant
- **9/9 PASS 2건 재현**: Tx 2FD03A47…637A (ledger 17431228) + Tx 236D658A…3293
- **38/38 tests + typecheck clean + CI**: `pnpm -r test`, `.github/workflows/ci.yml`
- **5 screenshots** (작동 페이지 캡쳐): [`docs/screenshots/`](./screenshots/)
- **Docker compose** (deploy ready): [`docker-compose.yml`](../docker-compose.yml)
- **증빙**: [`README.md` badges + Live preview](../README.md), [`docs/proofs/testnet-live-output.txt`](./proofs/testnet-live-output.txt)

### ④ 사업성 (Commerciality)
- **타깃**: Bluenode internal 베타 + K-pop Fan Art + AI/SaaS Pay-Per-Call + B2B SaaS 청구
- **수익 구조**: 0.5–1% 거래 수수료 (단계별)
- **차별점**: 머천트 측 SDK 표면, t54.ai 보완재 포지션, XRPL native primitives 풀스택
- **증빙**: [`docs/PRD.md` §5 + §7 + §12`](./PRD.md)

## 추가 리소스

- **PRD 통합본**: [`docs/PRD.md`](./PRD.md) (1111 lines, 16 sections)
- **Setup 가이드**: [`docs/SETUP.md`](./SETUP.md)
- **Core 사양**: [`docs/core/`](./core/) (MVP_SPEC + PROJECT_PITCH + ARCHITECTURE)
- **Design 사양**: [`docs/design/`](./design/) (ENTITIES + STATE_MACHINE + API_CONTRACT + UX_GUIDE + DESIGN_SYSTEM)
- **보안 정책**: [`SECURITY.md`](../SECURITY.md)
- **CHANGELOG**: [`CHANGELOG.md`](../CHANGELOG.md)
- **재현 스크립트**:
  - `pnpm -r typecheck` — clean (3 workspaces)
  - `pnpm -r test` — 38/38 passing
  - `pnpm example:testnet-live` — real testnet 9/9 PASS
  - `pnpm dev` — apps/paykit :3000 + apps/demo-merchant :3001
  - `node scripts/screenshot.mjs` — Puppeteer headless capture (5 screenshots)
  - `docker compose up --build` — 두 서비스 컨테이너 구동
