/**
 * Render pipeline: DSL → Satori (SVG) → resvg-wasm (PNG buffer).
 *
 * Runs in a Node.js API route. Satori is a pure JS layout engine; resvg-wasm
 * is the WebAssembly build of resvg — no platform-specific native binary,
 * works identically on Windows dev and Linux prod (Vercel). Total render
 * time at 1080² ≈ 200-500ms after the first warm-up.
 *
 * Fonts are fetched once per cold start from Google's CDN and cached in
 * module-level memory. We ship Inter Regular + SemiBold + Bold — Satori
 * needs the actual TTF/OTF buffer, not a font-family string.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { renderTemplate, CANVAS } from "./templates";
import type { ImageDSL } from "./dsl";
import { findPhoto, fetchPhotoBytes, photoToDataUri, type AssetPhoto } from "./assets";

// ─── WASM init ──────────────────────────────────────────────────────────────
// `initWasm` is idempotent in spirit but throws if called twice — we guard
// with a module-level flag + an in-flight promise so concurrent requests
// during a cold start share the same init.

let wasmReady = false;
let wasmInitPromise: Promise<void> | null = null;

async function ensureWasm(): Promise<void> {
  if (wasmReady) return;
  if (wasmInitPromise) return wasmInitPromise;
  wasmInitPromise = (async () => {
    const wasmPath = path.join(
      process.cwd(),
      "node_modules",
      "@resvg",
      "resvg-wasm",
      "index_bg.wasm"
    );
    const buffer = readFileSync(wasmPath);
    await initWasm(buffer);
    wasmReady = true;
  })();
  return wasmInitPromise;
}

// ─── Font loader ────────────────────────────────────────────────────────────
// Inter OTFs are bundled under public/fonts/inter/ (see scripts/download-fonts.mjs).
// Reading from disk avoids a network round-trip on every cold start and removes
// any runtime dependency on a third-party CDN. The buffers are cached for the
// process lifetime — Vercel re-warms them on cold start, which is acceptable.

interface SatoriFont {
  name: string;
  data: Buffer;
  weight: 400 | 600 | 800;
  style: "normal";
}

let cachedFonts: SatoriFont[] | null = null;

const FONT_FILES: Array<{ weight: 400 | 600 | 800; file: string }> = [
  { weight: 400, file: "Inter-Regular.otf" },
  { weight: 600, file: "Inter-SemiBold.otf" },
  { weight: 800, file: "Inter-Black.otf" },
];

function loadFontsOnce(): SatoriFont[] {
  if (cachedFonts) return cachedFonts;
  const fontDir = path.join(process.cwd(), "public", "fonts", "inter");
  cachedFonts = FONT_FILES.map(({ weight, file }) => ({
    name: "Inter",
    data: readFileSync(path.join(fontDir, file)),
    weight,
    style: "normal" as const,
  }));
  return cachedFonts;
}

// ─── Render entry point ─────────────────────────────────────────────────────

export interface RenderResult {
  png: Buffer;
  width: number;
  height: number;
  /** Set when the DSL was `photo-hero` AND a real photo landed. Persisted
   *  alongside the upload so the publish flow can surface the credit
   *  (Unsplash's API guidelines require photographer attribution). */
  attribution?: AssetPhoto["attribution"];
}

export async function renderDSL(dsl: ImageDSL): Promise<RenderResult> {
  await ensureWasm();
  const fonts = loadFontsOnce();

  // Photo-hero needs an actual asset before we touch Satori. Failures here
  // are non-fatal — renderTemplate falls back to AnnouncementCard with the
  // same copy when no photo lands, so the user always gets something.
  let photoDataUri: string | undefined;
  let attribution: AssetPhoto["attribution"] | undefined;
  if (dsl.template === "photo-hero") {
    try {
      const photo = await findPhoto(dsl.searchQuery);
      if (photo) {
        const bytes = await fetchPhotoBytes(photo);
        if (bytes) {
          photoDataUri = photoToDataUri(bytes);
          attribution = photo.attribution;
        }
      }
    } catch (err) {
      console.warn("[image-gen/render] photo fetch failed (falling back):", err);
    }
  }

  // Satori wants a `ReactNode` shaped like JSX; our renderTemplate produces
  // one without going through React.createElement explicitly (the .tsx file
  // is compiled by Next, so JSX → React.createElement happens at build time).
  const svg = await satori(
    renderTemplate(dsl, { photoDataUri }) as React.ReactElement,
    {
      width: CANVAS.width,
      height: CANVAS.height,
      fonts,
    }
  );

  // resvg-wasm shares the same Resvg API as the native package — render at
  // the target width for a clean 1:1 raster (no upscaling artefacts).
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: CANVAS.width },
    font: { loadSystemFonts: false }, // we already passed our own fonts to Satori
  });
  const pngData = resvg.render().asPng();

  return {
    png: Buffer.from(pngData),
    width: CANVAS.width,
    height: CANVAS.height,
    attribution,
  };
}
