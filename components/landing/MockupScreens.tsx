"use client";

/**
 * MockupScreens — Real product screenshots for the landing page
 * "Aperçu produit" carousel.
 *
 * 6 screens: Copilot (custom JSX), App, Chat, History, Schedule, Dashboard
 * Each slide renders either a screenshot or a custom React component.
 */

import { type ReactNode, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useInView, type Variants } from "framer-motion";

export interface MockupScreen {
  id: string;
  src: string;
  alt: string;
  label: string;
  /** Optional custom component to render instead of an image */
  component?: ReactNode;
}

/**
 * Cache-buster for the carousel PNGs. Bump after each `npm run generate-previews`
 * so browsers (and Next.js Image optimizer) fetch the fresh screenshots instead
 * of serving the previous cached optimization.
 */
const PREVIEWS_VERSION = "4";

/** Build translated MockupScreen array from translation object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMockupScreens(landing: any): MockupScreen[] {
  const v = `?v=${PREVIEWS_VERSION}`;
  return [
    { id: "chat-welcome", src: `/images/screenshots/app.png${v}`, alt: landing.mockupChatAlt, label: landing.mockupChatLabel },
    { id: "conversation", src: `/images/screenshots/chat.png${v}`, alt: landing.mockupConversationAlt, label: landing.mockupConversationLabel },
    { id: "history", src: `/images/screenshots/history.png${v}`, alt: landing.mockupHistoryAlt, label: landing.mockupHistoryLabel },
    { id: "schedule", src: `/images/screenshots/schedule.png${v}`, alt: landing.mockupScheduleAlt, label: landing.mockupScheduleLabel },
    { id: "analytics", src: `/images/screenshots/dashboard.png${v}`, alt: landing.mockupAnalyticsAlt, label: landing.mockupAnalyticsLabel },
  ];
}

/* ── Phase timing for the multi-agent simulation loop ───────────────── *
 * 0: Idle — user brief visible, all agents dim
 * 1: Copywriter agent activates (analyzing intent)
 * 2: Copywriter generates the optimized post (typewriter reveal)
 * 3: System/CTO agent validates the draft (validation badge)
 * 4: User clicks Publish → button morphs into "Publishing…" spinner
 * 5: UX agent activates → "Published on LinkedIn" toast
 * 6: Engagement detected toast (+312 views)
 * 7: AI boosted reach toast (+42%)
 * 8: Hold, then loop back to phase 0 */
const PHASE_DURATIONS = [1300, 1300, 2200, 1300, 1000, 1500, 1700, 1900, 1400];
const TOTAL_PHASES = PHASE_DURATIONS.length;

/* ─────────────────────────────────────────────────────────────────────
 * CopilotConversionPane — left side of the section.
 *
 * Headline + 5-row Sans/Avec comparison driven by Framer Motion.
 * The "Avec Posty" column is the hero: stronger color, subtle hover lift,
 * stagger from top-to-bottom. The "Sans Posty" column reads gray and faded.
 *
 * Why this lives in its own component: the parent runs a heavy phase-loop
 * effect for the chat mockup; isolating the comparison keeps re-renders
 * cheap and lets us use `useInView` cleanly.
 * ───────────────────────────────────────────────────────────────────── */

interface ComparisonRow {
  before: string;
  after: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CopilotConversionPane({ landing, inView }: { landing: any; inView: boolean }) {
  const paneRef = useRef<HTMLDivElement>(null);
  // Use Framer Motion's useInView for the comparison rows so they stagger
  // independently of the parent's phase-loop trigger.
  const motionInView = useInView(paneRef, { once: true, margin: "-10% 0px" });

  // i18n-driven copy with sensible defaults for the last two rows.
  const rows: ComparisonRow[] = [
    { before: landing.aiExpRow1Before, after: landing.aiExpRow1After },
    { before: landing.aiExpRow2Before, after: landing.aiExpRow2After },
    { before: landing.aiExpRow3Before, after: landing.aiExpRow3After },
    {
      before: landing.aiExpRow4Before || "Publication irrégulière",
      after: landing.aiExpRow4After || "Programmation automatique",
    },
    {
      before: landing.aiExpRow5Before || "Aucun workflow",
      after: landing.aiExpRow5After || "Copilote intelligent 24/7",
    },
  ];

  // Container variant orchestrates child stagger.
  const container: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
  };

