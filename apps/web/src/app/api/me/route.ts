import { handle, json, requirePatient } from "@/lib/api";
import { patientHome } from "@/lib/patient";

export const GET = handle(async () => {
  const { patient } = await requirePatient();
  return json(await patientHome(patient.id));
});
