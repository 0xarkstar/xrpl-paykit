# XRPL PayKit PRD — Unified (v0.4 통합본)

> **메타**: 본 PRD는 팀 내 다음 문서들의 통합본입니다 — Fan Art PRD (멤버) + 14-slide 사업계획서 + `docs/core/`(`MVP_SPEC` · `PROJECT_PITCH` · `ARCHITECTURE`). 각 섹션 끝에 출처 인용.
> **상태**: v0.3 frozen + Fan Art Image Unlock demo surface + verifier 9-gate 보강 (DestinationTag + `tfPartialPayment` 명시 거부) + live testnet 9/9 PASS 검증 (2건 재현 완료).
> **대상**: KFIP 2026 1차 서류 reviewer + 본선 6/25 심사위원 + 팀 내부 builder.
> **팀**: Veridot — Bluenode 학회(인하대, 2023년 결성) 멤버로 구성된 한국 XRPL 결제 도전팀. 외부 영입 0명, 학회 100% 구성.

---

## 1. Executive Summary

XRPL PayKit은 XRPL 결제를 머천트 앱에 5분 안에 붙일 수 있게 해주는 개발자 도구다. Stripe-like한 payment intent + hosted checkout + 9-gate ledger 검증 + HMAC-SHA256 signed webhook을 한 흐름으로 캡슐화한다. 결제 finality는 XRPL이 3–5초 안에 제공하고 수수료는 약 $0.0002 수준이므로, 카드사 2.5–3% / Patreon 5–12% / MakeStar 5–10%와 비교해 글로벌 마이크로 결제에 적합한 레일이 된다. MVP는 testnet XRP + Xaman + hosted checkout + 9-gate verifier + signed webhook + Fan Art Image Unlock 데모로 좁혔고, v1.0에서 RLUSD 메인넷 + XLS-85 Token-Enabled Escrows, v2.0에서 XRPL EVM Sidechain + x402 facilitator adapter + Cross-Currency Pathfinding + XLS-47 Price Oracles, v2+에서 XLS-33 MPT와 한국 면허 사업자 제휴로 확장한다. PayKit은 본선 6/25 Two IFC Seoul The Forum 3층 무대에서 라이브 testnet 데모로 작동한다.

> 출처: 사업계획서 Slide 1–14 + Fan Art PRD §0, §1 + `docs/core/PROJECT_PITCH.md`

---

## 2. Problem

### 2.1 XRPL primitive vs. 결제 워크플로우

XRPL은 결제 primitive가 강한 체인이다. 3–5초 finality, ~$0.0002 fee, Destination Tag + Memo native primitive까지 protocol 레벨에서 노출되어 있다. 그러나 앱 개발자가 실제 서비스를 만들려면 primitive만으로 부족하다.

한국 개발자가 XRPL 결제를 앱에 붙이려면 지금은 다음을 직접 만들어야 한다.

- **트랜잭션 검증** — `validated` 상태인가? `tesSUCCESS`인가? 금액이 정확한가? memo가 매칭되는가?
- **부분 결제(Partial Payment) 방어** — `tfPartialPayment` 0x00020000 플래그를 켜서 `tesSUCCESS`를 받고 실제로는 1 drop만 전달하는 XRPL exploit
- **중복 처리 방지** — 같은 tx로 두 주문이 unlock되지 않게
- **서명된 webhook 인프라** — HMAC, 재시도, 멱등성
- **상태 머신** — `created / pending / succeeded / failed / expired / requires_review`
- **모바일↔데스크탑 흐름** — Xaman redirect는 신뢰할 수 없음 (모바일에서 localhost 못 옴)

### 2.2 단순 QR 생성기는 결제의 시작일 뿐

결제 이후 backend state change가 진짜 문제다. 단순 송금 QR로는 "어떤 주문과 매칭되는지", "이미지 접근권한을 언제 열어야 하는지", "webhook을 어떻게 검증해야 하는지"가 해결되지 않는다.

### 2.3 결제 인프라 부재가 만드는 결과

- AI/SaaS 개발자는 글로벌 결제·미터링을 못 받음 (카드 KYC, 3% 수수료, D+2 정산)
- 인디 K-콘텐츠 크리에이터·팬아티스트는 글로벌 팬 결제를 못 받음
- x402·AI 에이전트 결제 시대에 기존 카드/PG 인프라는 단건 호출에 부적합

PayKit이 해결하려는 문제는 "팬이 돈을 보내게 하는 것"이 아니다. **검증된 결제 결과를 특정 image/resource/order에 안전하게 매칭하고, merchant backend가 그 결과를 믿고 리소스를 unlock할 수 있게 하는 것**이다.

> 출처: 사업계획서 Slide 3 + Fan Art PRD §3 + `docs/core/PROJECT_PITCH.md` §문제

---

## 3. Solution

### 3.1 3대 빌딩블록

```
                ┌─────────────────────────────┐
   ① Hosted     │                             │
   Checkout  ◄──┤   Verified Reconciliation   ├──► ③ Signed Webhook
                │                             │
                └─────────────────────────────┘
                              ②
```

**① Hosted Checkout** — Xaman QR + deep link + 3단계 진행 시각화 (`Wallet Approved → Ledger Verified → Unlocked`). 머천트는 결제 UI를 직접 만들 필요가 없다.

**② Verified Reconciliation** — XRPL 원장에서 9-단계 검증. validated · `tesSUCCESS` · `Payment` · destination · `DestinationTag` · `meta.delivered_amount` 정확 매칭 · `tfPartialPayment` 0x00020000 거부 · memo `intentId` 매칭 · tx hash UNIQUE.

**③ Signed Webhook** — Stripe 호환 HMAC-SHA256 서명. 머천트 학습 비용 0. 재시도(7회·최대 80h), 멱등성 키, secret rotation.

### 3.2 결제 SDK 표면을 정확히 가져간다

PayKit은 새로운 wallet, 새로운 체인, 새로운 토큰 표준을 만들지 않는다. **Stripe가 카드 결제에 한 일을 XRPL 결제에 한다**. payment intent → checkout → verify → webhook의 한 흐름이 머천트 측 개발자 도구로 캡슐화된다.

```ts
const intent = await paykit.paymentIntents.create({...});
redirect(intent.checkoutUrl);

// merchant backend
const event = paykit.webhooks.constructEvent({...});
if (event.type === "payment_intent.succeeded") {
  await unlockResource(event.data.object.resourceId);
}
```

> 출처: 사업계획서 Slide 4 + Fan Art PRD §0 + `docs/core/PROJECT_PITCH.md` §솔루션

---

## 4. Why XRPL

### 4.1 기술적 적합성

| 항목 | XRPL | PayKit 활용 |
|---|---|---|
| Finality | 3–5초 결정적 | 결제 unlock UX의 sine qua non |
| Fee | ~$0.0002 | API 단건 결제 · 마이크로 결제 가능 |
| Memo + Destination Tag | Native primitive | 주문 식별 · 정합화 |
| Mempool/reorg | 없음 | webhook 한 번만 발사 |
| Protocol 레벨 메타데이터 | `meta.delivered_amount` 노출 | partial payment 차단의 ground truth |

