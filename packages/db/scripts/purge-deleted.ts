/**
 * Erases for good the patient files that were deleted (by the patient or the doctor) more than 30 days ago:
 *   npm run patients:purge -w packages/db            # shows what would be erased
 *   npm run patients:purge -w packages/db -- --yes   # erases
 * Removes every health record of those patients and her login. The audit log keeps only ids, no health data.
 */
import { PrismaClient } from "@prisma/client";

const GRACE_DAYS = 30; // keep in step with DELETE_GRACE_DAYS in packages/core/src/privacy.ts
const prisma = new PrismaClient();

async function main() {
  const before = new Date(Date.now() - GRACE_DAYS * 86_400_000);
  const due = await prisma.patient.findMany({ where: { deletedAt: { lt: before } }, select: { id: true, userId: true, phone: true, deletedAt: true } });
  console.log(`${due.length} file(s) deleted before ${before.toISOString().slice(0, 10)}`);
  if (!process.argv.includes("--yes") || due.length === 0) return;
  for (const p of due) {
    const where = { patientId: p.id };
    await prisma.$transaction([
      prisma.doseEvent.deleteMany({ where }),
      prisma.prescription.deleteMany({ where }),
      prisma.dangerReport.deleteMany({ where }),
      prisma.homeReading.deleteMany({ where }),
      prisma.message.deleteMany({ where }),
      prisma.alert.deleteMany({ where }),
      prisma.cycleLog.deleteMany({ where }),
      prisma.contraception.deleteMany({ where }),
      prisma.pregnancy.deleteMany({ where }),
      prisma.appointment.deleteMany({ where }),
      prisma.patient.delete({ where: { id: p.id } }),
      prisma.otpCode.deleteMany({ where: { phone: p.phone } }),
      ...(p.userId ? [prisma.pushToken.deleteMany({ where: { userId: p.userId } }), prisma.session.deleteMany({ where: { userId: p.userId } }), prisma.user.delete({ where: { id: p.userId } })] : []),
      prisma.auditLog.create({ data: { action: "patient.purge", target: p.id, meta: JSON.stringify({ by: "cli" }) } }),
    ]);
    console.log(`erased ${p.id}`);
  }
}

main().finally(() => prisma.$disconnect());
