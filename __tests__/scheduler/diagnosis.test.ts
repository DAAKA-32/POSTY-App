import { describe, expect, it } from "vitest";
import { ERROR_CATALOG } from "../../functions/src/scheduler/errors";
import { HEARTBEAT_STALE_MS, VERDICT_LABELS, diagnoseScheduledPost } from "@/lib/scheduling/diagnosis";

const NOW = Date.UTC(2026, 8, 30, 8, 0, 0);
const alive = { lastRunAtMs: NOW - 30_000 };
const dead = { lastRunAtMs: NOW - HEARTBEAT_STALE_MS - 1 };
const post = (status: string, extra: Partial<{ scheduledAtMs: number | null; errorCode: string | null; reconciled: boolean }> = {}) => ({
  status,
  scheduledAtMs: NOW - 60_000,
  errorCode: null,
  reconciled: false,
  ...extra,
});

describe("diagnoseScheduledPost — why wasn't this post published?", () => {
  it("scheduler never executed", () => {
    expect(diagnoseScheduledPost(post("pending"), dead, NOW)).toBe("scheduler_not_running");
    expect(diagnoseScheduledPost(post("pending"), { lastRunAtMs: null }, NOW)).toBe("scheduler_not_running");
  });

  it("post not due yet / about to be picked up", () => {
    expect(diagnoseScheduledPost(post("pending", { scheduledAtMs: NOW + 60_000 }), dead, NOW)).toBe("not_due_yet");
    expect(diagnoseScheduledPost(post("pending"), alive, NOW)).toBe("waiting_for_scheduler");
  });

  it.each([
    ["TOKEN_EXPIRED", "token_expired"],
    ["AUTH_REJECTED", "authentication_failed"],
    ["TOKEN_DECRYPT_FAILED", "authentication_failed"],
    ["CONFIG_ENCRYPTION_KEY_MISSING", "server_misconfigured"],
    ["CONTENT_REJECTED", "api_rejected"],
    ["TIMEOUT", "network_or_platform_unavailable"],
    ["OUTCOME_UNKNOWN", "outcome_unknown"],
  ])("failed with %s → %s", (code, verdict) => {
    expect(diagnoseScheduledPost(post("failed", { errorCode: code }), alive, NOW)).toBe(verdict);
  });

  it("duplicate prevented vs plain success", () => {
    expect(diagnoseScheduledPost(post("published", { reconciled: true }), alive, NOW)).toBe("duplicate_prevented");
    expect(diagnoseScheduledPost(post("published"), alive, NOW)).toBe("published");
  });

  it("every scheduler error code maps to a specific verdict (none falls through to 'unknown')", () => {
    for (const code of Object.keys(ERROR_CATALOG)) {
      const verdict = diagnoseScheduledPost(post("failed", { errorCode: code }), alive, NOW);
      expect(verdict, code).not.toBe("unknown");
      expect(VERDICT_LABELS[verdict].length).toBeGreaterThan(5);
    }
  });
});