다른 L1 위에서 같은 안전성을 만들려면 인덱서 · ABI · 이벤트 파싱 모듈을 따로 만들어야 한다. XRPL은 protocol 레벨에서 결제 검증 메타데이터를 노출한다.

### 4.2 Ripple Korea 2026 흐름과의 정렬

| 흐름 | Ripple의 2026 한국 액션 | PayKit 연결성 |
|---|---|---|
| **RLUSD 스테이블코인** | 2026-04 코인원 RLUSD KRW 페어 상장 | v1.0 메인넷 RLUSD 결제 직결 |
| **AI 에이전트 결제(x402)** | 2026-02 t54.ai XRPL facilitator + Ripple $5M 시드 | v2.0 facilitator adapter로 보완재 |
| 기관 RWA | 2026-04 교보생명 국채 토큰화 PoC | (간접) |
| 송금 | 2026-04 케이뱅크-Ripple 한-UAE/태국 PoC | (간접) |

PayKit은 4개 흐름 중 2개에 정확히 닿는다.

### 4.3 XRPL 고유 프리미티브 활용

KFIP rubric은 XRPL 고유 기능 활용 9개를 명시한다. 본 PRD는 그중 4개를 단계별로 활용한다.

| # | XRPL 기능 | 단계 | 용도 |
|---|---|---|---|
| 1 | **XLS-85 Token-Enabled Escrows** | v1.0 | RLUSD 메인넷 결제 시 escrow 기반 정산 보호 |
| 2 | **Cross-Currency Pathfinding** | v2.0 | 해외 팬 USD/JPY 결제 → 한국 creator KRW 정산 단일 트랜잭션 |
| 3 | **XLS-47 Price Oracles** | v2.0 | RLUSD/KRW 환율 fixing, off-ramp 정산 안정성 |
| 4 | **XLS-33 MPT (Multi-Purpose Tokens)** | v2+ | 후원자 badge/IOU/reward token, 토스·IBK 면허 제휴 시 정산권 토큰화 |

MVP는 의도적으로 좁게 잡았다 — Payment + Memo + Destination Tag + 9-단계 검증. 고급 primitive는 모두 명시적 로드맵 단계에 매핑되어 있다.

> 출처: 사업계획서 Slide 6 + Fan Art PRD §4 + `docs/core/PROJECT_PITCH.md` §Why XRPL

---

## 5. Target Users

### 5.1 0차 design partner (베타 시도): Bluenode 학회 internal

팀이 속한 Bluenode 학회 자체가 PayKit의 첫 internal beta 머천트가 될 수 있다. 학회 내부의 디지털 콘텐츠 (강의 자료, 컨퍼런스 후기 영상, 학회 굿즈) 판매 페이지에 PayKit을 붙여 본선 6/25 이전에 internal dogfooding을 시도한다.

### 5.2 1차 vertical

#### (i) K-pop Fan Art 글로벌 마이크로 결제

**Primary persona**: XRPL을 깊게 알지는 않지만, 글로벌 팬 결제와 디지털 이미지 unlock 기능을 빠르게 붙이고 싶은 TypeScript/Next.js 개발자.

이 사용자는 이렇게 말하고 싶다.

> "팬아트 이미지를 잠가두고, 팬이 XRP로 결제하면 자동으로 high-res 이미지가 열리게 하고 싶다."

원하지 않는 것:
- XRPL transaction format 직접 작성
- memo hex encoding 직접 처리
- delivered amount edge case 직접 처리
- webhook signature 직접 설계
- duplicate tx로 이미지가 여러 번 unlock되는 문제 직접 처리

**Secondary persona**: K-pop 팬아티스트 / 인디 creator. 글로벌 팬에게 이미지/굿즈/디지털 리워드를 팔고, 결제 완료 후 image access가 자동 열리고, 정산과 split이 투명하게 보이길 원한다.

#### (ii) AI/SaaS Pay-Per-Call

한국 LLM·AI 에이전트 빌더 (Wrtn, Liner, AI 스타트업 다수)의 단건 API 호출 미터링·결제. x402 시대의 진입점.

### 5.3 확장 (v1.0 이후)

#### (iii) B2B 국경간 SaaS 청구

한국 SaaS 회사의 글로벌 고객 청구·미터링. RLUSD 메인넷 단계(v1.0)에서 USD 안정성 보장.

### 5.4 세 버티컬 공통점

세 버티컬 모두 **"카드사·PG·은행 인프라로 못 받거나 너무 비싸게 받는 결제"**를 PayKit이라는 단일 인프라로 해결한다.

### 5.5 MVP에서 타깃하지 않는 사용자

- 실제 카드 결제 gateway 대체
- 실시간 KRW/USD/JPY fiat conversion
- enterprise merchant
- 법적 royalty settlement
- tax / dispute / refund / chargeback
- real music chart oracle settlement
- securities-like revenue share token
- NFT marketplace 전체
- full creator platform

> 출처: 사업계획서 Slide 8 + Fan Art PRD §5

---

## 6. MVP Scope Lock

MVP 범위는 다음 한 문장으로 고정한다.

> **Single asset XRP testnet + Xaman + hosted checkout + verified reconciliation + signed webhook + Fan Art Image Unlock demo + AI/SaaS pay-per-call demo (secondary).**

### 6.1 만드는 것 (P0 8개)

| # | 기능 | 출처 |
|---|---|---|
| 1 | Payment Intent API (`POST/GET/verify`) | `MVP_SPEC` §P0-1 |
| 2 | Hosted Checkout Page (`/checkout/:intentId`) | `MVP_SPEC` §P0-2 |
| 3 | Xaman Approval Flow (real + mock) | `MVP_SPEC` §P0-3 |
| 4 | XRPL Transaction Verification (9-gate) | `MVP_SPEC` §P0-4 |
| 5 | Reconciliation Engine (state machine + idempotency) | `MVP_SPEC` §P0-5 |
| 6 | Signed Webhook (HMAC-SHA256, 7회·80h 재시도, 멱등성 키) | `MVP_SPEC` §P0-6 |
| 7 | Demo Merchant App (Fan Art unlock + AI search unlock) | `MVP_SPEC` §P0-7 |
| 8 | Minimal SDK (`@paykit/sdk` snippet) | `MVP_SPEC` §P0-8 |

### 6.2 만들지 않는 것

- 카드 결제
- 실제 USD/JPY/KRW fiat 환전
- real stablecoin issuer integration
- real revenue share token
- chart/oracle 기반 자동 분배
- actual split payment execution
- refund/subscription/tax/dispute
- NFT minting/marketplace
- full creator dashboard
- production mainnet settlement (testnet only)
- autonomous agent/x402 runtime
- 실제 아이돌 IP/초상권/상표권 처리
- 새 wallet, 새 체인, 새 토큰 표준

### 6.3 Demo IP boundary

데모 이미지는 반드시 **creator-owned original demo artwork** 또는 사용 허가된 placeholder 이미지로 한다. 실제 K-pop idol 이미지, 팬아트 판매 권리, agency licensing, 초상권, 상표권, 수익권 분배는 MVP 범위 밖이다. 발표에서 "fan art vertical을 보여주는 데모"라고 말하고, 실제 IP settlement 제품이라고 과장하지 않는다.

