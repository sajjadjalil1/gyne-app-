import { prisma } from "@gyne/db";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Public, before login: the clinic's name and its doctor's name for the app's welcome screen.
 * One deployment serves one clinic, so this reveals nothing beyond what is on the clinic's sign.
 */
export async function GET() {
  const clinic = await prisma.clinic.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
  if (!clinic) return json({ name: null, doctorName: null });
  const doctor = await prisma.user.findFirst({ where: { clinicId: clinic.id, role: "DOCTOR", disabledAt: null }, orderBy: { createdAt: "asc" }, select: { name: true } });
  return json({ name: clinic.name, doctorName: doctor?.name ?? null }, { headers: { "cache-control": "public, max-age=3600" } });
}
