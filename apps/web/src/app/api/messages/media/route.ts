import { prisma } from "@gyne/db";
import { HttpError, handle, json, requirePatient } from "@/lib/api";
import { audit } from "@/lib/auth";
import { checkMedia, MEDIA_LABEL, MEDIA_LIMITS, sha256, storeBytes } from "@/lib/media";
import { createPatientMessage } from "@/lib/patient-message";

/**
 * A photo or a voice note from the patient (multipart form: file, kind = IMAGE | AUDIO, durationSec, caption).
 * The real type is read from the file itself; size, length and a daily count are limited.
 */
export const POST = handle(async (req) => {
  const { patient, claims } = await requirePatient();
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MEDIA_LIMITS.IMAGE.maxBytes + 64 * 1024) throw new HttpError(413, "الملف كبير كلش");
  const form = await req.formData().catch(() => null);
  if (!form) throw new HttpError(400, "ما وصل الملف");
  const kind = form.get("kind");
  const file = form.get("file");
  if ((kind !== "IMAGE" && kind !== "AUDIO") || !(file instanceof Blob)) throw new HttpError(400, "ما وصل الملف");
  const caption = String(form.get("caption") ?? "").trim().slice(0, 500);
  const dur = Number(form.get("durationSec"));
  const durationSec = Number.isFinite(dur) && dur > 0 ? Math.round(dur) : null;

  const since = new Date(Date.now() - 86_400_000);
  if ((await prisma.attachment.count({ where: { patientId: patient.id, createdAt: { gte: since } } })) >= MEDIA_LIMITS.perDay) throw new HttpError(429, "وصلتي الحد اليوم. إذا مستعجل اتصلي بالعيادة.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkMedia(kind, bytes, durationSec);
  if (!check.ok) throw new HttpError(400, check.error);
  const hash = sha256(bytes);
  // The same file sent twice in a minute (a retry after a dropped connection) is one message.
  const dup = await prisma.attachment.findFirst({ where: { patientId: patient.id, sha256: hash, createdAt: { gte: new Date(Date.now() - 60_000) } }, include: { message: true } });
  if (dup) return json({ message: dup.message, urgent: dup.message.urgent, escalate: false, bpHigh: false });

  const stored = await storeBytes(patient.clinicId, patient.id, bytes, check.mime);
  if (!stored) throw new HttpError(507, "ما گدرنا نحفظ الملف هسه. اكتبي رسالة أو اتصلي بالعيادة.");
  const r = await createPatientMessage(patient, caption || MEDIA_LABEL[kind], { kind, mime: check.mime, size: bytes.length, durationSec, sha256: hash, ...stored });
  await audit("message.media", { actorId: claims.sub, target: patient.id, meta: { kind, size: bytes.length, storage: stored.storage, urgent: r.urgent } });
  return json(r, { status: 201 });
});
