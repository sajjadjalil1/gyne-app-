import { SignJWT, jwtVerify } from "jose";
import { createHash } from "node:crypto";
import { prisma, type User } from "@gyne/db";
import { audit, createSession } from "./auth";
import { HttpError, json } from "./api";

/**
 * Staff sign-in, two ways in:
 *  - first time (or after a reset): SMS code -> choose password -> scan QR -> confirm a code -> recovery codes
 *  - every day after that: phone + password -> 6-digit code from the authenticator app (or a recovery code)
 * Between steps the browser holds a short-lived signed "step" token; no session exists until the last step.
 */

type Step = "setup" | "mfa";
const STEP_MINUTES: Record<Step, number> = { setup: 15, mfa: 5 };

const stepKey = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (32+ chars)");
    return new TextEncoder().encode("dev-only-step-secret-change-me-dev-only-step-secret");
  }
  return new TextEncoder().encode(`step:${s}`);
};

/** Ties a step token to the account's current password, so changing or resetting it voids tokens issued before. */
const pwTag = (u: Pick<User, "passwordHash">) => createHash("sha256").update(u.passwordHash ?? "-").digest("hex").slice(0, 16);

export async function signStep(user: Pick<User, "id" | "passwordHash">, step: Step): Promise<string> {
  return new SignJWT({ step, pw: pwTag(user) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${STEP_MINUTES[step]}m`)
    .sign(stepKey());
}

export async function readStep(token: string, step: Step): Promise<User> {
  try {
    const { payload } = await jwtVerify(token, stepKey(), { algorithms: ["HS256"] });
    if (payload.step !== step) throw new Error("wrong step");
    const user = await prisma.user.findUnique({ where: { id: payload.sub as string } });
    if (!user || user.role === "PATIENT" || pwTag(user) !== payload.pw) throw new Error("stale");
    return user;
  } catch {
    throw new HttpError(401, "انتهت الخطوة. ابدأ تسجيل الدخول من جديد.");
  }
}

export const MAX_FAILED = 8;
export const LOCK_MINUTES = 15;

/** Wrong password or wrong code: count it, and lock the account for a while after too many. */
export async function recordFailure(userId: string) {
  const u = await prisma.user.update({ where: { id: userId }, data: { failedLogins: { increment: 1 } } });
  if (u.failedLogins >= MAX_FAILED) {
    await prisma.user.update({ where: { id: userId }, data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } });
    await audit("staff.locked", { actorId: userId });
  }
}

export const isLocked = (u: Pick<User, "lockedUntil">) => !!u.lockedUntil && u.lockedUntil > new Date();

/** Last step passed: open a 12-hour dashboard session and set the cookie. */
export async function finishStaffLogin(user: User, req: Request, extra: Record<string, unknown> = {}) {
  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  const { token, expiresAt } = await createSession(user.id, user.role, req.headers.get("user-agent"), "web");
  await audit("login", { actorId: user.id, meta: { client: "web", mfa: true } });
  const res = json({ ok: true, user: { id: user.id, name: user.name, role: user.role }, ...extra });
  res.cookies.set("gyne_staff", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: expiresAt, path: "/" });
  return res;
}
