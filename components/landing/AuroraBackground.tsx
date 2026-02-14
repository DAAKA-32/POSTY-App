"use client";

/**
 * AuroraBackground — Clean hero background inspired by prosp.ai
 *
 * Soft gradient base + subtle dot grid + centered radial glow.
 * Minimal, no heavy animations — performance-friendly.
 */
export default function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Base gradient — warm peach to white */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FEF3EE] via-[#FFFBF9] to-white" />

      {/* Centered radial glow — subtle warm light behind content */}
      <div
        className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[800px] h-[600px]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(248,147,93,0.08) 0%, rgba(248,147,93,0.03) 40%, transparent 70%)",
        }}
      />

      {/* Secondary glow — bottom right accent */}
      <div
        className="absolute bottom-[5%] right-[10%] w-[500px] h-[400px]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(247,107,84,0.05) 0%, transparent 60%)",
        }}
      />

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #9ca3af 0.5px, transparent 0.5px)",
          backgroundSize: "20px 20px",
        }}
      />
    </div>
  );
}
