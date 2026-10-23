"use client";

/**
 * The body of each journey step. Every step edits the same answers
 * (useJourney) with the editorial fields the Settings view uses
 * (components/strategist/editorial), so the editorial line looks the same
 * wherever it is edited.
 */

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useStrategistCopy } from "@/lib/strategist/copy";
import { useJourneyCopy } from "@/lib/strategist/journey-copy";
import { COUNT_MIN, FOCUS_MAX, countMax, type JourneyStep, type StepIssue } from "@/lib/strategist/journey";
import { stepSwap } from "@/lib/motion";
import { FieldLabel, Segmented, Stepper } from "../fields";
import { focusRing, textAction } from "../ui";
import { type } from "../type";
import { AudienceField, BusinessField } from "../editorial/TextFields";
import { FineTune, GoalPicker, OrientationPicker, TonePicker } from "../editorial/Choices";
import { useJourney } from "./JourneyState";

interface StepProps {
  issue: StepIssue | null;
  issueId: string;
  onSubmit: () => void;
}

export function StepBody({ step, ...props }: StepProps & { step: JourneyStep }) {
  switch (step) {
    case "activity":
      return <ActivityStep {...props} />;
    case "audience":
      return <AudienceStep {...props} />;
    case "goal":
      return <GoalStep />;
    case "style":
      return <StyleStep />;
    case "content":
      return <ContentStep />;
    case "review":
      return <ReviewStep />;
  }
}

// ─── 1. Business ─────────────────────────────────────────────────────────────

function ActivityStep({ issue, issueId, onSubmit }: StepProps) {
  const { answers, update } = useJourney();
  return (
    <BusinessField
      value={answers.context ?? ""}
      onChange={(context) => update({ context })}
      invalid={issue === "contextShort"}
      errorId={issueId}
      onSubmit={onSubmit}
    />
  );
}

// ─── 2. Audience ─────────────────────────────────────────────────────────────

function AudienceStep({ issue, issueId, onSubmit }: StepProps) {
  const { answers, update } = useJourney();
  return (
    <AudienceField
      value={answers.audience ?? ""}
      onChange={(audience) => update({ audience })}
      invalid={issue === "audienceShort"}
      errorId={issueId}
      onSubmit={onSubmit}
    />
  );
}

// ─── 3. Goal ─────────────────────────────────────────────────────────────────

function GoalStep() {
  const { j } = useJourneyCopy();
  const { answers, update } = useJourney();
  return (
    <div>
      <GoalPicker value={answers.objective} onChange={(objective) => update({ objective })} />
      <p className={`st-hide-short st-hide-compact mt-[var(--st-s2)] ${type.help}`}>{j.goal.optional}</p>
    </div>
  );
}

/** True on phones / portrait tablets and on short screens — where the four
 *  fine settings can't share one screen and are split in two pages. */
function useCompactFine(): boolean {
  const query = "(max-width: 1023px), (max-height: 820px)";
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.(query).matches === true,
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact;
}

// ─── 4. Tone & style ─────────────────────────────────────────────────────────

/**
 * Tone + angle first. "Fine settings" is a sub-view that slides in place of
 * them (not an accordion under them), so the step never outgrows the screen.
 */
