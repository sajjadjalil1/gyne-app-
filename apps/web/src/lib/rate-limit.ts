import { headers } from "next/headers";

// Sliding-window limiter, in memory per instance. Replace with Redis in multi-instance deployments.
const hits = new Map<string, number[]>();

/** Returns true when `key` already made `max` calls inside `windowMs`; otherwise records this call. */
export function rateLimited(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return true; }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 50_000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return false;
}

/**
 * The caller's IP for rate limiting. Never the first X-Forwarded-For entry: Render appends to whatever the client
 * sent, so that entry is attacker-chosen (checked on the live server). Cloudflare in front of Render overwrites
 * True-Client-IP / CF-Connecting-IP; behind our own Caddy the last X-Forwarded-For entry is the one Caddy added.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return h.get("true-client-ip")?.trim() || h.get("cf-connecting-ip")?.trim() || xff?.at(-1) || h.get("x-real-ip") || "unknown";
}
