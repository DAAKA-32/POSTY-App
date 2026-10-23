"use client";

/**
 * StrategistWorkspace — Posty Stratège as its own environment.
 *
 * Rendered by app/(app)/app/strategist/page.tsx inside the shared app shell:
 * same sidebar, but the Strategist's own backdrop and no post-studio chrome.
 * It is a page, not a panel: a full-width bar (identity, Strategy |
 * Conversation tabs, settings, back to Posty Post) over the active view —
 *   plan      the guided journey (journey/StrategistJourney), the default
 *   chat      the advisor conversation
 *   settings  editorial line + autonomous mode
 * Each view sets its own reading measure; all share the `--st-*` tokens and
 * the type roles of ./type.ts.
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
import { useJourneyCopy } from "@/lib/strategist/journey-copy";
import { ease } from "@/lib/motion";
import StrategistChatPanel from "./StrategistChatPanel";
import StrategistSettingsView from "./StrategistSettingsView";
import StrategistMark from "./StrategistMark";
import StrategistActivePill from "./StrategistActivePill";
import { useStrategistSession } from "./StrategistSession";
import StrategistJourney from "./journey/StrategistJourney";
import { IconButton, Spinner, focusRing } from "./ui";
import { type } from "./type";

const PANEL_ID = "strategist-panel";
const TABS = ["plan", "chat"] as const;

export default function StrategistWorkspace() {
  const eligibility = useStrategistEligibility();
  const { view } = useStrategistSession();
  const reduced = useReducedMotion();
  const ok = eligibility.reason === "ok";

  return (
    // The workspace IS the page: no card, no own background — the shell paints
    // the Strategist backdrop (posty-soft-strategist) behind the whole route,
    // sidebar included. A short fade + 6px rise marks the change of section.
    <motion.section
      aria-labelledby="strategist-title"
      initial={reduced ? false : { opacity: 0.6, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: ease.enter }}
      className="st-type flex h-full min-h-0 w-full flex-col"
    >
      <WorkspaceBar showActions={ok} />
      <div id={PANEL_ID} role={ok ? "tabpanel" : undefined} className="flex flex-1 min-h-0 flex-col">
        {eligibility.reason === "loading" ? (
          <div className="flex-1 flex items-center justify-center text-st-ink-3" role="status" aria-label="…">
            <Spinner className="h-5 w-5" />
          </div>
        ) : eligibility.reason === "no-access" ? (
          <StrategistTeaser />
        ) : eligibility.reason === "no-linkedin" ? (
          <StrategistLinkedInRequired />
        ) : view === "settings" ? (
          <StrategistSettingsView />
        ) : view === "chat" ? (
          <StrategistChatPanel />
        ) : (
          <StrategistJourney />
        )}
      </div>
    </motion.section>
  );
}

// ── Workspace bar ─────────────────────────────────────────────────────────
// One hairline bar. Desktop: identity · Strategy | Conversation · settings,
// back to Posty Post. Phones: the navbar above already says "Posty
// Stratège", so the bar is just the two tabs and the settings.
// A plain <div>, not <header>: light mode force-paints every <header> white.

function WorkspaceBar({ showActions }: { showActions: boolean }) {
  const { c } = useStrategistCopy();
  const { j } = useJourneyCopy();
  const { view, setView, messages, newChat } = useStrategistSession();
  const reduced = useReducedMotion();
  const inSettings = view === "settings";

  return (
    <div className="relative z-10 shrink-0 border-b border-st-rule">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4 lg:gap-3 lg:px-6 [@media(max-height:700px)]:h-12">
        {/* Identity. On phones the navbar already reads "Posty Stratège", so
            the title is kept for screen readers only. */}
        <div className="flex min-w-0 items-center gap-2 max-lg:sr-only">
          <span aria-hidden className="st-btn-brand flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
            <StrategistMark className="h-6 w-6" />
          </span>
          <h1 id="strategist-title" className="truncate text-[15px] font-semibold tracking-[-0.01em] text-st-ink">
            {j.brand}
          </h1>
          <span className="ml-1 inline-flex">
            <StrategistActivePill />
          </span>
        </div>

        {showActions && (
          <div
            role="tablist"
            aria-label={j.tabsLabel}
            className="flex min-w-0 flex-1 rounded-xl bg-st-track p-1 sm:flex-none lg:absolute lg:left-1/2 lg:-translate-x-1/2"
          >
            {TABS.map((v) => {
              const selected = view === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={PANEL_ID}
                  onClick={() => setView(v)}
                  className={`no-min-size relative h-8 min-w-0 flex-1 rounded-[10px] px-4 text-[13.5px] transition-colors sm:flex-none ${focusRing} ${
                    selected ? "font-semibold text-st-ink" : "font-medium text-st-ink-2 hover:text-st-ink"
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="st-tab"
                      aria-hidden
                      className="absolute inset-0 rounded-[10px] bg-st-surface shadow-[0_1px_2px_rgba(16,24,40,0.08),0_0_0_1px_var(--st-rule)]"
                      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40 }}
                    />
                  )}
                  <span className="relative">{j.tabs[v]}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {showActions && view === "chat" && messages.length > 0 && (
            <IconButton label={c.newChat} onClick={newChat}>
              <SquarePen className="w-[18px] h-[18px]" />
            </IconButton>
          )}
          {showActions && (
            <IconButton
              label={inSettings ? j.closeSettings : j.settings}
              pressed={inSettings}
              onClick={() => setView(inSettings ? "plan" : "settings")}
              className={inSettings ? "bg-st-accent-wash !text-st-accent-ink" : ""}
            >
              <SlidersHorizontal className="w-[18px] h-[18px]" />
            </IconButton>
          )}
          {/* Desktop: an explicit way back to the other environment. On mobile
              the navbar's mode selector already does this. */}
          <Link
            href="/app"
            aria-label={c.backToPostAria}
            className={`ml-1 hidden h-9 items-center gap-1.5 rounded-lg pl-2 pr-3 text-[13px] font-medium text-st-ink-2 transition-colors hover:bg-st-track hover:text-st-ink lg:inline-flex ${focusRing}`}
          >
            <ArrowLeft aria-hidden className="w-4 h-4" />
            {c.postStudio}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Gate screens ──────────────────────────────────────────────────────────
// A static, inert preview sits behind the gate card (not a live chat panel:
// that used to run Firestore reads and leave focusable controls behind it).

function GatePreview() {
  return (
    <div aria-hidden inert className="flex-1 px-5 pt-10 select-none blur-[2px] opacity-70">
      <div className="mx-auto max-w-[720px] space-y-4">
        <div className="h-[3px] rounded-full bg-st-track" />
        <div className="h-7 w-2/3 rounded-lg bg-st-track" />
        <div className="h-4 w-5/6 rounded bg-st-track" />
        <div className="h-28 rounded-2xl border border-st-field-border" />
      </div>
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
        <div className="w-full max-w-sm rounded-2xl border border-st-rule bg-st-surface p-7 text-center shadow-[0_24px_48px_-24px_rgba(16,24,40,0.25)]">
          <p className={type.kicker}>{eyebrow}</p>
          <h2 className="mt-2.5 text-balance text-[20px] font-semibold leading-tight tracking-[-0.02em] text-st-ink">{title}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-st-ink-2">{desc}</p>
          <div className="mt-6 flex flex-col gap-2">{children}</div>
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
        className={`st-btn-brand inline-flex h-11 items-center justify-center rounded-xl px-4 text-[14px] font-semibold transition-[filter] ${focusRing}`}
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
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0A66C2] px-4 text-[14px] font-semibold text-white/100 transition-colors hover:bg-[#004182] ${focusRing}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
          <path d="M19 0H5a5 5 0 00-5 5v14a5 5 0 005 5h14a5 5 0 005-5V5a5 5 0 00-5-5zM8 19H5V8h3v11zM6.5 6.7a1.8 1.8 0 110-3.6 1.8 1.8 0 010 3.6zM20 19h-3v-5.6c0-1.4-.5-2.4-1.8-2.4-1 0-1.6.7-1.9 1.4-.1.2-.1.6-.1.9V19h-3V8h3v1.3c.4-.6 1.1-1.5 2.7-1.5 2 0 3.5 1.3 3.5 4.1V19z" />
        </svg>
        {c.gate.linkedinCta}
      </button>
      <Link
        href="/settings"
        className={`inline-flex h-10 items-center justify-center rounded-lg text-[13px] text-st-ink-2 underline-offset-4 hover:text-st-ink hover:underline ${focusRing}`}
      >
        {c.gate.linkedinSettings}
      </Link>
    </GateCard>
  );
}
