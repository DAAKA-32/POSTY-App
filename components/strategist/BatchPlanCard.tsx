"use client";

/**
 * BatchPlanCard — renders a Strategist-generated editorial batch inside the
 * Strategist drawer.
 *
 * Phase 1 deliverable: read-only-ish table of briefs (hook + angle + format +
 * date + time + rationale). Lets the user:
 *   - Inline-edit hook / angle / date / time
 *   - Delete a row
 *   - Approve the batch (status → "approved", surfaces a follow-up CTA that
 *     Phase 2 will pick up to materialize each brief into a real post)
 *   - Discard the batch
 *
 * Intentionally NOT a fancy table component (no virtualization, no DnD). N is
 * always ≤ 15 briefs — the simplest list of motion cards is the right tool.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  CheckCircle2,
  X,
  Wand2,
  RotateCw,
  Copy,
  Check,
  Loader2,
  CalendarClock,
} from "lucide-react";
import StrategistMark from "./StrategistMark";
import type { StrategyBatch, PostBrief } from "@/types";
import {
  patchPostBrief,
  deletePostBrief,
  setBatchStatus,
  patchMaterializedPost,
} from "@/lib/db/strategy-batches";
import { getAuthHeaders } from "@/lib/api/client";
import { useLanguage } from "@/contexts/LanguageContext";
import toast from "@/components/ui/Toast";

interface Props {
  batch: StrategyBatch;
  /** Notify parent the batch was approved / discarded so it can advance the
   *  chat state (Phase 2 hook plugs in here). */
  onApproved?: (batch: StrategyBatch) => void;
  onDiscarded?: (batchId: string) => void;
}

