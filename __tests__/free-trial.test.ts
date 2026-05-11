import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  FREE_TRIAL_DURATION_DAYS,
  FREE_TRIAL_DURATION_MS,
  calculateFreeTrialEndDate,
  resolveFreeTrialStart,
  resolveFreeTrialEnd,
  getFreeTrialDaysRemaining,
  isFreeTrialExpired,
} from "@/lib/config/plans";

const DAY_MS = 24 * 60 * 60 * 1000;

// Mimic Firestore Timestamp's `toDate()` shape so the helpers exercise the
// same code path they hit in production (production data comes from Firestore
// SDKs, not raw Date objects).
function fakeTs(date: Date) {
  return { toDate: () => date };
}

describe("Free-plan 30-day trial — pure helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Anchor "now" to a fixed instant so all relative-day math is deterministic.
    vi.setSystemTime(new Date("2026-04-29T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constants", () => {
    it("locks the trial at 30 days", () => {
      expect(FREE_TRIAL_DURATION_DAYS).toBe(30);
      expect(FREE_TRIAL_DURATION_MS).toBe(30 * DAY_MS);
    });
  });

  describe("calculateFreeTrialEndDate", () => {
    it("returns start + 30 days", () => {
      const start = new Date("2026-04-29T12:00:00.000Z");
      const end = calculateFreeTrialEndDate(start);
      expect(end.getTime() - start.getTime()).toBe(30 * DAY_MS);
    });

    it("defaults start to now when omitted", () => {
      const end = calculateFreeTrialEndDate();
      expect(end.getTime() - Date.now()).toBe(30 * DAY_MS);
    });
  });

  describe("resolveFreeTrialStart", () => {
    const created = new Date("2026-04-01T00:00:00.000Z");
    const subscribed = new Date("2026-04-10T00:00:00.000Z");
    const trialStart = new Date("2026-04-15T00:00:00.000Z");

    it("prefers explicit freeTrialStartedAt", () => {
      const profile = {
        subscription: {
          freeTrialStartedAt: fakeTs(trialStart),
          subscribedAt: fakeTs(subscribed),
        },
        createdAt: fakeTs(created),
      };
      expect(resolveFreeTrialStart(profile)?.toISOString()).toBe(trialStart.toISOString());
    });

    it("falls back to subscribedAt when freeTrialStartedAt missing", () => {
      const profile = {
        subscription: { subscribedAt: fakeTs(subscribed) },
        createdAt: fakeTs(created),
      };
      expect(resolveFreeTrialStart(profile)?.toISOString()).toBe(subscribed.toISOString());
    });

    it("falls back to createdAt when nothing else available — gates legacy users", () => {
      const profile = { createdAt: fakeTs(created) };
      expect(resolveFreeTrialStart(profile)?.toISOString()).toBe(created.toISOString());
    });

    it("returns null when no anchor at all", () => {
      expect(resolveFreeTrialStart({})).toBeNull();
      expect(resolveFreeTrialStart(null)).toBeNull();
      expect(resolveFreeTrialStart(undefined)).toBeNull();
    });

    it("accepts raw Date and number alongside Timestamp", () => {
      expect(resolveFreeTrialStart({ createdAt: created })?.toISOString()).toBe(created.toISOString());
      expect(resolveFreeTrialStart({ createdAt: created.getTime() })?.toISOString()).toBe(created.toISOString());
    });
  });

  describe("resolveFreeTrialEnd", () => {
    it("uses explicit freeTrialEndsAt when present", () => {
      const explicitEnd = new Date("2026-06-20T00:00:00.000Z");
      const profile = {
        subscription: {
          freeTrialStartedAt: fakeTs(new Date("2026-04-01T00:00:00.000Z")),
          freeTrialEndsAt: fakeTs(explicitEnd),
        },
      };
      expect(resolveFreeTrialEnd(profile)?.toISOString()).toBe(explicitEnd.toISOString());
    });

    it("derives end = start + 30d when only start is set", () => {
      const start = new Date("2026-04-15T00:00:00.000Z");
      const profile = {
        subscription: { freeTrialStartedAt: fakeTs(start) },
      };
      const end = resolveFreeTrialEnd(profile);
      expect(end).not.toBeNull();
      expect(end!.getTime() - start.getTime()).toBe(30 * DAY_MS);
    });

    it("derives end from createdAt for legacy users", () => {
      const created = new Date("2026-04-01T00:00:00.000Z");
      const profile = { createdAt: fakeTs(created) };
      const end = resolveFreeTrialEnd(profile);
      expect(end!.getTime() - created.getTime()).toBe(30 * DAY_MS);
    });

    it("returns null when no anchor exists", () => {
      expect(resolveFreeTrialEnd({})).toBeNull();
    });
  });

  describe("getFreeTrialDaysRemaining", () => {
    it("rounds up partial days so the user doesn't lose hours", () => {
      // End is 30 hours from now → counts as 2 days (Math.ceil).
      const end = new Date(Date.now() + 30 * 60 * 60 * 1000);
      expect(getFreeTrialDaysRemaining(end)).toBe(2);
    });

    it("returns 30 when trial just started", () => {
      const end = new Date(Date.now() + 30 * DAY_MS);
      expect(getFreeTrialDaysRemaining(end)).toBe(30);
    });

    it("returns 1 on the last day", () => {
      const end = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12h left
      expect(getFreeTrialDaysRemaining(end)).toBe(1);
    });

    it("returns 0 once expired", () => {
      const end = new Date(Date.now() - DAY_MS);
      expect(getFreeTrialDaysRemaining(end)).toBe(0);
    });

    it("returns 0 for null/undefined input", () => {
      expect(getFreeTrialDaysRemaining(null)).toBe(0);
      expect(getFreeTrialDaysRemaining(undefined)).toBe(0);
    });
  });

  describe("isFreeTrialExpired — gating logic", () => {
    it("blocks Free user past trial end", () => {
      const end = new Date(Date.now() - DAY_MS);
      expect(isFreeTrialExpired("free", end)).toBe(true);
    });

    it("allows Free user still within trial", () => {
      const end = new Date(Date.now() + 5 * DAY_MS);
      expect(isFreeTrialExpired("free", end)).toBe(false);
    });

    it("never expires for Pro users (no trial concept)", () => {
      const end = new Date(Date.now() - 60 * DAY_MS);
      expect(isFreeTrialExpired("pro", end)).toBe(false);
    });

    it("never expires for Max users (no trial concept)", () => {
      const end = new Date(Date.now() - 60 * DAY_MS);
      expect(isFreeTrialExpired("max", end)).toBe(false);
    });

    it("never expires for users with no plan (handled elsewhere)", () => {
      expect(isFreeTrialExpired(null, new Date(Date.now() - DAY_MS))).toBe(false);
    });

    it("fails open when trial end is missing — lazy backfill takes over", () => {
      // A Free user whose dates haven't been written yet shouldn't be locked
      // out; activateFreePlan / SubscriptionContext will resolve the anchor on
      // the next read.
      expect(isFreeTrialExpired("free", null)).toBe(false);
      expect(isFreeTrialExpired("free", undefined)).toBe(false);
    });
  });

  describe("end-to-end scenarios", () => {
    it("legacy account created 60 days ago is immediately expired", () => {
      const created = new Date(Date.now() - 60 * DAY_MS);
      const profile = { createdAt: fakeTs(created) };
      const end = resolveFreeTrialEnd(profile);
      expect(isFreeTrialExpired("free", end)).toBe(true);
    });

    it("fresh signup (today) has 30 days remaining and is not expired", () => {
      const now = new Date();
      const profile = {
        subscription: {
          freeTrialStartedAt: fakeTs(now),
          freeTrialEndsAt: fakeTs(calculateFreeTrialEndDate(now)),
        },
        createdAt: fakeTs(now),
      };
      const end = resolveFreeTrialEnd(profile);
      expect(isFreeTrialExpired("free", end)).toBe(false);
      expect(getFreeTrialDaysRemaining(end)).toBe(30);
    });

    it("user who upgrades to Pro mid-trial keeps full access (plan check short-circuits)", () => {
      // Trial would have expired 5 days ago, but plan is now Pro — irrelevant.
      const expiredEnd = new Date(Date.now() - 5 * DAY_MS);
      expect(isFreeTrialExpired("pro", expiredEnd)).toBe(false);
    });

    it("user on day 30 (last day) gets 1 day remaining + not expired", () => {
      // Trial started 29 days ago → ends ~24h from now.
      const start = new Date(Date.now() - 29 * DAY_MS);
      const end = calculateFreeTrialEndDate(start);
      expect(getFreeTrialDaysRemaining(end)).toBe(1);
      expect(isFreeTrialExpired("free", end)).toBe(false);
    });

    it("user on day 31 is expired with 0 days remaining", () => {
      const start = new Date(Date.now() - 31 * DAY_MS);
      const end = calculateFreeTrialEndDate(start);
      expect(getFreeTrialDaysRemaining(end)).toBe(0);
      expect(isFreeTrialExpired("free", end)).toBe(true);
    });
  });
});
