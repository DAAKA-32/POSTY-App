"use client";

/**
 * The optional choices of the editorial line — goal, tone, angle and the
 * fine settings. Controlled, shared by the journey and the Settings view.
 * Every choice can be cleared with a second tap: with nothing chosen, the
 * Strategist decides.
 */

import { useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useStrategistCopy } from "@/lib/strategist/copy";
import { useJourneyCopy } from "@/lib/strategist/journey-copy";
import { CTAS, HOOKS, OBJECTIVES, ORIENTATIONS, TONES, type Objective, type Orientation } from "@/lib/strategist/journey";
import { dur, ease } from "@/lib/motion";
import type { StrategistAdvancedParams } from "@/types";
import { ChipGroup, GroupLabel, OptionTile, Scale, Segmented } from "../fields";
import { type } from "../type";

type Tone = (typeof TONES)[number];

/**
 * Two ways to show a choice:
 *   tiles  the journey — rich options for someone choosing for the first time
 *   chips  the Settings view — dense, for someone retouching a known line
 * In both, whatever does not fit inline (goal description, tone sample) is
 * shown once, for the chosen option, under the options.
 */
type Variant = "tiles" | "chips";

/** The line under a group of options that describes the chosen one. */
function ChoicePreview({ id, children, italic }: { id?: string; children?: string; italic?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {id && children && (
          <motion.p
            key={id}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: dur.fast, ease: ease.enter } }}
            exit={reduced ? undefined : { opacity: 0, transition: { duration: dur.instant } }}
            className={`st-hide-tight mt-[var(--st-s2)] line-clamp-2 border-l-2 border-[color:var(--st-accent)] pl-3 text-[13.5px] leading-[1.45] text-st-ink-2 [@media(max-height:760px)]:line-clamp-1 ${italic ? "italic" : ""}`}
          >
            {children}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The six goals. As tiles, phones show the titles only and describe the
 * chosen goal under the grid — six two-line descriptions don't fit a phone.
 */
export function GoalPicker({
  value,
  onChange,
  variant = "tiles",
  columns = "grid-cols-2 lg:grid-cols-3",
}: {
  value?: Objective;
  onChange: (v: Objective | undefined) => void;
  variant?: Variant;
  columns?: string;
}) {
  const { c } = useStrategistCopy();
  const { j } = useJourneyCopy();
  const id = useId();
  const toggle = (o: Objective) => onChange(value === o ? undefined : o);

  if (variant === "chips") {
    return (
      <div>
        <ChipGroup
          label={c.settings.objective.label}
          options={OBJECTIVES.map((o) => ({ value: o, label: c.settings.objective[o] }))}
          value={value}
          onSelect={(v) => toggle(v as Objective)}
        />
        <ChoicePreview id={value}>{value ? `${j.goal.options[value].title} — ${j.goal.options[value].desc}` : undefined}</ChoicePreview>
      </div>
    );
  }

  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className="sr-only">
        {j.steps.goal.title}
      </p>
      <div className={`grid gap-[var(--st-s2)] max-sm:gap-[var(--st-s1)] ${columns}`}>
        {OBJECTIVES.map((o) => (
          <OptionTile
            key={o}
            title={j.goal.options[o].title}
            desc={j.goal.options[o].desc}
            descClassName="max-sm:hidden st-hide-short"
            active={value === o}
            onClick={() => toggle(o)}
          />
        ))}
      </div>
      <div className="sm:hidden">
        <ChoicePreview id={value}>{value ? j.goal.options[value].desc : undefined}</ChoicePreview>
      </div>
    </div>
  );
}

/**
 * Tone, with a line written in each voice. As tiles the sample sits in the
 * tile where there is room (roomy desktop) and under the grid elsewhere.
 */
