import { z } from "zod";
import { prisma } from "@gyne/db";
import { handle, parseBody, fail } from "@/lib/api";
import { audit } from "@/lib/auth";
import { hashRecovery, openSecret, verifyTotp } from "@/lib/mfa";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { finishStaffLogin, isLocked, readStep, recordFailure } from "@/lib/staff-auth";

/** Step 2: the 6-digit code from the authenticator app, or one recovery code (xxxx-xxxx). */
export const POST = handle(async (req) => {
  const b = await parseBody(req, z.object({ mfaToken: z.string().max(2000), code: z.string().trim().min(6).max(12) }));
  const user = await readStep(b.mfaToken, "mfa");
  if (rateLimited(`mfa-ip:${await clientIp()}`, 30, 15 * 60_000) || rateLimited(`mfa:${user.id}`, 10, 15 * 60_000)) return fail(429, "محاولات كثيرة. حاول بعد 15 دقيقة.");
  if (isLocked(user)) return fail(423, "الحساب مقفول مؤقتاً بسبب محاولات كثيرة. حاول بعد ربع ساعة.");
  if (!user.totpSecret || !user.totpEnabledAt) return fail(401, "المصادقة غير مفعّلة لهذا الحساب");

  const code = b.code.replace(/\s/g, "");
  if (/^\d{6}$/.test(code)) {
    const step = verifyTotp(openSecret(user.totpSecret), code);
    // Atomic: only a step newer than the last one used is accepted, so a seen code cannot be replayed.
    const ok = step != null && (await prisma.user.updateMany({ where: { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] }, data: { totpLastStep: step } })).count === 1;
    if (ok) return finishStaffLogin(user, req);
  } else {
    const codes: string[] = JSON.parse(user.recoveryCodes ?? "[]");
    const h = hashRecovery(code);
    if (codes.includes(h)) {
      const left = codes.filter((c) => c !== h);
      const used = await prisma.user.updateMany({ where: { id: user.id, recoveryCodes: user.recoveryCodes }, data: { recoveryCodes: JSON.stringify(left) } });
      if (used.count === 1) {
        await audit("staff.recovery.used", { actorId: user.id, meta: { left: left.length } });
        return finishStaffLogin(user, req, { recoveryLeft: left.length });
      }
    }
  }
  await recordFailure(user.id);
  await audit("staff.mfa.fail", { actorId: user.id });
  return fail(401, "الرمز غير صحيح");
});
