# PROJECT_PITCH — 내부 풀 버전

> 외부 1페이지 피치: `../../../submission/pitch.md`
> SSOT: 사용자 PRD v0.2

## 한 줄

**XRPL payments를 위한 Stripe-like payment intent + checkout + signed webhook DX.**

## 문제 (사업성 축)

XRPL은 결제 primitive가 강한 체인. 하지만 앱 개발자가 실제 서비스를 만들려면 primitive만으론 부족 (PRD §2.1).

매번 풀어야 하는 9가지:
1. 사용자가 실제 결제했는가?
2. 결제 금액이 정확한가?
3. 올바른 merchant 주소인가?
4. ledger에서 validated인가?
5. Xaman 승인 vs ledger 성공 구분?
6. memo decode·매칭?
7. tx hash 중복 방지?
8. webhook 언제·어떻게?
9. 중복 webhook 처리?

단순 QR 생성기는 결제의 시작일 뿐, **결제 이후 backend state change**가 진짜 문제 (PRD §2.2).

## 솔루션 (프로덕트 완성도 축)

PayKit이 해결: **payment intent → checkout → Xaman → XRPL verify → reconcile → signed webhook → resource unlock** 한 흐름.

개발자 DX (PRD §15):
```ts
const intent = await paykit.paymentIntents.create({...});
redirect(intent.checkoutUrl);

// merchant backend
const event = paykit.webhooks.constructEvent({...});
if (event.type === "payment_intent.succeeded") {
  await unlockResource(event.data.object.resourceId);
}
```

## Why XRPL (기술 축)

| # | 기능 | MVP/V2 |
|---|---|---|
| 1 | Native Payment + 저수수료 + 3~5초 finality | MVP |
| 2 | `meta.delivered_amount` + memo + tx hash 메타데이터 protocol 레벨 노출 | MVP |
| 3 | Native Cross-Currency Payment (한 트랜잭션 환전+송금) | V2 |
| 4 | Native Issued Currency / Trustline / Oracle | V2 |

**다른 L1 위에선 같은 안전성을 만들려면 인덱서·ABI·이벤트 파싱 모듈을 따로 만들어야 함.** XRPL은 protocol 레벨에서 결제 검증 메타데이터 노출.

## MVP Scope (PRD §5.1·§6)

Single asset (XRP testnet) + Xaman + hosted checkout + verified reconciliation + signed webhook + API/resource unlock demo + minimal SDK.

**안 만드는 것** (PRD §5.2): 새 wallet · refund · subscription · tax · fiat ramp · mainnet · multi-chain · 실제 agent runtime · payment channel.

## 핵심 전략 (PRD §3.3)

**Checkout first, agent-ready later.** MVP는 인간 결제 코어 완성. V2에서 API pay-per-request · x402 · agent-readable metadata.

## 데모 시나리오 (PRD §16.2)

```
locked premium → Unlock → checkout (Xaman QR) → 결제 승인 (또는 simulate)
→ XRPL verify (9 조건) → signed webhook → merchant unlock + event log 6줄
```

## 로드맵 (PRD §18)

| 단계 | 일정 | 핵심 |
|---|---|---|
| MVP | ~5/17 | testnet · Xaman · hosted checkout · verify · webhook · demo |
| V1 | 5/27~6/24 (본선) | SDK 정식 · webhook retry · DestinationTag · multi-merchant · mainnet readiness |
| V2 | Final 이후 | RLUSD · API pay-per-request · x402 · agent-readable · merchant dashboard |

## 팀 (PRD §14)

- Product / Pitch
- Frontend / Demo UX
- Backend / PayKit Core
- XRPL / Verification
- Docs / SDK

## 평가 3축 정렬

| 평가축 | PayKit 매핑 |
|---|---|
| 사업성 | 결제 DX 부재 = 명확한 페인포인트 / 개발자 타깃 / GTM (README + SDK) |
| 기술 | XRPL Native primitive 활용 (다른 L1 대비 차별점) |
| 프로덕트 완성도 | apps/paykit + apps/demo-merchant + packages/sdk + 9개 검증 + e2e |
