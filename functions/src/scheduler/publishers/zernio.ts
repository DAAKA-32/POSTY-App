import { ZERNIO_API_BASE, buildZernioPostBody, getZernioApiKey, type ZernioFunctionsPlatform } from "../../zernio";
import { PublishError, sanitizeDetail } from "../errors";
import { JSON_TIMEOUT_MS, parseRetryAfter, readBodySafe, requestWithTimeout } from "../http";
import { assertTimeLeft } from "./auth";
import { assertOwnedImagePaths } from "./media";
import type { PublishSuccess, Publisher } from "./types";

interface ZernioTarget {
  connections: string;
  posts: string;
  zernioPlatform: ZernioFunctionsPlatform;
}

/** Posty platform key → its Firestore collections and Zernio platform id. */
export const ZERNIO_TARGETS: Record<"x" | "twitter" | "instagram" | "reddit" | "threadsz", ZernioTarget> = {
  x: { connections: "xConnections", posts: "xPosts", zernioPlatform: "twitter" },
  twitter: { connections: "xConnections", posts: "xPosts", zernioPlatform: "twitter" },
  instagram: { connections: "instagramConnections", posts: "instagramPosts", zernioPlatform: "instagram" },
  reddit: { connections: "redditConnections", posts: "redditPosts", zernioPlatform: "reddit" },
  // Threads via Zernio — distinct from the native Meta "threads" platform.
  threadsz: { connections: "threadszConnections", posts: "threadszPosts", zernioPlatform: "threads" },
};

function isZernioTarget(platform: string): platform is keyof typeof ZERNIO_TARGETS {
  return Object.prototype.hasOwnProperty.call(ZERNIO_TARGETS, platform);
}

function zernioMessage(body: string): string {
  try {
    const json = JSON.parse(body) as { message?: unknown; error?: unknown };
    if (typeof json.message === "string") return json.message;
    if (typeof json.error === "string") return json.error;
  } catch {
    // not JSON
  }
  return body;
}

/**
 * Zernio publishes on the user's behalf with OUR API key: a 401 means the
 * key is wrong (server configuration), not that the user's account is.
 * Zernio exposes no way to recognise an earlier identical publication, so an
 * ambiguous send ends as OUTCOME_UNKNOWN (policy) instead of a double post.
 */
function classifyZernioFailure(platform: string, status: number, body: string, retryAfterMs?: number): PublishError {
  const detail = sanitizeDetail(`HTTP ${status} — ${zernioMessage(body)}`);
  const base = { platform, detail, httpStatus: status };
  if (status === 401) return new PublishError({ ...base, code: "CONFIG_ZERNIO_KEY_INVALID" });
  if (status === 403) return new PublishError({ ...base, code: "PERMISSION_DENIED" });
  if (status === 404) return new PublishError({ ...base, code: "CONNECTION_NOT_FOUND" });
  if (status === 429) return new PublishError({ ...base, code: "RATE_LIMITED", retryAfterMs });
  // Only used for the create call: a 5xx may come after the post was made.
  if (status >= 500) return new PublishError({ ...base, code: "PLATFORM_UNAVAILABLE", ambiguous: true });
  return new PublishError({ ...base, code: "CONTENT_REJECTED" });
}

export const publishViaZernioPlatform: Publisher = async (ctx, deps): Promise<PublishSuccess> => {
  const platform = ctx.platform;
  if (!isZernioTarget(platform)) throw new PublishError({ code: "UNSUPPORTED_PLATFORM", platform });
  const target = ZERNIO_TARGETS[platform];

  if (!ctx.content.trim()) throw new PublishError({ code: "INVALID_POST_DATA", platform, detail: "Empty content" });
  assertOwnedImagePaths(ctx);
  if (platform === "instagram" && ctx.images.length === 0) {
    throw new PublishError({ code: "MEDIA_REQUIRED", platform, detail: "Instagram has no text-only posts" });
  }
  const subreddit = ctx.reddit.subreddit?.trim() ?? "";
  const title = ctx.reddit.title?.trim() ?? "";
  if (platform === "reddit" && (!subreddit || !title)) {
    throw new PublishError({ code: "INVALID_POST_DATA", platform, detail: "Reddit needs a subreddit and a title" });
  }

  const apiKey = getZernioApiKey();
  if (!apiKey) {
    throw new PublishError({
      code: "CONFIG_ZERNIO_KEY_MISSING",
      platform,
      detail: "ZERNIO_API_KEY is not set in the Cloud Functions runtime",
    });
  }

  const connection = await deps.data.getConnection(target.connections, ctx.userId);
  const accountId = connection && typeof connection.zernioAccountId === "string" ? connection.zernioAccountId : "";
  if (!accountId) throw new PublishError({ code: "CONNECTION_NOT_FOUND", platform });

  const body = buildZernioPostBody({
    content: ctx.content,
    platform: target.zernioPlatform,
    accountId,
    mediaItems: ctx.images.map((img) => ({ type: "image" as const, url: img.downloadURL })),
    reddit: platform === "reddit" ? { subreddit, title } : undefined,
  });

  assertTimeLeft(ctx, deps.now(), JSON_TIMEOUT_MS + 5_000);
  await ctx.beforeSend();
  const res = await requestWithTimeout(
    deps.fetch,
    `${ZERNIO_API_BASE}/posts`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { platform, stage: "send" },
  );
  const text = await readBodySafe(res);
  if (!res.ok) {
    throw classifyZernioFailure(platform, res.status, text, parseRetryAfter(res.headers.get("retry-after"), deps.now()));
  }

  let zernioPostId: string | null = null;
  let publishedUrl: string | null = null;
  try {
    const data = JSON.parse(text) as {
      post?: {
        _id?: unknown;
        status?: unknown;
        platforms?: Array<{ platform?: unknown; postUrl?: unknown; platformPostUrl?: unknown; error?: unknown }>;
      };
    };
    const post = data.post ?? {};
    const platformResult = (post.platforms ?? []).find((p) => p.platform === target.zernioPlatform);
    if (post.status === "failed") {
      const reason = typeof platformResult?.error === "string" ? platformResult.error : "Zernio reported the publication as failed";
      throw new PublishError({ code: "CONTENT_REJECTED", platform, httpStatus: res.status, detail: sanitizeDetail(reason) });
    }
    if (typeof post._id === "string") zernioPostId = post._id;
    const url = platformResult?.platformPostUrl ?? platformResult?.postUrl;
    if (typeof url === "string") publishedUrl = url;
  } catch (err) {
    if (err instanceof PublishError) throw err;
    // 2xx without a readable body: published, ids unknown.
  }

  try {
    await deps.data.recordPublishedPost(target.posts, `sched_${ctx.postId}`, {
      userId: ctx.userId,
      zernioAccountId: accountId,
      zernioPostId: zernioPostId ?? "",
      scheduledPostId: ctx.postId,
      content: ctx.content,
      postUrl: publishedUrl,
      ...(platform === "reddit" ? { subreddit: subreddit.replace(/^r\//, "").trim(), title } : {}),
      publishedAt: deps.data.timestamp(deps.now()),
      success: true,
    });
    await deps.data.updateConnection(target.connections, ctx.userId, { lastUsedAt: deps.data.timestamp(deps.now()) });
  } catch (err) {
    deps.log.log("WARNING", "scheduler.record_failed", {
      postId: ctx.postId,
      platform,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  return { externalPostId: zernioPostId, publishedUrl, reconciled: false, warnings: [] };
};
