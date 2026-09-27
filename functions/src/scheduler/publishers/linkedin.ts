import { PublishError, sanitizeDetail } from "../errors";
import {
  JSON_TIMEOUT_MS,
  UPLOAD_TIMEOUT_MS,
  classifyHttpStatus,
  readBodySafe,
  parseRetryAfter,
  requestWithTimeout,
} from "../http";
import type { PublishWarning, ScheduledPostImage } from "../types";
import { assertNotExpired, assertTimeLeft, decryptConnectionToken } from "./auth";
import { assertOwnedImagePaths } from "./media";
import type { PlatformDeps, PublishContext, PublishSuccess, Publisher } from "./types";

const PLATFORM = "linkedin";

/**
 * Stable app-identifying User-Agent. MUST stay identical to
 * `POSTY_LINKEDIN_UA` in `lib/linkedin/signals.ts` (direct-publish routes):
 * LinkedIn must not be able to tell scheduled and direct posts apart.
 */
export const POSTY_LINKEDIN_UA = "Posty/1.0 (+https://posty.app; scheduled-publisher)";

export function linkedInJsonHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "User-Agent": POSTY_LINKEDIN_UA,
    Accept: "application/json",
  };
}

/**
 * LinkedIn rejects a re-submission of identical content with a 422 naming
 * the original share ("Content is a duplicate of urn:li:share:…"). After an
 * ambiguous attempt that is exactly the proof the earlier call succeeded.
 */
export function detectLinkedInDuplicate(status: number, body: string): { duplicate: boolean; urn: string | null } {
  if (![400, 409, 422].includes(status) || !/duplicate/i.test(body)) return { duplicate: false, urn: null };
  const match = body.match(/urn:li:(?:share|ugcPost|activity):[0-9]+/i);
  return { duplicate: true, urn: match ? match[0] : null };
}

export function linkedInPostUrl(urn: string): string {
  return `https://www.linkedin.com/feed/update/${urn}/`;
}

interface LinkedInOrganization {
  urn?: unknown;
  name?: unknown;
}

/** A media step failed permanently for this image → publish text-only (kept product behaviour, now visible). */
class MediaDropped extends Error {}

