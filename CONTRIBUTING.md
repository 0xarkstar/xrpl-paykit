# Contributing to XRPL PayKit

## 개발 환경

[`docs/SETUP.md`](./docs/SETUP.md) 참조.

## Workflow

### 1. Branch 전략

- `main` 직접 push 금지 (팀 협업 시)
- 새 기능: `feat/<짧은-설명>` 브랜치
- 버그 픽스: `fix/<짧은-설명>`
- 문서: `docs/<짧은-설명>`
- 작업 후 PR 생성

### 2. 코드 작성

전제: PRD (외부 자료) §X.X 기반. PRD에 없는 기능은 **issue 먼저** 만들어서 의도 공유.

작성 시:
- TypeScript strict 통과
- 새 함수에 한 줄 docstring (한국어 가능, "왜" 위주)
- 검증 로직은 항상 [`docs/core/MVP_SPEC.md`](./docs/core/MVP_SPEC.md) §검증 9개 조건 인용
- webhook은 **raw body 기반**으로 (parsed JSON 재stringify 금지)
- secret은 `.env`만 (코드 평문 X)

### 3. 테스트

PR 전에 통과시켜야 머지 가능:

```powershell
npx pnpm@9 -r typecheck
npx pnpm@9 -r test
```

새 기능에는 단위 테스트 1개 이상 권장.

### 4. 커밋 메시지

**Conventional Commits + 한국어**:

```
feat(scope): 한 줄 요약 — 이유

본문 (선택, 한국어 가능)
PRD §X.X 또는 issue #N 참조
```

prefix:
- `feat`: 새 기능
- `fix`: 버그 픽스
- `refactor`: 구조 변경 (행동 변화 X)
- `docs`: 문서
- `test`: 테스트만
- `chore`: 의존성 / 환경

scope (예):
- `sdk`: `packages/sdk/`
- `paykit/api`: `apps/paykit/app/api/`
- `paykit/services`: `apps/paykit/src/services/`
- `paykit/checkout`: `apps/paykit/app/checkout/`
- `paykit/xrpl`: `apps/paykit/src/xrpl/`
- `paykit/xaman`: `apps/paykit/src/xaman/`
- `paykit/db`: `apps/paykit/src/db/`
- `demo`: `apps/demo-merchant/`
- `docs`: `docs/`
- `infra`: `.gitignore`, `package.json` 루트, `tsconfig.base.json`

### 5. PR 작성

PR description에 반드시:
- 무엇을 바꿨는지 (1~3줄)
- PRD §X.X 또는 issue #N 인용
- 테스트 결과 (terminal 출력 또는 screenshot)
- 데모 영향 (UI 바뀌면 캡처)
- 안전 영향 (webhook · auth · env 바뀌면 명시)

## 5. 보안 / Secrets

**절대 금지**:
- `.env`, `*.db`, `*.pem`, `*.key`, 시드 phrase, API key를 PR/커밋에 포함
- 코드에 secret 하드코딩 (env 우회)
- production XRPL mainnet 키/주소 (testnet only)

발견 시 즉시:
1. 키 회전 (rotate)
2. 히스토리 정리 (`git filter-repo` 또는 reset+재커밋)
3. 운영자에게 보고

## 6. 보호 경로 (push 금지)

다음은 `.gitignore`에 명시되어 있어 push 시도해도 무시됨. 변경 필요 시 운영자 결정:

- `CLAUDE.md` (사용자 라우터)
- `.claude/` (Claude harness 메타)
- `docs/research/` (사용자 학습자료)
- `.env`, `.env.*` (단 `.env.example` 제외)
- `*.db`, `*.sqlite*`, `*.pem`, `*.key`, `.mcp.json`

## 7. 코드 스타일

- TypeScript strict, `noUncheckedIndexedAccess`
- 변수/함수: `camelCase`
- 컴포넌트/타입: `PascalCase`
- 상수: `UPPER_SNAKE`
- 컴포넌트 파일: `PascalCase.tsx`, 그 외 `camelCase.ts`
- 한국어 주석 OK, 식별자는 영어
- WHY에 집중, WHAT은 코드/이름이 알려줌

## 8. 에러 처리

- **시스템 경계**(외부 API · 사용자 입력 · 파일 IO)에서만 try/catch · 검증
- 내부 코드는 신뢰. 일어날 수 없는 분기에 fallback 추가 금지
- 사용자에 노출되는 에러 메시지는 한국어, 친절히
- 내부 로그는 영어 스택트레이스 그대로

## 9. 질문 / 이슈

- GitHub Issue로 의도 / 버그 / 제안 공유
- 보안 이슈는 비공개 채널로 운영자 연락

## 10. KFIP 2026 컨텍스트

이 프로젝트는 [KFIP 2026](https://program.xrplkorea.org/) 1차 서류 제출용으로 작성됨 (마감 2026-05-17 23:59 KST). 본선 진출 후 V1 → V2 계획은 [`docs/core/PROJECT_PITCH.md`](./docs/core/PROJECT_PITCH.md) §로드맵.
