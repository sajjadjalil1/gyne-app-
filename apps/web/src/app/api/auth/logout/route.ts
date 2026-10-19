import { handle, json, requireAuth } from "@/lib/api";
import { audit, revokeSession } from "@/lib/auth";

export const POST = handle(async () => {
  const c = await requireAuth();
  await revokeSession(c.sid);
  await audit("logout", { actorId: c.sub });
  const res = json({ ok: true });
  res.cookies.set("gyne_staff", "", { maxAge: 0, path: "/" });
  return res;
});
