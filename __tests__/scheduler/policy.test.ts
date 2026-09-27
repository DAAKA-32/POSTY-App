import { describe, expect, it } from "vitest";
import {
  LEASE_MS,
  MAX_ATTEMPTS,
  MAX_LATENESS_MS,
  MAX_RETRY_AFTER_MS,
  RETRY_DELAYS_MS,
  decideClaim,
  decideFinalize,
  decideLeaseRecovery,
  decideSending,
  retryDelayMs,
  type AttemptError,
  type AttemptResult,
} from "../../functions/src/scheduler/policy";
import type { ScheduledPostState } from "../../functions/src/scheduler/types";

const NOW = Date.UTC(2026, 8, 30, 8, 0, 0);
const mid = () => 0.5; // jitter factor exactly 1

function state(overrides: Partial<ScheduledPostState> = {}): ScheduledPostState {
  return {
    status: "pending",
    platform: "linkedin",
    scheduledAtMs: NOW,
    attemptCount: 0,
    nextAttemptAtMs: null,
    leaseExpiresAtMs: null,
    processingBy: null,
    processingStartedAtMs: null,
    publishStage: null,
    priorSendUncertain: false,
    resumeState: {},
    ...overrides,
  };
}

function processing(overrides: Partial<ScheduledPostState> = {}): ScheduledPostState {
  return state({
    status: "processing",
    attemptCount: 1,
    processingBy: "run-A",
    processingStartedAtMs: NOW,
    leaseExpiresAtMs: NOW + LEASE_MS,
    publishStage: "claimed",
    ...overrides,
  });
}

function error(overrides: Partial<AttemptError> = {}): AttemptResult {
  return {
    kind: "error",
    error: {
      code: "PLATFORM_UNAVAILABLE",
      platform: "linkedin",
      retryable: true,
      ambiguous: false,
      httpStatus: 503,
      detail: "HTTP 503",
      ...overrides,
    },
  };
}

const success: AttemptResult = {
  kind: "success",
  externalPostId: "urn:li:share:1",
  publishedUrl: "https://www.linkedin.com/feed/update/urn:li:share:1/",
  reconciled: false,
  warnings: [],
};

describe("decideClaim — when may a run take a post", () => {
  it("claims a pending post whose time has come, with a lease", () => {
    const d = decideClaim(state(), NOW, "run-A");
    expect(d.kind).toBe("claim");
    if (d.kind !== "claim") return;
    expect(d.attempt).toBe(1);
    expect(d.patch).toMatchObject({
      status: "processing",
      attemptCount: 1,
      processingBy: "run-A",
      publishStage: "claimed",
      leaseExpiresAtMs: NOW + LEASE_MS,
      nextAttemptAtMs: null,
    });
  });

  it("uses <= : a post scheduled exactly now is due", () => {
    expect(decideClaim(state({ scheduledAtMs: NOW }), NOW, "r").kind).toBe("claim");
  });

  it("skips a post scheduled in the future (even by 1 ms)", () => {
    expect(decideClaim(state({ scheduledAtMs: NOW + 1 }), NOW, "r")).toEqual({ kind: "skip", reason: "not_due" });
  });

  it("claims a due retry and continues the attempt count", () => {
    const d = decideClaim(state({ status: "retrying", attemptCount: 2, nextAttemptAtMs: NOW - 1 }), NOW, "r");
    expect(d.kind === "claim" && d.attempt).toBe(3);
  });

  it("skips a retry whose backoff has not elapsed", () => {
    const d = decideClaim(state({ status: "retrying", attemptCount: 1, nextAttemptAtMs: NOW + 60_000 }), NOW, "r");
    expect(d).toEqual({ kind: "skip", reason: "not_due" });
  });

  it("never claims a post another run is processing (duplicate prevented)", () => {
    expect(decideClaim(processing(), NOW, "run-B")).toEqual({ kind: "skip", reason: "already_processing" });
  });

  it.each(["published", "failed", "cancelled"])("never claims a %s post", (status) => {
    expect(decideClaim(state({ status }), NOW, "r")).toEqual({ kind: "skip", reason: "terminal" });
  });

  it("skips a deleted post", () => {
    expect(decideClaim(null, NOW, "r")).toEqual({ kind: "skip", reason: "not_found" });
  });

  it("fails (without publishing) a first attempt discovered more than 24 h late", () => {
    const d = decideClaim(state({ scheduledAtMs: NOW - MAX_LATENESS_MS - 1 }), NOW, "r");
    expect(d.kind).toBe("fail");
    if (d.kind !== "fail") return;
    expect(d.code).toBe("MISSED_PUBLISH_WINDOW");
    expect(d.patch.status).toBe("failed");
    expect(d.patch.lastError?.code).toBe("MISSED_PUBLISH_WINDOW");
    expect(d.patch.failureReason).toMatch(/24 h/);
  });

  it("still publishes a post that is late but within 24 h", () => {
    expect(decideClaim(state({ scheduledAtMs: NOW - MAX_LATENESS_MS + 60_000 }), NOW, "r").kind).toBe("claim");
  });
});

