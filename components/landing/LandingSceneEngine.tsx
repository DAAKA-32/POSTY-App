"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePerformance } from "@/lib/performance/PerformanceProvider";

/**
 * LandingSceneEngine — single unified background engine for the marketing landing.
 *
 * Replaces the previous per-section `posty-soft-*` classes that each painted
 * their own fixed `::before` pseudo-element. That older approach caused two
 * problems the user reported as "coupures brutales":
 *
 *   1. Each section's `::before` was independent → hard cuts between gradients
 *      when crossing section boundaries (no crossfade).
 *   2. Stars were bounded to the FAQ + Hero only, so the "magic" disappeared
 *      for the entire middle of the page.
 *
 * This engine fixes both:
 *
 *   • Renders all five signature ambients as stacked fixed layers at z=-10.
 *     Only one is visible at a time (opacity 1), the others sit at opacity 0
 *     and crossfade in/out on a soft 900ms transition as the viewport center
 *     enters a new section. No more snapping.
 *
 *   • Renders one canvas star field globally above the gradients, so the
 *     "FAQ stars" the user loved now travel through every scene. Mobile gets
 *     a reduced-density variant (no longer hidden) — tier counts dialed down
 *     so iOS Safari stays smooth at 30fps.
 *
 * How sections opt in: tag each scene wrapper with `data-scene="<name>"`.
 * The engine scans for those elements once on mount and recomputes the
 * active scene each scroll frame (rAF-throttled).
 */

// =============================================================================
// SCENE PALETTES
// =============================================================================

// Only the three palettes that map to real /app routes the user navigates
// daily: /app (welcome), /historique (visuals), /programme (schedule). The
// previous `posts` and `optimize` palettes were removed at the user's
// request — the analytics emerald in particular wasn't supposed to ship on
// the marketing landing.
export const SCENES = ["welcome", "visuals", "schedule"] as const;
export type Scene = typeof SCENES[number];

/**
 * Light-mode gradients lifted verbatim from `globals.css` (.posty-soft-*).
 * The landing page force-locks light mode, so dark variants aren't shipped
 * here — keeps the engine lean.
 */
// Intensities dialed down ~×0.62 vs the original: the ambient still reads as a
// premium coloured depth wash (same palettes, same positions), but it no longer
// competes with the content. The background should be felt, not noticed.
export const SCENE_GRADIENTS: Record<Scene, string> = {
  welcome: [
    "radial-gradient(ellipse 160% 50% at 60% 0%, rgba(241, 52, 82, 0.22), transparent 72%)",
    "radial-gradient(ellipse 80% 60% at 20% 5%, rgba(248, 147, 93, 0.34), transparent 62%)",
    "radial-gradient(ellipse 70% 60% at 90% 95%, rgba(241, 52, 82, 0.30), transparent 60%)",
    "radial-gradient(ellipse 45% 100% at -8% 50%, rgba(248, 147, 93, 0.20), transparent 65%)",
    "radial-gradient(ellipse 110% 80% at 50% 50%, rgba(248, 147, 93, 0.08), transparent 78%)",
  ].join(", "),
  visuals: [
    "radial-gradient(ellipse 130% 22% at 30% -8%, rgba(217, 70, 239, 0.18), transparent 72%)",
    "radial-gradient(ellipse 75% 55% at 85% 8%, rgba(217, 70, 239, 0.34), transparent 62%)",
    "radial-gradient(ellipse 65% 55% at 12% 95%, rgba(241, 52, 82, 0.30), transparent 60%)",
    "radial-gradient(ellipse 45% 100% at -8% 45%, rgba(217, 70, 239, 0.17), transparent 65%)",
    "radial-gradient(ellipse 110% 80% at 50% 50%, rgba(217, 70, 239, 0.07), transparent 78%)",
  ].join(", "),
  schedule: [
    "radial-gradient(ellipse 130% 22% at 30% -8%, rgba(14, 165, 233, 0.18), transparent 72%)",
    "radial-gradient(ellipse 75% 55% at 85% 10%, rgba(14, 165, 233, 0.34), transparent 62%)",
    "radial-gradient(ellipse 65% 55% at 10% 95%, rgba(139, 92, 246, 0.30), transparent 60%)",
    "radial-gradient(ellipse 45% 100% at -8% 45%, rgba(14, 165, 233, 0.18), transparent 65%)",
    "radial-gradient(ellipse 110% 80% at 50% 50%, rgba(14, 165, 233, 0.07), transparent 78%)",
  ].join(", "),
};

