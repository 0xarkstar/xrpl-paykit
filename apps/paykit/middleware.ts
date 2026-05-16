// PRD v0.2 §12.3 — /api/v1/* protected by bearer auth.

import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const apiKey = process.env.PAYKIT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
