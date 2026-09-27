// Scheduler persistence against a REAL Firestore (emulator): transactional
// claims under contention, full concurrent ticks, retries, lease recovery,
// heartbeat and the seed-comment worker.
// Run: firebase emulators:exec --only firestore --project demo-posty "npx vitest run __tests__/emulator --no-file-parallelism"

import { createRequire } from "node:module";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { encryptToken } from "../../functions/src/crypto/token-cipher";
import { RETRY_DELAYS_MS } from "../../functions/src/scheduler/policy";
import type { PlatformDataAccess } from "../../functions/src/scheduler/publishers/types";
import { runSchedulerTick } from "../../functions/src/scheduler/run";
import { enqueueSeedComment, runSeedCommentTick } from "../../functions/src/scheduler/seed-comments";
import { FirestoreSchedulerStore } from "../../functions/src/scheduler/store";
import { FakeLinkedIn, LINKEDIN_ID, MemoryLogger, USER, createHarness } from "../scheduler/helpers/fakes";

const HOST = process.env.FIRESTORE_EMULATOR_HOST;
const PROJECT = process.env.GCLOUD_PROJECT || "demo-posty";

// Contended transactions are retried by the Admin SDK with backoff, which the
// emulator makes slow — correctness, not speed, is what these tests check.
vi.setConfig({ testTimeout: 60_000 });

