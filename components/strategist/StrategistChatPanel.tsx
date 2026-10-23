"use client";

/**
 * StrategistChatPanel — the Conversation view: an opening screen (what the
 * Strategist does + one clear first action) and the conversation thread, on
 * the same reading measure as the journey. All state lives in the session
 * (StrategistSession) so it survives a switch to the post studio.
 */

import { useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Bot, CalendarDays, ChevronRight, History, Lightbulb, PenLine, Search } from "lucide-react";
import { useStrategistCopy, type StrategistCopy } from "@/lib/strategist/copy";
import { useJourneyCopy } from "@/lib/strategist/journey-copy";
import StrategistMessageBubble from "./StrategistMessageBubble";
import StrategistComposer from "./StrategistComposer";
import BatchPlanCard from "./BatchPlanCard";
import { useStrategistSession, type StrategistMsg } from "./StrategistSession";
import { PlanSkeleton, Spinner, focusRing, textAction } from "./ui";
import { MEASURE, type } from "./type";

export default function StrategistChatPanel() {
  const { messages } = useStrategistSession();
  const reduced = useReducedMotion();
  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AnimatePresence mode="wait" initial={false}>
        {isEmpty ? (
          <motion.section
            key="hero"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex-1 overflow-y-auto overscroll-contain"
          >
            <Hero />
          </motion.section>
        ) : (
          <motion.section
            key="thread"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <Thread />
          </motion.section>
        )}
      </AnimatePresence>
      <StrategistComposer />
    </div>
  );
}

// ── Opening screen ──────────────────────────────────────────────────────────

