"use client";

/**
 * StrategistWorkspace — Posty Stratège as its own environment.
 *
 * Rendered by app/(app)/app/strategist/page.tsx inside the shared app shell, so
 * switching Posty Post ⇄ Posty Stratège REPLACES the workspace (same sidebar,
 * same gradient, no overlay). It used to be a 560px drawer laid over the studio
 * (StrategistDrawer); the content — chat, settings, plan cards, gate screens —
 * is the same, the container is a page.
 *
 * What a drawer needed and a page must not have: dialog role + focus trap, a
 * backdrop, swipe-to-dismiss, a close button, Esc-to-close, body scroll lock.
 * Every `close()` that used to sit next to a link or a connect button is gone
 * too: navigating already leaves the workspace.
 *
 * The conversation itself lives in <StrategistSessionProvider>, mounted by
 * app/(app)/layout.tsx, so it survives Post ⇄ Stratège switches.
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, SlidersHorizontal, SquarePen } from "lucide-react";
import { useStrategistEligibility } from "@/hooks/strategist/useStrategistEligibility";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useStrategistCopy } from "@/lib/strategist/copy";
import StrategistChatPanel from "./StrategistChatPanel";
import StrategistSettingsView from "./StrategistSettingsView";
import StrategistMark from "./StrategistMark";
import StrategistActivePill from "./StrategistActivePill";
import { useStrategistSession } from "./StrategistSession";
import { IconButton } from "./ui";

export default function StrategistWorkspace() {
  const eligibility = useStrategistEligibility();
  const { view } = useStrategistSession();
  const reduced = useReducedMotion();

  return (
    // A short fade + 6px rise: enough to feel like a new environment, short
    // enough never to hold the interface back. Skipped under reduced motion.
    <motion.section
      aria-labelledby="strategist-title"
      initial={reduced ? false : { opacity: 0.6, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`
        mx-auto flex h-full min-h-0 w-full ${view === "settings" ? "max-w-5xl" : "max-w-3xl"} flex-col
        bg-white dark:bg-dark-card
        lg:my-3 lg:h-[calc(100%-1.5rem)] lg:rounded-2xl lg:border lg:border-gray-200 lg:dark:border-dark-border
        lg:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-24px_rgba(15,23,42,0.18)]
        overflow-hidden
      `}
    >
      <WorkspaceHeader showActions={eligibility.reason === "ok"} />
      <div className="flex-1 flex flex-col min-h-0">
        {eligibility.reason === "loading" ? (
          <div className="flex-1 flex items-center justify-center" role="status" aria-label="…">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin motion-reduce:animate-none" />
          </div>
        ) : eligibility.reason === "no-access" ? (
          <StrategistTeaser />
        ) : eligibility.reason === "no-linkedin" ? (
          <StrategistLinkedInRequired />
        ) : view === "settings" ? (
          <StrategistSettingsView />
        ) : (
          <StrategistChatPanel />
        )}
      </div>
    </motion.section>
  );
}

// ── Header ────────────────────────────────────────────────────────────────

function WorkspaceHeader({ showActions }: { showActions: boolean }) {
  const { c } = useStrategistCopy();
  const { view, setView, messages, newChat } = useStrategistSession();
  const inSettings = view === "settings";

  return (
    <header className="relative flex items-center justify-between gap-2 pl-4 pr-2 py-2 border-b border-gray-200 dark:border-dark-border">
      {inSettings ? (
        <div className="flex items-center gap-1 min-w-0 -ml-2">
          <IconButton label={c.back} onClick={() => setView("chat")}>
            <ArrowLeft className="w-[18px] h-[18px]" />
          </IconButton>
          <h1 id="strategist-title" className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
            {c.settings.title}
          </h1>
        </div>
      ) : (
        <div className="flex items-center gap-3 min-w-0">
          {/* Desktop: an explicit way back to the other environment. On mobile
              the navbar's mode selector already does this. */}
          <Link
            href="/app"
            aria-label={c.backToPostAria}
            className="hidden lg:inline-flex items-center gap-1.5 h-8 -ml-1 pl-1.5 pr-2.5 rounded-lg text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <ArrowLeft aria-hidden className="w-4 h-4" />
            {c.postStudio}
          </Link>
          <span aria-hidden className="hidden lg:block h-4 w-px bg-gray-200 dark:bg-dark-border" />
          <div className="flex items-center gap-2 min-w-0">
            <StrategistMark className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <h1 id="strategist-title" className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
              {c.title}
            </h1>
            <StrategistActivePill />
          </div>
        </div>
      )}

      <div className="flex items-center">
        {showActions && !inSettings && messages.length > 0 && (
          <IconButton label={c.newChat} onClick={newChat}>
            <SquarePen className="w-[18px] h-[18px]" />
          </IconButton>
        )}
        {showActions && !inSettings && (
          <IconButton label={c.openSettings} onClick={() => setView("settings")}>
            <SlidersHorizontal className="w-[18px] h-[18px]" />
          </IconButton>
        )}
      </div>
    </header>
  );
}

