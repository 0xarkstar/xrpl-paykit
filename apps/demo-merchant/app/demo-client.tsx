"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Lock, ExternalLink, Loader2, CheckCircle2, RotateCcw, ArrowRight,
  MousePointerClick, Smartphone, Zap, Shield, FileCheck2, Webhook, Sparkles,
} from "lucide-react";

interface Props {
  orderId: string;
  resourceId: string;
}

interface OrderStatus {
  state: string;
  intentId?: string;
  txHash?: string;
  events: { id: number; type: string; message: string; txHash?: string; timestamp: number }[];
}

export function DemoClient({ orderId, resourceId }: Props) {
  const [status, setStatus] = useState<OrderStatus>({ state: "locked", events: [] });
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [premium, setPremium] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/order-status?orderId=${orderId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data);
    } catch {}
  }, [orderId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (status.state === "paid" || status.state === "unlocked") {
      fetch(`/api/premium-result?orderId=${orderId}`)
        .then((r) => r.json())
        .then((d) => { if (d.content) setPremium(d.content); })
        .catch(() => {});
    } else {
      setPremium(null);
    }
  }, [status.state, orderId]);

  async function onUnlock() {
    setCreating(true);
    setCheckoutUrl(null);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, resourceId }),
      });
      const data = await res.json();
      if (data?.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
        window.open(data.checkoutUrl, "paykit_checkout", "noopener,width=540,height=760");
      }
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  async function onReset() {
    setResetting(true);
    try {
      await fetch("/api/reset", { method: "POST" });
      setCheckoutUrl(null);
      setPremium(null);
      await refresh();
    } finally {
      setResetting(false);
    }
  }

  const unlocked = status.state === "paid" || status.state === "unlocked";
  const inProgress = status.state === "waiting_for_payment" || status.state === "checkout_created";

  return (
    <div className="space-y-6">
      <DemoGuide state={status.state} checkoutUrl={checkoutUrl} />

      <div className="grid md:grid-cols-3 gap-6">
        <section className="md:col-span-2 bg-card border rounded-xl p-6 shadow-sm relative overflow-hidden min-h-[280px]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase text-muted-foreground tracking-wider">Premium Result</h2>
            {unlocked && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                paid · verified · unlocked
              </span>
            )}
          </div>
          <h3 className="text-xl font-semibold mt-1">&quot;한국 토큰화 시장의 단기 기회&quot; 종합 분석</h3>

          <div className={`mt-4 transition-all ${unlocked ? "" : "filter blur-md select-none pointer-events-none"}`}>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {premium ?? "포필러스·판테라가 공동 집필한 한국 RWA 시장 8편 시리즈 인사이트와 KFIP 2026 운영진이 공유한 마스터 프롬프트를 결합해, 결제·정산·RWA·스테이블 4개 트랙에 적용 가능한 한국 시장 12개 기회를 정리했습니다."}
            </p>
            <ul className="mt-4 grid sm:grid-cols-2 gap-2 text-sm">
              <li className="border rounded-md px-3 py-2 bg-muted/40">① 토큰화 국채 — 한국 단기 기회 제한</li>
              <li className="border rounded-md px-3 py-2 bg-muted/40">② 토큰화 주식 — 한·미 시장 괴리</li>
              <li className="border rounded-md px-3 py-2 bg-muted/40">③ 토큰화 사모 신용 — 신탁수익증권</li>
              <li className="border rounded-md px-3 py-2 bg-muted/40">④ 이색 RWA — 미드/다운스트림</li>
            </ul>
          </div>

          {!unlocked && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
              <div className="bg-card border-2 rounded-xl shadow-lg p-6 max-w-sm text-center space-y-4">
                <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-semibold text-lg">잠긴 프리미엄 콘텐츠</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    1.25 XRP를 PayKit으로 결제하면<br />XRPL 원장 검증 후 자동으로 잠금 해제됩니다.
                  </p>
                </div>
                <button
                  onClick={onUnlock}
                  disabled={creating || inProgress}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /> Unlock with XRP</>}
                </button>
                {checkoutUrl && (
                  <a
                    href={checkoutUrl}
                    target="paykit_checkout"
                    className="block text-xs font-mono text-primary hover:underline truncate"
                  >
                    팝업 차단 시 → 직접 열기
                  </a>
                )}
                {status.intentId && (
                  <p className="text-xs font-mono text-muted-foreground truncate">intent: {status.intentId.slice(0, 24)}…</p>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-mono uppercase text-muted-foreground tracking-wider">Payment Status</h2>
              <p className="text-lg font-semibold mt-1">{prettyState(status.state)}</p>
            </div>
            <button
              onClick={onReset}
              disabled={resetting}
              title="데모 사이클 초기화 (orders + events 메모리 클리어)"
              className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted disabled:opacity-50"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            </button>
          </div>
          <StateChecklist state={status.state} />
          {status.txHash && (
            <a
              className="flex items-center gap-2 text-xs font-mono text-primary hover:underline"
              href={`https://testnet.xrpl.org/transactions/${status.txHash}`}
              target="_blank" rel="noreferrer"
            >
              <ExternalLink className="w-3 h-3" /> view tx on testnet explorer
            </a>
          )}
        </aside>
      </div>

      {unlocked && (
        <section className="bg-success/5 border border-success/30 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-success shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold">이 데모가 방금 증명한 4가지</h2>
              <p className="text-sm text-muted-foreground mt-1">
                위 Premium 콘텐츠는 단순히 &quot;결제 버튼 클릭&quot;으로 열린 게 아닙니다.
                PayKit이 백엔드에서 다음을 자동으로 처리했고, 하나라도 실패했으면 콘텐츠는 잠긴 채였습니다.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <ProofCard icon={Shield} title="XRPL 원장 검증 9개 조건">
              validated · tesSUCCESS · TransactionType · Destination · <code className="font-mono">meta.delivered_amount</code> 정확 일치 · memo decode · tx hash 미사용 · intent 미만료 — 9개 모두 통과해야 succeeded.
            </ProofCard>
            <ProofCard icon={FileCheck2} title="reconciliation (idempotent)">
              같은 tx hash로 두 번 verify해도 unlock은 1번만. duplicate tx로 다른 intent unlock 시도는 <code className="font-mono">duplicate_tx</code>로 거부.
            </ProofCard>
            <ProofCard icon={Webhook} title="signed webhook (HMAC-SHA256)">
              PayKit → merchant로 raw body + <code className="font-mono">PayKit-Signature</code> 헤더 전송. 서명 변조·timestamp skew·malformed 헤더는 401로 reject.
            </ProofCard>
            <ProofCard icon={Zap} title="merchant state unlock">
              webhook 도착 시 <code className="font-mono">orders[orderId]=unlocked</code>로 전환. <code className="font-mono">?paid=1</code> query는 신뢰 X. premium-result 라우트는 paid/unlocked일 때만 200.
            </ProofCard>
          </div>
          <div className="bg-card border rounded-lg p-4 text-sm">
            <p className="font-semibold mb-2">다음으로 시도해볼 것 (Wow moments)</p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-mono text-xs mt-0.5 px-1.5 rounded bg-muted shrink-0">A</span>
                <span>우측 Status 카드의 <RotateCcw className="w-3 h-3 inline" /> 버튼 클릭 → 사이클 리셋 → 다시 Unlock으로 새 사이클</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs mt-0.5 px-1.5 rounded bg-muted shrink-0">B</span>
                <div className="flex-1">
                  터미널에서 잘못된 서명으로 webhook 시도:
                  <pre className="mt-1 font-mono text-xs bg-muted p-2 rounded overflow-x-auto">{`curl -X POST http://localhost:3001/api/paykit-webhook \\
  -H "PayKit-Signature: t=1,v1=00" -H "Content-Type: application/json" -d '{}'`}</pre>
                  <span className="text-xs">→ <code className="font-mono">401</code> 응답 (signature_mismatch 또는 timestamp_skew)</span>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs mt-0.5 px-1.5 rounded bg-muted shrink-0">C</span>
                <span>이 페이지 새로고침 → <code className="font-mono">/api/premium-result</code>는 orders 메모리 기반 게이팅이라 unlock 유지</span>
              </li>
            </ul>
          </div>
        </section>
      )}

      <section className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-mono uppercase text-muted-foreground tracking-wider">Event Log</h2>
          <span className="text-xs text-muted-foreground">PayKit이 백엔드에서 자동 기록하는 결제 라이프사이클</span>
        </div>
        <div className="font-mono text-sm divide-y">
          {status.events.length === 0 && (
            <p className="text-muted-foreground py-2">아직 이벤트가 없습니다. 위 &quot;Unlock with XRP&quot;를 눌러 시작하세요.</p>
          )}
          {status.events.map((e) => (
            <div key={e.id} className="flex items-baseline gap-3 py-2">
              <span className="text-muted-foreground w-8 text-right">[{e.id}]</span>
              <span className={`px-2 py-0.5 rounded border text-xs ${eventColor(e.type)}`}>{e.type}</span>
              <span className="flex-1 truncate">{e.message}</span>
              {e.txHash && (
                <a
                  className="text-primary hover:underline"
                  href={`https://testnet.xrpl.org/transactions/${e.txHash}`}
                  target="_blank" rel="noreferrer"
                  title="testnet explorer에서 보기"
                >→</a>
              )}
              <span className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DemoGuide({ state, checkoutUrl }: { state: string; checkoutUrl: string | null }) {
  const step =
    state === "locked" ? 1 :
    (state === "checkout_created" || state === "waiting_for_payment") ? 2 :
    (state === "paid" || state === "unlocked") ? 3 : 1;

  const steps = [
    { n: 1, icon: MousePointerClick, label: "Locked 카드의 'Unlock with XRP' 클릭", detail: "merchant backend가 PayKit에 payment_intent 생성" },
    { n: 2, icon: Smartphone, label: "새 창의 checkout에서 'Simulate Xaman Approve' 클릭", detail: "mock 모드 — 실제 Xaman 앱 없이 결제 시뮬레이션" },
    { n: 3, icon: CheckCircle2, label: "이 페이지가 자동으로 unlock 상태로 전환", detail: "PayKit이 XRPL 9개 조건 검증 → signed webhook 발사 → 이 화면 unlock" },
  ];

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0">i</div>
        <div className="flex-1">
          <p className="font-semibold">이 페이지는 PayKit (XRPL 결제 인프라) 데모입니다</p>
          <p className="text-sm text-muted-foreground mt-1">
            아래 잠긴 프리미엄 콘텐츠를 1.25 XRP로 결제·검증·잠금 해제하는 전체 흐름을 보여줍니다.
            모든 검증은 XRPL 원장 메타데이터(<code className="font-mono text-xs">meta.delivered_amount</code> · memo · tx hash) 기반이며,
            merchant 서버에는 <code className="font-mono text-xs">HMAC-SHA256</code>으로 서명된 webhook으로 알림이 갑니다.
          </p>
        </div>
      </div>
      <ol className="grid sm:grid-cols-3 gap-3 text-sm">
        {steps.map((s) => {
          const Icon = s.icon;
          const active = step === s.n;
          const done = step > s.n;
          return (
            <li
              key={s.n}
              className={`relative rounded-lg border p-3 transition-all ${
                done ? "bg-success/10 border-success/30" :
                active ? "bg-primary/10 border-primary/40 shadow-sm" :
                "bg-card border-border opacity-60"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  done ? "bg-success text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                </div>
                <Icon className={`w-4 h-4 ${active ? "text-primary" : done ? "text-success" : "text-muted-foreground"}`} />
              </div>
              <p className="font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.detail}</p>
              {active && s.n === 2 && checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="paykit_checkout"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline"
                >
                  checkout 창 다시 열기 <ArrowRight className="w-3 h-3" />
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ProofCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-success" />
        <p className="font-semibold text-sm">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function prettyState(state: string): string {
  switch (state) {
    case "locked": return "Locked";
    case "checkout_created": return "Checkout opened";
    case "waiting_for_payment": return "Waiting for payment…";
    case "paid": return "Paid — verifying";
    case "unlocked": return "Unlocked ✅";
    case "failed": return "Failed";
    case "expired": return "Expired";
    case "requires_review": return "Requires review";
    default: return state;
  }
}

function StateChecklist({ state }: { state: string }) {
  const steps = [
    { key: "checkout_created", label: "Checkout opened" },
    { key: "waiting_for_payment", label: "Waiting for wallet" },
    { key: "paid", label: "Webhook delivered" },
    { key: "unlocked", label: "Resource unlocked" },
  ];
  const order = ["locked", "checkout_created", "waiting_for_payment", "paid", "unlocked"];
  const idx = order.indexOf(state);
  return (
    <ul className="space-y-2 text-sm">
      {steps.map((s) => {
        const stepIdx = order.indexOf(s.key);
        const done = idx >= stepIdx;
        return (
          <li key={s.key} className="flex items-center gap-2">
            {done ? <CheckCircle2 className="w-4 h-4 text-success" /> : <span className="w-4 h-4 rounded-full border" />}
            <span className={done ? "" : "text-muted-foreground"}>{s.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function eventColor(type: string): string {
  if (type.includes("error") || type.includes("rejected")) return "border-destructive/40 text-destructive";
  if (type.includes("validated") || type.includes("unlocked")) return "border-success/40 text-success";
  if (type.includes("webhook")) return "border-primary/40 text-primary";
  return "border-border";
}
