import { prisma } from "@gyne/db";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Used by the hosting platform to decide whether this instance is healthy. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ ok: true, db: true });
  } catch {
    return json({ ok: false, db: false }, { status: 503 });
  }
}
