<!-- Generated: 2026-05-13 KST | Source: 14-slide PRD v0.3 frozen + prd-anchor-scan.md -->
<!-- Purpose: xrpl-paykit GitHub 레포 메인 브랜치 README.md draft. KFIP 신청서 Section 4-1 링크 backing. -->
<!-- 사용법: GitHub에서 `xrpl-paykit` public 레포 신규 생성 → 본 파일을 `README.md`로 paste → 본 HTML 주석 블록은 paste 전 삭제. -->

# XRPL PayKit

> **Stripe DX, x402-ready, made for Korea.**
> XRPL 위에서 5분 안에 결제와 자동 정산을 다는 머천트 SDK.

![status](https://img.shields.io/badge/status-PRD%20v0.3%20frozen%20·%20MVP%20core%20implemented-green)
![tests](https://img.shields.io/badge/tests-9%2F9%20passing-brightgreen)
![typescript](https://img.shields.io/badge/TypeScript-strict-blue)
![license-core](https://img.shields.io/badge/core-Apache--2.0-blue)
![license-sdk](https://img.shields.io/badge/SDK-MIT-blue)
![network](https://img.shields.io/badge/network-XRPL-black)

---

## What it is

XRPL은 결제가 빠르고 싸지만, 개발자는 *결제가 끝난 뒤*를 다뤄야 합니다.
"이 사용자가 진짜 결제했나? 금액이 맞나? 어떤 주문에 대한 결제인가? 내 서버는 언제·어떻게 알 수 있나?" — 지금은 한국 개발자가 XRPL 결제를 자신의 앱에 붙이려면 트랜잭션 검증, Partial Payment 방어, 중복 처리 차단, 서명된 webhook, 상태 머신, 모바일↔데스크탑 흐름을 모두 직접 만들어야 합니다.

**XRPL PayKit은 이 결제 워크플로우 전체를 머천트 측 개발자 도구로 캡슐화합니다** — Stripe-like payment intent + Hosted Checkout + Signed Webhook for XRPL. 머천트는 SDK를 부르고 webhook을 받으면 끝, 결제 검증·재시도·멱등성·상태 머신은 SDK가 책임집니다.

---

## Team — Veridot

**100% Bluenode** — 인하대학교 블록체인 학회 Bluenode(2023년 결성, 운영 3년차)의 사업체화 1호 시도. Veridot 팀 전원이 Bluenode 학회 내부 멤버이며, 외부 영입 없이 학회에서 이미 함께 활동해온 응집력 있는 팀입니다.

- **Lead / Founder**: Bluenode 학회장 (2026년~ 현 임기, **XRPL EVM Sidechain 앱 개발 경험 직접 보유**)
- **팀 구성**: Bluenode 학회 내부 멤버 100% (외부 영입 0명)
- **운영 trace**: BUIDL Asia 2026 참여, 국내 블록체인 학회·해커톤 활동 다수
- **포지셔닝**: 한국 블록체인 학회의 사업화 1호 사례 + 한국 XRPL 결제 표준화 grass-roots 운영체

**Why this team can ship**:
- 학회장이 XRPL EVM Sidechain 앱 개발 경험 직접 보유 → v2.0 (6–18개월) XRPL EVM 합류는 실작동 코드 기반 단축 timeline
- 팀 전원이 학회에서 이미 함께 활동 → 응집력·iteration 속도 ↑
- **학회 = 팀 = 0차 design partner**: 학회 행사·굿즈·해커톤 상금 정산이 PayKit MVP의 internal beta use case. 팀-사용자 distance = 0
- Bluenode alumni network로 KFIP 졸업 후 풀타임 commitment 확보
- 한국 XRPL 커뮤니티 코어에서 출발 → XRPL Korea / Ripple Korea / t54.ai 연결 가능한 native network

---

## Key features

PayKit은 3개 빌딩블록으로 구성됩니다:

### ① Hosted Checkout
- Xaman QR + deep link + 3단계 진행 시각화(Wallet Approved → Ledger Verified → Unlocked)
- 모바일↔데스크탑 redirect 흐름 안정화 (SSE 기반 상태 sync)
- 머천트는 결제 UI를 만들지 않습니다 — `<a href="{checkout_url}">결제</a>` 한 줄

### ② Verified Reconciliation
- XRPL 원장에서 **9-단계 검증** (AND 결합, 아래 상세)
- Xaman "서명됨"만으로는 결제를 확정하지 않습니다 — 원장 검증만이 ground truth
- Partial Payment exploit · 중복 tx hash 두 함정 모두 SDK가 차단

### ③ Signed Webhook
- Stripe 호환 HMAC-SHA256 서명 — 머천트 학습 비용 0
- 재시도 **7회·최대 80h**, 멱등성 키, secret rotation
- 상태 머신: `created` · `pending` · `succeeded` · `failed` · `expired` · `requires_review`

---

## 9-단계 검증 (오픈 사양)

PayKit이 모든 결제에 대해 통과시키는 9개 게이트 (AND 결합):

1. `result.validated === true`
2. `result.meta.TransactionResult === 'tesSUCCESS'`
3. `result.TransactionType === 'Payment'`
4. `result.Destination === intent.destination`
5. `result.DestinationTag === intent.destinationTag` (지정 시)
6. `meta.delivered_amount` 정확 매칭 (XRP=string drops / IOU=3-field object)
7. `(Flags & 0x00020000) === 0` — Partial Payment 거부
8. Memo decode 성공 + `memo.intentId === intent.id`
9. `txHash` 미사용 (UNIQUE 제약)

> Xaman "서명됨"만으로 결제를 확정하지 않습니다. 원장 검증만이 ground truth.

---

## 두 가지 함정과 우리의 답

### 함정 1 — Partial Payment exploit
공격자가 `Amount=1,000,000 XRP`에 `tfPartialPayment` 플래그를 켜서 `tesSUCCESS`를 받고 실제로는 1 drop만 전달.

**우리 답:**
- (a) `tfPartialPayment` 플래그가 켜져 있으면 무조건 거부
- (b) transaction `Amount` 신뢰 금지, `meta.delivered_amount`만 검증

### 함정 2 — 중복 tx hash
같은 tx hash로 두 개 주문 unlock 시도.

**우리 답:**
- `processed_tx_hashes` 테이블에 UNIQUE 제약
- 두 번째 시도는 `requires_review`로 격리

---

## Why XRPL

1. **3–5초 결정적 finality** — 결제 unlock UX의 sine qua non. 메모리풀·reorg 없음.
2. **~$0.0002 per-tx 수수료** — API 단건 결제·마이크로 결제가 경제적으로 성립.
3. **Destination Tag + Memo native primitive** — 주문 식별·정합화를 별도 스마트컨트랙트 없이 native 필드로 처리.
4. **RLUSD 스테이블코인** — 2026-04 코인원 RLUSD KRW 페어 상장 → v1.0 메인넷 결제 직결.
5. **x402 AI 에이전트 결제** — 2026-02 t54.ai XRPL facilitator + Ripple $5M 시드 → v2.0 어댑터로 보완재.
6. **XRPL EVM Sidechain 합류 경로** — v2.0 Multi-Surface Payments로 단일 Intent가 XRPL Mainnet(XRP/RLUSD) 또는 XRPL EVM Sidechain(wXRP/USDC) 어느 표면이든 결제 수신.
7. **결정적 finality·롤백 부재** — 머천트 정산 위험 최소화.

---

## Roadmap

### MVP (지금 ~ KFIP 본선 6/25)
- testnet XRP, Xaman, Hosted Checkout, 9-단계 검증, Stripe 호환 서명 webhook
- 두 데모 머천트 앱 — AI/SaaS pay-per-call + K-콘텐츠 fan-pay
- design partner 머천트 2곳 온보딩 시도
- **전자금융보조업자 포지션 (PG·VASP 라이선스 불필요)**

### v1.0 (3–6개월)
- **RLUSD 메인넷 결제** (코인원 KRW 페어 활용)
- Web3Auth XRPL 임베디드 지갑 옵션 (K-콘텐츠 소셜 로그인)
- 머천트 대시보드
- `@paykit/sdk` v1.0 정식 출시
- 첫 유료 머천트 5곳

### v2.0 (6–18개월)
- **Multi-Surface Payments** — 단일 Intent가 XRPL Mainnet(XRP/RLUSD) 또는 XRPL EVM Sidechain(wXRP/USDC) 어느 표면이든 결제 수신
- **x402 Facilitator Adapter** (t54.ai + self-hosted)
- 에이전트용 budget/session 제어
- B2B 엔터프라이즈 진출

### v2+ (장기)
- 토스·IBK 파트너 연계로 PG 라이선스 검토 또는 면허 사업자 제휴
- 한국 외 시장 (일본·동남아 K-콘텐츠 팬덤 거점)

---

## Code structure

```
xrpl-paykit/
├── src/
│   ├── types.ts            # PaymentIntent, VerificationResult, WebhookEvent, ...
│   ├── verifier.ts         # 9-단계 ledger 검증 (9 gates, all implemented)
│   ├── checkout.ts         # Hosted Checkout — intent 생성 + URL 발급
│   ├── webhook.ts          # HMAC-SHA256 서명·검증 + 재시도(7회, ~80h) 전송
│   ├── state-machine.ts    # PaymentStatus 전이 테이블 (terminal states 보호)
│   └── index.ts            # Public API surface (re-exports)
├── tests/
│   └── verifier.test.ts    # 9 시나리오 (happy path + 6 게이트 거부 + 2 edge)
└── examples/
    └── quickstart.ts       # 5-line merchant integration demo
```

**Source LoC**: ~1,140 (src), ~150 (tests), ~150 (examples)

머천트 통합 5 라인:

```typescript
import { Checkout, InMemoryIntentStore } from '@xrpl-paykit/sdk';

const checkout = new Checkout(config, new InMemoryIntentStore());
const intent = await checkout.createIntent({ merchantOrderId, amount });
res.redirect(checkout.getCheckoutUrl(intent.id));
// → user signs in Xaman → PayKit verifies → webhook fires on succeeded
```

## Build & test

```bash
npm install
npm run typecheck       # tsc --noEmit, strict mode clean
npm test                # vitest — 9/9 passing
npm run example:quickstart   # synthesized end-to-end demo
```

Quickstart output validates the canonical attack scenario (Partial Payment exploit) is rejected:

```
[5] Partial Payment exploit attempt:
    verified = false (should be false)
    suggestedStatus = failed
    failed gates = [ 'deliveredAmountExact', 'notPartialPayment' ]
```

---

## Status

- **PRD v0.3 동결 완료** — 9-단계 검증·webhook·상태머신·HMAC-SHA256 서명·재시도 7회·멱등성 키 사양 확정
- **MVP 코어 구현 완료** — TypeScript strict mode, verifier 9 gates 모두 구현, vitest 9/9 통과, quickstart 데모 작동
- **Testnet 지갑 활성** — `rNeAi6oLaxGyH3PNijKH4N3Pp8BygKVLCN` (faucet 트랜잭션 1건)
- **다음 단계** — xrpl.js 연동 (현재 verifier는 synthesized tx로 검증 완료) + Hosted Checkout 호스팅 페이지 + 다중 머천트 통합 테스트
- **KFIP 2026 1차 제출** — 2026-05-13
- **본선 무대** — 6/25 Two IFC Seoul The Forum 3층 (예정)

---

## License

- **Core**: Apache-2.0
- **SDK**: MIT

`Apache-2.0 코어 + MIT SDK` — 머천트가 SDK를 자기 앱에 종속시킬 때 라이선스 마찰 없도록 SDK는 MIT, 코어 인프라는 Apache-2.0.

---

## Contact

- Email: `[CONTACT-EMAIL]`
- Telegram: `[CONTACT-TG]`

**Veridot** — *Verified + Dot, 검증된 마이크로 결제 단위.*
