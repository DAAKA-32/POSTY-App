/* eslint-disable react/no-unknown-property */
/**
 * Satori templates. Each export receives a validated DSL object and returns
 * a JSX tree built from divs + spans only — Satori's supported subset.
 *
 * Constraints worth remembering when editing these:
 *  - No CSS variables, no Tailwind, no shorthand `border`. Satori reads
 *    inline `style` objects and rejects custom properties.
 *  - Flex layouts must specify `display: "flex"` explicitly.
 *  - Every text node larger than its parent needs an explicit `lineClamp`
 *    or it'll overflow the 1080×1080 canvas.
 *  - Gradients work via `backgroundImage` (linear-gradient strings).
 *
 * The canvas is square (1080×1080). We design for a 64px outer padding so
 * the visual reads as a framed card whatever client crops it.
 */

import { ACCENT_PALETTE, type ImageDSL } from "./dsl";

export const CANVAS = { width: 1080, height: 1080 } as const;

const PAD = 64;

type Palette = (typeof ACCENT_PALETTE)[keyof typeof ACCENT_PALETTE];

function Frame({
  children,
  palette,
  variant = "soft",
}: {
  children: React.ReactNode;
  palette: Palette;
  variant?: "soft" | "hard";
}) {
  const isHard = variant === "hard";
  return (
    <div
      style={{
        width: CANVAS.width,
        height: CANVAS.height,
        display: "flex",
        flexDirection: "column",
        padding: PAD,
        backgroundImage: isHard
          ? `linear-gradient(135deg, ${palette.bg} 0%, ${palette.bgEnd} 100%)`
          : `linear-gradient(160deg, ${palette.bg} 0%, ${palette.bgEnd} 100%)`,
        color: isHard ? palette.on : "#1A1D21",
        fontFamily: "Inter",
        position: "relative",
      }}
    >
      {/* Soft decorative blob, top-right — adds depth without distracting */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 520,
          height: 520,
          borderRadius: 520,
          backgroundImage: `radial-gradient(circle at 30% 30%, ${palette.soft}cc 0%, ${palette.soft}00 70%)`,
        }}
      />
      {children}
    </div>
  );
}

function BrandMark({ brand, palette }: { brand: string; palette: Palette }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundImage: `linear-gradient(135deg, ${palette.hard} 0%, ${palette.soft} 100%)`,
          display: "flex",
        }}
      />
      <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.2 }}>{brand}</span>
    </div>
  );
}

function Eyebrow({ text, palette }: { text: string; palette: Palette }) {
  return (
    <span
      style={{
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: palette.hard,
      }}
    >
      {text}
    </span>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard(dsl: Extract<ImageDSL, { template: "kpi-card" }>) {
  const palette = ACCENT_PALETTE[dsl.accent];
  return (
    <Frame palette={palette}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark brand={dsl.brand} palette={palette} />
        <span style={{ fontSize: 18, color: "#6B7280", letterSpacing: 1 }}>
          {dsl.eyebrow.toUpperCase()}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <span
          style={{
            fontSize: 280,
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: -8,
            color: palette.hard,
          }}
        >
          {dsl.stat}
        </span>
        <span
          style={{
            fontSize: 56,
            lineHeight: 1.15,
            fontWeight: 500,
            color: "#1A1D21",
            maxWidth: 880,
          }}
        >
          {dsl.statLabel}
        </span>
      </div>

      {dsl.footer && (
        <span
          style={{
            fontSize: 22,
            color: "#6B7280",
            fontWeight: 500,
          }}
        >
          {dsl.footer}
        </span>
      )}
    </Frame>
  );
}

// ─── Quote Card ─────────────────────────────────────────────────────────────

function QuoteCard(dsl: Extract<ImageDSL, { template: "quote-card" }>) {
  const palette = ACCENT_PALETTE[dsl.accent];
  return (
    <Frame palette={palette}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark brand={dsl.brand} palette={palette} />
        {dsl.eyebrow && (
          <span style={{ fontSize: 18, color: "#6B7280", letterSpacing: 1 }}>
            {dsl.eyebrow.toUpperCase()}
          </span>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 36,
        }}
      >
        <span
          style={{
            fontSize: 180,
            lineHeight: 0.9,
            fontWeight: 800,
            color: palette.hard,
            height: 80,
          }}
        >
          “
        </span>
        <span
          style={{
            fontSize: 72,
            lineHeight: 1.1,
            fontWeight: 600,
            letterSpacing: -1.5,
            color: "#1A1D21",
            maxWidth: 920,
          }}
        >
          {dsl.quote}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 4,
            backgroundColor: palette.hard,
            borderRadius: 4,
          }}
        />
        <span style={{ fontSize: 26, fontWeight: 600, color: "#1A1D21" }}>{dsl.attribution}</span>
      </div>
    </Frame>
  );
}