function Hero() {
  const { c } = useStrategistCopy();
  const { j } = useJourneyCopy();
  const { send, requestPrefill, lastPlan, openLastPlan, autonomous, setView } = useStrategistSession();

  const suggestions = [
    {
      icon: <PenLine className="w-[18px] h-[18px]" />,
      title: c.hero.writePostTitle,
      desc: c.hero.writePostDesc,
      onClick: () => requestPrefill(c.hero.writePostPrefill),
    },
    {
      icon: <Lightbulb className="w-[18px] h-[18px]" />,
      title: c.hero.ideasTitle,
      desc: c.hero.ideasDesc,
      onClick: () => send(c.hero.ideasPrompt, { intent: { kind: "chat" } }),
    },
    {
      icon: <Search className="w-[18px] h-[18px]" />,
      title: c.hero.auditTitle,
      desc: c.hero.auditDesc,
      onClick: () => send(c.hero.auditPrompt, { intent: { kind: "chat" } }),
    },
  ];

  const dayName = autonomous ? c.settings.days[autonomous.dayOfWeek ?? 1] : "";

  // One screen above the composer: spacing follows the density tokens and
  // the secondary lines step aside on short screens instead of scrolling.
  return (
    <div className={`${MEASURE} px-5 sm:px-8 lg:px-0 pt-[clamp(14px,3dvh,28px)] lg:pt-[clamp(20px,6dvh,72px)] [@media(max-height:660px)]:pt-2 pb-[var(--st-s2)]`}>
      <p className={type.kicker}>{j.chatKicker}</p>
      <h2 className={`mt-2 ${type.display}`}>{c.hero.title}</h2>
      <p className={`st-hide-short st-hide-compact mt-2 max-w-[56ch] ${type.lede}`}>{c.hero.subtitle}</p>

      {/* The one primary action. */}
      <button
        type="button"
        onClick={() => send(c.hero.primaryPrompt, { intent: { kind: "plan", count: 5, period: "week" } })}
        className={`st-btn-brand group mt-[var(--st-s4)] flex w-full items-center gap-4 rounded-2xl px-4 py-[clamp(10px,1.8dvh,16px)] text-left transition-[filter,transform] active:scale-[0.99] sm:px-5 ${focusRing}`}
      >
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <CalendarDays className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15.5px] font-semibold tracking-[-0.01em]">{c.hero.primaryTitle}</span>
          <span className="st-hide-tight st-hide-compact mt-0.5 block text-[13px] opacity-90">{c.hero.primaryDesc}</span>
        </span>
        <ArrowRight aria-hidden className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </button>

      <p className={`mt-[var(--st-s4)] mb-[var(--st-s1)] ${type.kicker} !text-st-ink-3`}>{c.hero.more}</p>
      <ul className="border-t border-st-rule">
        {suggestions.map((s) => (
          <li key={s.title} className="border-b border-st-rule">
            <button
              type="button"
              onClick={s.onClick}
              className={`group -mx-2 flex w-[calc(100%+16px)] items-center gap-3.5 rounded-xl px-2 py-[clamp(8px,1.5dvh,13px)] text-left transition-colors hover:bg-st-track ${focusRing}`}
            >
              <span aria-hidden className="shrink-0 text-st-accent-ink">{s.icon}</span>
              <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-3">
                <span className={`block ${type.label}`}>{s.title}</span>
                <span className={`st-hide-short st-hide-compact block truncate ${type.help}`}>{s.desc}</span>
              </span>
              <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-st-ink-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          </li>
        ))}
      </ul>

      {/* Secondary: latest plan + autonomous mode. */}
      <div className="mt-[var(--st-s3)] flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
        {lastPlan && (
          <p className={`flex min-w-0 items-center gap-2 ${type.help}`}>
            <History aria-hidden className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">
              {c.hero.lastPlan} · <span className="text-st-ink-2">{lastPlan.theme}</span>
            </span>
            <button type="button" onClick={openLastPlan} className={`shrink-0 no-min-size ${textAction}`}>
              {c.hero.resume}
            </button>
          </p>
        )}
        <p className={`flex min-w-0 items-center gap-2 ${type.help}`}>
          <Bot aria-hidden className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">
            {autonomous?.enabled ? c.hero.autonomousOn(dayName, autonomous.count ?? 5) : c.hero.autonomousOff}
          </span>
          <button type="button" onClick={() => setView("settings")} className={`shrink-0 no-min-size ${textAction}`}>
            {c.hero.configure}
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Thread ──────────────────────────────────────────────────────────────────

function Thread() {
  const { messages, busy, announcement, regenerate, turnIntoPlan, updateBatch } = useStrategistSession();
  const { c } = useStrategistCopy();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const lastCountRef = useRef(0);
  const reduced = useReducedMotion();

  // Follow the stream only while the reader is at the bottom; a new plan card
  // is brought in by its TOP so the reader starts at its header.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const countChanged = messages.length !== lastCountRef.current;
    lastCountRef.current = messages.length;
    const last = messages[messages.length - 1];
    if (last?.batch && countChanged === false) {
      // Placeholder just turned into a plan → scroll to the card's top.
      const node = el.querySelector<HTMLElement>(`[data-msg="${last.id}"]`);
      if (node) {
        el.scrollTo({ top: node.offsetTop - 12, behavior: reduced ? "auto" : "smooth" });
        stickRef.current = false;
        return;
      }
    }
    if (countChanged) stickRef.current = true;
    if (stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, reduced]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  let lastAnswerId: string | null = null;
  if (!busy) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && !m.batch && !m.pending && !m.streaming && m.content) {
        lastAnswerId = m.id;
        break;
      }
      if (m.role === "user") break;
    }
  }

  return (
    <>
      <div ref={scrollRef} role="log" aria-busy={busy} aria-label={c.title} className="relative flex-1 overflow-y-auto overscroll-contain">
        <div className={`${MEASURE} space-y-6 py-6 sm:px-3 lg:px-0`}>
          {messages.map((m) => (
            <div key={m.id} data-msg={m.id}>
              <MessageRow
                m={m}
                c={c}
                isLastAnswer={m.id === lastAnswerId}
                onRegenerate={regenerate}
                onTurnIntoPlan={() => turnIntoPlan(m.id)}
                onBatchChange={updateBatch}
              />
            </div>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}

function MessageRow({
  m,
  c,
  isLastAnswer,
  onRegenerate,
  onTurnIntoPlan,
  onBatchChange,
}: {
  m: StrategistMsg;
  c: StrategistCopy;
  isLastAnswer: boolean;
  onRegenerate: () => void;
  onTurnIntoPlan: () => void;
  onBatchChange: Parameters<typeof BatchPlanCard>[0]["onChange"];
}) {
  if (m.pending === "plan" || m.pending === "post") {
    return <PlanLoading kind={m.pending} c={c} />;
  }
  if (m.batch) {
    return (
      <div className="space-y-3">
        <p className="px-5 text-[15px] leading-[1.6] text-st-ink-2">{m.content}</p>
        <div className="px-3 sm:px-4">
          <BatchPlanCard batch={m.batch} onChange={onBatchChange} />
        </div>
      </div>
    );
  }
  return (
    <StrategistMessageBubble
      role={m.role}
      content={m.content}
      isStreaming={m.pending === "chat" || !!m.streaming}
      showActions={isLastAnswer}
      onRegenerate={onRegenerate}
      onTurnIntoPlan={onTurnIntoPlan}
    />
  );
}

function PlanLoading({ kind, c }: { kind: "plan" | "post"; c: StrategistCopy }) {
  return (
    <div className="px-5" role="status">
      <p className={`flex items-center gap-2.5 ${type.option}`}>
        <Spinner className="h-4 w-4 text-st-accent-ink" />
        {kind === "post" ? c.thread.postLoading : c.thread.planLoading}
      </p>
      <p className={`mt-1 ${type.help}`}>{c.thread.planLoadingDetail}</p>
      <div className="mt-4">
        <PlanSkeleton rows={kind === "post" ? 1 : 3} />
      </div>
    </div>
  );
}
