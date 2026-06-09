import { describe, expect, it } from "vitest";
import { nextRunDate, nextRunLabel } from "@/lib/strategist/next-run";

/** Whole-day difference between two Dates, ignoring time-of-day. */
function dayDiff(later: Date, earlier: Date): number {
  const a = new Date(later.getFullYear(), later.getMonth(), later.getDate()).getTime();
  const b = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate()).getTime();
  return Math.round((a - b) / 86_400_000);
}

describe("nextRunDate — first valid occurrence of the chosen weekday", () => {
  // Cas n°1 — today is the chosen day, time not yet passed → TODAY.
  it("today is the chosen day, before 08:00 → today (no week skip)", () => {
    const now = new Date(2026, 5, 9, 6, 0); // Tue 9 Jun 2026, 06:00
    const r = nextRunDate(now.getDay(), now);
    expect(r.getDay()).toBe(now.getDay());
    expect(dayDiff(r, now)).toBe(0); // same calendar day
  });

  // Cas n°2 — today is the chosen day but the generation window passed → +1 week.
  it("today is the chosen day, after 08:00 → next week (justified skip)", () => {
    const now = new Date(2026, 5, 9, 20, 0); // 20:00 — past 08:00
    const r = nextRunDate(now.getDay(), now);
    expect(r.getDay()).toBe(now.getDay());
    expect(dayDiff(r, now)).toBe(7);
  });

  it("today is the chosen day, exactly 08:00 → next week", () => {
    const now = new Date(2026, 5, 9, 8, 0);
    expect(dayDiff(nextRunDate(now.getDay(), now), now)).toBe(7);
  });

  // Cas n°3 — a later weekday this week → THIS week (not next).
  it("future weekday later this week → this week", () => {
    const now = new Date(2026, 5, 9, 10, 0);
    const chosen = (now.getDay() + 2) % 7; // 2 days ahead
    const r = nextRunDate(chosen, now);
    expect(r.getDay()).toBe(chosen);
    expect(dayDiff(r, now)).toBe(2);
  });

  // Cas D — a weekday earlier in the week → next occurrence (next week).
  it("weekday earlier in the week → next occurrence", () => {
    const now = new Date(2026, 5, 9, 10, 0);
    const chosen = (now.getDay() + 6) % 7; // "yesterday" → 6 days ahead
    const r = nextRunDate(chosen, now);
    expect(r.getDay()).toBe(chosen);
    expect(dayDiff(r, now)).toBe(6);
  });

  it("works for ALL 7 weekdays and never returns a past date", () => {
    const now = new Date(2026, 5, 9, 10, 0);
    const startOfToday = new Date(2026, 5, 9).getTime();
    for (let dow = 0; dow < 7; dow++) {
      const r = nextRunDate(dow, now);
      expect(r.getDay()).toBe(dow); // always lands on the chosen weekday
      expect(r.getTime()).toBeGreaterThanOrEqual(startOfToday); // never in the past
      expect(dayDiff(r, now)).toBeLessThanOrEqual(7); // soonest occurrence
    }
  });

  it("always normalizes the run time to 08:00 local", () => {
    const now = new Date(2026, 5, 9, 14, 37);
    const r = nextRunDate((now.getDay() + 1) % 7, now);
    expect(r.getHours()).toBe(8);
    expect(r.getMinutes()).toBe(0);
  });
});

describe("nextRunLabel — display string", () => {
  it("renders a FR weekday + date + 8h, and today (before 08:00) stays today", () => {
    const now = new Date(2026, 5, 9, 6, 0); // Tue 9 Jun 2026
    const label = nextRunLabel(now.getDay(), now);
    expect(label).toContain("9 juin");
    expect(label).toMatch(/, 8h$/);
  });
});
