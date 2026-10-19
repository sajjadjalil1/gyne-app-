import { z } from "zod";
import { prisma } from "@gyne/db";
import { handle, json, parseBody, requirePatient } from "@/lib/api";
import { audit } from "@/lib/auth";

export const GET = handle(async () => {
  const { patient } = await requirePatient();
  const messages = await prisma.message.findMany({ where: { patientId: patient.id }, orderBy: { createdAt: "asc" }, take: 200 });
  await prisma.message.updateMany({ where: { patientId: patient.id, fromPatient: false, readAt: null }, data: { readAt: new Date() } });
  return json({ messages });
});

export const POST = handle(async (req) => {
  const { patient, claims } = await requirePatient();
  const { body } = await parseBody(req, z.object({ body: z.string().trim().min(1).max(1000) }));
  const message = await prisma.message.create({ data: { patientId: patient.id, fromPatient: true, body } });
  await audit("message.send", { actorId: claims.sub, target: patient.id });
  return json({ message }, { status: 201 });
});
