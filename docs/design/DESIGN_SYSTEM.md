# DESIGN_SYSTEM — PayKit 디자인 시스템

> 결정 (2026-05-16): **Modern SaaS / Developer Tool (Stripe-like)** + 미세한 XRPL accent.
> 스킬 `ui-design/SKILL.md`와 짝. 이 문서는 토큰·컴포넌트 카탈로그.

## 1. 디자인 원칙

| 원칙 | 적용 |
|---|---|
| **여백을 두려워하지 않는다** | 큰 padding, 적은 chrome |
| **타이포그래피 우선** | 깔끔한 sans + monospace 조합 |
| **한 화면 한 액션** | Locked 카드 = "Unlock with XRP" 단 하나 |
| **상태는 명확히** | 6 단계 status (Created → Pending → Verified → Webhook → Unlocked + failure/expired) 시각화 |
| **코드는 1급 시민** | JetBrains Mono 코드블록은 Inter 본문과 동급 중요도 |
| **dark crypto 미학 회피** | 화이트 base + indigo accent — Stripe·Linear·Vercel 톤 |

## 2. 색상 토큰

```css
/* tailwind.config.ts theme.extend.colors */
:root {
  --background: 0 0% 100%;             /* white */
  --foreground: 222.2 84% 4.9%;        /* near-black */
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96.1%;              /* slate-100 */
  --muted-foreground: 215.4 16.3% 46.9%; /* slate-500 */
  --border: 214.3 31.8% 91.4%;         /* slate-200 */
  --input: 214.3 31.8% 91.4%;
  --primary: 238 76% 53%;              /* indigo-600 */
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --accent: 238 76% 53%;
  --success: 142 71% 45%;              /* green-600 */
  --warning: 38 92% 50%;               /* amber-500 */
  --destructive: 0 84% 60%;            /* red-600 */
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;        /* slate-950 */
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;          /* slate-800 */
  --muted-foreground: 215 20.2% 65.1%;
  --border: 217.2 32.6% 17.5%;
  --primary: 238 76% 60%;              /* indigo-500 (밝게) */
}
```

## 3. 타이포그래피

| 용도 | 폰트 | 크기 | weight |
|---|---|---|---|
| 헤드라인 H1 | Inter | text-4xl (36px) | 700 |
| H2 | Inter | text-2xl (24px) | 600 |
| H3 | Inter | text-lg (18px) | 600 |
| 본문 | Inter | text-base (16px) | 400~500 |
| 캡션 | Inter | text-sm (14px) | 400 |
| 코드 / 이벤트로그 / tx hash | JetBrains Mono | text-sm | 400~500 |

폰트 로드 (Next.js):
```ts
// app/layout.tsx
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
```

## 4. spacing

Tailwind default (4px 단위). 자주 쓰는 값:
- `gap-2` (8px) — 인라인 요소
- `gap-3` (12px) — 카드 내부
- `gap-6` (24px) — 카드 간격
- `py-12` (48px) — 섹션 패딩
- `px-4` (16px) — 모바일 horizontal
- `px-8` (32px) — 데스크탑 horizontal

## 5. 라운드 / shadow

- 카드: `rounded-lg` (8px) + `shadow-sm` (subtle)
- 버튼: `rounded-md` (6px)
- Badge: `rounded-full`
- Modal: `rounded-xl` (12px) + `shadow-2xl`

## 6. shadcn/ui 컴포넌트 (사용 카탈로그)

| 컴포넌트 | 용도 |
|---|---|
| `Button` | primary/secondary/ghost/destructive variants |
| `Card` (header/content/footer) | Locked/Unlocked 카드, status 카드 |
| `Badge` | status 표시 (success/warning/destructive/secondary) |
| `Toast` | webhook 도착 알림 |
| `Dialog` | "결제 취소하시겠어요?" 확인 |
| `Tabs` | "Status / Event Log / Details" |
| `Skeleton` | locked content placeholder |
| `Progress` | checkout polling 진행도 |
| `Tooltip` | tx hash 클릭 안내 |

설치:
```powershell
pnpm dlx shadcn-ui@latest init
pnpm dlx shadcn-ui@latest add button card badge toast dialog tabs skeleton progress tooltip
```

## 7. 커스텀 컴포넌트 (PayKit 전용)

### StatusStep

```tsx
type State = "todo" | "active" | "done" | "failed";

function StatusStep({ label, state }: { label: string; state: State }) {
  const Icon = state === "done" ? CheckCircle2 : state === "failed" ? XCircle : state === "active" ? Loader2 : Circle;
  const color = state === "done" ? "text-green-600" : state === "failed" ? "text-red-600" : state === "active" ? "text-indigo-600 animate-spin" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("w-5 h-5", color)} />
      <span className={cn("text-sm", state === "todo" && "text-muted-foreground")}>{label}</span>
    </div>
  );
}
```

### EventRow

```tsx
function EventRow({ index, type, message, txHash, timestamp }: ...) {
  return (
    <div className="flex items-baseline gap-2 font-mono text-sm py-1">
      <span className="text-muted-foreground w-8 text-right">[{index}]</span>
      <Badge variant="outline">{type}</Badge>
      <span className="flex-1 truncate">{message}</span>
      {txHash && <a href={`https://testnet.xrpl.org/transactions/${txHash}`} className="text-indigo-600 hover:underline" target="_blank">→</a>}
      <span className="text-xs text-muted-foreground">{formatTime(timestamp)}</span>
    </div>
  );
}
```

### CodeBlock

```tsx
function CodeBlock({ children, language }: ...) {
  return (
    <pre className="bg-slate-950 dark:bg-slate-900 text-slate-50 rounded-lg p-4 overflow-x-auto font-mono text-sm border border-slate-800">
      <code className={`language-${language}`}>{children}</code>
    </pre>
  );
}
```

## 8. 아이콘

`lucide-react` (shadcn 호환):
- `Lock` / `Unlock` — locked/unlocked
- `CheckCircle2` — done
- `XCircle` — failed
- `Loader2` — active (`animate-spin`)
- `Circle` — todo
- `ExternalLink` — testnet explorer
- `Code2` — developer DX 강조
- `Zap` — fast finality

## 9. 데모 페이지 와이어프레임

`docs/design/UX_GUIDE.md` §2 참조.

## 10. 참고 (디자인 출처)

- `블루노드/claude작업/design_research/showcase_sites.md` (Land-book SaaS · Lapa Ninja fintech · awesome-shadcn-ui)
- shadcn/ui 공식: https://ui.shadcn.com/
- Stripe Docs (영감): https://stripe.com/docs (clean, code-first)
- Linear / Vercel docs 톤 참조

## 11. 안티 패턴 (절대 X)

- **dark crypto 톤** (네온 + 형광 + 글래스모피즘 과다)
- **gradient 남발** (1개 이하 권장)
- **이모지 강조** (코드 외 X, status는 lucide 아이콘 사용)
- **fancy 애니메이션** (사용자 주의 산만 — fade-in 단계 이상의 모션 X)
- **카드/버튼 색상 다양화** (primary 하나만, 나머지 secondary/ghost)
