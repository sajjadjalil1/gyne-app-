"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@gyne/db";
import { requireStaff } from "@/lib/api";
import { audit, normalizePhone } from "@/lib/auth";
import { PRESCRIBERS } from "@/lib/roles";

export type FormState = { error?: string; ok?: string } | undefined;

const Schema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().max(20),
  role: z.enum(["DOCTOR", "NURSE", "RECEPTION"]),
});

/** Doctor-only. The new member activates the account themselves: SMS code, then password and authenticator app. */
export async function addStaff(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireStaff(PRESCRIBERS).catch(() => ({ user: null }));
  if (!user) return { error: "بس الطبيب يكدر يضيف موظفين" };
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "تأكد من الاسم والدور" };
  const { name, role } = parsed.data;
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { error: "رقم الهاتف غير صحيح. مثال: 07801234567" };
  if (await prisma.user.findUnique({ where: { phone } })) return { error: "هذا الرقم مسجّل من قبل" };
  const created = await prisma.user.create({ data: { clinicId: user.clinicId, role, name, phone } }).catch(() => null);
  if (!created) return { error: "هذا الرقم مسجّل من قبل" };
  await audit("staff.create", { actorId: user.id, target: created.id, meta: { role } });
  revalidatePath("/doctor/staff");
  return { ok: `انضاف ${name}. يفتح صفحة الدخول ويضغط «أول مرة؟ فعّل حسابك» ويكتب رقمه.` };
}
