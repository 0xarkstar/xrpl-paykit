import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "XRPL PayKit — Stripe-like payments for XRPL",
  description: "Payment intent + hosted checkout + signed webhook SDK for the XRP Ledger.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased min-h-screen">
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
