import { prisma } from "@gyne/db";
import { HttpError, handle, requireAuth, requirePatient, requireStaff } from "@/lib/api";
import { audit } from "@/lib/auth";
import { parseRange, readBytes } from "@/lib/media";

/**
 * Serves one chat photo or voice note, only to the patient who sent it or to clinical staff of her clinic
 * (reception does not see clinical files). Never cached by shared caches, never sniffed by the browser.
 */
export const GET = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const claims = await requireAuth();
  const a = await prisma.attachment.findUnique({ where: { id }, include: { message: { select: { patient: { select: { id: true, clinicId: true, deletedAt: true } } } } } });
  const p = a?.message.patient;
  if (!a || !p || p.deletedAt) throw new HttpError(404, "غير موجود");
  if (claims.role === "PATIENT") {
    const { patient } = await requirePatient();
    if (patient.id !== p.id) throw new HttpError(404, "غير موجود");
  } else {
    const { user } = await requireStaff();
    if (user.clinicId !== p.clinicId) throw new HttpError(404, "غير موجود");
    // Safari asks for an audio file in pieces; log the view once, on the first piece.
    if (!/^bytes=(?!0-)/.test(req.headers.get("range") ?? "")) await audit("media.view", { actorId: user.id, target: p.id, meta: { id: a.id } });
  }
  const bytes = await readBytes(a);
  if (!bytes) throw new HttpError(404, "غير موجود");
  const base = {
    "content-type": a.mime,
    "content-disposition": "inline",
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
    "accept-ranges": "bytes",
  };
  const range = parseRange(req.headers.get("range"), bytes.length);
  if (range === "invalid") return new Response(null, { status: 416, headers: { ...base, "content-range": `bytes */${bytes.length}` } });
  if (range) {
    const [start, end] = range;
    return new Response(bytes.slice(start, end + 1), { status: 206, headers: { ...base, "content-range": `bytes ${start}-${end}/${bytes.length}`, "content-length": String(end - start + 1) } });
  }
  return new Response(new Uint8Array(bytes), { headers: { ...base, "content-length": String(bytes.length) } });
});

