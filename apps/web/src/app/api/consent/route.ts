import { z } from "zod";
import { prisma } from "@gyne/db";
import { PRIVACY_VERSION } from "@gyne/core";
import { handle, HttpError, json, parseBody, requirePatient } from "@/lib/api";
import { audit } from "@/lib/auth";

/** The patient agrees to the current privacy policy (consent screen in the app). */
export const POST = handle(async (req) => {
  const { patient, claims } = await requirePatient();
  const { version } = await parseBody(req, z.object({ version: z.string().max(20) }));
  if (version !== PRIVACY_VERSION) throw new HttpError(409, "سياسة الخصوصية تحدّثت. افتحي التطبيق من جديد.");
  const at = new Date();
  await prisma.patient.update({ where: { id: patient.id }, data: { consentVersion: version, consentedAt: at } });
  await audit("privacy.consent", { actorId: claims.sub, target: patient.id, meta: { version } });
  return json({ ok: true, version, at });
});
