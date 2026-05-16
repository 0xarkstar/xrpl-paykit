import Link from "next/link";
import { Music, ArrowLeft, ArrowRight, ExternalLink, Zap, Coins, Clock, Network } from "lucide-react";

export const metadata = {
  title: "K-pop 글로벌 팬덤 결제 — PayKit Examples",
  description: "PayKit SDK로 해외 K-pop 팬 ↔ 한국 셀러 결제 인프라 구축하기.",
};

const WHY_XRPL = [
  {
    icon: Network,
    title: "Cross-Currency Payment",
    detail: "USD → KRW 한 트랜잭션에서 자동 환전 라우팅. EVM은 라우터 컨트랙트 + 가스 부담.",
  },
  {
    icon: Coins,
    title: "수수료 ~₩0.02",
    detail: "1만원 굿즈 결제도 마진 보존. 카드 PG 2.5~3% → PayKit 0.5~1% (~1/5 수준).",
  },
  {
    icon: Clock,
    title: "Finality 3~5초",
    detail: "가맹점 즉시 수령. ETH 12~15분 확률적, 카드 PG D+7~14 정산.",
  },
  {
    icon: Zap,
    title: "IOU + Oracle (V2)",
    detail: "신인 곡 후원 → 차트·판매 데이터 Oracle → IOU 보유자 자동 수익 분배.",
  },
];

const SDK_CODE = `// apps/your-merchant/api/create-checkout/route.ts
import { PaykitClient } from "@paykit/sdk";

const paykit = new PaykitClient({
  apiKey: process.env.PAYKIT_API_KEY!,
  baseUrl: process.env.PAYKIT_BASE_URL!,
});

export async function POST(req: Request) {
  const { fanId, photocardId } = await req.json();

  const intent = await paykit.paymentIntents.create({
    amount: "10",                    // 팬 결제 (USD)
    asset: "USD",
    destAsset: "KRW",                // V2 — Cross-Currency Payment
    orderId: \`KPOP-PC-\${photocardId}\`,
    resourceId: photocardId,
    metadata: {
      artist: "NewJeans",
      fanId,
      country: "US",
    },
  });

  return Response.json({ checkoutUrl: intent.checkoutUrl });
}`;

const WEBHOOK_CODE = `// apps/your-merchant/api/paykit-webhook/route.ts
import { constructEvent } from "@paykit/sdk";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("paykit-signature")!;

  const event = constructEvent(rawBody, sig, process.env.PAYKIT_WEBHOOK_SECRET!);

  if (event.type === "payment_intent.succeeded") {
    const { resourceId, metadata } = event.data;
    await sendPhotocard(metadata.fanId, resourceId);
    await mintNFT(resourceId);    // 선택 — 디지털 굿즈 NFT 발행
  }

  return new Response(null, { status: 200 });
}`;