// ─── Announcement Card ──────────────────────────────────────────────────────

function AnnouncementCard(dsl: Extract<ImageDSL, { template: "announcement-card" }>) {
  const palette = ACCENT_PALETTE[dsl.accent];
  return (
    <Frame palette={palette}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark brand={dsl.brand} palette={palette} />
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 32,
        }}
      >
        {dsl.eyebrow && <Eyebrow text={dsl.eyebrow} palette={palette} />}
        <span
          style={{
            fontSize: 108,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: -3,
            color: "#1A1D21",
            maxWidth: 940,
          }}
        >
          {dsl.headline}
        </span>
        <span
          style={{
            fontSize: 40,
            lineHeight: 1.3,
            fontWeight: 400,
            color: "#3F434A",
            maxWidth: 880,
          }}
        >
          {dsl.body}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignSelf: "flex-start",
          paddingTop: 18,
          paddingBottom: 18,
          paddingLeft: 28,
          paddingRight: 28,
          borderRadius: 999,
          backgroundColor: palette.hard,
          color: palette.on,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: 0.2,
        }}
      >
        {dsl.cta}
      </div>
    </Frame>
  );
}

// ─── Photo Hero ─────────────────────────────────────────────────────────────
// Full-bleed stock photo + dark gradient + bold headline overlay. The photo
// is passed as a data: URI (pre-resized to 1080² JPEG by the asset pipeline)
// — no external fetch happens at render time.

function PhotoHero(
  dsl: Extract<ImageDSL, { template: "photo-hero" }>,
  photoDataUri: string
) {
  const palette = ACCENT_PALETTE[dsl.accent];
  return (
    <div
      style={{
        width: CANVAS.width,
        height: CANVAS.height,
        display: "flex",
        flexDirection: "column",
        padding: PAD,
        // Layer the photo + a bottom-up dark gradient on the same element so
        // Satori treats them as a single render — easier than nesting and
        // keeps text contrast guaranteed even on very bright photos.
        backgroundImage: `linear-gradient(180deg, rgba(15,17,21,0.10) 0%, rgba(15,17,21,0.45) 55%, rgba(15,17,21,0.88) 100%), url(${photoDataUri})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#FFFFFF",
        fontFamily: "Inter",
        position: "relative",
      }}
    >
      {/* No top chrome — brand mark and eyebrow stripped on purpose so the
          photo carries the full visual weight. Headline anchors the bottom. */}

      {/* Spacer pushes the headline to the bottom third — same layout rule
          as a magazine cover. Photo gets the upper 2/3 of visual weight. */}
      <div style={{ flex: 1, display: "flex" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Accent bar — a hard color slash that anchors the text block to the
            brand palette. Without it the overlay feels generic. */}
        <div
          style={{
            width: 80,
            height: 6,
            borderRadius: 6,
            backgroundColor: palette.hard,
          }}
        />
        <span
          style={{
            fontSize: 92,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: -2.5,
            color: "#FFFFFF",
            maxWidth: 960,
            // Subtle text-shadow so headlines stay legible on photos that
            // sneak through the gradient (warm beige offices, snow, etc.).
            textShadow: "0 2px 16px rgba(0,0,0,0.35)",
          }}
        >
          {dsl.headline}
        </span>
        {dsl.body && (
          <span
            style={{
              fontSize: 32,
              lineHeight: 1.35,
              fontWeight: 500,
              color: "rgba(255,255,255,0.92)",
              maxWidth: 900,
              textShadow: "0 1px 8px rgba(0,0,0,0.28)",
            }}
          >
            {dsl.body}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────
// `extras.photoDataUri` is only consumed by photo-hero. The other templates
// ignore it — keeps the dispatcher signature consistent without a wider
// per-template options bag.

export interface RenderExtras {
  photoDataUri?: string;
}

export function renderTemplate(dsl: ImageDSL, extras: RenderExtras = {}): React.ReactNode {
  switch (dsl.template) {
    case "kpi-card":
      return KpiCard(dsl);
    case "quote-card":
      return QuoteCard(dsl);
    case "announcement-card":
      return AnnouncementCard(dsl);
    case "photo-hero":
      // Fall back to AnnouncementCard if no photo was fetched — the AI's
      // copy is still good, we just lose the photo background. Better than
      // a broken render.
      if (!extras.photoDataUri) {
        const fallback = {
          template: "announcement-card" as const,
          accent: dsl.accent,
          brand: dsl.brand,
          headline: dsl.headline,
          body: dsl.body ?? "Posty",
          cta: "Posty",
          eyebrow: dsl.eyebrow,
        };
        return AnnouncementCard(fallback);
      }
      return PhotoHero(dsl, extras.photoDataUri);
  }
}
