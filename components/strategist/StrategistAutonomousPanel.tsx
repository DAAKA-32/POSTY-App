"use client";

/**
 * StrategistAutonomousPanel — compact opt-in card for the weekly autonomous
 * batch generator, rendered inside the Strategist drawer hero (below the
 * starter cards). Replaces the deprecated AutonomousStrategistSection that
 * used to live in /settings.
 *
 * Two display states:
 *   - Collapsed (default): one-liner with toggle. Saves vertical space in
 *     the hero so the starter cards stay the focal point.
 *   - Expanded: reveals day picker + count slider + custom prompt. Click
 *     the toggle to switch ON ⇒ expanded, click to switch OFF ⇒ collapsed.
 *
 * Persists into `users/{uid}.autonomousMode` via dot-notation patches so
 * sibling fields (lastTriggeredAt, set by the cron) survive.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronDown, Loader2, Sparkles } from "lucide-react";
import StrategistMark from "./StrategistMark";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAuthHeaders } from "@/lib/api/client";
import { nextRunLabel } from "@/lib/strategist/next-run";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/db/firebase";
import toast from "@/components/ui/Toast";
import type { AutonomousStrategistConfig } from "@/types";

const DAY_LABELS_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

const MIN_COUNT = 3;
const MAX_COUNT = 10;
const DEFAULT_COUNT = 5;

export default function StrategistAutonomousPanel() {
  const { user } = useAuth();
  const { language } = useLanguage();

  // Founder-only tweak: a roomier custom-prompt limit + a live character
  // counter so emilien can write detailed campaign prompts without silent
  // truncation. Everyone else keeps the default 400 and sees no counter.
  const isEmilien =
    (user?.email || "").toLowerCase() === "emilien.nepveu@gmail.com";
  const promptMax = isEmilien ? 2000 : 400;

  const [enabled, setEnabled] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(0);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [customPrompt, setCustomPrompt] = useState("");
  const [lastTriggeredAt, setLastTriggeredAt] = useState<number | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const cfg = snap.exists()
          ? (snap.data().autonomousMode as AutonomousStrategistConfig | undefined)
          : undefined;
        if (cfg) {
          setEnabled(!!cfg.enabled);
          setDayOfWeek((cfg.dayOfWeek ?? 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6);
          setCount(clampCount(cfg.count ?? DEFAULT_COUNT));
          setCustomPrompt(cfg.customPrompt ?? "");
          // When already enabled on mount, open the panel so the user lands
          // on their full config without an extra click.
          if (cfg.enabled) setExpanded(true);
          const last = (cfg.lastTriggeredAt as { toMillis?: () => number } | undefined)?.toMillis?.();
          if (typeof last === "number") setLastTriggeredAt(last);
        }
      } catch (err) {
        console.warn("[StrategistAutonomousPanel] hydrate failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  const save = async (next: Partial<AutonomousStrategistConfig>) => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {};
      if (next.enabled !== undefined) patch["autonomousMode.enabled"] = next.enabled;
      if (next.dayOfWeek !== undefined) patch["autonomousMode.dayOfWeek"] = next.dayOfWeek;
      if (next.count !== undefined) patch["autonomousMode.count"] = next.count;
      if (next.customPrompt !== undefined) {
        patch["autonomousMode.customPrompt"] = next.customPrompt || null;
      }
      patch["updatedAt"] = serverTimestamp();
      await updateDoc(doc(db, "users", user.uid), patch);
    } catch (err) {
      console.error("[StrategistAutonomousPanel] save failed:", err);
      toast.error("Échec de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const onToggleEnabled = (next: boolean) => {
    setEnabled(next);
    setExpanded(next); // expand on ON, collapse on OFF
    void save({ enabled: next });
    toast.success(next ? "Mode autonome activé." : "Mode autonome désactivé.");
  };

  /**
   * Generate a plan on demand RIGHT NOW (don't wait for the weekly cron).
   * Uses the same config the cron would (count + custom prompt) and surfaces
   * the resulting batch in the chat via the existing `strategist:open-batch`
   * event — where the user reviews and validates it (approve → generate →
   * schedule). This is what makes the panel actionable instead of "set & wait".
   */
  const generateNow = async () => {
    if (!user?.uid || generating) return;
    setGenerating(true);
    try {
      const headers = await getAuthHeaders();
      const timezone =
        (typeof Intl !== "undefined" &&
          Intl.DateTimeFormat().resolvedOptions().timeZone) ||
        "UTC";
      const trimmed = customPrompt.trim();
      const sourcePrompt =
        trimmed ||
        (language === "en"
          ? `Prepare a coherent editorial plan of ${count} LinkedIn posts for the week ahead.`
          : `Prépare un plan éditorial cohérent de ${count} posts LinkedIn pour la semaine à venir.`);

      const res = await fetch("/api/strategist/batch-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          sourcePrompt,
          count,
          timezone,
          language: language === "fr" ? "fr" : "en",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Génération échouée. Réessaye.");
        return;
      }
      const data = await res.json();
      const batchId = data?.batch?.id as string | undefined;
      if (!batchId) {
        toast.error("Génération échouée. Réessaye.");
        return;
      }
      // Hand off to the chat panel, which fetches + renders the BatchPlanCard
      // so the user can review and validate before anything is published.
      window.dispatchEvent(
        new CustomEvent("strategist:open-batch", { detail: { batchId } })
      );
      toast.success("Plan généré — relis-le et valide-le ci-dessous.");
    } catch (err) {
      console.error("[StrategistAutonomousPanel] generateNow failed:", err);
      toast.error("Génération échouée. Vérifie ta connexion.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 flex items-center gap-2 text-text-muted text-[12px]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Mode autonome…
      </div>
    );
  }

  return (
    <section className="mt-6">
      {/* Section label — mirrors the "COMMENCER PAR" eyebrow style. */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted mb-2.5">
        Agent autonome
      </p>

      <div
        className={`
          rounded-xl border transition-colors
          ${enabled
            ? "bg-amber-50/60 dark:bg-amber-400/8 border-amber-300/60 dark:border-amber-400/30"
            : "bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border"}
        `}
      >
        {/* Compact header — the WHOLE row toggles the agent on/off. The
            visual <Toggle> on the right mirrors the state but doesn't own
            the click — that lets the user tap anywhere on the card,
            including the title/description, which is what most users
            instinctively try. We use a <button> for proper a11y semantics
            (Space/Enter activates, role announced as switch via aria). */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggleEnabled(!enabled)}
          disabled={saving}
          className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.03] disabled:cursor-not-allowed"
        >
          <div
            className={`
              w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0
              ${enabled
                ? "bg-amber-100 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400"
                : "bg-gray-100 dark:bg-dark-elevated text-text-muted"}
            `}
          >
            <StrategistMark className="w-3.5 h-3.5" withSecondarySparkle={false} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-medium text-gray-900 dark:text-white leading-tight">
              Déléguer ma présence LinkedIn
            </p>
            <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
              {enabled
                ? `Plan généré chaque ${DAY_LABELS_FR[dayOfWeek].toLowerCase()} matin — ${count} posts.`
                : "Le Stratège prépare un plan automatiquement, tu valides."}
            </p>
          </div>
          {/* Decorative — real toggle handled by the parent button click */}
          <Toggle checked={enabled} disabled={saving} />
        </button>

        {/* Expanded config — only when enabled. */}
        <AnimatePresence initial={false}>
          {enabled && expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-amber-200/50 dark:border-amber-400/20">
                {/* Dashboard — next + last run at a glance */}
                <div className="grid grid-cols-2 gap-2 pt-3">
                  <div className="rounded-md bg-white/60 dark:bg-dark-elevated/60 border border-gray-200/70 dark:border-dark-border px-2.5 py-2">
                    <p className="text-[9.5px] uppercase tracking-wide text-text-muted">Prochain plan</p>
                    <p className="text-[11.5px] font-medium text-gray-900 dark:text-white mt-0.5 leading-snug capitalize">
                      {nextRunLabel(dayOfWeek)}
                    </p>
                  </div>
                  <div className="rounded-md bg-white/60 dark:bg-dark-elevated/60 border border-gray-200/70 dark:border-dark-border px-2.5 py-2">
                    <p className="text-[9.5px] uppercase tracking-wide text-text-muted">Dernier plan</p>
                    <p className="text-[11.5px] font-medium text-gray-900 dark:text-white mt-0.5 leading-snug">
                      {lastTriggeredAt
                        ? `${new Date(lastTriggeredAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · ${count} posts`
                        : "Aucun encore"}
                    </p>
                  </div>
                </div>

                {/* Day + count, side by side on wider screens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">
                      <Calendar className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                      Jour
                    </label>
                    <select
                      value={dayOfWeek}
                      onChange={(e) => {
                        const d = Number(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
                        setDayOfWeek(d);
                        void save({ dayOfWeek: d });
                      }}
                      className="
                        w-full px-2.5 py-1.5 rounded-md
                        bg-white dark:bg-dark-elevated
                        border border-gray-200 dark:border-dark-border
                        text-[12px] text-gray-900 dark:text-white
                        focus:outline-none focus:ring-2 focus:ring-amber-400/50
                      "
                    >
                      {DAY_LABELS_FR.map((label, idx) => (
                        <option key={idx} value={idx}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-text-secondary">
                        Posts / semaine
                      </label>
                      <span className="text-[12px] font-semibold text-amber-600 dark:text-amber-400">
                        {count}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={MIN_COUNT}
                      max={MAX_COUNT}
                      step={1}
                      value={count}
                      onChange={(e) => {
                        const next = clampCount(Number(e.target.value));
                        setCount(next);
                        void save({ count: next });
                      }}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Custom prompt */}
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">
                    Prompt personnalisé{" "}
                    <span className="text-text-muted font-normal">(optionnel)</span>
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    onBlur={() => save({ customPrompt: customPrompt.trim() })}
                    rows={2}
                    maxLength={promptMax}
                    placeholder="Ex: Focus sur cas clients SaaS B2B, ton direct."
                    className="
                      w-full px-2.5 py-1.5 rounded-md resize-none
                      bg-white dark:bg-dark-elevated
                      border border-gray-200 dark:border-dark-border
                      text-[12px] text-gray-900 dark:text-white
                      placeholder:text-text-muted/70
                      focus:outline-none focus:ring-2 focus:ring-amber-400/50
                    "
                  />
                  {isEmilien && (
                    <p
                      className={`mt-1 text-right text-[10px] tabular-nums ${
                        customPrompt.length >= promptMax
                          ? "text-amber-600 dark:text-amber-400 font-medium"
                          : "text-text-muted"
                      }`}
                    >
                      {customPrompt.length} / {promptMax}
                    </p>
                  )}
                </div>

                {/* On-demand generation — the panel above only schedules the
                    weekly cron; this button makes the agent act NOW so the user
                    gets a plan to review + validate without waiting for the
                    chosen day. */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={generateNow}
                    disabled={generating}
                    className="
                      w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                      text-[12.5px] font-semibold
                      bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed
                      text-white shadow-sm
                      transition-colors
                    "
                  >
                    {generating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {generating ? "Génération du plan…" : "Générer un plan maintenant"}
                  </button>
                  <p className="mt-1.5 text-[10.5px] text-text-muted leading-snug text-center">
                    Teste tout de suite : tu obtiens un plan à relire et valider, sans attendre {DAY_LABELS_FR[dayOfWeek].toLowerCase()}.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show "configure" toggle button only when enabled AND collapsed */}
        {enabled && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="
              w-full px-3.5 py-2 border-t border-amber-200/50 dark:border-amber-400/20
              text-[11.5px] font-medium text-amber-700 dark:text-amber-400
              hover:bg-amber-100/50 dark:hover:bg-amber-400/10
              flex items-center justify-center gap-1
              transition-colors
            "
          >
            Configurer
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>
    </section>
  );
}

// ─── Atoms ──────────────────────────────────────────────────────────────────

/** Purely decorative toggle visual. The click is owned by the parent
 *  button (the whole card is tappable) — wrapping a button inside another
 *  button is invalid HTML and breaks screen reader navigation. */
function Toggle({
  checked,
  disabled,
}: {
  checked: boolean;
  disabled?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`
        relative inline-flex flex-shrink-0 h-5 w-9 rounded-full border transition-colors
        ${disabled ? "opacity-50" : ""}
        ${checked
          ? "bg-amber-500 border-amber-600"
          : "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600"}
      `}
    >
      <span
        className={`
          inline-block h-[14px] w-[14px] transform rounded-full bg-white shadow-sm transition-transform
          mt-[2px]
          ${checked ? "translate-x-[1.125rem]" : "translate-x-[2px]"}
        `}
      />
    </span>
  );
}

function clampCount(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_COUNT;
  return Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(n)));
}

