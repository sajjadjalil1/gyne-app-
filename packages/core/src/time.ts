/**
 * Clinic time. The server runs on Baghdad time (TZ=Asia/Baghdad in the Dockerfile), so local getters and
 * date-fns startOfDay/endOfDay mean "the clinic's day". Calendar-only values (a daily log's day) are stored as
 * UTC midnight of that calendar date so the stored key never depends on the server's clock zone.
 */
export const CLINIC_TZ = "Asia/Baghdad";

/** "2026-11-16" or any instant → UTC midnight of that calendar day (for an instant, the day on the server's clock). */
export function dayKey(input: string | Date): Date {
  if (typeof input === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }
  const d = new Date(input);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
