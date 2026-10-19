import { NextResponse, type NextRequest } from "next/server";

/** Browser origins allowed to call the API (the Expo web preview, a hosted PWA). Native apps need no CORS. */
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:8081,http://localhost:19006").split(",").map((s) => s.trim()).filter(Boolean);

function withCors(res: NextResponse, origin: string | null) {
  if (origin && allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Headers", "authorization, content-type");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return withCors(new NextResponse(null, { status: 204 }), origin);
    return withCors(NextResponse.next(), origin);
  }
  // Staff dashboard gate: no cookie, no entry. Full verification happens in the page (DB-backed session).
  if (pathname.startsWith("/doctor") && !req.cookies.get("gyne_staff")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/doctor/:path*", "/api/:path*"] };
