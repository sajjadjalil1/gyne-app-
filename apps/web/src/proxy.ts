import { NextResponse, type NextRequest } from "next/server";

/**
 * Browser origins allowed to call the API (the Expo web preview, a hosted PWA). Native apps need no CORS.
 * The localhost previews are a development default only; in production nothing is allowed unless ALLOWED_ORIGINS lists it.
 */
const devOrigins = process.env.NODE_ENV === "production" ? "" : "http://localhost:8081,http://localhost:19006";
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? devOrigins).split(",").map((s) => s.trim()).filter(Boolean);

function withCors(res: NextResponse, origin: string | null) {
  if (origin && allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Headers", "authorization, content-type");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

const hostOf = (u: string) => { try { return new URL(u).host; } catch { return null; } };

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return withCors(new NextResponse(null, { status: 204 }), origin);
    // CSRF: a write that relies on the dashboard cookie (no Bearer token) must come from this site.
    const unsafe = !["GET", "HEAD"].includes(req.method);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (unsafe && req.cookies.get("gyne_staff") && !req.headers.get("authorization") && origin && hostOf(origin) !== host) {
      return NextResponse.json({ error: "طلب مرفوض" }, { status: 403 });
    }
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
