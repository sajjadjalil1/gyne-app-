import { z } from "zod";
import { prisma } from "@gyne/db";
import { handle, json, parseBody, fail } from "@/lib/api";
import { audit, createSession, normalizePhone, verifyOtp } from "@/lib/auth";

export const POST = handle(async (req) => {
  const body = await parseBody(req, z.object({ phone: z.string(), code: z.string().length(6), client: z.enum(["mobile", "web"]).default("mobile") }));
  const phone = normalizePhone(body.phone);
  if (!phone) return fail(400, "رقم الهاتف غير صحيح");
  const user = await prisma.user.findUnique({ where: { phone }, include: { patient: true } });
  const ok = user ? await verifyOtp(phone, body.code) : false;
  if (!ok || !user) {
    await audit("otp.fail", { meta: { phone } });
    return fail(401, "الرمز غير صحيح أو منتهي");
  }
  if (body.client === "web" && user.role === "PATIENT") return fail(403, "حساب المريضة يعمل من التطبيق فقط");
  const { token, expiresAt } = await createSession(user.id, user.role, req.headers.get("user-agent"));
  await audit("login", { actorId: user.id, meta: { client: body.client } });
  const res = json({ token, expiresAt, user: { id: user.id, name: user.name, role: user.role, patientId: user.patient?.id ?? null } });
  if (body.client === "web") {
    res.cookies.set("gyne_staff", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: expiresAt, path: "/" });
  }
  return res;
});
