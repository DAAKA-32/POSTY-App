"use client";

import { SCENES, SCENE_GRADIENTS, useActiveScene } from "./LandingSceneEngine";

/**
 * LandingTopMask — a fixed strip at the very top that re-paints the EXACT same
 * background as <LandingSceneEngine /> (base wash + crossfading scene gradient,
 * sized to the full viewport, then clipped to the strip via overflow-hidden).
 *
 * Sits at z-40: above the scrolling content (z-5) but below the navbar pill
 * (z-50). When `visible`, any content that scrolls up into the navbar zone is
 * hidden behind it — yet because the strip shows the identical fixed gradient,
 * the page background stays perfectly seamless (no band, no seam).
 *
 * The inner layers are `absolute` but sized `100vw × 100vh` and pinned to the
 * top-left, so they align pixel-for-pixel with the engine's `fixed inset-0`
 * layers; the parent's `overflow-hidden` reveals only the top strip.
 */
export default function LandingTopMask({
  visible,
  height = 82,
}: {
  visible: boolean;
  height?: number;
}) {
  const activeScene = useActiveScene();

  const fullViewport: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 z-40 overflow-hidden transition-opacity duration-500 ease-out"
      style={{ height, opacity: visible ? 1 : 0 }}
    >
      {/* Base wash — matches the engine's #FAFBFC floor. */}
      <div style={{ ...fullViewport, backgroundColor: "#FAFBFC" }} />

      {/* Scene gradients — crossfade in lockstep with the engine. */}
      {SCENES.map((scene) => (
        <div
          key={scene}
          style={{
            ...fullViewport,
            backgroundImage: SCENE_GRADIENTS[scene],
            backgroundRepeat: "no-repeat",
            opacity: scene === activeScene ? 1 : 0,
            transition: "opacity 900ms cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: "opacity",
          }}
        />
      ))}

      {/* Dot grid — same subtle atmospheric layer as the engine. */}
      <div
        style={{
          ...fullViewport,
          opacity: 0.04,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #9ca3af 0.5px, transparent 0.5px)",
          backgroundSize: "20px 20px",
        }}
      />
    </div>
  );
}
