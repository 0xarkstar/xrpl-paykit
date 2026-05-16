# STATE_MACHINE — Payment Intent 전이

> PRD §8.5. 코드: `apps/paykit/src/domain/payment-intent-state.ts`.

## 상태

| 상태 | 의미 |
|---|---|
| `created` | intent 생성, checkout/Xaman 미시작 |
| `pending` | 사용자가 결제 진행 중 (Xaman payload 발급 후) |
| `succeeded` | 검증·매칭 끝난 정상 결제 |
| `failed` | 사용자 reject 또는 복구 불가능 실패 |
| `expired` | 제한 시간 내 결제 미확인 |
| `requires_review` | 수상/늦은/mismatch — 사람 확인 필요 |

## 전이 다이어그램

```
   ┌─────────┐
   │ created │
   └────┬────┘
        │ checkout 열림 + Xaman payload 발급
        ▼
   ┌─────────┐
   │ pending │
   └────┬────┘
        │
   ┌────┴────────────────────────────────────┐
   │ verify 9 조건 통과     verify 실패       │ 시간 초과 │
   ▼                       ▼                  ▼          │
┌──────────┐            ┌────────┐         ┌─────────┐  │
│succeeded │            │ failed │         │ expired │  │
└──────────┘            └────────┘         └────┬────┘  │
                                                │ late valid payment
                                                ▼
                                          ┌───────────────┐
                                          │requires_review│
                                          └───────────────┘
```

## 전이 규칙

| from | to | 트리거 | 가드 |
|---|---|---|---|
| created | pending | checkout 페이지 첫 진입 + Xaman payload 발급 | xamanPayloadId 저장 |
| pending | succeeded | verify-xrpl 9 조건 통과 | tx hash UNIQUE 가드 통과 |
| pending | failed | Xaman reject 또는 복구 불가능 verify 실패 | reason 기록 |
| pending | expired | expiresAt < now (cron 또는 lazy) | |
| expired | requires_review | 만료 후 들어온 valid-looking 결제 | 자동 succeeded 금지 |
| succeeded | (terminal) | — | |
| failed | (terminal) | — | |
| requires_review | succeeded | 사람 승인 (admin only) | 별도 admin 라우트, MVP scope 밖 |

## Idempotency 규칙

- 같은 intent + 같은 tx hash로 verify 여러 번 → 결과 1번만 (no-op)
- 다른 tx hash로 같은 intent 다시 verify → `already_succeeded_with_different_tx` 에러
- 같은 tx hash로 다른 intent verify → `duplicate_tx` 에러
- succeeded event는 한 번만 발사 (deterministic ID: `evt_${intentId}_succeeded`)
- webhook delivery 실패는 status에 영향 X (intent는 succeeded 유지, delivery_status 별도)

## 코드 패턴

```ts
// apps/paykit/src/domain/payment-intent-state.ts

export type IntentStatus = "created" | "pending" | "succeeded" | "failed" | "expired" | "requires_review";

const VALID_TRANSITIONS: Record<IntentStatus, IntentStatus[]> = {
  created: ["pending", "expired"],
  pending: ["succeeded", "failed", "expired"],
  succeeded: [],
  failed: [],
  expired: ["requires_review"],
  requires_review: ["succeeded"],  // admin override only
};

export function canTransition(from: IntentStatus, to: IntentStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: IntentStatus, to: IntentStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`invalid_transition: ${from} -> ${to}`);
  }
}
```

DB update 시 항상 `assertTransition` 통해서. 직접 update 금지 (룰 05).

## 실패 reason 코드 (PRD §8.4 + §8.6)

verify 실패 시:
- `tx_not_found`, `tx_not_validated`, `tx_failed`
- `not_payment`, `wrong_destination`, `wrong_amount`
- `partial_payment_not_supported`, `missing_memo`, `memo_decode_failed`
- `intent_mismatch`, `duplicate_tx`, `intent_expired`

webhook 실패:
- `signature_mismatch`, `timestamp_skew`, `malformed_header`, `missing_header`
- `network_error`, `merchant_4xx`, `merchant_5xx`

## 데모 시각화 (UI)

checkout 페이지 status step:
```
✅ Wallet approved
✅ Ledger verified
✅ Webhook delivered
✅ Resource unlocked
```

각 단계가 상태 전이에 1:1 매핑.
