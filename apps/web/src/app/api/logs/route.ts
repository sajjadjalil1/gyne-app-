import { z } from "zod";
import { prisma } from "@gyne/db";
import { startOfDay, subDays } from "date-fns";
import { handle, json, parseBody, requirePatient } from "@/lib/api";
import { audit } from "@/lib/auth";

export const GET = handle(async (req) => {
  const { patient } = await requirePatient();
  const days = Number(new URL(req.url).searchParams.get("days") ?? 120);
  const logs = await prisma.cycleLog.findMany({ where: { patientId: patient.id, date: { gte: subDays(new Date(), Math.min(days, 400)) } }, orderBy: { date: "asc" } });
  return json({ logs });
});

const LogSchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  bleeding: z.boolean().optional(),
  flow: z.enum(["SPOTTING", "LIGHT", "MEDIUM", "HEAVY"]).nullable().optional(),
  pain: z.number().int().min(0).max(10).nullable().optional(),
  /** feeling (good/soso/bad) or a mood key; one field, one place */
  mood: z.string().max(40).nullable().optional(),
  symptoms: z.array(z.string().max(30)).max(16).optional(),
  note: z.string().max(500).nullable().optional(),
});

const DANGER_KEYS = ["bleeding", "waters", "headache", "vision", "swelling", "abdopain", "nomove", "fever"];

/**
 * One row per day. In pregnancy, bleeding is never stored as a period: it becomes
 * the "نزيف" danger sign and a danger report, and the flow field is dropped.
 */
export const PUT = handle(async (req) => {
  const { patient, claims } = await requirePatient();
  const b = await parseBody(req, LogSchema);
  const date = startOfDay(new Date(b.date));
  const preg = await prisma.pregnancy.findFirst({ where: { patientId: patient.id, active: true } });
  let symptoms = b.symptoms ?? [];
  let bleeding = b.bleeding ?? b.flow != null;
  let flow = b.flow ?? null;
  if (preg && (bleeding || flow)) { symptoms = Array.from(new Set([...symptoms, "bleeding"])); bleeding = false; flow = null; }
  const dangers = preg ? symptoms.filter((s) => DANGER_KEYS.includes(s)) : [];
  const data = { bleeding, flow, pain: b.pain ?? null, mood: b.mood ?? null, symptoms: symptoms.length ? symptoms.join(",") : null, note: b.note ?? null };
  const log = await prisma.cycleLog.upsert({ where: { patientId_date: { patientId: patient.id, date } }, create: { patientId: patient.id, date, ...data }, update: data });
  if (dangers.length) await prisma.dangerReport.create({ data: { patientId: patient.id, signs: dangers.join(","), action: "NONE", source: "checkin" } });
  await audit("log.upsert", { actorId: claims.sub, target: patient.id, meta: { date, dangers } });
  return json({ log, dangers });
});
