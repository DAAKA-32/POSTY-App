"use client";

/**
 * StrategistAvatar — the Strategist's identity (human portrait).
 *
 * Displays the human portrait at `/strategist/avatar-portrait.png` (generated
 * via `npm run generate-strategist-avatar-portrait`). If the portrait file
 * doesn't exist yet, the fallback **Strategist Mark** (sparkle SVG) renders
 * underneath — so the avatar is always visible, never broken.
 *
 * Layered approach:
 *   - Sparkle SVG sits underneath as background (always rendered)
 *   - Portrait `<img>` overlays on top via absolute positioning
 *   - On image error → onError hides the img, sparkle stays visible
 *   - When the portrait loads → it covers the sparkle
 *
 * Sizes: sm 24, md 28, lg 32, xl 36, xxl 52 (FAB).
 *
 * Legacy `withHalo` and `breathing` props are accepted for API compat but
 * are no-ops in the sober design.
 */

interface Props {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
  withHalo?: boolean; // legacy — ignored
  breathing?: boolean; // legacy — ignored
  className?: string;
}

const SIZE_MAP: Record<NonNullable<Props["size"]>, number> = {
  xs: 16, // tooltip / inline pill
  sm: 24,
  md: 28,
  lg: 32,
  xl: 36,
  xxl: 52, // FAB
};

const PORTRAIT_SRC = "/strategist/avatar-portrait.png";

export default function StrategistAvatar({ size = "sm", className = "" }: Props) {
  const px = SIZE_MAP[size];

  return (
    <span
      className={`relative inline-block flex-shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: px, height: px }}
      aria-hidden
    >
      {/* Fallback — Strategist Mark sparkle, always rendered behind the photo.
          Visible until the user runs `npm run generate-strategist-avatar-portrait`.
          Once the portrait exists, the <img> on top covers it entirely. */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="32" cy="32" r="32" className="fill-amber-100 dark:fill-gray-800" />
        <circle
          cx="32"
          cy="32"
          r="31.5"
          fill="none"
          strokeWidth="0.7"
          className="stroke-amber-200/80 dark:stroke-gray-700"
        />
        <path
          d="M 32 13 L 33.5 30.5 L 51 32 L 33.5 33.5 L 32 51 L 30.5 33.5 L 13 32 L 30.5 30.5 Z"
          className="fill-amber-600 dark:fill-amber-400"
        />
        <path
          d="M 47 17 L 47.7 20 L 50.7 20.7 L 47.7 21.4 L 47 24.4 L 46.3 21.4 L 43.3 20.7 L 46.3 20 Z"
          opacity="0.85"
          className="fill-amber-500"
        />
      </svg>

      {/* Portrait overlay — covers the sparkle when loaded, hides on error */}
      <img
        src={PORTRAIT_SRC}
        alt=""
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          // Portrait file missing → hide the img so the sparkle SVG shows through.
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </span>
  );
}
