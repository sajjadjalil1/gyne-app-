import { prisma, type AttachmentKind, type Patient, type Prisma } from "@gyne/db";
import { autoReply, bpLevel, isUrgentText } from "@gyne/core";

export type NewAttachment = { kind: AttachmentKind; mime: string; size: number; durationSec: number | null; storage: string; key: string | null; data: Uint8Array | null; sha256: string };

/** What the app and the dashboard need about an attachment; never the bytes. */
export const ATTACHMENT_PUBLIC = { select: { id: true, kind: true, mime: true, size: true, durationSec: true } } satisfies Prisma.Message$attachmentArgs;

/**
 * A message from the patient: saved with the instant receipt (so chat is never mistaken for an emergency line),
 * and danger words in it raise a danger report. Shared by text messages and photo / voice messages.
 */
export async function createPatientMessage(patient: Patient, body: string, attachment?: NewAttachment) {
  const [clinic, lastBp, preg] = await Promise.all([
    prisma.clinic.findUniqueOrThrow({ where: { id: patient.clinicId } }),
    prisma.homeReading.findFirst({ where: { patientId: patient.id, kind: "BP" }, orderBy: { takenAt: "desc" } }),
    prisma.pregnancy.findFirst({ where: { patientId: patient.id, active: true } }),
  ]);
  const urgent = isUrgentText(body);
  const bpHigh = !!lastBp && bpLevel(lastBp.systolic ?? 0, lastBp.diastolic ?? 0) !== "ok";
  const message = await prisma.$transaction(async (tx) => {
    const m = await tx.message.create({
      data: { patientId: patient.id, fromPatient: true, body, urgent, ...(attachment ? { attachment: { create: { ...attachment, data: attachment.data ? Buffer.from(attachment.data) : null, patientId: patient.id } } } : {}) },
      include: { attachment: ATTACHMENT_PUBLIC },
    });
    await tx.message.create({ data: { patientId: patient.id, fromPatient: false, auto: true, body: autoReply(clinic.replyHours) } });
    if (urgent) await tx.dangerReport.create({ data: { patientId: patient.id, signs: "message", action: "NONE", source: "message" } });
    return m;
  });
  return { message, urgent, escalate: urgent && (bpHigh || !!preg), bpHigh };
}