describe("retryDelayMs — backoff schedule", () => {
  it("follows 1 → 5 → 15 → 30 min without jitter at random()=0.5", () => {
    expect([1, 2, 3, 4].map((a) => retryDelayMs(a, mid))).toEqual(RETRY_DELAYS_MS);
  });

  it("applies at most ±20 % jitter", () => {
    expect(retryDelayMs(1, () => 0)).toBe(48_000);
    expect(retryDelayMs(1, () => 1)).toBe(72_000);
  });

  it("honours Retry-After when longer, capped at 1 h", () => {
    expect(retryDelayMs(1, mid, 10 * 60_000)).toBe(10 * 60_000);
    expect(retryDelayMs(1, mid, 10 * 3_600_000)).toBe(MAX_RETRY_AFTER_MS);
    expect(retryDelayMs(3, mid, 1_000)).toBe(RETRY_DELAYS_MS[2]);
  });
});

describe("decideFinalize — recording the outcome of an attempt", () => {
  it("publishes: stores the external id, releases the lease, clears errors", () => {
    const d = decideFinalize(processing(), "run-A", NOW + 5_000, NOW, success, mid);
    expect(d.kind).toBe("published");
    if (d.kind !== "published") return;
    expect(d.patch).toMatchObject({
      status: "published",
      externalPostId: "urn:li:share:1",
      processingBy: null,
      leaseExpiresAtMs: null,
      lastError: null,
      failureReason: null,
      publishedAtMs: NOW + 5_000,
    });
    expect(d.patch.appendAttempt).toMatchObject({ attempt: 1, outcome: "published", runId: "run-A" });
  });

  it("does not rewrite an already published post", () => {
    expect(decideFinalize(state({ status: "published" }), "run-A", NOW, NOW, success, mid)).toEqual({
      kind: "noop",
      reason: "already_published",
    });
  });

  it("records a confirmed publication even if the claim was lost meanwhile", () => {
    const d = decideFinalize(state({ status: "retrying", attemptCount: 1 }), "run-A", NOW, NOW, success, mid);
    expect(d.kind).toBe("published");
  });

  it("schedules a retry for a transient error, keeping the real error", () => {
    const d = decideFinalize(processing(), "run-A", NOW, NOW, error(), mid);
    expect(d.kind).toBe("retry");
    if (d.kind !== "retry") return;
    expect(d.nextAttemptAtMs).toBe(NOW + RETRY_DELAYS_MS[0]);
    expect(d.patch).toMatchObject({ status: "retrying", failureReason: null, processingBy: null });
    expect(d.patch.lastError).toMatchObject({ code: "PLATFORM_UNAVAILABLE", httpStatus: 503, detail: "HTTP 503", attempt: 1 });
  });

  it("fails immediately on a permanent error, with an actionable message", () => {
    const d = decideFinalize(
      processing(),
      "run-A",
      NOW,
      NOW,
      error({ code: "AUTH_REJECTED", retryable: false, httpStatus: 401 }),
      mid,
    );
    expect(d.kind).toBe("failed");
    if (d.kind !== "failed") return;
    expect(d.code).toBe("AUTH_REJECTED");
    expect(d.patch.failureReason).toMatch(/Reconnectez/);
    expect(d.patch.lastError).toMatchObject({ code: "AUTH_REJECTED", httpStatus: 401, retryable: false });
  });

  it("gives up after MAX_ATTEMPTS transient failures", () => {
    const d = decideFinalize(processing({ attemptCount: MAX_ATTEMPTS }), "run-A", NOW, NOW, error(), mid);
    expect(d.kind === "failed" && d.code).toBe("PLATFORM_UNAVAILABLE");
  });

  it("LinkedIn: an ambiguous send (timeout) is retried with priorSendUncertain", () => {
    const d = decideFinalize(processing(), "run-A", NOW, NOW, error({ code: "TIMEOUT", ambiguous: true, httpStatus: null }), mid);
    expect(d.kind).toBe("retry");
    expect(d.kind === "retry" && d.patch.priorSendUncertain).toBe(true);
  });

  it("Facebook: an ambiguous send is never retried (no double post) → OUTCOME_UNKNOWN", () => {
    const d = decideFinalize(
      processing({ platform: "facebook" }),
      "run-A",
      NOW,
      NOW,
      error({ code: "TIMEOUT", ambiguous: true, platform: "facebook", httpStatus: null }),
      mid,
    );
    expect(d.kind === "failed" && d.code).toBe("OUTCOME_UNKNOWN");
    expect(d.kind === "failed" && d.patch.lastError?.detail).toMatch(/^TIMEOUT/);
  });

  it("an attempt that exhausts retries after an uncertain send ends as OUTCOME_UNKNOWN", () => {
    const d = decideFinalize(processing({ attemptCount: MAX_ATTEMPTS, priorSendUncertain: true }), "run-A", NOW, NOW, error(), mid);
    expect(d.kind === "failed" && d.code).toBe("OUTCOME_UNKNOWN");
  });

  it("a definitive permanent error keeps its own code even after an uncertain send", () => {
    const d = decideFinalize(
      processing({ priorSendUncertain: true }),
      "run-A",
      NOW,
      NOW,
      error({ code: "TOKEN_EXPIRED", retryable: false, httpStatus: null }),
      mid,
    );
    expect(d.kind === "failed" && d.code).toBe("TOKEN_EXPIRED");
  });

  it("ignores an error from a run that no longer owns the post", () => {
    expect(decideFinalize(processing({ processingBy: "run-B" }), "run-A", NOW, NOW, error(), mid)).toEqual({ kind: "lease_lost" });
  });

  it("reports a post deleted during the attempt", () => {
    expect(decideFinalize(null, "run-A", NOW, NOW, success, mid)).toEqual({ kind: "gone" });
  });
});

