"use client";

/**
 * StrategistParamsPanel — progressive-disclosure "advanced settings" for the
 * Strategist batch planner. Rendered just above the composer (visible in both
 * the hero and the conversation), so the user can steer the next batch request
 * without leaving the drawer.
 *
 * Behavior (matches the product decision "profile defaults + ephemeral override"):
 *   - Hydrates from `users/{uid}.strategistParams` (saved defaults) on mount.
 *   - Any change is held in local state and pushed up via `onChange` — it is
 *     the *override* applied to the next /api/strategist/batch-plan call. It is
 *     ephemeral: it does NOT touch the profile.
 *   - A discreet "Set as default" link appears only when the local params
 *     differ from the saved defaults; clicking it persists them to the profile.
 *
 * Cost note: these params add ≤8 short lines to the existing single batch-plan
 * LLM call. No extra API call. Unset fields inject nothing.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, ChevronDown, RotateCcw, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/lib/i18n";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/db/firebase";
import toast from "@/components/ui/Toast";
import type { StrategistAdvancedParams } from "@/types";

interface Props {
  /** Notifies the host of the current override (passed to the batch-plan body). */
  onChange: (params: StrategistAdvancedParams) => void;
}

type ObjectiveKey = NonNullable<StrategistAdvancedParams["objective"]>;
type ToneKey = "direct" | "expert" | "inspiring" | "bold" | "warm";
type CtaKey = NonNullable<StrategistAdvancedParams["ctaIntensity"]>;
type HookKey = NonNullable<StrategistAdvancedParams["hookStyle"]>;
type OrientKey = NonNullable<StrategistAdvancedParams["orientation"]>;

const OBJECTIVE_KEYS: ObjectiveKey[] = [
  "authority",
  "engagement",
  "lead-gen",
  "conversion",
  "branding",
  "storytelling",
];
const TONE_KEYS: ToneKey[] = ["direct", "expert", "inspiring", "bold", "warm"];
const CTA_KEYS: CtaKey[] = ["none", "soft", "assertive"];
const HOOK_KEYS: HookKey[] = ["auto", "contrarian", "story", "data", "question", "confession"];
const ORIENT_KEYS: OrientKey[] = ["personal", "professional", "balanced"];

/** Strip undefined/empty fields so equality checks + persistence stay clean. */
function clean(p: StrategistAdvancedParams): StrategistAdvancedParams {
  const out: StrategistAdvancedParams = {};
  if (p.context?.trim()) out.context = p.context.trim();
  if (p.objective) out.objective = p.objective;
  if (p.tone) out.tone = p.tone;
  if (p.audience?.trim()) out.audience = p.audience.trim();
  if (p.formality) out.formality = p.formality;
  if (p.ctaIntensity) out.ctaIntensity = p.ctaIntensity;
  if (p.hookStyle) out.hookStyle = p.hookStyle;
  if (p.orientation) out.orientation = p.orientation;
  if (p.emotion) out.emotion = p.emotion;
  return out;
}

function countActive(p: StrategistAdvancedParams): number {
  return Object.keys(clean(p)).length;
}

