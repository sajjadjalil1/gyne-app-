import { prisma } from "@gyne/db";
import { audit } from "./auth";

/**
 * Soft delete of a patient file, by the patient herself ("احذفي حسابي") or by the doctor (file added by mistake).
 * In one transaction: the file is hidden everywhere, her login is switched off and every session ends, and her
 * phone number is released so the clinic can register it again later. The health data stays (hidden) for
 * DELETE_GRACE_DAYS in case of a mistake, then packages/db/scripts/purge-deleted.ts erases it for good.
 */
export async function softDeletePatient(patientId: string, by: { actorId: string; who: "patient" | "staff" }) {
  const now = new Date();
  const p = await prisma.patient.findFirst({ where: { id: patientId, deletedAt: null } });
  if (!p) return false;
  await prisma.$transaction(async (tx) => {
    await tx.patient.update({ where: { id: p.id }, data: { deletedAt: now, deletedBy: by.who === "patient" ? "patient" : by.actorId } });
    if (p.userId) {
      await tx.user.update({ where: { id: p.userId }, data: { disabledAt: now, phone: `deleted:${p.userId}` } });
      await tx.session.updateMany({ where: { userId: p.userId, revokedAt: null }, data: { revokedAt: now } });
    }
    await tx.appointment.updateMany({ where: { patientId: p.id, status: "SCHEDULED", startsAt: { gte: now } }, data: { status: "CANCELLED" } });
  });
  await audit(by.who === "patient" ? "patient.delete.self" : "patient.delete.staff", { actorId: by.actorId, target: p.id });
  return true;
}
