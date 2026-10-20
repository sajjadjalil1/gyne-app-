import { z } from "zod";
import { prisma } from "@gyne/db";
import { DANGER_LABEL } from "@gyne/core";
import { handle, json, parseBody, requirePatient } from "@/lib/api";
import { audit } from "@/lib/auth";

const Schema = z.object({
  signs: z.array(z.string().max(30)).min(1).max(8),
  action: z.enum(["ER", "CALL", "NONE"]).default("NONE"),
  source: z.enum(["button", "checkin", "message"]).default("button"),
});

/** Red button or a danger sign in the check-in: flags the doctor's worklist at once. */
export const POST = handle(async (req) => {
  const { patient, claims } = await requirePatient();
  const b = await parseBody(req, Schema);
  const report = await prisma.dangerReport.create({ data: { patientId: patient.id, signs: b.signs.join(","), action: b.action, source: b.source } });
  await prisma.alert.create({ data: { patientId: patient.id, severity: "CRITICAL", kind: "DANGER", title: `علامة خطر: ${b.signs.map((k) => DANGER_LABEL[k] ?? k).join("، ")}`, detail: b.action === "ER" ? "وُجّهت إلى الطوارئ" : "طُلب منها الاتصال" } });
  await audit("danger.report", { actorId: claims.sub, target: patient.id, meta: { signs: b.signs, action: b.action } });
  return json({ report }, { status: 201 });
});