> 출처: Fan Art PRD §6 + `docs/core/MVP_SPEC.md` §Scope Lock

---

## 7. Demo Scenarios

### 7.1 Fan Art Image Unlock (primary, K-pop vertical)

#### 데모 이름

**Fan Art Unlock: Pay with XRP, unlock the image instantly**

한국어: **팬아트 이미지 결제: XRP로 결제하면 고화질 이미지가 즉시 열린다**

#### User story

팬은 K-pop fan art drop page에 들어온다. 페이지에는 low-res blurred preview가 보인다. 팬은 `Unlock high-res image with XRP` 버튼을 누른다. PayKit hosted checkout이 열리고 Xaman QR이 표시된다. 팬은 Xaman에서 결제한다. PayKit은 XRPL 원장에서 결제를 검증한다. 검증 성공 시 PayKit이 fan art app backend에 signed webhook을 보낸다. fan art app은 webhook signature를 검증한 뒤 order/resource를 paid로 바꾼다. 팬은 high-resolution 이미지와 download 버튼을 볼 수 있다.

#### 전체 flow (16단계)

```
 1. Fan opens fan art drop page
 2. Image is blurred / locked
 3. Fan clicks "Unlock with XRP"
 4. Merchant backend creates PayKit payment intent
 5. PayKit returns checkoutUrl
 6. Fan is redirected to PayKit checkout
 7. Checkout shows Xaman QR / deep link
 8. Fan approves XRP payment in Xaman
 9. PayKit detects Xaman payload status
10. PayKit looks up tx on XRPL
11. PayKit verifies 9 gates (validated / tesSUCCESS / amount / destination / DestinationTag / notPartialPayment / memo / txHashUnused)
12. PayKit marks payment intent succeeded
13. PayKit sends signed webhook to merchant backend
14. Merchant verifies webhook signature
15. Merchant marks image access as unlocked
16. Fan sees high-res image and download button
```

#### 꼭 보여줄 장면

```
Locked image preview
  → Checkout generated
  → Xaman approval
  → XRPL ledger verified
  → Signed webhook received
  → High-res image unlocked
```

이 장면이 PayKit의 제품 가치를 설명한다. "QR을 띄우는 것"이 아니라 "원장에서 검증된 결제 이벤트로 앱 상태를 안전하게 바꾸는 것."

### 7.2 AI/SaaS Pay-Per-Call (secondary, x402 hosted variant)

```
Client → POST /api/llm                       → 402 + checkout_url
       → opens checkout, Xaman 결제
       → POST /api/llm  + x-paykit-token     → 200 + LLM response
```

x402 "402 + 결제증명 retry" 패턴의 hosted 변형. AI 에이전트가 API 단건 결제를 자동 처리하는 작동 데모. `apps/demo-merchant` Premium AI Search Result unlock 패턴을 그대로 사용한다.

### 7.3 두 시나리오 공통 — 3단계 시각화

```
┌──────────────────────────────────────────────────────────────┐
│  ① Wallet Approved  →  ② Ledger Verified  →  ③ Unlocked     │
│       ✓                       ✓ (3.2s)              ✓        │
└──────────────────────────────────────────────────────────────┘
```

"단순 QR 생성기가 아니라 결제 인프라"라는 메시지가 한눈에 전달된다.

> 출처: Fan Art PRD §7 + 사업계획서 Slide 5

---

## 8. Technical Specifications

### 8.1 Payment Intent API

**Endpoints** (모두 `Authorization: Bearer PAYKIT_API_KEY` 필요):

```
POST /api/v1/payment_intents
GET  /api/v1/payment_intents/:intentId
POST /api/v1/payment_intents/:intentId/verify
```

#### Create request (Fan Art demo)

```json
{
  "amount": "1.25",
  "asset": "XRP",
  "orderId": "fanart_order_001",
  "resourceId": "imagepack_2026_birthday_drop",
  "resourceType": "image_pack",
  "creatorId": "creator_jieun",
  "mode": "checkout",
  "webhookUrl": "http://localhost:3001/api/paykit-webhook",
  "successUrl": "http://localhost:3001/orders/fanart_order_001/success",
  "cancelUrl": "http://localhost:3001/orders/fanart_order_001/cancel",
  "metadata": {
    "fanUserId": "fan_demo_001",
    "displayTitle": "Birthday Fan Art Pack",
    "publicPreviewUrl": "/images/fanart-preview-blur.png"
  }
}
```

#### Create response

```json
{
  "id": "pi_01H...",
  "paymentStatus": "created",
  "amount": "1.25",
  "asset": "XRP",
  "orderId": "fanart_order_001",
  "resourceId": "imagepack_2026_birthday_drop",
  "checkoutUrl": "http://localhost:3000/checkout/pi_01H...",
  "expiresAt": "2026-05-17T14:00:00.000Z"
}
```

#### Validation

- `amount`: 양수 decimal string, regex `/^[0-9]+(\.[0-9]{1,6})?$/` (XRP 6 decimals 한도). 거부: `-1`, `1e-6`, `1,000`, `0`, `0.0000001`
- `asset: "XRP"`만 (MVP)
- `orderId`: 필수, non-empty
- `resourceId`: 필수
- `resourceType`: MVP에서 `image` 또는 `image_pack`만 (Fan Art demo) / Premium API search는 `resourceType` 생략
- `webhookUrl`: `PAYKIT_WEBHOOK_URL_ALLOWLIST`에 등록된 URL만
- `metadata`: allowlisted keys (`fanUserId`, `displayTitle`, `publicPreviewUrl`), 1KB 이하

상세: `docs/design/API_CONTRACT.md`, `docs/design/ENTITIES.md`.

### 8.2 Hosted Checkout

**URL**: `GET /checkout/:intentId` (public, bearer auth 없음)

표시:
- 제품명: XRPL PayKit
- 결제 금액: `1.25 XRP`
- 결제 대상: `Birthday Fan Art Pack`
- creator label: `by creator_jieun`
- Xaman QR (256×256px 이상) + deep link (`xumm://...`)
- 상태 단계: `Waiting for wallet approval` → `Payment submitted` → `Verifying on XRPL` → `Webhook delivered` → `Image unlocked`

#### UX 원칙

모바일 Xaman approval 이후 redirect에 의존하지 않는다. **Primary success path는 checkout page polling** (2초 간격, terminal 상태에서 중단, max 5분 후 expired).

```
checkout page polling
  → backend refreshes Xaman payload status
  → tx hash detected
  → XRPL verification
  → paymentStatus updated
  → checkout page sees succeeded
```

상세: `docs/design/UX_GUIDE.md` §1.

### 8.3 Xaman Integration — mock vs real

#### Transaction shape

```ts
const txjson = {
  TransactionType: "Payment",
  Destination: merchantAddress,
  Amount: amountDrops,
  Memos: [
    {
      Memo: {
        MemoType: stringToHex("paykit.intent"),
        MemoFormat: stringToHex("application/json"),
        MemoData: stringToHex(JSON.stringify({
          intentId,
          orderId,
          resourceId,
          resourceType: "image_pack"
        }))
      }
    }
  ]
};
```

#### Memo 정책

