"use client";

/**
 * StrategistComposer — the input at the bottom of the drawer.
 *
 *   - Auto-grow textarea (16px font: no iOS zoom), Enter sends, Shift+Enter
 *     adds a line. Typing stays possible while an answer streams (the field
 *     is no longer disabled, so the mobile keyboard doesn't drop).
 *   - Coral send button once there is something to send; ink Stop while a
 *     request runs.
 *   - Errors are announced (role="alert") with a real "Retry".
 *   - A chip shows when this session's settings differ from the saved ones.
 *   - Bottom safe-area padding (iPhone home indicator).
 */

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUp, Square, SlidersHorizontal, X } from "lucide-react";
import { useStrategistCopy } from "@/lib/strategist/copy";
import { useStrategistSession } from "./StrategistSession";
import { focusRing } from "./ui";
import { MEASURE } from "./type";

export default function StrategistComposer() {
  const { c } = useStrategistCopy();
  const {
    send, stop, busy, error, retry, dismissError, prefill, unsavedCount, setView,
  } = useStrategistSession();
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(180, Math.max(48, ta.scrollHeight)) + "px";
  }, [value]);

  // Prefill requests ("Write a post about ") → fill, focus, caret at the end.
  useEffect(() => {
    if (!prefill) return;
    setValue(prefill.text);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(prefill.text.length, prefill.text.length);
    });
  }, [prefill]);

  // An untouched prefill ("Rédige un post sur ") is not a request — sending it
  // used to produce a post about nothing.
  const isBarePrefill = !!prefill && value.trim() === prefill.text.trim();
  const canSend = value.trim().length > 0 && !busy && !isBarePrefill;
  const submit = () => {
    if (!canSend) return;
    send(value);
    setValue("");
  };

  return (
    <div className="shrink-0 border-t border-st-rule pb-[max(env(safe-area-inset-bottom),0px)]">
      {error && (
        <div className={`${MEASURE} px-4 pt-3 lg:px-0`} role="alert">
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-[14px] text-red-800 dark:text-red-200">
            <AlertCircle aria-hidden className="w-[18px] h-[18px] mt-0.5 flex-shrink-0" />
            <span className="flex-1 leading-snug">{error.message}</span>
            {error.canRetry && (
              <button
                type="button"
                onClick={retry}
                className={`-my-1.5 h-9 px-3 rounded-lg font-semibold text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-500/20 ${focusRing}`}
              >
                {c.composer.retry}
              </button>
            )}
            <button
              type="button"
              onClick={dismissError}
              aria-label={c.composer.dismiss}
              className={`-my-1.5 -mr-1.5 w-9 h-9 inline-flex items-center justify-center rounded-lg text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20 ${focusRing}`}
            >
              <X aria-hidden className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className={`${MEASURE} px-4 pt-3 pb-3 sm:px-8 lg:px-0`}>
        {unsavedCount > 0 && (
          <button
            type="button"
            onClick={() => setView("settings")}
            className={`no-min-size mb-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-st-accent-wash text-[13px] font-medium text-st-accent-ink ${focusRing}`}
          >
            <SlidersHorizontal aria-hidden className="w-3.5 h-3.5" />
            {c.composer.customSettings(unsavedCount)}
          </button>
        )}
        <div className="relative flex items-end gap-2 rounded-2xl border border-st-field-border bg-st-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[border-color,box-shadow] focus-within:border-[color:var(--st-accent)] focus-within:shadow-[0_0_0_4px_var(--st-accent-ring)]">
          <label htmlFor="strategist-input" className="sr-only">
            {c.composer.inputLabel}
          </label>
          <textarea
            id="strategist-input"
            ref={taRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={c.composer.placeholder}
            rows={1}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck
            className="st-composer-input flex-1 resize-none rounded-l-2xl bg-transparent pl-4 py-3 text-st-ink placeholder:text-st-ink-3 focus:outline-none"
            style={{ fontSize: "max(16px, 1rem)", lineHeight: 1.5, minHeight: 48, maxHeight: 180 }}
          />
          <div className="p-1.5">
            {busy ? (
              <button
                type="button"
                onClick={stop}
                aria-label={c.composer.stop}
                title={c.composer.stop}
                className={`st-btn-primary w-10 h-10 rounded-xl inline-flex items-center justify-center active:scale-95 ${focusRing}`}
              >
                <Square aria-hidden className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!canSend}
                aria-label={c.composer.send}
                title={c.composer.send}
                className={`w-10 h-10 rounded-xl inline-flex items-center justify-center transition-[filter,transform] ${focusRing} ${
                  canSend ? "st-btn-brand active:scale-95" : "bg-st-track text-st-ink-3 cursor-not-allowed"
                }`}
              >
                <ArrowUp aria-hidden className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
