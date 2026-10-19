import { prisma } from "@gyne/db";
import { subDays } from "date-fns";
import { handle, json, requirePatient } from "@/lib/api";

export const GET = handle(async () => {
  const { patient } = await requirePatient();
  const appointments = await prisma.appointment.findMany({ where: { patientId: patient.id, startsAt: { gte: subDays(new Date(), 365) } }, orderBy: { startsAt: "desc" } });
  return json({ appointments });
});
