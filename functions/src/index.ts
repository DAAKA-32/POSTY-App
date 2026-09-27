import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

admin.initializeApp();

const db = admin.firestore();

import { configHealth, loadRuntimeConfig } from "./config";
import { encryptToken } from "./crypto/token-cipher";
import { syncDueLinkedInMetrics } from "./linkedin-metrics";
import { createFunctionsLogger } from "./scheduler/functions-logger";
import { PUBLISHERS } from "./scheduler/publishers";
import { POSTY_LINKEDIN_UA } from "./scheduler/publishers/linkedin";
import type { PlatformDataAccess } from "./scheduler/publishers/types";
import { runSchedulerTick } from "./scheduler/run";
import { enqueueSeedComment, runSeedCommentTick } from "./scheduler/seed-comments";
import { FirestoreSchedulerStore } from "./scheduler/store";

const CONFIG = loadRuntimeConfig();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Platform data access (Firestore + Storage) for the adapters
// ============================================================

const platformData: PlatformDataAccess = {
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
    // Admin SDK read: bypasses public-URL issues (uniform bucket-level
    // access, expired download tokens). Path ownership is checked upstream.
    const file = admin.storage().bucket().file(storagePath);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buffer] = await file.download();
    return buffer;
  },
  encryptToken,
  timestamp: (ms) => Timestamp.fromMillis(ms),
};

// ============================================================
// SCHEDULED PUBLISHING — runs every minute
// ============================================================
//
// Lifecycle, retries, idempotency and error codes: see scheduler/policy.ts.
// "Why wasn't post X published?" → the post's `lastError` + `attempts`
// fields, the `systemHealth/scheduler` heartbeat, and Cloud Logging:
//   jsonPayload.event=~"^scheduler\." AND jsonPayload.postId="X"

const SCHEDULER_TIMEOUT_SECONDS = 540;

export const executeScheduledPosts = functions
  .runWith({ timeoutSeconds: SCHEDULER_TIMEOUT_SECONDS, memory: "512MB" })
  .pubsub.schedule("every 1 minutes")
  .timeZone("Europe/Paris")
  .onRun(async (context) => {
    const startedAtMs = Date.now();
    // Unique per invocation, even if Pub/Sub redelivers the same event.
    const runId = `${context.eventId || "run"}-${randomUUID().slice(0, 8)}`;
    const log = createFunctionsLogger({ component: "scheduler" });

    await runSchedulerTick({
      store: new FirestoreSchedulerStore(db, log),
      publishers: PUBLISHERS,
      platform: {
        data: platformData,
        fetch: (url, init) => fetch(url, init),
        config: {
          linkedinApiBaseUrl: CONFIG.linkedin.apiBaseUrl,
          facebookApiUrl: CONFIG.facebookApiUrl,
          threadsApiUrl: CONFIG.threadsApiUrl,
          threadsRefreshUrl: CONFIG.threadsRefreshUrl,
        },
        now: () => Date.now(),
        sleep,
        random: () => Math.random(),
        log,
      },
      enqueueSeedComment: (request) => enqueueSeedComment(db, request, Date.now(), Math.random),
      deleteStorageFile: async (storagePath) => {
        await admin.storage().bucket().file(storagePath).delete({ ignoreNotFound: true });
      },
      now: () => Date.now(),
      sleep,
      random: () => Math.random(),
      log,
      runId,
      // Keep a minute of margin under the function timeout.
      deadlineMs: startedAtMs + (SCHEDULER_TIMEOUT_SECONDS - 60) * 1000,
      configHealth: configHealth(),
    });
    return null;
  });

// ============================================================
// SEED COMMENT WORKER — fires queued first-comments on LinkedIn
// ============================================================
// Comments are queued by the scheduler after a LinkedIn publish and posted
// here once `fireAt` has passed — only when SEED_COMMENT_AUTOPOST=true
// (otherwise closed as skipped_flag_off, auditable in Firestore).

