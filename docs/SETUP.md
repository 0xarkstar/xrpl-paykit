# Setup 가이드 (수동 .env 작성)

README의 PowerShell 자동 스크립트가 복잡하면 이 절차로.

## 1. 의존성

```powershell
git clone https://github.com/seongil06/xrpl_2026_test.git
cd xrpl_2026_test
npx pnpm@9 install
```

> macOS / Linux: `npx pnpm@9` 대신 `pnpm` 직접 가능 (`corepack enable && corepack prepare pnpm@9 --activate`).
>
> Windows에서 `corepack enable` 시 `EPERM` 에러: 관리자 권한 PowerShell로 실행하거나 그냥 `npx pnpm@9` 사용.

## 2. `.env` 생성

랜덤 키 두 개 생성:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 출력 1줄을 PAYKIT_API_KEY 값으로
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 출력 1줄을 PAYKIT_WEBHOOK_SECRET 값으로
```

`apps/paykit/.env` 만들고 아래 그대로 붙여넣기 (두 키만 위에서 생성한 값으로):

```env
# PayKit core
PAYKIT_DATABASE_URL=file:./paykit.db
PAYKIT_API_KEY=<위에서 생성한 64자 hex>
PAYKIT_WEBHOOK_SECRET=<위에서 생성한 64자 hex>
PAYKIT_BASE_URL=http://localhost:3000
PAYKIT_WEBHOOK_URL_ALLOWLIST=http://localhost:3001/api/paykit-webhook

# XRPL
XRPL_NETWORK=testnet
XRPL_RPC_URL=wss://s.altnet.rippletest.net:51233
PAYKIT_MERCHANT_XRPL_ADDRESS=

# Xaman (없으면 mock 자동)
XAMAN_MODE=mock
XAMAN_API_KEY=
XAMAN_API_SECRET=

# Demo merchant (같은 키 공유)
DEMO_MERCHANT_PAYKIT_API_KEY=<PAYKIT_API_KEY와 동일 값>
DEMO_MERCHANT_PAYKIT_WEBHOOK_SECRET=<PAYKIT_WEBHOOK_SECRET과 동일 값>
DEMO_MERCHANT_BASE_URL=http://localhost:3001
```

**똑같은 내용을 `apps/demo-merchant/.env`에도** 복사:

```powershell
Copy-Item apps/paykit/.env apps/demo-merchant/.env
```

> Next.js가 monorepo 루트 `.env`를 자동으로 못 읽어서 각 app 폴더에 별도로 둠.

## 3. SQLite 초기화

```powershell
npx pnpm@9 -F @paykit/paykit db:push
```

`apps/paykit/paykit.db` 파일 생성됨. **이 파일은 `.gitignore` 처리됨** — push 금지.

## 4. dev 서버 실행

```powershell
npx pnpm@9 dev
```

두 줄 보여야 함:
- `apps/paykit dev: - Local: http://localhost:3000`
- `apps/demo-merchant dev: - Local: http://localhost:3001`

브라우저에서 **http://localhost:3001** 열기.

## 5. 데모 흐름

1. demo 페이지 우측 상단: "demo-merchant · :3001 · mock mode" 배지 + 안내 박스
2. 잠긴 콘텐츠의 **"Unlock with XRP"** 클릭
3. 새 창으로 PayKit checkout (localhost:3000/checkout/pi_...) 열림
4. checkout 페이지 하단의 **"Simulate Xaman Approve"** 클릭 (mock 모드만 노출)
5. checkout 페이지의 4단계 체크리스트가 순차 ✅
6. 부모 창(localhost:3001)이 자동 polling으로 unlock 상태 전환 + premium content fade-in
7. unlock 후 노출되는 "이 데모가 방금 증명한 4가지" 박스에서 백엔드 검증 결과 확인

## 6. 새 사이클 (데모 영상 녹화 등)

데모 페이지 우측 Status 카드의 `↻` 버튼 클릭 → orders + events 메모리 초기화 → 다시 locked 상태로.

또는 `curl -X POST http://localhost:3001/api/reset` (PowerShell: `Invoke-WebRequest -Method POST http://localhost:3001/api/reset`).

## 7. 테스트 (선택)

```powershell
npx pnpm@9 -r typecheck
npx pnpm@9 -r test
```

SDK 9개 + paykit 31개 통과해야 함.

## 8. 실 Xaman 전환 (선택)

1. [https://apps.xaman.dev/](https://apps.xaman.dev/)에서 dev app 생성 → API key + Secret 발급
2. `apps/paykit/.env` 수정:
   ```env
   XAMAN_MODE=real
   XAMAN_API_KEY=<발급받은 key>
   XAMAN_API_SECRET=<발급받은 secret>
   ```
3. `PAYKIT_MERCHANT_XRPL_ADDRESS`도 실제 testnet r-주소로 채움 (faucet으로 생성)
4. dev 재시작
5. demo 페이지에서 Unlock → checkout 페이지에 실 Xaman QR/deep link → 모바일 Xaman 앱에서 결제 승인

## 9. 트러블슈팅

README의 **트러블슈팅** 섹션 참조.

## 10. 다음 단계

- [`docs/core/MVP_SPEC.md`](./core/MVP_SPEC.md) — P0 기능 8개 상세
- [`docs/core/ARCHITECTURE.md`](./core/ARCHITECTURE.md) — 시스템 흐름
- [`docs/design/API_CONTRACT.md`](./design/API_CONTRACT.md) — REST API 명세
- [`docs/design/STATE_MACHINE.md`](./design/STATE_MACHINE.md) — payment intent 상태 전이
- [`docs/design/UX_GUIDE.md`](./design/UX_GUIDE.md) — UI 원칙
