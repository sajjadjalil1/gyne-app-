import { z } from "zod";
import { prisma } from "@gyne/db";
import { handle, json, parseBody, requirePatient } from "@/lib/api";
import { audit } from "@/lib/auth";

const Schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("BP"), systolic: z.number().int().min(60).max(260), diastolic: z.number().int().min(30).max(160), takenAt: z.string().datetime().optional(), note: z.string().max(300).optional() }),
  z.object({ kind: z.literal("WEIGHT"), value: z.number().min(25).max(250), takenAt: z.string().datetime().optional() }),
  z.object({ kind: z.literal("GLUCOSE"), value: z.number().min(20).max(600), takenAt: z.string().datetime().optional(), note: z.string().max(100).optional() }),
  z.object({ kind: z.literal("KICKS"), value: z.number().int().min(0).max(100), takenAt: z.string().datetime().optional(), note: z.string().max(100).optional() }),
]);

export const POST = handle(async (req) => {
  const { patient, claims } = await requirePatient();
  const b = await parseBody(req, Schema);
  const takenAt = b.takenAt ? new Date(b.takenAt) : new Date();
  const reading = await prisma.homeReading.create({
    data: { patientId: patient.id, kind: b.kind, takenAt, systolic: b.kind === "BP" ? b.systolic : null, diastolic: b.kind === "BP" ? b.diastolic : null, value: b.kind === "BP" ? null : b.value, note: "note" in b ? b.note : null },
  });
  await audit("reading.create", { actorId: claims.sub, target: patient.id, meta: { kind: b.kind } });
  return json({ reading }, { status: 201 });
});

export const GET = handle(async (req) => {
  const { patient } = await requirePatient();
  const kind = z.enum(["BP", "WEIGHT", "GLUCOSE", "KICKS"]).nullable().catch(null).parse(new URL(req.url).searchParams.get("kind"));
  const readings = await prisma.homeReading.findMany({ where: { patientId: patient.id, ...(kind ? { kind } : {}) }, orderBy: { takenAt: "desc" }, take: 60 });
  return json({ readings });
});
