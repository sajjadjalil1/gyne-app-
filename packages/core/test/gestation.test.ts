import { describe, expect, it } from "vitest";
import { antenatalSchedule, eddFromLmp, eddFromUltrasound, formatGA, gaOnDate, redatingThresholdDays, resolveDating, trimester } from "../src";

const day = (s: string) => new Date(`${s}T00:00:00Z`);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("due date (EDD)", () => {
  it("LMP + 280 days (Naegele)", () => {
    expect(ymd(eddFromLmp(day("2026-01-01")))).toBe("2026-10-08");
    expect(ymd(eddFromLmp(day("2024-02-29")))).toBe("2024-12-05");
  });
  it("from an ultrasound: scan at 12+0 on 2026-03-26 → EDD 2026-10-08", () => {
    expect(ymd(eddFromUltrasound(day("2026-03-26"), 12 * 7))).toBe("2026-10-08");
  });
  it("gestational age on a date", () => {
    const edd = eddFromLmp(day("2026-01-01"));
    expect(gaOnDate(edd, day("2026-01-01"))).toMatchObject({ weeks: 0, days: 0 });
    expect(gaOnDate(edd, day("2026-07-18"))).toMatchObject({ weeks: 28, days: 2 });
    expect(gaOnDate(edd, edd)).toMatchObject({ weeks: 40, days: 0 });
  });
  it("28+2 stays in order inside Arabic text", () => {
    expect(formatGA({ weeks: 28, days: 2, totalDays: 198 })).toBe("⁦28+2⁩");
  });
});

describe("re-dating by ultrasound (ACOG 700)", () => {
  it("thresholds by gestational age at the scan", () => {
    expect(redatingThresholdDays(8 * 7 + 6)).toBe(5);
    expect(redatingThresholdDays(9 * 7)).toBe(7);
    expect(redatingThresholdDays(15 * 7 + 6)).toBe(7);
    expect(redatingThresholdDays(16 * 7)).toBe(10);
    expect(redatingThresholdDays(22 * 7)).toBe(14);
    expect(redatingThresholdDays(28 * 7)).toBe(21);
  });
  it("keeps the LMP date when the scan agrees within the threshold", () => {
    // On 2026-03-18 the LMP says 10+6; the scan measures 10+0 (6 days smaller). Threshold at 10 weeks is 7 → keep LMP.
    const r = resolveDating({ lmp: day("2026-01-01"), usDate: day("2026-03-18"), usGaDays: 10 * 7 });
    expect(r.method).toBe("LMP");
    expect(r.discrepancyDays).toBe(6);
  });
  it("switches to the ultrasound date beyond the threshold", () => {
    // On 2026-03-12 the LMP says 10+0; the scan measures 8+6 (8 days smaller). Threshold before 9 weeks is 5 → use the scan.
    const r = resolveDating({ lmp: day("2026-01-01"), usDate: day("2026-03-12"), usGaDays: 8 * 7 + 6 });
    expect(r.method).toBe("ULTRASOUND");
    expect(r.discrepancyDays).toBe(8);
    expect(r.eddFinal).toEqual(r.eddUs);
  });
  it("needs at least one source", () => {
    expect(() => resolveDating({})).toThrow();
  });
});

describe("antenatal schedule", () => {
  it("Anti-D only for Rh-negative mothers", () => {
    const edd = eddFromLmp(day("2026-01-01"));
    const neg = antenatalSchedule(edd, { rhNegative: true }).map((i) => i.key);
    const pos = antenatalSchedule(edd).map((i) => i.key);
    expect(neg.length).toBeGreaterThan(pos.length);
    expect(neg.some((k) => /antid/i.test(k))).toBe(true);
    expect(pos.some((k) => /antid/i.test(k))).toBe(false);
  });
});

it("trimester boundaries", () => {
  expect(trimester({ weeks: 13, days: 6, totalDays: 97 })).toBe(1);
  expect(trimester({ weeks: 14, days: 0, totalDays: 98 })).toBe(2);
  expect(trimester({ weeks: 27, days: 6, totalDays: 195 })).toBe(2);
  expect(trimester({ weeks: 28, days: 0, totalDays: 196 })).toBe(3);
});
