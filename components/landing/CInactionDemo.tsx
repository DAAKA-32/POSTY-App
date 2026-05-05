"use client";

/**
 * CInactionDemo — 8.5s product walkthrough for the landing-page
 * "See in action" tab. A single composer mockup stays mounted while a
 * fake mouse cursor drives the user through 5 beats:
 *
 *   0 (2.0s)  Compose   — cursor in input, prompt types out
 *   1 (2.2s)  Generate  — AI writes the polished post (typewriter)
 *   2 (0.9s)  Publish   — cursor flies to Publish, button is pressed
 *   3 (1.2s)  Posted    — spinner → green check + "Posted to LinkedIn" toast
 *   4 (2.2s)  Results   — metrics panel slides in, counters tick up
 *
 * Then loops. Hover pauses, prefers-reduced-motion locks to phase 1.
 */

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";

const PHASE_DURATIONS = [2000, 2200, 900, 1200, 2200] as const;
const TOTAL_PHASES = PHASE_DURATIONS.length;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const ACCENT = "#F8935D";
const ACCENT_HOVER = "#F76B54";

const PROMPT = "Write a LinkedIn post about leadership";
const POST_HEADLINE = "3 leadership shifts that transformed my team in 90 days:";
const POST_BODY = [
  "1. Daily 1:1s — 10 minutes, no agenda.",
  "2. Async-first reporting (kill the status meeting).",
  "3. Decisions documented in <24h, every time.",
];

const PHASE_LABELS = ["Compose", "Generate", "Publish", "Posted", "Results"] as const;

/* ─────────────────────── Typewriter helper ───────────────────────── */
function Typewriter({
  text,
  active,
  speed = 35,
  startDelay = 0,
  cursor = false,
}: {
  text: string;
  active: boolean;
  speed?: number;
  startDelay?: number;
  cursor?: boolean;
}) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (!active) {
      setShown("");
      return;
    }
    setShown("");
    let cancelled = false;
    const start = setTimeout(() => {
      if (cancelled) return;
      let i = 0;
      const id = setInterval(() => {
        i++;
        if (cancelled) {
          clearInterval(id);
          return;
        }
        setShown(text.slice(0, i));
        if (i >= text.length) clearInterval(id);
      }, speed);
    }, startDelay);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [active, text, speed, startDelay]);

  return (
    <span>
      {shown}
      {cursor && active && (
        <motion.span
          className="inline-block w-[1.5px] h-[0.95em] align-middle ml-[1px]"
          style={{ backgroundColor: "#374151" }}
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
      )}
    </span>
  );
}

