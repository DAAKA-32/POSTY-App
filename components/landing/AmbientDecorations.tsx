"use client";

/**
 * AmbientDecorations — reusable, low-stakes decorative motion layer.
 *
 * Designed to sit absolutely behind a section's content (`-z-[1]`,
 * `pointer-events-none`) and add subtle depth without competing with
 * primary copy or interaction elements.
 *
 * Variants compose freely (`variant={["orbs", "dots"]}`):
 *   - orbs   → 2 large diffuse halos that breathe in/out
 *   - dots   → 8 small particles fading + drifting on long loops
 *   - arrows → 2 hairline chevrons drifting horizontally (corner accents)
 *   - waves  → 1 SVG curve drawn once on scroll, then static
 *
 * All motion respects `useReducedMotion` (renders static positions only).
 * Mobile (<sm) hides high-density decorations to keep the GPU cool.
 */

import { motion, useReducedMotion } from "framer-motion";

const ACCENT = "#F8935D";
const ACCENT_DEEP = "#F76B54";

type Variant = "orbs" | "dots" | "arrows" | "waves";

interface AmbientDecorationsProps {
  /** One or several decoration types to overlay */
  variant?: Variant | Variant[];
  /** Tint intensity baseline (0–1). Default 1 = standard subtlety. */
  intensity?: number;
}

export function AmbientDecorations({
  variant = "orbs",
  intensity = 1,
}: AmbientDecorationsProps) {
  const reduced = useReducedMotion();
  const variants = Array.isArray(variant) ? variant : [variant];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden -z-[1]"
    >
      {variants.includes("orbs") && (
        <FloatingOrbs reduced={!!reduced} intensity={intensity} />
      )}
      {variants.includes("dots") && (
        <FloatingDots reduced={!!reduced} intensity={intensity} />
      )}
      {variants.includes("arrows") && (
        <DriftingArrows reduced={!!reduced} intensity={intensity} />
      )}
      {variants.includes("waves") && (
        <WavyLines reduced={!!reduced} intensity={intensity} />
      )}
    </div>
  );
}

/* ──────────────────────── FloatingOrbs ──────────────────────── */
/**
 * Two large blurred circles that breathe (scale + opacity) on long loops.
 * On mobile, they go static (no animation) but stay visible.
 */
function FloatingOrbs({
  reduced,
  intensity,
}: {
  reduced: boolean;
  intensity: number;
}) {
  const baseOpacity = 0.06 * intensity;
  return (
    <>
      <motion.div
        className="absolute top-[-10%] right-[-8%] w-[34rem] h-[34rem] rounded-full"
        style={{
          background: `radial-gradient(circle, ${ACCENT}, transparent 70%)`,
          filter: "blur(80px)",
        }}
        initial={{ opacity: baseOpacity, scale: 1 }}
        animate={
          reduced
            ? {}
            : {
                opacity: [baseOpacity, baseOpacity * 1.6, baseOpacity],
                scale: [1, 1.08, 1],
              }
        }
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-12%] left-[-6%] w-[28rem] h-[28rem] rounded-full hidden sm:block"
        style={{
          background: `radial-gradient(circle, ${ACCENT_DEEP}, transparent 70%)`,
          filter: "blur(70px)",
        }}
        initial={{ opacity: baseOpacity * 0.8, scale: 1 }}
        animate={
          reduced
            ? {}
            : {
                opacity: [baseOpacity * 0.8, baseOpacity * 1.3, baseOpacity * 0.8],
                scale: [1, 1.1, 1],
              }
        }
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />
    </>
  );
}

/* ──────────────────────── FloatingDots ──────────────────────── */
/**
 * 8 small particles scattered across the section. Each drifts ±20px on
 * long, desynchronized loops so the whole field reads as ambient flicker
 * rather than synchronized motion.
 */
const DOT_POSITIONS = [
  { top: "12%", left: "8%", size: 4, delay: 0 },
  { top: "28%", left: "92%", size: 3, delay: 1.5 },
  { top: "55%", left: "4%", size: 5, delay: 3 },
  { top: "76%", left: "88%", size: 4, delay: 4.5 },
  { top: "18%", left: "62%", size: 3, delay: 6 },
  { top: "45%", left: "44%", size: 4, delay: 2 },
  { top: "82%", left: "30%", size: 3, delay: 5 },
  { top: "8%", left: "38%", size: 5, delay: 3.5 },
] as const;

function FloatingDots({
  reduced,
  intensity,
}: {
  reduced: boolean;
  intensity: number;
}) {
  return (
    <>
      {DOT_POSITIONS.map((dot, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${i > 4 ? "hidden sm:block" : ""}`}
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            backgroundColor: ACCENT,
            opacity: 0.18 * intensity,
            filter: "blur(0.5px)",
          }}
          animate={
            reduced
              ? {}
              : {
                  y: [-12, 12, -12],
                  opacity: [
                    0.10 * intensity,
                    0.28 * intensity,
                    0.10 * intensity,
                  ],
                }
          }
          transition={{
            duration: 10 + (i % 3) * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: dot.delay,
          }}
        />
      ))}
    </>
  );
}

/* ──────────────────────── DriftingArrows ──────────────────────── */
/**
 * Two hairline chevrons drifting horizontally — corner accents that nod
 * to the page's "forward motion / next step" vocabulary. Hidden on mobile
 * because they read as noise at small widths.
 */
function DriftingArrows({
  reduced,
  intensity,
}: {
  reduced: boolean;
  intensity: number;
}) {
  return (
    <>
      <motion.svg
        className="hidden md:block absolute"
        style={{
          top: "18%",
          left: "6%",
          opacity: 0.20 * intensity,
          color: ACCENT,
        }}
        width="44"
        height="44"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.2}
        animate={reduced ? {} : { x: [-4, 6, -4], rotate: [0, 4, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5l7 7-7 7"
        />
      </motion.svg>
      <motion.svg
        className="hidden md:block absolute"
        style={{
          bottom: "20%",
          right: "5%",
          opacity: 0.16 * intensity,
          color: ACCENT_DEEP,
        }}
        width="56"
        height="56"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1}
        animate={reduced ? {} : { x: [4, -6, 4], rotate: [0, -3, 0] }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 7l5 5m0 0l-5 5m5-5H6"
        />
      </motion.svg>
    </>
  );
}

/* ──────────────────────── WavyLines ──────────────────────── */
/**
 * One large SVG curve drawn once when the section enters the viewport.
 * Acts as a structural decoration (think Stripe / Vercel section accents)
 * without any continuous motion to keep the eye comfortable.
 */
function WavyLines({
  reduced,
  intensity,
}: {
  reduced: boolean;
  intensity: number;
}) {
  return (
    <svg
      className="absolute inset-0 w-full h-full hidden sm:block"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <defs>
        <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0" />
          <stop
            offset="50%"
            stopColor={ACCENT}
            stopOpacity={0.35 * intensity}
          />
          <stop offset="100%" stopColor={ACCENT_DEEP} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d="M -5 70 C 25 50, 50 90, 75 60 S 105 40, 110 50"
        stroke="url(#wave-grad)"
        strokeWidth={0.4}
        fill="none"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: reduced ? 1 : 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}