describe("decideSending — point of no return", () => {
  it("lets the owner with a live lease send, persisting resume state", () => {
    const d = decideSending(processing({ resumeState: { a: "1" } }), "run-A", NOW, { linkedinAssets: "x" });
    expect(d).toEqual({
      ok: true,
      patch: { updatedAtMs: NOW, publishStage: "sending", sendingAtMs: NOW, resumeState: { a: "1", linkedinAssets: "x" } },
    });
  });

  it("refuses another run", () => {
    expect(decideSending(processing(), "run-B", NOW)).toEqual({ ok: false });
  });

  it("refuses once the lease has expired", () => {
    expect(decideSending(processing({ leaseExpiresAtMs: NOW }), "run-A", NOW)).toEqual({ ok: false });
  });

  it("refuses when the owner cancelled meanwhile", () => {
    expect(decideSending(state({ status: "cancelled", processingBy: "run-A" }), "run-A", NOW)).toEqual({ ok: false });
  });
});

describe("decideLeaseRecovery — a run died mid-attempt", () => {
  it("leaves live leases alone", () => {
    expect(decideLeaseRecovery(processing(), NOW + 1_000, "run-R", mid)).toEqual({ kind: "skip" });
  });

  it("nothing was sent → safe retry", () => {
    const d = decideLeaseRecovery(processing({ leaseExpiresAtMs: NOW }), NOW, "run-R", mid);
    expect(d.kind).toBe("retry");
    if (d.kind !== "retry") return;
    expect(d.code).toBe("WORKER_TIMEOUT");
    expect(d.patch.priorSendUncertain).toBe(false);
    expect(d.patch.appendAttempt?.outcome).toBe("lease_expired");
  });

  it("LinkedIn create was sent → retry flagged uncertain (reconciled by duplicate detection)", () => {
    const d = decideLeaseRecovery(processing({ leaseExpiresAtMs: NOW, publishStage: "sending" }), NOW, "run-R", mid);
    expect(d.kind === "retry" && d.patch.priorSendUncertain).toBe(true);
  });

  it("Facebook create was sent → OUTCOME_UNKNOWN, never re-sent", () => {
    const d = decideLeaseRecovery(
      processing({ platform: "facebook", leaseExpiresAtMs: NOW, publishStage: "sending" }),
      NOW,
      "run-R",
      mid,
    );
    expect(d.kind === "failed" && d.code).toBe("OUTCOME_UNKNOWN");
  });
});