export const executePendingSeedComments = functions
  .runWith({ timeoutSeconds: 180, memory: "256MB" })
  .pubsub.schedule("every 1 minutes")
  .timeZone("Europe/Paris")
  .onRun(async (context) => {
    const runId = `${context.eventId || "seed"}-${randomUUID().slice(0, 8)}`;
    const log = createFunctionsLogger({ component: "seed_comment" });
    try {
      const stats = await runSeedCommentTick({
        db,
        fetch: (url, init) => fetch(url, init),
        linkedinApiBaseUrl: CONFIG.linkedin.apiBaseUrl,
        autopostEnabled: CONFIG.seedCommentAutopost,
        now: () => Date.now(),
        log,
        runId,
      });
      if (stats.due > 0 || stats.recovered > 0) {
        log.log("INFO", "seed_comment.tick_finished", { runId, autopost: CONFIG.seedCommentAutopost, ...stats });
      }
    } catch (err) {
      log.log("ERROR", "seed_comment.tick_failed", { runId, detail: err instanceof Error ? err.message : String(err) });
    }
    return null;
  });

// ============================================================
// LEGACY HTTP FUNCTIONS — LinkedIn OAuth & manual post
// ============================================================
// Not called by the current app (OAuth + publishing run in Next.js routes).
// Kept deployed unchanged; config now comes from loadRuntimeConfig().

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface LinkedInProfile {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  email?: string;
}

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<LinkedInTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: CONFIG.linkedin.clientId,
    client_secret: CONFIG.linkedin.clientSecret,
  });

  const response = await fetch(CONFIG.linkedin.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return response.json();
}

async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get profile: ${error}`);
  }

  return response.json();
}

async function postToLinkedIn(
  accessToken: string,
  linkedInId: string,
  content: string,
): Promise<{ success: boolean; id?: string; postUrl?: string; error?: string }> {
  const response = await fetch(`${CONFIG.linkedin.apiBaseUrl}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "User-Agent": POSTY_LINKEDIN_UA,
      Accept: "application/json",
    },
    body: JSON.stringify({
      author: `urn:li:person:${linkedInId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("LinkedIn post error:", response.status, error);
    return { success: false, error: "La publication sur LinkedIn n'a pas pu aboutir. Veuillez réessayer." };
  }

  const data = await response.json();
  const postId = data.id || response.headers.get("x-restli-id");
  const postUrl = postId ? `https://www.linkedin.com/feed/update/${postId}/` : undefined;
  return { success: true, id: postId || undefined, postUrl };
}

export const linkedinCallback = functions.https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { code, redirectUri } = req.body;

    if (!code || !redirectUri) {
      res.status(400).json({ error: "Missing code or redirectUri" });
      return;
    }

    const tokenData = await exchangeCodeForToken(code, redirectUri);
    const profile = await getLinkedInProfile(tokenData.access_token);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    res.status(200).json({
      success: true,
      accessToken: tokenData.access_token,
      expiresAt: expiresAt.toISOString(),
      linkedInId: profile.sub,
      profileName: profile.name,
      profilePicture: profile.picture,
      email: profile.email,
    });
  } catch (error) {
    console.error("LinkedIn callback error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export const linkedinPost = functions.https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { accessToken, linkedInId, content, expiresAt } = req.body;

    if (!accessToken || !linkedInId || !content) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (expiresAt && new Date(expiresAt) < new Date()) {
      res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
      return;
    }

    const result = await postToLinkedIn(accessToken, linkedInId, content);

    if (!result.success) {
      res.status(400).json({ error: result.error, success: false });
      return;
    }

    res.status(200).json({
      success: true,
      postId: result.id,
      postUrl: result.postUrl,
    });
  } catch (error) {
    console.error("LinkedIn post error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to post to LinkedIn",
    });
  }
});

// ============================================================
// SCHEDULED CLOUD FUNCTION — LinkedIn metrics sync
// Runs every 3 hours. For each organization-published post:
//   - refreshes likes/comments/shares/impressions/engagement from LinkedIn API
//   - detects posts the user deleted on LinkedIn (→ status='deleted')
// Personal-profile posts are skipped: LinkedIn does not expose any metrics
// endpoint for them, MDP-approved app or not.
// ============================================================

