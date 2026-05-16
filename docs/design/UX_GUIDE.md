# UX_GUIDE — PayKit UI/UX 원칙

> PRD §9. Modern SaaS / Stripe-like 톤 (ui-design 스킬).

## 1. PayKit Checkout Page UX

기술적으로 정확할 뿐 아니라 데모에서 이해하기 쉬워야.

### 필수 문구

- "Pay with XRP via Xaman"
- "Waiting for wallet approval…"
- "Payment submitted. Verifying on XRPL…"
- "Payment verified. Returning to merchant…"
- "Payment expired. Please create a new checkout."
- "Payment requires manual review."

### 진행 단계 분리 (PRD §9.1)

결제는 최소 3단계:
1. wallet approval
2. transaction submission
3. ledger validation/reconciliation

사용자·심사위원에게 차이를 보여주면 제품 깊이가 전달됨.

```
Wallet approved ✅
Ledger verified ✅
Webhook delivered ✅
Resource unlocked ✅
```

각 단계 status icon: ◯ todo / ⏳ active / ✅ done / ⨯ failed.

### Mobile QR

- QR 크기: 256x256px 이상
- QR 옆 deep link (`xumm://...`) 클릭 가능
- Xaman 앱이 폰에 있으면 deep link 더 빠름

### Status Polling Cadence

- 2초 간격
- 상태가 terminal (succeeded/failed/expired)이면 polling 중단
- max 5분 후 자동 expired 처리 (서버 측 cron 또는 lazy expire)

## 2. Demo Merchant UX (PRD §9.2)

제품 메시지를 가장 잘 보여주는 페이지. 심사위원이 가장 먼저 봄.

### 추천 레이아웃

```
┌────────────────────────────────────────────────┐
│  Logo                          Docs · Demo     │
├────────────────────────┬───────────────────────┤
│  Premium AI Search     │ Payment Status         │
│                        │                        │
│  ┌──────────────────┐  │ ◯ Created              │
│  │ blurred content  │  │ ◯ Pending              │
│  │                  │  │ ◯ Verified             │
│  │  🔒 Locked       │  │ ◯ Webhook              │
│  │ [Unlock with XRP]│  │ ◯ Unlocked             │
│  └──────────────────┘  │                        │
├────────────────────────┴───────────────────────┤
│  Event Log (monospace):                        │
│  [1] payment_intent.created · pi_...           │
│  [2] checkout.opened                           │
│  [3] xaman.payload.signed                      │
│  [4] xrpl.tx.validated · ABCD... (explorer →)  │
│  [5] webhook.received · evt_...                │
│  [6] resource.unlocked                         │
└────────────────────────────────────────────────┘
```

### Event Log

데모에서 가장 중요. 심사위원이 내부 flow를 즉시 이해.

- monospace 폰트 (JetBrains Mono)
- 색상 배지 (success=green / failed=red / pending=blue)
- 타임스탬프 (HH:MM:SS)
- tx hash 클릭 시 testnet explorer 새 창

### Premium Resource

MVP default: **Premium AI Search Result** (mock).
- locked 시 blurred placeholder ("Top result · ChatGPT 분석 · 70억 토큰 기반 ...") + 🔒 + Unlock 버튼
- unlocked 시 가짜 AI 응답 (인용 출처 5개 + 요약 3문단) fade-in

## 3. 상태 전이 UI 패턴

### locked → unlocked

```tsx
// Locked
<div className="relative">
  <div className="filter blur-md select-none pointer-events-none">
    {premiumContent}
  </div>
  <div className="absolute inset-0 flex items-center justify-center">
    <Card>
      <Lock />
      <h3>Premium AI Search Result</h3>
      <p className="text-sm text-muted-foreground">1.25 XRP로 잠금 해제</p>
      <Button onClick={onUnlock}>Unlock with XRP</Button>
    </Card>
  </div>
</div>

// Unlocked
<div className="animate-in fade-in duration-500">
  {premiumContent}
</div>
```

### checkout 상태 전이

```tsx
<StatusStep label="Wallet approved" state={derive(status, "approve")} />
<StatusStep label="Ledger verified" state={derive(status, "verify")} />
<StatusStep label="Webhook delivered" state={derive(status, "webhook")} />
<StatusStep label="Resource unlocked" state={derive(status, "unlock")} />
```

`state`: `"todo"` (회색 ◯) / `"active"` (파랑 ⏳ + 펄스) / `"done"` (초록 ✅) / `"failed"` (빨강 ⨯).

## 4. 색상 톤 (Modern SaaS)

- Primary: indigo-600 (#4F46E5)
- Background: 화이트 default, dark slate-950 토글
- Success: green-600
- Warning: amber-500
- Error: red-600
- Muted: slate-400~600

## 5. 폰트

- 헤드라인: Inter 600/700
- 본문: Inter 400/500
- 코드/이벤트로그/QR 라벨: JetBrains Mono 400/500

## 6. Wow Moments (PRD §16.3)

데모 시간 남으면 보여줘서 "그냥 QR이 아니라 결제 인프라"임을 강조:

1. **Wrong amount tx는 unlock되지 않는다** — `wrong_amount` 거부 캡처
2. **Duplicate tx hash 두 번째 intent unlock X** — `duplicate_tx` 거부 캡처
3. **Wrong signature webhook merchant 거부** — 401 응답 캡처

## 7. 안티 패턴 (절대 X)

- `?paid=1` query string 신뢰 → 실제 webhook 도착 없이 unlock
- 모바일에서 localhost redirect 의존 → 모바일은 못 옴
- intent 내부 필드 (memoHex 등) 페이지 노출
- 결제 후 "잠시만요..." 무한 로딩 (timeout + 명확한 reject 메시지 필수)
- 폼/카드만 잔뜩 (Stripe-like 톤 = 여백 + 한 가지 액션 강조)
