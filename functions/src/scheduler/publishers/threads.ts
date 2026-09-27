import { PublishError } from "../errors";
import { JSON_TIMEOUT_MS, classifyGraphFailure, parseRetryAfter, readBodySafe, requestWithTimeout } from "../http";
import { assertNotExpired, assertTimeLeft, decryptConnectionToken } from "./auth";
import { assertOwnedImagePaths } from "./media";
import type { PlatformDeps, PublishContext, PublishSuccess, Publisher } from "./types";

const PLATFORM = "threads";
/** Refresh proactively when the long-lived token has less than this left. */
export const THREADS_REFRESH_WINDOW_MS = 7 * 24 * 60 * 60_000;

async function graphJson(
  deps: PlatformDeps,
  url: string,
  init: RequestInit,
  stage: "prepare" | "send",
): Promise<Record<string, unknown>> {
  const res = await requestWithTimeout(deps.fetch, url, init, { platform: PLATFORM, stage });
  const text = await readBodySafe(res);
  if (!res.ok) {
    throw classifyGraphFailure({
      platform: PLATFORM,
      status: res.status,
      body: text,
      stage,
      retryAfterMs: parseRetryAfter(res.headers.get("retry-after"), deps.now()),
    });
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Long-lived Threads tokens last 60 days and can be refreshed once they are
 * 24 h old — but only while still valid. Refreshing here keeps scheduled
 * posts working for users who don't open the app. Best-effort: on failure
 * the current (still valid) token is used.
 * https://developers.facebook.com/docs/threads/get-started/long-lived-tokens
 */
async function maybeRefreshToken(
  ctx: PublishContext,
  deps: PlatformDeps,
  token: string,
  expiresAtMs: number | null,
): Promise<string> {
  if (expiresAtMs === null || expiresAtMs - deps.now() > THREADS_REFRESH_WINDOW_MS) return token;
  try {
    const params = new URLSearchParams({ grant_type: "th_refresh_token", access_token: token });
    const res = await requestWithTimeout(
      deps.fetch,
      `${deps.config.threadsRefreshUrl}?${params.toString()}`,
      { method: "GET" },
      { platform: PLATFORM, stage: "prepare", timeoutMs: 15_000 },
    );
    if (!res.ok) {
      deps.log.log("WARNING", "scheduler.threads_token_refresh_failed", {
        postId: ctx.postId,
        userId: ctx.userId,
        httpStatus: res.status,
      });
      return token;
    }
    const data = JSON.parse(await readBodySafe(res)) as { access_token?: unknown; expires_in?: unknown };
    if (typeof data.access_token !== "string" || !data.access_token) return token;
    const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 60 * 24 * 60 * 60;
    await deps.data.updateConnection("threadsConnections", ctx.userId, {
      accessToken: deps.data.encryptToken(data.access_token),
      expiresAt: deps.data.timestamp(deps.now() + expiresIn * 1000),
      tokenRefreshedAt: deps.data.timestamp(deps.now()),
    });
    deps.log.log("INFO", "scheduler.threads_token_refreshed", { postId: ctx.postId, userId: ctx.userId });
    return data.access_token;
  } catch (err) {
    deps.log.log("WARNING", "scheduler.threads_token_refresh_failed", {
      postId: ctx.postId,
      userId: ctx.userId,
      detail: err instanceof Error ? err.message : String(err),
    });
    return token;
  }
}

async function findPublishedThread(
  deps: PlatformDeps,
  token: string,
  content: string,
): Promise<{ id: string | null; permalink: string | null }> {
  try {
    const params = new URLSearchParams({ fields: "id,permalink,text", limit: "10", access_token: token });
    const data = await graphJson(deps, `${deps.config.threadsApiUrl}/me/threads?${params.toString()}`, { method: "GET" }, "prepare");
    const items = Array.isArray(data.data) ? (data.data as Array<Record<string, unknown>>) : [];
    const match = items.find((t) => t.text === content);
    return {
      id: match && typeof match.id === "string" ? match.id : null,
      permalink: match && typeof match.permalink === "string" ? match.permalink : null,
    };
  } catch {
    return { id: null, permalink: null };
  }
}

export const publishToThreads: Publisher = async (ctx, deps): Promise<PublishSuccess> => {
  if (!ctx.content.trim()) throw new PublishError({ code: "INVALID_POST_DATA", platform: PLATFORM, detail: "Empty content" });
  assertOwnedImagePaths(ctx);

  const connection = await deps.data.getConnection("threadsConnections", ctx.userId);
  if (!connection) throw new PublishError({ code: "CONNECTION_NOT_FOUND", platform: PLATFORM });
  const storedToken = decryptConnectionToken(connection.accessToken, PLATFORM);
  const expiresAtMs = assertNotExpired(connection.expiresAt, deps.now(), PLATFORM);
  const token = await maybeRefreshToken(ctx, deps, storedToken, expiresAtMs);
  const api = deps.config.threadsApiUrl;

  // ── Reconcile an ambiguous earlier attempt through its container ─────────
  let creationId: string | null = null;
  const previousContainer = ctx.priorSendUncertain ? ctx.resumeState.threadsCreationId : undefined;
  if (previousContainer) {
    const params = new URLSearchParams({ fields: "status", access_token: token });
    const container = await graphJson(deps, `${api}/${previousContainer}?${params.toString()}`, { method: "GET" }, "prepare");
    if (container.status === "PUBLISHED") {
      const found = await findPublishedThread(deps, token, ctx.content);
      return { externalPostId: found.id, publishedUrl: found.permalink, reconciled: true, warnings: [] };
    }
    if (container.status === "FINISHED" || container.status === "IN_PROGRESS") creationId = previousContainer;
    // EXPIRED / ERROR: never published → start over with a new container.
  }

  if (!creationId) {
    assertTimeLeft(ctx, deps.now(), JSON_TIMEOUT_MS + 5_000);
    const params = new URLSearchParams({ media_type: "TEXT", text: ctx.content, access_token: token });
    const created = await graphJson(deps, `${api}/me/threads?${params.toString()}`, { method: "POST" }, "prepare");
    if (typeof created.id !== "string") {
      throw new PublishError({ code: "PLATFORM_UNAVAILABLE", platform: PLATFORM, detail: "Container creation returned no id" });
    }
    creationId = created.id;
    // Give Threads time to process the container before publishing it.
    await deps.sleep(2000);
  }

  assertTimeLeft(ctx, deps.now(), JSON_TIMEOUT_MS + 5_000);
  await ctx.beforeSend({ threadsCreationId: creationId });
  const publishParams = new URLSearchParams({ creation_id: creationId, access_token: token });
  const published = await graphJson(deps, `${api}/me/threads_publish?${publishParams.toString()}`, { method: "POST" }, "send");
  const threadId = typeof published.id === "string" ? published.id : null;

  let permalink: string | null = null;
  if (threadId) {
    try {
      const params = new URLSearchParams({ fields: "permalink", access_token: token });
      const info = await graphJson(deps, `${api}/${threadId}?${params.toString()}`, { method: "GET" }, "prepare");
      if (typeof info.permalink === "string") permalink = info.permalink;
    } catch {
      // Permalink is cosmetic — the thread is published.
    }
  }

  try {
    await deps.data.recordPublishedPost("threadsPosts", `sched_${ctx.postId}`, {
      userId: ctx.userId,
      threadsId: connection.threadsId ?? null,
      threadId: threadId ?? "",
      scheduledPostId: ctx.postId,
      content: ctx.content,
      permalink,
      success: true,
      publishedAt: deps.data.timestamp(deps.now()),
    });
    await deps.data.updateConnection("threadsConnections", ctx.userId, { lastUsedAt: deps.data.timestamp(deps.now()) });
  } catch (err) {
    deps.log.log("WARNING", "scheduler.record_failed", {
      postId: ctx.postId,
      platform: PLATFORM,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  return { externalPostId: threadId, publishedUrl: permalink, reconciled: false, warnings: [] };
};
