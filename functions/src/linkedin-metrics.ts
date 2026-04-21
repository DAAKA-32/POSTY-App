/**
 * LinkedIn engagement metrics sync (cron + manual trigger).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * LinkedIn exposes engagement data ONLY for posts published as an organization
 * (Company Page). Posts published on a personal profile
 * (`urn:li:person:{id}`) have no metrics endpoint whatsoever.
 *
 * For each tracked post where `authorType === 'organization'`, this module:
 *   1. Calls `GET /rest/posts/{urn}` to detect hard-deletes (404 → status='deleted')
 *   2. Calls `GET /rest/socialActions/{urn}` for raw likes + comments counts
 *   3. Calls `GET /rest/organizationalEntityShareStatistics?q=organizationalEntity`
 *      for impressions / unique-impressions / clicks / engagement rate
 *
 * Results are written back to the `linkedinPosts` document with a fresh
 * `lastMetricsSyncAt`, `syncStatus: 'synced' | 'failed'` and the error (when
 * applicable). Posts with `authorType === 'person'` are skipped — their
 * `syncStatus` should already be `'not_available'` (set at save time).
 *
 * All API calls use the LinkedIn versioned REST endpoints (`/rest/`) with the
 * `LinkedIn-Version` header set to a known-good month; this is required by
 * MDP-gated endpoints (the legacy `/v2/` paths 404 for several of them).
 */

import * as admin from "firebase-admin";

type Db = admin.firestore.Firestore;

// Pin to a month known to have the metrics endpoints. Bump when LinkedIn
// announces deprecation in the changelog.
const LINKEDIN_VERSION = "202405";
const LINKEDIN_REST = "https://api.linkedin.com/rest";
const LINKEDIN_V2 = "https://api.linkedin.com/v2";

// Minimum time between metric refreshes per post, to avoid burning through
// the rate limits (LinkedIn caps per-app + per-user).
const MIN_RESYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 min

export interface SyncMetricsResult {
  scanned: number;
  synced: number;
  failed: number;
  skipped: number;
  deleted: number;
}

interface PostDoc {
  id: string;
  userId: string;
  linkedInId: string; // == LinkedIn share URN (e.g. "urn:li:share:123..." or "urn:li:ugcPost:...")
  authorType?: "person" | "organization";
  organizationUrn?: string;
  lastMetricsSyncAt?: admin.firestore.Timestamp | null;
  status?: "published" | "deleted" | "unknown";
}

interface LinkedInConnection {
  accessToken: string;
  expiresAt: admin.firestore.Timestamp;
  organizations?: Array<{ urn: string; organizationId: string; name: string }>;
  grantedScopes?: string[];
}

/**
 * Main entry — sync metrics for all org posts that are due.
 * `limit` caps the batch size to stay within the function timeout budget.
 */
