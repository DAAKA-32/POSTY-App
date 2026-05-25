"use client";

/**
 * LandingAmbientCanvas — page-wide atmospheric layer for the landing.
 *
 * Cycles through the 5 Posty signature gradients as the user scrolls,
 * unifying the landing DA with the per-route gradients used inside the
 * app (welcome / posts / visuals / schedule / optimize).
 *
 * Architecture:
 *   - One fixed full-viewport layer, pointer-events-none, z-0
 *   - 5 stacked zones, each rendering 2-3 large blurred radial blobs in
 *     its signature palette
 *   - Opacity of each zone is driven by scrollYProgress thresholds so the
 *     wash crossfades from welcome → posts → visuals → schedule → optimize
 *   - Very slow scale "breathing" loop per blob (14-22s) for life without
 *     distraction
 *   - Respects prefers-reduced-motion + PerformanceProvider tiers
 *
 * Subtlety rules:
 *   - Max blob opacity stays ≤ 0.32 (light) so white cards above always pop
 *   - Heavy blur (110-160px) keeps everything diffused, never agressive
 *   - No animations on mobile or low-tier devices (zones are static washes)
 */

import { memo } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { usePerformance } from "@/lib/performance/PerformanceProvider";

type ZoneId = "welcome" | "posts" | "visuals" | "schedule" | "optimize";

interface Blob {
  /** Background — single radial-gradient string */
  bg: string;
  /** Position (uses tailwind absolute positioning values) */
  pos: string;
  /** Size (w-/h- pair) */
  size: string;
  /** Blur amount (CSS value) */
  blur: string;
  /** Animation period in seconds for the breathing loop */
  period: number;
  /** Phase offset so blobs don't pulse in sync */
  delay: number;
}

interface Zone {
  id: ZoneId;
  blobs: Blob[];
}

/* ────────────────────────────────────────────────────────────────────
 * Zone definitions — each uses the brand signature colors at low alpha,
 * arranged to feel cinematic rather than identical (one blob anchors a
 * corner, another floats elsewhere). Opacities tuned so that the *sum*
 * of two blobs ≤ ~0.32 wherever they overlap.
 * ──────────────────────────────────────────────────────────────────── */
const ZONES: Zone[] = [
  {
    // welcome — warm orange + coral + rose (hero & demo)
    id: "welcome",
    blobs: [
      {
        bg: "radial-gradient(circle, rgba(248,147,93,0.32), transparent 65%)",
        pos: "top-[-12%] right-[-8%]",
        size: "w-[42rem] h-[42rem]",
        blur: "blur(120px)",
        period: 18,
        delay: 0,
      },
      {
        bg: "radial-gradient(circle, rgba(241,52,82,0.18), transparent 65%)",
        pos: "bottom-[-15%] left-[-10%]",
        size: "w-[38rem] h-[38rem]",
        blur: "blur(130px)",
        period: 22,
        delay: 5,
      },
    ],
  },
  {
    // posts — violet + coral (Features / KeyBenefits)
    id: "posts",
    blobs: [
      {
        bg: "radial-gradient(circle, rgba(139,92,246,0.26), transparent 65%)",
        pos: "top-[8%] left-[-6%]",
        size: "w-[40rem] h-[40rem]",
        blur: "blur(130px)",
        period: 19,
        delay: 2,
      },
      {
        bg: "radial-gradient(circle, rgba(247,107,84,0.22), transparent 65%)",
        pos: "bottom-[-10%] right-[-8%]",
        size: "w-[36rem] h-[36rem]",
        blur: "blur(120px)",
        period: 21,
        delay: 6,
      },
    ],
  },
  {
    // visuals — fuchsia + rose (TargetAudience / Copilot)
    id: "visuals",
    blobs: [
      {
        bg: "radial-gradient(circle, rgba(217,70,239,0.24), transparent 65%)",
        pos: "top-[-8%] right-[8%]",
        size: "w-[38rem] h-[38rem]",
        blur: "blur(130px)",
        period: 20,
        delay: 1,
      },
      {
        bg: "radial-gradient(circle, rgba(241,52,82,0.18), transparent 65%)",
        pos: "bottom-[-10%] left-[12%]",
        size: "w-[36rem] h-[36rem]",
        blur: "blur(125px)",
        period: 18,
        delay: 7,
      },
      {
        bg: "radial-gradient(circle, rgba(139,92,246,0.14), transparent 70%)",
        pos: "top-[40%] left-[40%]",
        size: "w-[34rem] h-[34rem]",
        blur: "blur(150px)",
        period: 24,
        delay: 3,
      },
    ],
  },
  {
    // schedule — sky + cyan + violet (Testimonials / Founder / ROI)
    id: "schedule",
    blobs: [
      {
        bg: "radial-gradient(circle, rgba(14,165,233,0.22), transparent 65%)",
        pos: "top-[10%] right-[-10%]",
        size: "w-[40rem] h-[40rem]",
        blur: "blur(130px)",
        period: 21,
        delay: 0,
      },
      {
        bg: "radial-gradient(circle, rgba(139,92,246,0.20), transparent 65%)",
        pos: "bottom-[-12%] left-[-8%]",
        size: "w-[38rem] h-[38rem]",
        blur: "blur(125px)",
        period: 19,
        delay: 5,
      },
      {
        bg: "radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)",
        pos: "top-[45%] right-[35%]",
        size: "w-[32rem] h-[32rem]",
        blur: "blur(150px)",
        period: 23,
        delay: 8,
      },
    ],
  },
  {
    // optimize — emerald + cyan + orange (Pricing / FAQ / Footer)
    id: "optimize",
    blobs: [
      {
        bg: "radial-gradient(circle, rgba(16,185,129,0.22), transparent 65%)",
        pos: "top-[-8%] left-[-6%]",
        size: "w-[40rem] h-[40rem]",
        blur: "blur(130px)",
        period: 20,
        delay: 2,
      },
      {
        bg: "radial-gradient(circle, rgba(248,147,93,0.22), transparent 65%)",
        pos: "bottom-[-10%] right-[-10%]",
        size: "w-[38rem] h-[38rem]",
        blur: "blur(125px)",
        period: 22,
        delay: 6,
      },
    ],
  },
];

