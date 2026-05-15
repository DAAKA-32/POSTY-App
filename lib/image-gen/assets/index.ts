/**
 * Provider-agnostic asset orchestrator.
 *
 * `findPhoto(query)` picks a provider (random of those with keys configured),
 * tries it, and falls back to the other if the first returned nothing. When
 * neither is available — or both miss — it returns null and the rendering
 * pipeline falls back to the original code-only Satori templates.
 *
 * `fetchPhotoBytes(photo)` downloads the photo and resizes it to fit Posty's
 * 1080×1080 canvas, applying sharp's `cover` strategy (centre-crop, no
 * letterboxing) and re-encoding to JPEG-80. The resulting buffer is ~80-160 KB
 * — small enough to base64-inline into a Satori-generated SVG without blowing
 * out the resvg-wasm allocation budget.
 */

import sharp from "sharp";
import type { AssetPhoto } from "./unsplash";
import { searchUnsplash } from "./unsplash";
import { searchPexels } from "./pexels";

export type { AssetPhoto };

const TARGET_SIZE = 1080;
const JPEG_QUALITY = 82;

/** Returns whether AT LEAST one provider key is configured. Cheap synchronous
 *  check used by the prompt builder to decide whether to suggest the
 *  photo-hero template to the AI. */
export function hasAnyAssetProvider(): boolean {
  return Boolean(process.env.UNSPLASH_ACCESS_KEY || process.env.PEXELS_API_KEY);
}

/**
 * Search both providers in priority order (random coin flip on which one
 * first) and return the first hit. Honours both keys when present — never
 * silently picks just one.
 */
export async function findPhoto(query: string): Promise<AssetPhoto | null> {
  const hasUnsplash = !!process.env.UNSPLASH_ACCESS_KEY;
  const hasPexels = !!process.env.PEXELS_API_KEY;
  if (!hasUnsplash && !hasPexels) return null;

  const trimmedQuery = query.trim().slice(0, 100);
  if (trimmedQuery.length === 0) return null;

  // Coin flip provider order so the same query doesn't always hit the same
  // source — more variety across regenerations.
  const tryOrder: Array<() => Promise<AssetPhoto | null>> = [];
  if (hasUnsplash) tryOrder.push(() => searchUnsplash(trimmedQuery));
  if (hasPexels) tryOrder.push(() => searchPexels(trimmedQuery));
  if (Math.random() < 0.5) tryOrder.reverse();

  for (const provider of tryOrder) {
    const hit = await provider();
    if (hit) return hit;
  }
  return null;
}

/**
 * Download + resize + JPEG-encode. The square-cover output is exactly what
 * the Satori PhotoHero template expects to render as a full-bleed background.
 */
export async function fetchPhotoBytes(photo: AssetPhoto): Promise<Buffer | null> {
  let res: Response;
  try {
    res = await fetch(photo.url, {
      headers: { Accept: "image/*" },
      next: { revalidate: 86400 }, // 24h CDN cache — same photo URL = same bytes
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());

  try {
    return await sharp(buf)
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: "cover", position: "centre" })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    console.warn("[image-gen/assets] sharp resize failed:", err);
    return null;
  }
}

/** Convert a resized photo buffer to a data: URI that Satori can use as a
 *  CSS `backgroundImage` value. resvg-wasm rasterises data: URIs directly,
 *  no external fetch at render time. */
export function photoToDataUri(buf: Buffer): string {
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}
