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

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
