# ENTITIES — 데이터 모델

> PRD §11. Drizzle 스키마는 `apps/paykit/src/db/schema.ts`에 구현.

## payment_intents

| 필드 | 타입 | 제약 | 비고 |
|---|---|---|---|
| id | text | PK | `pi_${ULID}` |
| status | text | NOT NULL, default `created` | enum: created, pending, succeeded, failed, expired, requires_review |
| amountXrp | text | NOT NULL | `"1.25"` (사람 readable) |
| amountDrops | text | NOT NULL | `"1250000"` (BigInt as string, 정확) |
| asset | text | NOT NULL, default `XRP` | MVP: XRP only |
| destinationAddress | text | NOT NULL | merchant r-address |
| orderId | text | NOT NULL, INDEX | merchant 측 식별자 |
| resourceId | text | NULL | unlock 대상 |
| mode | text | NOT NULL, default `checkout` | MVP: checkout |
| memoHex | text | NULL | Xaman txn에 들어가는 memo hex |
| webhookUrl | text | NULL | merchant backend webhook (allowlist) |
| successUrl | text | NULL | checkout 성공 후 redirect |
| cancelUrl | text | NULL | checkout 취소 후 redirect |
| xamanPayloadId | text | NULL | Xaman payload UUID |
| xamanPayloadUrl | text | NULL | Xaman QR/deep link URL |
| txHash | text | NULL, **UNIQUE** | XRPL tx hash (한 tx로 한 intent만) |
| metadataJson | text | NULL | merchant 자유 metadata |
| expiresAt | int (ts_ms) | NOT NULL, INDEX | 결제 마감 |
| createdAt | int (ts_ms) | NOT NULL | |
| updatedAt | int (ts_ms) | NOT NULL | |

## webhook_events

| 필드 | 타입 | 제약 | 비고 |
|---|---|---|---|
| id | text | PK | `evt_${intentId}_${type}` (deterministic) |
| intentId | text | NOT NULL | FK 관계 (코드 레벨) |
| type | text | NOT NULL | `payment_intent.succeeded` 등 |
| payloadJson | text | NOT NULL | event body (전송된 raw JSON) |
| deliveryStatus | text | NOT NULL, default `pending` | pending, delivered, failed |
| attempts | int | NOT NULL, default 0 | retry count |
| lastError | text | NULL | 최근 실패 사유 |
| createdAt | int (ts_ms) | NOT NULL | |
| deliveredAt | int (ts_ms) | NULL | 성공 시각 |

복합 UNIQUE: `(intentId, type)` — 같은 intent에 같은 type event 중복 X.

## 인덱스 요약

- `payment_intents`:
  - PK: `id`
  - UNIQUE: `txHash`
  - INDEX: `orderId`, `status`, `expiresAt`
- `webhook_events`:
  - PK: `id`
  - UNIQUE: `(intentId, type)`

## 마이그레이션

```powershell
pnpm -F @paykit/paykit drizzle-kit generate
# 출력: apps/paykit/src/db/migrations/0000_init.sql

pnpm -F @paykit/paykit db:push
# SQLite에 적용 (개발용)
```

## ID 생성

ULID 또는 nanoid:
```ts
import { ulid } from "ulid";
const intentId = `pi_${ulid()}`;
```

## 직렬화 규칙

- amount: 항상 string. number 직렬화 금지 (정밀도).
- timestamps: int milliseconds. ISO string 변환은 API 응답 시점만.
- JSON 컬럼 (metadataJson, payloadJson): stringify 후 저장.
- 외부 응답 (`GET /api/v1/payment_intents/:id`)에는 internal 컬럼 (memoHex 등) 노출 X.
