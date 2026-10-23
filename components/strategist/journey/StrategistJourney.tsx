"use client";

/**
 * StrategistJourney — the guided path of the Strategist workspace.
 *
 * One centred sheet, one reading measure (720px), no side rail:
 *
 *   progress   six segments, the width of the sheet
 *   kicker     "STEP 03 · GOAL"
 *   title      the question, in display type
 *   lede       why it matters
 *   body       the answer
 *   actions    desktop: right under the body, on a hairline — the button
 *              sits next to what it validates. Phones: pinned to the bottom
 *              (thumb zone, above the keyboard and the home indicator).
 *
 * The title keeps the same place from one step to the next; only the
 * content under it changes. The page itself never scrolls; the sheet only
 * does when a very small screen or the keyboard leaves too little room.
 * Blocked steps say why instead of greying the button out.
 */

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useJourneyCopy } from "@/lib/strategist/journey-copy";
import { JOURNEY_STEPS, stepIndex, type StepIssue } from "@/lib/strategist/journey";
import { dur, ease } from "@/lib/motion";
import { useStrategistSession } from "../StrategistSession";
import { Button, IconButton, PlanSkeleton, Spinner, textAction } from "../ui";
import { MEASURE, type } from "../type";
import { useJourney } from "./JourneyState";
import JourneyProgress from "./JourneyProgress";
import { StepBody } from "./JourneySteps";
import JourneyResult from "./JourneyResult";

