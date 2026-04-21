/**
 * LinkedIn engagement metrics — Next.js server runtime variant.
 *
 * This mirrors `functions/src/linkedin-metrics.ts` for use inside API routes
 * (where the Firebase Functions build isn't in scope). Both implementations
 * talk to the same LinkedIn endpoints; the duplication is intentional because
 * the two environments don't share a TypeScript project.
 *
 * Personal-profile (`urn:li:person:*`) posts cannot be synced — LinkedIn does
 * not expose any metrics endpoint for them. Only organization posts are
 * eligible. Callers are expected to have already filtered on
 * `authorType === 'organization'` before reaching this module.
 */

import { FieldValue, Firestore } from "firebase-admin/firestore";

const LINKEDIN_VERSION = "202405";
const LINKEDIN_REST = "https://api.linkedin.com/rest";
const LINKEDIN_V2 = "https://api.linkedin.com/v2";

interface PostRef {
  id: string;
  userId: string;
  linkedInId: string;
  organizationUrn?: string;
}

export async function syncSingleLinkedInPostMetrics(params: {
  adminDb: Firestore;
  accessToken: string;
  post: PostRef;
}): Promise<"synced" | "deleted" | "failed"> {
  const { adminDb, accessToken, post } = params;
  if (!post.organizationUrn || !post.linkedInId) {
    await markFailed(adminDb, post.id, "missing_org_or_share_urn");
    return "failed";
  }

  const existence = await checkPostExists(accessToken, post.linkedInId);
  if (existence === "deleted") {
    await markDeleted(adminDb, post.id);
    return "deleted";
  }
  if (existence === "unknown") {
    await markFailed(adminDb, post.id, "existence_check_failed");
    return "failed";
  }

  const social = await fetchSocialActions(accessToken, post.linkedInId);
  const stats = await fetchShareStatistics(accessToken, post.organizationUrn, post.linkedInId);

  const likes = social?.numLikes ?? 0;
  const comments = social?.numComments ?? 0;
  const shares = social?.numShares ?? 0;
  const impressions = stats?.impressionCount ?? 0;
  const uniqueImpressions = stats?.uniqueImpressionsCount;
  const clicks = stats?.clickCount;

  let engagementRate = stats?.engagement !== undefined ? stats.engagement * 100 : undefined;
  if (engagementRate === undefined && impressions > 0) {
    engagementRate = ((likes + comments + shares) / impressions) * 100;
  }
  const clickRate =
    clicks !== undefined && impressions > 0 ? (clicks / impressions) * 100 : undefined;

  await adminDb
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
        updatedAt: FieldValue.serverTimestamp(),
        source: "api",
      },
      status: "published",
      syncStatus: "synced",
      syncError: null,
      lastMetricsSyncAt: FieldValue.serverTimestamp(),
    });

  return "synced";
}

async function markFailed(adminDb: Firestore, postId: string, error: string): Promise<void> {
  await adminDb.collection("linkedinPosts").doc(postId).update({
    syncStatus: "failed",
    syncError: error,
    lastMetricsSyncAt: FieldValue.serverTimestamp(),
  });
}

async function markDeleted(adminDb: Firestore, postId: string): Promise<void> {
  await adminDb.collection("linkedinPosts").doc(postId).update({
    status: "deleted",
    deletedFromPlatform: true,
    deletedFromPlatformAt: FieldValue.serverTimestamp(),
    syncStatus: "synced",
    syncError: null,
    lastMetricsSyncAt: FieldValue.serverTimestamp(),
  });
}

async function checkPostExists(
  accessToken: string,
  shareUrn: string
): Promise<"exists" | "deleted" | "unknown"> {
  const encoded = encodeURIComponent(shareUrn);
  try {
    const r = await fetch(`${LINKEDIN_REST}/posts/${encoded}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    if (r.ok) return "exists";
    if (r.status === 404 || r.status === 410) return "deleted";
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
  const r = await fetch(`${LINKEDIN_V2}/socialActions/${encoded}`, {
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
      engagement?: number;
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