// =============================================================================
// STAR PARTICLE FIELD
// =============================================================================

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  baseOpacity: number;
  opacity: number;
  pulseSpeed: number;
  pulseOffset: number;
  glowRadius: number;
  rotation: number;
  tier: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface TierConfig {
  tier: number;
  cols: number;
  rows: number;
  radiusMin: number;
  radiusMax: number;
  opMin: number;
  opMax: number;
  speed: number;
  glowMin: number;
  glowMax: number;
  jitter: number;
}

/**
 * Two density profiles. The previous AuroraBackground bailed entirely on
 * viewports < md — that gave mobile a stars-free wasteland. Here we keep the
 * proven stratified-grid algorithm but drop the column/row counts so the
 * frame budget on iOS Safari stays comfortable (≈30 particles vs ≈80).
 */
// Tuned to read as tiny depth specks, never focal points: radii ~halved,
// opacities ~×0.55, glows ~×0.55, density trimmed. The content must dominate.
const TIER_CONFIGS_DESKTOP: TierConfig[] = [
  { tier: 0, cols: 5, rows: 3, radiusMin: 1.1, radiusMax: 1.9, opMin: 0.28, opMax: 0.46, speed: 0.02, glowMin: 16, glowMax: 26, jitter: 0.4 },
  { tier: 1, cols: 6, rows: 4, radiusMin: 0.7, radiusMax: 1.2, opMin: 0.18, opMax: 0.34, speed: 0.03, glowMin: 8, glowMax: 13, jitter: 0.45 },
  { tier: 2, cols: 8, rows: 5, radiusMin: 0.4, radiusMax: 0.8, opMin: 0.11, opMax: 0.24, speed: 0.045, glowMin: 4, glowMax: 8, jitter: 0.5 },
];

const TIER_CONFIGS_MOBILE: TierConfig[] = [
  { tier: 0, cols: 3, rows: 4, radiusMin: 0.9, radiusMax: 1.5, opMin: 0.24, opMax: 0.4, speed: 0.018, glowMin: 12, glowMax: 20, jitter: 0.4 },
  { tier: 1, cols: 3, rows: 5, radiusMin: 0.6, radiusMax: 1.0, opMin: 0.16, opMax: 0.3, speed: 0.026, glowMin: 6, glowMax: 11, jitter: 0.45 },
  { tier: 2, cols: 4, rows: 6, radiusMin: 0.3, radiusMax: 0.65, opMin: 0.1, opMax: 0.22, speed: 0.036, glowMin: 3, glowMax: 6, jitter: 0.5 },
];

function createParticles(w: number, h: number, isMobile: boolean): Particle[] {
  const particles: Particle[] = [];
  const rand = seededRandom(42);
  const tiers = isMobile ? TIER_CONFIGS_MOBILE : TIER_CONFIGS_DESKTOP;

  for (const cfg of tiers) {
    const cellW = w / cfg.cols;
    const cellH = h / cfg.rows;

    for (let row = 0; row < cfg.rows; row++) {
      for (let col = 0; col < cfg.cols; col++) {
        const cx = (col + 0.5) * cellW;
        const cy = (row + 0.5) * cellH;

        const dx = Math.abs(cx - w / 2) / (w / 2);
        const dy = Math.abs(cy - h / 2) / (h / 2);
        const distFromCenter = Math.sqrt(dx * dx * 0.7 + dy * dy * 0.3);

        // Keep a calm zone behind the Hero content (title / subtitle / CTA /
        // product preview all live near the centre). Skip probabilities are
        // raised and now cover tier 2 too so the middle stays quiet.
        if (cfg.tier === 0 && distFromCenter < 0.42 && rand() < 0.82) continue;
        if (cfg.tier === 1 && distFromCenter < 0.34 && rand() < 0.6) continue;
        if (cfg.tier === 2 && distFromCenter < 0.24 && rand() < 0.35) continue;

        const jx = (rand() - 0.5) * cellW * cfg.jitter;
        const jy = (rand() - 0.5) * cellH * cfg.jitter;
        const x = Math.max(8, Math.min(w - 8, cx + jx));
        const y = Math.max(8, Math.min(h - 8, cy + jy));

        const edgeBoost = 0.85 + 0.15 * distFromCenter;

        particles.push({
          x,
          y,
          radius: cfg.radiusMin + rand() * (cfg.radiusMax - cfg.radiusMin),
          vx: (rand() - 0.5) * cfg.speed,
          vy: (rand() - 0.5) * cfg.speed * 0.6,
          baseOpacity: (cfg.opMin + rand() * (cfg.opMax - cfg.opMin)) * edgeBoost,
          opacity: 0,
          pulseSpeed: 0.0002 + rand() * 0.0006,
          pulseOffset: rand() * Math.PI * 2,
          glowRadius: cfg.glowMin + rand() * (cfg.glowMax - cfg.glowMin),
          rotation: 0,
          tier: cfg.tier,
        });
      }
    }
  }

  return particles;
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  armLen: number,
  armWidth: number,
  rotation: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.beginPath();
  ctx.moveTo(0, -armLen);
  ctx.quadraticCurveTo(armWidth, 0, 0, armLen);
  ctx.quadraticCurveTo(-armWidth, 0, 0, -armLen);
  ctx.moveTo(-armLen, 0);
  ctx.quadraticCurveTo(0, armWidth, armLen, 0);
  ctx.quadraticCurveTo(0, -armWidth, -armLen, 0);
  ctx.fill();

  ctx.restore();
}

