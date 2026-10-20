"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@gyne/db";
import { z } from "zod";
import { FORMULARY, TIMING_LABEL, formularyItem, type TimingRule } from "@gyne/core";
import { requireStaff } from "@/lib/api";
import { audit } from "@/lib/auth";

async function ownPatient(patientId: string) {
  const { user } = await requireStaff();
  const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId: user.clinicId } });
  return patient ? { user, patient } : null;
}

export async function replyToPatient(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!patientId || !body || body.length > 1000) return;
  const ctx = await ownPatient(patientId);
  if (!ctx) return;
  await prisma.message.create({ data: { patientId, fromPatient: false, body, authorName: ctx.user.name } });
  await audit("message.reply", { actorId: ctx.user.id, target: patientId });
  revalidatePath(`/doctor/patients/${patientId}`);
}

const text = (max: number) => z.string().trim().max(max).transform((v) => v || null).nullable().catch(null);
const int = (min: number, max: number) => z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(min).max(max).nullable()).catch(null);
const day = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v)).nullable()).catch(null);

const RxSchema = z.object({
  drug: z.enum(FORMULARY.map((f) => f.key) as [string, ...string[]]).catch("OTHER"),
  label: text(80), strength: text(40), dose: text(80), indication: text(200),
  timesPerDay: int(1, 4),
  timing: z.enum(Object.keys(TIMING_LABEL) as [TimingRule, ...TimingRule[]]).nullable().catch(null),
  times: z.string().max(60).catch(""),
  startAt: day, stopAt: day, startWeek: int(1, 42), stopWeek: int(1, 42),
  criticality: z.enum(["HIGH", "NORMAL"]).catch("NORMAL"),
  supplyCount: int(1, 1000),
});

/** "Prescribe once, remind automatically": the only place a dose is typed. */
export async function addPrescription(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const ctx = await ownPatient(patientId);
  if (!ctx) return;
  const b = RxSchema.parse(Object.fromEntries(formData));
  const f = formularyItem(b.drug);
  const times = b.times.trim().split(/[,\s]+/).filter((x) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(x)).map((x) => x.padStart(5, "0")).slice(0, 4).join(",");
  await prisma.prescription.create({
    data: {
      clinicId: ctx.user.clinicId, patientId, drug: b.drug, label: b.label ?? f.label, strength: b.strength,
      dose: b.dose ?? f.defaultDose, timesPerDay: b.timesPerDay ?? f.timesPerDay,
      timing: b.timing ?? f.timing, times: times || null,
      startAt: b.startAt, startWeek: b.startWeek, stopAt: b.stopAt, stopWeek: b.stopWeek,
      indication: b.indication, criticality: b.criticality,
      supplyCount: b.supplyCount, supplyAt: b.supplyCount ? new Date() : null, createdById: ctx.user.id, reviewedAt: new Date(),
    },
  });
  const drug = b.drug, label = b.label ?? f.label;
  await audit("rx.create", { actorId: ctx.user.id, target: patientId, meta: { drug, label } });
  revalidatePath(`/doctor/patients/${patientId}`);
}

export async function stopPrescription(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const id = String(formData.get("id") ?? "");
  const ctx = await ownPatient(patientId);
  if (!ctx) return;
  await prisma.prescription.updateMany({ where: { id, patientId }, data: { active: false, stopAt: new Date() } });
  await audit("rx.stop", { actorId: ctx.user.id, target: patientId, meta: { id } });
  revalidatePath(`/doctor/patients/${patientId}`);
}

export async function reviewPrescription(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const id = String(formData.get("id") ?? "");
  const ctx = await ownPatient(patientId);
  if (!ctx) return;
  await prisma.prescription.updateMany({ where: { id, patientId }, data: { reviewedAt: new Date() } });
  revalidatePath(`/doctor/patients/${patientId}`);
}

export async function handleDanger(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const id = String(formData.get("id") ?? "");
  const ctx = await ownPatient(patientId);
  if (!ctx) return;
  await prisma.dangerReport.updateMany({ where: { id, patientId }, data: { handledAt: new Date() } });
  await audit("danger.handled", { actorId: ctx.user.id, target: patientId, meta: { id } });
  revalidatePath(`/doctor/patients/${patientId}`);
  revalidatePath("/doctor");
}

export async function setAppointmentPrep(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const id = String(formData.get("id") ?? "");
  const ctx = await ownPatient(patientId);
  if (!ctx) return;
  await prisma.appointment.updateMany({ where: { id, patientId }, data: { prep: String(formData.get("prep") ?? "").trim() || null, place: String(formData.get("place") ?? "").trim() || null } });
  revalidatePath(`/doctor/patients/${patientId}`);
}
