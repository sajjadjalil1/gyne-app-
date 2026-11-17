import { describe, expect, it } from "vitest";
import { cleanContractions, contractionSummary, fmtClock, labourStatus, patternMinutes, type Contraction } from "../src";

const MIN = 60_000;
const T0 = Date.parse("2026-11-17T08:00:00Z");
/** n contractions, `every` minutes apart, each `sec` seconds long, starting at T0 + offsetMin. */
const series = (n: number, every: number, sec: number, offsetMin = 0): Contraction[] =>
  Array.from({ length: n }, (_, i) => ({ start: T0 + (offsetMin + i * every) * MIN, end: T0 + (offsetMin + i * every) * MIN + sec * 1000 }));
const endOf = (xs: Contraction[]) => (xs[xs.length - 1].end as number) + 30_000;

describe("contraction timer (5-1-1)", () => {
  it("asks her to start when nothing is logged", () => {
    expect(labourStatus([], T0).level).toBe("none");
  });
  it("far-apart contractions are early labour: rest at home", () => {
    const xs = series(5, 15, 40);
    const st = labourStatus(xs, endOf(xs), { gaWeeks: 39 });
    expect(st.level).toBe("early");
    expect(st.avgIntervalMin).toBe(15);
    expect(st.avgDurationSec).toBe(40);
  });
  it("every 5 minutes, a minute long, for an hour: go to hospital", () => {
    const xs = series(13, 5, 60); // 0..60 minutes
    const st = labourStatus(xs, endOf(xs), { gaWeeks: 39 });
    expect(st.patternMinutes).toBe(60);
    expect(st.level).toBe("go");
  });
  it("every 5 minutes for only half an hour: getting close, not yet", () => {
    const xs = series(7, 5, 60);
    const st = labourStatus(xs, endOf(xs), { gaWeeks: 39 });
    expect(st.level).toBe("soon");
    expect(st.detail).toContain("30 دقيقة");
  });
  it("short contractions (20 seconds) do not count toward 5-1-1 even when close", () => {
    const xs = series(13, 5, 20);
    expect(labourStatus(xs, endOf(xs), { gaWeeks: 39 }).level).not.toBe("go");
  });
  it("a small slack: a 5½-minute gap still counts", () => {
    const xs = series(12, 5.5, 55);
    expect(patternMinutes(cleanContractions(xs), 5)).toBeGreaterThanOrEqual(60);
  });
  it("a woman who had a baby before goes at every 7 minutes for an hour", () => {
    const xs = series(9, 7.5, 60);
    expect(labourStatus(xs, endOf(xs), { gaWeeks: 39 }).level).not.toBe("go");
    expect(labourStatus(xs, endOf(xs), { gaWeeks: 39, hadBabyBefore: true }).level).toBe("go");
  });
  it("before 37 weeks, four contractions within an hour means go now, without waiting for the hour", () => {
    const xs = series(4, 10, 45);
    const st = labourStatus(xs, endOf(xs), { gaWeeks: 33 });
    expect(st.level).toBe("go");
    expect(st.detail).toContain("33");
  });
  it("a single contraction over two minutes means call or go now", () => {
    const xs = [...series(3, 10, 50), { start: T0 + 30 * MIN, end: T0 + 30 * MIN + 150_000 }];
    expect(labourStatus(xs, endOf(xs), { gaWeeks: 39 }).level).toBe("go");
  });
  it("an old pattern that stopped 20+ minutes ago is not 'go' any more", () => {
    const xs = series(13, 5, 60);
    expect(labourStatus(xs, endOf(xs) + 25 * MIN, { gaWeeks: 39 }).level).toBe("early");
  });
  it("ignores a running contraction and impossible entries", () => {
    const xs: Contraction[] = [...series(3, 10, 50), { start: T0 + 40 * MIN, end: null }, { start: T0 + 50 * MIN, end: T0 + 49 * MIN }];
    expect(cleanContractions(xs).filter((c) => c.end != null)).toHaveLength(3);
  });
  it("formats clocks and a plain summary for the clinic", () => {
    expect(fmtClock(245_000)).toBe("4:05");
    const xs = series(13, 5, 60);
    const st = labourStatus(xs, endOf(xs), { gaWeeks: 39 });
    expect(contractionSummary(st)).toContain("الفرق بيناتهن حوالي 5 دقيقة");
  });
});