  // Each row enters from a slight x offset; the After cell does so from the
  // opposite side for a satisfying "convergence" feel.
  const rowVariant: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  };

  const headerVariant: Variants = {
    hidden: { opacity: 0, y: -8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  return (
    <motion.div
      ref={paneRef}
      initial="hidden"
      animate={motionInView || inView ? "visible" : "hidden"}
      variants={container}
      className="flex-1 min-w-0 text-center md:text-left"
    >
      {/* Headline — solid accent (no gradient on H2), tight tracking. The
          "disponible 24h/24" already lives in the title, so no eyebrow tag. */}
      <motion.h2
        variants={headerVariant}
        className="text-[1.75rem] sm:text-[2.25rem] md:text-[2.5rem] lg:text-[2.875rem] font-bold text-gray-900 leading-[1.05] tracking-[-0.015em] mb-3"
      >
        {landing.aiExpTitle}
        <br />
        <span className="text-[#F8935D]">{landing.aiExpTitleAccent}</span>
      </motion.h2>

      {/* Subtitle — generous leading, body weight */}
      <motion.p
        variants={headerVariant}
        className="text-[14px] sm:text-[15px] text-gray-600 leading-relaxed max-w-[520px] mx-auto md:mx-0 mb-5 sm:mb-6"
      >
        {landing.aiExpSubtitle}
      </motion.p>

      {/* Comparison card — clean 2-column layout, generous breathing room. */}
      <motion.div
        variants={rowVariant}
        className="relative max-w-[540px] mx-auto md:mx-0 rounded-2xl bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12),0_2px_6px_-2px_rgba(15,23,42,0.06)] ring-1 ring-gray-200/70 overflow-hidden"
      >
        {/* Header — clean 2-column with strong contrast */}
        <div className="grid grid-cols-2 items-center bg-gradient-to-b from-gray-50/60 to-white border-b border-gray-100">
          <span className="py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em]">
            {landing.aiExpWithout || "Sans Posty"}
          </span>
          <span className="py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#F8935D]">
            {landing.aiExpWith || "Avec Posty"}
          </span>
        </div>

        {/* Rows wrapper with center hairline divider */}
        <div className="relative">
          <div
            className="absolute top-0 bottom-0 left-1/2 -translate-x-px hidden sm:block pointer-events-none w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent"
            aria-hidden="true"
          />

          {rows.map((row, i) => (
            <motion.div
              key={i}
              variants={rowVariant}
              className={`grid grid-cols-2 items-stretch ${
                i < rows.length - 1 ? "border-b border-gray-50" : ""
              }`}
            >
              {/* Before — gray, faded */}
              <div className="flex items-center gap-2.5 px-4 py-3.5">
                <span className="inline-flex w-4 h-4 rounded-full bg-gray-100 items-center justify-center flex-shrink-0">
                  <svg className="w-2 h-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
                <span className="text-[12px] sm:text-[13px] text-gray-400 leading-snug">{row.before}</span>
              </div>

              {/* After — bold orange */}
              <div className="flex items-center gap-2.5 px-4 py-3.5 bg-gradient-to-r from-[#F8935D]/[0.05] to-transparent">
                <span className="inline-flex w-4 h-4 rounded-full bg-[#F8935D]/15 items-center justify-center flex-shrink-0 ring-2 ring-[#F8935D]/10">
                  <svg className="w-2 h-2 text-[#F8935D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-[12px] sm:text-[13px] text-gray-900 font-semibold leading-snug">{row.after}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * CopilotMultiAgentMockup — right side of the section.
 *
 * Multi-agent SaaS simulation: a single phase prop drives a coordinated
 * sequence across the agent rail, the optimized-post output card, the
 * validation badge, the publish button, and the floating toast stack.
 *
 * Phases (see PHASE_DURATIONS at top of file):
 *   0 idle · 1 copywriter analyzes · 2 copywriter drafts · 3 system
 *   validates · 4 publish click · 5 published toast · 6 engagement toast
 *   · 7 reach-boost toast · 8 hold (loops to 0).
 * ───────────────────────────────────────────────────────────────────── */

interface AgentChipProps {
  letter: string;
  label: string;
  state: string;
  active: boolean;
  done: boolean;
  /** 6-char hex (no alpha). The chip composes alpha values from this. */
  accent: string;
}

function AgentChip({ letter, label, state, active, done, accent }: AgentChipProps) {
  return (
    <div
      className={`relative rounded-lg border px-2 py-1.5 transition-all duration-300 ${
        active ? "border-transparent" : done ? "border-gray-100 bg-white" : "border-gray-100 bg-white/60"
      }`}
      style={
        active
          ? {
              backgroundColor: `${accent}10`,
              boxShadow: `0 0 0 1px ${accent}40, 0 4px 16px -8px ${accent}66`,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className="relative w-3.5 h-3.5 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: active || done ? `${accent}26` : "#F3F4F6" }}
        >
          <span className="text-[7px] font-bold" style={{ color: active || done ? accent : "#9CA3AF" }}>
            {letter}
          </span>
          {active && (
            <span
              className="absolute -inset-0.5 rounded-md opacity-50 animate-ping"
              style={{ backgroundColor: `${accent}40` }}
            />
          )}
        </span>
        <span
          className="text-[8px] font-bold uppercase tracking-wide truncate"
          style={{ color: active || done ? "#1F2937" : "#9CA3AF" }}
        >
          {label}
        </span>
      </div>
      <p
        className="text-[7.5px] leading-tight truncate"
        style={{ color: active ? accent : done ? "#6B7280" : "#D1D5DB" }}
      >
        {state}
      </p>
    </div>
  );
}

/** Word-stagger typewriter. Hidden when `active` is false; reveals each
 *  word in order when `active` flips true. Layout-stable: words occupy
 *  their final position from the start (only opacity changes). */
function TypewriterText({ text, active }: { text: string; active: boolean }) {
  const words = text.split(" ");
  return (
    <p className="text-[10px] sm:text-[10.5px] text-gray-700 leading-relaxed">
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: active ? 1 : 0 }}
          transition={{
            duration: 0.18,
            delay: active ? 0.05 + i * 0.045 : 0,
            ease: "easeOut",
          }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </p>
  );
}

interface MultiAgentMockupProps {
  phase: number;
  inView: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  landing: any;
}

function CopilotMultiAgentMockup({ phase, inView, landing }: MultiAgentMockupProps) {
  const on = (min: number) => phase >= min;
  const onRange = (min: number, max: number) => phase >= min && phase < max;

  // Optimized post body. Falls back to a credible English LinkedIn post if
  // no i18n key is supplied — keeps the mockup readable in every locale.
  const generatedPost: string =
    landing.aiExpGeneratedPost ||
    "Storytelling isn't a soft skill — it's the fastest way to turn cold scrollers into qualified meetings. Here's the one paragraph that doubled my pipeline.";

  // Agent activity windows. Each agent lights up during its active phase
  // range and stays "done" afterwards so the rail tells a story.
  const copywriterActive = onRange(1, 3);
  const copywriterDone = on(3);
  const systemActive = onRange(3, 5);
  const systemDone = on(5);
  const uxActive = onRange(5, 8);
  const uxDone = on(7);

  // Toast stack — each toast lingers through the phase 8 hold, so by the
  // end of the loop all three are stacked together (the "broadcast finale").
  const showPublished = onRange(5, 9);
  const showEngagement = onRange(6, 9);
  const showBoost = onRange(7, 9);

  return (
    <div
      className={`flex-shrink-0 w-full max-w-[300px] sm:max-w-[330px] md:max-w-[360px] lg:max-w-[400px] transition-all duration-700 delay-200 ease-out ${
        inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"
      }`}
    >
      <div className="relative animate-[copilotCardFloat_8s_ease-in-out_infinite]">
        {/* Pulsing ring + warm glow — same visual language as the legacy mockup */}
        <div className="absolute -inset-2 sm:-inset-4 rounded-[28px] border border-[#F8935D]/10 animate-[copilotPulseRing_4s_ease-in-out_infinite]" />
        <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-br from-[#F8935D]/10 to-[#F76B54]/[0.06] rounded-[32px] blur-2xl" />

        {/* Browser chrome */}
        <div className="relative bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 shadow-2xl shadow-gray-400/25 overflow-hidden">
          <div className="flex items-center px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            </div>
            <div className="flex-1 mx-6 sm:mx-12">
              <div className="bg-gray-100/80 rounded-md px-3 py-1 flex items-center justify-center gap-1.5">
                <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium">postyapp.ai</span>
              </div>
            </div>
            <div className="w-12" />
          </div>

          {/* App body */}
          <div className="bg-[#FAFAF8] flex flex-col">
            {/* App header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg overflow-hidden shadow-sm">
                  <Image src="/logo.png" alt="Posty" width={28} height={28} className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-bold text-gray-900">Posty Copilot</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="px-2 py-0.5 rounded bg-[#F8935D]/10 text-[8px] font-bold text-[#F8935D]">LinkedIn</div>
                <div className="px-2 py-0.5 rounded bg-[#F8935D]/[0.06] text-[8px] font-bold text-[#F8935D]/85">24/7</div>
              </div>
            </div>

            {/* Agent rail — 3 specialist agents */}
            <div className="px-3 sm:px-4 py-2.5 border-b border-gray-100 bg-gradient-to-b from-white to-[#FAFAF8]/40">
              <div className="grid grid-cols-3 gap-1.5">
                <AgentChip
                  letter="C"
                  label={landing.agentCopywriterLabel || "Copywriter"}
                  state={
                    copywriterActive
                      ? onRange(1, 2)
                        ? landing.agentCopywriterAnalyzing || "Analyzing…"
                        : landing.agentCopywriterDrafting || "Drafting…"
                      : copywriterDone
                      ? landing.agentCopywriterDone || "Polished"
                      : landing.agentIdle || "Standby"
                  }
                  active={copywriterActive}
                  done={copywriterDone}
                  accent="#F8935D"
                />
                <AgentChip
                  letter="S"
                  label={landing.agentSystemLabel || "System"}
                  state={
                    systemActive
                      ? landing.agentSystemValidating || "Validating…"
                      : systemDone
                      ? landing.agentSystemDone || "Approved"
                      : landing.agentIdle || "Standby"
                  }
                  active={systemActive}
                  done={systemDone}
                  accent="#3B82F6"
                />
                <AgentChip
                  letter="U"
                  label={landing.agentUxLabel || "UX Engine"}
                  state={
                    uxActive
                      ? landing.agentUxBroadcasting || "Broadcasting"
                      : uxDone
                      ? landing.agentUxDone || "Live"
                      : landing.agentIdle || "Standby"
                  }
                  active={uxActive}
                  done={uxDone}
                  accent="#10B981"
                />
              </div>
            </div>

            {/* Editor body */}
            <div className="relative px-3 sm:px-4 py-3 space-y-2.5">
              {/* User brief */}
              <div
                className={`rounded-lg bg-white border border-gray-200/80 shadow-sm px-2.5 py-2 flex items-start gap-2 transition-all duration-500 ease-out ${
                  on(0) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-[7px] font-bold text-white">EC</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[7.5px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">
                    {landing.aiExpDraftLabel || "Your brief"}
                  </p>
                  <p className="text-[10.5px] sm:text-[11px] text-gray-700 leading-snug">
                    {landing.aiExpChatExample}
                  </p>
                </div>
              </div>

              {/* Copywriter "thinking" pill — only during phase 1 */}
              <AnimatePresence>
                {onRange(1, 2) && (
                  <motion.div
                    key="thinking"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-1.5 px-1"
                  >
                    <span className="text-[9px] font-medium text-[#F8935D]">
                      {landing.agentCopywriterThinking || "Copywriter agent is rewriting…"}
                    </span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-[#F8935D] animate-[copilotTypingDot_1.2s_ease-in-out_infinite]" />
                      <span className="w-1 h-1 rounded-full bg-[#F8935D] animate-[copilotTypingDot_1.2s_ease-in-out_0.2s_infinite]" />
                      <span className="w-1 h-1 rounded-full bg-[#F8935D] animate-[copilotTypingDot_1.2s_ease-in-out_0.4s_infinite]" />
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Optimized post output */}
              <motion.div
                initial={false}
                animate={on(2) ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="px-2.5 py-1.5 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-[#F8935D]/[0.05] to-transparent">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-[#F8935D]/15 flex items-center justify-center">
                      <svg className="w-2 h-2 text-[#F8935D]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </span>
                    <span className="text-[8.5px] font-semibold text-gray-700">
                      {landing.aiExpOptimizedLabel || "Optimized for LinkedIn"}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <svg className="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-[8px] font-bold text-[#F8935D]">9.4</span>
                  </div>
                </div>
                <div className="px-2.5 py-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                    <div className="space-y-0.5">
                      <div className="h-1 bg-gray-300 rounded-full w-14" />
                      <div className="h-1 bg-gray-200 rounded-full w-9" />
                    </div>
                  </div>
                  <TypewriterText text={generatedPost} active={on(2)} />
                </div>
              </motion.div>

              {/* System validation badge */}
              <AnimatePresence>
                {on(3) && (
                  <motion.div
                    key="validation"
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-blue-50 border border-blue-100"
                  >
                    <span className="relative w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {systemActive && (
                        <span className="absolute inset-0 rounded-full bg-blue-400/40 animate-ping" />
                      )}
                    </span>
                    <p className="text-[9.5px] font-semibold text-blue-700 leading-tight">
                      {landing.agentSystemValidatedLine || "System agent: post validated for publication"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action bar */}
              <div
                className={`flex gap-1.5 transition-all duration-500 ease-out ${
                  on(2) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                }`}
              >
                <motion.div
                  animate={onRange(4, 5) ? { scale: [1, 0.94, 1] } : { scale: 1 }}
                  transition={{ duration: 0.45 }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg shadow-md transition-colors duration-300 ${
                    on(5)
                      ? "bg-emerald-500 shadow-emerald-500/20"
                      : "bg-gradient-to-r from-[#F8935D] to-[#F76B54] shadow-[#F8935D]/20"
                  }`}
                >
                  {on(5) ? (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : onRange(4, 5) ? (
                    <span className="w-2.5 h-2.5 border-[1.5px] border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                  <span className="text-[8.5px] font-bold text-white">
                    {on(5)
                      ? landing.aiExpPublished || "Published"
                      : onRange(4, 5)
                      ? landing.aiExpPublishing || "Publishing…"
                      : landing.aiExpPublishCta || "Publish"}
                  </span>
                </motion.div>
                <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg">
                  <svg className="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[8.5px] font-semibold text-gray-600">
                    {landing.aiExpScheduleCta || "Schedule"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toast stack — published → engagement → boost. Each lingers so by
            phase 7 all three are visible together (the "broadcast cascade"). */}
        <AnimatePresence>
          {showPublished && (
            <motion.div
              key="t-published"
              initial={{ opacity: 0, x: 24, y: -2 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -top-3 -right-2 sm:-right-12 z-30"
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200/80 shadow-xl shadow-gray-400/15 px-2.5 py-2 flex items-center gap-2 max-w-[180px]">
                <div className="w-7 h-7 rounded-full bg-[#0A66C2] flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-gray-800">
                    {landing.aiExpToastPublished || "Post published on LinkedIn"}
                  </p>
                  <p className="text-[7px] sm:text-[8px] text-gray-400">
                    {landing.aiExpToastPublishedSub || "Live for 4.7k connections"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {showEngagement && (
            <motion.div
              key="t-engagement"
              initial={{ opacity: 0, x: 24, y: -2 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
              className="absolute top-[58px] sm:top-[68px] -right-1 sm:-right-10 z-30"
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200/80 shadow-xl shadow-gray-400/15 px-2.5 py-2 flex items-center gap-2 max-w-[180px]">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 7h7v7" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-gray-800">
                    {landing.aiExpNotifViews}
                  </p>
                  <p className="text-[7px] sm:text-[8px] text-gray-400">
                    {landing.aiExpNotifViewsSub}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {showBoost && (
            <motion.div
              key="t-boost"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-30"
            >
              <div className="bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white rounded-full px-3.5 py-2 flex items-center gap-2 shadow-lg shadow-[#F8935D]/25 whitespace-nowrap">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold">
                    {landing.aiExpToastBoost || "AI boosted reach +42%"}
                  </p>
                  <p className="text-[7px] sm:text-[8px] text-white/80">
                    {landing.aiExpToastBoostSub || "UX agent · auto-tuning"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** AI Copilot experience — animated loop: post creation → broadcast → growth */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CopilotSection({ landing }: { landing: any }) {
  const [phase, setPhase] = useState(-1);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  /* Slide-in on scroll into viewport */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setTimeout(() => setPhase(0), 700);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* Seamless looping — wraps back to 0, no blank screen */
  useEffect(() => {
    if (phase < 0) return;
    const t = setTimeout(() => {
      setPhase((p) => (p + 1) % TOTAL_PHASES);
    }, PHASE_DURATIONS[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  /* Respect prefers-reduced-motion */
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      setPhase(3);
    }
  }, []);

  const on = (min: number) => phase >= min;
  const onRange = (min: number, max: number) => phase >= min && phase < max;

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden h-screen max-h-screen flex items-center py-6 sm:py-8"
    >
      {/* Background — single sober warm wash. One soft halo behind the mockup,
          one fainter behind the comparison. No grain pattern (it competed
          with the comparison table's visual density). */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FEF6F0] via-white to-[#FEF6F0]" />
      <div className="absolute top-[12%] right-[6%] w-[420px] h-[420px] bg-[#F8935D]/[0.06] rounded-full blur-[140px]" />

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 lg:gap-16">

          {/* ── LEFT — Refonte conversion-driven : headline punchy + comparaison
              Sans/Avec dramatique avec stagger Framer Motion + hover. */}
          <CopilotConversionPane landing={landing} inView={inView} />


          {/* ── RIGHT — Multi-agent simulation mockup ──────────────── */}
          <CopilotMultiAgentMockup phase={phase} inView={inView} landing={landing} />

        </div>
      </div>
    </section>
  );
}

/** @deprecated Use getMockupScreens(t.landing) instead for i18n support */
export const MOCKUP_SCREENS: MockupScreen[] = [
  { id: "chat-welcome", src: "/images/screenshots/app.png", alt: "Vue principale de l'application Posty", label: "Chat" },
  { id: "conversation", src: "/images/screenshots/chat.png", alt: "Conversation avec l'IA Posty", label: "Conversation" },
  { id: "history", src: "/images/screenshots/history.png", alt: "Historique des posts générés", label: "Historique" },
  { id: "schedule", src: "/images/screenshots/schedule.png", alt: "Programmation des posts LinkedIn", label: "Programmes" },
  { id: "analytics", src: "/images/screenshots/dashboard.png", alt: "Tableau de bord et analytics", label: "Analytics" },
];
