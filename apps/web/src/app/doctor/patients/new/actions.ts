"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@gyne/db";
import { resolveDating } from "@gyne/core";
import { requireStaff } from "@/lib/api";
import { audit, normalizePhone } from "@/lib/auth";

export type FormState = { error?: string } | undefined;

const day = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(`${v}T00:00:00Z`)).nullable());

const Schema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().max(20),
  birthDate: day,
  bloodGroup: z.enum(["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).catch(""),
  mode: z.enum(["pregnancy", "cycle"]),
  lmp: day,
  usDate: day,
  usWeeks: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(5).max(40).nullable()),
  lastPeriod: day,
});

/** Registers a patient: her login (phone only, she signs in by SMS code) and her file, in one transaction. */
export async function addPatient(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff().catch(() => ({ user: null }));
  if (!user) return { error: "ما عندك صلاحية تضيف مريضة" };
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "تأكد من الاسم والتواريخ" };
  const b = parsed.data;
  const phone = normalizePhone(b.phone);
  if (!phone) return { error: "رقم الهاتف غير صحيح. مثال: 07801234567" };
  const today = new Date();
  if (!b.birthDate || b.birthDate > today || today.getUTCFullYear() - b.birthDate.getUTCFullYear() > 70) return { error: "تاريخ الميلاد غير صحيح" };

  let dating: ReturnType<typeof resolveDating> | null = null;
  if (b.mode === "pregnancy") {
    if (b.lmp && b.lmp > today) return { error: "تاريخ آخر دورة بالمستقبل" };
    if (b.usDate && b.usDate > today) return { error: "تاريخ السونار بالمستقبل" };
    const us = b.usDate && b.usWeeks ? { usDate: b.usDate, usGaDays: b.usWeeks * 7 } : {};
    if (!b.lmp && !("usDate" in us)) return { error: "للحامل: اكتب تاريخ آخر دورة، أو تاريخ السونار وعمر الحمل بيه" };
    dating = resolveDating({ lmp: b.lmp, ...us });
    if (dating.eddFinal < today) return { error: "موعد الولادة المحسوب صار بالماضي. تأكد من التاريخ" };
  } else if (b.lastPeriod && b.lastPeriod > today) return { error: "تاريخ آخر دورة بالمستقبل" };

  if (await prisma.user.findUnique({ where: { phone } })) return { error: "هذا الرقم مسجّل من قبل" };

  const rhNegative = b.bloodGroup.endsWith("-");
  const patient = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { clinicId: user.clinicId, role: "PATIENT", name: b.name, phone } });
    const p = await tx.patient.create({ data: { clinicId: user.clinicId, userId: u.id, name: b.name, phone, birthDate: b.birthDate!, bloodGroup: b.bloodGroup || null } });
    if (dating) {
      await tx.pregnancy.create({ data: { patientId: p.id, lmp: b.lmp, usDate: b.usWeeks ? b.usDate : null, usGaDays: b.usDate && b.usWeeks ? b.usWeeks * 7 : null, eddFinal: dating.eddFinal, datingMethod: dating.method, rhNegative } });
    } else if (b.lastPeriod) {
      await tx.cycleLog.create({ data: { patientId: p.id, date: b.lastPeriod, bleeding: true } });
    }
    return p;
  }).catch(() => null);
  if (!patient) return { error: "هذا الرقم مسجّل من قبل" };
  await audit("patient.create", { actorId: user.id, target: patient.id, meta: { mode: b.mode } });
  redirect(`/doctor/patients/${patient.id}`);
}
