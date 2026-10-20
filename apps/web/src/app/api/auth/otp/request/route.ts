import { z } from "zod";
import { prisma } from "@gyne/db";
import { handle, json, parseBody, fail } from "@/lib/api";
import { audit, issueOtp, normalizePhone, otpRateLimited } from "@/lib/auth";
import { sendSms } from "@/lib/sms";
import { clientIp, rateLimited } from "@/lib/rate-limit";

export const POST = handle(async (req) => {
  if (rateLimited(`otp-ip:${await clientIp()}`, 10, 15 * 60_000)) return fail(429, "طلبات كثيرة. حاولي بعد 15 دقيقة.");
  const { phone: raw } = await parseBody(req, z.object({ phone: z.string().min(8).max(20) }));
  const phone = normalizePhone(raw);
  if (!phone) return fail(400, "رقم الهاتف غير صحيح. مثال: 07801234567");
  if (otpRateLimited(phone)) return fail(429, "طلبات كثيرة. حاولي بعد 15 دقيقة.");
  const user = await prisma.user.findUnique({ where: { phone } });
  // Always respond the same way so phone numbers cannot be enumerated.
  if (user) {
    const { code } = await issueOtp(phone);
    await sendSms(phone, `رمز الدخول إلى عيادتك: ${code}. صالح لخمس دقائق.`);
    await audit("otp.request", { actorId: user.id });
    if (process.env.NODE_ENV !== "production" && process.env.EXPOSE_DEV_OTP === "1") return json({ ok: true, devCode: code });
  }
  return json({ ok: true });
});
