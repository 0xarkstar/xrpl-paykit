# API_CONTRACT — PayKit REST API

> PRD §8.1·§8.3·§8.4. 모든 `/api/v1/*`는 bearer auth (middleware).

## Auth

```
Authorization: Bearer PAYKIT_API_KEY
```

미설정/잘못된 경우 401 `unauthorized`.

## 1. POST /api/v1/payment_intents

merchant가 결제 의도 생성.

### Request

```json
{
  "amount": "1.25",
  "asset": "XRP",
  "orderId": "ORD-123",
  "resourceId": "premium-search-result",
  "mode": "checkout",
  "webhookUrl": "http://localhost:3001/api/paykit-webhook",
  "successUrl": "http://localhost:3001?paid=1",
  "cancelUrl": "http://localhost:3001?canceled=1",
  "metadata": {"demoUserId": "demo-user-1"}
}
```

### Validation

- `amount`: zod regex `/^[0-9]+(\.[0-9]{1,6})?$/`, positive
- `asset`: `"XRP"` only (MVP)
- `orderId`: required, non-empty
- `webhookUrl`: optional, but if provided must be in `PAYKIT_WEBHOOK_URL_ALLOWLIST` (PRD §12.4)

### Response 200

```json
{
  "id": "pi_01H...",
  "status": "created",
  "amount": "1.25",
  "asset": "XRP",
  "orderId": "ORD-123",
  "resourceId": "premium-search-result",
  "checkoutUrl": "http://localhost:3000/checkout/pi_01H...",
  "expiresAt": "2026-05-17T14:00:00.000Z"
}
```

### Errors

- 400 `validation_failed` (amount 형식 잘못 등)
- 400 `webhook_url_not_allowlisted`
- 401 `unauthorized`
- 500 `internal`

## 2. GET /api/v1/payment_intents/:intentId

intent 조회 (checkout status polling).

### Response 200

```json
{
  "id": "pi_01H...",
  "status": "succeeded",
  "amount": "1.25",
  "asset": "XRP",
  "orderId": "ORD-123",
  "resourceId": "premium-search-result",
  "txHash": "ABCDEF...",
  "expiresAt": "2026-05-17T14:00:00.000Z"
}
```

internal 필드 (memoHex, xamanPayloadId 등) 노출 X. checkout 페이지가 polling용으로 호출.

### Errors

- 404 `intent_not_found`
- 401 `unauthorized`

## 3. POST /api/v1/payment_intents/:intentId/verify

manual verify trigger (사용자 또는 callback). 일반적으론 checkout polling이 자동 호출.

### Request (optional)

```json
{
  "txHash": "ABCDEF..."   // optional, 없으면 Xaman 상태에서 조회
}
```

### Response 200 (성공)

```json
{
  "ok": true,
  "intent": {
    "id": "pi_01H...",
    "status": "succeeded",
    "txHash": "ABCDEF...",
    "explorerUrl": "https://testnet.xrpl.org/transactions/ABCDEF..."
  }
}
```

### Response 200 (실패, intent 미변경)

```json
{
  "ok": false,
  "reason": "wrong_amount",
  "detail": { "expected": "1250000", "actual": "1000000" }
}
```

### Errors

- 400 `tx_hash_required` (Xaman 상태로도 조회 불가)
- 404 `intent_not_found`
- 409 `already_succeeded_with_different_tx`
- 409 `duplicate_tx` (같은 tx로 다른 intent succeeded)
- 410 `intent_expired` (PRD §8.5 expired 상태)

## 4. POST /api/xaman/callback

Xaman fallback callback (primary는 polling).

### Behavior

- 페이로드 status 갱신만 (DB update)
- verify는 자동 트리거 X (polling이 별도)
- 200 OK 반환만

## 5. (Public) GET /checkout/:intentId

Hosted checkout page (intent ID로 접근, bearer auth 없음).

- intent 미존재 → 404 page
- intent expired → expired UI
- intent succeeded → "returning to merchant..." + window.close() 또는 successUrl redirect
- 그 외 → QR + status poller + "Simulate Approve" (mock 모드 시)

### XSS / 정보 노출

- intent의 internal 필드 (memoHex, secret, webhookUrl 등) 절대 페이지에 노출 X
- public-safe label만 (amount, orderId, resourceId, status)

## 응답 공통 헤더

- `Content-Type: application/json`
- `Cache-Control: no-store` (intent 상태 polling 시 캐시 X)

## 에러 응답 포맷

```json
{
  "error": "<code>",
  "message": "<사람 readable, optional>",
  "detail": { /* 컨텍스트, optional */ }
}
```

## Rate Limiting (V1 이후)

MVP에는 없음. V1에서 IP 또는 API key 기반 추가.

## 변경 로그 (V1+)

- v1.1: webhook retry endpoint 추가
- v1.2: DestinationTag 지원
- v2.0: issued token / multi-merchant
