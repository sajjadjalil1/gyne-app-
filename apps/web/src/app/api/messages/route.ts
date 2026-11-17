import { z } from "zod";
import { prisma } from "@gyne/db";
import { bpLevel } from "@gyne/core";
import { handle, json, parseBody, requirePatient } from "@/lib/api";
import { audit } from "@/lib/auth";
import { ATTACHMENT_PUBLIC, createPatientMessage } from "@/lib/patient-message";

export const GET = handle(async () => {
  const { patient } = await requirePatient();
  const messages = await prisma.message.findMany({ where: { patientId: patient.id }, orderBy: { createdAt: "asc" }, take: 200, include: { attachment: ATTACHMENT_PUBLIC } });
  await prisma.message.updateMany({ where: { patientId: patient.id, fromPatient: false, readAt: null }, data: { readAt: new Date() } });
  return json({ messages });
});

/**
 * Every patient message gets an instant receipt so chat is never mistaken for
 * an emergency line. Danger words plus a recent high BP escalate immediately.
 */
export const POST = handle(async (req) => {
  const { patient, claims } = await requirePatient();
  const { body } = await parseBody(req, z.object({ body: z.string().trim().min(1).max(1000) }));
  // A retry after a dropped connection resends the same text: answer with the first copy instead of a second one.
  const dup = await prisma.message.findFirst({ where: { patientId: patient.id, fromPatient: true, body, createdAt: { gte: new Date(Date.now() - 30_000) } } });
  if (dup) {
    const [lastBp, preg] = await Promise.all([
      prisma.homeReading.findFirst({ where: { patientId: patient.id, kind: "BP" }, orderBy: { takenAt: "desc" } }),
      prisma.pregnancy.findFirst({ where: { patientId: patient.id, active: true } }),
    ]);
    const bpHigh = !!lastBp && bpLevel(lastBp.systolic ?? 0, lastBp.diastolic ?? 0) !== "ok";
    return json({ message: dup, urgent: dup.urgent, escalate: dup.urgent && (bpHigh || !!preg), bpHigh });
  }
  const r = await createPatientMessage(patient, body);
  await audit("message.send", { actorId: claims.sub, target: patient.id, meta: { urgent: r.urgent } });
  return json(r, { status: 201 });
});
