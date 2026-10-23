"use client";

/**
 * StrategistParamsPanel — "Your editorial line", inside the Settings view.
 *
 * The same fields as the guided journey (components/strategist/editorial),
 * in the same order, in their dense form (chips + a preview of the chosen
 * option): the journey is where the line is discovered, Settings is where it
 * is retouched. From `xl` the panel is two columns — the free text (business,
 * audience) and the choices (goal, tone, angle) — so, with the autonomous
 * column next to it, the whole view fits a laptop screen. The fine settings
 * slide in place of the whole line, like a sub-page (as in the journey).
 *
 * Behaviour kept: edits are the working copy for this session's next plans;
 * "Save" persists them to the profile (also used by the weekly autonomous
 * run). The session (StrategistSession) owns both copies. The save bar only
 * shows when there is something to save, and sticks to the bottom of the view.
 */

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useStrategistCopy } from "@/lib/strategist/copy";
import { useJourneyCopy } from "@/lib/strategist/journey-copy";
import { dur, ease, stepSwap } from "@/lib/motion";
import toast from "@/components/ui/Toast";
import type { StrategistAdvancedParams } from "@/types";
import { useStrategistSession } from "./StrategistSession";
import { Button, focusRing, textAction } from "./ui";
import { type } from "./type";
import { AudienceField, BusinessField } from "./editorial/TextFields";
import { FineTune, GoalPicker, OrientationPicker, TonePicker } from "./editorial/Choices";

export default function StrategistParamsPanel() {
  const { c } = useStrategistCopy();
  const { j } = useJourneyCopy();
  const S = c.settings;
  const { params, setParams, saveParams, unsavedCount, savedParams } = useStrategistSession();
  const reduced = useReducedMotion();
  const [fineOpen, setFineOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fineCount = [params.formality, params.emotion, params.hookStyle, params.ctaIntensity].filter((v) => v !== undefined).length;
  const swap = (side: -1 | 1) => (reduced ? {} : stepSwap(side));

  const update = (patch: Partial<StrategistAdvancedParams>) => setParams({ ...params, ...patch });

  const save = async () => {
    setSaving(true);
    const ok = await saveParams();
    setSaving(false);
    if (ok) toast.success(S.saved);
    else toast.error(S.saveFail);
  };

  return (
    <section aria-labelledby="strategist-editorial" className="min-w-0">
      <h3 id="strategist-editorial" className="text-[19px] font-semibold tracking-[-0.015em] text-st-ink">
        {S.editorialTitle}
      </h3>
      <p className={`st-hide-low mt-1 ${type.help} !text-[14px]`}>
        {S.editorialDesc} {S.sessionNote}
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {!fineOpen ? (
          <motion.div key="line" {...swap(-1)} className="mt-[var(--st-s3)] border-t border-st-rule xl:grid xl:grid-cols-2 xl:gap-x-10">
            {/* Free text: what you do, who you talk to. */}
            <div className="divide-y divide-[color:var(--st-rule)]">
              <div className="py-[var(--st-s3)]">
                <BusinessField value={params.context ?? ""} onChange={(context) => update({ context })} withHelpers={false} heightClass="h-[clamp(96px,16dvh,128px)]" />
              </div>
              <div className="py-[var(--st-s3)]">
                <AudienceField value={params.audience ?? ""} onChange={(audience) => update({ audience })} withHelpers={false} />
              </div>
            </div>

            {/* Choices. */}
            <div className="space-y-[var(--st-s3)] border-t border-st-rule py-[var(--st-s3)] xl:border-t-0">
              <GoalPicker variant="chips" value={params.objective} onChange={(objective) => update({ objective })} />
              <TonePicker variant="chips" value={params.tone} onChange={(tone) => update({ tone })} />
              <OrientationPicker value={params.orientation} onChange={(orientation) => update({ orientation })} />
              <button
                type="button"
                aria-expanded={false}
                onClick={() => setFineOpen(true)}
                className={`group -mx-2 flex w-[calc(100%+16px)] items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-st-track ${focusRing}`}
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className={`shrink-0 ${type.label}`}>
                    {j.settingsView.fineTune}
                    {fineCount > 0 && <span className="ml-1.5 font-normal tabular-nums text-st-accent-ink">· {fineCount}</span>}
                  </span>
                  <span className={`hidden min-w-0 truncate sm:block ${type.help}`}>{j.settingsView.fineTuneHint}</span>
                </span>
                <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-st-ink-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          // The fine settings take the whole editorial line's width, like a
          // sub-page: four controls side by side instead of a long column.
          <motion.div key="fine" {...swap(1)} className="mt-[var(--st-s3)] border-t border-st-rule py-[var(--st-s3)]">
            <div className="mb-[var(--st-s3)] flex items-baseline gap-3">
              <button type="button" onClick={() => setFineOpen(false)} className={`inline-flex items-center gap-1.5 text-[13.5px] ${textAction}`}>
                <ArrowLeft aria-hidden className="h-4 w-4" />
                {S.editorialTitle}
              </button>
              <span className={type.help}>· {j.settingsView.fineTuneHint}</span>
            </div>
            <FineTune value={params} onChange={update} columns="sm:grid-cols-2" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save bar — only when there is something to save; sticks while the
          editorial line is on screen. */}
      <AnimatePresence initial={false}>
        {unsavedCount > 0 && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.enter } }}
            exit={reduced ? undefined : { opacity: 0, y: 12, transition: { duration: dur.fast, ease: ease.exit } }}
            className="sticky bottom-3 z-10 mt-2"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-st-rule bg-st-surface py-2.5 pl-4 pr-2.5 shadow-[0_12px_32px_-12px_rgba(16,24,40,0.28)]">
              <p className="min-w-0 flex-1 text-[13.5px] font-medium text-st-ink" aria-live="polite">
                {j.settingsView.unsaved(unsavedCount)}
              </p>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setParams(savedParams)} icon={<RotateCcw aria-hidden className="h-4 w-4" />}>
                  {S.reset}
                </Button>
                <Button variant="primary" size="sm" onClick={save} loading={saving}>
                  {S.saveDefault}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
