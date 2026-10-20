import { z } from "zod";
import { prisma } from "@gyne/db";
import { handle, HttpError, json, parseBody, requirePatient } from "@/lib/api";
import { audit } from "@/lib/auth";

const Schema = z.object({
  prescriptionId: z.string().min(1),
  dueAt: z.string().datetime(),
  status: z.enum(["TAKEN", "LATE", "SKIPPED"]),
  reason: z.string().max(80).optional(),
});

/** The patient can log, snooze and skip a dose; she can never change the dose itself. */
export const POST = handle(async (req) => {
  const { patient, claims } = await requirePatient();
  const b = await parseBody(req, Schema);
  const rx = await prisma.prescription.findFirst({ where: { id: b.prescriptionId, patientId: patient.id, active: true } });
  if (!rx) throw new HttpError(404, "الدواء غير موجود");
  const dueAt = new Date(b.dueAt);
  const late = b.status === "TAKEN" && Date.now() - dueAt.getTime() > 2 * 3600_000;
  const status = late ? "LATE" : b.status;
  const event = await prisma.doseEvent.upsert({
    where: { prescriptionId_dueAt: { prescriptionId: rx.id, dueAt } },
    create: { patientId: patient.id, prescriptionId: rx.id, dueAt, status, reason: b.reason ?? null },
    update: { status, reason: b.reason ?? null, loggedAt: new Date() },
  });
  await audit("dose.log", { actorId: claims.sub, target: patient.id, meta: { rx: rx.id, status } });
  return json({ event });
});
