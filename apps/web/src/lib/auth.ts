import { createHash, randomInt, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { addMinutes, addDays } from "date-fns";
import { prisma, type Role } from "@gyne/db";
import { headers, cookies } from "next/headers";

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (32+ chars)");
    return new TextEncoder().encode("dev-only-secret-change-me-dev-only-secret-change-me");
  }
  return new TextEncoder().encode(s);
};

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const OTP_TTL_MIN = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const SESSION_DAYS = 30;

/** Iraqi mobile numbers: 07XXXXXXXXX (11 digits). Also accept +9647… */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (/^07\d{9}$/.test(digits)) return digits;
  if (/^9647\d{9}$/.test(digits)) return "0" + digits.slice(3);
  return null;
}

// Simple in-memory rate limit per phone (per instance). Replace with Redis in multi-instance deployments.
const otpRequests = new Map<string, number[]>();
export function otpRateLimited(phone: string, now = Date.now()): boolean {
  const windowMs = 15 * 60 * 1000;
  const arr = (otpRequests.get(phone) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= 3) return true;
  arr.push(now);
  otpRequests.set(phone, arr);
  return false;
}

export async function issueOtp(phone: string): Promise<{ code: string; expiresAt: Date }> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = addMinutes(new Date(), OTP_TTL_MIN);
  await prisma.otpCode.updateMany({ where: { phone, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.otpCode.create({ data: { phone, codeHash: sha256(`${phone}:${code}`), expiresAt } });
  return { code, expiresAt };
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const rec = await prisma.otpCode.findFirst({ where: { phone, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!rec) return false;
  if (rec.attempts >= OTP_MAX_ATTEMPTS) return false;
  const ok = rec.codeHash === sha256(`${phone}:${code}`);
  await prisma.otpCode.update({ where: { id: rec.id }, data: ok ? { usedAt: new Date() } : { attempts: { increment: 1 } } });
  return ok;
}

export type TokenClaims = { sub: string; role: Role; sid: string };

export async function createSession(userId: string, role: Role, userAgent?: string | null): Promise<{ token: string; expiresAt: Date }> {
  const raw = randomBytes(32).toString("hex");
  const expiresAt = addDays(new Date(), SESSION_DAYS);
  const session = await prisma.session.create({ data: { userId, tokenHash: sha256(raw), userAgent: userAgent ?? undefined, expiresAt } });
  const token = await new SignJWT({ role, sid: session.id, k: raw })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret());
  return { token, expiresAt };
}

export async function verifyToken(token: string): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const sid = payload.sid as string, k = payload.k as string;
    const session = await prisma.session.findUnique({ where: { id: sid } });
    if (!session || session.revokedAt || session.expiresAt < new Date() || session.tokenHash !== sha256(k)) return null;
    return { sub: payload.sub as string, role: payload.role as Role, sid };
  } catch {
    return null;
  }
}

export async function revokeSession(sid: string) {
  await prisma.session.update({ where: { id: sid }, data: { revokedAt: new Date() } }).catch(() => {});
}

/** Reads a Bearer token (mobile) or the staff cookie (web dashboard). */
export async function currentClaims(): Promise<TokenClaims | null> {
  const h = await headers();
  const auth = h.get("authorization");
  if (auth?.startsWith("Bearer ")) return verifyToken(auth.slice(7));
  const c = await cookies();
  const cookieToken = c.get("gyne_staff")?.value;
  return cookieToken ? verifyToken(cookieToken) : null;
}

export async function audit(action: string, opts: { actorId?: string | null; target?: string | null; meta?: unknown } = {}) {
  const h = await headers().catch(() => null);
  const ip = h?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await prisma.auditLog.create({ data: { action, actorId: opts.actorId ?? null, target: opts.target ?? null, meta: opts.meta ? JSON.stringify(opts.meta) : null, ip } }).catch(() => {});
}
