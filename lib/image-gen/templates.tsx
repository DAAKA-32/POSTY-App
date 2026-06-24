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
}: {
  children: React.ReactNode;
  palette: Palette;
}) {
  return (
    <div
      style={{
        width: CANVAS.width,
        height: CANVAS.height,
        display: "flex",
        flexDirection: "column",
        padding: PAD,
        backgroundImage: `linear-gradient(160deg, ${palette.bg} 0%, ${palette.bgEnd} 100%)`,
        // Default body color = palette.text. This is what fixes the dark-text-
        // on-dark-bg bug on the midnight palette: midnight.text is white, the
        // others are near-black, so every palette renders legibly without a
        // per-template branch.
        color: palette.text,
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

// NOTE: BrandMark + top-right Eyebrow tag were removed on purpose. The
// generated visual now has no chrome — no "Posty" badge, no editorial
// uppercase tag in the corner. Cleaner / more pro look, and avoids the
// chrome leaking the SaaS brand onto every published asset.
//
// The AnnouncementCard's centred Eyebrow (used inside the main content
// column, distinct from the corner tag) is kept below — it's editorial
// typography, part of the design, not Posty chrome.
function Eyebrow({ text, palette }: { text: string; palette: Palette }) {
  return (
    <span
      style={{
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: palette.accentText,
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
      {/* No top header row anymore (brand mark + corner eyebrow removed for
          a cleaner look). The stat block fills the canvas vertically. */}
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
            color: palette.accentText,
          }}
        >
          {dsl.stat}
        </span>
        <span
          style={{
            fontSize: 56,
            lineHeight: 1.15,
            fontWeight: 500,
            color: palette.text,
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
            color: palette.textMuted,
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
  // Shorter quotes render bigger so the words truly dominate the card.
  const n = dsl.quote.trim().length;
  const quoteSize = n <= 70 ? 92 : n <= 130 ? 76 : 60;
  return (
    <Frame palette={palette}>
      {/* Top header row removed — no brand badge, no corner eyebrow tag. */}
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
            color: palette.accentText,
            height: 80,
          }}
        >
          “
        </span>
        <span
          style={{
            fontSize: quoteSize,
            lineHeight: 1.1,
            fontWeight: 600,
            letterSpacing: -1.5,
            color: palette.text,
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
            backgroundColor: palette.accentText,
            borderRadius: 4,
          }}
        />
        <span style={{ fontSize: 26, fontWeight: 600, color: palette.text }}>{dsl.attribution}</span>
      </div>
    </Frame>
  );
}

// ─── Announcement Card ──────────────────────────────────────────────────────

function AnnouncementCard(dsl: Extract<ImageDSL, { template: "announcement-card" }>) {
  const palette = ACCENT_PALETTE[dsl.accent];
  return (
    <Frame palette={palette}>
      {/* Top brand badge removed — clean canvas, no Posty chrome. */}
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
            color: palette.text,
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
            color: palette.textMuted,
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
          // chipBg/chipText gives midnight an actual visible CTA pill
          // (light blue-grey on near-black) instead of the previous
          // black-on-black that read as a void.
          backgroundColor: palette.chipBg,
          color: palette.chipText,
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

// ─── Photo Clean ────────────────────────────────────────────────────────────
// The premium DEFAULT. Full-bleed real photo, NO heavy text slab. At most a
// discreet bottom-left caption + tiny eyebrow over a soft scrim. When both are
// empty the photo stands completely alone — the most "real editorial" result.

function PhotoClean(
  dsl: Extract<ImageDSL, { template: "photo-clean" }>,
  photoDataUri: string
) {
  const palette = ACCENT_PALETTE[dsl.accent];
  const hasText = Boolean(dsl.caption || dsl.eyebrow);
  return (
    <div
      style={{
        width: CANVAS.width,
        height: CANVAS.height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: PAD,
        // Only a soft bottom scrim — just enough to keep an optional caption
        // legible without darkening the photo like a poster. When there's no
        // text the scrim is barely perceptible. This is the key difference
        // from photo-hero, whose heavy top-to-bottom gradient screams "card".
        backgroundImage: hasText
          ? `linear-gradient(180deg, rgba(15,17,21,0) 45%, rgba(15,17,21,0.78) 100%), url(${photoDataUri})`
          : `url(${photoDataUri})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#FFFFFF",
        fontFamily: "Inter",
        position: "relative",
      }}
    >
      {hasText && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {dsl.eyebrow && (
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.92)",
                textShadow: "0 1px 8px rgba(0,0,0,0.5)",
              }}
            >
              {dsl.eyebrow}
            </span>
          )}
          {dsl.caption && (
            <span
              style={{
                fontSize: 52,
                lineHeight: 1.18,
                fontWeight: 700,
                color: "#FFFFFF",
                maxWidth: 920,
                textShadow: "0 2px 14px rgba(0,0,0,0.5)",
              }}
            >
              {dsl.caption}
            </span>
          )}
          {/* Thin accent underline — a single subtle brand cue, no chrome. */}
          <div
            style={{
              marginTop: 4,
              width: 64,
              height: 4,
              borderRadius: 4,
              backgroundColor: palette.hard,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Photo Hero ─────────────────────────────────────────────────────────────
// Full-bleed stock photo + dark gradient + editorial headline overlay. The
// photo is passed as a data: URI (pre-resized to 1080² JPEG by the asset
// pipeline) — no external fetch happens at render time.

/**
 * Dynamic headline sizing — the SHORTER the hook, the BIGGER it renders, so a
 * punchy line truly dominates the frame (the whole point of a marketing
 * visual). Longer headlines step down just enough to wrap to ~3 lines without
 * overflowing the canvas. This is the core lever that turns the visual from
 * "a photo with a caption" into "a message on a photo".
 */
function heroHeadlineSize(headline: string): number {
  const n = headline.trim().length;
  if (n <= 22) return 130;
  if (n <= 38) return 104;
  if (n <= 52) return 86;
  return 74;
}

function PhotoHero(
  dsl: Extract<ImageDSL, { template: "photo-hero" }>,
  photoDataUri: string
) {
  const palette = ACCENT_PALETTE[dsl.accent];
  const headline = dsl.headline.trim();
  const headlineSize = heroHeadlineSize(headline);
  return (
    <div
      style={{
        width: CANVAS.width,
        height: CANVAS.height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: PAD,
        // Layer the photo + a STRONG bottom-up dark scrim on the same element so
        // Satori treats them as a single render. Much darker than before at the
        // bottom (0.92) so the headline ALWAYS wins against the photo — even on
        // bright/busy images — while a light top wash keeps the photo readable.
        // Text legibility is non-negotiable; the photo is the support, not the
        // hero.
        backgroundImage: `linear-gradient(180deg, rgba(15,17,21,0.20) 0%, rgba(15,17,21,0.58) 52%, rgba(15,17,21,0.92) 100%), url(${photoDataUri})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#FFFFFF",
        fontFamily: "Inter",
        position: "relative",
      }}
    >
      {/* Bottom-anchored text block — magazine-cover rule: photo subject reads
          up top, the message owns the bottom half. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {/* Brand-color anchor: a filled eyebrow chip when we have a label
            (reads as a marketing tag), otherwise a simple accent slash. Either
            way the brand color is present and the text block feels intentional. */}
        {dsl.eyebrow ? (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              paddingTop: 12,
              paddingBottom: 12,
              paddingLeft: 24,
              paddingRight: 24,
              borderRadius: 999,
              backgroundColor: palette.hard,
              color: "#FFFFFF",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            {dsl.eyebrow}
          </div>
        ) : (
          <div
            style={{
              width: 96,
              height: 8,
              borderRadius: 8,
              backgroundColor: palette.hard,
            }}
          />
        )}
        <span
          style={{
            fontSize: headlineSize,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: -2,
            color: "#FFFFFF",
            maxWidth: 952,
            // Strong shadow so the headline stays crisp even where a bright
            // patch of photo bleeds through the scrim.
            textShadow: "0 2px 24px rgba(0,0,0,0.55)",
          }}
        >
          {headline}
        </span>
        {dsl.body && (
          <span
            style={{
              fontSize: 38,
              lineHeight: 1.3,
              fontWeight: 600,
              color: "rgba(255,255,255,0.94)",
              maxWidth: 920,
              textShadow: "0 1px 12px rgba(0,0,0,0.5)",
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
    case "photo-clean":
      // No photo landed (rare: both providers missed). Degrade to an editorial
      // quote-card built from whatever copy we have, rather than a broken
      // render. We prefer quote-card over announcement here because photo-clean
      // has no CTA — a quote reads cleaner with just a caption + brand.
      if (!extras.photoDataUri) {
        const text = (dsl.caption || dsl.eyebrow || "").trim();
        const fallback = {
          template: "quote-card" as const,
          accent: dsl.accent,
          brand: dsl.brand,
          quote: text.length >= 8 ? text : (dsl.brand || "Posty"),
          attribution: dsl.brand || "Posty",
          eyebrow: dsl.eyebrow,
        };
        return QuoteCard(fallback);
      }
      return PhotoClean(dsl, extras.photoDataUri);
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
