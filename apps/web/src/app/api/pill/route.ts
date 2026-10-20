import { z } from "zod";
import { prisma } from "@gyne/db";
import { pillState, type PackType } from "@gyne/core";
import { handle, HttpError, json, parseBody, requirePatient } from "@/lib/api";
import { audit } from "@/lib/auth";
import { set, startOfDay } from "date-fns";

const Schema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("taken") }),
  z.object({ op: z.literal("missed"), count: z.enum(["one", "two_plus"]) }),
]);

/** Pill mode: log today's pill, or ask for the clinic-authored missed-pill steps. */
export const POST = handle(async (req) => {
  const { patient, claims } = await requirePatient();
  const b = await parseBody(req, Schema);
  const c = await prisma.contraception.findFirst({ where: { patientId: patient.id, endedAt: null, packType: { not: null } }, include: { patient: { include: { clinic: true } } } });
  if (!c || !c.packType || !c.packStartedAt) throw new HttpError(404, "ما عندچ حبوب مسجّلة");
  if (b.op === "taken") {
    const st = pillState(c.packType as PackType, c.packStartedAt, new Date());
    if (st.inFree) throw new HttpError(400, "هذا الأسبوع بدون حبوب");
    const [h, m] = (c.pillTime ?? "21:00").split(":").map(Number);
    const dueAt = set(startOfDay(new Date()), { hours: h, minutes: m, seconds: 0, milliseconds: 0 });
    const late = Date.now() - dueAt.getTime() > 3 * 3600_000;
    const event = await prisma.doseEvent.upsert({ where: { contraceptionId_dueAt: { contraceptionId: c.id, dueAt } }, create: { patientId: patient.id, contraceptionId: c.id, dueAt, status: late ? "LATE" : "TAKEN" }, update: { status: late ? "LATE" : "TAKEN", loggedAt: new Date() } });
    await audit("pill.taken", { actorId: claims.sub, target: patient.id });
    return json({ event });
  }
  const text = b.count === "one" ? c.patient.clinic.missedPillOne : c.patient.clinic.missedPillTwo;
  await prisma.message.create({ data: { patientId: patient.id, fromPatient: true, body: b.count === "one" ? "نسيت حبة وحدة من حبوب منع الحمل" : "نسيت حبتين أو أكثر من حبوب منع الحمل", auto: true } });
  await audit("pill.missed", { actorId: claims.sub, target: patient.id, meta: { count: b.count } });
  return json({ text: text ?? "راسلي العيادة وراح نگولچ شتسوين.", fromClinic: !!text });
});