// =============================================================================
// ENGINE COMPONENT
// =============================================================================

/**
 * Shared scene detection. Exported so LandingTopMask can crossfade its clipped
 * top strip in lockstep with this background — same active scene, same timing.
 */
export function useActiveScene(): Scene {
  const [activeScene, setActiveScene] = useState<Scene>("welcome");

  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafPending = false;
    let sections: HTMLElement[] = [];

    const refreshSections = () => {
      sections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-scene]"),
      );
    };

    const compute = () => {
      rafPending = false;
      if (sections.length === 0) return;

      const viewportCenter = window.scrollY + window.innerHeight / 2;
      let chosen: Scene = "welcome";

      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        const top = window.scrollY + rect.top;
        const bottom = top + rect.height;
        if (viewportCenter >= top && viewportCenter < bottom) {
          const scene = section.getAttribute("data-scene") as Scene;
          if (scene && SCENES.includes(scene)) {
            chosen = scene;
            break;
          }
        }
      }

      setActiveScene((prev) => (prev === chosen ? prev : chosen));
    };

    const onScroll = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(compute);
    };

    // First measurement runs slightly delayed so dynamic-imported sections
    // (HowItWorks/Copilot) have time to mount before we cache their offsets.
    refreshSections();
    const initTimer = setTimeout(() => {
      refreshSections();
      compute();
    }, 200);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", refreshSections, { passive: true });

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", refreshSections);
    };
  }, []);

  return activeScene;
}

