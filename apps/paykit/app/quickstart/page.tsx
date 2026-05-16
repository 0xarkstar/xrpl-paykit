import Link from "next/link";
import { Terminal, ArrowRight, ExternalLink, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Quickstart — XRPL PayKit",
  description: "5분 만에 PayKit SDK로 XRP 결제 받기.",
};

interface Step {
  n: number;
  title: string;
  detail: string;
  code?: string;
  language?: string;
  hint?: string;
}

const STEPS: Step[] = [
  {
    n: 1,
    title: "Clone & install",
    detail: "monorepo (sdk + paykit core + demo-merchant) 한 번에 설치. better-sqlite3 native build 포함 3~7분.",
    code: `git clone https://github.com/seongil06/xrpl_2026_test.git
cd xrpl_2026_test
npx pnpm@9 install`,
    language: "bash",
    hint: "Windows에서 pnpm 못 찾으면 'npx pnpm@9' 그대로 쓰면 됨. 따로 install 안 해도 OK.",
  },
  {
    n: 2,
    title: "Random secret 두 개 생성",
    detail: "PAYKIT_API_KEY (bearer auth) + PAYKIT_WEBHOOK_SECRET (HMAC). 코드/문서/Github에 절대 X.",
    code: `# 두 줄 각각 실행, 출력값을 .env에 붙여넣기
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    language: "bash",
  },
  {
    n: 3,
    title: ".env 두 app에 복사",
    detail: "Next.js가 monorepo 루트 .env를 자동으로 못 읽어서 각 app 폴더에 별도 필요.",
    code: `# apps/paykit/.env 와 apps/demo-merchant/.env 둘 다 동일 내용
PAYKIT_API_KEY=<위에서 생성한 첫 번째 hex>
PAYKIT_WEBHOOK_SECRET=<두 번째 hex>
PAYKIT_DATABASE_URL=file:./paykit.db
PAYKIT_BASE_URL=http://localhost:3000
PAYKIT_WEBHOOK_URL_ALLOWLIST=http://localhost:3001/api/paykit-webhook
XRPL_NETWORK=testnet
XRPL_RPC_URL=wss://s.altnet.rippletest.net:51233
XAMAN_MODE=mock
DEMO_MERCHANT_PAYKIT_API_KEY=<PAYKIT_API_KEY와 동일>
DEMO_MERCHANT_PAYKIT_WEBHOOK_SECRET=<PAYKIT_WEBHOOK_SECRET과 동일>
DEMO_MERCHANT_BASE_URL=http://localhost:3001`,
    language: "env",
    hint: "전체 키 목록은 .env.example 참조. 비어있는 XAMAN_API_KEY 등은 그대로 두면 mock 자동.",
  },
  {
    n: 4,
    title: "SQLite 초기화",
    detail: "Drizzle schema 적용. apps/paykit/paykit.db 파일 생성됨 (.gitignore 처리됨).",
    code: `npx pnpm@9 -F @paykit/paykit db:push`,
    language: "bash",
  },
  {
    n: 5,
    title: "Dev 서버 실행 + 데모 확인",
    detail: "두 포트 동시 — :3000 PayKit core, :3001 demo merchant. 첫 컴파일 8~10초 소요.",
    code: `npx pnpm@9 dev
# 브라우저 → http://localhost:3001
# Unlock 클릭 → checkout 새 창 → Simulate Approve → 자동 unlock`,
    language: "bash",
    hint: "이제 60초 데모 시나리오가 통과. 백엔드에서는 9개 XRPL 검증 + HMAC webhook + idempotent reconcile이 자동.",
  },
];

export default function QuickstartPage() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto max-w-3xl px-6 py-12 space-y-10">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/60 border border-border text-xs font-mono text-muted-foreground">
            <Terminal className="w-3 h-3" />
            paykit · quickstart
          </div>
          <h1 className="text-4xl font-bold tracking-tight">5분 만에 시작</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            아래 5단계로 XRPL PayKit prototype 전체를 로컬에서 띄우고 mock 결제 데모를 확인합니다.
            <span className="text-foreground"> Xaman API key 없이</span> 끝까지 작동.
          </p>
        </header>

        <ol className="space-y-6">
          {STEPS.map((s) => (
            <StepCard key={s.n} step={s} last={s.n === STEPS.length} />
          ))}
        </ol>

        <section className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            다음 단계
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-baseline gap-2">
              <ArrowRight className="w-3 h-3 text-primary shrink-0 translate-y-0.5" />
              <Link href="/examples" className="text-primary hover:underline">
                Examples
              </Link>
              <span className="text-muted-foreground">— K-pop 글로벌 팬덤 결제 등 도메인별 사용 사례</span>
            </li>
            <li className="flex items-baseline gap-2">
              <ArrowRight className="w-3 h-3 text-primary shrink-0 translate-y-0.5" />
              <a href="http://localhost:3001" className="text-primary hover:underline">
                Live Demo (:3001)
              </a>
              <span className="text-muted-foreground">— 가상 가맹점에서 60초 결제 데모</span>
            </li>
            <li className="flex items-baseline gap-2">
              <ArrowRight className="w-3 h-3 text-primary shrink-0 translate-y-0.5" />
              <a
                href="https://github.com/seongil06/xrpl_2026_test#api-contract"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                API Reference <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-muted-foreground">— GitHub README의 endpoint 상세</span>
            </li>
            <li className="flex items-baseline gap-2">
              <ArrowRight className="w-3 h-3 text-primary shrink-0 translate-y-0.5" />
              <a
                href="https://apps.xaman.dev"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                실 Xaman 전환 <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-muted-foreground">— API key 발급 후 .env에 XAMAN_MODE=real</span>
            </li>
          </ul>
        </section>

        <section className="bg-muted/30 border border-border rounded-lg p-5 text-sm">
          <p className="font-semibold mb-2">막혔어요?</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><code className="font-mono text-foreground">better-sqlite3</code> build 실패 → README 트러블슈팅</li>
            <li><code className="font-mono text-foreground">corepack EPERM</code> (Windows) → <code className="font-mono">npx pnpm@9</code> 그대로 사용</li>
            <li><code className="font-mono text-foreground">server_misconfigured 401</code> → .env가 양쪽 app 폴더에 모두 있는지 확인</li>
            <li>페이지가 unlocked로 시작 → demo-merchant 우측 Status 카드의 ↻ 버튼 클릭</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

function StepCard({ step, last }: { step: Step; last: boolean }) {
  return (
    <li className="relative pl-12">
      <div className="absolute left-0 top-0 w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center font-mono text-sm font-bold text-primary">
        {step.n}
      </div>
      {!last && (
        <div className="absolute left-[1.125rem] top-9 w-px bottom-[-1.5rem] bg-border" />
      )}
      <div className="space-y-3 pb-2">
        <div>
          <h3 className="text-lg font-semibold">{step.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.detail}</p>
        </div>
        {step.code && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
              <span className="text-xs font-mono text-muted-foreground">{step.language ?? "bash"}</span>
              <span className="text-xs font-mono text-muted-foreground">step {step.n}</span>
            </div>
            <pre className="p-3 overflow-x-auto font-mono text-xs leading-relaxed text-foreground">{step.code}</pre>
          </div>
        )}
        {step.hint && (
          <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3 italic">
            💡 {step.hint}
          </p>
        )}
      </div>
    </li>
  );
}