export async function syncDueLinkedInMetrics(
  db: Db,
  limit: number = 100
): Promise<SyncMetricsResult> {
  const result: SyncMetricsResult = {
    scanned: 0,
    synced: 0,
    failed: 0,
    skipped: 0,
    deleted: 0,
  };

  // Only posts published as an organization are eligible. Order by
  // lastMetricsSyncAt ASC (nulls first) so we always refresh the stalest first.
  // Requires a composite index on (authorType ASC, lastMetricsSyncAt ASC).
  const snapshot = await db
    .collection("linkedinPosts")
    .where("authorType", "==", "organization")
    .where("status", "==", "published")
    .orderBy("lastMetricsSyncAt", "asc")
    .limit(limit)
    .get()
    .catch(async (err) => {
      // Fallback: index may not exist yet — do an un-ordered scan.
      console.warn("[metrics-sync] ordered query failed, falling back:", err);
      return db
        .collection("linkedinPosts")
        .where("authorType", "==", "organization")
        .limit(limit)
        .get();
    });

  if (snapshot.empty) {
    return result;
  }

  // Group posts by userId so we only fetch each connection once.
  const postsByUser = new Map<string, PostDoc[]>();
  snapshot.forEach((doc) => {
    const data = doc.data() as Omit<PostDoc, "id">;
    const post: PostDoc = { id: doc.id, ...data };

    // Skip anything recently synced.
    const lastSyncMs = post.lastMetricsSyncAt?.toMillis?.();
    if (lastSyncMs && Date.now() - lastSyncMs < MIN_RESYNC_INTERVAL_MS) {
      result.skipped++;
      return;
    }
    if (!post.organizationUrn || !post.linkedInId) {
      result.skipped++;
      return;
    }
    const list = postsByUser.get(post.userId) || [];
    list.push(post);
    postsByUser.set(post.userId, list);
  });

  for (const [userId, posts] of postsByUser) {
    const connection = await loadConnection(db, userId);
    if (!connection) {
      // User deleted their LinkedIn connection — can't sync anymore.
      await Promise.all(
        posts.map((p) =>
          markFailed(db, p.id, "linkedin_connection_missing").catch(() => undefined)
        )
      );
      result.failed += posts.length;
      continue;
    }

    const tokenExpiredMs = connection.expiresAt.toMillis();
    if (tokenExpiredMs <= Date.now()) {
      await Promise.all(
        posts.map((p) => markFailed(db, p.id, "token_expired").catch(() => undefined))
      );
      result.failed += posts.length;
      continue;
    }

    for (const post of posts) {
      result.scanned++;
      try {
        const outcome = await syncSinglePost(db, connection.accessToken, post);
        if (outcome === "deleted") result.deleted++;
        else if (outcome === "synced") result.synced++;
        else result.failed++;
      } catch (err) {
        result.failed++;
        const msg = err instanceof Error ? err.message : String(err);
        await markFailed(db, post.id, msg.slice(0, 300)).catch(() => undefined);
      }
    }
  }

  return result;
}

/**
 * Sync a single post — designed to be reusable from a manual-trigger API route.
 * Returns the outcome so callers can aggregate.
 */
