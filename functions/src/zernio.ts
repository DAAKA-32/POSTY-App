// Cloud Functions copy of the publish-side of lib/integrations/zernio.ts.
//
// We only port `publishViaZernio` here — the OAuth / profile / accounts
// management all lives in Next.js routes (Cloud Functions never run those).
// Keep the request shape in sync with the Next.js version.

const ZERNIO_API_BASE = "https://zernio.com/api/v1";

function getApiKey(): string {
  // Trim defensively: a stray BOM / newline / whitespace in the env value
  // corrupts the "Authorization: Bearer <key>" header (ByteString error).
  const key = process.env.ZERNIO_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "ZERNIO_API_KEY env var is missing in Cloud Functions. Set it in the Functions runtime env and redeploy.",
    );
  }
  return key;
}

export type ZernioFunctionsPlatform = "twitter" | "instagram" | "reddit" | "threads";

export interface ZernioFunctionsPublishResult {
  success: boolean;
  postId?: string;
  publishedUrl?: string;
  error?: string;
}

export async function publishViaZernio(params: {
  content: string;
  platform: ZernioFunctionsPlatform;
  accountId: string;
  mediaItems?: Array<{ type: "image" | "video"; url: string }>;
  reddit?: { subreddit: string; title: string };
}): Promise<ZernioFunctionsPublishResult> {
  const body: Record<string, unknown> = {
    content: params.content,
    publishNow: true,
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

  try {
    const res = await fetch(`${ZERNIO_API_BASE}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
      return { success: false, error: message };
    }

    const data = (await res.json()) as {
      post?: {
        _id?: string;
        status?: string;
        platforms?: Array<{ platform: string; postUrl?: string; platformPostUrl?: string }>;
      };
    };
    const post = data.post ?? {};
    const platformResult = post.platforms?.find((p) => p.platform === params.platform);
    return {
      success: true,
      postId: post._id ?? "",
      publishedUrl: platformResult?.platformPostUrl ?? platformResult?.postUrl,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Zernio publish failed",
    };
  }
}
