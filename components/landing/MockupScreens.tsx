"use client";

/**
 * MockupScreens — Real product screenshots for the landing page
 * "Aperçu produit" carousel.
 *
 * 6 screens: Copilot (custom JSX), App, Chat, History, Schedule, Dashboard
 * Each slide renders either a screenshot or a custom React component.
 */

import { type ReactNode, useState, useEffect, useRef } from "react";
import { motion, useInView, type Variants } from "framer-motion";

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
const PREVIEWS_VERSION = "9";

/** Build translated MockupScreen array from translation object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMockupScreens(landing: any): MockupScreen[] {
  const v = `?v=${PREVIEWS_VERSION}`;
  return [
    { id: "chat-welcome", src: `/images/screenshots/app.png${v}`, alt: landing.mockupChatAlt, label: landing.mockupChatLabel },
    { id: "conversation", src: `/images/screenshots/chat.png${v}`, alt: landing.mockupConversationAlt, label: landing.mockupConversationLabel },
    { id: "history", src: `/images/screenshots/history.png${v}`, alt: landing.mockupHistoryAlt, label: landing.mockupHistoryLabel },
    { id: "schedule", src: `/images/screenshots/schedule.png${v}`, alt: landing.mockupScheduleAlt, label: landing.mockupScheduleLabel },
  ];
}

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
      // 2-column layout on md+ : intro (title + subtitle) on the left,
      // Manuel/Avec Posty comparison table on the right. Stacks on mobile.
      className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-8 md:gap-10 lg:gap-14 text-center md:text-left"
    >
      {/* ── LEFT — Intro (headline + subtitle) ───────────────────────── */}
      <div className="flex-1 min-w-0">
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
          className="text-[14px] sm:text-[15px] text-gray-600 leading-relaxed max-w-[520px] mx-auto md:mx-0"
        >
          {landing.aiExpSubtitle}
        </motion.p>
      </div>

      {/* ── RIGHT — Comparison card (Manuel vs Avec Posty) ───────────── */}
      <motion.div
        variants={rowVariant}
        className="relative w-full md:w-auto md:flex-1 max-w-[540px] mx-auto md:mx-0 rounded-2xl bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12),0_2px_6px_-2px_rgba(15,23,42,0.06)] ring-1 ring-gray-200/70 overflow-hidden"
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

/** AI Copilot experience — Sans/Avec comparison pane (the multi-agent
 *  mockup that used to live on the right was removed). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CopilotSection({ landing }: { landing: any }) {
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
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* Respect prefers-reduced-motion — show the pane immediately. */
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
    }
  }, []);

  return (
    <section
      ref={sectionRef}
      // Natural-height layout. The previous `md:h-screen md:max-h-screen`
      // reserved a full viewport on desktop but the headline + table only
      // filled ~50% of it, producing the "empty zone" the user flagged. The
      // py rhythm matches the surrounding sections (py-16 → md:py-24 → lg:py-28),
      // so the page breathes consistently without locking a viewport.
      className="relative w-full overflow-visible py-16 sm:py-20 md:py-24 lg:py-28"
    >
      {/* Background painting removed — the global LandingSceneEngine on
          app/page.tsx now paints this section's ambient (schedule scene:
          sky-blue + violet). The previous local peach wash + warm orbs were
          opaque overlays that hid the engine and produced a peach "strip"
          breaking the unified scroll narrative. */}

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 lg:gap-16">

          {/* ── LEFT — Refonte conversion-driven : headline punchy + comparaison
              Sans/Avec dramatique avec stagger Framer Motion + hover.
              The right-side multi-agent mockup was removed — the comparison
              table now carries the section's full message on its own. */}
          <CopilotConversionPane landing={landing} inView={inView} />

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
