import { z } from "zod";
import { handle, json, parseBody, requirePatient } from "@/lib/api";
import { softDeletePatient } from "@/lib/patient-account";

/** "احذفي حسابي": closes her account now; the data is erased for good after the grace period. */
export const POST = handle(async (req) => {
  const { patient, claims } = await requirePatient();
  await parseBody(req, z.object({ confirm: z.literal(true) }));
  await softDeletePatient(patient.id, { actorId: claims.sub, who: "patient" });
  return json({ ok: true });
});