// Use the SAME firebase-admin copy as functions/src (Timestamp classes must match).
const functionsRequire = createRequire(path.resolve(__dirname, "../../functions/package.json"));
const adminApp = functionsRequire("firebase-admin/app") as typeof import("firebase-admin/app");
const adminFs = functionsRequire("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
const { Timestamp } = adminFs;

let db: Firestore;

async function clearDatabase() {
  await fetch(`http://${HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
}

/** Firestore-backed PlatformDataAccess — same behaviour as functions/src/index.ts. */
function firestoreData(files: Map<string, Buffer> = new Map()): PlatformDataAccess {
  return {
    async getConnection(collection, userId) {
      const snap = await db.collection(collection).doc(userId).get();
      return snap.exists ? (snap.data() as Record<string, unknown>) : null;
    },
    async updateConnection(collection, userId, patch) {
      await db.collection(collection).doc(userId).update(patch);
    },
    async recordPublishedPost(collection, docId, data) {
      await db.collection(collection).doc(docId).set(data, { merge: true });
    },
    async downloadStorageFile(storagePath) {
      return files.get(storagePath) ?? null;
    },
    encryptToken,
    timestamp: (ms) => Timestamp.fromMillis(ms),
  };
}

async function seedDuePost(id: string, atMs: number, extra: Record<string, unknown> = {}) {
  await db.doc(`scheduledPosts/${id}`).set({
    userId: USER,
    content: `Scheduled post ${id}`,
    postId: null,
    title: null,
    scheduledAt: Timestamp.fromMillis(atMs),
    timezone: "Europe/Paris",
    status: "pending",
    platform: "linkedin",
    postType: "feed",
    createdAt: Timestamp.fromMillis(atMs - 86_400_000),
    updatedAt: Timestamp.fromMillis(atMs - 86_400_000),
    attemptCount: 0,
    publishedAt: null,
    publishedUrl: null,
    lastAttemptAt: null,
    failureReason: null,
    visibility: "PUBLIC",
    ...extra,
  });
}

function depsFor(runId: string, nowMs: () => number, linkedin: FakeLinkedIn, log = new MemoryLogger()) {
  const base = createHarness().deps(runId);
  return {
    ...base,
    store: new FirestoreSchedulerStore(db, log),
    platform: { ...base.platform, data: firestoreData(), fetch: linkedin.fetch, now: nowMs, log },
    now: nowMs,
    log,
    deadlineMs: nowMs() + 480_000,
  };
}

describe.skipIf(!HOST)("scheduler on a real Firestore (emulator)", () => {
  beforeAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    if (adminApp.getApps().length === 0) adminApp.initializeApp({ projectId: PROJECT });
    db = adminFs.getFirestore() as unknown as Firestore;
  });

  beforeEach(async () => {
    await clearDatabase();
    await db.doc(`linkedinConnections/${USER}`).set({
      userId: USER,
      linkedInId: LINKEDIN_ID,
      accessToken: encryptToken("real-token"),
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86_400_000),
      organizations: [],
    });
  });

  it("claim is atomic: 20 concurrent claims on one due post → exactly one winner", async () => {
    const now = Date.now();
    await seedDuePost("p1", now - 1_000);
    const store = new FirestoreSchedulerStore(db, new MemoryLogger());
    const outcomes = await Promise.all(Array.from({ length: 20 }, (_, i) => store.claim("p1", now, `run-${i}`)));
    const winners = outcomes.filter((o) => o.kind === "claimed");
    expect(winners).toHaveLength(1);
    expect(outcomes.filter((o) => o.kind === "skipped" && o.reason === "already_processing")).toHaveLength(19);
    const doc = (await db.doc("scheduledPosts/p1").get()).data()!;
    expect(doc).toMatchObject({ status: "processing", attemptCount: 1, publishStage: "claimed" });
    expect(doc.leaseExpiresAt).toBeInstanceOf(Timestamp);
  });

  it("two overlapping scheduler runs on 6 due posts → each post published exactly once", async () => {
    const now = Date.now();
    for (let i = 0; i < 6; i++) await seedDuePost(`p${i}`, now - 5_000);
    const linkedin = new FakeLinkedIn();
    const clock = () => Date.now();

    const [a, b] = await Promise.all([
      runSchedulerTick(depsFor("run-A", clock, linkedin)),
      runSchedulerTick(depsFor("run-B", clock, linkedin)),
    ]);

    expect(a.published + b.published).toBe(6);
    expect(linkedin.ugcCreateCalls).toBe(6);
    expect(linkedin.shares).toHaveLength(6);
    const docs = await db.collection("scheduledPosts").get();
    for (const d of docs.docs) {
      const data = d.data();
      expect(data.status).toBe("published");
      expect(data.externalPostId).toMatch(/^urn:li:share:/);
      expect(data.publishedAt).toBeInstanceOf(Timestamp);
      expect(data.attempts[0].startedAt).toBeInstanceOf(Timestamp);
      expect(data.processingBy).toBeNull();
    }
    // Analytics records: one per post, deterministic ids.
    expect((await db.collection("linkedinPosts").get()).size).toBe(6);
    // Heartbeat written.
    const health = (await db.doc("systemHealth/scheduler").get()).data()!;
    expect(health.lastRunAt).toBeInstanceOf(Timestamp);
    expect(health.config).toMatchObject({ encryptionKeyStatus: "ok" });
  });

  it("transient failure is persisted as retrying and picked up once due", async () => {
    let now = Date.now();
    await seedDuePost("p1", now - 1_000);
    const linkedin = new FakeLinkedIn();
    linkedin.ugcScript.push({ status: 503 });

    await runSchedulerTick(depsFor("run-1", () => now, linkedin));
    const retrying = (await db.doc("scheduledPosts/p1").get()).data()!;
    expect(retrying).toMatchObject({ status: "retrying", attemptCount: 1 });
    expect(retrying.lastError).toMatchObject({ code: "PLATFORM_UNAVAILABLE", httpStatus: 503 });
    expect((retrying.nextAttemptAt as InstanceType<typeof Timestamp>).toMillis()).toBe(now + RETRY_DELAYS_MS[0]);

    const store = new FirestoreSchedulerStore(db, new MemoryLogger());
    expect(await store.listDue(now, 25)).toEqual([]);
    now += RETRY_DELAYS_MS[0];
    expect(await store.listDue(now, 25)).toEqual([{ id: "p1", kind: "retry" }]);

    await runSchedulerTick(depsFor("run-2", () => now, linkedin));
    expect((await db.doc("scheduledPosts/p1").get()).data()).toMatchObject({ status: "published", attemptCount: 2, lastError: null });
  });

  it("an abandoned claim is recovered and the post still published once", async () => {
    let now = Date.now();
    await seedDuePost("p1", now - 60_000, {
      status: "processing",
      attemptCount: 1,
      processingBy: "run-dead",
      processingStartedAt: Timestamp.fromMillis(now - 20 * 60_000),
      leaseExpiresAt: Timestamp.fromMillis(now - 1_000),
      publishStage: "claimed",
    });
    const linkedin = new FakeLinkedIn();
    const first = await runSchedulerTick(depsFor("run-1", () => now, linkedin));
    expect(first.recovered).toBe(1);
    expect((await db.doc("scheduledPosts/p1").get()).data()).toMatchObject({ status: "retrying" });

    now += RETRY_DELAYS_MS[0];
    await runSchedulerTick(depsFor("run-2", () => now, linkedin));
    expect((await db.doc("scheduledPosts/p1").get()).data()).toMatchObject({ status: "published" });
    expect(linkedin.shares).toHaveLength(1);
  });

  describe("seed comments", () => {
    const request = {
      scheduledPostId: "p1",
      userId: USER,
      parentPostUrn: "urn:li:share:7100",
      parentPostUrl: null,
      actorUrn: `urn:li:person:${LINKEDIN_ID}`,
      text: "Merci d'avoir lu !",
      delayMinutes: 1,
    };

    it("enqueue is idempotent per scheduled post", async () => {
      const now = Date.now();
      expect(await enqueueSeedComment(db, request, now, () => 0)).toBe("created");
      expect(await enqueueSeedComment(db, request, now, () => 0)).toBe("exists");
      expect((await db.collection("pendingSeedComments").get()).size).toBe(1);
    });

    it("two overlapping worker runs post the comment exactly once", async () => {
      const start = Date.now();
      await enqueueSeedComment(db, request, start - 5 * 60_000, () => 0);
      const linkedin = new FakeLinkedIn();
      const worker = (runId: string) =>
        runSeedCommentTick({
          db,
          fetch: linkedin.fetch,
          linkedinApiBaseUrl: "https://api.linkedin.com/v2",
          autopostEnabled: true,
          now: () => Date.now(),
          log: new MemoryLogger(),
          runId,
        });
      await Promise.all([worker("w1"), worker("w2")]);
      expect(linkedin.comments).toHaveLength(1);
      expect((await db.doc("pendingSeedComments/sc_p1").get()).data()).toMatchObject({ status: "posted" });
    });

    it("a comment that missed its slot by more than an hour is never posted late", async () => {
      await enqueueSeedComment(db, request, Date.now() - 3 * 3_600_000, () => 0);
      const linkedin = new FakeLinkedIn();
      await runSeedCommentTick({
        db,
        fetch: linkedin.fetch,
        linkedinApiBaseUrl: "https://api.linkedin.com/v2",
        autopostEnabled: true,
        now: () => Date.now(),
        log: new MemoryLogger(),
        runId: "w1",
      });
      expect(linkedin.comments).toHaveLength(0);
      expect((await db.doc("pendingSeedComments/sc_p1").get()).data()).toMatchObject({ status: "skipped_stale" });
    });
  });
});
