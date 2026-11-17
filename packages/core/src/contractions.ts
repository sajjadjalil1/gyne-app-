/**
 * Contraction timer rules, kept on the phone so they work offline.
 * The go-to-hospital rule is 5-1-1 (contractions every 5 minutes or closer, each lasting about a minute,
 * for an hour). A woman who has given birth before goes earlier (every 7 minutes for an hour). Before 37 weeks,
 * regular contractions are a possible preterm labour: call or go straight away, no waiting for the hour.
 * Waters breaking, bleeding or the baby moving less always mean hospital now, whatever the timer says.
 */
export type Contraction = { start: number; end: number | null };

export type LabourLevel = "none" | "early" | "soon" | "go";

export type LabourStatus = {
  level: LabourLevel;
  headline: string;
  detail: string;
  /** Average minutes from the start of one contraction to the start of the next (last 6) */
  avgIntervalMin: number | null;
  /** Average length of a contraction in seconds (last 6) */
  avgDurationSec: number | null;
  countLastHour: number;
  /** How long the current close-and-long pattern has lasted, in minutes */
  patternMinutes: number;
};

const MIN = 60_000;
/** A little slack so a 5:20 gap or a 55-second contraction still counts as "5 minutes" and "a minute". */
const SLACK_INTERVAL = 0.5 * MIN;
const MIN_DURATION_SEC = 45;
const LONG_CONTRACTION_SEC = 120;

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Finished contractions, oldest first, without duplicates or impossible entries. */
export function cleanContractions(list: Contraction[]): Contraction[] {
  return list
    .filter((c) => Number.isFinite(c.start) && (c.end == null || (Number.isFinite(c.end) && c.end > c.start && c.end - c.start < 10 * MIN)))
    .sort((a, b) => a.start - b.start);
}

/**
 * Length (minutes) of the newest run of contractions where every gap is at most `gapMin` minutes and every
 * contraction lasts about a minute or more. Measured from the first contraction of the run to the last one.
 */
export function patternMinutes(done: Contraction[], gapMin: number): number {
  let i = done.length - 1;
  if (i < 0) return 0;
  const longEnough = (c: Contraction) => ((c.end as number) - c.start) / 1000 >= MIN_DURATION_SEC;
  if (!longEnough(done[i])) return 0;
  while (i > 0 && done[i].start - done[i - 1].start <= gapMin * MIN + SLACK_INTERVAL && longEnough(done[i - 1])) i--;
  return (done[done.length - 1].start - done[i].start) / MIN;
}

export function labourStatus(list: Contraction[], now: number, opts: { gaWeeks?: number | null; hadBabyBefore?: boolean } = {}): LabourStatus {
  const done = cleanContractions(list).filter((c) => c.end != null);
  const last6 = done.slice(-6);
  const intervals = last6.slice(1).map((c, i) => (c.start - last6[i].start) / MIN);
  const durations = last6.map((c) => ((c.end as number) - c.start) / 1000);
  const avgIntervalMin = avg(intervals);
  const avgDurationSec = avg(durations);
  const countLastHour = done.filter((c) => c.start >= now - 60 * MIN).length;
  const gapRule = opts.hadBabyBefore ? 7 : 5;
  const pattern = patternMinutes(done, gapRule);
  const base = { avgIntervalMin: avgIntervalMin == null ? null : Math.round(avgIntervalMin * 10) / 10, avgDurationSec: avgDurationSec == null ? null : Math.round(avgDurationSec), countLastHour, patternMinutes: Math.round(pattern) };
  // The pattern only counts while it is still going: nothing for 20 minutes means it has eased off.
  const active = done.length > 0 && now - (done[done.length - 1].end as number) < 20 * MIN;

  if (done.length === 0) return { ...base, level: "none", headline: "اضغطي الزر لما تبدي الطلقة", detail: "واضغطيه مرة ثانية لما تخلص. التطبيق يحسب المدة والفرق بين الطلقات ويگلچ إذا صار وقت المستشفى." };

  const lastSec = durations[durations.length - 1];
  if (active && lastSec >= LONG_CONTRACTION_SEC) {
    return { ...base, level: "go", headline: "اتصلي بالعيادة أو روحي للمستشفى هسه", detail: "آخر طلقة طولت أكثر من دقيقتين. هذا يحتاج فحص، لا تنتظرين." };
  }
  const preterm = opts.gaWeeks != null && opts.gaWeeks < 37;
  if (preterm && active && done.filter((c) => c.start >= now - 60 * MIN).length >= 4) {
    return { ...base, level: "go", headline: "روحي للمستشفى هسه", detail: `بعدچ بالأسبوع ${opts.gaWeeks}، وهذي طلقات منتظمة. قبل الأسبوع 37 لا تنتظرين ساعة، اتصلي بالعيادة وروحي.` };
  }
  if (active && pattern >= 60) {
    return { ...base, level: "go", headline: "صار وقت المستشفى", detail: opts.hadBabyBefore ? "طلقاتچ كل 7 دقايق أو أقل، كل وحدة حوالي دقيقة، صار إلها ساعة. روحي للمستشفى هسه وخذي جنطتچ." : "طلقاتچ كل 5 دقايق أو أقل، كل وحدة حوالي دقيقة، صار إلها ساعة. روحي للمستشفى هسه وخذي جنطتچ." };
  }
  if (active && avgIntervalMin != null && avgIntervalMin <= 10 && done.length >= 3) {
    const left = Math.max(5, Math.round(60 - pattern));
    return { ...base, level: "soon", headline: "قربت، جهزي نفسچ", detail: pattern > 0 ? `إذا ضلّت هيچ حوالي ${left} دقيقة بعد، روحي للمستشفى. خلي الجنطة يمّچ وخبّري أهلچ.` : "الطلقات صارت متقاربة. خلي الجنطة يمّچ وخبّري أهلچ، وكملي عدّ." };
  }
  return { ...base, level: "early", headline: "بعده وقت، ارتاحي", detail: "الطلقات بعدها متباعدة. اشربي ماي، تمشّي شوية أو ارتاحي، وكملي عدّ. إذا صارت كل 5 دقايق لمدة ساعة روحي للمستشفى." };
}

/** Always-go signs, whatever the timer shows. Keys match DANGER_PREGNANCY so the emergency screen opens with them picked. */
export const LABOUR_ALWAYS_GO = [
  { key: "waters", label: "نزل ماي" },
  { key: "bleeding", label: "نزيف" },
  { key: "nomove", label: "الطفل قلّت حركته" },
] as const;

/** "4:05" style for a running contraction or a gap. */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** One-line plain summary the patient can send to the clinic from the timer screen. */
export function contractionSummary(st: LabourStatus): string {
  const parts = [`سجّلت ${st.countLastHour} طلقات بآخر ساعة`];
  if (st.avgIntervalMin != null) parts.push(`الفرق بيناتهن حوالي ${st.avgIntervalMin} دقيقة`);
  if (st.avgDurationSec != null) parts.push(`كل وحدة حوالي ${st.avgDurationSec} ثانية`);
  return `مؤقت الطلق: ${parts.join("، ")}.`;
}
