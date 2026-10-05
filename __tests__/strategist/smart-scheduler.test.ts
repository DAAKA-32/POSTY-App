import { describe, expect, it } from "vitest";
import { computeScheduleSlots } from "@/lib/strategist/smart-scheduler";

const TZ = "Europe/Paris";

function slotFor(date: string, time: string, now: string) {
  const [slot] = computeScheduleSlots({
    briefs: [{ id: "b1", suggestedDate: date, suggestedTime: time }],
    timezone: TZ,
    now: new Date(now),
  });
  return slot;
}

describe("computeScheduleSlots — snap-to-peak", () => {
  it("never snaps a slot into the past (the cron would publish it immediately)", () => {
    // 13:50 Paris; the brief asks for 14:00 (dead zone). The nearest peak
    // centre is 12:30 — already past — so it must move to the next peak.
    const now = "2026-10-06T11:50:00Z";
    const slot = slotFor("2026-10-06", "14:00", now);
    expect(slot.fireAt.getTime()).toBeGreaterThanOrEqual(new Date(now).getTime() + 5 * 60_000);
    expect(slot.fireAt.toISOString()).toBe("2026-10-06T15:45:00.000Z"); // 17:45 Paris
    expect(slot).toMatchObject({ adjusted: true, adjustmentReason: "snapped-to-peak" });
  });

  it("snaps a future dead-zone slot to the nearest peak centre of that day", () => {
    const slot = slotFor("2026-10-07", "03:00", "2026-10-06T11:50:00Z");
    expect(slot.fireAt.toISOString()).toBe("2026-10-07T06:30:00.000Z"); // 08:30 Paris (CEST)
  });

  it("keeps the local wall-clock across a DST change (2026-10-25, Paris falls back at 03:00)", () => {
    // 01:30 CEST → snapped to 08:30 CET (UTC+1), not 07:30.
    const slot = slotFor("2026-10-25", "01:30", "2026-10-20T10:00:00Z");
    expect(slot.fireAt.toISOString()).toBe("2026-10-25T07:30:00.000Z");
  });

  it("pushes a past slot to the next peak", () => {
    const now = "2026-10-06T11:50:00Z";
    const slot = slotFor("2026-10-06", "08:00", now);
    expect(slot.fireAt.getTime()).toBeGreaterThanOrEqual(new Date(now).getTime() + 5 * 60_000);
    expect(slot).toMatchObject({ adjusted: true, adjustmentReason: "past" });
  });
});
