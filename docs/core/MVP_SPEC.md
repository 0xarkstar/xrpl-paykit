# MVP_SPEC — P0 8 기능 상세

> SSOT: 사용자 PRD v0.2 §5·§6·§7·§8. 이 문서는 PRD 발췌·압축.

## Scope Lock (PRD §6)

> **Single asset (XRP) + Xaman + hosted checkout + verified reconciliation + signed webhook + API/resource unlock demo**

| 항목 | MVP 결정 |
|---|---|
| 결제 자산 | XRP testnet |
| wallet | Xaman only |
| checkout | PayKit-hosted |
| source of truth | Validated XRPL transaction |
| reconciliation | destination + delivered amount + memo |
| webhook | HMAC-SHA256 signed |
| demo | API/resource unlock |
| agent scope | metadata / roadmap only |

## P0 1 — Payment Intent API (PRD §8.1)

**Endpoints**:
- `POST /api/v1/payment_intents`
- `GET /api/v1/payment_intents/:intentId`
- `POST /api/v1/payment_intents/:intentId/verify`

**Auth**: `Authorization: Bearer PAYKIT_API_KEY` (middleware)

**Request 예시**:
```json
{
  "amount": "1.25",
  "asset": "XRP",
  "orderId": "ORD-123",
  "resourceId": "premium-search-result",
  "mode": "checkout",
  "webhookUrl": "http://localhost:3001/api/paykit-webhook",
  "successUrl": "...",
  "cancelUrl": "...",
  "metadata": { "demoUserId": "demo-user-1" }
}
```

**Response 예시**:
```json
{
  "id": "pi_01H...",
  "status": "created",
  "amount": "1.25",
  "asset": "XRP",
  "orderId": "ORD-123",
  "checkoutUrl": "http://localhost:3000/checkout/pi_01H...",
  "expiresAt": "2026-05-17T14:00:00.000Z"
}
```

**Validation**:
- `amount` 양수 decimal string, XRP 6 decimals 한도
- 거부: `-1`, `1e-6`, `1,000`, `0`, `0.0000001`
- `asset: "XRP"`만
- `orderId` 필수
- `webhookUrl` allowlist 체크 (PRD §12.4)

## P0 2 — Hosted Checkout (PRD §8.2)

**URL**: `GET /checkout/:intentId`

표시:
- 제품명: XRPL PayKit
- 금액: `1.25 XRP`
- 결제 대상: public-safe label
- Xaman QR + deep link
- 상태: loading / pending / succeeded / failed / expired / requires_review

**Primary path = polling** (모바일 Xaman → localhost redirect 못 옴).

## P0 3 — Xaman Integration (PRD §8.3)

xrpl-payments + xaman-integration 스킬 참조.

txjson 형식:
```ts
{
  TransactionType: "Payment",
  Destination: merchantAddress,
  Amount: amountDrops,
  Memos: [{ Memo: {
    MemoType: stringToHex("paykit.intent"),
    MemoFormat: stringToHex("application/json"),
    MemoData: stringToHex(JSON.stringify({ intentId, orderId, resourceId })),
  } }],
}
```

memo 정책:
- 포함 OK: intentId, orderId, resourceId
- 절대 X: secret, API key, PII

## P0 4 — XRPL Verification (PRD §8.4)

9개 검증 조건:

1. transaction이 XRPL 네트워크에 존재
2. `validated: true`
3. `meta.TransactionResult === "tesSUCCESS"`
4. `TransactionType === "Payment"`
5. `Destination === merchantAddress`
6. `meta.delivered_amount === expectedDrops` (정확 일치)
7. memo decode → intentId/orderId 매칭
8. tx hash 미사용 (DB UNIQUE)
9. intent expiresAt > now

**delivered_amount 중요성**: partial payment 차단. `tx.Amount` 단독 신뢰 X.

실패 reason 코드: `tx_not_found`, `tx_not_validated`, `tx_failed`, `not_payment`, `wrong_destination`, `wrong_amount`, `partial_payment_not_supported`, `missing_memo`, `memo_decode_failed`, `intent_mismatch`, `duplicate_tx`, `intent_expired`.

## P0 5 — Reconciliation Engine (PRD §8.5)

State Machine:
```
created → pending → succeeded
                  → failed
                  → expired → requires_review (if late valid payment)
```

Idempotency:
- 같은 tx hash + 같은 intent에 verify 여러 번 → 결과 1번
- intent 한 번만 `succeeded`
- webhook event도 한 번만 (deterministic ID `evt_${intentId}_succeeded`)

## P0 6 — Signed Webhook (PRD §8.6)

Event payload:
```json
{
  "id": "evt_01H...",
  "type": "payment_intent.succeeded",
  "created": "2026-05-12T14:00:00.000Z",
  "data": { "object": {
    "id": "pi_01H...",
    "status": "succeeded",
    "amount": "1.25",
    "asset": "XRP",
    "orderId": "ORD-123",
    "resourceId": "premium-search-result",
    "txHash": "ABCDEF..."
  } }
}
```

Header: `PayKit-Signature: t=<unix>,v1=<hex_hmac>`

Verification helper:
```ts
const event = paykit.webhooks.constructEvent({
  rawBody, signatureHeader, secret,
});
```

요구사항:
- HMAC-SHA256
- Raw body 기반
- Timestamp skew 300초
- Constant-time
- Malformed reject
- Duplicate event ID 핸들

## P0 7 — Demo Merchant App (PRD §8.7)

컨셉: **Locked premium API result**.

상태 전이:
```
locked → checkout_created → waiting_for_payment → paid → unlocked
```

실패: failed / expired / requires_review

요구:
- 초기 locked UI
- "Unlock with XRP" 버튼
- merchant backend가 PayKit intent 생성
- `/api/paykit-webhook` 서명 검증
- `/api/premium-result` paid 상태 게이팅
- `?paid=1` query string 절대 신뢰 X

## P0 8 — Minimal SDK (PRD §8.8 / §15)

```ts
import { PaykitClient, constructEvent } from "@paykit/sdk";

const paykit = new PaykitClient({ apiKey: "...", baseUrl: "..." });

const intent = await paykit.paymentIntents.create({...});
await paykit.paymentIntents.retrieve(intentId);
await paykit.paymentIntents.verify(intentId, txHash);

// merchant
const event = constructEvent({rawBody, signatureHeader, secret});
```

## 데이터 모델 (PRD §11)

drizzle-sqlite 스킬 참조. `payment_intents` + `webhook_events`.

## 보안 (PRD §12)

`paykit-security-review` agent 체크리스트 참조.

## 데모 (PRD §16.2)

paykit-flow-tester agent 시나리오 A~E 참조.