export default function KpopExamplePage() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto max-w-4xl px-6 py-12 space-y-12">
        <div>
          <Link
            href="/examples"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Examples
          </Link>
        </div>

        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-mono text-primary">
            <Music className="w-3 h-3" />
            paykit examples · k-pop global fan payment
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            K-pop 글로벌 팬덤 <span className="text-primary">결제 인프라</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            해외 K-pop 팬과 한국 아티스트·셀러를 잇는 결제·후원 인프라.
            팬은 카드처럼 쓰고, PayKit이 XRPL 위에서 환전·즉시정산을 자동화합니다.
          </p>
        </header>

        <section className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">결제 흐름</h2>
          <pre className="font-mono text-[11px] md:text-sm leading-relaxed text-foreground overflow-x-auto">
{`  🇺🇸 미국 팬                  🌐 PayKit                    🇰🇷 한국 셀러
  ─────────                  ──────────                   ──────────
  $10 USD  ───────▶  Cross-Currency Payment  ───────▶  ₩13,000 KRW
                     finality 3~5초                       D+0 수령
                     수수료 ~₩0.02                        마진 +2%p

                     [ 9개 XRPL 검증 ]
                     ✓ delivered_amount   ✓ memo decode
                     ✓ tx hash unique     ✓ intent expired X
                     ✓ Destination 매칭   ✓ Payment type
                     ✓ validated          ✓ tesSUCCESS
                     ✓ duplicate_tx X`}
          </pre>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Why XRPL — 4가지</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {WHY_XRPL.map((w) => {
              const Icon = w.icon;
              return (
                <div key={w.title} className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">{w.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{w.detail}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">SDK로 구현하기 — 2 파일</h2>
          <p className="text-sm text-muted-foreground">
            가맹점 코드는 두 파일만 있으면 됩니다. PayKit core 서버(:3000)와 SDK가 나머지를 처리합니다.
          </p>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
              <span className="text-xs font-mono text-muted-foreground">1. 결제 시작 — payment intent 생성</span>
              <span className="text-xs font-mono text-primary">@paykit/sdk</span>
            </div>
            <pre className="p-3 overflow-x-auto font-mono text-xs leading-relaxed text-foreground">{SDK_CODE}</pre>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
              <span className="text-xs font-mono text-muted-foreground">2. 완료 처리 — signed webhook</span>
              <span className="text-xs font-mono text-primary">HMAC-SHA256</span>
            </div>
            <pre className="p-3 overflow-x-auto font-mono text-xs leading-relaxed text-foreground">{WEBHOOK_CODE}</pre>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">비즈니스 임팩트</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">위버스 MAU</div>
              <div className="text-2xl font-bold">1,000만+</div>
              <div className="text-xs text-muted-foreground mt-1">글로벌 K-pop 팬덤 활성 사용자</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">K-pop 굿즈 글로벌 시장</div>
              <div className="text-2xl font-bold">$10B+</div>
              <div className="text-xs text-muted-foreground mt-1">2026 추정</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">결제 수수료</div>
              <div className="text-2xl font-bold text-primary">1/5</div>
              <div className="text-xs text-muted-foreground mt-1">카드 PG 2.5~3% → PayKit 0.5~1%</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            타깃: 1차 인디·중소 셀러 (위버스 입점 못한 굿즈샵·아티스트) · 2차 위버스·SM·하이브 결제 모듈 SDK (B2B).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">로드맵 — 3단계</h2>
          <ol className="space-y-3">
            {[
              {
                phase: "샌드박스 PoC",
                when: "지금 ~ 본선 (2026-06-24)",
                what: "결제 시연 1건 + 후원·분배 시연 1건 (testnet) + 인디 아티스트·중소 셀러 1~2팀 협업",
                tag: "샌드박스 OK",
              },
              {
                phase: "인가 + 표준화",
                when: "본선 ~ 12개월",
                what: "전자지급결제대행업 인가 + 후원 보상형 약관·라이선스 표준화 + 위버스·SM BD",
                tag: "전자지급결제대행업",
              },
              {
                phase: "본격 + 증권형",
                when: "12 ~ 24개월",
                what: "가맹점 100+ + 자본시장법·STO 가이드라인 활용 증권형 후원",
                tag: "자본시장법 · STO 인가",
              },
            ].map((r, i) => (
              <li key={r.phase} className="flex gap-3 bg-card border border-border rounded-lg p-4">
                <div className="w-7 h-7 rounded-md border border-border bg-muted/40 flex items-center justify-center font-mono text-xs font-bold text-primary shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{r.phase}</h3>
                    <span className="text-xs text-muted-foreground font-mono">{r.when}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.what}</p>
                  <span className="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                    {r.tag}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-card border border-primary/30 glow-primary rounded-lg p-6 space-y-3">
          <h2 className="text-lg font-bold">바로 시작하기</h2>
          <p className="text-sm text-muted-foreground">
            로컬에서 5분 안에 PayKit 전 플로우를 띄우고, 위 코드 두 파일을 자기 가맹점에 붙여넣으세요.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/quickstart"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              5분 quickstart
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/examples"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-border bg-card text-sm hover:border-primary/40 transition-colors"
            >
              다른 예시
            </Link>
            <a
              href="https://github.com/seongil06/xrpl_2026_test"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-border bg-card text-sm hover:border-primary/40 transition-colors"
            >
              GitHub
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        <p className="text-xs text-muted-foreground border-l-2 border-border pl-3 italic">
          이 예시는 PayKit V1 (XRP 직접 결제 + 9개 검증)로 즉시 데모 가능. Cross-Currency Payment·IOU·Oracle은 V2에서 PRD §18.2/§18.3 따라 단계적 추가 예정.
        </p>
      </div>
    </main>
  );
}