export default function LandingSceneEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const isMobileRef = useRef(false);
  const { mode, hydrated } = usePerformance();

  const activeScene = useActiveScene(); // drives the gradient crossfade only

  // Stars are scoped to the HERO ONLY (the section tagged `data-stars`), not to
  // every "welcome" scene — so the FAQ (which reuses the warm gradient) stays
  // star-free. An IntersectionObserver watches the Hero: stars are on while it
  // occupies the viewport centre and fade out as the user scrolls past it. The
  // rAF loop reads `starsVisibleRef` to short-circuit drawing when hidden.
  const [starsVisible, setStarsVisible] = useState(true);
  const starsVisibleRef = useRef(true);
  starsVisibleRef.current = starsVisible;

  useEffect(() => {
    if (typeof window === "undefined") return;
    let io: IntersectionObserver | null = null;
    const attach = () => {
      const hero = document.querySelector("[data-stars]");
      if (!hero) return false;
      // A ~10%-tall band at the viewport centre: `isIntersecting` is true only
      // while the Hero crosses the centre line — same feel as the gradient's
      // viewport-centre scene detection.
      io = new IntersectionObserver(
        ([entry]) => setStarsVisible(entry.isIntersecting),
        { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
      );
      io.observe(hero);
      return true;
    };
    // The Hero is static (not dynamically imported), but retry once in case the
    // first paint hasn't committed the node yet.
    if (attach()) return () => io?.disconnect();
    const t = setTimeout(attach, 250);
    return () => {
      clearTimeout(t);
      io?.disconnect();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Canvas star field
  // ---------------------------------------------------------------------------
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    isMobileRef.current = w < 768;
    sizeRef.current = { w, h };
    particlesRef.current = createParticles(w, h, isMobileRef.current);

    return true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (hydrated && mode === "low") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!initCanvas()) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    let lastDrawTime = 0;
    // Mobile gets a slower budget — the engine sits behind the entire page so
    // a half-second hitch is more visible than the bounded hero canvas was.
    const FRAME_INTERVAL = isMobileRef.current ? 55 : mode === "medium" ? 50 : 33;

    const draw = () => {
      const now = performance.now();
      if (now - lastDrawTime < FRAME_INTERVAL) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = now;

      // Skip all particle work when the canvas isn't on the welcome scene.
      // We still schedule the next frame so the loop resumes smoothly once
      // the user scrolls back into Hero or FAQ — but we don't pay the cost
      // of pulse/glow/star math for invisible pixels.
      if (!starsVisibleRef.current) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      const { w, h } = sizeRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      time++;

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        // Gentler pulse — less twinkle so the motion is felt, not noticed.
        const pulse =
          p.baseOpacity *
          (0.8 + 0.2 * Math.sin(time * p.pulseSpeed + p.pulseOffset));

        // Wider, deeper centre fade: stars within ~55% of the horizontal centre
        // are strongly dimmed so the content sits on a visually calm field.
        const cx = Math.abs(p.x - w / 2) / (w / 2);
        const centerFade = 0.12 + 0.88 * Math.min(1, cx / 0.55);
        p.opacity = pulse * centerFade;

        // Always-transparent palette: stars sit on light gradients (#FAFBFC
        // + soft radial washes). The -75 tint shift was tuned in the original
        // AuroraBackground transparent mode and reads as a crisp dark-slate
        // point across all five scene palettes.
        const warmth =
          0.3 + 0.7 * Math.sin(time * 0.00015 + p.pulseOffset);
        const r = Math.round(135 + warmth * 25 - 75);
        const g = Math.round(138 + warmth * 22 - 75);
        const b = Math.round(155 + warmth * 20 - 75);

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glowRadius);
        grad.addColorStop(0, `rgba(${r + 10}, ${g + 10}, ${b + 5}, ${p.opacity * 0.13})`);
        grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${p.opacity * 0.045})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Slightly shorter arms so the specks read rounder/smaller, not spiky.
        const armMult = p.tier === 0 ? 2.8 : p.tier === 1 ? 2.6 : 2.4;
        const widthMult = p.tier === 0 ? 0.4 : p.tier === 1 ? 0.38 : 0.35;
        const armLen = p.radius * armMult;
        const armWidth = p.radius * widthMult;

        ctx.fillStyle = `rgba(${r - 10}, ${g - 10}, ${b - 5}, ${p.opacity * 0.5})`;
        drawStar(ctx, p.x, p.y, armLen, armWidth, p.rotation);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r + 25}, ${g + 25}, ${b + 15}, ${p.opacity * 0.7})`;
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      initCanvas();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [initCanvas, mode, hydrated]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Base wash — what the user sees during gradient crossfades. */}
      <div className="absolute inset-0" style={{ backgroundColor: "#FAFBFC" }} />

      {/* Scene gradient layers — stacked, only one fully visible at a time.
          900ms ease-out crossfade keeps neighboring palettes briefly co-painted
          so the boundary between scenes reads as a slow wash rather than a cut. */}
      {SCENES.map((scene) => (
        <div
          key={scene}
          className="absolute inset-0"
          style={{
            backgroundImage: SCENE_GRADIENTS[scene],
            backgroundRepeat: "no-repeat",
            opacity: scene === activeScene ? 1 : 0,
            transition: "opacity 900ms cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: "opacity",
          }}
        />
      ))}

      {/* Star canvas — painted for the HERO ONLY (the `data-stars` section).
          Every section after it (features, proof, pricing, FAQ, footer) stays
          star-free so the content leads. Same 900ms crossfade as the gradients
          so the field feels like part of the opening leaving, not a hard cut. */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          width: "100%",
          height: "100%",
          opacity: starsVisible ? 1 : 0,
          transition: "opacity 900ms cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "opacity",
        }}
      />

      {/* Dot grid — final atmospheric layer, kept extremely subtle. */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #9ca3af 0.5px, transparent 0.5px)",
          backgroundSize: "20px 20px",
        }}
      />
    </div>
  );
}
