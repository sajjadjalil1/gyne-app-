import type { NextConfig } from "next";
import path from "node:path";

const dev = process.env.NODE_ENV !== "production";

/** Second line of defence against XSS: even if markup slipped through, foreign scripts and frames cannot load. */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  transpilePackages: ["@gyne/core", "@gyne/db"],
  serverExternalPackages: ["@prisma/client"],
  turbopack: { root: path.join(__dirname, "../..") },
  poweredByHeader: false,
  // Keep source maps off the public site (Next's default, pinned here so nobody flips it by accident).
  productionBrowserSourceMaps: false,
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: csp },
      ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
    ] }];
  },
};

export default nextConfig;
