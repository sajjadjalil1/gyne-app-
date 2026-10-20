import { z } from "zod";
import { prisma } from "@gyne/db";
import { handle, HttpError, json, parseBody, requirePatient } from "@/lib/api";
import { audit } from "@/lib/auth";

/** "راح تجين؟" ايه / أريد أغيّر الموعد. Rescheduling itself stays with the clinic. */
export const POST = handle(async (req, ctx) => {
  const { patient, claims } = await requirePatient();
  const { id } = await ctx.params;
  const { coming } = await parseBody(req, z.object({ coming: z.boolean() }));
  const appt = await prisma.appointment.findFirst({ where: { id, patientId: patient.id, status: "SCHEDULED" } });
  if (!appt) throw new HttpError(404, "الموعد غير موجود");
  const updated = await prisma.appointment.update({ where: { id }, data: { confirmed: coming } });
  if (!coming) await prisma.message.create({ data: { patientId: patient.id, fromPatient: true, body: `أريد أغيّر موعد ${appt.startsAt.toISOString().slice(0, 10)}`, auto: true } });
  await audit("appointment.confirm", { actorId: claims.sub, target: patient.id, meta: { id, coming } });
  return json({ appointment: updated });
});
