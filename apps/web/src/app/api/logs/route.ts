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
  mood: z.string().max(40).nullable().optional(),
  symptoms: z.array(z.string().max(30)).max(12).optional(),
  note: z.string().max(500).nullable().optional(),
});

export const PUT = handle(async (req) => {
  const { patient, claims } = await requirePatient();
  const b = await parseBody(req, LogSchema);
  const date = startOfDay(new Date(b.date));
  const data = { bleeding: b.bleeding ?? (b.flow != null), flow: b.flow ?? null, pain: b.pain ?? null, mood: b.mood ?? null, symptoms: b.symptoms ? b.symptoms.join(",") : null, note: b.note ?? null };
  const log = await prisma.cycleLog.upsert({ where: { patientId_date: { patientId: patient.id, date } }, create: { patientId: patient.id, date, ...data }, update: data });
  await audit("log.upsert", { actorId: claims.sub, target: patient.id, meta: { date } });
  return json({ log });
});