async function uploadImage(
  ctx: PublishContext,
  deps: PlatformDeps,
  accessToken: string,
  ownerUrn: string,
  image: ScheduledPostImage,
): Promise<string> {
  const apiBase = deps.config.linkedinApiBaseUrl;

  let bytes: Buffer | null;
  try {
    bytes = await deps.data.downloadStorageFile(image.storagePath);
  } catch (err) {
    throw new PublishError({
      code: "INTERNAL_ERROR",
      platform: PLATFORM,
      detail: sanitizeDetail(`Storage download failed for ${image.storagePath}: ${err instanceof Error ? err.message : err}`),
    });
  }
  if (!bytes) throw new MediaDropped(`image not found in storage: ${image.storagePath}`);

  assertTimeLeft(ctx, deps.now(), JSON_TIMEOUT_MS + 5_000);
  const registerRes = await requestWithTimeout(
    deps.fetch,
    `${apiBase}/assets?action=registerUpload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": POSTY_LINKEDIN_UA,
        Accept: "application/json",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: ownerUrn,
          serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
        },
      }),
    },
    { platform: PLATFORM, stage: "prepare" },
  );
  if (!registerRes.ok) throwMediaHttpFailure(registerRes, await readBodySafe(registerRes), deps.now(), "registerUpload");

  const registerBody = await readBodySafe(registerRes);
  let uploadUrl: string | undefined;
  let asset: string | undefined;
  try {
    const parsed = JSON.parse(registerBody) as {
      value?: {
        asset?: string;
        uploadMechanism?: Record<string, { uploadUrl?: string } | undefined>;
      };
    };
    uploadUrl = parsed.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
    asset = parsed.value?.asset;
  } catch {
    // handled below
  }
  if (!uploadUrl || !asset) throw new MediaDropped("unexpected registerUpload response shape");

  assertTimeLeft(ctx, deps.now(), UPLOAD_TIMEOUT_MS + 5_000);
  const uploadRes = await requestWithTimeout(
    deps.fetch,
    uploadUrl,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": image.contentType,
        "Content-Length": String(bytes.length),
        "User-Agent": POSTY_LINKEDIN_UA,
      },
      // Uint8Array for Node 20 fetch() body compatibility.
      body: new Uint8Array(bytes),
    },
    { platform: PLATFORM, stage: "prepare", timeoutMs: UPLOAD_TIMEOUT_MS },
  );
  if (!uploadRes.ok) throwMediaHttpFailure(uploadRes, await readBodySafe(uploadRes), deps.now(), "upload");
  return asset;
}

/**
 * Media calls happen before anything is published, so nothing here is
 * ambiguous. Auth/permission/transient errors fail or retry the whole post;
 * any other rejection of the image drops the image (text-only fallback).
 */
function throwMediaHttpFailure(res: Response, body: string, nowMs: number, step: string): never {
  const error = classifyHttpStatus({
    platform: PLATFORM,
    status: res.status,
    body: `${step}: ${body}`,
    stage: "prepare",
    retryAfterMs: parseRetryAfter(res.headers.get("retry-after"), nowMs),
  });
  if (error.code === "CONTENT_REJECTED") throw new MediaDropped(`${step} rejected (HTTP ${res.status})`);
  throw error;
}

async function runSelfWarmupPings(deps: PlatformDeps, accessToken: string, shareUrn: string): Promise<void> {
  // "Author present" footprint — mirrors lib/linkedin/signals.ts so direct
  // and scheduled publications leave the same session signal.
  const headers = { Authorization: `Bearer ${accessToken}`, "User-Agent": POSTY_LINKEDIN_UA, Accept: "application/json" };
  await deps.sleep(1500 + Math.floor(deps.random() * 2500));
  const base = deps.config.linkedinApiBaseUrl;
  await deps.fetch(`${base}/me`, { headers, signal: AbortSignal.timeout(10_000) }).catch(() => undefined);
  await deps
    .fetch(`${base}/ugcPosts/${encodeURIComponent(shareUrn)}`, { headers, signal: AbortSignal.timeout(10_000) })
    .catch(() => undefined);
}

export const publishToLinkedIn: Publisher = async (ctx, deps): Promise<PublishSuccess> => {
  // No local length check: JS counts UTF-16 units while LinkedIn counts
  // characters, so a local limit would reject valid emoji-heavy posts.
  // LinkedIn's own 422 is authoritative and classified with its detail.
  if (!ctx.content.trim()) throw new PublishError({ code: "INVALID_POST_DATA", platform: PLATFORM, detail: "Empty content" });
  assertOwnedImagePaths(ctx);

  const connection = await deps.data.getConnection("linkedinConnections", ctx.userId);
  if (!connection) throw new PublishError({ code: "CONNECTION_NOT_FOUND", platform: PLATFORM });
  const accessToken = decryptConnectionToken(connection.accessToken, PLATFORM);
  assertNotExpired(connection.expiresAt, deps.now(), PLATFORM);
  const linkedInId = typeof connection.linkedInId === "string" ? connection.linkedInId : "";
  if (!linkedInId) {
    throw new PublishError({ code: "CONNECTION_NOT_FOUND", platform: PLATFORM, detail: "linkedInId missing on the connection" });
  }

  const warnings: PublishWarning[] = [];
  const personUrn = `urn:li:person:${linkedInId}`;
  let authorUrn = personUrn;
  let authorType: "person" | "organization" = "person";
  let organizationName: string | null = null;
  if (ctx.organizationUrn) {
    // Re-validated against the live connection: a stale org on the post can
    // never publish to a page the user no longer administers.
    const orgs = Array.isArray(connection.organizations) ? (connection.organizations as LinkedInOrganization[]) : [];
    const match = orgs.find((o) => o && o.urn === ctx.organizationUrn);
    if (match && typeof match.urn === "string") {
      authorUrn = match.urn;
      authorType = "organization";
      organizationName = typeof match.name === "string" ? match.name : null;
    } else {
      warnings.push({
        code: "ORGANIZATION_FALLBACK_PERSONAL",
        detail: `${ctx.organizationUrn} is no longer in the connection's administered pages`,
      });
    }
  }

  // ── Media ────────────────────────────────────────────────────────────────
  // After an ambiguous attempt, replay the exact same assets so the create
  // request is byte-identical and LinkedIn's duplicate detection can prove
  // the earlier publication.
  let mediaAssets: string[] = [];
  const replayAssets = ctx.priorSendUncertain && ctx.resumeState.linkedinAssets !== undefined;
  if (replayAssets) {
    mediaAssets = ctx.resumeState.linkedinAssets.split(",").filter(Boolean);
  } else if (ctx.images.length > 0) {
    try {
      for (const image of ctx.images) {
        mediaAssets.push(await uploadImage(ctx, deps, accessToken, authorUrn, image));
      }
    } catch (err) {
      if (!(err instanceof MediaDropped)) throw err;
      warnings.push({ code: "IMAGE_DROPPED", detail: err.message });
      mediaAssets = [];
    }
  }

  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: ctx.content },
        shareMediaCategory: mediaAssets.length > 0 ? "IMAGE" : "NONE",
        ...(mediaAssets.length > 0 ? { media: mediaAssets.map((media) => ({ status: "READY", media })) } : {}),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": ctx.visibility },
  };

  // ── Point of no return ───────────────────────────────────────────────────
  assertTimeLeft(ctx, deps.now(), JSON_TIMEOUT_MS + 5_000);
  await ctx.beforeSend({ linkedinAssets: mediaAssets.join(",") });
  const res = await requestWithTimeout(
    deps.fetch,
    `${deps.config.linkedinApiBaseUrl}/ugcPosts`,
    { method: "POST", headers: linkedInJsonHeaders(accessToken), body: JSON.stringify(body) },
    { platform: PLATFORM, stage: "send" },
  );

  let shareUrn: string | null = null;
  let reconciled = false;
  if (res.ok) {
    const text = await readBodySafe(res);
    try {
      const parsed = JSON.parse(text) as { id?: unknown };
      if (typeof parsed.id === "string") shareUrn = parsed.id;
    } catch {
      // body lost/unparseable — the header still carries the id
    }
    shareUrn = shareUrn ?? res.headers.get("x-restli-id");
  } else {
    const text = await readBodySafe(res);
    const dup = detectLinkedInDuplicate(res.status, text);
    if (dup.duplicate && ctx.priorSendUncertain) {
      shareUrn = dup.urn;
      reconciled = true;
    } else if (dup.duplicate) {
      throw new PublishError({
        code: "DUPLICATE_CONTENT",
        platform: PLATFORM,
        httpStatus: res.status,
        detail: sanitizeDetail(text),
      });
    } else {
      throw classifyHttpStatus({
        platform: PLATFORM,
        status: res.status,
        body: text,
        stage: "send",
        retryAfterMs: parseRetryAfter(res.headers.get("retry-after"), deps.now()),
      });
    }
  }

  const publishedUrl = shareUrn ? linkedInPostUrl(shareUrn) : null;
  if (!shareUrn) {
    deps.log.log("WARNING", "scheduler.linkedin_missing_share_id", { postId: ctx.postId, reconciled });
  }

  if (shareUrn && !reconciled) deps.background(runSelfWarmupPings(deps, accessToken, shareUrn));

  // Same record shape as saveLinkedInPostAdmin (direct flow). Deterministic
  // id: a replayed attempt overwrites instead of double-counting analytics.
  try {
    await deps.data.recordPublishedPost("linkedinPosts", `sched_${ctx.postId}`, {
      userId: ctx.userId,
      linkedInId: shareUrn ?? "",
      postId: "",
      scheduledPostId: ctx.postId,
      content: ctx.content,
      postUrl: publishedUrl,
      success: true,
      error: null,
      publishedAt: deps.data.timestamp(deps.now()),
      authorType,
      authorUrn,
      organizationUrn: authorType === "organization" ? authorUrn : null,
      organizationName,
      status: "published",
      // Org posts expose metrics via the API; personal posts do not.
      syncStatus: authorType === "organization" ? "pending" : "not_available",
      lastMetricsSyncAt: null,
    });
    await deps.data.updateConnection("linkedinConnections", ctx.userId, { lastUsedAt: deps.data.timestamp(deps.now()) });
  } catch (err) {
    deps.log.log("WARNING", "scheduler.record_failed", {
      postId: ctx.postId,
      platform: PLATFORM,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    externalPostId: shareUrn,
    publishedUrl,
    reconciled,
    warnings,
    // Seed comments are always authored by the human (a Company Page cannot
    // comment on its own post via the API).
    linkedinSeed: shareUrn ? { shareUrn, actorUrn: personUrn } : undefined,
  };
};
