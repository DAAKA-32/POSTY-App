// Cloud Functions copy of the publish-side of lib/integrations/zernio.ts.
//
// Only the publish request is ported — OAuth / profile / account management
// lives in Next.js routes (Cloud Functions never run those). Keep the request
// shape in sync with the Next.js version. HTTP + error classification live in
// `scheduler/publishers/zernio.ts`.

export const ZERNIO_API_BASE = "https://zernio.com/api/v1";

/** Trimmed defensively: a stray BOM / newline corrupts the Bearer header. */
export function getZernioApiKey(): string | null {
  const key = process.env.ZERNIO_API_KEY?.trim();
  return key ? key : null;
}

export type ZernioFunctionsPlatform = "twitter" | "instagram" | "reddit" | "threads";

export function buildZernioPostBody(params: {
  content: string;
  platform: ZernioFunctionsPlatform;
  accountId: string;
  mediaItems?: Array<{ type: "image" | "video"; url: string }>;
  reddit?: { subreddit: string; title: string };
}): Record<string, unknown> {
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
  return body;
}