function StyleStep() {
  const { j } = useJourneyCopy();
  const { answers, update } = useJourney();
  const reduced = useReducedMotion();
  const compact = useCompactFine();
  const [fineOpen, setFineOpen] = useState(false);
  const [finePage, setFinePage] = useState<0 | 1>(0);
  const fineId = useId();
  const fineCount = [answers.formality, answers.emotion, answers.hookStyle, answers.ctaIntensity].filter((v) => v !== undefined).length;
  const swap = (side: -1 | 1) => (reduced ? {} : stepSwap(side));

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!fineOpen ? (
        <motion.div key="main" {...swap(-1)} className="space-y-[var(--st-s3)]">
          <TonePicker value={answers.tone} onChange={(tone) => update({ tone })} />
          <OrientationPicker value={answers.orientation} onChange={(orientation) => update({ orientation })} />
          <button
            type="button"
            aria-expanded={false}
            aria-controls={fineId}
            onClick={() => setFineOpen(true)}
            className={`group -mx-2 flex w-[calc(100%+16px)] items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-st-track ${focusRing}`}
          >
            <span className="flex min-w-0 items-baseline gap-2">
              <span className={`shrink-0 ${type.label}`}>
                {j.style.fine}
                {fineCount > 0 && <span className="ml-1.5 font-normal text-st-accent-ink tabular-nums">· {fineCount}</span>}
              </span>
              <span className={`st-hide-short hidden min-w-0 truncate sm:block ${type.help}`}>{j.style.fineHint}</span>
            </span>
            <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-st-ink-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </motion.div>
      ) : (
        <motion.div key="fine" id={fineId} {...swap(1)}>
          <div className="mb-[var(--st-s3)] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setFineOpen(false)}
              aria-label={j.style.fineBack}
              className={`inline-flex shrink-0 items-center gap-1.5 text-[13.5px] ${textAction}`}
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              <span aria-hidden className="max-[400px]:hidden">{j.style.fineBack}</span>
            </button>
            {compact && (
              <Segmented
                label={j.style.finePagesLabel}
                labelHidden
                options={j.style.finePages.map((label, k) => ({ value: k as 0 | 1, label }))}
                value={finePage}
                onSelect={(v) => setFinePage(v ?? 0)}
              />
            )}
          </div>
          <FineTune value={answers} onChange={update} page={compact ? finePage : undefined} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── 5. Plan context ─────────────────────────────────────────────────────────

function ContentStep() {
  const { j } = useJourneyCopy();
  const { answers, update } = useJourney();
  const focusId = useId();
  const value = answers.focus ?? "";

  return (
    <div className="space-y-[var(--st-s3)]">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-[var(--st-s3)]">
        <Stepper
          label={j.content.count}
          value={answers.count}
          min={COUNT_MIN}
          max={countMax(answers.period)}
          onChange={(count) => update({ count })}
          fewerLabel={j.content.fewer}
          moreLabel={j.content.more}
          valueLabel={j.content.countAria(answers.count)}
        />
        <Segmented
          label={j.content.period}
          options={(["week", "month"] as const).map((p) => ({ value: p, label: j.content.periods[p] }))}
          value={answers.period}
          onSelect={(period) => period && update({ period })}
        />
      </div>

      <div>
        <FieldLabel
          htmlFor={focusId}
          label={j.content.focus}
          aside={
            <span className={type.meta}>
              {value.length}/{FOCUS_MAX}
            </span>
          }
        />
        <textarea
          id={focusId}
          value={value}
          onChange={(e) => update({ focus: e.target.value })}
          maxLength={FOCUS_MAX}
          placeholder={j.content.focusPlaceholder}
          className="st-field block h-[var(--st-textarea-sm-h)] resize-none"
        />
      </div>

      <p className={`st-hide-short st-hide-compact ${type.help}`}>{j.content.formatsNote}</p>
    </div>
  );
}

// ─── 6. Review ───────────────────────────────────────────────────────────────

/** The strategy as one sheet: label · answer · edit, on hairlines. */
function ReviewStep() {
  const { c } = useStrategistCopy();
  const { j } = useJourneyCopy();
  const { answers, goTo } = useJourney();
  const S = c.settings;

  const styleParts = [
    answers.tone ? S.tone[answers.tone as keyof typeof S.tone] : null,
    answers.orientation ? S.orientation[answers.orientation] : null,
    answers.hookStyle && answers.hookStyle !== "auto" ? S.hook[answers.hookStyle] : null,
    answers.ctaIntensity ? S.cta[answers.ctaIntensity] : null,
  ].filter((p): p is string => typeof p === "string" && !!p);

  const rows: { step: JourneyStep; value: string; extra?: string; lines: string }[] = [
    { step: "activity", value: answers.context ?? "", lines: "line-clamp-2 [@media(max-height:600px)]:line-clamp-1" },
    { step: "audience", value: answers.audience ?? "", lines: "line-clamp-1" },
    { step: "goal", value: answers.objective ? j.goal.options[answers.objective].title : j.review.notSet, lines: "line-clamp-1" },
    { step: "style", value: styleParts.length ? j.review.styleLine(styleParts) : j.review.notSet, lines: "line-clamp-1" },
    {
      step: "content",
      value: j.review.plan(answers.count, answers.period),
      extra: answers.focus?.trim() ? j.review.focusLine(answers.focus.trim()) : undefined,
      lines: "line-clamp-1",
    },
  ];

  return (
    <div>
      <dl className="border-t border-st-rule">
        {rows.map(({ step, value, extra, lines }) => {
          const unset = value === j.review.notSet;
          return (
            <div
              key={step}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-st-rule py-[var(--st-s2)] sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] sm:gap-x-6"
            >
              <dt className={`${type.kicker} !text-st-ink-3`}>{j.steps[step].label}</dt>
              <dd className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                <p className={`text-[15px] leading-[1.45] [@media(max-height:660px)]:text-[14px] ${unset ? "text-st-ink-3" : "text-st-ink"} ${lines}`}>{value}</p>
                {extra && <p className={`st-hide-short mt-0.5 line-clamp-1 ${type.help}`}>{extra}</p>}
              </dd>
              <button
                type="button"
                onClick={() => goTo(step)}
                aria-label={j.review.editAria(j.steps[step].label)}
                className={`col-start-2 row-start-1 -my-1 justify-self-end px-1.5 py-1 text-[13.5px] no-min-size sm:col-start-3 ${textAction}`}
              >
                {j.review.edit}
              </button>
            </div>
          );
        })}
      </dl>
      <p className={`st-hide-short st-hide-compact mt-[var(--st-s2)] ${type.help}`}>{j.review.saveNote}</p>
    </div>
  );
}