/* ────────────────────────────────────────────────────────────────────
 * Opacity curves — each zone fades in around its narrative position in
 * the page (scrollYProgress 0..1) with generous overlap so transitions
 * read as a wash, not a cut. Hero zone keeps a low residual everywhere
 * so the orange identity never fully disappears.
 * ──────────────────────────────────────────────────────────────────── */
const OPACITY_STOPS: Record<ZoneId, [number[], number[]]> = {
  // welcome stays mildly present everywhere as brand anchor
  welcome: [
    [0,    0.15, 0.35, 1],
    [1,    1,    0.35, 0.25],
  ],
  posts: [
    [0,    0.10, 0.25, 0.45, 0.60],
    [0,    0.4,  1,    0.55, 0.10],
  ],
  visuals: [
    [0.18, 0.32, 0.48, 0.65, 0.80],
    [0,    0.4,  1,    0.55, 0.10],
  ],
  schedule: [
    [0.38, 0.52, 0.68, 0.82, 0.95],
    [0,    0.4,  1,    0.65, 0.20],
  ],
  optimize: [
    [0.55, 0.72, 0.88, 1],
    [0,    0.5,  1,    1],
  ],
};

/* ────────────────────────────────────────────────────────────────────
 * Single zone — renders its blobs with breathing animation gated on
 * reduced-motion + device tier.
 * ──────────────────────────────────────────────────────────────────── */
const ZoneLayer = memo(function ZoneLayer({
  zone,
  opacity,
  animate,
}: {
  zone: Zone;
  opacity: MotionValue<number>;
  animate: boolean;
}) {
  return (
    <motion.div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ opacity }}
    >
      {zone.blobs.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${blob.pos} ${blob.size} will-change-transform`}
          style={{
            background: blob.bg,
            filter: blob.blur,
            // Promote to its own GPU layer so the parent opacity change
            // doesn't repaint the blurred bitmap on every scroll tick.
            transform: "translateZ(0)",
          }}
          animate={
            animate
              ? {
                  scale: [1, 1.12, 1],
                  opacity: [0.85, 1, 0.85],
                }
              : undefined
          }
          transition={
            animate
              ? {
                  duration: blob.period,
                  delay: blob.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : undefined
          }
        />
      ))}
    </motion.div>
  );
});

/* ────────────────────────────────────────────────────────────────────
 * Main component
 * ──────────────────────────────────────────────────────────────────── */
function LandingAmbientCanvasImpl() {
  const reduced = useReducedMotion();
  const { mode, hydrated, isMobile } = usePerformance();

  // One scroll source for the whole page (window scroll, since landing
  // uses html as the scroll container — see landing-scroll-enabled class)
  const { scrollYProgress } = useScroll();

  // One MotionValue per zone, driven by scrollYProgress.
  const opacityWelcome = useTransform(scrollYProgress, OPACITY_STOPS.welcome[0], OPACITY_STOPS.welcome[1]);
  const opacityPosts = useTransform(scrollYProgress, OPACITY_STOPS.posts[0], OPACITY_STOPS.posts[1]);
  const opacityVisuals = useTransform(scrollYProgress, OPACITY_STOPS.visuals[0], OPACITY_STOPS.visuals[1]);
  const opacitySchedule = useTransform(scrollYProgress, OPACITY_STOPS.schedule[0], OPACITY_STOPS.schedule[1]);
  const opacityOptimize = useTransform(scrollYProgress, OPACITY_STOPS.optimize[0], OPACITY_STOPS.optimize[1]);

  const opacityByZone: Record<ZoneId, MotionValue<number>> = {
    welcome: opacityWelcome,
    posts: opacityPosts,
    visuals: opacityVisuals,
    schedule: opacitySchedule,
    optimize: opacityOptimize,
  };

  // Low-tier devices: render nothing (the AuroraBackground already paints
  // a warm wash on the hero, which is enough atmosphere on weak hardware).
  if (hydrated && mode === "low") return null;

  // Breathing animation only on capable devices, no reduced motion, desktop
  const animateBlobs = !reduced && !isMobile && mode !== "medium";

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-[1] pointer-events-none overflow-hidden"
    >
      {ZONES.map((zone) => (
        <ZoneLayer
          key={zone.id}
          zone={zone}
          opacity={opacityByZone[zone.id]}
          animate={animateBlobs}
        />
      ))}
    </div>
  );
}

const LandingAmbientCanvas = memo(LandingAmbientCanvasImpl);
export default LandingAmbientCanvas;
