import { z } from "zod";
import QRCode from "qrcode";
import { prisma } from "@gyne/db";
import { handle, json, parseBody, fail } from "@/lib/api";
import { audit } from "@/lib/auth";
import { hashPassword, newTotpSecret, otpauthUri, PASSWORD_MIN, sealSecret } from "@/lib/mfa";
import { readStep, signStep } from "@/lib/staff-auth";

/** First-time setup, after the SMS code: save the password and hand back a QR for the authenticator app. */
export const POST = handle(async (req) => {
  const b = await parseBody(req, z.object({ setupToken: z.string().max(2000), password: z.string().min(PASSWORD_MIN, `كلمة السر لازم ${PASSWORD_MIN} أحرف أو أكثر`).max(128) }));
  const user = await readStep(b.setupToken, "setup");
  if (user.totpEnabledAt) return fail(409, "الحساب مفعّل من قبل");
  if (b.password.replace(/\d/g, "").length < 3 || b.password.includes(user.phone.slice(-6))) return fail(400, "اختار كلمة سر أصعب، مو أرقام بس ولا رقم الهاتف.");
  const secret = newTotpSecret();
  const updated = await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(b.password), totpSecret: sealSecret(secret), totpLastStep: null } });
  await audit("staff.setup.password", { actorId: user.id });
  const clinic = await prisma.clinic.findUnique({ where: { id: user.clinicId } });
  const uri = otpauthUri(secret, user.phone, clinic?.name ?? "عيادتي");
  return json({
    // The password just changed, so the old setup token is void; this one carries on to the confirm step.
    setupToken: await signStep(updated, "setup"),
    qr: await QRCode.toDataURL(uri, { margin: 1, width: 240, errorCorrectionLevel: "M" }),
    secret: secret.match(/.{1,4}/g)!.join(" "),
  });
});
