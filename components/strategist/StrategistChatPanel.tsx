"use client";

/**
 * StrategistChatPanel — empty state (what the Strategist does + one clear
 * first action) and the conversation thread. All state lives in the session
 * (StrategistSession) so it survives the drawer closing.
 */

import { useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CalendarDays, ChevronRight, History, Lightbulb, PenLine, Search, Bot } from "lucide-react";
import { useStrategistCopy, type StrategistCopy } from "@/lib/strategist/copy";
import StrategistMessageBubble from "./StrategistMessageBubble";
import StrategistComposer from "./StrategistComposer";
import BatchPlanCard from "./BatchPlanCard";
import { useStrategistSession, type StrategistMsg } from "./StrategistSession";
import { focusRing } from "./ui";

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

// ── Empty state ─────────────────────────────────────────────────────────────

function Hero() {
  const { c } = useStrategistCopy();
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

  return (
    <div className="px-5 pt-7 pb-6 max-w-xl">
      <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-gray-900 dark:text-white">
        {c.hero.title}
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-gray-600 dark:text-gray-300">{c.hero.subtitle}</p>

      <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-gray-600 dark:text-gray-300" aria-label={c.hero.title}>
        {c.hero.steps.map((step, i) => (
          <li key={step} className="inline-flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-dark-elevated text-[12px] font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
              {i + 1}
            </span>
            {step}
            {i < c.hero.steps.length - 1 && <ChevronRight aria-hidden className="w-3.5 h-3.5 text-gray-400" />}
          </li>
        ))}
      </ol>

      {/* The one primary action */}
      <button
        type="button"
        onClick={() => send(c.hero.primaryPrompt, { intent: { kind: "plan", count: 5, period: "week" } })}
        className={`mt-6 w-full flex items-center gap-3 p-4 rounded-2xl text-left bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/25 hover:border-amber-300 dark:hover:border-amber-400/40 transition-colors ${focusRing}`}
      >
        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-400 text-gray-900 flex-shrink-0">
          <CalendarDays className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold text-gray-900 dark:text-white">{c.hero.primaryTitle}</span>
          <span className="block mt-0.5 text-[13px] text-gray-600 dark:text-gray-300">{c.hero.primaryDesc}</span>
        </span>
        <ChevronRight aria-hidden className="w-5 h-5 text-gray-500 flex-shrink-0" />
      </button>

      <p className="mt-6 mb-2 text-[13px] font-medium text-gray-600 dark:text-gray-300">{c.hero.more}</p>
      <ul className="rounded-2xl border border-gray-200 dark:border-dark-border divide-y divide-gray-200 dark:divide-dark-border overflow-hidden">
        {suggestions.map((s) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={s.onClick}
              className={`w-full flex items-center gap-3 px-4 min-h-[60px] py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors ${focusRing} focus-visible:ring-inset`}
            >
              <span className="text-amber-700 dark:text-amber-400 flex-shrink-0">{s.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-medium text-gray-900 dark:text-white">{s.title}</span>
                <span className="block text-[13px] text-gray-600 dark:text-gray-400">{s.desc}</span>
              </span>
              <ChevronRight aria-hidden className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
          </li>
        ))}
      </ul>

      {lastPlan && (
        <button
          type="button"
          onClick={openLastPlan}
          className={`mt-4 w-full flex items-center gap-3 px-4 min-h-[56px] py-3 rounded-2xl border border-gray-200 dark:border-dark-border text-left hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors ${focusRing}`}
        >
          <History aria-hidden className="w-[18px] h-[18px] text-gray-500 flex-shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-[12px] text-gray-600 dark:text-gray-400">{c.hero.lastPlan}</span>
            <span className="block text-[14px] font-medium text-gray-900 dark:text-white truncate">{lastPlan.theme}</span>
          </span>
          <span className="text-[13px] font-medium text-amber-800 dark:text-amber-300 flex-shrink-0">{c.hero.resume}</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => setView("settings")}
        className={`mt-4 w-full flex items-center gap-2 px-1 min-h-[44px] text-left text-[13px] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg ${focusRing}`}
      >
        <Bot aria-hidden className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 min-w-0 truncate">
          {autonomous?.enabled
            ? c.hero.autonomousOn(dayName, autonomous.count ?? 5)
            : c.hero.autonomousOff}
        </span>
        <span className="font-medium text-gray-900 dark:text-white underline-offset-4 hover:underline flex-shrink-0">
          {c.hero.configure}
        </span>
      </button>
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
      if (m.role === "assistant" && !m.batch && !m.pending && m.content) {
        lastAnswerId = m.id;
        break;
      }
      if (m.role === "user") break;
    }
  }

  return (
    <>
      <div
        ref={scrollRef}
        role="log"
        aria-busy={busy}
        aria-label={c.title}
        className="flex-1 overflow-y-auto overscroll-contain py-5 space-y-5"
      >
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
        <p className="px-5 text-[14px] leading-relaxed text-gray-700 dark:text-gray-200">{m.content}</p>
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
      isStreaming={m.pending === "chat"}
      showActions={isLastAnswer}
      onRegenerate={onRegenerate}
      onTurnIntoPlan={onTurnIntoPlan}
    />
  );
}

function PlanLoading({ kind, c }: { kind: "plan" | "post"; c: StrategistCopy }) {
  return (
    <div className="px-5" role="status">
      <p className="flex items-center gap-2 text-[14px] font-medium text-gray-800 dark:text-gray-100">
        <span className="w-4 h-4 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin motion-reduce:animate-none" aria-hidden />
        {kind === "post" ? c.thread.postLoading : c.thread.planLoading}
      </p>
      <p className="mt-1 text-[13px] text-gray-600 dark:text-gray-400">{c.thread.planLoadingDetail}</p>
      <div aria-hidden className="mt-3 rounded-2xl border border-gray-200 dark:border-dark-border p-4 space-y-3">
        {[0, 1, 2].slice(0, kind === "post" ? 1 : 3).map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-24 rounded bg-gray-100 dark:bg-dark-elevated animate-pulse motion-reduce:animate-none" />
            <div className="h-3.5 w-[85%] rounded bg-gray-100 dark:bg-dark-elevated animate-pulse motion-reduce:animate-none" />
            <div className="h-3 w-[60%] rounded bg-gray-100 dark:bg-dark-elevated animate-pulse motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
