// firestore.rules — executed by the Firestore emulator.
// Run: firebase emulators:exec --only firestore --project demo-posty "npx vitest run __tests__/emulator --no-file-parallelism"
// Skipped when no emulator is available (plain `npm test`).

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  Timestamp,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { getApps, initializeApp as initAdmin } from "firebase-admin/app";
import { Timestamp as AdminTimestamp, getFirestore as getAdminFirestore } from "firebase-admin/firestore";

const HOST = process.env.FIRESTORE_EMULATOR_HOST;
const PROJECT = process.env.GCLOUD_PROJECT || "demo-posty";

vi.setConfig({ testTimeout: 30_000 });

const apps: FirebaseApp[] = [];
function clientDb(uid: string | null): Firestore {
  const app = initializeApp({ projectId: PROJECT, apiKey: "demo-key" }, `app-${uid ?? "anon"}-${apps.length}`);
  apps.push(app);
  const db = getFirestore(app);
  const [host, port] = HOST!.split(":");
  connectFirestoreEmulator(db, host, Number(port), uid ? { mockUserToken: { sub: uid, user_id: uid } } : undefined);
  return db;
}

function adminDb() {
  if (getApps().length === 0) initAdmin({ projectId: PROJECT });
  return getAdminFirestore();
}

async function clearDatabase() {
  await fetch(`http://${HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
}

/** Exactly what lib/db/firestore.ts#createScheduledPost writes. */
function createPayload(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    userId: uid,
    content: "Hello LinkedIn",
    postId: null,
    title: null,
    scheduledAt: Timestamp.fromDate(new Date(Date.now() + 3_600_000)),
    timezone: "Europe/Paris",
    status: "pending",
    platform: "linkedin",
    postType: "feed",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    attemptCount: 0,
    publishedAt: null,
    publishedUrl: null,
    lastAttemptAt: null,
    failureReason: null,
    visibility: "PUBLIC",
    ...overrides,
  };
}

/** Exactly what lib/db/firestore.ts#reschedulePost writes. */
const reschedulePayload = () => ({
  scheduledAt: Timestamp.fromDate(new Date(Date.now() + 7_200_000)),
  status: "pending",
  updatedAt: serverTimestamp(),
  failureReason: null,
  attemptCount: 0,
  nextAttemptAt: null,
  lastError: null,
  priorSendUncertain: false,
  resumeState: {},
});

/** Exactly what lib/db/firestore.ts#cancelScheduledPost writes. */
const cancelPayload = () => ({ status: "cancelled", updatedAt: serverTimestamp(), nextAttemptAt: null });

/** A post as the scheduler (Admin SDK) leaves it in a given status. */
async function seedPost(id: string, status: string, extra: Record<string, unknown> = {}) {
  await adminDb()
    .doc(`scheduledPosts/${id}`)
    .set({
      userId: "alice",
      content: "Hello",
      scheduledAt: AdminTimestamp.fromMillis(Date.now() - 60_000),
      timezone: "Europe/Paris",
      status,
      platform: "linkedin",
      postType: "feed",
      attemptCount: status === "pending" ? 0 : 2,
      failureReason: status === "failed" ? "Votre connexion LinkedIn a expiré." : null,
      lastError: status === "failed" || status === "retrying" ? { code: "TOKEN_EXPIRED", message: "x" } : null,
      nextAttemptAt: status === "retrying" ? AdminTimestamp.fromMillis(Date.now() + 60_000) : null,
      priorSendUncertain: false,
      resumeState: {},
      ...(status === "processing"
        ? { processingBy: "run-x", leaseExpiresAt: AdminTimestamp.fromMillis(Date.now() + 600_000), publishStage: "sending" }
        : {}),
      ...extra,
    });
}

const denied = { code: "permission-denied" };

describe.skipIf(!HOST)("firestore.rules — scheduledPosts", () => {
  let alice: Firestore;
  let bob: Firestore;
  let mallory: Firestore;

  beforeEach(async () => {
    await clearDatabase();
    const db = adminDb();
    await db.doc("users/alice").set({ subscription: { plan: "pro" } });
    await db.doc("users/bob").set({ subscription: { plan: "free" } });
    await db.doc("users/mallory").set({ subscription: { plan: "max" } });
    alice = clientDb("alice");
    bob = clientDb("bob");
    mallory = clientDb("mallory");
  });

  afterAll(async () => {
    await Promise.all(apps.map((a) => deleteApp(a)));
  });

  describe("create", () => {
    it("allows the app's exact create payload (text, images, org, seed comment)", async () => {
      await expect(setDoc(doc(alice, "scheduledPosts/a1"), createPayload("alice"))).resolves.toBeUndefined();
      await expect(
        setDoc(
          doc(alice, "scheduledPosts/a2"),
          createPayload("alice", {
            images: [{ storagePath: "scheduled-posts/alice/a2/x.png", downloadURL: "u", fileName: "x.png", contentType: "image/png", size: 1 }],
            organizationUrn: "urn:li:organization:1",
            seedComment: { enabled: true, text: "Premier commentaire", delayMinutes: 5 },
          }),
        ),
      ).resolves.toBeUndefined();
    });

    it("allows Facebook and Threads on Max only (Pro's allowedPlatforms exclude them)", async () => {
      // The app only writes `visibility` for LinkedIn.
      const forMallory: Record<string, unknown> = createPayload("mallory");
      delete forMallory.visibility;
      await expect(setDoc(doc(mallory, "scheduledPosts/f1"), { ...forMallory, platform: "facebook" })).resolves.toBeUndefined();
      await expect(setDoc(doc(mallory, "scheduledPosts/t1"), { ...forMallory, platform: "threads" })).resolves.toBeUndefined();
      const forAlice: Record<string, unknown> = createPayload("alice");
      delete forAlice.visibility;
      for (const platform of ["facebook", "threads", "reddit", "threadsz"]) {
        await expect(setDoc(doc(alice, `scheduledPosts/pro-${platform}`), { ...forAlice, platform }), platform).rejects.toMatchObject(denied);
      }
    });

    it("refuses a publication date more than 400 days ahead", async () => {
      await expect(
        setDoc(doc(alice, "scheduledPosts/far"), createPayload("alice", { scheduledAt: Timestamp.fromDate(new Date(Date.now() + 5 * 365 * 86_400_000)) })),
      ).rejects.toMatchObject(denied);
    });

    it("refuses platforms without a scheduled publisher", async () => {
      for (const platform of ["bluesky", "mastodon", "discord", "myspace"]) {
        await expect(setDoc(doc(alice, `scheduledPosts/x-${platform}`), createPayload("alice", { platform }))).rejects.toMatchObject(denied);
      }
    });

    it("refuses forged scheduler fields", async () => {
      await expect(setDoc(doc(alice, "scheduledPosts/f1"), createPayload("alice", { status: "published" }))).rejects.toMatchObject(denied);
      await expect(setDoc(doc(alice, "scheduledPosts/f2"), createPayload("alice", { attemptCount: 3 }))).rejects.toMatchObject(denied);
      await expect(setDoc(doc(alice, "scheduledPosts/f3"), createPayload("alice", { processingBy: "me" }))).rejects.toMatchObject(denied);
      await expect(setDoc(doc(alice, "scheduledPosts/f4"), createPayload("alice", { publishedUrl: "https://x" }))).rejects.toMatchObject(denied);
      await expect(setDoc(doc(alice, "scheduledPosts/f5"), createPayload("alice", { scheduledAt: "2026-10-01T10:00" }))).rejects.toMatchObject(denied);
      await expect(setDoc(doc(alice, "scheduledPosts/f6"), createPayload("alice", { content: "" }))).rejects.toMatchObject(denied);
    });

    it("keeps the plan gate (free plan cannot schedule)", async () => {
      await expect(setDoc(doc(bob, "scheduledPosts/b1"), createPayload("bob"))).rejects.toMatchObject(denied);
    });

    it("cannot create a post for someone else", async () => {
      await expect(setDoc(doc(mallory, "scheduledPosts/m1"), createPayload("alice"))).rejects.toMatchObject(denied);
    });
  });

  describe("owner transitions", () => {
    it.each(["pending", "retrying", "failed"])("cancel from %s → allowed", async (status) => {
      await seedPost("p", status);
      await expect(updateDoc(doc(alice, "scheduledPosts/p"), cancelPayload())).resolves.toBeUndefined();
    });

    it.each(["processing", "published"])("cancel while %s → denied", async (status) => {
      await seedPost("p", status);
      await expect(updateDoc(doc(alice, "scheduledPosts/p"), cancelPayload())).rejects.toMatchObject(denied);
    });

    it.each(["pending", "retrying", "failed", "cancelled"])("reschedule from %s → allowed", async (status) => {
      await seedPost("p", status, status === "failed" ? { priorSendUncertain: true, resumeState: { linkedinAssets: "" } } : {});
      await expect(updateDoc(doc(alice, "scheduledPosts/p"), reschedulePayload())).resolves.toBeUndefined();
      const after = (await getDoc(doc(alice, "scheduledPosts/p"))).data()!;
      expect(after).toMatchObject({ status: "pending", attemptCount: 0, lastError: null, failureReason: null });
    });

    it.each(["processing", "published"])("reschedule while %s → denied (no double publication)", async (status) => {
      await seedPost("p", status);
      await expect(updateDoc(doc(alice, "scheduledPosts/p"), reschedulePayload())).rejects.toMatchObject(denied);
    });

    it("reschedule after an unconfirmed send keeps the reconciliation state (what reschedulePost writes then)", async () => {
      const resumeState = { linkedinAssets: "urn:li:digitalmediaAsset:1" };
      await seedPost("p", "retrying", { priorSendUncertain: true, resumeState });
      const keeping: Record<string, unknown> = reschedulePayload();
      delete keeping.priorSendUncertain;
      delete keeping.resumeState;
      await expect(updateDoc(doc(alice, "scheduledPosts/p"), keeping)).resolves.toBeUndefined();
      const after = (await getDoc(doc(alice, "scheduledPosts/p"))).data()!;
      expect(after).toMatchObject({ status: "pending", attemptCount: 0, priorSendUncertain: true, resumeState });
    });

    it("rescheduling cannot forge the reconciliation state", async () => {
      await seedPost("p", "failed");
      await expect(
        updateDoc(doc(alice, "scheduledPosts/p"), { ...reschedulePayload(), priorSendUncertain: true }),
      ).rejects.toMatchObject(denied);
      await seedPost("q", "retrying", { priorSendUncertain: true, resumeState: { linkedinAssets: "urn:li:digitalmediaAsset:1" } });
      const forged: Record<string, unknown> = { ...reschedulePayload(), resumeState: { linkedinAssets: "urn:li:digitalmediaAsset:666" } };
      delete forged.priorSendUncertain;
      await expect(updateDoc(doc(alice, "scheduledPosts/q"), forged)).rejects.toMatchObject(denied);
    });

    it("after a downgrade / refund: cancel still works, rescheduling does not", async () => {
      await seedPost("p", "failed");
      await adminDb().doc("users/alice").set({ subscription: { plan: "free", status: "canceled" } });
      await expect(updateDoc(doc(alice, "scheduledPosts/p"), reschedulePayload())).rejects.toMatchObject(denied);
      await expect(updateDoc(doc(alice, "scheduledPosts/p"), cancelPayload())).resolves.toBeUndefined();
    });

    it("rescheduling cannot smuggle a retry budget or clear an error partially", async () => {
      await seedPost("p", "failed");
      await expect(updateDoc(doc(alice, "scheduledPosts/p"), { ...reschedulePayload(), attemptCount: 1 })).rejects.toMatchObject(denied);
      await expect(
        updateDoc(doc(alice, "scheduledPosts/p"), { ...reschedulePayload(), lastError: { code: "X" } }),
      ).rejects.toMatchObject(denied);
    });

    it("owner can always delete (account / conversation deletion cascades)", async () => {
      for (const status of ["pending", "processing", "published", "failed"]) {
        await seedPost(`d-${status}`, status);
        await expect(deleteDoc(doc(alice, `scheduledPosts/d-${status}`))).resolves.toBeUndefined();
      }
    });
  });

  describe("attacks that used to be possible", () => {
    it("rewriting userId to publish on another account → denied", async () => {
      await seedPost("p", "pending");
      await expect(updateDoc(doc(alice, "scheduledPosts/p"), { userId: "victim" })).rejects.toMatchObject(denied);
      await expect(
        updateDoc(doc(alice, "scheduledPosts/p"), { ...reschedulePayload(), userId: "victim" }),
      ).rejects.toMatchObject(denied);
    });

    it("forging a published / processing status → denied", async () => {
      await seedPost("p", "pending");
      await expect(updateDoc(doc(alice, "scheduledPosts/p"), { status: "published", publishedUrl: "https://fake" })).rejects.toMatchObject(denied);
      await expect(updateDoc(doc(alice, "scheduledPosts/p"), { status: "processing" })).rejects.toMatchObject(denied);
    });

    it("swapping content / images of a queued post behind the scheduler's back → denied", async () => {
      await seedPost("p", "pending");
      await expect(updateDoc(doc(alice, "scheduledPosts/p"), { content: "changed" })).rejects.toMatchObject(denied);
      await expect(
        updateDoc(doc(alice, "scheduledPosts/p"), { images: [{ storagePath: "scheduled-posts/victim/x/y.png" }] }),
      ).rejects.toMatchObject(denied);
    });

    it("another user can neither read, update nor delete", async () => {
      await seedPost("p", "pending");
      await expect(getDoc(doc(mallory, "scheduledPosts/p"))).rejects.toMatchObject(denied);
      await expect(updateDoc(doc(mallory, "scheduledPosts/p"), cancelPayload())).rejects.toMatchObject(denied);
      await expect(deleteDoc(doc(mallory, "scheduledPosts/p"))).rejects.toMatchObject(denied);
    });

    it("scheduler health is server-only", async () => {
      await adminDb().doc("systemHealth/scheduler").set({ lastRunAt: AdminTimestamp.now() });
      await expect(getDoc(doc(alice, "systemHealth/scheduler"))).rejects.toMatchObject(denied);
    });
  });
});
