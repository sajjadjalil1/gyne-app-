import { z } from "zod";
import { prisma } from "@gyne/db";
import { handle, json, parseBody, fail } from "@/lib/api";
import { audit, normalizePhone } from "@/lib/auth";
import { burnPasswordTime, verifyPassword } from "@/lib/mfa";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { isLocked, recordFailure, signStep } from "@/lib/staff-auth";

/** Step 1 of the daily staff login: phone + password. Success hands back a 5-minute token for the authenticator code. */
export const POST = handle(async (req) => {
  const b = await parseBody(req, z.object({ phone: z.string().max(20), password: z.string().min(1).max(128) }));
  const phone = normalizePhone(b.phone);
  if (!phone) return fail(400, "رقم الهاتف غير صحيح");
  if (rateLimited(`pw-ip:${await clientIp()}`, 20, 15 * 60_000) || rateLimited(`pw:${phone}`, 10, 15 * 60_000)) return fail(429, "محاولات كثيرة. حاول بعد 15 دقيقة.");
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || user.role === "PATIENT" || user.disabledAt || !user.passwordHash || !user.totpEnabledAt) {
    await burnPasswordTime(b.password);
    // Same answer for "no such staff" and "not set up yet": the setup path starts from the SMS code anyway.
    return fail(401, "الرقم أو كلمة السر غير صحيحة. إذا هذا أول دخول لك، اختار «أول مرة».");
  }
  if (isLocked(user)) return fail(423, "الحساب مقفول مؤقتاً بسبب محاولات كثيرة. حاول بعد ربع ساعة.");
  if (!(await verifyPassword(b.password, user.passwordHash))) {
    await recordFailure(user.id);
    await audit("staff.password.fail", { actorId: user.id });
    return fail(401, "الرقم أو كلمة السر غير صحيحة. إذا هذا أول دخول لك، اختار «أول مرة».");
  }
  return json({ mfaToken: await signStep(user, "mfa") });
});
