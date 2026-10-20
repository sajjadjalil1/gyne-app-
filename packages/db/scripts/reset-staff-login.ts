/**
 * A staff member lost the phone with the authenticator app and all recovery codes:
 *   npm run staff:reset-login -w packages/db -- 07801234567
 * Clears the password and authenticator and signs the account out everywhere.
 * Next login they choose "أول مرة" and set both up again after an SMS code.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const phone = (process.argv[2] ?? "").replace(/\D/g, "");
  if (!/^07\d{9}$/.test(phone)) throw new Error("Usage: staff:reset-login -- 07XXXXXXXXX");
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || user.role === "PATIENT") throw new Error(`No staff account for ${phone}`);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: null, totpSecret: null, totpEnabledAt: null, totpLastStep: null, recoveryCodes: null, failedLogins: 0, lockedUntil: null } }),
    prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.auditLog.create({ data: { action: "staff.login.reset", target: user.id, meta: JSON.stringify({ by: "cli" }) } }),
  ]);
  console.log(`Login reset for ${user.name} (${phone}). They set up a new password and authenticator on next login.`);
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
