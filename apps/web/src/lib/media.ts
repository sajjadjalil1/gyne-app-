import { createHash, randomUUID } from "node:crypto";
import { prisma, type AttachmentKind } from "@gyne/db";
import { deleteObject, getObject, putObject, storageDriver } from "@gyne/db/storage";

/** Size and length limits. The app shrinks photos to about 300 KB before sending, so these leave room. */
export const MEDIA_LIMITS = {
  IMAGE: { maxBytes: 5 * 1024 * 1024 },
  AUDIO: { maxBytes: 4 * 1024 * 1024, maxSeconds: 180 },
  /** Uploads per patient per 24 hours */
  perDay: 30,
  /** Interim database mode: total size of all files kept in the database before uploads are refused */
  dbTotalBytes: Number(process.env.MEDIA_DB_MAX_MB || 300) * 1024 * 1024,
} as const;

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "audio/mp4": "m4a", "audio/aac": "aac", "audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/wav": "wav" };

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

/**
 * The real type of a file, from its first bytes. Whatever the phone claims is ignored, so a script or a
 * web page can never be stored and served back as a "photo".
 */
export function sniffMime(b: Uint8Array): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && ascii(b, 1, 4) === "PNG") return "image/png";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return "image/webp";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WAVE") return "audio/wav";
  if (ascii(b, 4, 8) === "ftyp") {
    const brand = ascii(b, 8, 12);
    if (/^(M4A |M4B |mp42|isom|mp41|3gp[0-9]|3gp4|dash|iso[2-6])/.test(brand)) return "audio/mp4";
    return null; // heic, mov, … : the app always converts photos to JPEG first
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "audio/webm";
  if (ascii(b, 0, 4) === "OggS") return "audio/ogg";
  if (ascii(b, 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 0x06) !== 0)) return "audio/mpeg";
  if (b[0] === 0xff && (b[1] & 0xf6) === 0xf0) return "audio/aac";
  return null;
}

export type MediaCheck = { ok: true; mime: string } | { ok: false; error: string };

/** Type, size and length checks, with the message the patient sees when something is wrong. */
export function checkMedia(kind: AttachmentKind, bytes: Uint8Array, durationSec: number | null): MediaCheck {
  if (bytes.length === 0) return { ok: false, error: "الملف فارغ" };
  const mime = sniffMime(bytes);
  if (!mime || !mime.startsWith(kind === "IMAGE" ? "image/" : "audio/")) return { ok: false, error: kind === "IMAGE" ? "هذا مو صورة" : "هذا مو تسجيل صوت" };
  if (bytes.length > MEDIA_LIMITS[kind].maxBytes) return { ok: false, error: kind === "IMAGE" ? "الصورة كبيرة كلش" : "التسجيل كبير كلش" };
  if (kind === "AUDIO" && durationSec != null && durationSec > MEDIA_LIMITS.AUDIO.maxSeconds) return { ok: false, error: "التسجيل أطول من 3 دقايق" };
  return { ok: true, mime };
}

export const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

/** Where the bytes go: the bucket (keyed by clinic and patient, random name) or, for now, the database row. */
export async function storeBytes(clinicId: string, patientId: string, bytes: Uint8Array, mime: string) {
  if (storageDriver() === "s3") {
    const key = `clinics/${clinicId}/patients/${patientId}/${randomUUID()}.${EXT[mime] ?? "bin"}`;
    await putObject(key, bytes, mime);
    return { storage: "s3" as const, key, data: null };
  }
  const used = await prisma.attachment.aggregate({ where: { storage: "db" }, _sum: { size: true } });
  if ((used._sum.size ?? 0) + bytes.length > MEDIA_LIMITS.dbTotalBytes) return null;
  return { storage: "db" as const, key: null, data: Buffer.from(bytes) };
}

export async function readBytes(a: { storage: string; key: string | null; data: Uint8Array | null }): Promise<Uint8Array | null> {
  if (a.storage === "s3" && a.key) return getObject(a.key);
  return a.data ? new Uint8Array(a.data) : null;
}

/** Removes stored files from the bucket (database rows go with their messages). */
export async function removeStored(keys: string[]) {
  for (const k of keys) await deleteObject(k).catch((e) => console.error(`media delete failed: ${(e as Error).message}`));
}

export const MEDIA_LABEL: Record<AttachmentKind, string> = { IMAGE: "📷 صورة", AUDIO: "🎤 رسالة صوتية" };

/** "bytes=100-199", "bytes=100-" or "bytes=-50" → inclusive [start, end]; null when absent. */
export function parseRange(h: string | null, size: number): [number, number] | null | "invalid" {
  if (!h) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(h.trim());
  if (!m || (!m[1] && !m[2])) return "invalid";
  let start: number, end: number;
  if (!m[1]) { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  else { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1; }
  if (start > end || start >= size) return "invalid";
  return [start, end];
}
