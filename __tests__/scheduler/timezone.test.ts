import { describe, expect, it } from "vitest";
import { localToUtc } from "@/lib/strategist/smart-scheduler";

/** Renders a UTC instant as "YYYY-MM-DD HH:MM" in `timezone`. */
function wallClock(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")}`;
}

describe("localToUtc — user wall-clock time → absolute instant stored in Firestore", () => {
  it("Europe/Paris 10:00 in summer (UTC+2) → 08:00Z", () => {
    expect(localToUtc("2026-07-15", "10:00", "Europe/Paris").toISOString()).toBe("2026-07-15T08:00:00.000Z");
  });

  it("Europe/Paris 10:00 in winter (UTC+1) → 09:00Z", () => {
    expect(localToUtc("2026-12-15", "10:00", "Europe/Paris").toISOString()).toBe("2026-12-15T09:00:00.000Z");
  });

  it("America/New_York 09:30 (UTC-4 in September) → 13:30Z", () => {
    expect(localToUtc("2026-09-28", "09:30", "America/New_York").toISOString()).toBe("2026-09-28T13:30:00.000Z");
  });

  it("Asia/Tokyo 23:45 crosses the UTC day boundary backwards", () => {
    expect(localToUtc("2026-09-28", "23:45", "Asia/Tokyo").toISOString()).toBe("2026-09-28T14:45:00.000Z");
  });

  it("UTC is the identity", () => {
    expect(localToUtc("2026-09-28", "07:05", "UTC").toISOString()).toBe("2026-09-28T07:05:00.000Z");
  });

  // DST transition days — the result must render back to the requested
  // wall-clock time, even when the transition sits between the naive guess
  // and the real instant.
  const DST_CASES: Array<[string, string, string]> = [
    ["Europe/Paris", "2026-03-29", "01:30"], // just before spring-forward (02:00 → 03:00)
    ["Europe/Paris", "2026-03-29", "03:30"], // just after spring-forward
    ["Europe/Paris", "2026-10-25", "01:30"], // just before fall-back
    ["Europe/Paris", "2026-10-25", "04:00"], // after fall-back
    ["America/New_York", "2026-03-08", "01:30"],
    ["America/New_York", "2026-03-08", "03:30"],
    ["America/New_York", "2026-11-01", "00:30"],
    ["America/New_York", "2026-11-01", "03:00"],
  ];
  it.each(DST_CASES)("%s %s %s round-trips to the same wall-clock time", (tz, date, time) => {
    const instant = localToUtc(date, time, tz);
    expect(wallClock(instant, tz)).toBe(`${date} ${time}`);
  });

  it("returns an invalid date for malformed input instead of a wrong instant", () => {
    expect(Number.isNaN(localToUtc("2026-13", "10:00", "Europe/Paris").getTime())).toBe(true);
  });
});
