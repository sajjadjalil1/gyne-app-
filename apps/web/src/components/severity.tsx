export const sevColor: Record<string, string> = { CRITICAL: "bg-crit", WARNING: "bg-warn", INFO: "bg-info" };
export function Avatar({ name, tone = "bg-lav", size = "w-11 h-11 text-base" }: { name: string; tone?: string; size?: string }) {
  return <span className={`${size} ${tone} rounded-full grid place-items-center text-white font-semibold shrink-0`}>{name.slice(0, 1)}</span>;
}
