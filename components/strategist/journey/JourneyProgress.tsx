"use client";

/**
 * Journey progress — one horizontal line of six segments above the step, the
 * width of the step itself. Desktop names every step ("01 Business"…): done
 * steps carry a check and stay clickable (their answer shows on hover), the
 * current one is in ink, the next ones are quiet. Phones keep the six
 * segments only; the step's kicker says where you are.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useStrategistCopy } from "@/lib/strategist/copy";
import { useJourneyCopy } from "@/lib/strategist/journey-copy";
import { JOURNEY_STEPS, stepIndex, type JourneyAnswers, type JourneyStep } from "@/lib/strategist/journey";
import { ease } from "@/lib/motion";
import { focusRing } from "../ui";
import { useJourney } from "./JourneyState";

/** One-line reminder of what a finished step says. */
export function useStepSummary() {
  const { c } = useStrategistCopy();
  const { j } = useJourneyCopy();
  return (step: JourneyStep, a: JourneyAnswers): string => {
    switch (step) {
      case "activity":
        return a.context ?? "";
      case "audience":
        return a.audience ?? "";
      case "goal":
        return a.objective ? j.goal.options[a.objective].title : j.review.notSet;
      case "style": {
        const parts = [
          a.tone ? c.settings.tone[a.tone as keyof typeof c.settings.tone] : null,
          a.orientation ? c.settings.orientation[a.orientation] : null,
        ].filter((p): p is string => typeof p === "string" && !!p);
        return parts.length ? parts.join(" · ") : j.review.notSet;
      }
      case "content":
        return j.review.plan(a.count, a.period);
      default:
        return "";
    }
  };
}

export default function JourneyProgress() {
  const { j } = useJourneyCopy();
  const { step, reached, answers, goTo } = useJourney();
  const reduced = useReducedMotion();
  const summary = useStepSummary();
  const currentIdx = stepIndex(step);
  const reachedIdx = Math.max(stepIndex(reached), currentIdx);

  return (
    <nav aria-label={j.navLabel}>
      <ol className="flex gap-1.5 lg:gap-2">
        {JOURNEY_STEPS.map((s, i) => {
          const isCurrent = s === step;
          // Done = answered: everything before the furthest step reached
          // (the current one excepted).
          const isDone = !isCurrent && i < reachedIdx;
          const clickable = i <= reachedIdx && !isCurrent;
          const filled = isDone || isCurrent;
          const label = j.steps[s].label;
          return (
            <li key={s} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => clickable && goTo(s)}
                disabled={!clickable && !isCurrent}
                aria-current={isCurrent ? "step" : undefined}
                title={isDone ? summary(s, answers) || undefined : undefined}
                className={`group block w-full rounded-md pb-1 text-left no-min-size ${clickable ? "cursor-pointer" : "cursor-default"} ${focusRing}`}
              >
                <span aria-hidden className="relative block h-[3px] overflow-hidden rounded-full bg-st-track">
                  <motion.span
                    className="absolute inset-0 origin-left rounded-full bg-[color:var(--st-accent)]"
                    initial={false}
                    animate={{ scaleX: filled ? 1 : 0, opacity: isCurrent ? 1 : 0.55 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.42, ease: ease.enter }}
                  />
                </span>
                <span
                  aria-hidden
                  className={`mt-2.5 hidden items-center gap-1 truncate text-[12px] leading-4 transition-colors lg:flex ${
                    isCurrent
                      ? "font-semibold text-st-ink"
                      : isDone
                        ? "font-medium text-st-ink-2 group-hover:text-st-ink"
                        : "text-st-ink-3"
                  }`}
                >
                  {isDone ? (
                    <Check aria-hidden className="h-3 w-3 shrink-0 text-st-accent-ink" strokeWidth={3} />
                  ) : (
                    <span aria-hidden className={`tabular-nums ${isCurrent ? "text-st-accent-ink" : ""}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}
                  <span className="truncate">{label}</span>
                </span>
                <span className="sr-only">
                  {`${label}${isCurrent ? ` (${j.current})` : isDone ? ` (${j.done})` : ""}`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
