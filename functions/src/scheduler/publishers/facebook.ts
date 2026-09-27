import { PublishError } from "../errors";
import { JSON_TIMEOUT_MS, classifyGraphFailure, parseRetryAfter, readBodySafe, requestWithTimeout } from "../http";
import { assertTimeLeft, decryptConnectionToken } from "./auth";
import { assertOwnedImagePaths } from "./media";
import type { PublishSuccess, Publisher } from "./types";

const PLATFORM = "facebook";

interface FacebookPage {
  id?: unknown;
  accessToken?: unknown;
}

/**
 * Publishes on the user's selected Facebook Page (text only, as before).
 *
 * No pre-check on `connection.expiresAt`: that is the *user* token's expiry,
 * while publishing uses the Page token, which — obtained from a long-lived
 * user token — does not expire. Rejecting on the user-token date failed
 * posts that would have published; an invalid Page token surfaces as Graph
 * error 190 (→ AUTH_REJECTED → reconnect).
 *
 * Facebook offers no way to recognise an earlier identical publication, so
 * an ambiguous send ends as OUTCOME_UNKNOWN rather than risking a double post.
 */
export const publishToFacebook: Publisher = async (ctx, deps): Promise<PublishSuccess> => {
  if (!ctx.content.trim()) throw new PublishError({ code: "INVALID_POST_DATA", platform: PLATFORM, detail: "Empty content" });
  assertOwnedImagePaths(ctx);

  const connection = await deps.data.getConnection("facebookConnections", ctx.userId);
  if (!connection) throw new PublishError({ code: "CONNECTION_NOT_FOUND", platform: PLATFORM });

  const pages = Array.isArray(connection.pages) ? (connection.pages as FacebookPage[]) : [];
  const page = pages.find((p) => p && p.id === connection.selectedPageId);
  if (!page || typeof page.id !== "string") {
    throw new PublishError({ code: "CONNECTION_NOT_FOUND", platform: PLATFORM, detail: "No Facebook Page selected" });
  }
  const pageToken = decryptConnectionToken(page.accessToken, PLATFORM, "page accessToken");

  assertTimeLeft(ctx, deps.now(), JSON_TIMEOUT_MS + 5_000);
  await ctx.beforeSend();
  const res = await requestWithTimeout(
    deps.fetch,
    `${deps.config.facebookApiUrl}/${page.id}/feed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: ctx.content, access_token: pageToken }),
    },
    { platform: PLATFORM, stage: "send" },
  );
  const text = await readBodySafe(res);
  if (!res.ok) {
    throw classifyGraphFailure({
      platform: PLATFORM,
      status: res.status,
      body: text,
      stage: "send",
      retryAfterMs: parseRetryAfter(res.headers.get("retry-after"), deps.now()),
    });
  }

  let fbPostId: string | null = null;
  try {
    const parsed = JSON.parse(text) as { id?: unknown };
    if (typeof parsed.id === "string") fbPostId = parsed.id;
  } catch {
    // 2xx without a readable body: published, id unknown.
  }
  const publishedUrl = fbPostId ? `https://www.facebook.com/${fbPostId}` : null;

  try {
    await deps.data.recordPublishedPost("facebookPosts", `sched_${ctx.postId}`, {
      userId: ctx.userId,
      facebookId: connection.facebookId ?? null,
      postId: fbPostId ?? "",
      scheduledPostId: ctx.postId,
      pageId: page.id,
      content: ctx.content,
      postUrl: publishedUrl,
      success: true,
      publishedAt: deps.data.timestamp(deps.now()),
    });
    await deps.data.updateConnection("facebookConnections", ctx.userId, { lastUsedAt: deps.data.timestamp(deps.now()) });
  } catch (err) {
    deps.log.log("WARNING", "scheduler.record_failed", {
      postId: ctx.postId,
      platform: PLATFORM,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  return { externalPostId: fbPostId, publishedUrl, reconciled: false, warnings: [] };
};
