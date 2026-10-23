"use client";

/**
 * Strategist form atoms — shared by the guided journey, the Settings view
 * and the autonomous panel, so a chip, a 1-5 scale or a counter looks and
 * behaves the same wherever the editorial line is edited.
 *
 * Every selectable control uses `.st-select` (globals.css): neutral field at
 * rest, coral wash + coral edge when `aria-pressed`. Heights follow the
 * density tokens (`--st-chip-h`), so short screens tighten without a single
 * per-component media query.
 */

import { useId, type ReactNode } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { focusRing } from "./ui";
import { type } from "./type";

export function GroupLabel({ id, children, hint }: { id: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-[var(--st-s1)]">
      <p id={id} className={type.label}>
        {children}
      </p>
      {hint && <p className={`mt-0.5 ${type.help}`}>{hint}</p>}
    </div>
  );
}

/** Label + optional hint for a text field; the hint is wired by id. */
export function FieldLabel({
  htmlFor,
  hintId,
  label,
  hint,
  hintClassName = "",
  aside,
}: {
  htmlFor: string;
  hintId?: string;
  label: ReactNode;
  hint?: ReactNode;
  hintClassName?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-[var(--st-s1)] flex items-end justify-between gap-3">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className={`block ${type.label}`}>
          {label}
        </label>
        {hint && (
          <p id={hintId} className={`mt-0.5 ${type.help} ${hintClassName}`}>
            {hint}
          </p>
        )}
      </div>
      {aside}
    </div>
  );
}

