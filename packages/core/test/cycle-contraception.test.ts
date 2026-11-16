import { describe, expect, it } from "vitest";
import { addDays } from "date-fns";
import { bpLevel, computeExpiry, cycleFlags, isUrgentText, pillState, predictCycle, renewalReminderDate, type CycleLogLite } from "../src";

const day = (s: string) => new Date(`${s}T00:00:00Z`);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** `n` bleeding days starting at each date. */
const periods = (starts: string[], n = 5): CycleLogLite[] =>
  starts.flatMap((s) => Array.from({ length: n }, (_, i) => ({ date: addDays(day(s), i), bleeding: true, flow: "MEDIUM" })));

describe("cycle prediction", () => {
  it("regular 28-day cycles → next period and ovulation 14 days before it", () => {
    const p = predictCycle(periods(["2026-08-01", "2026-08-29", "2026-09-26"]), undefined, day("2026-10-05"));
    expect(p.cycleLength).toBe(28);
    expect(p.periodLength).toBe(5);
    expect(ymd(p.nextPeriod!)).toBe("2026-10-24");
    expect(ymd(p.ovulation!)).toBe("2026-10-10");
    expect(ymd(p.fertileWindow!.from)).toBe("2026-10-05");
    expect(p.dayOfCycle).toBe(10);
  });
  it("uses the defaults with no history", () => {
    expect(predictCycle([], undefined, day("2026-10-05"))).toEqual({ cycleLength: 28, periodLength: 5 });
  });
  it("spotting does not count as a period", () => {
    const logs = [...periods(["2026-08-01", "2026-08-29"]), { date: day("2026-09-10"), bleeding: true, flow: "SPOTTING" }];
    expect(ymd(predictCycle(logs, undefined, day("2026-09-12")).lastPeriodStart!)).toBe("2026-08-29");
  });
});

describe("cycle warnings for the doctor", () => {
  it("no period for more than 90 days", () => {
    expect(cycleFlags(periods(["2026-05-01"]), day("2026-08-15")).map((f) => f.kind)).toContain("AMENORRHEA");
  });
  it("bleeding longer than 7 days", () => {
    expect(cycleFlags(periods(["2026-09-01"], 9), day("2026-09-12")).map((f) => f.kind)).toContain("PROLONGED");
  });
  it("cycles shorter than 21 days", () => {
    expect(cycleFlags(periods(["2026-08-01", "2026-08-19", "2026-09-06"]), day("2026-09-10")).map((f) => f.kind)).toContain("SHORT_CYCLE");
  });
  it("a normal history raises nothing", () => {
    expect(cycleFlags(periods(["2026-08-01", "2026-08-29", "2026-09-26"]), day("2026-10-05"))).toEqual([]);
  });
});

describe("contraception expiry", () => {
  const start = day("2026-01-15");
  it.each([
    ["IMPLANT", null, "2029-01-15"],
    ["IUD_COPPER", "TCu 380A", "2036-01-15"],
    ["IUD_COPPER", null, "2031-01-15"],
    ["IUD_HORMONAL", "Mirena", "2034-01-15"],
    ["IUD_HORMONAL", "Kyleena", "2031-01-15"],
    ["IUD_HORMONAL", "Jaydess", "2029-01-15"],
    ["INJECTION", null, "2026-04-16"],
    ["RING", null, "2026-02-05"],
    ["PATCH", null, "2026-01-22"],
  ] as const)("%s %s → %s", (method, brand, expected) => {
    expect(ymd(computeExpiry(method, start, brand)!)).toBe(expected);
  });
  it("pills and condoms do not expire", () => {
    expect(computeExpiry("COMBINED_PILL", start)).toBeNull();
    expect(computeExpiry("CONDOM", start)).toBeNull();
  });
  it("reminder 30 days before for long-acting methods, 7 days for the rest", () => {
    expect(ymd(renewalReminderDate("IMPLANT", day("2029-01-15")))).toBe("2028-12-16");
    expect(ymd(renewalReminderDate("INJECTION", day("2026-04-16")))).toBe("2026-04-09");
  });
});

describe("pill pack", () => {
  it("21+7 pack: day 1 is pill 1, day 22 is a pill-free day, next pack on day 29", () => {
    const start = day("2026-11-01");
    expect(pillState("P21_7", start, day("2026-11-01")).pillNumber).toBe(1);
    expect(pillState("P21_7", start, day("2026-11-21")).pillNumber).toBe(21);
    expect(pillState("P21_7", start, day("2026-11-22")).inFree).toBe(true);
    expect(ymd(pillState("P21_7", start, day("2026-11-22")).nextPackAt)).toBe("2026-11-29");
    expect(pillState("P21_7", start, day("2026-11-29")).pillNumber).toBe(1);
  });
  it("28 pack never has a free week", () => {
    expect(pillState("P28", day("2026-11-01"), day("2026-11-28")).inFree).toBe(false);
  });
});

describe("blood pressure wording", () => {
  it.each([
    [120, 80, "ok"], [139, 89, "ok"], [140, 80, "high"], [130, 90, "high"], [160, 100, "severe"], [150, 110, "severe"],
  ] as const)("%i/%i → %s", (s, d, level) => expect(bpLevel(s, d)).toBe(level));
});

it("danger words in a patient's message raise an alert", () => {
  expect(isUrgentText("عندي نزيف من الصبح")).toBe(true);
  expect(isUrgentText("الجاهل ما يتحرك")).toBe(true);
  expect(isUrgentText("شكراً دكتورة")).toBe(false);
});
