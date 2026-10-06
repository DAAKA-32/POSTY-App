"use client";

/**
 * StrategistParamsPanel — "Your editorial line", inside the Settings view.
 *
 * Was a 10-control panel glued above the composer (it pushed the input off
 * screen on mobile and only steered plans without saying so). It now lives in
 * the drawer's Settings view, with the essentials first (business, audience,
 * goal, tone) and the fine-tuning behind "Fine-tune".
 *
 * Behaviour kept: edits are the working copy for this session's next plans;
 * "Save" persists them to the profile (also used by the weekly autonomous
 * run). The session (StrategistSession) owns both copies.
 */

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { useStrategistCopy } from "@/lib/strategist/copy";
import toast from "@/components/ui/Toast";
import type { StrategistAdvancedParams } from "@/types";
import { useStrategistSession } from "./StrategistSession";
import { Button, focusRing } from "./ui";

type Objective = NonNullable<StrategistAdvancedParams["objective"]>;
type Cta = NonNullable<StrategistAdvancedParams["ctaIntensity"]>;
type Hook = NonNullable<StrategistAdvancedParams["hookStyle"]>;
type Orientation = NonNullable<StrategistAdvancedParams["orientation"]>;

const OBJECTIVES: Objective[] = ["authority", "engagement", "lead-gen", "conversion", "branding", "storytelling"];
const TONES = ["direct", "expert", "inspiring", "bold", "warm"] as const;
const CTAS: Cta[] = ["none", "soft", "assertive"];
const HOOKS: Hook[] = ["auto", "contrarian", "story", "data", "question", "confession"];
const ORIENTATIONS: Orientation[] = ["personal", "professional", "balanced"];

