"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/**
 * Premium animated mockups for each AppTour slide.
 * Self-contained visuals — no external assets, no API calls. Pure CSS + SVG.
 * Each mockup is sized to fill its container (parent controls aspect ratio).
 */

const floatTransition = {
  duration: 6,
  ease: [0.45, 0.05, 0.55, 0.95] as const,
  repeat: Infinity,
  repeatType: "reverse" as const,
};

// ----------------------------------------------------------------------------
// Slide 1 — Welcome / hero
// ----------------------------------------------------------------------------
export function MockupWelcome() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Soft glow halo */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-gradient-to-br from-brand-orange via-brand-coral to-brand-rose blur-3xl opacity-40" />
      </motion.div>

      {/* Floating sparkles */}
      {[
        { left: "12%", top: "20%", size: 6, delay: 0 },
        { left: "82%", top: "28%", size: 8, delay: 0.8 },
        { left: "18%", top: "70%", size: 7, delay: 1.6 },
        { left: "78%", top: "72%", size: 5, delay: 2.4 },
        { left: "48%", top: "12%", size: 4, delay: 0.4 },
      ].map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/90 shadow-glow"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
          animate={{ y: [-6, 6, -6], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3.5, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Central wordmark badge — real Posty logo on a soft white halo so the
          gradient brand (orange/coral/rose) reads clean behind it. */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={floatTransition}
          className="relative w-24 h-24 rounded-[26px] bg-white/95 shadow-glow-lg ring-1 ring-white/60 overflow-hidden flex items-center justify-center"
        >
          <Image
            src="/logo.png"
            alt="Posty"
            width={96}
            height={96}
            priority
            className="w-full h-full object-cover"
          />
        </motion.div>
        <div className="text-center">
          <div className="text-3xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)] tracking-tight notranslate">Posty</div>
          <div className="text-xs text-white/90 font-semibold mt-1 tracking-[0.18em] uppercase">AI · LinkedIn · Growth</div>
        </div>
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Slide 2 — Post generation (chat → preview)
// ----------------------------------------------------------------------------
export function MockupPostGeneration() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-3 px-6">
      {/* Faux chat input bubble */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="w-full max-w-[320px] bg-white/95 dark:bg-dark-elevated rounded-2xl px-4 py-3 shadow-card flex items-center gap-3"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-orange to-brand-rose flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <div className="flex-1 text-sm text-slate-800 truncate font-medium">
          “Write a post about agentic AI…”
        </div>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="w-1.5 h-4 bg-brand-orange rounded-sm"
        />
      </motion.div>

      {/* Arrow indicating flow */}
      <motion.svg
        viewBox="0 0 24 24"
        className="w-5 h-5 text-white/80"
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        fill="none"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </motion.svg>

      {/* Generated post card preview — richer content so the card never reads
          as "empty" on the gradient background. Explicit slate colors render
          reliably across themes (avoid CSS-var alpha quirks). */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[320px] bg-white rounded-2xl p-4 shadow-elevated border border-slate-200"
      >
        {/* Author row */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-orange to-brand-coralMedium flex items-center justify-center text-white text-xs font-bold">P</div>
          <div className="flex-1 min-w-0">
            <div className="h-2 w-24 bg-slate-700 rounded-full" />
            <div className="h-1.5 w-16 bg-slate-300 rounded-full mt-1.5" />
          </div>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-300">
            <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
          </svg>
        </div>
        {/* Body */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-slate-300 rounded-full" />
          <div className="h-1.5 w-[92%] bg-slate-300 rounded-full" />
          <div className="h-1.5 w-[78%] bg-slate-300 rounded-full" />
          <div className="h-1.5 w-[55%] bg-slate-200 rounded-full" />
        </div>
        {/* Hashtags */}
        <div className="flex gap-2 mt-3">
          <div className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-brand-orange/15 text-brand-coral">#AI</div>
          <div className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-brand-orange/15 text-brand-coral">#LinkedIn</div>
        </div>
        {/* Reactions row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              <div className="w-4 h-4 rounded-full bg-[#0A66C2] ring-2 ring-white flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-2 h-2 text-white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5l-5-5L7.41 11l3.59 3.59L16.59 9 18 10.41l-7 7.09z"/></svg>
              </div>
              <div className="w-4 h-4 rounded-full bg-error ring-2 ring-white" />
            </div>
            <div className="text-[10px] text-slate-500 font-medium">142</div>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Slide 3 — Visual variants
// ----------------------------------------------------------------------------
export function MockupVisuals() {
  const variants = [
    { gradient: "from-brand-orange via-brand-coral to-brand-rose", delay: 0 },
    { gradient: "from-vibrant-violet via-vibrant-fuchsia to-brand-rose", delay: 0.1 },
    { gradient: "from-vibrant-cyan via-vibrant-sky to-vibrant-emerald", delay: 0.2 },
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="grid grid-cols-3 gap-3 w-[88%] max-w-[360px]">
        {variants.map((v, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: i === 1 ? 0 : i === 0 ? -2 : 2 }}
            transition={{ delay: v.delay + 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-elevated"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${v.gradient}`} />

            {/* Soft inner highlight for depth */}
            <div
              className="absolute inset-0 opacity-50 mix-blend-overlay pointer-events-none"
              style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.45), transparent 55%)" }}
            />

            {/* Sparkle icon (top-left) */}
            <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-white">
                <path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z" />
              </svg>
            </div>

            {/* Brand mark (top-right) */}
            <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-white/30 backdrop-blur-sm" />

            {/* Faux heading + body bars (bottom) */}
            <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-1.5">
              {/* Title-like wide bar */}
              <div className="h-2 w-[85%] bg-white rounded-full shadow-sm" />
              {/* Subtitle */}
              <div className="h-1.5 w-[60%] bg-white/80 rounded-full" />
              {/* Body lines */}
              <div className="mt-1 space-y-1">
                <div className="h-[5px] w-full bg-white/60 rounded-full" />
                <div className="h-[5px] w-[80%] bg-white/55 rounded-full" />
              </div>
            </div>

            {/* Selected indicator for middle card */}
            {i === 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 500, damping: 20 }}
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-success flex items-center justify-center shadow-glow-success border-[3px] border-white z-10"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Slide 4 — Multi-platform scheduling
// ----------------------------------------------------------------------------
export function MockupScheduling() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const slots = [
    { day: 0, hour: "9:00", platform: "in", color: "from-[#0A66C2] to-[#0073B1]" },
    { day: 2, hour: "14:30", platform: "x", color: "from-text-primary to-text-secondary" },
    { day: 4, hour: "18:00", platform: "bs", color: "from-vibrant-sky to-vibrant-cyan" },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-5 gap-3">
      {/* Mini calendar header */}
      <div className="w-full max-w-[360px] bg-white/95 dark:bg-dark-elevated rounded-2xl px-3 py-2.5 shadow-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-brand-coral" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="text-xs font-semibold text-text-primary">This week</div>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-brand-coral" />
          <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40" />
        </div>
      </div>

      {/* Day grid */}
      <div className="w-full max-w-[360px] bg-white/95 dark:bg-dark-elevated rounded-2xl p-3 shadow-card">
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {days.map((d, i) => (
            <div key={i} className="text-[10px] font-semibold text-text-muted text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => {
            const slot = slots.find((s) => s.day === i);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.04, duration: 0.3 }}
                className={`relative aspect-square rounded-lg ${slot ? `bg-gradient-to-br ${slot.color}` : "bg-light-hover dark:bg-dark-hover"} flex items-center justify-center`}
              >
                {slot && (
                  <span className="text-[9px] font-bold text-white uppercase">{slot.platform}</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Platform connections row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="flex items-center gap-2"
      >
        {["#0A66C2", "#1DA1F2", "#0EA5E9", "#8B5CF6"].map((color, i) => (
          <div
            key={i}
            className="w-7 h-7 rounded-full ring-2 ring-white/40 shadow-card"
            style={{ background: color }}
          />
        ))}
        <div className="text-xs font-medium text-white/90 ml-1">+ more</div>
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Slide 5 — AI optimization + analytics
// ----------------------------------------------------------------------------
export function MockupOptimization() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-3 px-5">
      {/* Hook score card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="w-full max-w-[340px] bg-white/95 dark:bg-dark-elevated rounded-2xl p-3.5 shadow-card flex items-center gap-3"
      >
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
            <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="3" fill="none" className="text-light-hover dark:text-dark-hover" />
            <motion.circle
              cx="18" cy="18" r="15"
              stroke="url(#hookGradient)"
              strokeWidth="3" fill="none" strokeLinecap="round"
              initial={{ strokeDasharray: "0 94" }}
              animate={{ strokeDasharray: "82 94" }}
              transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
            <defs>
              <linearGradient id="hookGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F8935D" />
                <stop offset="100%" stopColor="#F13452" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold bg-gradient-to-br from-brand-orange to-brand-rose bg-clip-text text-transparent">87</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-text-primary">Hook score</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Strong opener · viral potential</div>
        </div>
      </motion.div>

      {/* Trend chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="w-full max-w-[340px] bg-white/95 dark:bg-dark-elevated rounded-2xl p-3.5 shadow-card"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Engagement</div>
            <div className="text-base font-bold text-text-primary">+42%</div>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-bold">↑ trending</div>
        </div>
        <svg viewBox="0 0 200 60" className="w-full h-12">
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F8935D" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F8935D" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d="M0,45 L25,42 L50,38 L75,30 L100,28 L125,20 L150,18 L175,10 L200,5"
            stroke="url(#hookGradient)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.path
            d="M0,45 L25,42 L50,38 L75,30 L100,28 L125,20 L150,18 L175,10 L200,5 L200,60 L0,60 Z"
            fill="url(#chartGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.4 }}
          />
        </svg>
      </motion.div>
    </div>
  );
}
