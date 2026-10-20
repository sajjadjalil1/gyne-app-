import { z } from "zod";
import { prisma } from "@gyne/db";
import { handle, parseBody, fail } from "@/lib/api";
import { audit } from "@/lib/auth";
import { hashRecovery, newRecoveryCodes, openSecret, verifyTotp } from "@/lib/mfa";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { finishStaffLogin, readStep } from "@/lib/staff-auth";

/** Last setup step: a code from the app proves it was scanned. Turns the authenticator on and shows recovery codes once. */
export const POST = handle(async (req) => {
  const b = await parseBody(req, z.object({ setupToken: z.string().max(2000), code: z.string().trim().length(6) }));
  const user = await readStep(b.setupToken, "setup");
  if (rateLimited(`setup-ip:${await clientIp()}`, 30, 15 * 60_000) || rateLimited(`setup:${user.id}`, 10, 15 * 60_000)) return fail(429, "محاولات كثيرة. حاول بعد 15 دقيقة.");
  if (user.totpEnabledAt) return fail(409, "الحساب مفعّل من قبل");
  if (!user.totpSecret || !user.passwordHash) return fail(400, "اختار كلمة السر أولاً");
  const step = verifyTotp(openSecret(user.totpSecret), b.code);
  if (step == null) return fail(401, "الرمز غير صحيح. تأكد إن وقت الموبايل مضبوط وجرب الرمز الجديد.");
  const codes = newRecoveryCodes();
  const done = await prisma.user.updateMany({ where: { id: user.id, totpEnabledAt: null }, data: { totpEnabledAt: new Date(), totpLastStep: step, recoveryCodes: JSON.stringify(codes.map(hashRecovery)), failedLogins: 0, lockedUntil: null } });
  if (done.count !== 1) return fail(409, "الحساب مفعّل من قبل");
  // Any session opened before 2FA existed (SMS-only) is closed.
  await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit("staff.setup.done", { actorId: user.id });
  return finishStaffLogin(user, req, { recoveryCodes: codes });
});
