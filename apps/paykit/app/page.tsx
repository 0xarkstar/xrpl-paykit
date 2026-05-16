// Developer-facing landing for PayKit core. Real users start at demo-merchant (3001).

import Link from "next/link";
import { ArrowRight, Package, Server, Store } from "lucide-react";

export default function PayKitHome() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto max-w-3xl py-16 px-6 space-y-12">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/60 border border-border text-xs font-mono text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            paykit core · :3000
          </div>
          <h1 className="text-5xl font-bold tracking-tight leading-tight">
            Stripe-like payments<br />
            <span className="text-primary">for XRPL.</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Payment intent + hosted checkout + signed webhook.
            Native XRPL <code className="font-mono text-foreground">delivered_amount</code> · memo · tx hash 메타데이터 검증으로
            단순 QR 생성기를 넘는 결제 인프라.
          </p>
        </header>

        <section className="space-y-3">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Get started</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/quickstart"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 glow-primary"
            >
              5분 quickstart
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/examples"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-border bg-card font-medium hover:border-primary/40 transition-colors"
            >
              See examples
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="http://localhost:3001"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-border bg-card font-medium hover:border-primary/40 transition-colors"
            >
              Live demo (:3001)
            </a>
          </div>
          <p className="text-xs font-mono text-muted-foreground">
            <span className="text-primary">$</span> mock 모드 — Xaman API key 없이 결제 흐름 끝까지 시뮬레이션
          </p>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">3-layer architecture</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-card border border-primary/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <span className="font-mono text-xs text-primary">packages/sdk</span>
              </div>
              <p className="font-medium">@paykit/sdk</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                npm install 해서 쓰는 SDK. <span className="text-foreground">진짜 product.</span>
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">apps/paykit</span>
              </div>
              <p className="font-medium">PayKit core (:3000)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                SDK가 호출하는 백엔드. <span className="text-foreground">Stripe.com에 해당.</span>
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">apps/demo-merchant</span>
              </div>
              <p className="font-medium">Demo merchant (:3001)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                SDK 사용 예시. <span className="text-foreground">가맹점 샘플 1 of N.</span>
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">SDK example</p>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/40">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
              </div>
              <span className="text-xs font-mono text-muted-foreground ml-2">merchant-backend.ts</span>
            </div>
            <pre className="p-4 overflow-x-auto font-mono text-sm leading-relaxed text-foreground">
{`import { PaykitClient } from "@paykit/sdk";

const paykit = new PaykitClient({
  apiKey: process.env.PAYKIT_API_KEY!,
  baseUrl: "http://localhost:3000",
});

const intent = await paykit.paymentIntents.create({
  amount: "1.25",
  asset: "XRP",
  orderId: "ORD-123",
  resourceId: "premium-search-result",
  webhookUrl: "http://localhost:3001/api/paykit-webhook",
});

redirect(intent.checkoutUrl);

// merchant webhook handler
const event = paykit.webhooks.constructEvent({
  rawBody, signatureHeader, secret,
});
if (event.type === "payment_intent.succeeded") {
  await unlockResource(event.data.object.resourceId);
}`}
            </pre>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 gap-3 text-sm">
          <a href="https://github.com/0xarkstar/xrpl-paykit" target="_blank" rel="noreferrer" className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors block">
            <p className="font-mono text-xs text-muted-foreground">→ GitHub repository</p>
            <p className="mt-1 font-medium">소스 · README · 5분 quickstart</p>
          </a>
          <a href="https://testnet.xrpl.org" target="_blank" rel="noreferrer" className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors block">
            <p className="font-mono text-xs text-muted-foreground">→ XRPL Testnet Explorer</p>
            <p className="mt-1 font-medium">데모 사이클의 tx hash 검증</p>
          </a>
        </section>

        <footer className="text-xs font-mono text-muted-foreground border-t border-border pt-6 space-y-1">
          <p><span className="text-primary">$</span> mode: XAMAN_MODE=mock (default)</p>
          <p><span className="text-primary">$</span> github: github.com/0xarkstar/xrpl-paykit</p>
        </footer>
      </div>
    </main>
  );
}
