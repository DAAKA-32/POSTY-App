"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * AuroraBackground — Premium animated hero background
 *
 * Layers:
 * 1. Warm peach → white gradient base
 * 2. Floating radial orbs (CSS, slow organic drift)
 * 3. Canvas silver star particles (structured balanced distribution)
 * 4. Dot grid overlay
 *
 * Particle distribution: stratified grid with controlled jitter,
 * density weighted toward edges for center text readability.
 */

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
  tier: number; // 0 = large accent, 1 = medium, 2 = small
}

/* Seeded PRNG for deterministic, non-random-looking placement */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function createParticles(w: number, h: number): Particle[] {
  const particles: Particle[] = [];
  const rand = seededRandom(42);

  // --- Tier configs ---
  // Large accent stars: few, prominent, mostly on edges
  // Medium stars: balanced coverage
  // Small stars: fill, subtle accents
  const tiers = [
    { tier: 0, cols: 6, rows: 3, radiusMin: 2.2, radiusMax: 3.8, opMin: 0.55, opMax: 0.85, speed: 0.025, glowMin: 30, glowMax: 50, jitter: 0.35 },
    { tier: 1, cols: 8, rows: 4, radiusMin: 1.2, radiusMax: 2.0, opMin: 0.35, opMax: 0.65, speed: 0.04, glowMin: 14, glowMax: 24, jitter: 0.4 },
    { tier: 2, cols: 10, rows: 5, radiusMin: 0.5, radiusMax: 1.1, opMin: 0.2, opMax: 0.45, speed: 0.055, glowMin: 6, glowMax: 12, jitter: 0.45 },
  ];

  for (const cfg of tiers) {
    const cellW = w / cfg.cols;
    const cellH = h / cfg.rows;

    for (let row = 0; row < cfg.rows; row++) {
      for (let col = 0; col < cfg.cols; col++) {
        // Center of this cell
        const cx = (col + 0.5) * cellW;
        const cy = (row + 0.5) * cellH;

        // Distance from canvas center (0..1)
        const dx = Math.abs(cx - w / 2) / (w / 2);
        const dy = Math.abs(cy - h / 2) / (h / 2);
        const distFromCenter = Math.sqrt(dx * dx * 0.7 + dy * dy * 0.3);

        // Density gate: skip some center cells for large stars (keep edges denser)
        if (cfg.tier === 0 && distFromCenter < 0.3 && rand() < 0.6) continue;
        if (cfg.tier === 1 && distFromCenter < 0.2 && rand() < 0.3) continue;

        // Controlled jitter within cell bounds
        const jx = (rand() - 0.5) * cellW * cfg.jitter;
        const jy = (rand() - 0.5) * cellH * cfg.jitter;
        const x = Math.max(8, Math.min(w - 8, cx + jx));
        const y = Math.max(8, Math.min(h - 8, cy + jy));

        // Scale opacity: slightly brighter at edges
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

/** Draw a 4-branch star sparkle at (x, y) */
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
  // Vertical arm
  ctx.moveTo(0, -armLen);
  ctx.quadraticCurveTo(armWidth, 0, 0, armLen);
  ctx.quadraticCurveTo(-armWidth, 0, 0, -armLen);
  // Horizontal arm
  ctx.moveTo(-armLen, 0);
  ctx.quadraticCurveTo(0, armWidth, armLen, 0);
  ctx.quadraticCurveTo(0, -armWidth, -armLen, 0);
  ctx.fill();

  ctx.restore();
}

export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const parent = canvas.parentElement;
    if (!parent) return false;

    const rect = parent.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    sizeRef.current = { w, h };
    particlesRef.current = createParticles(w, h);

    return true;
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let initAttempts = 0;
    const tryInit = () => {
      if (initCanvas()) {
        startAnimation();
      } else if (initAttempts < 20) {
        initAttempts++;
        requestAnimationFrame(tryInit);
      }
    };

    const startAnimation = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let time = 0;

      const draw = () => {
        const { w, h } = sizeRef.current;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        time++;

        for (const p of particlesRef.current) {
          // Slow drift
          p.x += p.vx;
          p.y += p.vy;

          // Wrap around with margin
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20;
          if (p.y > h + 20) p.y = -20;

          // Slow sinusoidal pulse
          const pulse =
            p.baseOpacity *
            (0.6 + 0.4 * Math.sin(time * p.pulseSpeed + p.pulseOffset));

          // Center fade: softer in center for text readability, stronger at edges
          const cx = Math.abs(p.x - w / 2) / (w / 2);
          const centerFade = 0.3 + 0.7 * Math.min(1, cx / 0.4);
          p.opacity = pulse * centerFade;

          // Silver tones — cool metallic, slightly cold
          const warmth =
            0.3 + 0.7 * Math.sin(time * 0.00015 + p.pulseOffset);
          const r = Math.round(135 + warmth * 25); // 135-160
          const g = Math.round(138 + warmth * 22); // 138-160
          const b = Math.round(155 + warmth * 20); // 155-175

          // Soft radial glow behind star
          const grad = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            p.glowRadius,
          );
          grad.addColorStop(
            0,
            `rgba(${r + 10}, ${g + 10}, ${b + 5}, ${p.opacity * 0.2})`,
          );
          grad.addColorStop(
            0.4,
            `rgba(${r}, ${g}, ${b}, ${p.opacity * 0.07})`,
          );
          grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // 4-branch star sparkle — proportions vary by tier
          const armMult = p.tier === 0 ? 3.2 : p.tier === 1 ? 3.0 : 2.8;
          const widthMult = p.tier === 0 ? 0.4 : p.tier === 1 ? 0.38 : 0.35;
          const armLen = p.radius * armMult;
          const armWidth = p.radius * widthMult;

          ctx.fillStyle = `rgba(${r - 10}, ${g - 10}, ${b - 5}, ${p.opacity * 0.65})`;
          drawStar(ctx, p.x, p.y, armLen, armWidth, p.rotation);

          // Bright center point
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r + 25}, ${g + 25}, ${b + 15}, ${p.opacity * 0.85})`;
          ctx.fill();
        }

        frameRef.current = requestAnimationFrame(draw);
      };

      draw();
    };

    tryInit();

    const handleResize = () => {
      initCanvas();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [initCanvas]);

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Layer 1 — Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FEF3EE] via-[#FFFBF9] to-white" />

      {/* Layer 2 — Floating orbs (kept warm for brand identity) */}
      <div
        className="hero-orb absolute top-[8%] left-[3%] w-[350px] h-[300px] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(248,147,93,0.07) 0%, transparent 70%)",
          animation: "float-orb-1 25s ease-in-out infinite",
        }}
      />
      <div
        className="hero-orb absolute bottom-[10%] right-[3%] w-[400px] h-[350px] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(247,107,84,0.05) 0%, transparent 70%)",
          animation: "float-orb-2 30s ease-in-out infinite",
        }}
      />
      <div
        className="hero-orb absolute top-[45%] right-[6%] w-[250px] h-[250px] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(248,168,120,0.06) 0%, transparent 65%)",
          animation: "float-orb-3 20s ease-in-out infinite",
        }}
      />
      <div
        className="hero-orb absolute top-[30%] left-[8%] w-[200px] h-[200px] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(248,147,93,0.04) 0%, transparent 60%)",
          animation: "float-orb-2 22s ease-in-out infinite reverse",
        }}
      />

      {/* Layer 3 — Canvas silver star particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Layer 4 — Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #9ca3af 0.5px, transparent 0.5px)",
          backgroundSize: "20px 20px",
        }}
      />
    </div>
  );
}
