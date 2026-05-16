import Link from "next/link";
import { Music, Search, Cpu, ShoppingBag, ArrowRight, Sparkles } from "lucide-react";

export const metadata = {
  title: "Examples — XRPL PayKit",
  description: "PayKit SDK로 만들 수 있는 결제 사용 사례 갤러리.",
};

interface UseCase {
  slug: string;
  href: string;
  external?: boolean;
  comingSoon?: boolean;
  featured?: boolean;
  icon: typeof Music;
  title: string;
  tagline: string;
  description: string;
  sdkHook: string;
  badge?: string;
}

const CASES: UseCase[] = [
  {
    slug: "kpop",
    href: "/examples/kpop",
    featured: true,
    icon: Music,
    title: "K-pop 글로벌 팬덤 결제",
    tagline: "해외 팬 → 한국 셀러, 한 번의 결제로 통화 전환까지",
    description:
      "위버스/굿즈샵의 해외 결제 수수료 2.5~3% 페인포인트를 XRPL Cross-Currency Payment + 저수수료 finality로 1/5 수준까지 압축.",
    sdkHook: "paymentIntents.create({ asset: 'USD', destAsset: 'KRW', metadata: { artist, fanId } })",
    badge: "Featured",
  },
  {
    slug: "ai-search",
    href: "http://localhost:3001",
    external: true,
    icon: Search,
    title: "Premium AI Search",
    tagline: "결과 한 건 = XRP 결제, locked → 검증 후 unlock",
    description:
      "현재 demo-merchant가 구현한 시나리오. 0.5 XRP로 premium 검색 결과 보기. 60초 안에 PayKit 전 플로우 작동 확인 가능.",
    sdkHook: "paymentIntents.create({ asset: 'XRP', amount: '0.5', resourceId: 'search-result-...' })",
    badge: "Live :3001",
  },
  {
    slug: "ai-api",
    href: "#",
    comingSoon: true,
    icon: Cpu,
    title: "AI API 사용량 결제",
    tagline: "토큰/호출 단위 micro-payment, monthly cap 자동 expire",
    description:
      "에이전트가 직접 결제하는 시대를 가정 — PRD §3.3 'agent-ready later'. PayKit intent의 expiresAt + metadata.usage 필드로 cap·refund 가능.",
    sdkHook: "paymentIntents.create({ amount, expiresAt, metadata: { tokens, model } })",
  },
  {
    slug: "digital-goods",
    href: "#",
    comingSoon: true,
    icon: ShoppingBag,
    title: "디지털 굿즈 판매",
    tagline: "NFT/포토카드/디지털 앨범 — orderId 1:1 락-인",
    description:
      "한 결제 = 한 굿즈. duplicate_tx · intent_expired · partial_payment 검증으로 더블 스펜 자동 차단. 후속 NFT mint 트리거는 webhook 1줄.",
    sdkHook: "paymentIntents.create({ orderId, resourceId: 'photocard-...', amount: '10' })",
  },
];

export default function ExamplesPage() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto max-w-5xl px-6 py-12 space-y-10">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/60 border border-border text-xs font-mono text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            paykit · examples
          </div>
          <h1 className="text-4xl font-bold tracking-tight">PayKit으로 빌드할 수 있는 결제 패턴</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            PayKit SDK 한 호출 = payment intent + Xaman QR + XRPL 검증 + signed webhook까지.
            아래는 동일한 SDK가 다른 도메인에서 어떻게 쓰이는지 보여주는 4가지 예시입니다.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CASES.map((c) => (
            <UseCaseCard key={c.slug} c={c} />
          ))}
        </section>

        <section className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold">예시를 새로 만들고 싶다면</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <Link href="/quickstart" className="text-primary hover:underline">5분 quickstart</Link>로 로컬 환경을 띄운 뒤,
            <code className="font-mono text-xs px-1.5 py-0.5 mx-1 rounded bg-muted/60 text-foreground">apps/demo-merchant</code>
            를 복사해서 새 가맹점을 만드세요. PayKit core(:3000)는 그대로 두고,
            가맹점 쪽 webhook handler와 UI만 자기 도메인에 맞게 갈아끼우면 됩니다.
          </p>
          <p className="text-xs text-muted-foreground">
            SDK 함수 시그니처는 GitHub README의 <span className="font-mono text-foreground">API Contract</span> 섹션 참조.
          </p>
        </section>
      </div>
    </main>
  );
}

function UseCaseCard({ c }: { c: UseCase }) {
  const Icon = c.icon;
  const isLink = !c.comingSoon;
  const isExternal = c.external && isLink;

  const inner = (
    <article
      className={`relative h-full bg-card border rounded-lg p-5 space-y-3 transition-colors ${
        c.featured ? "border-primary/40 glow-primary" : "border-border"
      } ${isLink ? "hover:border-primary/60 group" : "opacity-70"}`}
    >
      {c.badge && (
        <span className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
          {c.badge}
        </span>
      )}
      {c.comingSoon && (
        <span className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border">
          Coming soon
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg border border-border bg-muted/40 flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${c.featured ? "text-primary" : "text-foreground"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold leading-tight">{c.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{c.tagline}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>

      <div className="bg-muted/30 border border-border rounded-md px-3 py-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">SDK 호출</div>
        <code className="font-mono text-[11px] text-foreground break-all">{c.sdkHook}</code>
      </div>

      {isLink && (
        <div className="pt-1 flex items-center gap-1.5 text-xs text-primary group-hover:translate-x-0.5 transition-transform">
          <span>{isExternal ? "데모 열기" : "자세히 보기"}</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </article>
  );

  if (!isLink) return inner;
  if (isExternal) {
    return (
      <a href={c.href} target="_blank" rel="noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return (
    <Link href={c.href} className="block">
      {inner}
    </Link>
  );
}
