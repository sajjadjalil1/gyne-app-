import { redirect } from "next/navigation";
import { prisma, type Role } from "@gyne/db";
import { currentClaims } from "./auth";
import { CLINICAL, homeFor } from "./roles";

/** Server-component guard for the dashboard. Clinical pages by default; reception gets only what it is allowed. */
export async function requireStaffPage(allowed: Role[] = CLINICAL) {
  const c = await currentClaims();
  if (!c || c.role === "PATIENT") redirect("/login");
  if (!allowed.includes(c.role)) redirect(homeFor(c.role));
  const user = await prisma.user.findUnique({ where: { id: c.sub }, include: { clinic: true } });
  if (!user) redirect("/login");
  return user;
}
