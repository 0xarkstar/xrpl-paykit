# Security Policy

> XRPL PayKit은 결제 인프라입니다. 보안은 spec 1순위이며, MVP 단계부터 우회 가능한 사양은 거부합니다.

## Supported network

| Network | 상태 |
|---|---|
| **XRPL Testnet** | ✅ 지원 (현 MVP) |
| **XRPL Mainnet** | ❌ v1.0 단계 (3–6개월) 이후 진입 |
| **XRPL EVM Sidechain** | ❌ v2.0 단계 (6–18개월) 이후 진입 |

코드/문서/리포지토리 어디에도 **mainnet 키·시드·주소·실 자금**이 등장하지 않습니다. 모든 결제는 testnet faucet에서 발급된 지갑으로 시연합니다.

## 9-단계 ledger 검증 (PRD §8.4 + verify-tx)

PayKit은 Xaman의 "서명됨" 응답만으로 결제를 확정하지 않습니다. 모든 결제는 XRPL 원장에서 다음 9개 게이트를 AND-결합으로 통과해야 합니다:

1. `result.validated === true`
2. `result.meta.TransactionResult === 'tesSUCCESS'`
3. `result.TransactionType === 'Payment'`
4. `result.Destination === intent.destination`
5. `result.DestinationTag === intent.destinationTag` (intent에 설정된 경우만, vacuously passes otherwise)
6. `meta.delivered_amount` 정확 매칭 (XRP=string drops / IOU=3-field)
7. `(Flags & 0x00020000) === 0` — **tfPartialPayment 플래그 명시 거부 (Partial Payment exploit 방어)**
8. Memo decode 성공 + `memo.intentId === intent.id`
9. `txHash` 미사용 (DB UNIQUE 제약, race-safe lookup)

→ Xaman의 wallet callback 단독 신뢰 금지. 검증된 ledger tx만 ground truth.

## 머천트 측 다층 방어

| 보안 사양 | 위치 |
|---|---|
| **Bearer auth** | `/api/v1/*` middleware (apps/paykit) |
| **WEBHOOK_URL_ALLOWLIST** | `PAYKIT_WEBHOOK_URL_ALLOWLIST` 환경변수 — SSRF 차단 |
| **HMAC-SHA256 raw-body signing** | webhook 발사 — `XPK-Signature: t=<ts>,v1=<hex>` |
| **Constant-time signature verify** | `@paykit/sdk`의 `webhooks.constructEvent` — timing attack 방어 |
| **Timestamp tolerance** | 5분 default — replay 방어 |
| **Idempotency key** | `Idempotency-Key` header — 동일 event 중복 처리 방지 |
| **Retry budget** | 7회·최대 80h 재시도 — Stripe 호환 backoff |
| **Custody-free design** | 자금이 PayKit을 경유하지 않음 (user wallet → merchant 직접) — VASP 신고·PG 라이선스 불필요 (전자금융보조업자 포지션) |

## 환경변수 / 비밀정보

| 변수 | 보안 등급 | 비고 |
|---|---|---|
| `PAYKIT_API_KEY` | High | Bearer auth용. `.env`에만, 코드/로그/문서 평문 X |
| `PAYKIT_WEBHOOK_SECRET` | High | HMAC 서명 키. Rotation 권장 |
| `XAMAN_API_KEY` / `XAMAN_API_SECRET` | High | real 모드에서만. mock 모드 default 운영 |
| `PAYKIT_MERCHANT_XRPL_ADDRESS` | Low | testnet 주소. zod regex `^r[1-9A-HJ-NP-Za-km-z]{25,34}$` 검증 |

`.env`는 모두 `.gitignore`. `.env.example`만 commit.

## 공격 시나리오와 우리의 답 (Appendix A2 참고)

### 함정 1 — Partial Payment exploit
공격자가 `Amount=1,000,000 XRP`에 `tfPartialPayment` 플래그를 켜서 `tesSUCCESS`를 받고 실제로는 1 drop만 전달.

**답**:
- (a) Gate 7: `tfPartialPayment` 플래그(`0x00020000`)가 켜져 있으면 무조건 거부
- (b) Gate 6: `tx.Amount` 신뢰 금지, `meta.delivered_amount`만 검증

→ verifier 보강(2026-05-17): `TF_PARTIAL_PAYMENT` 상수 export + `Flags & 0x00020000 !== 0` 직접 검사 추가

### 함정 2 — 중복 tx hash로 두 주문 unlock 시도
공격자가 한 결제 tx로 두 다른 intent를 unlock 시도.

**답**:
- (a) Gate 9: `processed_tx_hashes` 테이블에 UNIQUE 제약 + race-safe lookup
- (b) 두 번째 시도는 `requires_review`로 격리 (operator 수동 처리)

## 보안 vulnerability 보고

보안 취약점을 발견하시면 **비공개**로 다음 경로로 제보 부탁드립니다:

- GitHub **private** Security Advisory (권장): https://github.com/0xarkstar/xrpl-paykit/security/advisories/new
- 또는 maintainer 이메일 (README Contact 참고)

다음을 포함해주세요:
- 취약점 유형 (verifier bypass / webhook forge / replay / DoS 등)
- 재현 단계 (코드 또는 curl 예시)
- 영향 범위 (testnet only / mainnet path / both)
- (선택) 제안 패치

7일 내 1차 응답을 목표로 합니다.

## Out of scope

다음은 본 MVP 보안 모델 범위 밖입니다 (PRD §6 참고):
- 실제 USD/JPY/KRW fiat 환전 보안
- production mainnet 운영 (custody, multisig, cold wallet)
- KYC/AML 처리 (전자금융보조업자 포지션으로 v2+ 라이선스 사업자 제휴 단계에서 검토)
- chargeback / dispute 처리
- DDoS 방어 (인프라 레이어, deploy 시점에 별도 구성)

## License

본 보안 정책은 `Apache-2.0` (core) + `MIT` (SDK) 라이선스 적용 검토 중. 외부 contributor는 본 정책에 동의한 것으로 간주됩니다.
