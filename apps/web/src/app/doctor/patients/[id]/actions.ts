"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@gyne/db";
import { formularyItem } from "@gyne/core";
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

/** "Prescribe once, remind automatically": the only place a dose is typed. */
export async function addPrescription(formData: FormData) {
  const patientId = String(formData.get("patientId") ?? "");
  const ctx = await ownPatient(patientId);
  if (!ctx) return;
  const drug = String(formData.get("drug") ?? "OTHER");
  const f = formularyItem(drug);
  const label = String(formData.get("label") ?? "").trim() || f.label;
  const num = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v ? Number(v) : null; };
  const date = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v ? new Date(v) : null; };
  const times = String(formData.get("times") ?? "").trim().split(/[,\s]+/).filter((x) => /^\d{1,2}:\d{2}$/.test(x)).map((x) => x.padStart(5, "0")).join(",");
  await prisma.prescription.create({
    data: {
      clinicId: ctx.user.clinicId, patientId, drug, label, strength: String(formData.get("strength") ?? "").trim() || null,
      dose: String(formData.get("dose") ?? "").trim() || f.defaultDose, timesPerDay: Math.min(4, Math.max(1, num("timesPerDay") ?? f.timesPerDay)),
      timing: (String(formData.get("timing") ?? f.timing) as "ANY"), times: times || null,
      startAt: date("startAt"), startWeek: num("startWeek"), stopAt: date("stopAt"), stopWeek: num("stopWeek"),
      indication: String(formData.get("indication") ?? "").trim() || null, criticality: formData.get("criticality") === "HIGH" ? "HIGH" : "NORMAL",
      supplyCount: num("supplyCount"), supplyAt: num("supplyCount") ? new Date() : null, createdById: ctx.user.id, reviewedAt: new Date(),
    },
  });
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
