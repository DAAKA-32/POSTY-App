// Zernio API client.
//
// Zernio is an aggregator SaaS that handles OAuth + publishing for 20+ social
// platforms behind a single API. Posty uses it specifically for networks that
// Posty cannot reasonably integrate directly (currently: X/Twitter and
// Instagram — both gated by paid APIs or multi-week Meta app review).
//
// Native networks (LinkedIn, Bluesky, Discord, Mastodon, Threads, Facebook
// Pages) continue to go through Posty's own per-platform adapters.
//
// Data model:
//   - 1 ZERNIO_API_KEY = our org. All requests use it as bearer token.
//   - N "profiles" — one per Posty user. We store the mapping
//     `userId -> zernioProfileId` in the `zernioProfiles` Firestore collection.
//   - N "accounts" per profile (the actual X / IG account that user connected).
//     We store the `accountId` per platform in `xConnections` /
//     `instagramConnections` (encrypted via the Phase 1 cipher).
//
// Pricing: Zernio's free tier covers the first 2 connected accounts per
// PROFILE. Since we map 1 Posty user = 1 Zernio profile and limit users to X
// + Instagram via Zernio, we stay within the free tier as long as no user
// connects more than 2 accounts. Network-direct integrations don't count.

import { ZERNIO_API_BASE, ZERNIO_API_KEY_ENV } from "@/lib/config/zernio-constants";

type FetchInit = Omit<RequestInit, "headers" | "body"> & {
  headers?: Record<string, string>;
  body?: unknown;
};

function getApiKey(): string {
  const key = process.env[ZERNIO_API_KEY_ENV];
  if (!key) {
    throw new Error(
      `${ZERNIO_API_KEY_ENV} env var is missing. Set it to the Zernio API key (sk_...) before calling the Zernio client.`,
    );
  }
  return key;
}

async function zernioFetch<T = unknown>(
  path: string,
  init: FetchInit = {},
): Promise<T> {
  const apiKey = getApiKey();
  const url = `${ZERNIO_API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `Zernio API error ${res.status}`;
    try {
      const json = JSON.parse(text) as { message?: string; error?: string };
      if (json.message) message = json.message;
      else if (json.error) message = json.error;
    } catch {
      if (text) message = `${message}: ${text.slice(0, 200)}`;
    }
    throw new ZernioApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export class ZernioApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ZernioApiError";
    this.status = status;
  }
}

// ─── Public surface used by Posty routes ──────────────────────────────────

export type ZernioPlatform = "twitter" | "instagram" | "reddit" | "threads";

export interface ZernioProfile {
  _id: string;
  name: string;
  description?: string;
}

export interface ZernioAccount {
  _id: string;
  platform: string;
  username?: string;
  profilePicture?: string;
  profileId?: string;
}

export interface ZernioPublishResult {
  postId: string;
  status: "published" | "scheduled" | "failed" | "draft";
  platformPostUrl?: string;
  raw?: unknown;
}

/**
 * Create a Zernio profile representing a Posty user. Idempotent at the
 * caller's discretion — Zernio itself does not dedupe, so callers should
 * persist the returned profileId and re-use it (we store it in the
 * `zernioProfiles` collection).
 */
export async function createZernioProfile(params: {
  name: string;
  description?: string;
}): Promise<ZernioProfile> {
  const data = await zernioFetch<{ profile: ZernioProfile } | ZernioProfile>(
    "/profiles",
    {
      method: "POST",
      body: { name: params.name, description: params.description },
    },
  );
  // Tolerate both `{ profile: {...} }` and direct `{...}` shapes.
  return "profile" in (data as { profile?: ZernioProfile })
    ? (data as { profile: ZernioProfile }).profile
    : (data as ZernioProfile);
}

/**
 * Get the OAuth authorization URL for connecting a social account to a
 * profile. The caller redirects the user's browser to `authUrl`; Zernio
 * handles the full OAuth dance with the platform and redirects back to the
 * redirect URI configured on the Zernio dashboard.
 */
export async function getZernioConnectUrl(params: {
  platform: ZernioPlatform;
  profileId: string;
}): Promise<{ authUrl: string }> {
  const query = new URLSearchParams({ profileId: params.profileId });
  const data = await zernioFetch<{ authUrl: string }>(
    `/connect/${params.platform}?${query.toString()}`,
    { method: "GET" },
  );
  return data;
}

/**
 * List accounts connected to a profile. Used after the OAuth callback to
 * resolve which `accountId` belongs to which platform for the just-finished
 * connection.
 */
export async function listZernioAccounts(params: {
  profileId?: string;
}): Promise<ZernioAccount[]> {
  const query = params.profileId
    ? `?${new URLSearchParams({ profileId: params.profileId }).toString()}`
    : "";
  const data = await zernioFetch<
    { accounts: ZernioAccount[] } | ZernioAccount[]
  >(`/accounts${query}`, { method: "GET" });
  if (Array.isArray(data)) return data;
  return data.accounts ?? [];
}

/**
 * Publish a post to one or more connected accounts via Zernio.
 *
 * For X/Twitter: text-only is fine; image attachments via `mediaItems`.
 * For Instagram: caption + at least one image (Instagram does not allow
 * text-only posts).
 *
 * If `scheduledFor` is set, the post is scheduled inside Zernio (NOT inside
 * Posty's own scheduler). For Posty's scheduling pipeline we keep using our
 * Cloud Function and call this with `publishNow=true` when the time comes.
 */
export async function publishViaZernio(params: {
  content: string;
  platform: ZernioPlatform;
  accountId: string;
  mediaItems?: Array<{ type: "image" | "video"; url: string }>;
  scheduledFor?: string; // ISO-8601
  timezone?: string;
  /**
   * Reddit-only: subreddit slug ("entrepreneur", "AskReddit", …, without
   * the leading `r/`) and post title. Both are required for reddit posts.
   */
  reddit?: { subreddit: string; title: string };
}): Promise<ZernioPublishResult> {
  const body: Record<string, unknown> = {
    content: params.content,
    platforms: [{ platform: params.platform, accountId: params.accountId }],
  };

  if (params.mediaItems && params.mediaItems.length > 0) {
    body.mediaItems = params.mediaItems;
  }

  if (params.platform === "reddit" && params.reddit) {
    body.platformSpecificData = {
      reddit: {
        subreddit: params.reddit.subreddit.replace(/^r\//, "").trim(),
        title: params.reddit.title,
      },
    };
  }

  if (params.scheduledFor) {
    body.scheduledFor = params.scheduledFor;
    if (params.timezone) body.timezone = params.timezone;
  } else {
    body.publishNow = true;
  }

  const data = await zernioFetch<{
    post?: {
      _id?: string;
      status?: ZernioPublishResult["status"];
      platforms?: Array<{ platform: string; postUrl?: string; platformPostUrl?: string }>;
    };
  }>("/posts", {
    method: "POST",
    body,
  });

  const post = data.post ?? {};
  const platformResult = post.platforms?.find(
    (p) => p.platform === params.platform,
  );
  return {
    postId: post._id ?? "",
    status: post.status ?? "published",
    platformPostUrl: platformResult?.platformPostUrl ?? platformResult?.postUrl,
    raw: data,
  };
}