export function ChipGroup({
  label,
  hint,
  options,
  value,
  onSelect,
}: {
  label: string;
  hint?: ReactNode;
  options: { value: string; label: string }[];
  value?: string;
  onSelect: (value: string) => void;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <GroupLabel id={id} hint={hint}>
        {label}
      </GroupLabel>
      <div className="flex flex-wrap gap-[var(--st-s1)]">
        {options.map((opt) => (
          <Chip key={opt.value} active={value === opt.value} onClick={() => onSelect(opt.value)}>
            {opt.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`st-select st-chip inline-flex max-w-full items-center gap-1.5 rounded-full px-3.5 text-[14px] [@media(max-height:660px)]:text-[13px] active:scale-[0.97] ${active ? "font-medium" : ""} ${focusRing} ${className}`}
    >
      {active && <Check aria-hidden className="st-pop h-3.5 w-3.5 shrink-0 text-st-accent-ink" strokeWidth={2.75} />}
      <span className="truncate">{children}</span>
    </button>
  );
}

/**
 * Segmented control — a short exclusive choice (period, angle, day…).
 * `allowClear` lets a second tap on the active segment unset it.
 */
export function Segmented<T extends string | number>({
  label,
  labelHidden,
  options,
  value,
  onSelect,
  allowClear,
  block,
  dense,
}: {
  label: string;
  labelHidden?: boolean;
  options: { value: T; label: string; title?: string; ariaLabel?: string }[];
  value?: T;
  onSelect: (value: T | undefined) => void;
  allowClear?: boolean;
  block?: boolean;
  /** Many or long segments in a narrow column: tighter padding, 13px. */
  dense?: boolean;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      {labelHidden ? (
        <p id={id} className="sr-only">
          {label}
        </p>
      ) : (
        <GroupLabel id={id}>{label}</GroupLabel>
      )}
      <div className={`${block ? "flex" : "inline-flex"} max-w-full rounded-xl bg-st-track p-1`}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={active}
              title={opt.title}
              aria-label={opt.ariaLabel}
              onClick={() => onSelect(active && allowClear ? undefined : opt.value)}
              className={`st-chip ${block ? "flex-1" : ""} min-w-0 rounded-[10px] ${dense ? "px-1 text-[13px]" : "px-3.5 text-[14px]"} [@media(max-height:660px)]:text-[13px] transition-[background-color,color,box-shadow] duration-150 ${focusRing} ${
                active
                  ? "bg-st-surface font-semibold text-st-ink shadow-[0_1px_2px_rgba(16,24,40,0.08),0_0_0_1px_var(--st-rule)]"
                  : "font-medium text-st-ink-2 hover:text-st-ink"
              }`}
              style={{ height: "calc(var(--st-chip-h) - 8px)", minHeight: "calc(var(--st-chip-h) - 8px)" }}
            >
              <span className="block truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 1-5 selector; tapping the active value clears it (back to "not set"). */
export function Scale({
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
      <GroupLabel id={id}>
        {label}
        <span className={`st-show-short font-normal ${type.help}`}> · {low} ↔ {high}</span>
      </GroupLabel>
      <div className="flex gap-1 rounded-xl bg-st-track p-1">
        {([1, 2, 3, 4, 5] as const).map((n) => {
          const active = value === n;
          const filled = value !== undefined && n < value;
          return (
            <button
              key={n}
              type="button"
              aria-label={aria(label, n)}
              aria-pressed={active}
              onClick={() => onSelect(active ? undefined : n)}
              className={`st-chip flex-1 rounded-[10px] text-[13.5px] font-medium tabular-nums transition-[background-color,color,box-shadow] duration-150 ${focusRing} ${
                active
                  ? "bg-st-surface text-st-accent-ink font-semibold shadow-[0_1px_2px_rgba(16,24,40,0.08),0_0_0_1.5px_var(--st-accent)]"
                  : filled
                    ? "bg-st-accent-wash text-st-ink"
                    : "text-st-ink-3 hover:text-st-ink"
              }`}
              style={{ height: "calc(var(--st-chip-h) - 8px)", minHeight: "calc(var(--st-chip-h) - 8px)" }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className={`st-hide-short mt-1 flex justify-between ${type.meta}`}>
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

/** − n + counter with a live readout; 44px targets. */
export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  fewerLabel,
  moreLabel,
  valueLabel,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  fewerLabel: string;
  moreLabel: string;
  valueLabel?: string;
  suffix?: string;
}) {
  const id = useId();
  const btn = `st-select inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-st-ink active:scale-[0.95] disabled:opacity-35 disabled:active:scale-100 ${focusRing}`;
  return (
    <div role="group" aria-labelledby={id}>
      <GroupLabel id={id}>{label}</GroupLabel>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label={fewerLabel} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className={btn}>
          <Minus aria-hidden className="h-4 w-4" />
        </button>
        <output aria-live="polite" aria-label={valueLabel} className="min-w-[3.25rem] text-center tabular-nums text-st-ink">
          <span className="text-[26px] font-semibold leading-none tracking-[-0.02em]">{value}</span>
          {suffix && <span className={`ml-1 ${type.help}`}>{suffix}</span>}
        </output>
        <button type="button" aria-label={moreLabel} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className={btn}>
          <Plus aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * A rich choice: title + one line (+ optional example). `aria-pressed`, coral
 * when chosen, a second tap clears it — the choices it carries are optional.
 */
export function OptionTile({
  title,
  desc,
  example,
  active,
  onClick,
  descClassName = "st-hide-short",
}: {
  title: string;
  desc?: string;
  example?: string;
  active: boolean;
  onClick: () => void;
  descClassName?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`st-select group relative flex w-full min-w-0 items-start gap-3 rounded-2xl px-4 py-[var(--st-option-py)] text-left active:scale-[0.99] ${focusRing}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] [@media(max-height:660px)]:text-[14px] font-semibold leading-5 tracking-[-0.01em] text-st-ink">{title}</span>
        {desc && <span className={`mt-1 block text-[13px] leading-[1.4] text-st-ink-2 ${descClassName}`}>{desc}</span>}
        {example && (
          <span className={`mt-1 line-clamp-2 text-[13px] italic leading-[1.4] text-st-ink-3 ${descClassName}`}>{example}</span>
        )}
      </span>
      <span
        aria-hidden
        className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ${
          active ? "bg-[color:var(--st-accent)] text-white/100" : "ring-1 ring-inset ring-[color:var(--st-field-border-hover)]"
        }`}
      >
        {active && <Check className="st-pop h-3 w-3" strokeWidth={3.25} />}
      </span>
    </button>
  );
}