// ── Gate screens ──────────────────────────────────────────────────────────
// A static, inert preview sits behind the gate card (not a live chat panel:
// that used to run Firestore reads and leave focusable controls behind it).

function GatePreview() {
  return (
    <div aria-hidden inert className="flex-1 px-5 pt-10 space-y-4 select-none blur-[2px] opacity-70">
      <div className="h-6 w-2/3 rounded bg-gray-200 dark:bg-dark-elevated" />
      <div className="h-4 w-5/6 rounded bg-gray-100 dark:bg-dark-elevated/70" />
      <div className="h-20 rounded-xl border border-gray-200 dark:border-dark-border" />
      <div className="h-12 rounded-xl border border-gray-200 dark:border-dark-border" />
      <div className="h-12 rounded-xl border border-gray-200 dark:border-dark-border" />
    </div>
  );
}

function GateCard({
  eyebrow,
  title,
  desc,
  children,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <GatePreview />
      <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-lg">
          <p className="text-[12px] font-medium text-amber-700 dark:text-amber-400">{eyebrow}</p>
          <h2 className="mt-2 text-[17px] font-semibold text-gray-900 dark:text-white leading-snug">{title}</h2>
          <p className="mt-2 text-[14px] text-gray-600 dark:text-gray-300 leading-relaxed">{desc}</p>
          <div className="mt-5 flex flex-col gap-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function StrategistTeaser() {
  const { c } = useStrategistCopy();
  return (
    <GateCard eyebrow={c.gate.lockedEyebrow} title={c.gate.lockedTitle} desc={c.gate.lockedDesc}>
      <Link
        href="/business"
        className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-900 font-semibold text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-card"
      >
        {c.gate.lockedCta}
      </Link>
    </GateCard>
  );
}

function StrategistLinkedInRequired() {
  const { c } = useStrategistCopy();
  const { connectLinkedIn } = useLinkedIn();
  return (
    <GateCard eyebrow={c.gate.linkedinEyebrow} title={c.gate.linkedinTitle} desc={c.gate.linkedinDesc}>
      <button
        type="button"
        onClick={() => connectLinkedIn()}
        className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white/100 font-semibold text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-card"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
          <path d="M19 0H5a5 5 0 00-5 5v14a5 5 0 005 5h14a5 5 0 005-5V5a5 5 0 00-5-5zM8 19H5V8h3v11zM6.5 6.7a1.8 1.8 0 110-3.6 1.8 1.8 0 010 3.6zM20 19h-3v-5.6c0-1.4-.5-2.4-1.8-2.4-1 0-1.6.7-1.9 1.4-.1.2-.1.6-.1.9V19h-3V8h3v1.3c.4-.6 1.1-1.5 2.7-1.5 2 0 3.5 1.3 3.5 4.1V19z" />
        </svg>
        {c.gate.linkedinCta}
      </button>
      <Link
        href="/settings"
        className="inline-flex items-center justify-center h-10 text-[13px] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline-offset-4 hover:underline"
      >
        {c.gate.linkedinSettings}
      </Link>
    </GateCard>
  );
}
