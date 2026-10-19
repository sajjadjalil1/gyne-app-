import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex", display: "swap" });

export const metadata: Metadata = { title: "عيادتي | لوحة الطبيب", description: "منصة متابعة مريضات النسائية والتوليد" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={plex.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