export async function syncSinglePost(
  db: Db,
  accessToken: string,
  post: PostDoc
): Promise<"synced" | "deleted" | "failed"> {
  const shareUrn = post.linkedInId;
  const orgUrn = post.organizationUrn!;

  // 1) Existence check — 404 means the user deleted the post on LinkedIn.
  const existence = await checkPostExists(accessToken, shareUrn);
  if (existence === "deleted") {
    await markDeleted(db, post.id);
    return "deleted";
  }
  if (existence === "unknown") {
    // Network or auth issue — leave the doc untouched, bubble up as failure.
    await markFailed(db, post.id, "existence_check_failed");
    return "failed";
  }

  // 2) Fetch likes + comments via socialActions
  const social = await fetchSocialActions(accessToken, shareUrn);
  // 3) Fetch impressions/clicks/engagement via share statistics
  const stats = await fetchShareStatistics(accessToken, orgUrn, shareUrn);

  const likes = social?.numLikes ?? 0;
  const comments = social?.numComments ?? 0;
  const shares = social?.numShares ?? 0;
  const impressions = stats?.impressionCount ?? 0;
  const uniqueImpressions = stats?.uniqueImpressionsCount ?? undefined;
  const clicks = stats?.clickCount ?? undefined;

  // Prefer LinkedIn's own engagement rate when available, else derive.
  let engagementRate = stats?.engagement ? stats.engagement * 100 : undefined;
  if (engagementRate === undefined && impressions > 0) {
    engagementRate = ((likes + comments + shares) / impressions) * 100;
  }

  const clickRate =
    clicks !== undefined && impressions > 0 ? (clicks / impressions) * 100 : undefined;

  await db
    .collection("linkedinPosts")
    .doc(post.id)
    .update({
      metrics: {
        likes,
        comments,
        shares,
        impressions: impressions || null,
        uniqueImpressions: uniqueImpressions ?? null,
        clicks: clicks ?? null,
        clickRate: clickRate ?? null,
        engagementRate: engagementRate ?? null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "api",
      },
      status: "published",
      syncStatus: "synced",
      syncError: null,
      lastMetricsSyncAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  return "synced";
}

async function loadConnection(db: Db, userId: string): Promise<LinkedInConnection | null> {
  const snap = await db.collection("linkedinConnections").doc(userId).get();
  if (!snap.exists) return null;
  return snap.data() as LinkedInConnection;
}

async function markFailed(db: Db, postId: string, error: string): Promise<void> {
  await db.collection("linkedinPosts").doc(postId).update({
    syncStatus: "failed",
    syncError: error,
    lastMetricsSyncAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function markDeleted(db: Db, postId: string): Promise<void> {
  await db.collection("linkedinPosts").doc(postId).update({
    status: "deleted",
    deletedFromPlatform: true,
    deletedFromPlatformAt: admin.firestore.FieldValue.serverTimestamp(),
    syncStatus: "synced",
    syncError: null,
    lastMetricsSyncAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function checkPostExists(
  accessToken: string,
  shareUrn: string
): Promise<"exists" | "deleted" | "unknown"> {
  // `/rest/posts/{urn}` requires URL-encoded URN.
  const encoded = encodeURIComponent(shareUrn);
  const url = `${LINKEDIN_REST}/posts/${encoded}`;
  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    if (r.ok) return "exists";
    if (r.status === 404 || r.status === 410) return "deleted";
    // Some posts were published via ugcPosts and only resolve via legacy /v2.
    // Retry once there — treat only 404 as authoritative.
    const legacy = await fetch(`${LINKEDIN_V2}/ugcPosts/${encoded}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    if (legacy.ok) return "exists";
    if (legacy.status === 404 || legacy.status === 410) return "deleted";
    return "unknown";
  } catch {
    return "unknown";
  }
}

interface SocialActionsResponse {
  numLikes?: number;
  likesSummary?: { totalLikes?: number; aggregatedTotalLikes?: number };
  numComments?: number;
  commentsSummary?: { totalFirstLevelComments?: number; aggregatedTotalComments?: number };
  numShares?: number;
}

async function fetchSocialActions(
  accessToken: string,
  shareUrn: string
): Promise<{ numLikes: number; numComments: number; numShares: number } | null> {
  const encoded = encodeURIComponent(shareUrn);
  const url = `${LINKEDIN_V2}/socialActions/${encoded}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });
  if (!r.ok) return null;
  const data = (await r.json()) as SocialActionsResponse;
  return {
    numLikes:
      data.numLikes ??
      data.likesSummary?.aggregatedTotalLikes ??
      data.likesSummary?.totalLikes ??
      0,
    numComments:
      data.numComments ??
      data.commentsSummary?.aggregatedTotalComments ??
      data.commentsSummary?.totalFirstLevelComments ??
      0,
    numShares: data.numShares ?? 0,
  };
}

interface ShareStatisticsResponse {
  elements?: Array<{
    totalShareStatistics?: {
      impressionCount?: number;
      uniqueImpressionsCount?: number;
      clickCount?: number;
      engagement?: number; // 0..1
      likeCount?: number;
      commentCount?: number;
      shareCount?: number;
      shareMentionsCount?: number;
      commentMentionsCount?: number;
    };
  }>;
}

async function fetchShareStatistics(
  accessToken: string,
  organizationUrn: string,
  shareUrn: string
): Promise<{
  impressionCount: number;
  uniqueImpressionsCount?: number;
  clickCount?: number;
  engagement?: number;
} | null> {
  const url = new URL(`${LINKEDIN_REST}/organizationalEntityShareStatistics`);
  url.searchParams.set("q", "organizationalEntity");
  url.searchParams.set("organizationalEntity", organizationUrn);
  // shares is a list parameter in Rest.li — URL-encode the List() syntax.
  url.searchParams.set("shares", `List(${shareUrn})`);

  const r = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });
  if (!r.ok) return null;
  const data = (await r.json()) as ShareStatisticsResponse;
  const el = data.elements?.[0]?.totalShareStatistics;
  if (!el) return null;
  return {
    impressionCount: el.impressionCount ?? 0,
    uniqueImpressionsCount: el.uniqueImpressionsCount,
    clickCount: el.clickCount,
    engagement: el.engagement,
  };
}