| 포함 OK | 절대 X |
|---|---|
| `intentId` | API key |
| `orderId` | webhook secret |
| `resourceId` (opaque ID 권장) | 개인정보 (PII) |
| `resourceType` | 원본 이미지 private URL |
| | 다운로드 token |
| | creator payout private info |

XRPL memo는 public data로 취급한다. `resourceId`는 사람이 읽을 수 있는 K-pop/IP 이름이 아니라 opaque ID를 권장한다 (`imgpack_01JXYZ...` Good, `newjeans_birthday_official_poster` Bad).

#### Mock 모드

`XAMAN_MODE=mock` 환경 변수로 데모 안정성 확보. 데모 직전 testnet/Xaman API 불안정 시 fallback. live/mock 여부는 UI에 명시적으로 표시한다.

### 8.4 XRPL Transaction Verification — 9-gate 검증 사양

PayKit verifier(`apps/paykit/src/xrpl/verify-tx.ts`)는 모든 결제에 대해 9개 게이트를 AND 결합으로 통과시킨다. **본인 verifier 보강이 반영된 사양이다.**

#### 9 gates 명시

| # | Gate | 조건 | 본인 보강 |
|---|---|---|---|
| 1 | `validated` | `result.validated === true` | |
| 2 | `tesSUCCESS` | `result.meta.TransactionResult === 'tesSUCCESS'` | |
| 3 | `isPayment` | `result.TransactionType === 'Payment'` | |
| 4 | `destinationMatch` | `result.Destination === intent.destination` | |
| 5 | **`destinationTagMatch`** | `result.DestinationTag === intent.destinationTag` (지정 시) | **본인 보강 ✓** |
| 6 | `deliveredAmountExact` | `meta.delivered_amount` 정확 매칭 (XRP=string drops / IOU=3-field object) | |
| 7 | **`notPartialPayment`** | `(Flags & 0x00020000) === 0` — `tfPartialPayment` 명시 거부 | **본인 보강 ✓** |
| 8 | `memoIntentIdMatch` | Memo decode 성공 + `memo.intentId === intent.id` | |
| 9 | `txHashUnused` | `txHash` 미사용 (DB UNIQUE 제약) | |

> **Xaman "서명됨"만으로 결제를 확정하지 않는다. 원장 검증만이 ground truth.**

#### Partial Payment exploit 방어

공격자가 `Amount=1,000,000 XRP`에 `tfPartialPayment` 플래그를 켜서 `tesSUCCESS`를 받고 실제로는 1 drop만 전달하는 XRPL 고전 exploit이다. PayKit은 두 가지 답을 동시에 적용한다.

- (a) `tfPartialPayment` 플래그(0x00020000)가 켜져 있으면 무조건 거부 (Gate 7)
- (b) transaction `Amount` 신뢰 금지, `meta.delivered_amount`만 검증 (Gate 6)

#### VerifyReason enum (`packages/sdk/src/types.ts`)

본인 보강 reasons가 명시되어 있다.

```ts
export type VerifyReason =
  | "tx_not_found"
  | "tx_not_validated"
  | "tx_failed"
  | "not_payment"
  | "wrong_destination"
  | "wrong_destination_tag"          // ← 본인 보강 (Gate 5)
  | "wrong_amount"
  | "partial_payment_not_supported"
  | "partial_payment_flag"           // ← 본인 보강 (Gate 7, tfPartialPayment 명시)
  | "missing_memo"
  | "memo_decode_failed"
  | "intent_mismatch"
  | "duplicate_tx"
  | "intent_expired";
```

#### Live testnet 9/9 PASS 증빙 (2건 재현)

`pnpm example:testnet-live` 실행으로 9개 gate가 모두 통과하는 트랜잭션을 재현했다.

| # | Tx Hash | Ledger | Explorer |
|---|---|---|---|
| 1 | `2FD03A47760067AEA1CC3FCE2A5DD0E4E1CAD565DFE5354D8D608DE3ECAB637A` | 17431228 | `https://testnet.xrpl.org/transactions/2FD03A47760067AEA1CC3FCE2A5DD0E4E1CAD565DFE5354D8D608DE3ECAB637A` |
| 2 | `236D658AB83C8B83537E5F83699327DDFF00621E2FEB2BF0A95E8839222C3293` | 17431805 | `https://testnet.xrpl.org/transactions/236D658AB83C8B83537E5F83699327DDFF00621E2FEB2BF0A95E8839222C3293` |

검증 결과 (재현 가능):
```
Per-gate results:
  [✓] validated
  [✓] tesSUCCESS
  [✓] isPayment
  [✓] destinationMatch
  [✓] destinationTagMatch
  [✓] notPartialPayment
  [✓] deliveredAmountExact
  [✓] memoIntentIdMatch
  [✓] txHashUnused

Verdict: verified = true
```

Reproducible: `pnpm example:testnet-live` (전체 출력은 `docs/proofs/testnet-live-output.txt`).

### 8.5 Reconciliation Engine

결제 상태, webhook 상태, 리소스 access 상태는 분리한다.

#### paymentStatus

```
created → pending → succeeded
                  → failed
                  → expired → requires_review
```

#### webhookStatus

```
not_created → pending → delivered
                      → failed
```

#### accessStatus (merchant 측)

```
locked → unlocked
```

#### Idempotency 규칙

- 같은 intent + 같은 tx hash로 verify 여러 번 → 결과 1번만 (no-op)
- 다른 tx hash로 같은 intent 다시 verify → `already_succeeded_with_different_tx` 에러
- 같은 tx hash로 다른 intent verify → `duplicate_tx` 에러
- succeeded event는 한 번만 발사 (deterministic ID: `evt_${intentId}_succeeded`)
- webhook delivery 실패는 status에 영향 X (intent는 succeeded 유지, delivery_status 별도)
- 같은 webhook event가 두 번 와도 같은 리소스 access는 한 번만 열린다

상세: `docs/design/STATE_MACHINE.md`.

### 8.6 Signed Webhook

#### Event payload

```json
{
  "id": "evt_pi_01H_succeeded",
  "type": "payment_intent.succeeded",
  "created": "2026-05-17T14:00:00.000Z",
  "data": {
    "object": {
      "id": "pi_01H...",
      "paymentStatus": "succeeded",
      "amount": "1.25",
      "asset": "XRP",
      "orderId": "fanart_order_001",
      "resourceId": "imagepack_2026_birthday_drop",
      "resourceType": "image_pack",
      "creatorId": "creator_jieun",
      "txHash": "ABCDEF...",
      "metadata": {
        "fanUserId": "fan_demo_001",
        "displayTitle": "Birthday Fan Art Pack"
      }
    }
  }
}
```

#### Signature header

```
PayKit-Signature: t=1778550000,v1=<hex_hmac_sha256>
```

#### Merchant handling

```ts
const event = paykit.webhooks.constructEvent({
  rawBody,
  signatureHeader: request.headers.get("PayKit-Signature"),
  secret: process.env.PAYKIT_WEBHOOK_SECRET!
});

if (event.type === "payment_intent.succeeded") {
  await unlockImageAccess({
    orderId: event.data.object.orderId,
    resourceId: event.data.object.resourceId,
    fanUserId: event.data.object.metadata?.fanUserId
  });
}
```

