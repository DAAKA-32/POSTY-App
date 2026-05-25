/**
 * StrategistMark — the canonical Strategist icon (sparkle/diamond glyph).
 *
 * Single source of truth for the Strategist's visual identity. EVERY surface
 * that references the Strategist (drawer header, FAB, dropdown row, batch
 * cards, banners, settings) must render this component instead of an ad-hoc
 * lucide `<Sparkles />` or an inline SVG — otherwise the brand drifts.
 *
 * Visual: amber diamond + secondary mini-sparkle, matching the fallback
 * inside `StrategistAvatar` so the icon-only contexts read as the same
 * identity as the avatar-with-portrait contexts.
 *
 * Sizing: pass any Tailwind `w-X h-X` via `className` — the SVG fills its
 * container, no fixed dimensions. Color is `currentColor` for primary fill
 * and `currentColor/85` for the secondary sparkle, so callers can re-tint
 * via the parent's text color (`text-amber-600`, etc.).
 */

interface Props {
  className?: string;
  /** When true (default), render the secondary mini-sparkle in the corner.
   *  Disable for very small sizes where the corner sparkle reads as noise. */
  withSecondarySparkle?: boolean;
}

export default function StrategistMark({
  className = "w-4 h-4",
  withSecondarySparkle = true,
}: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      {/* Primary diamond — the spine of the mark. Same path as the fallback
          inside StrategistAvatar to keep the two visually unified. */}
      <path d="M 32 13 L 33.5 30.5 L 51 32 L 33.5 33.5 L 32 51 L 30.5 33.5 L 13 32 L 30.5 30.5 Z" />
      {withSecondarySparkle && (
        <path
          d="M 47 17 L 47.7 20 L 50.7 20.7 L 47.7 21.4 L 47 24.4 L 46.3 21.4 L 43.3 20.7 L 46.3 20 Z"
          opacity="0.85"
        />
      )}
    </svg>
  );
}
