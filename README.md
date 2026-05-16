# XRPL PayKit

> **Stripe-like payment intent + signed webhook DX for the XRP Ledger.**
> Built for [KFIP 2026](https://program.xrplkorea.org/) (Korea Financial Innovation Program) 1차 제출.

![status](https://img.shields.io/badge/status-MVP%20core%20·%20testnet%20verified-brightgreen)
![tests](https://img.shields.io/badge/tests-38%2F38%20passing-brightgreen)
![typescript](https://img.shields.io/badge/TypeScript-strict-blue)
![runtime](https://img.shields.io/badge/runtime-Node%2020%2B%20·%20pnpm%209-blue)
![network](https://img.shields.io/badge/network-XRPL%20testnet-black)
[![live-testnet](https://img.shields.io/badge/live%20testnet-9%2F9%20gates%20PASS-success)](https://livenet.xrpl.org/transactions/2FD03A47760067AEA1CC3FCE2A5DD0E4E1CAD565DFE5354D8D608DE3ECAB637A?network=testnet)

**Live testnet 검증 (reproducible)** — `pnpm example:testnet-live` 9/9 gates PASS.
Tx `2FD03A47…637A` · ledger 17431228 · [explorer →](https://livenet.xrpl.org/transactions/2FD03A47760067AEA1CC3FCE2A5DD0E4E1CAD565DFE5354D8D608DE3ECAB637A?network=testnet)

---

## Live preview (스크린샷)

작동 중인 PayKit core (:3000) + demo-merchant (:3001). 모두 mock 모드 default — Xaman API key 없이 결제 흐름 끝까지 재현.

| 화면 | 미리보기 |
|---|---|
| **PayKit core home** — Stripe-like payments for XRPL, 3-layer 아키텍처, SDK example | [docs/screenshots/01-paykit-home.png](./docs/screenshots/01-paykit-home.png) |
| **5분 quickstart** — `git clone` → `pnpm install` → `pnpm dev` 60초 가이드 | [docs/screenshots/02-paykit-quickstart.png](./docs/screenshots/02-paykit-quickstart.png) |
| **Examples gallery** — K-pop fan art · Premium AI search 등 vertical 패턴 | [docs/screenshots/03-paykit-examples.png](./docs/screenshots/03-paykit-examples.png) |
| **K-pop Fan Art Unlock** — 글로벌 팬덤 결제 인프라 (Cross-Currency · MPT v2 · Oracle v2 활용 narrative) | [docs/screenshots/04-fan-art-unlock.png](./docs/screenshots/04-fan-art-unlock.png) |
| **demo-merchant (:3001)** — Premium AI Search unlock mock 가맹점, 9-gate 검증 → signed webhook → resource unlock 전 흐름 시연 | [docs/screenshots/05-demo-merchant.png](./docs/screenshots/05-demo-merchant.png) |

```ts
import { PaykitClient } from "@paykit/sdk";

const paykit = new PaykitClient({
  apiKey: process.env.PAYKIT_API_KEY!,
  baseUrl: "http://localhost:3000",
});

const intent = await paykit.paymentIntents.create({
  amount: "1.25",
  asset: "XRP",
  orderId: "ORD-123",
  resourceId: "premium-search-result",
  webhookUrl: "http://localhost:3001/api/paykit-webhook",
});

redirect(intent.checkoutUrl);

// merchant webhook handler
const event = paykit.webhooks.constructEvent({
  rawBody, signatureHeader, secret,
});
if (event.type === "payment_intent.succeeded") {
  await unlockResource(event.data.object.resourceId);
}
```

PayKit이 XRPL 결제를 검증·매칭하고 merchant에게 **signed webhook**으로 알려준다. 단순 QR 생성기가 아니라 결제 이후 backend state change를 안전하게 만든다.

---

## 이게 뭔지 한눈에 (3-layer)

```
┌─────────────────────────────────────────────────────────────────┐
│  packages/sdk/         @paykit/sdk                               │
│  ─────────────         npm install 해서 가맹점 코드에 넣는 SDK.   │
│                        types · webhook 서명 · client.            │
│                        ★ 진짜 product (개발자가 가져가는 것)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 호출
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  apps/paykit/          PayKit core (:3000)                       │
│  ────────────          SDK가 호출하는 백엔드.                     │
│                        intent 발급 · checkout UI · XRPL 검증 ·    │
│                        signed webhook 발사.                       │
│                        ≈ Stripe.com 본체에 해당                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ webhook
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  apps/demo-merchant/   가맹점 샘플 (:3001)                        │
│  ───────────────────   SDK를 실제로 사용하는 코드 예시.            │
│                        K-pop · AI search · 디지털 굿즈 등         │
│                        다양한 도메인의 first 패턴.                │
│                        → :3000/examples 에서 갤러리                │
└─────────────────────────────────────────────────────────────────┘
```

**사이트 메뉴**: [`:3000/`](http://localhost:3000) Home · [`/quickstart`](http://localhost:3000/quickstart) · [`/examples`](http://localhost:3000/examples) · [`/examples/kpop`](http://localhost:3000/examples/kpop)

---

## 왜 만들었나

XRPL은 결제 primitive가 강한 체인이지만, 앱 개발자가 실제 서비스를 만들려면 매번 풀어야 하는 9가지가 있다:

> 사용자가 실제 결제했는가? 금액이 정확한가? 올바른 주소? validated? Xaman 승인 vs ledger 성공 구분? memo decode? tx hash 중복? webhook 언제? 중복 처리?

PayKit이 이걸 한 흐름으로 묶는다:

```
payment intent → hosted checkout (Xaman QR)
               → XRPL verify (9개 조건)
               → idempotent reconciliation
               → signed webhook (HMAC-SHA256)
               → merchant resource unlock
```

---

## 5분 quickstart

전제: Node.js 20+ · pnpm 9 (또는 `npx pnpm@9`).

```powershell
# Windows PowerShell 기준
git clone https://github.com/0xarkstar/xrpl-paykit.git
cd xrpl-paykit

# 의존성 설치 (3~7분, better-sqlite3 native build 포함)
npx pnpm@9 install

# .env 생성 — 각 app 폴더에 둘 다 필요
node -e "console.log('PAYKIT_API_KEY='+require('crypto').randomBytes(32).toString('hex')); console.log('PAYKIT_WEBHOOK_SECRET='+require('crypto').randomBytes(32).toString('hex'))" > .env.tmp
@"
PAYKIT_DATABASE_URL=file:./paykit.db
$(Get-Content .env.tmp -Raw)
PAYKIT_BASE_URL=http://localhost:3000
PAYKIT_WEBHOOK_URL_ALLOWLIST=http://localhost:3001/api/paykit-webhook
XRPL_NETWORK=testnet
XRPL_RPC_URL=wss://s.altnet.rippletest.net:51233
XAMAN_MODE=mock
DEMO_MERCHANT_BASE_URL=http://localhost:3001
"@ | Out-File -FilePath apps/paykit/.env -Encoding UTF8
# api_key / webhook_secret을 demo-merchant도 똑같이 쓰도록 매핑
$envContent = Get-Content apps/paykit/.env -Raw
$envContent = $envContent -replace 'PAYKIT_API_KEY=', "DEMO_MERCHANT_PAYKIT_API_KEY=$(($envContent | Select-String 'PAYKIT_API_KEY=([0-9a-f]+)').Matches.Groups[1].Value)`r`nPAYKIT_API_KEY="
$envContent = $envContent -replace 'PAYKIT_WEBHOOK_SECRET=', "DEMO_MERCHANT_PAYKIT_WEBHOOK_SECRET=$(($envContent | Select-String 'PAYKIT_WEBHOOK_SECRET=([0-9a-f]+)').Matches.Groups[1].Value)`r`nPAYKIT_WEBHOOK_SECRET="
Set-Content apps/demo-merchant/.env $envContent
Remove-Item .env.tmp

# SQLite 초기화
npx pnpm@9 -F @paykit/paykit db:push

# dev (3000 + 3001 동시)
npx pnpm@9 dev
```

**가장 간단한 우회**: 위 PowerShell 블록이 복잡하면 손으로 `.env` 만들어도 됨. **[`docs/SETUP.md`](./docs/SETUP.md) 참조**.

브라우저: **http://localhost:3001** → "Unlock with XRP" → checkout 새 창 → "Simulate Xaman Approve" → 자동 unlock.

---

## 데모 플로우 (mock 모드, 60초)

| # | 단계 | 어디서 일어남 |
|---|---|---|
| 1 | demo-merchant 페이지 진입, "Unlock with XRP" 클릭 | localhost:3001 |
| 2 | demo backend → PayKit `POST /api/v1/payment_intents` | localhost:3000 |
| 3 | checkout 새 창 열림 + Xaman QR (mock fixture 등록) | localhost:3000/checkout/:id |
| 4 | "Simulate Xaman Approve" 클릭 (mock 모드만) | localhost:3000 |
| 5 | PayKit이 XRPL fixture tx 검증 (9개 조건) | server-side |
| 6 | reconcile → intent.status = succeeded | DB |
| 7 | signed webhook 발사 → demo /api/paykit-webhook | localhost:3000 → 3001 |
| 8 | merchant가 HMAC-SHA256 서명 검증 → orders[orderId] = unlocked | localhost:3001 |
| 9 | demo 페이지 polling → premium content fade-in | UI |

데모 사이클을 다시 보려면 데모 페이지 우측 Status 카드의 `↻` 버튼.

### 실 Xaman으로 전환

[apps.xaman.dev](https://apps.xaman.dev/)에서 API key 발급 후 `.env`에:

```
XAMAN_MODE=real
XAMAN_API_KEY=...
XAMAN_API_SECRET=...
```

dev 재시작하면 fixture 대신 실 Xaman 결제 흐름으로 자동 전환.

---

## 아키텍처

```
┌──────────────────────┐                  ┌──────────────────────┐
│  demo-merchant       │                  │  PayKit core         │
│  (Next.js, :3001)    │                  │  (Next.js, :3000)    │
│                      │                  │                      │
│  [Premium AI Search] │                  │  POST /api/v1/       │
│   ↓ Unlock 클릭       │ ───────────────▶ │    payment_intents   │
│  /api/create-checkout│                  │  GET  /api/v1/       │
│                      │                  │    payment_intents/* │
│  /api/paykit-webhook │ ◀─ signed ─────  │  POST /api/v1/.../   │
│   ↑ HMAC 검증         │   webhook        │    verify            │
│  /api/premium-result │                  │  GET /checkout/:id   │
│   ↑ paid 게이팅       │                  │       (hosted UI)    │
└──────────────────────┘                  └──────────────────────┘
            │                                       │
            │                          ┌────────────┴───────────┐
            │                          │                        │
            │                    ┌─────▼─────┐          ┌──────▼────────┐
            │                    │ SQLite    │          │ Xaman SDK     │
            │                    │ (Drizzle) │          │ (or mock)     │
            │                    └───────────┘          └───────────────┘
            │                                                    │
            │                                            ┌───────▼───────┐
            │                                            │ XRPL testnet  │
            │                                            │  (xrpl.js)    │
            │                                            └───────────────┘
            │
            └─── @paykit/sdk (types + webhook signing + client)
```

상세는 [`docs/core/ARCHITECTURE.md`](./docs/core/ARCHITECTURE.md), [`docs/core/MVP_SPEC.md`](./docs/core/MVP_SPEC.md).

---

## 9-단계 검증 게이트 (PRD §8.4)

PayKit이 결제 1건을 `succeeded`로 만들기 전 통과시키는 9개 게이트 (AND 결합):

1. **validated** — `tx.validated === true` (validated ledger만 신뢰)
2. **tesSUCCESS** — `meta.TransactionResult === "tesSUCCESS"` (tec*/ter* 거부)
3. **isPayment** — `TransactionType === "Payment"`
4. **destinationMatch** — `Destination === merchantAddress`
5. **destinationTagMatch** — intent에 `destinationTag` 설정 시 정확 매칭 강제 (본인 보강 ✓)
6. **deliveredAmountExact** — `meta.delivered_amount === expectedDrops` (XRP=string / IOU=3-field)
7. **notPartialPayment** — `(Flags & 0x00020000) === 0` — **tfPartialPayment 플래그 명시 거부 (Partial Payment exploit 방어, 본인 보강 ✓)**
8. **memoIntentIdMatch** — memo `paykit.intent` decode → `intentId` 정확 매칭
9. **txHashUnused** — DB UNIQUE 강제 (race-safe lookup)

실패 시 사유 코드: `tx_not_found` · `tx_not_validated` · `tx_failed` · `not_payment` · `wrong_destination` · `wrong_destination_tag` · `wrong_amount` · `partial_payment_not_supported` · `partial_payment_flag` · `missing_memo` · `memo_decode_failed` · `intent_mismatch` · `duplicate_tx` · `intent_expired`

→ 자세한 사양은 [`docs/PRD.md` §8.4](./docs/PRD.md) · [`apps/paykit/src/xrpl/verify-tx.ts`](./apps/paykit/src/xrpl/verify-tx.ts) · live testnet 9/9 PASS 재현 → `pnpm example:testnet-live`

---

## 안 만드는 것 (MVP scope lock)

새 wallet · refund · subscription · tax · fiat ramp · mainnet · multi-chain · 실제 agent runtime · payment channel · dashboard.

> **Checkout first, agent-ready later.** V2에서 API pay-per-request · x402 · agent-readable metadata.

---

## 폴더 구조

```
.
├── packages/
│   └── sdk/                     # @paykit/sdk
│       └── src/
│           ├── types.ts
│           ├── webhooks.ts      # HMAC-SHA256 sign/verify (raw body 기반)
│           └── client.ts        # PaykitClient
├── apps/
│   ├── paykit/                  # PayKit core (Next.js, :3000)
│   │   ├── app/
│   │   │   ├── page.tsx                # Home (3-layer 아키텍처)
│   │   │   ├── quickstart/             # 5분 quickstart 페이지
│   │   │   ├── examples/               # 갤러리 + K-pop 상세
│   │   │   ├── checkout/[intentId]/    # hosted checkout UI
│   │   │   ├── api/v1/payment_intents/ # POST/GET/verify
│   │   │   ├── api/internal/           # mock simulate-approve, public polling
│   │   │   └── api/xaman/callback/     # Xaman fallback
│   │   ├── components/                 # SiteNav, StatusStep, EventRow
│   │   ├── src/
│   │   │   ├── config.ts        # zod env validation
│   │   │   ├── db/              # Drizzle schema + better-sqlite3
│   │   │   ├── domain/          # state machine, memo, drops
│   │   │   ├── services/        # create-intent · reconcile · dispatch-webhook
│   │   │   ├── xrpl/            # xrpl.js verify-tx + mock fixtures
│   │   │   └── xaman/           # real client + mock
│   │   ├── middleware.ts        # /api/v1/* bearer auth
│   │   └── tests/               # 9개 검증 + state machine + drops/memo
│   └── demo-merchant/           # Next.js (:3001)
│       ├── app/
│       │   ├── page.tsx         # locked premium UI
│       │   └── api/
│       │       ├── create-checkout/   # PayKit SDK 호출
│       │       ├── paykit-webhook/    # 서명 검증 + state 갱신
│       │       ├── premium-result/    # paid 게이팅
│       │       ├── order-status/      # 페이지 polling
│       │       └── reset/             # 데모 사이클 초기화
│       └── src/                 # orders + events (globalThis 공유)
├── docs/
│   ├── core/                    # PROJECT_PITCH · MVP_SPEC · ARCHITECTURE
│   └── design/                  # ENTITIES · STATE_MACHINE · API_CONTRACT · UX_GUIDE · DESIGN_SYSTEM
├── package.json, pnpm-workspace.yaml, tsconfig.base.json
├── .env.example
└── README.md (이 파일)
```

---

## 기술 스택

- **TypeScript** strict
- **pnpm** workspace
- **Next.js 14** App Router (3000 + 3001)
- **Drizzle ORM** + **better-sqlite3**
- **xrpl.js** 4.x (testnet)
- **xumm-sdk** (Xaman, real 모드 시)
- **Tailwind CSS** + lucide-react
- **Vitest** (테스트)
- Node 20+ · Windows/macOS/Linux

---

## 테스트

```powershell
npx pnpm@9 -r typecheck     # 0 error
npx pnpm@9 -r test          # SDK 9개 + paykit 31개 통과
```

테스트 범위:
- `packages/sdk/src/webhooks.test.ts` — signature mismatch · timestamp skew · constant-time · malformed · raw body 변조 6 케이스 + 정상 1
- `packages/sdk/src/client.test.ts` — bearer auth + JSON body + 에러 처리
- `apps/paykit/tests/verify-tx.test.ts` — 9개 검증 조건 모두
- `apps/paykit/tests/state-machine.test.ts` — 전이 검증
- `apps/paykit/tests/drops.test.ts` · `memo.test.ts` — 거부 예시 모두

수동 e2e (Wow moments):
- 잘못된 signature webhook: `curl -X POST http://localhost:3001/api/paykit-webhook -H "PayKit-Signature: t=1,v1=00" -d '{}'` → 401
- 데모 페이지에서 `?paid=1` query 신뢰 X — premium-result는 orders state 기반 게이팅

---

## 환경 변수

전체 키 + 설명은 [`.env.example`](./.env.example). 핵심:

| 변수 | 값 | 비고 |
|---|---|---|
| `PAYKIT_API_KEY` | `openssl rand -hex 32` | bearer auth |
| `PAYKIT_WEBHOOK_SECRET` | `openssl rand -hex 32` | HMAC-SHA256 |
| `PAYKIT_DATABASE_URL` | `file:./paykit.db` | SQLite |
| `XAMAN_MODE` | `mock` (default) / `real` | mock이면 API key 없어도 동작 |
| `XAMAN_API_KEY`/`SECRET` | https://apps.xaman.dev/ 발급 | `real` 모드만 |
| `PAYKIT_MERCHANT_XRPL_ADDRESS` | r-주소 | 비워두면 mock 주소 |

`.env`는 **두 app 각각**에 동일하게 (Next.js는 monorepo root `.env` 자동 로드 X).

---

## 팀 분담 (블루노드, 5인)

| 역할 | 담당 영역 | 작업 |
|---|---|---|
| **Product / Pitch** | 피치덱 · 데모 영상 · 폼 제출 | 1페이지 피치 PDF · 데모 영상 녹화 (60초) · 구글폼 4항목 |
| **Frontend / Demo UX** | checkout/demo polish | shadcn 디테일 · 모바일 QR · 트랜지션 · K-pop 페이지 시각 보강 |
| **Backend / Core** | PayKit core 확장 | 실 Xaman API key 연동 (`XAMAN_MODE=real`) · requires_review UI · webhook retry |
| **XRPL / Verification** | testnet tx 검증 | merchant testnet wallet 발급 · 실 tx 1건 → fixture 갱신 · delivered_amount edge case |
| **Docs / SDK** | DX 가이드 | README quickstart 검증 (Windows/macOS) · SDK 예제 보강 · 트러블슈팅 |

## 기여 (팀원/외부 개발자용)

1. **Issue 먼저** — 새 기능 / 버그 픽스 시 GitHub Issue로 의도 공유
2. **PRD 인용** — PR 메시지에 PayKit MVP §X.X 또는 RFC 링크
3. **테스트 통과 필수** — `pnpm -r typecheck && pnpm -r test` 통과해야 머지
4. **커밋 메시지** — Conventional Commits + 한국어 가능: `feat(paykit/api): payment_intents POST 보강 — 이유`

자세히: [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## 보안 (PRD §12)

- PayKit은 **자금 custody 안 함**. 사용자 지갑 → merchant XRPL address 직접.
- 모든 secret은 `.env`에만. 코드/로그/문서 평문 X.
- API는 bearer auth (`/api/v1/*`).
- Webhook URL allowlist (`PAYKIT_WEBHOOK_URL_ALLOWLIST`) — SSRF 차단.
- XRPL **validated tx**만 신뢰 (wallet callback 단독 신뢰 X).
- `meta.delivered_amount` 정확 일치 검증 (partial payment 차단).
- tx hash UNIQUE 강제 (duplicate 차단).
- **testnet only** — mainnet 키/주소 코드 등장 X.

문제 발견 시 GitHub Issue로 제보 (또는 보안이슈는 비공개로 maintainer 연락).

---

## 트러블슈팅

| 증상 | 해결 |
|---|---|
| `better-sqlite3` build 실패 (Windows) | ① Visual Studio Build Tools (C++ workload) 설치 → ② `npx pnpm@9 rebuild better-sqlite3 -F @paykit/paykit`. 그래도 안되면 `npx pnpm@9 install --ignore-scripts && npx pnpm@9 -F @paykit/paykit rebuild better-sqlite3` |
| `node-gyp` ENOENT Python (Windows) | Python 3.x 설치 후 PATH 추가. 또는 `npm config set python python3` |
| `corepack EPERM` (Windows) | 관리자 권한 PowerShell로 `corepack enable` 한 번 실행. 귀찮으면 `npx pnpm@9` 그대로 사용 |
| `pnpm` 명령어 못 찾음 | `npx pnpm@9` 로 대체. 또는 `corepack enable` (관리자 권한 필요할 수 있음) |
| `server_misconfigured` (401) | `.env`를 `apps/paykit/`과 `apps/demo-merchant/` 양쪽에 복사했는지 확인 |
| `zod regex validation` 에러 | `PAYKIT_MERCHANT_XRPL_ADDRESS`가 비어있으면 OK, 채울 거면 r-주소 형식 (`r` + 25~34자 base58) |
| 페이지가 unlocked로 시작 | dev 서버 globalThis 메모리에 남아있음. demo-merchant 우측 Status `↻` 버튼 또는 dev 재시작 |
| `pnpm dev` 두 app 중 하나만 시작 | `apps/*/next.config.mjs` 확인 (Next.js 14는 `.ts` config 미지원) |
| `:3000` 또는 `:3001` 포트 이미 사용 중 | PowerShell: `Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue \| Select-Object -ExpandProperty OwningProcess \| ForEach-Object { Stop-Process -Id $_ -Force }` |
| Next.js cache 꼬임 | `Remove-Item -Recurse -Force apps/paykit/.next, apps/demo-merchant/.next` 후 재시작 |

---

## Roadmap

PayKit은 KFIP 운영 측이 명시한 **"현 규제 환경 단계적 접근"** 기준에 정렬된 단계별 출시 계획을 갖고 있습니다. 자세한 사양은 [`docs/PRD.md` §11](./docs/PRD.md) 참고.

### MVP (지금 ~ 본선 6/25)
- testnet XRP + Xaman mock + Hosted Checkout + 9-단계 검증 + Signed Webhook
- 두 vertical demo: Fan Art Image Unlock + Premium AI Search
- design partner 머천트 2곳 어트랙션 + Bluenode 학회 internal 베타 적용 시도
- 전자금융보조업자 포지션 (PG·VASP 라이선스 불필요)

### v1.0 (3–6개월)
- **RLUSD 메인넷 결제** (코인원 KRW 페어 활용, 2026-04 상장)
- **XLS-85 Token-Enabled Escrows** — 머천트 즉시 정산 락업 (카드 D+2 → XRPL 초 단위)
- Web3Auth XRPL 임베디드 지갑 옵션 (K-콘텐츠 소셜 로그인)
- 머천트 대시보드 + `@paykit/sdk` v1.0 정식 출시
- 첫 유료 머천트 5곳 (거래액의 0.5%)

### v2.0 (6–18개월)
- **Multi-Surface Payments** — XRPL Mainnet(XRP/RLUSD) + XRPL EVM Sidechain(wXRP/USDC) 단일 Intent 처리
- **Cross-Currency Pathfinding** — 사용자 XRP 결제 → 머천트 RLUSD 자동 환전 (native ledger)
- **XLS-47 Price Oracles** — RLUSD/KRW 동적 가격 책정
- **x402 Facilitator Adapter** (t54.ai + self-hosted) — AI 에이전트 결제 표준 진입
- B2B 엔터프라이즈 진출 (K-콘텐츠 플랫폼·AI 에이전트 마켓플레이스)

### v2+ (장기)
- **XLS-33 MPT** (Multi-Purpose Tokens) — 머천트별 issued unlock token·멤버십·소장 인증 표준화
- 토스·IBK 파트너 연계 — PG 라이선스 검토 또는 면허 사업자 제휴
- 한국 외 시장 (일본·동남아 K-콘텐츠 팬덤 거점)

**XRPL 고유 프리미티브 활용 (KFIP rubric 9개 중 4개)**: XLS-85 (v1.0) · Cross-Currency Pathfinding (v2.0) · XLS-47 (v2.0) · XLS-33 MPT (v2+). EVM 체인에서 이 구조를 재현하려면 외부 정산 컨트랙트 + 외부 DEX 라우터 + 외부 oracle 인프라 + 외부 토큰 표준을 별도 구축해야 합니다.

---

## 보안

[`SECURITY.md`](./SECURITY.md) 참고. testnet only · custody-free design · WEBHOOK_URL_ALLOWLIST(SSRF 차단) · HMAC-SHA256 raw-body signing · constant-time verify.

---

## 라이선스

추후 결정. 현재 KFIP 2026 1차 제출 + 본선 진행 중. 외부 기여자는 issue로 의도 공유 후 PR.

---

## 참고

- 사용자 PRD v0.2 (Korean Detailed PRD) — 외부 SSOT
- [`docs/core/PROJECT_PITCH.md`](./docs/core/PROJECT_PITCH.md) — 1페이지 피치
- [`docs/core/MVP_SPEC.md`](./docs/core/MVP_SPEC.md) — P0 8개 기능 상세
- [`docs/core/ARCHITECTURE.md`](./docs/core/ARCHITECTURE.md) — 시스템 다이어그램
- [`docs/design/`](./docs/design) — 엔티티 · 상태머신 · API contract · UX 가이드 · 디자인 시스템
- [`CHANGELOG.md`](./CHANGELOG.md) — 변경 이력

---

KFIP 2026 1차 서류 제출 (2026-05-17 23:59 KST) · MVP prototype · mock 모드 default · testnet only.