#### 요구사항

- **HMAC-SHA256**으로 signed
- raw body 기준 검증
- timestamp skew 기본 5분 (300초)
- constant-time comparison
- malformed signature는 reject
- duplicate event ID는 ignore
- **재시도: 7회·최대 80h** (Stripe 호환 backoff)
- 멱등성 키: deterministic event ID `evt_${intentId}_${type}`
- secret rotation 지원

상세: `apps/paykit/src/services/webhook.ts`, `packages/sdk/src/webhooks.ts`.

### 8.7 SDK Surface

`packages/sdk/src/` 구조:

```
index.ts      — public exports
types.ts      — IntentStatus / WebhookEventType / VerifyReason
client.ts     — PaykitClient + paymentIntents.create/retrieve/verify
webhooks.ts   — signEvent / constructEvent (HMAC-SHA256)
```

#### Minimal demo usage

```ts
import { PaykitClient, constructEvent } from "@paykit/sdk";

const paykit = new PaykitClient({ apiKey: "...", baseUrl: "..." });

// merchant create flow
const intent = await paykit.paymentIntents.create({
  amount: "1.25",
  asset: "XRP",
  orderId: "fanart_order_001",
  resourceId: "imagepack_2026_birthday_drop",
  resourceType: "image_pack"
});
redirect(intent.checkoutUrl);

// merchant webhook handler
const event = constructEvent({ rawBody, signatureHeader, secret });
if (event.type === "payment_intent.succeeded") {
  await unlockResource(event.data.object.resourceId);
}
```

MVP에서 실제 npm publish는 선택사항이지만 데모 코드는 SDK처럼 보여야 한다.

### 8.8 Security

| 항목 | 정책 |
|---|---|
| API auth | bearer token `Authorization: Bearer PAYKIT_API_KEY` (middleware) |
| Webhook URL | `PAYKIT_WEBHOOK_URL_ALLOWLIST` 강제 (SSRF 차단) |
| 자금 custody | **하지 않는다** (시드·키 보관 X) |
| 네트워크 | testnet only (MVP, v1.0에서 mainnet readiness 검토) |
| Secret 관리 | `.env`만 (소스 코드 X, memo X) |
| Wallet 단독 신뢰 | **금지** — XRPL validated tx만이 ground truth |
| `?paid=1` 신뢰 | **금지** — query string 기반 unlock 안티패턴 |
| Mock 모드 | default (안정성 우선, live는 명시적 토글) |
| XSS / 정보 노출 | intent internal 필드 (`memoHex`, `xamanPayloadId`) 페이지 노출 X |

상세: `docs/core/ARCHITECTURE.md` §보안, `.claude/agents/paykit-security-review.md`.

> 출처: Fan Art PRD §8 + `docs/core/MVP_SPEC.md` + `docs/design/API_CONTRACT.md` + 본인 verifier 보강 (Gate 5 + Gate 7) + `packages/sdk/src/types.ts`

---

## 9. Data Model

상세 schema: `docs/design/ENTITIES.md`. 요약.

### 9.1 `payment_intents` (PayKit core)

핵심 필드: `id` (PK, `pi_${ULID}`) · `paymentStatus` · `webhookStatus` · `amountXrp` · `amountDrops` (BigInt as string) · `asset` · `destinationAddress` · `orderId` (INDEX) · `resourceId` (INDEX) · `resourceType` · `creatorId` · `mode` · `memoHex` · `webhookUrl` · `successUrl` · `cancelUrl` · `xamanPayloadId` · `xamanPayloadUrl` · `txHash` (**UNIQUE**) · `metadataJson` · `expiresAt` (INDEX) · `createdAt` · `updatedAt`.

핵심 제약:
- `txHash` UNIQUE (한 tx로 한 intent만)
- `orderId`, `resourceId`, `paymentStatus`, `webhookStatus`, `expiresAt` INDEX

### 9.2 `image_orders` (Fan Art demo merchant) / generic `merchant_orders`

Demo merchant app 쪽 모델. 필드: `id` · `fanUserId` · `resourceId` · `resourceType` · `creatorId` · `orderStatus` · `accessStatus` · `paykitIntentId` · `txHash` · `unlockedAt` · `createdAt` · `updatedAt`.

`orderStatus`: `created / checkout_created / waiting_for_payment / paid / failed / expired / requires_review`
`accessStatus`: `locked / unlocked`

Access check 기준은 `orderId + fanUserId/session`. `resourceId`만으로 전체 팬에게 이미지가 열리면 안 된다. `downloadUrl` 반환 후에도 high-res route는 같은 검증을 수행한다.

### 9.3 `webhook_events`

필드: `id` (PK, `evt_${intentId}_${type}` deterministic) · `intentId` · `type` · `payloadJson` · `deliveryStatus` (`pending/delivered/failed`) · `attempts` · `lastError` · `createdAt` · `deliveredAt`.

복합 UNIQUE: `(intentId, type)` — 같은 intent에 같은 type event 중복 X.

### 9.4 직렬화 규칙

- amount: 항상 string (number 직렬화 금지, 정밀도)
- timestamps: int milliseconds (ISO string은 API 응답 시점만)
- JSON 컬럼: stringify 후 저장
- 외부 응답에 internal 필드(`memoHex` 등) 노출 X

> 출처: Fan Art PRD §9 + `docs/design/ENTITIES.md`

---

## 10. Architecture

### 10.1 3-layer 구조

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3 — packages/sdk                                     │
│    PaykitClient · paymentIntents · webhooks.constructEvent  │
├─────────────────────────────────────────────────────────────┤
│  Layer 2 — apps/paykit (Next.js 14, port 3000)              │
│    /api/v1/payment_intents · /checkout/:id · verify-tx      │
│    Drizzle ORM + better-sqlite3 · xrpl.js · Xaman SDK       │
├─────────────────────────────────────────────────────────────┤
│  Layer 1 — apps/demo-merchant (Next.js 14, port 3001)       │
│    Fan Art Unlock UI · Premium AI Search UI · webhook recv  │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 데이터 흐름 (18 step)

```
 1. User → demo merchant (locked)
 2. Click Unlock with XRP
 3. merchant backend → POST PayKit /api/v1/payment_intents
 4. PayKit DB insert intent (status=created)
 5. PayKit → merchant: checkoutUrl
 6. merchant → User: redirect to checkout
 7. User → PayKit /checkout/:id
 8. PayKit creates Xaman payload (real or mock)
 9. checkout displays QR + status poller starts
10. User approves in Xaman → tx hash returned
11. PayKit polls Xaman payload status
12. PayKit calls XRPL.tx → verify 9 gates
13. If pass → reconcile: status pending → succeeded, store txHash
14. Dispatch signed webhook event evt_${intentId}_succeeded
15. merchant /api/paykit-webhook receives → verify HMAC → orders[orderId]=paid
16. merchant /api/premium-result (or /api/image-access) returns content
17. checkout polling sees status=succeeded → close
18. demo merchant polling sees orders[orderId]=paid → unlock UI
```

상세 mermaid 다이어그램: `docs/core/ARCHITECTURE.md` §High-level Architecture.