export default function StrategistParamsPanel() {
  const { c } = useStrategistCopy();
  const S = c.settings;
  const { params, setParams, saveParams, unsavedCount, savedParams } = useStrategistSession();
  const [refineOpen, setRefineOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ids = { context: useId(), audience: useId(), refine: useId() };

  const update = (patch: Partial<StrategistAdvancedParams>) => setParams({ ...params, ...patch });
  const toggle = <K extends keyof StrategistAdvancedParams>(key: K, value: StrategistAdvancedParams[K]) =>
    update({ [key]: params[key] === value ? undefined : value } as Partial<StrategistAdvancedParams>);

  const save = async () => {
    setSaving(true);
    const ok = await saveParams();
    setSaving(false);
    if (ok) toast.success(S.saved);
    else toast.error(S.saveFail);
  };

  const field =
    "w-full rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-elevated px-3 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25";

  return (
    <section aria-labelledby="strategist-editorial" className="space-y-5">
      <div>
        <h3 id="strategist-editorial" className="text-[16px] font-semibold text-gray-900 dark:text-white">
          {S.editorialTitle}
        </h3>
        <p className="mt-1 text-[14px] text-gray-600 dark:text-gray-300">{S.editorialDesc}</p>
      </div>

      <div>
        <label htmlFor={ids.context} className="block text-[14px] font-medium text-gray-900 dark:text-white">
          {S.context.label}
        </label>
        <p id={`${ids.context}-hint`} className="mt-0.5 mb-1.5 text-[13px] text-gray-600 dark:text-gray-400">
          {S.context.hint}
        </p>
        <textarea
          id={ids.context}
          aria-describedby={`${ids.context}-hint`}
          value={params.context ?? ""}
          onChange={(e) => update({ context: e.target.value })}
          rows={4}
          maxLength={800}
          placeholder={S.context.placeholder}
          className={`${field} resize-y leading-relaxed`}
          style={{ fontSize: "max(16px, 1rem)" }}
        />
      </div>

      <div>
        <label htmlFor={ids.audience} className="block mb-1.5 text-[14px] font-medium text-gray-900 dark:text-white">
          {S.audience.label}
        </label>
        <input
          id={ids.audience}
          type="text"
          value={params.audience ?? ""}
          onChange={(e) => update({ audience: e.target.value })}
          maxLength={200}
          placeholder={S.audience.placeholder}
          className={field}
          style={{ fontSize: "max(16px, 1rem)" }}
        />
      </div>

      <ChipGroup
        label={S.objective.label}
        options={OBJECTIVES.map((k) => ({ value: k, label: S.objective[k] }))}
        value={params.objective}
        onSelect={(v) => toggle("objective", v as Objective)}
      />
      <ChipGroup
        label={S.tone.label}
        options={TONES.map((k) => ({ value: k, label: S.tone[k] }))}
        value={params.tone}
        onSelect={(v) => toggle("tone", v)}
      />

      <div className="rounded-2xl border border-gray-200 dark:border-dark-border">
        <button
          type="button"
          aria-expanded={refineOpen}
          aria-controls={ids.refine}
          onClick={() => setRefineOpen((v) => !v)}
          className={`w-full flex items-center justify-between px-4 min-h-[48px] text-[14px] font-medium text-gray-900 dark:text-white rounded-2xl ${focusRing}`}
        >
          {S.refine}
          <ChevronDown aria-hidden className={`w-4 h-4 transition-transform ${refineOpen ? "rotate-180" : ""}`} />
        </button>
        {refineOpen && (
          <div id={ids.refine} className="px-4 pb-4 space-y-5">
            <Scale
              label={S.formality.label}
              low={S.formality.low}
              high={S.formality.high}
              value={params.formality}
              onSelect={(v) => update({ formality: v })}
              aria={S.scaleAria}
            />
            <Scale
              label={S.emotion.label}
              low={S.emotion.low}
              high={S.emotion.high}
              value={params.emotion}
              onSelect={(v) => update({ emotion: v })}
              aria={S.scaleAria}
            />
            <ChipGroup
              label={S.cta.label}
              options={CTAS.map((k) => ({ value: k, label: S.cta[k] }))}
              value={params.ctaIntensity}
              onSelect={(v) => toggle("ctaIntensity", v as Cta)}
            />
            <ChipGroup
              label={S.hook.label}
              options={HOOKS.map((k) => ({ value: k, label: S.hook[k] }))}
              value={params.hookStyle}
              onSelect={(v) => toggle("hookStyle", v as Hook)}
            />
            <ChipGroup
              label={S.orientation.label}
              options={ORIENTATIONS.map((k) => ({ value: k, label: S.orientation[k] }))}
              value={params.orientation}
              onSelect={(v) => toggle("orientation", v as Orientation)}
            />
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.03] p-4 space-y-3">
        <p className="text-[13px] text-gray-700 dark:text-gray-300">{S.sessionNote}</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setParams(savedParams)}
            disabled={unsavedCount === 0}
            icon={<RotateCcw aria-hidden className="w-4 h-4" />}
          >
            {S.reset}
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={saving || unsavedCount === 0}>
            {S.saveDefault}
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Atoms ──────────────────────────────────────────────────────────────────

function GroupLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mb-2 text-[14px] font-medium text-gray-900 dark:text-white">
      {children}
    </p>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: { value: string; label: string }[];
  value?: string;
  onSelect: (value: string) => void;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <GroupLabel id={id}>{label}</GroupLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(opt.value)}
              className={`h-10 px-3.5 rounded-full border text-[14px] transition-colors ${focusRing} ${
                active
                  ? "bg-amber-100 dark:bg-amber-400/20 border-amber-500 text-amber-950 dark:text-amber-100 font-medium"
                  : "bg-white dark:bg-dark-elevated border-gray-300 dark:border-dark-border text-gray-800 dark:text-gray-200 hover:border-gray-400"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 1-5 selector; tapping the active value clears it (back to "not set"). */
function Scale({
  label,
  low,
  high,
  value,
  onSelect,
  aria,
}: {
  label: string;
  low: string;
  high: string;
  value?: 1 | 2 | 3 | 4 | 5;
  onSelect: (v: 1 | 2 | 3 | 4 | 5 | undefined) => void;
  aria: (label: string, n: number) => string;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <GroupLabel id={id}>{label}</GroupLabel>
      <div className="flex items-center gap-1.5">
        {([1, 2, 3, 4, 5] as const).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-label={aria(label, n)}
              aria-pressed={active}
              onClick={() => onSelect(active ? undefined : n)}
              className={`flex-1 h-10 rounded-lg border text-[13px] font-medium tabular-nums transition-colors ${focusRing} ${
                active
                  ? "bg-amber-100 dark:bg-amber-400/20 border-amber-500 text-amber-950 dark:text-amber-100"
                  : value !== undefined && n < value
                    ? "bg-amber-50 dark:bg-amber-400/10 border-amber-200 dark:border-amber-400/30 text-amber-900 dark:text-amber-200"
                    : "bg-white dark:bg-dark-elevated border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[12px] text-gray-600 dark:text-gray-400">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
