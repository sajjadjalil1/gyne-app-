import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;

// ---- Passwords: scrypt (N=2^15), stored as "scrypt$N$r$p$salt$hash" so parameters can be raised later.

const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const PASSWORD_MIN = 10;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(pw.normalize("NFKC"), salt, 32, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(hash, "base64");
  const got = await scryptAsync(pw.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return timingSafeEqual(got, expected);
}

/** Runs the same scrypt cost for an unknown phone, so response time does not reveal which numbers are staff. */
export async function burnPasswordTime(pw: string) {
  await scryptAsync(pw, Buffer.alloc(16), 32, SCRYPT);
}

// ---- TOTP (RFC 6238: SHA-1, 6 digits, 30 s), the format every authenticator app reads.

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const c of s.replace(/=+$/, "").toUpperCase()) {
    const i = B32.indexOf(c);
    if (i < 0) continue;
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(randomBytes(20));

function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", secret).update(msg).digest();
  const off = h[h.length - 1] & 15;
  return ((h.readUInt32BE(off) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

/** Returns the matched 30-second step (±1 step for clock drift), or null. Callers reject steps at or below the last one used. */
export function verifyTotp(secretB32: string, code: string, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const key = base32Decode(secretB32), step = Math.floor(now / 30_000);
  for (const s of [step, step - 1, step + 1]) {
    if (timingSafeEqual(Buffer.from(hotp(key, s)), Buffer.from(code))) return s;
  }
  return null;
}

export const totpNow = (secretB32: string, now = Date.now()) => hotp(base32Decode(secretB32), Math.floor(now / 30_000));

export function otpauthUri(secretB32: string, account: string, issuer: string) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ---- Secret at rest: AES-256-GCM. The key comes from TOTP_ENCRYPTION_KEY, or is derived from AUTH_SECRET.

function key(): Buffer {
  const k = process.env.TOTP_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!k || k.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("TOTP_ENCRYPTION_KEY or AUTH_SECRET must be set (32+ chars)");
    return createHash("sha256").update("dev-only-totp-key").digest();
  }
  return createHash("sha256").update(`totp:${k}`).digest();
}

export function sealSecret(plain: string): string {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function openSecret(sealed: string): string {
  const [, iv, tag, enc] = sealed.split(".");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(enc, "base64")), d.final()]).toString("utf8");
}

// ---- Recovery codes: ten one-time codes "xxxx-xxxx", stored hashed.

const RC_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function newRecoveryCodes(n = 10): string[] {
  return Array.from({ length: n }, () => {
    const b = randomBytes(8);
    const s = Array.from(b, (x) => RC_ALPHABET[x % RC_ALPHABET.length]).join("");
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  });
}
export const hashRecovery = (code: string) => createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
