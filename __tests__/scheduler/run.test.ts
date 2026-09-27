import { randomBytes } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { encryptToken } from "../../functions/src/crypto/token-cipher";
import { LEASE_MS, MAX_LATENESS_MS, RETRY_DELAYS_MS } from "../../functions/src/scheduler/policy";
import { runSchedulerTick } from "../../functions/src/scheduler/run";
import type { FetchLike } from "../../functions/src/scheduler/http";
import {
  LINKEDIN_ID,
  T0,
  USER,
  createHarness,
  linkedInConnection,
  scheduledPostDoc,
  type Harness,
} from "./helpers/fakes";

const ACCESS_TOKEN = "AQX-linkedin-access-token-secret";
let encryptedToken = "";

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  encryptedToken = encryptToken(ACCESS_TOKEN); // exactly what the app stores
});

let h: Harness;
beforeEach(() => {
  h = createHarness();
  h.data.setConnection("linkedinConnections", USER, linkedInConnection(encryptedToken));
});

const statusOf = (id: string) => h.store.get(id).status;
const lastError = (id: string) => h.store.get(id).lastError as Record<string, unknown> | null;

/** What the app writes on "Reprogrammer" (lib/db/firestore.ts#reschedulePost). */
function rescheduleLikeTheApp(id: string, atMs: number) {
  h.store.docs.set(id, {
    ...h.store.get(id),
    scheduledAt: Timestamp.fromMillis(atMs),
    status: "pending",
    attemptCount: 0,
    failureReason: null,
    nextAttemptAt: null,
    lastError: null,
    priorSendUncertain: false,
    resumeState: {},
  });
}

