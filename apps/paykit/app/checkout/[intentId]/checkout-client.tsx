"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Circle, Loader2, ExternalLink, ShieldCheck } from "lucide-react";

interface Props {
  intentId: string;
  amount: string;
  asset: string;
  destinationAddress: string;
  orderId: string;
  resourceId: string | null;
  payloadUrl: string;
  initialStatus: string;
  mockMode: boolean;
}

type StepState = "todo" | "active" | "done" | "failed";

export function CheckoutClient(props: Props) {
  const [status, setStatus] = useState(props.initialStatus);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (props.payloadUrl) {
      QRCode.toDataURL(props.payloadUrl, { width: 256, margin: 1 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    }
  }, [props.payloadUrl]);

  useEffect(() => {
    if (status === "succeeded" || status === "failed" || status === "expired" || status === "requires_review") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/internal/intent-public/${props.intentId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.status);
        if (data.txHash) setTxHash(data.txHash);
      } catch {
        // ignore transient errors
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [props.intentId, status]);

  const steps = useMemo(() => deriveSteps(status), [status]);

  async function onSimulate() {
    setSimulating(true);
    setErrorReason(null);
    try {
      const res = await fetch("/api/internal/simulate-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId: props.intentId }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("succeeded");
        if (data.txHash) setTxHash(data.txHash);
      } else {
        setErrorReason(data.reason ?? "unknown");
      }
    } catch (e: any) {
      setErrorReason(String(e?.message ?? e));
    } finally {
      setSimulating(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-muted/40">
      <div className="w-full max-w-md bg-card border rounded-xl shadow-sm p-8 space-y-6">
        <header className="text-center space-y-1">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">XRPL PayKit</p>
          <h1 className="text-2xl font-semibold">Pay with XRP via Xaman</h1>
          <p className="text-sm text-muted-foreground">{props.orderId}{props.resourceId ? ` · ${props.resourceId}` : ""}</p>
        </header>

        <div className="text-center">
          <p className="text-4xl font-bold">{props.amount} <span className="text-2xl text-muted-foreground">{props.asset}</span></p>
          <p className="text-xs font-mono text-muted-foreground mt-1 truncate">→ {props.destinationAddress}</p>
        </div>

        {status === "pending" && qrDataUrl && (
          <div className="flex justify-center">
            <img src={qrDataUrl} alt="Xaman QR" className="w-64 h-64" />
          </div>
        )}

        <div className="space-y-2">
          {steps.map((s) => <StepRow key={s.label} {...s} />)}
        </div>

        {txHash && (
          <a
            className="flex items-center gap-2 text-xs font-mono text-primary hover:underline"
            href={`https://testnet.xrpl.org/transactions/${txHash}`}
            target="_blank" rel="noreferrer"
          >
            <ExternalLink className="w-3 h-3" />
            view on testnet explorer
          </a>
        )}

        {errorReason && (
          <div className="text-sm text-destructive font-mono">verify error · {errorReason}</div>
        )}

        {props.mockMode && status !== "succeeded" && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-xs text-muted-foreground font-mono">[mock mode — no Xaman API key set]</p>
            <button
              onClick={onSimulate}
              disabled={simulating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Simulate Xaman Approve
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

interface Step { label: string; state: StepState }

function deriveSteps(status: string): Step[] {
  const order: { key: string; label: string; activeFor: string[]; doneFor: string[] }[] = [
    { key: "approve",  label: "Wallet approved",   activeFor: ["pending"], doneFor: ["succeeded"] },
    { key: "verify",   label: "Ledger verified",   activeFor: [],          doneFor: ["succeeded"] },
    { key: "webhook",  label: "Webhook delivered", activeFor: [],          doneFor: ["succeeded"] },
    { key: "unlock",   label: "Resource unlocked", activeFor: [],          doneFor: ["succeeded"] },
  ];
  return order.map((o) => {
    let state: StepState = "todo";
    if (o.doneFor.includes(status)) state = "done";
    else if (o.activeFor.includes(status)) state = "active";
    if (status === "failed") state = "failed";
    return { label: o.label, state };
  });
}

function StepRow({ label, state }: Step) {
  const Icon =
    state === "done" ? CheckCircle2 :
    state === "active" ? Loader2 :
    Circle;
  const className =
    state === "done" ? "text-success" :
    state === "active" ? "text-primary animate-spin" :
    state === "failed" ? "text-destructive" :
    "text-muted-foreground";
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className={`w-5 h-5 ${className}`} />
      <span className={state === "todo" ? "text-muted-foreground" : ""}>{label}</span>
    </div>
  );
}