### 10.3 스택

| 영역 | 선택 |
|---|---|
| Monorepo | pnpm workspace + Turborepo |
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| DB | better-sqlite3 + drizzle-orm (MVP), v1.0에서 Postgres 검토 |
| XRPL | xrpl.js 4.x (WSS testnet) |
| Wallet | @xumm/sdk (Xaman) — real + mock |
| Validation | zod |
| HMAC | Node crypto (built-in) |
| Test | Vitest + Playwright smoke (선택) |
| UI | shadcn/ui + Tailwind + lucide-react |

### 10.4 환경 변수 (핵심)

```
PAYKIT_API_KEY
PAYKIT_WEBHOOK_SECRET
PAYKIT_DATABASE_URL
PAYKIT_BASE_URL
PAYKIT_WEBHOOK_URL_ALLOWLIST
PAYKIT_DEMO_MERCHANT_ID
PAYKIT_MERCHANT_XRPL_ADDRESS
XRPL_NETWORK              # testnet
XRPL_RPC_URL              # wss://s.altnet.rippletest.net:51233
XAMAN_MODE                # mock | real
XAMAN_API_KEY
XAMAN_API_SECRET
DEMO_MERCHANT_PAYKIT_API_KEY
DEMO_MERCHANT_PAYKIT_WEBHOOK_SECRET
```

전체: `apps/paykit/.env.example`.

> 출처: `docs/core/ARCHITECTURE.md` + Fan Art PRD §10

---

## 11. Roadmap

> **KFIP 공식 기준 인용**: *"현 규제 환경을 고려한 단계적 접근도 적극 환영합니다."*

PayKit은 testnet → 메인넷 RLUSD → XRPL EVM 합류 → 라이선스 사업자 제휴 순으로 단계적이고 명시적이다.

### 11.1 MVP (지금 ~ 본선 6/25)

- testnet XRP + Xaman + Hosted Checkout
- **9-gate 검증** (DestinationTag + tfPartialPayment 명시 거부 포함)
- Stripe 호환 HMAC-SHA256 signed webhook (7회·80h 재시도)
- 두 데모 머천트 앱 (Fan Art Image Unlock + AI/SaaS pay-per-call)
- design partner 머천트 0–2곳 온보딩 시도 (Bluenode internal beta 포함)
- **전자금융보조업자 포지션** (PG·VASP 라이선스 불필요)
- live testnet 9/9 PASS 2건 재현 완료

### 11.2 v1.0 (3–6개월)

- **RLUSD 메인넷 결제** (코인원 KRW 페어 활용)
- **XLS-85 Token-Enabled Escrows** — RLUSD escrow 기반 정산 보호
- Web3Auth XRPL 임베디드 지갑 옵션 (K-콘텐츠 소셜 로그인)
- 머천트 대시보드 lite
- `@paykit/sdk` v1.0 정식 출시 + DestinationTag 공식 노출
- 첫 유료 머천트 0–5곳 (목표)
- webhook retry log + multi-merchant + mainnet readiness 체크리스트

### 11.3 v2.0 (6–18개월)

- **XRPL EVM Sidechain** 합류 — Multi-Surface Payments (단일 Intent가 XRPL Mainnet XRP/RLUSD 또는 XRPL EVM Sidechain wXRP/USDC 어느 표면이든 수신)
- **x402 Facilitator Adapter** (t54.ai + self-hosted) — 보완재 포지션 정식화
- **Cross-Currency Pathfinding** — 해외 팬 USD/JPY → 한국 creator KRW 단일 트랜잭션 정산
- **XLS-47 Price Oracles** — RLUSD/KRW 환율 fixing, off-ramp 정산 안정성
- 에이전트용 budget/session 제어
- B2B 엔터프라이즈 진출

### 11.4 v2+ (장기)

- **토스·IBK 파트너 연계**로 PG 라이선스 검토 또는 면허 사업자 제휴
- **XLS-33 MPT (Multi-Purpose Tokens)** — 후원자 badge/IOU/reward token, 정산권 토큰화
- 한국 외 시장 (**일본·동남아 K-콘텐츠 팬덤 거점**)
- creator/agency/platform 자동 split settlement
- oracle-based reward distribution 실제 적용

### 11.5 단계별 매핑

| 단계 | XRPL 고유 프리미티브 | KFIP 흐름 |
|---|---|---|
| MVP | Payment + Memo + Destination Tag | (testnet 검증) |
| v1.0 | + XLS-85 Token-Enabled Escrows | RLUSD 메인넷 (코인원 KRW) |
| v2.0 | + Cross-Currency Pathfinding + XLS-47 Price Oracles | XRPL EVM Sidechain · x402 (t54.ai) |
| v2+ | + XLS-33 MPT | 토스/IBK · 일본·동남아 |

> 출처: 사업계획서 Slide 10 + Fan Art PRD §17 + KFIP "단계적 접근" 인용

---

## 12. Business Model

### 12.1 거래 수수료 0.5–1%

PayKit의 거래 수수료 narrative는 0.5–1%. 카드사 2.5–3% 대비 약 1/3, 후원 플랫폼 (MakeStar 5–10%, Patreon 5–12%) 대비 약 1/10.

| 채널 | 수수료 |
|---|---|
| 신용카드 (Stripe, 토스페이먼츠) | 2.5–3.0% |
| Patreon | 5–12% + 결제 수수료 |
| MakeStar / 크라우드펀딩 | 5–10% |
| **PayKit** | **0.5–1.0%** |

MVP에서는 이 수수료를 실제로 정산하지 않는다. 데모 UI에서는 "fee comparison / settlement preview"로만 보여준다.

### 12.2 단계별 수익화

| 단계 | 수익화 |
|---|---|
| **MVP (지금 ~ 본선)** | 무료, OSS, design partner 머천트 어트랙션 |
| **v1.0 (3–6개월)** | 첫 유료 머천트 — 거래액의 0.5%, 머천트 대시보드 부가 기능 |
| **v2.0 (6–18개월)** | API pay-per-request 상품화, RLUSD off-ramp 수수료 (코인원 연동), B2B 엔터프라이즈 (K-콘텐츠 플랫폼·AI 에이전트 마켓플레이스) |
| **v2+ (장기)** | 면허 사업자 제휴 매출 share, XLS-33 MPT 기반 정산권 거래 fee |

### 12.3 차별화 포지셔닝

| | Ripple Payments | CoinPayments / FriiPay | t54.ai x402 Facilitator | **PayKit (Veridot)** |
|---|---|---|---|---|
| 타깃 | 금융기관 | 머천트 SaaS | AI 에이전트 | **개발자·머천트** |
| 인터페이스 | API 콜 | 어드민 UI | facilitator HTTP | **SDK + Checkout + Webhook** |
| 결제 검증 | 사내 | 자체 | `/verify`+`/settle` | **9-단계 ledger 검증 (오픈)** |
| x402 | — | — | 핵심 | **머천트 측 어댑터 (v2)** |
| K-콘텐츠 fit | ✗ | ✗ | ✗ | **✓ (한국어, 모바일 퍼스트)** |
| 개발자 DX | 엔터프라이즈 | 중 | 에이전트 전용 | **5분 통합, OSS** |