describe("scheduled publication — happy path", () => {
  it("Create → Schedule → Wait → Publish → Published (with external id)", async () => {
    h.store.docs.set("p1", scheduledPostDoc({ scheduledAt: Timestamp.fromMillis(T0 + 60_000) }));

    // Before its time: untouched.
    await runSchedulerTick(h.deps("run-early"));
    expect(statusOf("p1")).toBe("pending");
    expect(h.linkedin.ugcCreateCalls).toBe(0);

    // Its minute comes.
    h.clock.advance(60_000);
    const stats = await runSchedulerTick(h.deps("run-1"));

    expect(stats).toMatchObject({ due: 1, claimed: 1, published: 1, failed: 0 });
    const post = h.store.get("p1");
    expect(post).toMatchObject({
      status: "published",
      externalPostId: "urn:li:share:7100",
      publishedUrl: "https://www.linkedin.com/feed/update/urn:li:share:7100/",
      attemptCount: 1,
      lastError: null,
      failureReason: null,
      processingBy: null,
      leaseExpiresAt: null,
    });
    expect(post.attempts).toHaveLength(1);
    expect((post.attempts as Array<Record<string, unknown>>)[0]).toMatchObject({ outcome: "published", attempt: 1 });

    // The real token (decrypted) was used, with the app's UA and visibility.
    const create = h.linkedin.calls.find((c) => c.url.endsWith("/ugcPosts"))!;
    expect(create.authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(h.linkedin.shares[0]).toMatchObject({ author: `urn:li:person:${LINKEDIN_ID}`, visibility: "PUBLIC" });

    // Analytics record — same shape as the direct flow, deterministic id.
    expect(h.data.records.get("linkedinPosts/sched_p1")).toMatchObject({
      userId: USER,
      linkedInId: "urn:li:share:7100",
      scheduledPostId: "p1",
      success: true,
      status: "published",
      syncStatus: "not_available",
      authorType: "person",
    });

    // Heartbeat proves the scheduler ran.
    expect(h.store.heartbeats.at(-1)).toMatchObject({ runId: "run-1", stats: expect.objectContaining({ published: 1 }) });
  });

  it("enqueues the LinkedIn seed comment exactly once", async () => {
    h.store.docs.set(
      "p1",
      scheduledPostDoc({ seedComment: { enabled: true, text: "Merci d'avoir lu jusqu'ici !", delayMinutes: 5 } }),
    );
    await runSchedulerTick(h.deps());
    expect(h.seeds).toHaveLength(1);
    expect(h.seeds[0]).toMatchObject({
      scheduledPostId: "p1",
      parentPostUrn: "urn:li:share:7100",
      actorUrn: `urn:li:person:${LINKEDIN_ID}`,
    });
  });
});

describe("permanent errors → failed, with a clear reason", () => {
  it("Schedule → API rejects (401) → failed + reconnect reason, no retry", async () => {
    h.store.docs.set("p1", scheduledPostDoc());
    h.linkedin.ugcScript.push({ status: 401, body: '{"message":"Invalid access token"}' });

    const stats = await runSchedulerTick(h.deps());

    expect(stats.failed).toBe(1);
    expect(statusOf("p1")).toBe("failed");
    expect(lastError("p1")).toMatchObject({
      code: "AUTH_REJECTED",
      httpStatus: 401,
      retryable: false,
      platform: "linkedin",
    });
    expect(String(lastError("p1")!.detail)).toContain("Invalid access token");
    expect(h.store.get("p1").failureReason).toMatch(/Reconnectez/);
    expect(h.log.events("scheduler.post_failed")[0].fields).toMatchObject({ postId: "p1", code: "AUTH_REJECTED", httpStatus: 401 });
  });

  it("expired LinkedIn token → failed TOKEN_EXPIRED without calling LinkedIn → reconnect + reschedule → Published", async () => {
    h.data.setConnection(
      "linkedinConnections",
      USER,
      linkedInConnection(encryptedToken, { expiresAt: Timestamp.fromMillis(T0 - 1) }),
    );
    h.store.docs.set("p1", scheduledPostDoc());

    await runSchedulerTick(h.deps());
    expect(statusOf("p1")).toBe("failed");
    expect(lastError("p1")!.code).toBe("TOKEN_EXPIRED");
    expect(h.linkedin.ugcCreateCalls).toBe(0);

    // User reconnects LinkedIn (app writes a fresh encrypted token)…
    h.data.setConnection("linkedinConnections", USER, linkedInConnection(encryptToken("fresh-token")));
    // …and reschedules the failed post.
    rescheduleLikeTheApp("p1", T0 + 10 * 60_000);
    h.clock.advance(10 * 60_000);
    await runSchedulerTick(h.deps("run-2"));

    expect(statusOf("p1")).toBe("published");
    expect(h.linkedin.calls.find((c) => c.url.endsWith("/ugcPosts"))!.authorization).toBe("Bearer fresh-token");
  });

  it("identical content already on the profile (first attempt) → failed DUPLICATE_CONTENT", async () => {
    h.linkedin.shares.push({ urn: "urn:li:share:6999", author: `urn:li:person:${LINKEDIN_ID}`, text: "Scheduled post body", media: [], visibility: "PUBLIC" });
    h.store.docs.set("p1", scheduledPostDoc());
    await runSchedulerTick(h.deps());
    expect(statusOf("p1")).toBe("failed");
    expect(lastError("p1")!.code).toBe("DUPLICATE_CONTENT");
  });

  it("a legacy doc on a platform without scheduled publisher → UNSUPPORTED_PLATFORM", async () => {
    h.store.docs.set("p1", scheduledPostDoc({ platform: "bluesky" }));
    await runSchedulerTick(h.deps());
    expect(lastError("p1")!.code).toBe("UNSUPPORTED_PLATFORM");
  });

  it("more than 24 h late (scheduler outage) → MISSED_PUBLISH_WINDOW, nothing published", async () => {
    h.store.docs.set("p1", scheduledPostDoc({ scheduledAt: Timestamp.fromMillis(T0 - MAX_LATENESS_MS - 60_000) }));
    await runSchedulerTick(h.deps());
    expect(statusOf("p1")).toBe("failed");
    expect(lastError("p1")!.code).toBe("MISSED_PUBLISH_WINDOW");
    expect(h.linkedin.ugcCreateCalls).toBe(0);
  });
});

describe("temporary errors → retry with backoff", () => {
  it("Schedule → temporary failure (503) → retry → Published", async () => {
    h.store.docs.set("p1", scheduledPostDoc());
    h.linkedin.ugcScript.push({ status: 503, body: "Service Unavailable" });

    await runSchedulerTick(h.deps("run-1"));
    expect(statusOf("p1")).toBe("retrying");
    expect(lastError("p1")).toMatchObject({ code: "PLATFORM_UNAVAILABLE", httpStatus: 503, retryable: true });
    const nextAttemptMs = (h.store.get("p1").nextAttemptAt as Timestamp).toMillis();
    expect(nextAttemptMs).toBe(T0 + RETRY_DELAYS_MS[0]);

    // Next minute tick, before the backoff elapsed: nothing happens.
    h.clock.advance(30_000);
    await runSchedulerTick(h.deps("run-2"));
    expect(statusOf("p1")).toBe("retrying");
    expect(h.linkedin.ugcCreateCalls).toBe(1);

    h.clock.advance(30_000);
    await runSchedulerTick(h.deps("run-3"));
    expect(statusOf("p1")).toBe("published");
    expect(h.store.get("p1").attemptCount).toBe(2);
    expect((h.store.get("p1").attempts as Array<{ outcome: string }>).map((a) => a.outcome)).toEqual([
      "retry_scheduled",
      "published",
    ]);
  });

  it("honours Retry-After on 429", async () => {
    h.store.docs.set("p1", scheduledPostDoc());
    h.linkedin.ugcScript.push({ status: 429, headers: { "retry-after": "600" } });
    await runSchedulerTick(h.deps());
    expect((h.store.get("p1").nextAttemptAt as Timestamp).toMillis()).toBe(T0 + 600_000);
  });

  it("gives up after 5 attempts with the last real error", async () => {
    h.store.docs.set("p1", scheduledPostDoc());
    for (let i = 0; i < 5; i++) h.linkedin.ugcScript.push({ status: 502 });
    for (let i = 0; i < 5; i++) {
      await runSchedulerTick(h.deps(`run-${i}`));
      h.clock.advance(31 * 60_000);
    }
    expect(statusOf("p1")).toBe("failed");
    expect(h.store.get("p1").attemptCount).toBe(5);
    expect(lastError("p1")).toMatchObject({ code: "PLATFORM_UNAVAILABLE", httpStatus: 502 });
  });

  it("a post cancelled while waiting for its retry is never published", async () => {
    h.store.docs.set("p1", scheduledPostDoc());
    h.linkedin.ugcScript.push({ status: 503 });
    await runSchedulerTick(h.deps("run-1"));
    h.store.docs.set("p1", { ...h.store.get("p1"), status: "cancelled", nextAttemptAt: null });
    h.clock.advance(10 * 60_000);
    await runSchedulerTick(h.deps("run-2"));
    expect(statusOf("p1")).toBe("cancelled");
    expect(h.linkedin.ugcCreateCalls).toBe(1);
  });
});

describe("idempotency — never publish twice", () => {
  it("Scheduler A + Scheduler B at the same time → ONE publication", async () => {
    h.store.docs.set("p1", scheduledPostDoc());
    const [a, b] = await Promise.all([runSchedulerTick(h.deps("run-A")), runSchedulerTick(h.deps("run-B"))]);

    expect(h.linkedin.shares).toHaveLength(1);
    expect(h.linkedin.ugcCreateCalls).toBe(1);
    expect(a.published + b.published).toBe(1);
    expect(a.skipped + b.skipped).toBe(1);
    expect(h.log.events("scheduler.claim_skipped")[0].fields).toMatchObject({ postId: "p1", duplicatePrevented: true });
  });

  it("10 overlapping runs on 5 due posts → exactly 5 publications", async () => {
    for (let i = 0; i < 5; i++) {
      h.store.docs.set(`p${i}`, scheduledPostDoc({ content: `Post number ${i}` }));
    }
    await Promise.all(Array.from({ length: 10 }, (_, i) => runSchedulerTick(h.deps(`run-${i}`))));
    expect(h.linkedin.shares).toHaveLength(5);
    // Not just "LinkedIn deduplicated us": each post was SENT exactly once.
    expect(h.linkedin.ugcCreateCalls).toBe(5);
    expect([...h.store.docs.values()].every((d) => d.status === "published")).toBe(true);
  });

  it("timeout AFTER LinkedIn created the post → retry recognises it (duplicate proof) → Published once", async () => {
    h.store.docs.set(
      "p1",
      scheduledPostDoc({ seedComment: { enabled: true, text: "Commentaire d'amorce suffisamment long", delayMinutes: 5 } }),
    );
    h.linkedin.ugcScript.push("timeout_after_create");

    await runSchedulerTick(h.deps("run-1"));
    // The share exists on LinkedIn, but we could not know it.
    expect(h.linkedin.shares).toHaveLength(1);
    expect(statusOf("p1")).toBe("retrying");
    expect(h.store.get("p1")).toMatchObject({ priorSendUncertain: true });
    expect(lastError("p1")).toMatchObject({ code: "TIMEOUT", ambiguous: true });

    h.clock.advance(RETRY_DELAYS_MS[0]);
    await runSchedulerTick(h.deps("run-2"));

    expect(h.linkedin.shares).toHaveLength(1); // still ONE post
    expect(h.store.get("p1")).toMatchObject({
      status: "published",
      reconciled: true,
      externalPostId: h.linkedin.shares[0].urn,
      priorSendUncertain: false,
    });
    expect(h.seeds).toHaveLength(1);
  });

  it("worker crash after sending → lease recovery → reconciled, not re-published", async () => {
    // LinkedIn already has the post; our run died before recording it.
    h.linkedin.shares.push({ urn: "urn:li:share:7555", author: `urn:li:person:${LINKEDIN_ID}`, text: "Scheduled post body", media: [], visibility: "PUBLIC" });
    h.store.docs.set(
      "p1",
      scheduledPostDoc({
        status: "processing",
        attemptCount: 1,
        processingBy: "run-dead",
        processingStartedAt: Timestamp.fromMillis(T0 - LEASE_MS - 60_000),
        leaseExpiresAt: Timestamp.fromMillis(T0 - 60_000),
        publishStage: "sending",
        resumeState: { linkedinAssets: "" },
      }),
    );

    const stats = await runSchedulerTick(h.deps("run-1"));
    expect(stats.recovered).toBe(1);
    expect(statusOf("p1")).toBe("retrying");

    h.clock.advance(RETRY_DELAYS_MS[0]);
    await runSchedulerTick(h.deps("run-2"));
    expect(h.store.get("p1")).toMatchObject({ status: "published", reconciled: true, externalPostId: "urn:li:share:7555" });
    expect(h.linkedin.shares).toHaveLength(1);
  });

  it("worker crash BEFORE sending → safe retry → Published", async () => {
    h.store.docs.set(
      "p1",
      scheduledPostDoc({
        status: "processing",
        attemptCount: 1,
        processingBy: "run-dead",
        leaseExpiresAt: Timestamp.fromMillis(T0 - 1),
        publishStage: "claimed",
      }),
    );
    await runSchedulerTick(h.deps("run-1"));
    expect(h.store.get("p1")).toMatchObject({ status: "retrying", priorSendUncertain: false });
    h.clock.advance(RETRY_DELAYS_MS[0]);
    await runSchedulerTick(h.deps("run-2"));
    expect(statusOf("p1")).toBe("published");
  });

  it("Facebook: ambiguous send → OUTCOME_UNKNOWN, never re-sent", async () => {
    h.data.setConnection("facebookConnections", USER, {
      pages: [{ id: "page1", accessToken: encryptToken("page-token") }],
      selectedPageId: "page1",
    });
    h.store.docs.set("p1", scheduledPostDoc({ platform: "facebook" }));
    let sends = 0;
    const fetch: FetchLike = async (url, init) => {
      if (url.includes("graph.facebook.com")) {
        sends++;
        throw new DOMException("timeout", "TimeoutError");
      }
      return h.linkedin.fetch(url, init);
    };
    const base = h.deps();
    await runSchedulerTick({ ...base, platform: { ...base.platform, fetch } });
    h.clock.advance(60 * 60_000);
    await runSchedulerTick({ ...h.deps("run-2"), platform: { ...base.platform, fetch } });

    expect(sends).toBe(1);
    expect(statusOf("p1")).toBe("failed");
    expect(lastError("p1")!.code).toBe("OUTCOME_UNKNOWN");
    expect(h.store.get("p1").failureReason).toMatch(/Vérifiez votre profil/);
  });

  it("deadline too close to the function timeout → no send, safe retry", async () => {
    h.store.docs.set("p1", scheduledPostDoc());
    await runSchedulerTick(h.deps("run-1", { deadlineMs: T0 + 5_000 }));
    expect(h.linkedin.ugcCreateCalls).toBe(0);
    expect(statusOf("p1")).toBe("retrying");
    expect(lastError("p1")).toMatchObject({ code: "DEADLINE_EXCEEDED", ambiguous: false });
  });
});

describe("media", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  it("uploads images, then deletes ONLY temporary uploads (Strategist visuals are kept)", async () => {
    const temp = `scheduled-posts/${USER}/p1/photo.png`;
    const library = `users/${USER}/generated-images/visual.png`;
    h.data.files.set(temp, png);
    h.data.files.set(library, png);
    h.store.docs.set(
      "p1",
      scheduledPostDoc({
        images: [
          { storagePath: temp, downloadURL: "https://x/1", fileName: "photo.png", contentType: "image/png", size: 4 },
          { storagePath: library, downloadURL: "https://x/2", fileName: "visual.png", contentType: "image/png", size: 4 },
        ],
      }),
    );

    await runSchedulerTick(h.deps());

    expect(statusOf("p1")).toBe("published");
    expect(h.linkedin.shares[0].media).toHaveLength(2);
    expect(h.deleted).toEqual([temp]);
  });

  it("image missing from storage → published text-only, with a visible warning", async () => {
    h.store.docs.set(
      "p1",
      scheduledPostDoc({
        images: [{ storagePath: `scheduled-posts/${USER}/p1/gone.png`, downloadURL: "https://x", fileName: "gone.png", contentType: "image/png", size: 1 }],
      }),
    );
    await runSchedulerTick(h.deps());
    expect(statusOf("p1")).toBe("published");
    expect(h.linkedin.shares[0].media).toHaveLength(0);
    expect(h.store.get("p1").warnings).toEqual([expect.objectContaining({ code: "IMAGE_DROPPED" })]);
  });

  it("transient media error → the whole post is retried (no silent text-only fallback)", async () => {
    h.data.files.set(`scheduled-posts/${USER}/p1/a.png`, png);
    h.store.docs.set(
      "p1",
      scheduledPostDoc({
        images: [{ storagePath: `scheduled-posts/${USER}/p1/a.png`, downloadURL: "https://x", fileName: "a.png", contentType: "image/png", size: 4 }],
      }),
    );
    h.linkedin.registerScript.push({ status: 500 });
    await runSchedulerTick(h.deps());
    expect(statusOf("p1")).toBe("retrying");
    expect(h.linkedin.ugcCreateCalls).toBe(0);
  });

  it("refuses an image path outside the owner's storage (cross-user file access)", async () => {
    const victimFile = "scheduled-posts/user_victim/x/private.png";
    h.data.files.set(victimFile, png);
    h.store.docs.set(
      "p1",
      scheduledPostDoc({
        images: [{ storagePath: victimFile, downloadURL: "https://x", fileName: "private.png", contentType: "image/png", size: 4 }],
      }),
    );
    await runSchedulerTick(h.deps());
    expect(statusOf("p1")).toBe("failed");
    expect(lastError("p1")!.code).toBe("INVALID_POST_DATA");
    expect(h.data.downloads).toEqual([]);
    expect(h.deleted).toEqual([]);
  });
});

