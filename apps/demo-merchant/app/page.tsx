import { DemoClient } from "./demo-client";

export const dynamic = "force-dynamic";

const DEMO_ORDER_ID = "ORD-PAYKIT-DEMO-1";
const DEMO_RESOURCE_ID = "premium-search-result";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto max-w-6xl px-6 py-10 space-y-10">
        <header className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-3">
            <div className="inline-flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/60 border border-border text-xs font-mono text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                demo-merchant · :3001 · mock mode
              </div>
              <a
                href="http://localhost:3000/examples"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-mono text-primary hover:bg-primary/20 transition-colors"
              >
                PayKit SDK로 만든 가맹점 예시 1 of N · 다른 예시 →
              </a>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Premium AI Search<span className="text-muted-foreground">.demo</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
              유료 콘텐츠를 잠가두고 <span className="font-mono text-primary">@paykit/sdk</span>로
              결제 받는 mock 가맹점. 결제 검증·webhook 처리·resource unlock 전 흐름을 60초 안에 확인합니다.
            </p>
            <p className="text-xs text-muted-foreground">
              이 페이지 자체가 product가 아닙니다 — SDK 사용 예시입니다.
              {" "}<a className="text-primary hover:underline" href="http://localhost:3000">PayKit core →</a>
            </p>
          </div>
          <nav className="flex flex-col items-end gap-2 text-sm">
            <a className="font-mono text-muted-foreground hover:text-foreground hover:underline" href="http://localhost:3000">
              PayKit core <span className="text-primary">↗</span>
            </a>
            <a className="font-mono text-muted-foreground hover:text-foreground hover:underline" href="https://testnet.xrpl.org" target="_blank" rel="noreferrer">
              XRPL testnet <span className="text-primary">↗</span>
            </a>
            <a className="font-mono text-muted-foreground hover:text-foreground hover:underline" href="https://github.com/0xarkstar/xrpl-paykit" target="_blank" rel="noreferrer">
              github <span className="text-primary">↗</span>
            </a>
          </nav>
        </header>

        <DemoClient orderId={DEMO_ORDER_ID} resourceId={DEMO_RESOURCE_ID} />

        <footer className="text-xs font-mono text-muted-foreground border-t border-border pt-6 space-y-1.5">
          <p>
            <span className="text-primary">$</span> XAMAN_MODE=mock — 실제 Xaman 앱 없이 결제 시뮬레이션.
            real 모드 전환: <code className="text-foreground">.env</code>에 <code className="text-foreground">XAMAN_MODE=real</code> + API key 설정.
          </p>
          <p>
            <span className="text-primary">$</span> 리셋: 우측 Status 카드 <code className="text-foreground">↻</code> 버튼 ·
            소스: <a className="text-foreground hover:underline" href="https://github.com/0xarkstar/xrpl-paykit" target="_blank" rel="noreferrer">github.com/0xarkstar/xrpl-paykit</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