export default function StrategistParamsPanel({ onChange }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  // Defensive fallback: non-FR/EN locales don't ship this sub-tree yet.
  const P = t.strategist?.params ?? en.strategist.params;

  const [params, setParams] = useState<StrategistAdvancedParams>({});
  const [expanded, setExpanded] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const savedRef = useRef<StrategistAdvancedParams>({});

  // Hydrate saved defaults from the profile.
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const saved = snap.exists()
          ? ((snap.data().strategistParams ?? {}) as StrategistAdvancedParams)
          : {};
        if (cancelled) return;
        const cleaned = clean(saved);
        savedRef.current = cleaned;
        setParams(cleaned);
        onChange(cleaned);
      } catch (err) {
        console.warn("[StrategistParamsPanel] hydrate failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // onChange is stable from the host (useCallback); user.uid is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const update = (patch: Partial<StrategistAdvancedParams>) => {
    setParams((prev) => {
      const next = clean({ ...prev, ...patch });
      onChange(next);
      return next;
    });
  };

  /** Single-select toggle: re-selecting the active value clears the field. */
  const toggle = <K extends keyof StrategistAdvancedParams>(
    key: K,
    value: StrategistAdvancedParams[K]
  ) => {
    update({ [key]: params[key] === value ? undefined : value } as Partial<StrategistAdvancedParams>);
  };

  const activeCount = countActive(params);
  const isDirty =
    JSON.stringify(clean(params)) !== JSON.stringify(savedRef.current);

  const saveAsDefault = async () => {
    if (!user?.uid || savingDefault) return;
    setSavingDefault(true);
    try {
      const cleaned = clean(params);
      await updateDoc(doc(db, "users", user.uid), {
        strategistParams: cleaned,
        updatedAt: serverTimestamp(),
      });
      savedRef.current = cleaned;
      toast.success(P.savedToast);
    } catch (err) {
      console.error("[StrategistParamsPanel] save default failed:", err);
      toast.error(t.strategist.errorGeneric);
    } finally {
      setSavingDefault(false);
    }
  };

  const reset = () => update(Object.fromEntries(
    Object.keys(params).map((k) => [k, undefined])
  ) as Partial<StrategistAdvancedParams>);

  return (
    <div className="px-5 pt-2">
      {/* Trigger row */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="
          w-full flex items-center gap-2 px-3 py-2 rounded-xl
          text-[12px] text-text-secondary
          hover:bg-gray-50/70 dark:hover:bg-white/[0.03]
          transition-colors
        "
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {P.trigger}
        </span>
        {activeCount > 0 ? (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-100 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
            {activeCount}
          </span>
        ) : (
          <span className="text-text-muted truncate hidden sm:inline">
            · {P.summaryEmpty}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 ml-auto text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white/70 dark:bg-dark-card/70 backdrop-blur-xl p-3.5 space-y-3.5">
              {/* Business context — the single most impactful field: it tells
                  the Strategist WHAT the user does so posts are grounded and
                  human instead of generic. Highlighted at the top. */}
              <div className="rounded-lg border border-amber-300/50 dark:border-amber-400/25 bg-amber-50/40 dark:bg-amber-400/[0.06] p-2.5">
                <FieldLabel>{P.context.label}</FieldLabel>
                <textarea
                  value={params.context ?? ""}
                  onChange={(e) => update({ context: e.target.value })}
                  rows={3}
                  maxLength={800}
                  placeholder={P.context.placeholder}
                  className="
                    w-full px-2.5 py-1.5 rounded-md resize-none
                    bg-white dark:bg-dark-elevated
                    border border-gray-200 dark:border-dark-border
                    text-[12px] text-gray-900 dark:text-white leading-relaxed
                    placeholder:text-text-muted/70
                    focus:outline-none focus:ring-2 focus:ring-amber-400/50
                  "
                />
                <p className="mt-1 text-[10.5px] text-text-muted leading-snug">
                  {P.context.hint}
                </p>
              </div>

              <ChipGroup
                label={P.objective.label}
                options={OBJECTIVE_KEYS.map((k) => ({ value: k, label: P.objective[k] }))}
                value={params.objective}
                onSelect={(v) => toggle("objective", v as ObjectiveKey)}
              />
              <ChipGroup
                label={P.tone.label}
                options={TONE_KEYS.map((k) => ({ value: k, label: P.tone[k] }))}
                value={params.tone}
                onSelect={(v) => toggle("tone", v)}
              />
              <ChipGroup
                label={P.hook.label}
                options={HOOK_KEYS.map((k) => ({ value: k, label: P.hook[k] }))}
                value={params.hookStyle}
                onSelect={(v) => toggle("hookStyle", v as HookKey)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <ChipGroup
                  label={P.orientation.label}
                  options={ORIENT_KEYS.map((k) => ({ value: k, label: P.orientation[k] }))}
                  value={params.orientation}
                  onSelect={(v) => toggle("orientation", v as OrientKey)}
                />
                <ChipGroup
                  label={P.cta.label}
                  options={CTA_KEYS.map((k) => ({ value: k, label: P.cta[k] }))}
                  value={params.ctaIntensity}
                  onSelect={(v) => toggle("ctaIntensity", v as CtaKey)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Scale
                  label={P.formality.label}
                  lowLabel={P.formality.low}
                  highLabel={P.formality.high}
                  value={params.formality}
                  onSelect={(v) => update({ formality: v })}
                />
                <Scale
                  label={P.emotion.label}
                  lowLabel={P.emotion.low}
                  highLabel={P.emotion.high}
                  value={params.emotion}
                  onSelect={(v) => update({ emotion: v })}
                />
              </div>
              <div>
                <FieldLabel>{P.audience.label}</FieldLabel>
                <input
                  type="text"
                  value={params.audience ?? ""}
                  onChange={(e) => update({ audience: e.target.value })}
                  maxLength={200}
                  placeholder={P.audience.placeholder}
                  className="
                    w-full px-2.5 py-1.5 rounded-md
                    bg-white dark:bg-dark-elevated
                    border border-gray-200 dark:border-dark-border
                    text-[12px] text-gray-900 dark:text-white
                    placeholder:text-text-muted/70
                    focus:outline-none focus:ring-2 focus:ring-amber-400/50
                  "
                />
              </div>

              {/* Footer actions */}
              {(activeCount > 0 || isDirty) && (
                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={reset}
                    disabled={activeCount === 0}
                    className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text-secondary disabled:opacity-40 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {P.reset}
                  </button>
                  {isDirty && (
                    <button
                      type="button"
                      onClick={saveAsDefault}
                      disabled={savingDefault}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      {P.saveDefault}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Atoms ──────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted mb-1.5">
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
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(opt.value)}
              className={`
                px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-colors
                ${active
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "bg-white dark:bg-dark-elevated border-gray-200 dark:border-dark-border text-text-secondary hover:border-amber-300 dark:hover:border-amber-400/40"}
              `}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 5-segment selector with an "off" state — clicking the active segment clears
 *  it (returns the field to unset/Auto). Labeled endpoints give it meaning. */
function Scale({
  label,
  lowLabel,
  highLabel,
  value,
  onSelect,
}: {
  label: string;
  lowLabel: string;
  highLabel: string;
  value?: 1 | 2 | 3 | 4 | 5;
  onSelect: (v: 1 | 2 | 3 | 4 | 5 | undefined) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-1">
        {([1, 2, 3, 4, 5] as const).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-label={`${label} ${n}/5`}
              aria-pressed={active}
              onClick={() => onSelect(active ? undefined : n)}
              className={`
                flex-1 h-6 rounded-md border transition-colors
                ${active
                  ? "bg-amber-500 border-amber-500"
                  : value !== undefined && n < value
                    ? "bg-amber-200/70 dark:bg-amber-400/30 border-amber-200 dark:border-amber-400/30"
                    : "bg-white dark:bg-dark-elevated border-gray-200 dark:border-dark-border hover:border-amber-300 dark:hover:border-amber-400/40"}
              `}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-text-muted">{lowLabel}</span>
        <span className="text-[10px] text-text-muted">{highLabel}</span>
      </div>
    </div>
  );
}
