/**
 * Pexels search client.
 *
 * Free tier: 200 requests/hour with an API key. Sign up at
 * https://www.pexels.com/api/, request a key, copy into `.env.local` as
 * `PEXELS_API_KEY=…`.
 *
 * Pexels' search endpoint maps cleanly onto Unsplash's — same query string,
 * same per_page / orientation knobs — so we can swap providers behind the
 * common AssetPhoto shape with a coin flip.
 *
 * Attribution rules are looser than Unsplash but the photographer credit is
 * still recommended (and persisted alongside the generated PNG).
 */

import type { AssetPhoto } from "./unsplash";

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
  };
  alt: string;
}

export async function searchPexels(
  query: string,
  opts?: { orientation?: "square" | "landscape" | "portrait"; perPage?: number }
): Promise<AssetPhoto | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    query,
    per_page: String(Math.max(1, Math.min(80, opts?.perPage ?? 12))),
    orientation: opts?.orientation ?? "square",
  });

  let res: Response;
  try {
    res = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
      headers: { Authorization: key },
      next: { revalidate: 3600 },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let data: { photos?: PexelsPhoto[] };
  try {
    data = await res.json();
  } catch {
    return null;
  }
  const photos = data.photos ?? [];
  if (photos.length === 0) return null;

  const pick = photos[Math.floor(Math.random() * Math.min(photos.length, 8))];

  return {
    url: pick.src.large, // ~1280px wide — plenty for our 1080px canvas
    id: String(pick.id),
    description: pick.alt || query,
    attribution: {
      provider: "pexels",
      photographer: pick.photographer,
      photographerUrl: pick.photographer_url,
      sourceUrl: pick.url,
    },
    averageColorHex: pick.avg_color?.replace(/^#/, "") ?? undefined,
    width: pick.width,
    height: pick.height,
  };
}