/** Seconds since `active` became true (0 while inactive). */
function useElapsed(active: boolean): number {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!active) {
      setS(0);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => setS(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return s;
}

/** Sheet measure + side gutters, shared by the progress, the step and the bar. */
const SHEET = `${MEASURE} px-5 sm:px-8 lg:px-0`;

export default function StrategistJourney() {
  const { j } = useJourneyCopy();
  const journey = useJourney();
  const { ready, step, phase, status, error, answers, next, back, generate, cancel, showResult } = journey;
  const { lastPlan } = useStrategistSession();
  const reduced = useReducedMotion();
  const issueId = useId();
  // The lede steps aside on short phones; screen readers still get it with the title.
  const ledeId = useId();
  const [issue, setIssue] = useState<StepIssue | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const prevIdx = useRef(stepIndex(step));
  const [dir, setDir] = useState<1 | -1>(1);
  const mounted = useRef(false);

  const i = stepIndex(step);
  const n = JOURNEY_STEPS.length;
  const generating = status === "generating";
  const elapsed = useElapsed(generating);

  // New step or result: move focus to its title (screen readers + keyboard
  // users land on what changed) and announce it. Not on the first render.
  useEffect(() => {
    setDir(i >= prevIdx.current ? 1 : -1);
    prevIdx.current = i;
    setIssue(null);
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setAnnouncement(phase === "result" ? j.result.title : j.announce(i + 1, n, j.steps[step].label));
    requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step, phase, i, n, j]);

  // An answer that fixes the problem clears the message.
  useEffect(() => {
    if (issue) setIssue(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers.context, answers.audience]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-st-ink-3" role="status" aria-label="…">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="st-type flex flex-1 min-h-0 flex-col">
        <JourneyResult ref={titleRef} />
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </div>
    );
  }

  const onNext = () => {
    const blocked = next();
    setIssue(blocked);
    if (blocked) {
      requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    }
  };

  const copy = j.steps[step];
  const slowMsg = elapsed >= 45 ? j.generating.verySlow : elapsed >= 25 ? j.generating.slow : j.generating.detail;
  const isReview = step === "review";

  // One stagger for the step's text: kicker → title → lede → body.
  const rise = (k: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, x: 10 * dir },
          animate: { opacity: 1, x: 0, transition: { duration: dur.base, ease: ease.enter, delay: 0.03 * k } },
        };

  const primary = generating ? (
    <Button variant="secondary" onClick={cancel}>
      {j.actions.cancel}
    </Button>
  ) : isReview ? (
    <Button variant="brand" icon={<Sparkles aria-hidden className="h-4 w-4" />} onClick={generate} className="max-lg:flex-1">
      {status === "error" ? j.actions.retry : j.review.generate}
    </Button>
  ) : (
    <Button variant="primary" onClick={onNext} className="max-lg:flex-1">
      {j.actions.next}
      <ArrowRight aria-hidden className="h-4 w-4" />
    </Button>
  );
  const canGoBack = i > 0 && !generating;

  return (
    <div className="st-type flex flex-1 min-h-0 flex-col">
      <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className={`${SHEET} pt-3 lg:pt-[clamp(20px,4.5dvh,44px)] pb-[var(--st-s3)]`}>
          <JourneyProgress />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              exit={reduced ? undefined : { opacity: 0, x: -8 * dir, transition: { duration: dur.instant, ease: ease.exit } }}
              className="pt-[clamp(14px,3dvh,28px)] lg:pt-[clamp(20px,5.5dvh,64px)] [@media(max-height:660px)]:pt-3"
            >
              <motion.p {...rise(0)} className={type.kicker}>
                {j.kicker(i + 1, copy.label)}
              </motion.p>
              <motion.h2 {...rise(1)} ref={titleRef} tabIndex={-1} aria-describedby={ledeId} className={`mt-2 ${type.display} focus:outline-none`}>
                {copy.title}
              </motion.h2>
              <motion.p {...rise(2)} id={ledeId} className={`st-hide-short st-hide-compact mt-2 max-w-[52ch] ${type.lede}`}>
                {copy.why}
              </motion.p>

              <motion.div {...rise(3)} className="mt-[var(--st-s4)]">
                {generating ? (
                  <Generating count={answers.count} message={slowMsg} />
                ) : (
                  <StepBody step={step} issue={issue} issueId={issueId} onSubmit={onNext} />
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {issue && (
            <p id={issueId} role="alert" className="mt-[var(--st-s2)] flex items-start gap-2 text-[13.5px] leading-snug text-red-700 dark:text-red-300">
              <AlertCircle aria-hidden className="mt-px h-4 w-4 shrink-0" />
              {j.issues[issue]}
            </p>
          )}

          {isReview && status === "error" && error && (
            <div role="alert" className="mt-[var(--st-s3)] flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/90 dark:bg-red-500/10 px-4 py-3 text-[13.5px] leading-snug text-red-800 dark:text-red-200">
              <AlertCircle aria-hidden className="mt-px h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {isReview && !generating && lastPlan && (
            <button type="button" onClick={() => showResult(lastPlan)} className={`mt-[var(--st-s3)] text-[13.5px] ${textAction}`}>
              {j.review.resume}
            </button>
          )}

          {/* Desktop actions: in the flow, on a hairline, right under the step. */}
          <div className="mt-[var(--st-s4)] hidden items-center gap-3 border-t border-st-rule pt-[var(--st-s3)] lg:flex">
            {canGoBack && (
              <Button variant="ghost" icon={<ArrowLeft aria-hidden className="h-4 w-4" />} onClick={back} className="-ml-3">
                {j.actions.back}
              </Button>
            )}
            <span className="ml-auto" />
            {primary}
          </div>
        </div>
      </div>

      {/* Phone / tablet actions: pinned, outside the scrolling sheet. */}
      <div className="shrink-0 border-t border-st-rule lg:hidden">
        <div className={`${SHEET} flex items-center gap-2 pt-2.5 pb-[max(env(safe-area-inset-bottom),10px)] [@media(max-height:620px)]:pt-2 [@media(max-height:620px)]:pb-2`}>
          {canGoBack && (
            <IconButton label={j.actions.back} onClick={back} className="st-select !rounded-xl">
              <ArrowLeft aria-hidden className="h-[18px] w-[18px]" />
            </IconButton>
          )}
          {primary}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

/** The plan being built: what is happening, how long, and its shape. */
function Generating({ count, message }: { count: number; message: string }) {
  const { j } = useJourneyCopy();
  return (
    <div role="status" aria-live="polite">
      <p className={`flex items-center gap-2.5 ${type.option}`}>
        <Spinner className="h-4 w-4 text-st-accent-ink" />
        {j.generating.title}
      </p>
      <p className={`mt-1 ${type.help}`}>{message}</p>
      <div className="mt-[var(--st-s3)]">
        <PlanSkeleton rows={count} />
      </div>
    </div>
  );
}
