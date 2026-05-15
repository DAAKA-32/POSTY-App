/**
 * Unsplash search client.
 *
 * Free tier: 50 requests/hour with an Access Key (no secret needed for search).
 * Sign up at https://unsplash.com/developers, create an app, copy the Access
 * Key into `.env.local` as `UNSPLASH_ACCESS_KEY=…`.
 *
 * We deliberately use the SEARCH endpoint, not the random endpoint — search
 * gives us topical relevance (the AI passes a query like "startup office
 * modern") which matters more than novelty for marketing visuals.
 *
 * Each return carries an `attribution` payload that callers MUST persist /
 * display per Unsplash API guidelines (photographer name + utm-tracked
 * profile + utm-tracked Unsplash link). Posty stores the attribution on the
 * generated PNG's parent post so it can be surfaced in the publish flow.
 */

export interface AssetPhoto {
  /** Direct URL to download the photo bytes (CDN, hot-linkable). */
  url: string;
  /** Provider-assigned ID — used as a cache key. */
  id: string;
  /** Human description of what's in the photo (alt text). */
  description: string;
  /** Photographer / source attribution metadata. */
  attribution: {
    provider: "unsplash" | "pexels";
    photographer: string;
    photographerUrl: string;
    sourceUrl: string;
  };
  /** Average colour reported by the provider — handy for graceful loading
   *  states or text-contrast decisions. Hex without leading "#". */
  averageColorHex?: string;
  width: number;
  height: number;
}

interface UnsplashPhoto {
  id: string;
  description: string | null;
  alt_description: string | null;
  urls: { regular: string; full: string };
  width: number;
  height: number;
  color: string | null;
  user: { name: string; username: string };
  links: { html: string };
}

const UNSPLASH_UTM = "utm_source=posty&utm_medium=referral";

/**
 * Search Unsplash for a photo matching the query. Returns null when the API
 * key is missing OR when nothing matches OR when the API errors — the caller
 * falls back to another provider or to the code-only template pipeline.
 *
 * `orientation` defaults to "squarish" because Posty's visuals are 1080×1080;
 * passing this constrains the result set to photos that crop cleanly to a
 * square without losing the subject.
 */
export async function searchUnsplash(
  query: string,
  opts?: { orientation?: "squarish" | "landscape" | "portrait"; perPage?: number }
): Promise<AssetPhoto | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    query,
    per_page: String(Math.max(1, Math.min(30, opts?.perPage ?? 12))),
    orientation: opts?.orientation ?? "squarish",
    content_filter: "high",
  });

  let res: Response;
  try {
    res = await fetch(`https://api.unsplash.com/search/photos?${params.toString()}`, {
      headers: {
        Authorization: `Client-ID ${key}`,
        "Accept-Version": "v1",
      },
      // Cache for an hour — repeat searches for "startup office" don't need
      // a fresh API call every time and the Unsplash content barely changes.
      next: { revalidate: 3600 },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let data: { results?: UnsplashPhoto[] };
  try {
    data = await res.json();
  } catch {
    return null;
  }
  const results = data.results ?? [];
  if (results.length === 0) return null;

  // Pick a random photo from the top results — same query never returns the
  // same image twice in a row, which kills the "all my Posty visuals look
  // identical" feeling.
  const pick = results[Math.floor(Math.random() * Math.min(results.length, 8))];

  return {
    url: pick.urls.regular,
    id: pick.id,
    description: pick.alt_description || pick.description || query,
    attribution: {
      provider: "unsplash",
      photographer: pick.user.name,
      photographerUrl: `https://unsplash.com/@${pick.user.username}?${UNSPLASH_UTM}`,
      sourceUrl: `${pick.links.html}?${UNSPLASH_UTM}`,
    },
    averageColorHex: pick.color?.replace(/^#/, "") ?? undefined,
    width: pick.width,
    height: pick.height,
  };
}
