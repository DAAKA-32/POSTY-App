import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CATALOG } from "../../functions/src/scheduler/errors";
import { PUBLISHERS } from "../../functions/src/scheduler/publishers";
import { SCHEDULER_PLATFORMS } from "../../functions/src/scheduler/types";
import { en } from "@/lib/i18n/translations/en";
import { fr } from "@/lib/i18n/translations/fr";
import type { Translations } from "@/lib/i18n";
import { SCHEDULABLE_PLATFORMS, isSchedulablePlatform } from "@/lib/scheduling/platforms";
import {
  canCancelScheduledPost,
  canDeleteScheduledPost,
  canRescheduleScheduledPost,
  describeRetryReason,
  describeScheduledFailure,
  isUpcomingStatus,
} from "@/lib/scheduling/publish-status";
import type { ScheduledPost, ScheduledPublishErrorCode, ScheduleStatus } from "@/types";

const LOCALES: Array<[string, Translations]> = [
  ["fr", fr as unknown as Translations],
  ["en", en as unknown as Translations],
];

function failedPost(code: string, platform = "linkedin"): ScheduledPost {
  return {
    id: "p1",
    userId: "u",
    content: "c",
    scheduledAt: { toDate: () => new Date() } as never,
    timezone: "Europe/Paris",
    status: "failed",
    platform: platform as ScheduledPost["platform"],
    createdAt: {} as never,
    updatedAt: {} as never,
    attemptCount: 1,
    lastError: {
      code: code as ScheduledPublishErrorCode,
      message: "fallback FR",
      detail: "HTTP 422 — detail",
      platform,
      httpStatus: 422,
      retryable: false,
      ambiguous: false,
      attempt: 1,
      at: {} as never,
    },
    failureReason: "fallback FR",
  };
}

describe("scheduler ↔ app contract", () => {
  it("every scheduler error code has a localized, actionable message in the app", () => {
    for (const [, t] of LOCALES) {
      for (const code of Object.keys(ERROR_CATALOG)) {
        const described = describeScheduledFailure(failedPost(code), t);
        expect(described, code).not.toBeNull();
        expect(described!.message, code).not.toBe("fallback FR");
        expect(described!.message, code).not.toContain("{platform}");
      }
    }
  });

  it("auth failures point the user to reconnecting, with the platform named", () => {
    for (const code of ["TOKEN_EXPIRED", "AUTH_REJECTED", "CONNECTION_NOT_FOUND", "PERMISSION_DENIED"]) {
      const d = describeScheduledFailure(failedPost(code), en as unknown as Translations)!;
      expect(d.action, code).toBe("reconnect");
      expect(d.message, code).toContain("LinkedIn");
    }
  });

  it("ambiguous outcomes tell the user to check before rescheduling (no blind duplicate)", () => {
    expect(describeScheduledFailure(failedPost("OUTCOME_UNKNOWN"), fr as unknown as Translations)).toMatchObject({
      action: "check_profile",
      message: expect.stringContaining("Vérifiez votre profil"),
    });
  });

  it("legacy failures (no error code) still show their stored reason", () => {
    const legacy = { ...failedPost("X"), lastError: undefined, failureReason: "LinkedIn API error: 422" };
    expect(describeScheduledFailure(legacy, fr as unknown as Translations)!.message).toBe("LinkedIn API error: 422");
  });

  it("retry reasons are localized too", () => {
    const retrying = { ...failedPost("PLATFORM_UNAVAILABLE"), status: "retrying" as const };
    expect(describeRetryReason(retrying, en as unknown as Translations)).toBe("LinkedIn didn't respond");
  });

  it("the app only schedules platforms the scheduler can publish", () => {
    for (const platform of SCHEDULABLE_PLATFORMS) {
      expect(SCHEDULER_PLATFORMS).toContain(platform);
      expect(PUBLISHERS[platform], platform).toBeTypeOf("function");
    }
    for (const unsupported of ["bluesky", "mastodon", "discord", "medium", "", undefined, 42]) {
      expect(isSchedulablePlatform(unsupported)).toBe(false);
    }
  });

  it("firestore.rules accepts exactly the scheduler's platforms", () => {
    const rules = readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8");
    const match = rules.match(/function isSchedulerPlatform\(platform\) \{\s*return platform in \[([^\]]+)\]/);
    expect(match).not.toBeNull();
    const listed = match![1].split(",").map((s) => s.trim().replace(/'/g, ""));
    expect([...listed].sort()).toEqual([...SCHEDULER_PLATFORMS].sort());
  });

  it("client status helpers mirror the owner transitions allowed by firestore.rules", () => {
    const all: ScheduleStatus[] = ["pending", "processing", "retrying", "published", "failed", "cancelled"];
    expect(all.filter(canCancelScheduledPost)).toEqual(["pending", "retrying", "failed"]);
    expect(all.filter(canRescheduleScheduledPost)).toEqual(["pending", "retrying", "failed", "cancelled"]);
    expect(all.filter(canDeleteScheduledPost)).toEqual(["pending", "retrying", "failed", "cancelled"]);
    expect(all.filter(isUpcomingStatus)).toEqual(["pending", "processing", "retrying"]);

    const rules = readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8");
    expect(rules).toMatch(/isOwnerCancel\(\) \{[\s\S]*?resource\.data\.status in \['pending', 'retrying', 'failed'\]/);
    expect(rules).toMatch(/isOwnerReschedule\(\) \{[\s\S]*?resource\.data\.status in \['pending', 'retrying', 'failed', 'cancelled'\]/);
  });
});
