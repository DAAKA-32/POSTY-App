"use client";

/**
 * StrategistAutonomousPanel — "Autonomous mode", inside the Settings view.
 *
 * The weekly job used to switch ON with a single tap of the whole row (and
 * "generate now" only existed once it was on). Now: pick the day and the
 * number of posts, then an explicit "Turn on" button. "Generate the plan now"
 * is always available and lands in the conversation. Posts-per-week is a
 * −/+ stepper (one save per step, 44px targets) instead of a slider that wrote
 * to Firestore on every tick. Dates follow the UI language.
 */

import { useEffect, useId, useState } from "react";
import { Minus, Plus, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStrategistCopy } from "@/lib/strategist/copy";
import { nextRunDate } from "@/lib/strategist/next-run";
import toast from "@/components/ui/Toast";
import type { AutonomousStrategistConfig } from "@/types";
import { useStrategistSession } from "./StrategistSession";
import { Button, focusRing } from "./ui";

const MIN_COUNT = 3;
const MAX_COUNT = 10;
type Day = AutonomousStrategistConfig["dayOfWeek"];

export default function StrategistAutonomousPanel() {
  const { c, lang } = useStrategistCopy();
  const S = c.settings;
  const { user } = useAuth();
  const { autonomous, patchAutonomous, send, setView, busy } = useStrategistSession();
  const ids = { day: useId(), count: useId(), prompt: useId() };

  // Founder-only: roomier custom prompt with a live counter (kept as before).
  const isFounder = (user?.email || "").toLowerCase() === "emilien.nepveu@gmail.com";
  const promptMax = isFounder ? 2000 : 400;

  const enabled = !!autonomous?.enabled;
  const [day, setDay] = useState<Day>((autonomous?.dayOfWeek ?? 1) as Day);
  const [count, setCount] = useState(autonomous?.count ?? 5);
  const [prompt, setPrompt] = useState(autonomous?.customPrompt ?? "");
  useEffect(() => {
    if (!autonomous) return;
    setDay((autonomous.dayOfWeek ?? 1) as Day);
    setCount(autonomous.count ?? 5);
    setPrompt(autonomous.customPrompt ?? "");
  }, [autonomous]);

  const persist = async (patch: Partial<AutonomousStrategistConfig>) => {
    if (!enabled) return true; // not on yet: kept locally until "Turn on"
    const ok = await patchAutonomous(patch);
    if (!ok) toast.error(S.saveFail);
    return ok;
  };

  const turnOn = async () => {
    const ok = await patchAutonomous({ enabled: true, dayOfWeek: day, count, customPrompt: prompt.trim() });
    if (ok) toast.success(S.activated);
    else toast.error(S.saveFail);
  };
  const turnOff = async () => {
    const ok = await patchAutonomous({ enabled: false });
    if (ok) toast.success(S.deactivated);
    else toast.error(S.saveFail);
  };

  const generateNow = () => {
    const sourcePrompt =
      prompt.trim() ||
      (lang === "fr"
        ? `Prépare un plan éditorial cohérent de ${count} posts LinkedIn pour la semaine à venir.`
        : `Prepare a coherent editorial plan of ${count} LinkedIn posts for the week ahead.`);
    setView("chat");
    send(sourcePrompt, { intent: { kind: "plan", count, period: "week" }, display: S.generateNow });
  };

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const nextRun = nextRunDate(day).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  const lastMs = (autonomous?.lastTriggeredAt as { toMillis?: () => number } | undefined)?.toMillis?.();
  const lastRun = typeof lastMs === "number"
    ? new Date(lastMs).toLocaleDateString(locale, { day: "numeric", month: "long" })
    : S.none;

  const field =
    "w-full rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-elevated px-3 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25";

  return (
    <section aria-labelledby="strategist-autonomous" className="space-y-4">
      <div>
        <h3 id="strategist-autonomous" className="text-[16px] font-semibold text-gray-900 dark:text-white">
          {S.autonomousTitle}
        </h3>
        <p className="mt-1 text-[14px] text-gray-600 dark:text-gray-300">{S.autonomousDesc}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={ids.day} className="block mb-1.5 text-[14px] font-medium text-gray-900 dark:text-white">
            {S.day}
          </label>
          <select
            id={ids.day}
            value={day}
            onChange={(e) => {
              const d = Number(e.target.value) as Day;
              setDay(d);
              void persist({ dayOfWeek: d });
            }}
            className={`${field} capitalize`}
            style={{ fontSize: "max(16px, 1rem)" }}
          >
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <option key={d} value={d}>
                {S.days[d].charAt(0).toUpperCase() + S.days[d].slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p id={ids.count} className="mb-1.5 text-[14px] font-medium text-gray-900 dark:text-white">
            {S.count}
          </p>
          <div role="group" aria-labelledby={ids.count} className="flex items-center gap-2">
            <button
              type="button"
              aria-label="−"
              disabled={count <= MIN_COUNT}
              onClick={() => {
                const n = Math.max(MIN_COUNT, count - 1);
                setCount(n);
                void persist({ count: n });
              }}
              className={`w-11 h-11 inline-flex items-center justify-center rounded-xl border border-gray-300 dark:border-dark-border text-gray-800 dark:text-gray-100 disabled:opacity-40 ${focusRing}`}
            >
              <Minus aria-hidden className="w-4 h-4" />
            </button>
            <output aria-live="polite" className="w-10 text-center text-[17px] font-semibold tabular-nums text-gray-900 dark:text-white">
              {count}
            </output>
            <button
              type="button"
              aria-label="+"
              disabled={count >= MAX_COUNT}
              onClick={() => {
                const n = Math.min(MAX_COUNT, count + 1);
                setCount(n);
                void persist({ count: n });
              }}
              className={`w-11 h-11 inline-flex items-center justify-center rounded-xl border border-gray-300 dark:border-dark-border text-gray-800 dark:text-gray-100 disabled:opacity-40 ${focusRing}`}
            >
              <Plus aria-hidden className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={ids.prompt} className="block mb-1.5 text-[14px] font-medium text-gray-900 dark:text-white">
          {S.prompt}
        </label>
        <textarea
          id={ids.prompt}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={() => void persist({ customPrompt: prompt.trim() })}
          rows={2}
          maxLength={promptMax}
          placeholder={S.promptPlaceholder}
          className={`${field} resize-y`}
          style={{ fontSize: "max(16px, 1rem)" }}
        />
        {isFounder && (
          <p className="mt-1 text-right text-[12px] tabular-nums text-gray-600 dark:text-gray-400">
            {prompt.length} / {promptMax}
          </p>
        )}
      </div>

      {enabled && (
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 dark:border-dark-border px-3 py-2.5">
            <dt className="text-[12px] text-gray-600 dark:text-gray-400">{S.nextPlan}</dt>
            <dd className="mt-0.5 text-[14px] font-medium text-gray-900 dark:text-white first-letter:uppercase">{nextRun}</dd>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-dark-border px-3 py-2.5">
            <dt className="text-[12px] text-gray-600 dark:text-gray-400">{S.lastPlan}</dt>
            <dd className="mt-0.5 text-[14px] font-medium text-gray-900 dark:text-white">{lastRun}</dd>
          </div>
        </dl>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {enabled ? (
          <Button variant="ghost" onClick={turnOff}>
            {S.deactivate}
          </Button>
        ) : (
          <Button variant="primary" onClick={turnOn}>
            {S.activate}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={generateNow}
          disabled={busy}
          icon={<Sparkles aria-hidden className="w-4 h-4 text-amber-700 dark:text-amber-400" />}
        >
          {busy ? S.generating : S.generateNow}
        </Button>
      </div>
    </section>
  );
}