/* ───────────────────── Counter helper ────────────────────────────── */
function Counter({ to, active, delay = 0 }: { to: number; active: boolean; delay?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) {
      setN(0);
      return;
    }
    let cancelled = false;
    const start = setTimeout(() => {
      if (cancelled) return;
      const duration = 900;
      const steps = 32;
      let cur = 0;
      const id = setInterval(() => {
        cur += to / steps;
        if (cancelled) {
          clearInterval(id);
          return;
        }
        if (cur >= to) {
          cur = to;
          clearInterval(id);
        }
        setN(Math.round(cur));
      }, duration / steps);
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [to, active, delay]);
  return <span className="tabular-nums">{n.toLocaleString("en-US")}</span>;
}

/* ──────────────────────── Composer card ──────────────────────────── */
function ComposerCard({ phase }: { phase: number }) {
  const showGenerated = phase >= 1;
  const publishPressed = phase === 2 || phase === 3;
  const posted = phase >= 3;

  return (
    <motion.div
      className="relative bg-white rounded-xl border border-gray-200/70 overflow-hidden flex flex-col"
      style={{
        boxShadow:
          "0 12px 32px -16px rgba(15,23,42,0.10), 0 2px 8px -4px rgba(15,23,42,0.06)",
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      {/* Profile header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-[8px] font-bold text-white">EC</span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-gray-900">Posting to LinkedIn</p>
          <p className="text-[9px] text-gray-400">Public · Anyone</p>
        </div>
        <div className="ml-auto px-1.5 py-0.5 rounded bg-[#F8935D]/10">
          <span className="text-[8px] font-bold" style={{ color: ACCENT }}>AI assist on</span>
        </div>
      </div>

      {/* Prompt input area */}
      <div className="px-4 py-3 border-b border-gray-50">
        <p className="text-[8.5px] uppercase tracking-wider text-gray-400 font-bold mb-1">
          Your brief
        </p>
        <p className="text-[12px] text-gray-700 min-h-[18px] leading-snug">
          <Typewriter text={PROMPT} active={phase === 0} speed={36} startDelay={300} cursor />
          {phase >= 1 && PROMPT}
        </p>
      </div>

      {/* Generated post — appears phase 1+ */}
      <div className="flex-1 px-4 py-3 min-h-0">
        <AnimatePresence mode="wait">
          {showGenerated ? (
            <motion.div
              key="generated"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              {/* AI sparkle pill */}
              <motion.div
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full mb-2"
                style={{ backgroundColor: "rgba(248,147,93,0.10)" }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                <svg className="w-2.5 h-2.5" fill={ACCENT} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-[8.5px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
                  Generated by Posty
                </span>
              </motion.div>

              <p className="text-[12px] font-semibold text-gray-900 leading-snug mb-1.5">
                <Typewriter text={POST_HEADLINE} active={phase === 1} speed={20} startDelay={200} />
                {phase >= 2 && POST_HEADLINE}
              </p>
              <ul className="space-y-0.5">
                {POST_BODY.map((line, i) => (
                  <motion.li
                    key={i}
                    className="text-[10.5px] text-gray-600 leading-snug"
                    initial={{ opacity: 0, x: -4 }}
                    animate={
                      phase === 1
                        ? { opacity: [0, 0, 1], x: 0 }
                        : phase >= 2
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: -4 }
                    }
                    transition={{
                      duration: 0.35,
                      delay: phase === 1 ? 1.4 + i * 0.18 : 0,
                      ease: EASE_OUT,
                      times: phase === 1 ? [0, 0.5, 1] : undefined,
                    }}
                  >
                    {line}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.div
              key="awaiting"
              className="flex items-center gap-1.5 text-gray-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-[11px]"><span translate="no" className="notranslate">Posty</span> will draft your post here</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/40">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-gray-200 rounded" />
          <div className="w-3.5 h-3.5 bg-gray-200 rounded-full" />
          <div className="w-3.5 h-3.5 bg-gray-200 rounded" />
        </div>
        <div className="flex items-center gap-1.5">
          {/* Schedule (passive) */}
          <div className="px-2.5 py-1 rounded-md border border-gray-200 bg-white flex items-center gap-1">
            <svg className="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[9px] font-semibold text-gray-600">Schedule</span>
          </div>
          {/* Publish */}
          <motion.div
            data-publish-btn
            className="px-3 py-1 rounded-md flex items-center gap-1 shadow-sm"
            style={{
              backgroundColor: posted ? "#10B981" : ACCENT,
              boxShadow: posted
                ? "0 2px 8px -2px rgba(16,185,129,0.30)"
                : "0 2px 8px -2px rgba(248,147,93,0.30)",
            }}
            animate={{
              scale: publishPressed && phase === 2 ? [1, 0.92, 1] : 1,
              backgroundColor: posted
                ? "#10B981"
                : phase === 2
                ? ACCENT_HOVER
                : ACCENT,
            }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            {phase === 3 && (
              <motion.span
                className="w-2.5 h-2.5 border-[1.5px] border-white/40 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
              />
            )}
            {phase >= 4 && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {phase < 3 && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
            <span className="text-[9px] font-bold text-white">
              {phase < 3 ? "Publish" : phase === 3 ? "Publishing…" : "Posted"}
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* ───────────────────────── Results panel ─────────────────────────── */
function ResultsPanel({ phase }: { phase: number }) {
  const visible = phase >= 3;
  const ticking = phase >= 4;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="results"
          className="relative h-full flex flex-col gap-2"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          {/* Header */}
          <motion.div
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200/70"
            style={{ boxShadow: "0 2px 8px -4px rgba(15,23,42,0.06)" }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: "#10B981", opacity: 0.4 }} />
              <span className="relative w-2 h-2 rounded-full" style={{ backgroundColor: "#10B981" }} />
            </span>
            <p className="text-[10px] font-semibold text-gray-900">Live on LinkedIn</p>
            <span className="ml-auto text-[8.5px] text-gray-400 font-medium">just now</span>
          </motion.div>

          {/* Metric cards */}
          <MetricCard
            icon="eye"
            label="Impressions"
            value={2143}
            suffix
            active={ticking}
            delay={0}
            tint={ACCENT}
          />
          <MetricCard
            icon="message"
            label="Comments"
            value={12}
            active={ticking}
            delay={0.25}
            tint="#3B82F6"
          />
          <MetricCard
            icon="lead"
            label="Leads in DM"
            value={5}
            active={ticking}
            delay={0.5}
            tint="#10B981"
            highlight
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetricCard({
  icon,
  label,
  value,
  active,
  delay,
  tint,
  highlight = false,
  suffix = false,
}: {
  icon: "eye" | "message" | "lead";
  label: string;
  value: number;
  active: boolean;
  delay: number;
  tint: string;
  highlight?: boolean;
  suffix?: boolean;
}) {
  const iconPaths: Record<typeof icon, string> = {
    eye:
      "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    message:
      "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    lead:
      "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  };

  return (
    <motion.div
      className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white border border-gray-100"
      style={{
        boxShadow: highlight
          ? `0 0 0 2px ${tint}20, 0 4px 12px -4px ${tint}40`
          : "0 1px 2px rgba(15,23,42,0.04)",
      }}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.2 + delay }}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${tint}18` }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke={tint} viewBox="0 0 24 24" strokeWidth={2}>
          {iconPaths[icon].split(" M").map((p, i) => (
            <path key={i} strokeLinecap="round" strokeLinejoin="round" d={i === 0 ? p : `M${p}`} />
          ))}
        </svg>
      </div>
      <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
        <span className="text-[9.5px] text-gray-500 font-medium">{label}</span>
        <span className="text-[14px] font-bold text-gray-900">
          <span className="text-gray-400">+</span>
          <Counter to={value} active={active} delay={delay * 1000} />
          {suffix && value >= 1000 && <span className="text-[10px] text-gray-400 ml-[1px]"></span>}
        </span>
      </div>
      {highlight && (
        <motion.span
          className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[7.5px] font-bold text-white shadow-sm"
          style={{ backgroundColor: tint }}
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.2 + delay + 0.6 }}
        >
          NEW
        </motion.span>
      )}
    </motion.div>
  );
}

/* ───────────────────────── Posted toast ──────────────────────────── */
function PostedToast({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="toast"
          className="absolute top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          initial={{ opacity: 0, y: -20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#0F172A] shadow-xl shadow-black/20">
            <span className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="text-[10.5px] font-semibold text-white">Posted to LinkedIn</span>
            <span className="text-[9px] text-gray-400">· instant broadcast</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── Phase indicator ───────────────────────── */
function PhaseIndicator({ phase }: { phase: number }) {
  return (
    <div className="px-2 py-1 rounded-full bg-white/85 backdrop-blur ring-1 ring-black/[0.06] flex items-center gap-1.5">
      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: ACCENT }} />
      <span
        className="text-[9px] font-semibold text-gray-500 uppercase"
        style={{ letterSpacing: "0.16em" }}
      >
        {PHASE_LABELS[phase]}
      </span>
    </div>
  );
}

/* ───────────────────────── Fake mouse cursor ─────────────────────── */
function FakeCursor({ phase }: { phase: number }) {
  // Coordinates are % of container. Tuned for 16:9 layout below.
  // Phase 0,1: hovers in the brief input area.
  // Phase 2,3: flies down to the Publish button.
  // Phase 4: drifts off into the results panel area.
  const target =
    phase <= 1
      ? { left: "20%", top: "32%", opacity: 1 }
      : phase === 2
      ? { left: "47%", top: "85%", opacity: 1 }
      : phase === 3
      ? { left: "47%", top: "85%", opacity: 0.8 }
      : { left: "80%", top: "55%", opacity: 0 };

  return (
    <motion.div
      className="absolute pointer-events-none z-40"
      animate={target}
      transition={{
        duration: phase === 2 ? 0.55 : 0.7,
        ease: EASE_OUT,
      }}
      style={{ filter: "drop-shadow(0 4px 8px rgba(15,23,42,0.18))" }}
    >
      <motion.svg
        width="20"
        height="22"
        viewBox="0 0 20 22"
        animate={phase === 2 ? { scale: [1, 0.85, 1] } : { scale: 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.35 }}
      >
        <path
          d="M2 2 L2 16 L6 12.5 L9 19 L12 17.5 L9 11 L14.5 11 Z"
          fill="white"
          stroke="#0F172A"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.div>
  );
}

/* ─────────────────────── Main component ──────────────────────────── */
export default function CInactionDemo() {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (reduced || muted) return;
    const t = setTimeout(
      () => setPhase((p) => (p + 1) % TOTAL_PHASES),
      PHASE_DURATIONS[phase],
    );
    return () => clearTimeout(t);
  }, [phase, reduced, muted]);

  /* Reduced motion: lock to the Generate beat (the one that explains the value). */
  const effectivePhase = reduced ? 1 : phase;

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: "#FAFAF8" }}
      onMouseEnter={() => setMuted(true)}
      onMouseLeave={() => setMuted(false)}
      role="img"
      aria-label="Posty product demo: prompt → AI-generated post → publish → results"
    >
      {/* Static warm halo — single, no pulsing */}
      <div
        className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full blur-[100px] pointer-events-none"
        style={{ backgroundColor: "rgba(248,147,93,0.07)" }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-[360px] h-[360px] rounded-full blur-[100px] pointer-events-none"
        style={{ backgroundColor: "rgba(247,107,84,0.04)" }}
      />

      {/* Top header bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 z-20 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md overflow-hidden ring-1 ring-black/5">
            <Image src="/logo.png" alt="Posty" width={24} height={24} className="w-full h-full object-cover" />
          </div>
          <span translate="no" className="notranslate text-xs font-bold text-gray-900">Posty</span>
          <span
            className="px-1.5 py-0.5 rounded text-[8px] font-bold"
            style={{ backgroundColor: "rgba(248,147,93,0.10)", color: ACCENT }}
          >
            LinkedIn
          </span>
        </div>
        <PhaseIndicator phase={effectivePhase} />
      </div>

      {/* Main grid: composer (~58%) + results panel (~42%) */}
      <div
        className="absolute inset-0 grid gap-4 px-6 pt-12 pb-5"
        style={{ gridTemplateColumns: "1.4fr 1fr" }}
      >
        <ComposerCard phase={effectivePhase} />
        <ResultsPanel phase={effectivePhase} />
      </div>

      {/* Posted toast — phase 3 only */}
      <PostedToast show={effectivePhase === 3} />

      {/* Fake mouse cursor */}
      <FakeCursor phase={effectivePhase} />

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 flex gap-1 px-4 py-2 z-30 pointer-events-none">
        {Array.from({ length: TOTAL_PHASES }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-[2px] rounded-full overflow-hidden"
            style={{ backgroundColor: "rgba(15,23,42,0.06)" }}
          >
            <motion.div
              key={`${i}-${phase}`}
              className="h-full"
              style={{ backgroundColor: ACCENT }}
              initial={{ width: i < effectivePhase ? "100%" : "0%" }}
              animate={{ width: i <= effectivePhase ? "100%" : "0%" }}
              transition={{
                duration: i === effectivePhase ? PHASE_DURATIONS[i] / 1000 : 0.3,
                ease: i === effectivePhase ? "linear" : EASE_OUT,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
