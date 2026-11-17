import { z } from "zod";
import { prisma } from "@gyne/db";
import { handle, json, parseBody, requirePatient } from "@/lib/api";
import { audit } from "@/lib/auth";
import { isExpoToken } from "@/lib/push";

const Body = z.object({ token: z.string().trim().max(200).refine(isExpoToken, "رمز إشعارات غير صالح"), platform: z.enum(["ios", "android"]) });

/** The app registers its push token after the patient allows notifications. A token moves to whoever signed in last on that phone. */
export const POST = handle(async (req) => {
  const { claims } = await requirePatient();
  const { token, platform } = await parseBody(req, Body);
  const before = await prisma.pushToken.findUnique({ where: { token } });
  await prisma.pushToken.upsert({ where: { token }, create: { token, platform, userId: claims.sub }, update: { userId: claims.sub, platform, lastSeenAt: new Date() } });
  if (!before || before.userId !== claims.sub) await audit("push.register", { actorId: claims.sub, meta: { platform } });
  return json({ ok: true });
});

/** Called by the app on sign-out so the phone stops getting her notifications. */
export const DELETE = handle(async (req) => {
  const { claims } = await requirePatient();
  const { token } = await parseBody(req, Body.pick({ token: true }));
  await prisma.pushToken.deleteMany({ where: { token, userId: claims.sub } });
  return json({ ok: true });
});