export const syncLinkedInMetrics = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("every 3 hours")
  .timeZone("Europe/Paris")
  .onRun(async () => {
    const startedAt = Date.now();
    console.log("[metrics-sync] Starting LinkedIn metrics sync");
    try {
      const result = await syncDueLinkedInMetrics(db, 200);
      console.log(
        `[metrics-sync] Done in ${Date.now() - startedAt}ms: scanned=${result.scanned} synced=${result.synced} failed=${result.failed} deleted=${result.deleted} skipped=${result.skipped}`
      );
    } catch (error) {
      console.error("[metrics-sync] Fatal error:", error);
    }
    return null;
  });

// ============================================================
// AUTONOMOUS STRATEGIST — Phase 4
// ------------------------------------------------------------
// Runs daily at 08:00 Europe/Paris. For each user who has
// `autonomousMode.enabled === true` AND `autonomousMode.dayOfWeek` matching
// today, fires one HTTP POST to /api/strategist/auto-batch which:
//   - generates a fresh draft batch via the shared `generateBatchPlan` core
//   - sets `pendingAutoBatchId` on the user doc (UI banner picks it up)
//   - bumps `autonomousMode.lastTriggeredAt` (dedup guard inside the endpoint)
//
// Why HTTP from the cron instead of importing the lib directly?
//   The lib lives under Next.js (path aliases `@/lib/...`, depends on
//   `lib/db/firebase-admin`). Pulling it into the Functions bundle would
//   require building two TS configs in lock-step. One HTTP hop is the
//   cheap, boring solution — and the endpoint is already isolated behind
//   a CRON_SECRET so it's safe to expose.
//
// Required config (functions/.env.<projectId>): POSTY_APP_URL, CRON_SECRET.
// ============================================================

export const weeklyAutonomousStrategist = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 8 * * *") // every day at 08:00
  .timeZone("Europe/Paris")
  .onRun(async () => {
    if (!CONFIG.appUrl || !CONFIG.cronSecret) {
      console.error(
        "[autonomous-strategist] Skipping run — POSTY_APP_URL and CRON_SECRET must be configured (functions/.env.<projectId>)"
      );
      return null;
    }

    // dayOfWeek matches JavaScript Date semantics (0=Sun..6=Sat). We use the
    // function's executing date in Europe/Paris (set by .timeZone above), so
    // a Sunday-EU run won't misfire as Monday for Pacific-time servers.
    const todayDow = new Date().getDay();
    const startedAt = Date.now();

    let snap;
    try {
      snap = await db
        .collection("users")
        .where("autonomousMode.enabled", "==", true)
        .where("autonomousMode.dayOfWeek", "==", todayDow)
        .limit(500) // generous cap; we don't have >500 max users yet
        .get();
    } catch (err) {
      console.error("[autonomous-strategist] Firestore query failed (missing index?):", err);
      return null;
    }

    if (snap.empty) {
      console.log(`[autonomous-strategist] No opted-in users for dayOfWeek=${todayDow}`);
      return null;
    }

    console.log(`[autonomous-strategist] Found ${snap.size} user(s) to trigger`);

    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const userDoc of snap.docs) {
      const uid = userDoc.id;
      // Inline plan check — saves a wasted HTTP hop for downgraded users.
      const plan = userDoc.get("subscription.plan");
      if (plan !== "max") {
        skipped++;
        continue;
      }
      try {
        const res = await fetch(`${CONFIG.appUrl}/api/strategist/auto-batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cron-secret": CONFIG.cronSecret,
          },
          body: JSON.stringify({ userId: uid }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.warn(`[autonomous-strategist] user=${uid} → HTTP ${res.status}: ${text.slice(0, 200)}`);
          failed++;
        } else {
          success++;
        }
      } catch (err) {
        console.error(`[autonomous-strategist] user=${uid} fetch failed:`, err);
        failed++;
      }
      // Tiny spread (250ms) between calls so we don't fan-out 500 OpenAI
      // requests in the same second. The endpoint itself is idempotent.
      await new Promise((r) => setTimeout(r, 250));
    }

    console.log(
      `[autonomous-strategist] Done in ${Date.now() - startedAt}ms: success=${success} skipped=${skipped} failed=${failed}`
    );
    return null;
  });