export default function BatchPlanCard({ batch, onApproved, onDiscarded }: Props) {
  const { language } = useLanguage();
  // Local copy so edits feel instant — Firestore writes are fire-and-forget
  // with toast-on-error rather than blocking the UI.
  const [posts, setPosts] = useState<PostBrief[]>(batch.posts);
  const [status, setStatus] = useState<StrategyBatch["status"]>(batch.status);
  const [savingId, setSavingId] = useState<string | null>(null);
  // Materialization state — Set of briefIds currently being regenerated,
  // plus a top-level boolean for "generate all" in progress.
  const [materializingIds, setMaterializingIds] = useState<Set<string>>(new Set());
  const [materializingAll, setMaterializingAll] = useState(false);
  // Scheduling state — a single in-flight boolean (we schedule the whole
  // batch in one shot, not per-row) plus a confirm gate so the user doesn't
  // accidentally fire posts into the publishing pipeline.
  const [scheduling, setScheduling] = useState(false);
  const [confirmSchedule, setConfirmSchedule] = useState(false);

  // "Edit brief" is allowed only in draft. After approve, the briefs are
  // frozen and the row UI swaps to the materialized post preview.
  const isLocked = status !== "draft";
  const isApprovedOrLater =
    status === "approved" || status === "materialized" || status === "scheduled";
  const allMaterialized =
    posts.length > 0 && posts.every((p) => p.materialized?.content);
  const someMaterialized = posts.some((p) => p.materialized?.content);

  const patchRow = async (id: string, patch: Partial<Omit<PostBrief, "id">>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setSavingId(id);
    try {
      await patchPostBrief(batch.id, id, patch);
    } catch (err) {
      toast.error("Échec de la sauvegarde — réessaye.");
      console.warn("[BatchPlanCard] patchRow failed:", err);
    } finally {
      setSavingId(null);
    }
  };

  const removeRow = async (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    try {
      await deletePostBrief(batch.id, id);
    } catch {
      toast.error("Impossible de supprimer ce brief.");
    }
  };

  const approve = async () => {
    setStatus("approved");
    try {
      await setBatchStatus(batch.id, "approved");
      onApproved?.({ ...batch, posts, status: "approved" });
      toast.success("Plan approuvé. Clique sur \"Générer les posts\" pour matérialiser le contenu.");
    } catch {
      setStatus("draft");
      toast.error("Approbation échouée. Réessaye.");
    }
  };

  const discard = async () => {
    setStatus("discarded");
    try {
      await setBatchStatus(batch.id, "discarded");
      onDiscarded?.(batch.id);
    } catch {
      setStatus("draft");
    }
  };

  /** Call the materialize endpoint, optionally for a subset of briefIds.
   *  Patches local state with the returned post bodies and updates the
   *  batch status when every brief is materialized. */
  const materialize = async (briefIds?: string[], force = false) => {
    if (briefIds && briefIds.length > 0) {
      setMaterializingIds(new Set(briefIds));
    } else {
      setMaterializingAll(true);
    }
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/strategist/materialize", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          batchId: batch.id,
          briefIds,
          force,
          language: language === "fr" ? "fr" : "en",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Génération des posts échouée.");
        return;
      }
      const data = (await res.json()) as {
        status: StrategyBatch["status"];
        results: Array<{ briefId: string; ok: boolean; content?: string; error?: string }>;
      };

      // Patch local state for each successful brief.
      setPosts((prev) =>
        prev.map((p) => {
          const r = data.results.find((x) => x.briefId === p.id);
          if (r && r.ok && r.content) {
            return {
              ...p,
              materialized: {
                content: r.content,
                generatedAt: Date.now(),
                model: "gpt-4o",
              },
            };
          }
          return p;
        })
      );
      setStatus(data.status);

      const failed = data.results.filter((r) => !r.ok);
      if (failed.length > 0) {
        toast.error(
          `${failed.length} post${failed.length > 1 ? "s n'ont" : " n'a"} pas pu être généré${failed.length > 1 ? "s" : ""}. Réessaye.`
        );
      } else if (data.results.length > 0) {
        toast.success(
          data.results.length === 1
            ? "Post régénéré."
            : `${data.results.length} posts générés.`
        );
      }
    } catch (err) {
      console.error("[BatchPlanCard] materialize failed:", err);
      toast.error("Génération échouée. Vérifie ta connexion.");
    } finally {
      setMaterializingIds(new Set());
      setMaterializingAll(false);
    }
  };

  /** Inline-edit of the materialized post body (after generation, before
   *  scheduling). Optimistic local patch, async Firestore write. */
  const editMaterialized = async (briefId: string, content: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === briefId && p.materialized
          ? { ...p, materialized: { ...p.materialized, content } }
          : p
      )
    );
    try {
      await patchMaterializedPost(batch.id, briefId, content);
    } catch {
      toast.error("Édition non sauvegardée.");
    }
  };

  /** Phase 3 — hand every materialized brief off to the publishing cron via
   *  `scheduledPosts`. Two-step confirmation: first click sets a confirm gate,
   *  second click fires. The server resolves smart slots (peak windows, past
   *  rescue, conflict spread) so the UI doesn't need to think about timing. */
  const schedule = async () => {
    if (!confirmSchedule) {
      setConfirmSchedule(true);
      // Auto-reset the confirm gate after 6s so the button doesn't stay armed.
      setTimeout(() => setConfirmSchedule(false), 6000);
      return;
    }
    setConfirmSchedule(false);
    setScheduling(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/strategist/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          batchId: batch.id,
          platform: "linkedin",
          visibility: "PUBLIC",
          language: language === "fr" ? "fr" : "en",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Programmation échouée.");
        return;
      }
      const data = (await res.json()) as {
        status: StrategyBatch["status"];
        results: Array<{
          briefId: string;
          ok: boolean;
          scheduledPostId?: string;
          fireAtMs?: number;
          adjusted?: boolean;
        }>;
      };

      // Patch local state with the scheduled timestamps.
      setPosts((prev) =>
        prev.map((p) => {
          const r = data.results.find((x) => x.briefId === p.id && x.ok);
          if (!r) return p;
          return {
            ...p,
            scheduledPostId: r.scheduledPostId,
            scheduledAt: r.fireAtMs,
          };
        })
      );
      setStatus(data.status);

      const success = data.results.filter((r) => r.ok).length;
      const adjusted = data.results.filter((r) => r.ok && r.adjusted).length;
      const failed = data.results.filter((r) => !r.ok).length;

      if (success > 0) {
        const adjNote = adjusted > 0 ? ` (${adjusted} créneau${adjusted > 1 ? "x" : ""} ajusté${adjusted > 1 ? "s" : ""})` : "";
        toast.success(`${success} post${success > 1 ? "s programmés" : " programmé"}${adjNote}.`);
      }
      if (failed > 0) {
        toast.error(`${failed} post${failed > 1 ? "s n'ont" : " n'a"} pas pu être programmé${failed > 1 ? "s" : ""}.`);
      }
    } catch (err) {
      console.error("[BatchPlanCard] schedule failed:", err);
      toast.error("Programmation échouée. Vérifie ta connexion.");
    } finally {
      setScheduling(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="
        my-3 rounded-2xl
        bg-white dark:bg-dark-card
        border border-amber-300/50 dark:border-amber-400/30
        shadow-[0_8px_30px_-12px_rgba(245,158,11,0.15)]
        overflow-hidden
      "
    >
      {/* Header — theme + count + status pill */}
      <header className="px-4 py-3 border-b border-gray-100 dark:border-dark-border/40 flex items-start gap-3">
        <div className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 flex-shrink-0">
          <StrategistMark className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">
              {batch.theme}
            </h3>
            <StatusPill status={status} />
          </div>
          <p className="text-[12px] text-text-muted mt-0.5">
            {posts.length} brief{posts.length > 1 ? "s" : ""} ·{" "}
            {batch.timezone}
          </p>
        </div>
      </header>

      {/* Briefs list */}
      <ul className="divide-y divide-gray-100 dark:divide-dark-border/40">
        <AnimatePresence initial={false}>
          {posts.map((p, idx) => (
            <BriefRow
              key={p.id}
              index={idx + 1}
              brief={p}
              locked={isLocked}
              saving={savingId === p.id}
              materializing={materializingIds.has(p.id) || (materializingAll && !p.materialized)}
              onPatch={(patch) => patchRow(p.id, patch)}
              onDelete={() => removeRow(p.id)}
              onRegenerate={() => materialize([p.id], true)}
              onEditPost={(content) => editMaterialized(p.id, content)}
            />
          ))}
        </AnimatePresence>
      </ul>

      {/* Footer actions — three states:
            1. draft       → Jeter / Approuver
            2. approved    → Générer les posts (Phase 2 entry point)
            3. materialized → Tout régénérer (Phase 3 hook will plug in here:
               "Programmer ce batch") */}
      {!isLocked && posts.length > 0 && (
        <footer className="px-4 py-3 border-t border-gray-100 dark:border-dark-border/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={discard}
            className="
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-[12px] font-medium
              text-text-secondary hover:text-gray-900 dark:hover:text-white
              hover:bg-gray-100 dark:hover:bg-dark-hover
              transition-colors
            "
          >
            <X className="w-3.5 h-3.5" />
            Jeter
          </button>
          <button
            type="button"
            onClick={approve}
            className="
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-[12px] font-semibold
              bg-amber-500 hover:bg-amber-600
              text-white
              transition-colors shadow-sm
            "
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approuver le plan
          </button>
        </footer>
      )}

      {isApprovedOrLater && !allMaterialized && (
        <footer className="px-4 py-3 border-t border-gray-100 dark:border-dark-border/40 flex items-center justify-between gap-3">
          <p className="text-[12px] text-text-muted">
            {someMaterialized
              ? `${posts.filter((p) => p.materialized).length}/${posts.length} posts générés.`
              : "Plan approuvé — prêt à générer les posts complets."}
          </p>
          <button
            type="button"
            onClick={() => materialize()}
            disabled={materializingAll}
            className="
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-[12px] font-semibold
              bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed
              text-white
              transition-colors shadow-sm
            "
          >
            {materializingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            {materializingAll
              ? "Génération…"
              : someMaterialized
                ? "Générer les manquants"
                : "Générer les posts"}
          </button>
        </footer>
      )}

      {status === "materialized" && (
        <footer className="px-4 py-3 border-t border-gray-100 dark:border-dark-border/40 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[12px] text-emerald-700 dark:text-emerald-400 font-medium">
            ✓ Tous les posts sont prêts.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => materialize(undefined, true)}
              disabled={materializingAll || scheduling}
              className="
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                text-[12px] font-medium
                text-text-secondary hover:text-gray-900 dark:hover:text-white
                hover:bg-gray-100 dark:hover:bg-dark-hover disabled:opacity-50
                transition-colors
              "
            >
              <RotateCw className={`w-3.5 h-3.5 ${materializingAll ? "animate-spin" : ""}`} />
              Tout régénérer
            </button>
            <button
              type="button"
              onClick={schedule}
              disabled={scheduling || materializingAll}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                text-[12px] font-semibold
                disabled:opacity-60 disabled:cursor-not-allowed
                text-white shadow-sm
                transition-colors
                ${confirmSchedule
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-emerald-500 hover:bg-emerald-600"}
              `}
            >
              {scheduling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CalendarClock className="w-3.5 h-3.5" />
              )}
              {scheduling
                ? "Programmation…"
                : confirmSchedule
                  ? `Confirmer (${posts.filter((p) => p.materialized).length} posts)`
                  : "Programmer la publication"}
            </button>
          </div>
        </footer>
      )}

      {status === "scheduled" && (
        <footer className="px-4 py-3 border-t border-gray-100 dark:border-dark-border/40 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[12px] text-emerald-700 dark:text-emerald-400 font-medium">
            ✓ {posts.filter((p) => p.scheduledPostId).length} post
            {posts.filter((p) => p.scheduledPostId).length > 1 ? "s programmés" : " programmé"}.
            Publication automatique aux horaires prévus.
          </p>
          <a
            href="/schedule"
            className="
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-[12px] font-medium
              text-emerald-700 dark:text-emerald-400
              hover:bg-emerald-50 dark:hover:bg-emerald-500/10
              transition-colors
            "
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Voir le calendrier
          </a>
        </footer>
      )}
    </motion.section>
  );
}

// ─── Rows ───────────────────────────────────────────────────────────────────

function BriefRow({
  index,
  brief,
  locked,
  saving,
  materializing,
  onPatch,
  onDelete,
  onRegenerate,
  onEditPost,
}: {
  index: number;
  brief: PostBrief;
  locked: boolean;
  saving: boolean;
  materializing: boolean;
  onPatch: (patch: Partial<Omit<PostBrief, "id">>) => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onEditPost: (newContent: string) => void;
}) {
  const hasPost = !!brief.materialized?.content;
  const [copied, setCopied] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [postDraft, setPostDraft] = useState("");

  const copyPost = async () => {
    if (!brief.materialized?.content) return;
    try {
      await navigator.clipboard.writeText(brief.materialized.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copie impossible.");
    }
  };

  const startEditPost = () => {
    setPostDraft(brief.materialized?.content ?? "");
    setEditingPost(true);
  };

  const commitEditPost = () => {
    setEditingPost(false);
    const next = postDraft.trim();
    if (next && next !== brief.materialized?.content) onEditPost(next);
  };
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18 }}
      className="px-4 py-3 group/row"
    >
      <div className="flex items-start gap-3">
        {/* Index */}
        <span
          className="
            mt-0.5 flex items-center justify-center w-6 h-6 rounded-full
            text-[11px] font-semibold flex-shrink-0
            bg-amber-50 dark:bg-amber-400/10
            text-amber-700 dark:text-amber-400
          "
        >
          {index}
        </span>

        <div className="flex-1 min-w-0">
          {/* Hook (editable) */}
          <EditableText
            value={brief.hook}
            onChange={(v) => onPatch({ hook: v })}
            locked={locked}
            placeholder="Hook"
            className="text-[13.5px] font-medium text-gray-900 dark:text-white leading-snug"
            multiline
          />

          {/* Angle (editable) */}
          <EditableText
            value={brief.angle}
            onChange={(v) => onPatch({ angle: v })}
            locked={locked}
            placeholder="Angle"
            className="mt-1 text-[12px] text-text-secondary leading-snug"
            multiline
          />

          {/* Format + slot row */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className="
                inline-flex items-center px-1.5 py-0.5 rounded-md
                bg-gray-100 dark:bg-dark-elevated
                text-text-muted font-medium uppercase tracking-wide
              "
            >
              {brief.format}
            </span>

            <DateInput
              value={brief.suggestedDate}
              onChange={(v) => onPatch({ suggestedDate: v })}
              locked={locked}
            />

            <TimeInput
              value={brief.suggestedTime}
              onChange={(v) => onPatch({ suggestedTime: v })}
              locked={locked}
            />

            {saving && (
              <span className="text-text-muted text-[10.5px] italic">
                sauvegarde…
              </span>
            )}
          </div>

          {/* Rationale — read-only, tooltip-style on a single line */}
          {brief.rationale && !hasPost && (
            <p
              className="
                mt-1.5 text-[11px] text-text-muted italic leading-snug
                line-clamp-2
              "
              title={brief.rationale}
            >
              💡 {brief.rationale}
            </p>
          )}

          {/* ─── Materialized post block ─────────────────────────────────
              Appears once Phase 2 has generated the full post copy for this
              brief. Replaces the rationale (the brief context is implicit
              now — what matters is the publishable copy). */}
          {(hasPost || materializing) && (
            <div className="mt-3 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/5 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
                  Post prêt à publier
                </span>
                <div className="flex items-center gap-0.5">
                  {hasPost && !editingPost && (
                    <>
                      <button
                        type="button"
                        onClick={copyPost}
                        className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 transition-colors"
                        aria-label="Copier le post"
                        title="Copier"
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={startEditPost}
                        className="px-1.5 py-0.5 rounded text-[10.5px] font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/15 transition-colors"
                      >
                        Éditer
                      </button>
                      <button
                        type="button"
                        onClick={onRegenerate}
                        disabled={materializing}
                        className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 transition-colors disabled:opacity-50"
                        aria-label="Régénérer ce post"
                        title="Régénérer"
                      >
                        <RotateCw className={`w-3 h-3 ${materializing ? "animate-spin" : ""}`} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {materializing && !hasPost && (
                <div className="flex items-center gap-2 text-[12px] text-text-muted py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  Génération du post…
                </div>
              )}

              {hasPost && !editingPost && (
                <p className="text-[12.5px] leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words">
                  {brief.materialized!.content}
                </p>
              )}

              {brief.scheduledAt && (
                <p className="mt-2 text-[10.5px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" />
                  Programmé pour {formatDateTimeShort(brief.scheduledAt)}
                </p>
              )}

              {hasPost && editingPost && (
                <div>
                  <textarea
                    autoFocus
                    value={postDraft}
                    onChange={(e) => setPostDraft(e.target.value)}
                    rows={Math.max(6, Math.min(20, postDraft.split("\n").length + 2))}
                    className="
                      w-full bg-white dark:bg-dark-card
                      border border-emerald-300 dark:border-emerald-500/40
                      rounded-md p-2 text-[12.5px] leading-relaxed
                      text-gray-800 dark:text-gray-100
                      outline-none focus:ring-1 focus:ring-emerald-400
                      resize-y
                    "
                  />
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setEditingPost(false)}
                      className="text-[11px] text-text-muted hover:text-gray-900 dark:hover:text-white"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={commitEditPost}
                      className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      Sauvegarder
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete — hover-revealed, hidden when locked or post is materialized
            (deleting a materialized post should happen via batch-level action,
            not silently from a row hover). */}
        {!locked && !hasPost && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Supprimer ce brief"
            className="
              opacity-0 group-hover/row:opacity-100
              p-1.5 rounded-md
              text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10
              transition-all
            "
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.li>
  );
}

// ─── Atoms ──────────────────────────────────────────────────────────────────

function EditableText({
  value,
  onChange,
  locked,
  placeholder,
  className,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
  placeholder: string;
  className?: string;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  if (locked) {
    return <p className={className}>{value}</p>;
  }

  if (!editing) {
    return (
      <p
        className={`${className} cursor-text hover:bg-amber-50/40 dark:hover:bg-amber-400/5 rounded px-0.5 -mx-0.5 transition-colors`}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        title="Cliquer pour éditer"
      >
        {value || <span className="text-text-muted italic">{placeholder}</span>}
      </p>
    );
  }

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== value) onChange(next);
  };

  if (multiline) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setEditing(false);
            setDraft(value);
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
        }}
        rows={Math.max(2, Math.ceil(draft.length / 50))}
        className={`${className} w-full resize-none bg-amber-50/50 dark:bg-amber-400/10 border border-amber-300 dark:border-amber-400/40 rounded px-1 py-0.5 outline-none`}
      />
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setEditing(false);
          setDraft(value);
        }
        if (e.key === "Enter") commit();
      }}
      className={`${className} w-full bg-amber-50/50 dark:bg-amber-400/10 border border-amber-300 dark:border-amber-400/40 rounded px-1 py-0.5 outline-none`}
    />
  );
}

function DateInput({
  value,
  onChange,
  locked,
}: {
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
}) {
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 text-text-muted">
        <CalendarIcon className="w-3 h-3" />
        {formatDateShort(value)}
      </span>
    );
  }
  return (
    <label className="inline-flex items-center gap-1 cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 text-text-muted transition-colors">
      <CalendarIcon className="w-3 h-3" />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-none outline-none text-[11px] cursor-pointer"
      />
    </label>
  );
}

function TimeInput({
  value,
  onChange,
  locked,
}: {
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
}) {
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 text-text-muted">
        <Clock className="w-3 h-3" />
        {value}
      </span>
    );
  }
  return (
    <label className="inline-flex items-center gap-1 cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 text-text-muted transition-colors">
      <Clock className="w-3 h-3" />
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-none outline-none text-[11px] cursor-pointer"
      />
    </label>
  );
}

function StatusPill({ status }: { status: StrategyBatch["status"] }) {
  const meta: Record<StrategyBatch["status"], { label: string; cls: string }> = {
    draft: { label: "Brouillon", cls: "bg-gray-100 dark:bg-dark-elevated text-text-muted" },
    approved: { label: "Approuvé", cls: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
    materialized: { label: "Posts prêts", cls: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400" },
    scheduled: { label: "Programmé", cls: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400" },
    discarded: { label: "Jeté", cls: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400" },
  };
  const { label, cls } = meta[status];
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${cls}`}>
      {label}
    </span>
  );
}

/** "2026-05-26" → "lun. 26 mai" — short, easy to scan. */
function formatDateShort(iso: string): string {
  try {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

/** UTC millis → "lun. 26 mai à 09:30" — surfaced under a scheduled post. */
function formatDateTimeShort(ms: number): string {
  try {
    const d = new Date(ms);
    const datePart = d.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const timePart = d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart} à ${timePart}`;
  } catch {
    return new Date(ms).toISOString();
  }
}
