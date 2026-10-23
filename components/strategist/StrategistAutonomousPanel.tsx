"use client";

/**
 * StrategistAutonomousPanel — "Autonomous mode", inside the Settings view.
 *
 * The weekly job used to switch ON with a single tap of the whole row (and
 * "generate now" only existed once it was on). Now: pick the day and the
 * number of posts, then an explicit "Turn on" button. "Generate the plan now"
 * is always available and lands in the conversation. Posts-per-week is a
 * −/+ stepper (one save per step, 44px targets) instead of a slider that wrote
 * to Firestore on every tick; the day is a 7-segment control instead of a
 * native select. Dates follow the UI language.
 */

import { useEffect, useId, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStrategistCopy } from "@/lib/strategist/copy";
import { useJourneyCopy } from "@/lib/strategist/journey-copy";
import { nextRunDate } from "@/lib/strategist/next-run";
import toast from "@/components/ui/Toast";
import type { AutonomousStrategistConfig } from "@/types";
import { useStrategistSession } from "./StrategistSession";
import { Button } from "./ui";
import { FieldLabel, Segmented, Stepper } from "./fields";
import { type } from "./type";

const MIN_COUNT = 3;
const MAX_COUNT = 10;
type Day = AutonomousStrategistConfig["dayOfWeek"];
/** Monday first, Sunday last. */
const WEEK: Day[] = [1, 2, 3, 4, 5, 6, 0] as Day[];

export default function StrategistAutonomousPanel() {
  const { c, lang } = useStrategistCopy();
  const { j } = useJourneyCopy();
  const S = c.settings;
  const { user } = useAuth();
  const { autonomous, patchAutonomous, send, setView, busy } = useStrategistSession();
  const promptId = useId();

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
  // Short weekday names in the UI language ("lun.", "Mon") from a known week
  // (2024-01-07 was a Sunday, so 7 + d is weekday d).
  const shortDay = (d: number) => new Date(2024, 0, 7 + d).toLocaleDateString(locale, { weekday: "short" });
  const fullDay = (d: number) => S.days[d].charAt(0).toUpperCase() + S.days[d].slice(1);

  return (
    <section aria-labelledby="strategist-autonomous" className="space-y-[var(--st-s3)]">
      <div>
        <div className="flex items-center gap-2.5">
          <h3 id="strategist-autonomous" className="text-[19px] font-semibold tracking-[-0.015em] text-st-ink">
            {S.autonomousTitle}
          </h3>
          <span
            className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[12px] font-medium ${
              enabled ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-st-track text-st-ink-3"
            }`}
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-600 dark:bg-emerald-400" : "bg-[color:var(--st-ink-3)]"}`} />
            {enabled ? c.active : j.autonomousInactive}
          </span>
        </div>
        <p className={`st-hide-low mt-1 ${type.help} !text-[14px]`}>{S.autonomousDesc}</p>
      </div>

      <Segmented
        label={S.day}
        block
        dense
        options={WEEK.map((d) => ({ value: d, label: shortDay(d), title: fullDay(d), ariaLabel: fullDay(d) }))}
        value={day}
        onSelect={(d) => {
          if (d === undefined) return;
          setDay(d);
          void persist({ dayOfWeek: d });
        }}
      />

      <Stepper
        label={S.count}
        value={count}
        min={MIN_COUNT}
        max={MAX_COUNT}
        fewerLabel="−"
        moreLabel="+"
        onChange={(n) => {
          setCount(n);
          void persist({ count: n });
        }}
      />

      <div>
        <FieldLabel
          htmlFor={promptId}
          label={S.prompt}
          aside={
            isFounder ? (
              <span className={type.meta}>
                {prompt.length} / {promptMax}
              </span>
            ) : undefined
          }
        />
        <textarea
          id={promptId}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={() => void persist({ customPrompt: prompt.trim() })}
          rows={2}
          maxLength={promptMax}
          placeholder={S.promptPlaceholder}
          className="st-field block resize-y"
        />
      </div>

      {enabled && (
        <dl className="border-t border-st-rule">
          {[
            [S.nextPlan, nextRun],
            [S.lastPlan, lastRun],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-st-rule py-2.5">
              <dt className={type.help}>{k}</dt>
              <dd className="text-right text-[14px] font-medium text-st-ink first-letter:uppercase">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-col gap-2">
        {enabled ? (
          <Button variant="secondary" onClick={turnOff} block>
            {S.deactivate}
          </Button>
        ) : (
          <Button variant="primary" onClick={turnOn} block>
            {S.activate}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={generateNow}
          disabled={busy}
          block
          icon={<Sparkles aria-hidden className="w-4 h-4 text-st-accent-ink" />}
        >
          {busy ? S.generating : S.generateNow}
        </Button>
      </div>
    </section>
  );
}
