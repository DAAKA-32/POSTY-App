"use client";

/**
 * Result of the journey: the generated plan with the existing plan card
 * (edit briefs, write the posts, schedule, calendar) — the engine is
 * untouched, only the place it is shown changes. A plan is long content, so
 * this view scrolls locally.
 */

import { forwardRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MessageSquare, PenLine, RefreshCw } from "lucide-react";
import { useJourneyCopy } from "@/lib/strategist/journey-copy";
import { dur, ease } from "@/lib/motion";
import BatchPlanCard from "../BatchPlanCard";
import { useStrategistSession } from "../StrategistSession";
import { Button } from "../ui";
import { type } from "../type";
import { useJourney } from "./JourneyState";

const JourneyResult = forwardRef<HTMLHeadingElement>(function JourneyResult(_props, titleRef) {
  const { j } = useJourneyCopy();
  const { batch, editStrategy, newPlan, updateBatch } = useJourney();
  const { showBatch } = useStrategistSession();
  const reduced = useReducedMotion();
  if (!batch) return null;

  const enter = reduced
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.enter } } };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <motion.div {...enter} className="mx-auto w-full max-w-[880px] px-5 sm:px-8 pt-6 lg:pt-[clamp(24px,5dvh,48px)] pb-[max(env(safe-area-inset-bottom),32px)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <p className={type.kicker}>{j.result.kicker(batch.posts.length)}</p>
            <h2 ref={titleRef} tabIndex={-1} className={`mt-2 ${type.display} focus:outline-none`}>
              {j.result.title}
            </h2>
            <p className={`mt-2 max-w-[52ch] ${type.lede}`}>{j.result.subtitle(batch.posts.length)}</p>
          </div>
          <div className="-mx-5 flex shrink-0 gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]">
            <Button variant="secondary" size="sm" icon={<PenLine aria-hidden className="h-4 w-4" />} onClick={editStrategy}>
              {j.result.edit}
            </Button>
            <Button variant="ghost" size="sm" icon={<MessageSquare aria-hidden className="h-4 w-4" />} onClick={() => showBatch(batch)}>
              {j.result.discuss}
            </Button>
            <Button variant="ghost" size="sm" icon={<RefreshCw aria-hidden className="h-4 w-4" />} onClick={newPlan}>
              {j.result.newPlan}
            </Button>
          </div>
        </div>
        <div className="mt-[var(--st-s4)]">
          <BatchPlanCard key={batch.id} batch={batch} onChange={updateBatch} />
        </div>
      </motion.div>
    </div>
  );
});

export default JourneyResult;