describe("LinkedIn Company Page", () => {
  it("publishes as the organization when the user still administers it", async () => {
    h.data.setConnection(
      "linkedinConnections",
      USER,
      linkedInConnection(encryptedToken, { organizations: [{ urn: "urn:li:organization:42", name: "Acme" }] }),
    );
    h.store.docs.set("p1", scheduledPostDoc({ organizationUrn: "urn:li:organization:42" }));
    await runSchedulerTick(h.deps());
    expect(h.linkedin.shares[0].author).toBe("urn:li:organization:42");
    expect(h.data.records.get("linkedinPosts/sched_p1")).toMatchObject({ authorType: "organization", syncStatus: "pending" });
  });

  it("admin access lost → personal profile, recorded as a warning (not silent)", async () => {
    h.store.docs.set("p1", scheduledPostDoc({ organizationUrn: "urn:li:organization:42" }));
    await runSchedulerTick(h.deps());
    expect(h.linkedin.shares[0].author).toBe(`urn:li:person:${LINKEDIN_ID}`);
    expect(h.store.get("p1").warnings).toEqual([expect.objectContaining({ code: "ORGANIZATION_FALLBACK_PERSONAL" })]);
  });
});

describe("observability", () => {
  it("logs every step with post id, user, platform, attempt — and never a token or the content", async () => {
    h.store.docs.set("p1", scheduledPostDoc({ content: "Top secret launch announcement" }));
    h.linkedin.ugcScript.push({ status: 503 });
    await runSchedulerTick(h.deps("run-1"));
    h.clock.advance(RETRY_DELAYS_MS[0]);
    await runSchedulerTick(h.deps("run-2"));

    const events = h.log.entries.map((e) => e.event);
    expect(events).toEqual(
      expect.arrayContaining([
        "scheduler.tick_started",
        "scheduler.attempt_started",
        "scheduler.post_retry_scheduled",
        "scheduler.post_published",
        "scheduler.tick_finished",
      ]),
    );
    expect(h.log.events("scheduler.attempt_started")[0].fields).toMatchObject({
      postId: "p1",
      userId: USER,
      platform: "linkedin",
      attempt: 1,
      scheduledAt: new Date(T0).toISOString(),
    });
    const serialized = JSON.stringify(h.log.entries);
    expect(serialized).not.toContain(ACCESS_TOKEN);
    expect(serialized).not.toContain(encryptedToken);
    expect(serialized).not.toContain("Top secret launch announcement");
  });

  it("flags a broken encryption-key configuration on every tick", async () => {
    await runSchedulerTick(h.deps("run-1", { configHealth: { encryptionKeyStatus: "missing", zernioKeyStatus: "ok" } }));
    expect(h.log.events("scheduler.config_invalid")[0]).toMatchObject({ severity: "ERROR" });
    expect(h.store.heartbeats.at(-1)!.config).toMatchObject({ encryptionKeyStatus: "missing" });
  });
});
