/**
 * Scheduled publishing, run from the Next.js app (Vercel) instead of Firebase
 * Cloud Functions.
 *
 * Why: scheduled Cloud Functions need the Firebase Blaze plan; when billing
 * was disabled (2026-10-08) every scheduled post silently stopped. This module
 * wires the SAME scheduler core (functions/src/scheduler: claim/lease, typed
 * errors, retries, reconciliation, seed comments) with the app's Admin SDK, so
 * /api/cron/scheduler can be triggered every minute by any free external cron.
 *
 * Keep in sync with the wiring in functions/src/index.ts (executeScheduledPosts
 * / executePendingSeedComments). Both can run at the same time safely: posts
 * are claimed in a Firestore transaction with a lease, so a post is published
 * by exactly one runner.
 */
import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb, getAdminStorageBucket } from "@/lib/db/firebase-admin";
import { PUBLISHERS } from "@/functions/src/scheduler/publishers";
import type { PlatformDataAccess } from "@/functions/src/scheduler/publishers/types";
import { runSchedulerTick, type TickStats } from "@/functions/src/scheduler/run";
import { enqueueSeedComment, runSeedCommentTick } from "@/functions/src/scheduler/seed-comments";
import { FirestoreSchedulerStore } from "@/functions/src/scheduler/store";
import { sanitizeLogFields, type SchedulerLogger } from "@/functions/src/scheduler/logger";
import { encryptToken, tokenKeyStatus } from "@/functions/src/crypto/token-cipher";
import { getZernioApiKey } from "@/functions/src/zernio";

const env = (key: string, fallback: string) => process.env[key]?.trim() || fallback;

/** Same defaults as functions/src/config.ts (loadRuntimeConfig). */
const PLATFORM_CONFIG = {
  linkedinApiBaseUrl: env("LINKEDIN_API_BASE_URL", "https://api.linkedin.com/v2"),
  facebookApiUrl: env("FACEBOOK_API_URL", "https://graph.facebook.com/v21.0"),
  threadsApiUrl: env("THREADS_API_URL", "https://graph.threads.net/v1.0"),
  threadsRefreshUrl: env("THREADS_REFRESH_URL", "https://graph.threads.net/refresh_access_token"),
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** One structured JSON line per event (Vercel function logs). */
function createConsoleLogger(base: Record<string, unknown>): SchedulerLogger {
  return {
    log(severity, event, fields) {
      const line = JSON.stringify({ severity, event, ...sanitizeLogFields({ ...base, ...fields }) });
      if (severity === "ERROR") console.error(line);
      else if (severity === "WARNING") console.warn(line);
      else console.log(line);
    },
  };
}

function requireDb() {
  if (!adminDb) throw new Error("Firebase Admin is not initialised");
  return adminDb;
}

function bucket() {
  const b = getAdminStorageBucket();
  if (!b) throw new Error("Firebase Storage bucket is not configured");
  return b;
}

function platformData(): PlatformDataAccess {
  const db = requireDb();
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
      const file = bucket().file(storagePath);
      const [exists] = await file.exists();
      if (!exists) return null;
      const [buffer] = await file.download();
      return buffer;
    },
    encryptToken,
    timestamp: (ms) => Timestamp.fromMillis(ms),
  };
}

export async function runSchedulerFromVercel(deadlineMs: number): Promise<TickStats> {
  const db = requireDb();
  const runId = `vercel-${randomUUID().slice(0, 12)}`;
  const log = createConsoleLogger({ component: "scheduler", runner: "vercel" });
  return runSchedulerTick({
    store: new FirestoreSchedulerStore(db, log),
    publishers: PUBLISHERS,
    platform: {
      data: platformData(),
      fetch: (url, init) => fetch(url, init),
      config: PLATFORM_CONFIG,
      now: () => Date.now(),
      sleep,
      random: () => Math.random(),
      log,
    },
    enqueueSeedComment: (request) => enqueueSeedComment(db, request, Date.now(), Math.random),
    deleteStorageFile: async (storagePath) => {
      await bucket().file(storagePath).delete({ ignoreNotFound: true });
    },
    now: () => Date.now(),
    sleep,
    random: () => Math.random(),
    log,
    runId,
    deadlineMs,
    configHealth: {
      encryptionKeyStatus: tokenKeyStatus(),
      zernioKeyStatus: getZernioApiKey() ? "ok" : "missing",
    },
  });
}

export async function runSeedCommentsFromVercel() {
  const db = requireDb();
  const runId = `vercel-seed-${randomUUID().slice(0, 8)}`;
  const log = createConsoleLogger({ component: "seed_comment", runner: "vercel" });
  return runSeedCommentTick({
    db,
    fetch: (url, init) => fetch(url, init),
    linkedinApiBaseUrl: PLATFORM_CONFIG.linkedinApiBaseUrl,
    autopostEnabled: env("SEED_COMMENT_AUTOPOST", "false") === "true",
    now: () => Date.now(),
    log,
    runId,
  });
}
