import { describe, expect, it } from "vitest";
import { checkMedia, MEDIA_LIMITS, parseRange, sniffMime } from "../src/lib/media";

const bytes = (head: number[] | string, total = 64) => {
  const h = typeof head === "string" ? [...head].map((c) => c.charCodeAt(0)) : head;
  const b = new Uint8Array(Math.max(total, h.length));
  b.set(h);
  return b;
};
const ftyp = (brand: string) => bytes([0, 0, 0, 0x20, ...[..."ftyp" + brand].map((c) => c.charCodeAt(0))]);
const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0]);

describe("chat photos and voice notes", () => {
  it("reads the real type from the first bytes", () => {
    expect(sniffMime(JPEG)).toBe("image/jpeg");
    expect(sniffMime(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe("image/png");
    expect(sniffMime(bytes("RIFF\0\0\0\0WEBP"))).toBe("image/webp");
    expect(sniffMime(ftyp("M4A "))).toBe("audio/mp4");
    expect(sniffMime(ftyp("mp42"))).toBe("audio/mp4");
    expect(sniffMime(bytes([0x1a, 0x45, 0xdf, 0xa3]))).toBe("audio/webm");
    expect(sniffMime(bytes([0xff, 0xf1, 0x50]))).toBe("audio/aac");
  });
  it("refuses web pages, scripts, PDFs and iPhone HEIC that was not converted", () => {
    expect(sniffMime(bytes("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniffMime(bytes("%PDF-1.7"))).toBeNull();
    expect(sniffMime(ftyp("heic"))).toBeNull();
  });
  it("a photo must be a photo and a voice note must be sound, whatever the phone says", () => {
    expect(checkMedia("IMAGE", JPEG, null)).toEqual({ ok: true, mime: "image/jpeg" });
    expect(checkMedia("AUDIO", JPEG, 10)).toMatchObject({ ok: false });
    expect(checkMedia("IMAGE", ftyp("M4A "), null)).toMatchObject({ ok: false, error: "هذا مو صورة" });
  });
  it("limits size and length", () => {
    expect(checkMedia("IMAGE", bytes([0xff, 0xd8, 0xff], MEDIA_LIMITS.IMAGE.maxBytes + 1), null)).toMatchObject({ ok: false, error: "الصورة كبيرة كلش" });
    expect(checkMedia("AUDIO", ftyp("M4A "), 181)).toMatchObject({ ok: false });
    expect(checkMedia("AUDIO", ftyp("M4A "), 60)).toMatchObject({ ok: true });
    expect(checkMedia("IMAGE", new Uint8Array(0), null)).toMatchObject({ ok: false });
  });
  it("answers range requests so voice notes play in Safari", () => {
    expect(parseRange(null, 1000)).toBeNull();
    expect(parseRange("bytes=0-1", 1000)).toEqual([0, 1]);
    expect(parseRange("bytes=500-", 1000)).toEqual([500, 999]);
    expect(parseRange("bytes=-100", 1000)).toEqual([900, 999]);
    expect(parseRange("bytes=0-5000", 1000)).toEqual([0, 999]);
    expect(parseRange("bytes=2000-", 1000)).toBe("invalid");
    expect(parseRange("items=0-1", 1000)).toBe("invalid");
  });
});