**t54.ai와의 관계 — 보완재**:
- t54.ai: 네트워크 측 facilitator (`/verify`, `/settle`)
- PayKit: 머천트 측 SDK + Checkout + Webhook
- v2.0 어댑터로 양측이 자연스럽게 결합

> 출처: 사업계획서 Slide 7 + Slide 9

---

## 13. Team — Veridot

### 13.1 팀 구성 원칙

- **이름의 의미**: Veridot = Verified + Dot — "검증된 마이크로 결제 단위"
- **100% Bluenode 학회 (인하대, 2023년 결성) 멤버 구성**
- **외부 영입 0명** — 학회 내부 collective voice 유지
- **팀 내부 XRPL EVM 앱 개발 경험 보유** (Wave 1 Track 1+2)
- BUIDL Asia 2026 참여 / 컨텐츠 제작 경험

### 13.2 팀 역할

| 역할 | 담당 | 출처 |
|---|---|---|
| Product / Pitch | K-pop fan art vertical 문제 정의, 발표 narrative, "왜 QR 생성기가 아닌가?" 설명, 수수료/정산/future split 메시지 정리 | Fan Art PRD §15 |
| Frontend / Demo UX | Fan art demo page, locked/blurred image UI, high-res unlock UI, PayKit checkout page, status/event log UI | Fan Art PRD §15 |
| Backend / PayKit Core | payment intent API, DB schema, state machine, Xaman payload 생성/refresh, reconciliation service, webhook dispatch | Fan Art PRD §15 |
| XRPL / Verification | xrpl.js client, tx lookup, 9-gate verifier (validated / tesSUCCESS / amount / destination / DestinationTag / partial payment / memo / txHash unique), testnet troubleshooting | Fan Art PRD §15 + 본인 보강 |
| Docs / SDK | README quickstart, image unlock example, webhook verification helper, demo script, troubleshooting 문서 | Fan Art PRD §15 |

### 13.3 자문·외부 협력 (시도 중)

- **태평양 법률자문** — KFIP 상금 패키지 포함, 전자금융업 보조 포지션 확정
- **t54.ai / Ripple Korea** — 어댑터 합류 논의 시도
- **한국 인디 AI 빌더 + 인디 뮤지션** — design partner 후보 2곳 컨택 예정
- **Bluenode 학회 internal beta** — 0차 design partner

### 13.4 핵심 메시지 (collective voice)

> XRPL PayKit은 팬이 이미지를 결제하는 순간, 원장에서 검증된 결제 이벤트로 앱의 이미지 접근권한을 안전하게 unlock하는 developer payment layer다.

> 출처: 사업계획서 Slide 11 + Fan Art PRD §15 + 팀 README

---

## 14. Acceptance Criteria

### 14.1 기능 성공 기준

다음이 가능해야 한다.

- fan art demo page에서 locked image가 보인다
- 사용자가 `Unlock with XRP`를 누른다
- merchant backend가 payment intent를 생성한다
- PayKit checkout URL이 생성된다
- checkout page에서 Xaman QR/deep link가 보인다
- 사용자가 Xaman에서 XRP testnet payment를 승인한다
- PayKit이 XRPL transaction을 9-gate verifier로 검증한다 (`destinationTagMatch` + `notPartialPayment` 포함)
- PayKit이 intent/order/resource를 매칭한다
- PayKit이 signed webhook을 보낸다
- merchant가 webhook signature를 검증한다
- high-res image 또는 image pack이 unlock된다
- AI/SaaS pay-per-call 시나리오에서도 같은 flow로 premium API result가 unlock된다

### 14.2 데모 성공 기준

라이브 데모에서 다음 flow가 2분 안에 완료되어야 한다.

```
locked image (or locked API result)
  → checkout
  → Xaman approval
  → XRPL verification (9/9 PASS)
  → signed webhook
  → high-res image unlock (or AI result unlock)
```

데모 전 최소 3회 반복 성공해야 한다. 본선 무대(2026-06-25 Two IFC Seoul The Forum 3층)에서 testnet 라이브 1건 + mock fallback 1건 준비.

### 14.3 제품 메시지 성공 기준

심사위원이 다음을 이해하면 성공이다.

1. XRPL에는 빠른 결제 primitive가 있다 (3–5초, ~$0.0002)
2. 하지만 앱 개발자는 primitive가 아니라 payment workflow가 필요하다
3. Fan art image unlock (또는 AI search result unlock)은 이 workflow를 가장 시각적으로 보여준다
4. PayKit은 checkout, 9-gate verification, reconciliation, signed webhook을 제공한다
5. 이 core는 나중에 fan economy settlement, API pay-per-request, agent payment로 확장될 수 있다 (XLS-85 / XLS-47 / XLS-33 / Cross-Currency Pathfinding)

### 14.4 실패 기준

다음 상태면 실패다.

- 단순 QR 생성기로 보인다
- Xaman approval만 믿고 XRPL verification이 없다
- webhook 없이 success page만 보여준다
- high-res image unlock이 실제 backend state와 연결되지 않는다
- wrong amount tx가 unlock된다
- duplicate tx가 여러 image/resource를 unlock한다
- 실제 fiat 환전 / royalty settlement를 만든다고 과장한다
- 본인 verifier 보강(`destinationTagMatch`, `notPartialPayment`) 없이 8-gate에서 멈춘다
- "한국 XRPL 결제 표준화 운영체" 같은 과장 표현이 발표에 들어간다

### 14.5 Wow Moments (데모 시간 남으면)

`docs/design/UX_GUIDE.md` §6 Wow Moments — "그냥 QR이 아니라 결제 인프라"임을 강조.

1. **Wrong amount tx는 unlock되지 않는다** — `wrong_amount` 거부 캡처
2. **Duplicate tx hash 두 번째 intent unlock X** — `duplicate_tx` 거부 캡처
3. **Wrong signature webhook merchant 거부** — 401 응답 캡처
4. **`tfPartialPayment` 플래그 tx 거부** — `partial_payment_flag` 캡처 (본인 보강 게이트 시연)

> 출처: Fan Art PRD §13 + `docs/design/UX_GUIDE.md` §6 + 본인 verifier 보강

---

## 15. Risks & Mitigations

### 15.1 "XRPL 고유 기능을 초기에는 깊게 쓰지 않습니다"

**대응**: PayKit은 결제 DX 레이어다. RLUSD, Cross-Currency Payment, XLS-47 Price Oracles, XLS-85 Token-Enabled Escrows, XLS-33 MPT 활용은 v1.0+ 로드맵에서 명시적으로 추가된다. MVP는 의도적으로 좁게 잡았다 — Payment + Memo + Destination Tag + 9-단계 검증.

### 15.2 "t54.ai facilitator와 보완관계입니다"

**대응**: 우리는 머천트 측, 그들은 네트워크 측. v2.0 어댑터로 결합. 정면 충돌 없음. 자문 단계에서 Ripple Korea / t54.ai 미팅 시도.

### 15.3 "PG 라이선스 없이 운영 가능한 구조로 시작합니다"

