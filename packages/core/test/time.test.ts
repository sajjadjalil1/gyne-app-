import { describe, expect, it } from "vitest";
import { set, startOfDay } from "date-fns";
import { dayKey, fmtDate, fmtTime } from "../src";

describe("server clock is Baghdad time", () => {
  it("runs with TZ=Asia/Baghdad (UTC+3, no daylight saving)", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("Asia/Baghdad");
    expect(new Date("2026-01-15T12:00:00Z").getTimezoneOffset()).toBe(-180);
    expect(new Date("2026-07-15T12:00:00Z").getTimezoneOffset()).toBe(-180);
  });
  it("a 10 AM Baghdad appointment shows as 10:00 ص, not 7:00", () => {
    expect(fmtTime(new Date("2026-11-16T07:00:00Z"))).toBe("10:00 ص");
    expect(fmtTime(new Date("2026-11-16T15:30:00Z"))).toBe("6:30 م");
  });
  it("an appointment at 1 AM Baghdad belongs to the Baghdad date, not the UTC one", () => {
    expect(fmtDate(new Date("2026-11-15T22:00:00Z"), { year: false })).toBe("16 تشرين الثاني");
  });
  it("a 9 PM pill time is 9 PM in Baghdad (18:00 UTC)", () => {
    const dueAt = set(startOfDay(new Date("2026-11-16T08:00:00Z")), { hours: 21, minutes: 0 });
    expect(dueAt.toISOString()).toBe("2026-11-16T18:00:00.000Z");
  });
});

describe("daily log day key", () => {
  it("a date string is stored as UTC midnight of that date (same as before the clock change)", () => {
    expect(dayKey("2026-11-16").toISOString()).toBe("2026-11-16T00:00:00.000Z");
  });
  it("an instant after midnight Baghdad belongs to the new Baghdad day", () => {
    expect(dayKey("2026-11-15T21:30:00Z").toISOString()).toBe("2026-11-16T00:00:00.000Z");
    expect(dayKey(new Date("2026-11-16T20:59:00Z")).toISOString()).toBe("2026-11-16T00:00:00.000Z");
  });
});

it("the server image keeps TZ=Asia/Baghdad (removing it brings the 3-hour shift back)", async () => {
  const { readFileSync } = await import("node:fs");
  expect(readFileSync(new URL("../../../Dockerfile", import.meta.url), "utf8")).toMatch(/^ENV .*\bTZ=Asia\/Baghdad\b/m);
});
