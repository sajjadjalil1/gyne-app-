import { redirect } from "next/navigation";
import { prisma } from "@gyne/db";
import { currentClaims } from "./auth";

/** Server-component guard for the dashboard. */
export async function requireStaffPage() {
  const c = await currentClaims();
  if (!c || c.role === "PATIENT") redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: c.sub }, include: { clinic: true } });
  if (!user) redirect("/login");
  return user;
}