**대응**:
- 자금이 PayKit을 거치지 않음 (user wallet → merchant 직접)
- 전자금융보조업자 포지션 (등록 의무 없음)
- VASP 신고 불필요 (자금·키 보관 안 함)
- v2+에서 토스·IBK 같은 면허 사업자 제휴 검토 (KFIP 상금 패키지 — 태평양 법률자문 활용)

### 15.4 "본선 데모는 testnet입니다"

**대응**:
- testnet 안정성 위험: multi-server failover + known-good fixture + mock fallback 준비
- live testnet 9/9 PASS 2건 재현 완료 → 데모 신뢰성 검증됨
- live/mock 여부를 데모에서 명시적으로 표시
- 데모 직전 testnet wallet과 faucet 상태 미리 확인

### 15.5 "Xaman integration이 막히는 경우"

**대응**:
- checkout page polling을 primary path로 둔다 (Xaman callback fallback only)
- mock Xaman payload mode를 준비한다 (`XAMAN_MODE=mock`)
- 데모 전 testnet wallet과 faucet 상태를 미리 확인한다

### 15.6 "이미지 unlock이 너무 단순해 보이는 경우"

**대응**:
- event log를 강하게 보여준다 (6줄 monospace, tx hash 클릭으로 testnet explorer)
- `wallet approved`, `ledger verified`, `webhook delivered`, `image unlocked`를 단계로 분리한다
- webhook signature verification을 merchant log에 표시한다
- Wow Moment (wrong amount / duplicate tx / tfPartialPayment 거부) 시연

### 15.7 "Cross-currency/royalty 이야기가 scope creep 되는 경우"

**대응**:
- 발표에서는 "roadmap"으로만 말한다 (v1.0 / v2.0 / v2+ 단계 명시)
- MVP live demo 화면에 정산 패널을 크게 넣지 않고, 필요하면 tiny roadmap copy만 보여준다
- 실제 split/oracle/token은 만들지 않는다

### 15.8 "팀 정직성"

**대응**:
- "한국 XRPL 결제 표준화 운영체" 같은 과장 표현 금지
- 정확한 자기 소개: "Bluenode 학회 멤버로 구성된 팀의 한국 XRPL 결제 도전"
- 외부 영입 0명, 학회 100% 구성을 collective voice로 유지

> 출처: 사업계획서 Slide 12 + Fan Art PRD §14

---

## 16. References

### 16.1 팀 내부 source 문서

| 문서 | 경로 |
|---|---|
| Fan Art PRD (멤버 작성, 가장 최신 narrative) | `/Users/arkstar/Projects/kfip/2026-05-13-xrpl-paykit-fanart-prd-ko-final-by-not-me.md` |
| 14-slide 사업계획서 (본인 작성) | `/Users/arkstar/Projects/kfip/KFIP2026_Veridot_PayKit_사업계획서.md` |
| MVP_SPEC | `docs/core/MVP_SPEC.md` |
| PROJECT_PITCH | `docs/core/PROJECT_PITCH.md` |
| ARCHITECTURE | `docs/core/ARCHITECTURE.md` |
| ENTITIES (DB schema) | `docs/design/ENTITIES.md` |
| STATE_MACHINE | `docs/design/STATE_MACHINE.md` |
| API_CONTRACT | `docs/design/API_CONTRACT.md` |
| UX_GUIDE | `docs/design/UX_GUIDE.md` |
| DESIGN_SYSTEM | `docs/design/DESIGN_SYSTEM.md` |

### 16.2 검증 증빙

| 증빙 | 경로 / 위치 |
|---|---|
| Live testnet 출력 (9/9 PASS 1건) | `docs/proofs/testnet-live-output.txt` |
| Live testnet 재현 명령 | `pnpm example:testnet-live` |
| Tx #1 | `2FD03A47...637A` (ledger 17431228) |
| Tx #2 | `236D658AB83C8B83537E5F83699327DDFF00621E2FEB2BF0A95E8839222C3293` (ledger 17431805) |
| Verifier 구현 | `apps/paykit/src/xrpl/verify-tx.ts` |
| VerifyReason enum (본인 보강) | `packages/sdk/src/types.ts` |

### 16.3 KFIP 평가 기준 매핑

| KFIP rubric | PayKit 응답 | 본 PRD 위치 |
|---|---|---|
| **생태계 적합성** ("현 규제 환경 단계적 접근") | 전자금융보조업자 포지션 → RLUSD 메인넷 → 면허 사업자 제휴 단계적 매핑 | §4.2 Ripple Korea 흐름 정렬 + §11 Roadmap + §15.3 |
| **블록체인 활용도** (XRPL 고유 기능 9개 중 활용) | XLS-85 Token-Enabled Escrows (v1.0) + Cross-Currency Pathfinding (v2.0) + XLS-47 Price Oracles (v2.0) + XLS-33 MPT (v2+) | §4.3 + §11.5 |
| **프로덕트 완성도** ("Build what can launch" + "Ready to build") | 9-단계 검증·상태머신·webhook 사양이 PRD v0.3에 동결됨, live testnet 9/9 PASS 2건 재현 완료, 즉시 빌드 가능 | §6 MVP Scope Lock + §8.4 9-gate + §16.2 검증 증빙 |
| **사업성** ("Real use matters") | AI/SaaS pay-per-call + K-콘텐츠 fan-pay 두 시나리오 모두 실서비스 패턴, 수수료 0.5–1% vs 2.5–3% / 5–12% / 5–10% 명시 | §5 Target Users + §7 Demo Scenarios + §12 Business Model |

### 16.4 외부 컨텍스트

- KFIP 2026 본선: 2026-06-25, Two IFC Seoul The Forum 3층, 12팀 진출
- Ripple Korea 2026 액션: 코인원 RLUSD KRW 페어 (2026-04), 교보생명 국채 RWA PoC (2026-04), 케이뱅크 한-UAE/태국 송금 PoC (2026-04), t54.ai XRPL facilitator + Ripple $5M 시드 (2026-02)
- XRPL 고유 프리미티브 reference: XLS-85 Token-Enabled Escrows v1.0, XLS-47 Price Oracles v2.0, XLS-33 MPT v2+, Cross-Currency Pathfinding v2.0

### 16.5 발표 guardrail

2분 발표에서 다음 한 문장을 중심으로만 말한다.

> **PayKit은 XRPL 결제를 payment intent, hosted checkout, ledger verification, signed webhook으로 앱의 리소스 접근권한까지 안전하게 바꾸는 개발자 결제 레이어다.**

Cross-currency, IOU, oracle, split settlement, x402, agent payment는 데모 성공 후 마지막 10초 roadmap으로만 언급한다.

마지막 한 장면 (Slide 14):

> 6/25 Two IFC Seoul The Forum 3층 무대에서 폰의 Xaman으로 결제하는 손과, 데스크탑 화면의 `① Wallet Approved → ② Ledger Verified → ③ Unlocked` 3단계가 5초 안에 자동으로 흐르고, 옆 화면의 SSE 이벤트 로그가 실시간으로 쌓이는 장면을 심사위원이 본다.

**XRPL PayKit — Stripe DX, x402-ready, made for Korea.**
**Veridot** · KFIP 2026 · 100% Bluenode 학회 구성

> 출처: 사업계획서 Slide 13 + Slide 14 + 부록 A3
