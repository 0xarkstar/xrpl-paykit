"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Github } from "lucide-react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/quickstart", label: "Quickstart" },
  { href: "/examples", label: "Examples" },
];

export function SiteNav() {
  const pathname = usePathname();
  // checkout 페이지는 nav를 가림 (집중도)
  if (pathname?.startsWith("/checkout/")) return null;

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-background/80 border-b border-border">
      <div className="container mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>paykit</span>
          <span className="text-muted-foreground font-normal text-sm">/ xrpl</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  active
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <a
            href="http://localhost:3001"
            className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            Demo <span className="text-xs opacity-60">↗</span>
          </a>
          <a
            href="https://github.com/0xarkstar/xrpl-paykit"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1.5"
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