export function TonePicker({
  value,
  onChange,
  variant = "tiles",
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  variant?: Variant;
}) {
  const { c } = useStrategistCopy();
  const { j } = useJourneyCopy();
  const id = useId();
  const chosen = TONES.includes(value as Tone) ? (value as Tone) : undefined;
  const toggle = (t: Tone) => onChange(chosen === t ? undefined : t);
  const sample = chosen ? j.style.toneExamples[chosen] : undefined;

  if (variant === "chips") {
    return (
      <div>
        <ChipGroup
          label={j.style.toneLabel}
          options={TONES.map((t) => ({ value: t, label: c.settings.tone[t] }))}
          value={chosen}
          onSelect={(v) => toggle(v as Tone)}
        />
        <ChoicePreview id={chosen} italic>
          {sample}
        </ChoicePreview>
      </div>
    );
  }

  return (
    <div role="group" aria-labelledby={id}>
      <GroupLabel id={id}>{j.style.toneLabel}</GroupLabel>
      <div className="grid grid-cols-2 gap-[var(--st-s1)] lg:grid-cols-3">
        {TONES.map((t) => (
          <OptionTile
            key={t}
            title={c.settings.tone[t]}
            example={j.style.toneExamples[t]}
            descClassName="st-roomy-only"
            active={chosen === t}
            onClick={() => toggle(t)}
          />
        ))}
      </div>
      <div className="st-roomy-hide">
        <ChoicePreview id={chosen} italic>
          {sample}
        </ChoicePreview>
      </div>
    </div>
  );
}

export function OrientationPicker({
  value,
  onChange,
}: {
  value?: Orientation;
  onChange: (v: Orientation | undefined) => void;
}) {
  const { c } = useStrategistCopy();
  const { j } = useJourneyCopy();
  const id = useId();
  // What the chosen angle means sits on the label line: no reserved row.
  return (
    <div role="group" aria-labelledby={id}>
      <div className="mb-[var(--st-s1)] flex min-w-0 items-baseline gap-2">
        <p id={id} className={`shrink-0 ${type.label}`}>
          {j.style.orientationLabel}
        </p>
        {value && <p className={`min-w-0 truncate ${type.help}`}>· {j.style.orientationDesc[value]}</p>}
      </div>
      <Segmented
        label={j.style.orientationLabel}
        labelHidden
        block
        dense
        allowClear
        options={ORIENTATIONS.map((o) => ({ value: o, label: c.settings.orientation[o], title: j.style.orientationDesc[o] }))}
        value={value}
        onSelect={onChange}
      />
    </div>
  );
}

type Fine = Pick<StrategistAdvancedParams, "formality" | "emotion" | "hookStyle" | "ctaIntensity">;

/**
 * Register, emotion, hooks and post ending. `page` shows one half only
 * (0 = register + emotion, 1 = hooks + ending) where both can't share a screen.
 */
export function FineTune({
  value,
  onChange,
  page,
  columns = "lg:grid-cols-2",
}: {
  value: Fine;
  onChange: (patch: Fine) => void;
  page?: 0 | 1;
  columns?: string;
}) {
  const { c } = useStrategistCopy();
  const S = c.settings;
  const showA = page === undefined || page === 0;
  const showB = page === undefined || page === 1;
  return (
    <div className={`grid gap-x-8 ${page === undefined ? "gap-y-[var(--st-s3)]" : "gap-y-[var(--st-s2)]"} ${columns}`}>
      {showA && (
        <>
          <Scale label={S.formality.label} low={S.formality.low} high={S.formality.high} value={value.formality} onSelect={(v) => onChange({ formality: v })} aria={S.scaleAria} />
          <Scale label={S.emotion.label} low={S.emotion.low} high={S.emotion.high} value={value.emotion} onSelect={(v) => onChange({ emotion: v })} aria={S.scaleAria} />
        </>
      )}
      {showB && (
        <>
          <ChipGroup
            label={S.hook.label}
            options={HOOKS.map((k) => ({ value: k, label: S.hook[k] }))}
            value={value.hookStyle}
            onSelect={(v) => onChange({ hookStyle: value.hookStyle === v ? undefined : (v as Fine["hookStyle"]) })}
          />
          <ChipGroup
            label={S.cta.label}
            options={CTAS.map((k) => ({ value: k, label: S.cta[k] }))}
            value={value.ctaIntensity}
            onSelect={(v) => onChange({ ctaIntensity: value.ctaIntensity === v ? undefined : (v as Fine["ctaIntensity"]) })}
          />
        </>
      )}
    </div>
  );
}
