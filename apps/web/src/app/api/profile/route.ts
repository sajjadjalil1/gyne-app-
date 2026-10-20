import { z } from "zod";
import { prisma } from "@gyne/db";
import { handle, json, parseBody, requirePatient } from "@/lib/api";
import { audit } from "@/lib/auth";

const Schema = z.object({
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  sleepTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  ramadanMode: z.boolean().optional(),
  detailedNotifications: z.boolean().optional(),
});

export const PATCH = handle(async (req) => {
  const { patient, claims } = await requirePatient();
  const b = await parseBody(req, Schema);
  const updated = await prisma.patient.update({ where: { id: patient.id }, data: b, select: { wakeTime: true, sleepTime: true, ramadanMode: true, detailedNotifications: true } });
  await audit("profile.update", { actorId: claims.sub, target: patient.id, meta: b });
  return json({ patient: updated });
});
