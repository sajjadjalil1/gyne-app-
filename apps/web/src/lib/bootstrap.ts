import { prisma } from "@gyne/db";
import { normalizePhone } from "./auth";

/**
 * First run on an empty database: create the clinic and the doctor's login
 * from BOOTSTRAP_CLINIC_NAME / BOOTSTRAP_DOCTOR_NAME / BOOTSTRAP_DOCTOR_PHONE.
 * Does nothing once any user exists, so it is safe to leave the variables set.
 */
export async function bootstrapIfEmpty(): Promise<void> {
  const phone = normalizePhone(process.env.BOOTSTRAP_DOCTOR_PHONE ?? "");
  if (!phone) return;
  const users = await prisma.user.count();
  if (users > 0) return;
  const clinic = await prisma.clinic.create({ data: { name: process.env.BOOTSTRAP_CLINIC_NAME?.trim() || "عيادتي" } });
  await prisma.user.create({ data: { clinicId: clinic.id, role: "DOCTOR", name: process.env.BOOTSTRAP_DOCTOR_NAME?.trim() || "الطبيب/ة", phone } });
  console.log(`[bootstrap] clinic "${clinic.name}" and doctor ${phone} created`);
}
