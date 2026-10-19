"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@gyne/db";
import { requireStaff } from "@/lib/api";
import { audit } from "@/lib/auth";

export async function replyToPatient(formData: FormData) {
  const { user } = await requireStaff();
  const patientId = String(formData.get("patientId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!patientId || !body || body.length > 1000) return;
  const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId: user.clinicId } });
  if (!patient) return;
  await prisma.message.create({ data: { patientId, fromPatient: false, body } });
  await audit("message.reply", { actorId: user.id, target: patientId });
  revalidatePath(`/doctor/patients/${patientId}`);
}
