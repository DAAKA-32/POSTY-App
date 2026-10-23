"use client";

/**
 * The two free-text answers of the editorial line — what you do (Business)
 * and who you talk to (Audience). Controlled: the journey binds them to its
 * answers, the Settings view to the session params.
 */

import { useId, useMemo, type KeyboardEvent } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useJourneyCopy } from "@/lib/strategist/journey-copy";
import { AUDIENCE_MAX, CONTEXT_MAX, contextFromBusiness } from "@/lib/strategist/journey";
import { Chip, FieldLabel } from "../fields";
import { focusRing, textAction } from "../ui";
import { type } from "../type";

interface FieldProps {
  value: string;
  onChange: (v: string) => void;
  /** The value is refused; `errorId` is the message that says why. */
  invalid?: boolean;
  errorId?: string;
  /** Enter (input) / Ctrl-⌘+Enter (textarea): move on. */
  onSubmit?: () => void;
  /** Examples and profile suggestions when the field is empty. */
  withHelpers?: boolean;
  /** Textarea height class; defaults to the journey's density token. */
  heightClass?: string;
}

const describedBy = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

export function BusinessField({ value, onChange, invalid, errorId, onSubmit, withHelpers = true, heightClass = "h-[var(--st-textarea-h)]" }: FieldProps) {
  const { j } = useJourneyCopy();
  const { userProfile } = useAuth();
  const id = useId();
  const fromProfile = contextFromBusiness(userProfile?.profile?.business);
  const empty = !value.trim();

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (onSubmit && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div>
      <FieldLabel htmlFor={id} hintId={`${id}-hint`} label={j.activity.field} hint={j.activity.hint} hintClassName="st-hide-short" />
      <div className="relative">
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={CONTEXT_MAX}
          placeholder={j.activity.placeholder}
          aria-describedby={describedBy(`${id}-hint`, `${id}-count`, invalid && errorId)}
          aria-invalid={invalid || undefined}
          className={`st-field block resize-none pb-7 ${heightClass}`}
        />
        <span id={`${id}-count`} className={`pointer-events-none absolute bottom-2.5 right-3.5 ${type.meta}`} aria-label={`${value.length} / ${CONTEXT_MAX}`}>
          {value.length}/{CONTEXT_MAX}
        </span>
      </div>

      {withHelpers && fromProfile && fromProfile !== value.trim() && (
        <button type="button" onClick={() => onChange(fromProfile)} className={`mt-[var(--st-s2)] inline-flex items-center gap-1.5 text-[13.5px] ${textAction}`}>
          <Sparkles aria-hidden className="h-3.5 w-3.5" />
          {j.activity.useProfile}
        </button>
      )}

      {withHelpers && empty && (
        <div className="st-hide-short mt-[var(--st-s3)]">
          <p className={`mb-[var(--st-s1)] ${type.kicker} !text-st-ink-3`}>{j.activity.examplesLabel}</p>
          <ul className="space-y-1">
            {j.activity.examples.map((ex) => (
              <li key={ex}>
                <button
                  type="button"
                  onClick={() => onChange(ex)}
                  className={`group w-full rounded-r-lg border-l-2 border-[color:var(--st-accent-soft)] py-1.5 pl-3.5 pr-2 text-left text-[13.5px] leading-[1.45] text-st-ink-2 transition-colors hover:border-[color:var(--st-accent)] hover:bg-st-track hover:text-st-ink ${focusRing}`}
                >
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function AudienceField({ value, onChange, invalid, errorId, onSubmit, withHelpers = true }: FieldProps) {
  const { j } = useJourneyCopy();
  const { userProfile } = useAuth();
  const id = useId();
  const current = value.trim();

  // What the profile already says (business ideal customer, onboarding audiences).
  const suggestions = useMemo(() => {
    const p = userProfile?.profile;
    const raw = [p?.business?.idealCustomer, ...(Array.isArray(p?.targetAudience) ? p!.targetAudience : [p?.targetAudience])];
    const seen = new Set<string>();
    return raw
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter((s) => s && s.length <= AUDIENCE_MAX && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
      .slice(0, 4);
  }, [userProfile]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (onSubmit && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div>
      <FieldLabel htmlFor={id} hintId={`${id}-hint`} label={j.audience.field} hint={j.audience.hint} hintClassName="st-hide-short" />
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        maxLength={AUDIENCE_MAX}
        enterKeyHint={onSubmit ? "next" : undefined}
        placeholder={j.audience.placeholder}
        aria-describedby={describedBy(`${id}-hint`, invalid && errorId)}
        aria-invalid={invalid || undefined}
        className="st-field h-12"
      />

      {withHelpers && suggestions.length > 0 && (
        <div className="mt-[var(--st-s3)]">
          <p className={`mb-[var(--st-s1)] ${type.kicker} !text-st-ink-3`}>{j.audience.suggestions}</p>
          <div className="flex flex-wrap gap-[var(--st-s1)]">
            {suggestions.map((s) => (
              <Chip key={s} active={current === s} onClick={() => onChange(s)}>
                {s}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {withHelpers && !current && (
        <div className="st-hide-short mt-[var(--st-s3)]">
          <p className={`mb-[var(--st-s1)] ${type.kicker} !text-st-ink-3`}>{j.audience.examplesLabel}</p>
          <div className="flex flex-wrap gap-[var(--st-s1)]">
            {j.audience.examples.map((ex) => (
              <Chip key={ex} active={false} onClick={() => onChange(ex)}>
                {ex}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
