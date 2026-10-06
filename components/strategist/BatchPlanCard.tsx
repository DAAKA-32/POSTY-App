"use client";

/**
 * BatchPlanCard — a Strategist plan (or a single post) inside the conversation.
 *
 * One clear next action per state:
 *   draft         → "Write the N posts" (approves + writes in one step)
 *   writing       → honest progress line + per-row skeletons
 *   written       → "Schedule on LinkedIn" (inline confirmation, no timer)
 *   scheduled     → summary + calendar + "Cancel scheduling" (inline confirm)
 *   discarded     → collapsed line with "Restore"
 *
 * Each brief shows day · format · length, the hook, the main idea, and a
 * "Why this post" disclosure (works on touch — no hover-only tooltip).
 * "Edit" opens hook / idea / date / time / format / length and a
 * "Note for the writing" (userNote, read by the writer). Written posts show a
 * LinkedIn-like preview folded where "…see more" would cut, a character count,
 * and "Rewrite" with quick instructions.
 *
 * Cancellation keeps the scheduler's rule (commit d46358f): only pointers of
 * posts actually removed from the queue are dropped, so a published or
 * in-flight post can never be scheduled twice.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock,
  Check,
  ChevronDown,
  Copy,
  Image as ImageIcon,
  Loader2,
  Pencil,
  RotateCw,
  Trash2,
  Wand2,
} from "lucide-react";
import type { StrategyBatch, PostBrief } from "@/types";
import {
  patchPostBrief,
  deletePostBrief,
  setBatchStatus,
  patchMaterializedPost,
  clearBatchScheduling,
  patchBriefVisual,
} from "@/lib/db/strategy-batches";
import { cancelScheduledPost } from "@/lib/db/firestore";
import { getAuthHeaders } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStrategistDrawer } from "@/contexts/StrategistDrawerContext";
import { isStrategistImagesAllowedForEmail } from "@/lib/strategist/images-access";
import {
  FORMATS,
  FORMAT_SLUGS,
  GOAL_LABELS,
  LENGTH_BANDS,
  normalizeFormat,
  normalizeGoal,
  normalizeLength,
  type FormatSlug,
  type LengthBand,
} from "@/lib/ai/post-formats";
import {
  formatDateTime,
  formatDay,
  formatRange,
  useStrategistCopy,
  type StrategistCopy,
  type StrategistLang,
} from "@/lib/strategist/copy";
import toast from "@/components/ui/Toast";
import StrategistMark from "./StrategistMark";
import { Button, focusRing } from "./ui";

interface Props {
  batch: StrategyBatch;
  /** Called after every change so the session (history, latest plan) stays in sync. */
  onChange?: (batch: StrategyBatch) => void;
}

type Confirming = "schedule" | "cancel" | null;
const STORY_FORMATS: FormatSlug[] = ["storytelling", "lesson", "case-study", "behind-the-scenes"];

export default function BatchPlanCard({ batch, onChange }: Props) {
  const { c, lang } = useStrategistCopy();
  const { user } = useAuth();
  const { close } = useStrategistDrawer();
  const allowImages = isStrategistImagesAllowedForEmail(user?.email);
  const titleId = useId();

  const [posts, setPosts] = useState<PostBrief[]>(batch.posts);
  const [status, setStatus] = useState<StrategyBatch["status"]>(batch.status);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [writingIds, setWritingIds] = useState<Set<string>>(new Set());
  const [writingAll, setWritingAll] = useState(false);
  const [busy, setBusy] = useState<"schedule" | "cancel" | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [visualizingId, setVisualizingId] = useState<string | null>(null);

  // Keep the session in sync (skip the initial render).
  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    onChange?.({ ...batch, posts, status });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, status]);

  const isDraft = status === "draft";
  const written = posts.filter((p) => p.materialized?.content).length;
  const allWritten = posts.length > 0 && written === posts.length;
  const scheduledCount = posts.filter((p) => p.scheduledPostId).length;
  const step = status === "scheduled" ? 3 : allWritten ? 2 : isDraft ? 0 : 1;

  const dateRange = useMemo(() => {
    const dates = posts.map((p) => p.suggestedDate).filter(Boolean).sort();
    return dates.length ? formatRange(dates[0], dates[dates.length - 1], lang) : "";
  }, [posts, lang]);

  // ── Mutations ──────────────────────────────────────────────────────────

  const patchRow = async (id: string, patch: Partial<Omit<PostBrief, "id">>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setSavingId(id);
    try {
      await patchPostBrief(batch.id, id, patch);
    } catch (err) {
      console.warn("[BatchPlanCard] patchRow failed:", err);
      toast.error(c.card.toast.saveFail);
    } finally {
      setSavingId(null);
    }
  };

  const removeRow = async (id: string) => {
    const before = posts;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    try {
      await deletePostBrief(batch.id, id);
    } catch {
      setPosts(before);
      toast.error(c.card.toast.deleteFail);
    }
  };

  const setLifecycle = async (next: StrategyBatch["status"]) => {
    const prev = status;
    setStatus(next);
    try {
      await setBatchStatus(batch.id, next);
      return true;
    } catch {
      setStatus(prev);
      toast.error(c.card.toast.saveFail);
      return false;
    }
  };

  const materialize = async (opts: { briefIds?: string[]; force?: boolean; instruction?: string } = {}) => {
    const { briefIds, force = false, instruction } = opts;
    if (briefIds?.length) setWritingIds(new Set(briefIds));
    else setWritingAll(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/strategist/materialize", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ batchId: batch.id, briefIds, force, language: lang, instruction }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || c.card.toast.writeFail);
        return;
      }
      const data = (await res.json()) as {
        status: StrategyBatch["status"];
        results: Array<{ briefId: string; ok: boolean; content?: string }>;
      };
      setPosts((prev) =>
        prev.map((p) => {
          const r = data.results.find((x) => x.briefId === p.id);
          if (r?.ok && r.content) {
            return { ...p, materialized: { ...(p.materialized ?? {}), content: r.content, generatedAt: Date.now() } };
          }
          return p;
        })
      );
      if (data.status) setStatus(data.status);
      const failed = data.results.filter((r) => !r.ok).length;
      if (failed > 0) toast.error(c.card.toast.writeSomeFail(failed));
      else if (instruction) toast.success(c.card.toast.rewritten);
      else if (data.results.length > 0) toast.success(c.card.toast.written(data.results.length));
    } catch (err) {
      console.error("[BatchPlanCard] materialize failed:", err);
      toast.error(c.card.toast.network);
    } finally {
      setWritingIds(new Set());
      setWritingAll(false);
    }
  };

  /** Draft → approve and write in one step (was two separate clicks). */
  const writeAll = async () => {
    if (isDraft && !(await setLifecycle("approved"))) return;
    await materialize();
  };

  const editPost = async (briefId: string, content: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === briefId && p.materialized ? { ...p, materialized: { ...p.materialized, content } } : p))
    );
    try {
      await patchMaterializedPost(batch.id, briefId, content);
    } catch {
      toast.error(c.card.toast.editFail);
    }
  };

  const generateVisual = async (briefId: string) => {
    const brief = posts.find((p) => p.id === briefId);
    if (!brief?.materialized?.content || visualizingId) return;
    setVisualizingId(briefId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          brief: brief.hook.slice(0, 800),
          postContext: brief.materialized.content.slice(0, 2000),
          language: lang,
          variantCount: 1,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(res.status === 403 ? c.card.toast.visualMaxOnly : err.message || c.card.toast.visualFail);
        return;
      }
      const data = await res.json();
      const img = data?.images?.[0] ?? (data?.url ? { url: data.url, imageId: data.imageId } : null);
      if (!img?.url) {
        toast.error(c.card.toast.visualFail);
        return;
      }
      const visual = {
        variants: [{ url: img.url as string, imageId: (img.imageId as string) ?? "" }],
        generatedAt: Date.now(),
      };
      setPosts((prev) =>
        prev.map((p) => (p.id === briefId && p.materialized ? { ...p, materialized: { ...p.materialized, visual } } : p))
      );
      try {
        await patchBriefVisual(batch.id, briefId, visual);
        toast.success(c.card.toast.visualDone);
      } catch {
        toast.error(c.card.toast.visualSavedFail);
      }
    } catch (err) {
      console.error("[BatchPlanCard] generateVisual failed:", err);
      toast.error(c.card.toast.network);
    } finally {
      setVisualizingId(null);
    }
  };

  const schedule = async () => {
    setConfirming(null);
    setBusy("schedule");
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/strategist/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ batchId: batch.id, platform: "linkedin", visibility: "PUBLIC", language: lang }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || c.card.toast.scheduleFail);
        return;
      }
      const data = (await res.json()) as {
        status: StrategyBatch["status"];
        results: Array<{ briefId: string; ok: boolean; scheduledPostId?: string; fireAtMs?: number; adjusted?: boolean }>;
      };
      setPosts((prev) =>
        prev.map((p) => {
          const r = data.results.find((x) => x.briefId === p.id && x.ok);
          return r ? { ...p, scheduledPostId: r.scheduledPostId, scheduledAt: r.fireAtMs } : p;
        })
      );
      setStatus(data.status);
      const ok = data.results.filter((r) => r.ok).length;
      const adjusted = data.results.filter((r) => r.ok && r.adjusted).length;
      const failed = data.results.filter((r) => !r.ok).length;
      if (ok > 0) toast.success(c.card.toast.scheduled(ok, adjusted));
      if (failed > 0) toast.error(c.card.toast.scheduleSomeFail(failed));
    } catch (err) {
      console.error("[BatchPlanCard] schedule failed:", err);
      toast.error(c.card.toast.network);
    } finally {
      setBusy(null);
    }
  };

  /** Cancel a scheduled batch: flip every still-pending scheduledPosts doc to
   *  "cancelled" (the cron only fires on "pending") and roll the batch back to
   *  "materialized". Only pointers of posts actually removed from the queue are
   *  dropped: a published or in-flight post keeps its pointer, so re-scheduling
   *  the batch can never publish it twice. */
  const cancelScheduling = async () => {
    setConfirming(null);
    setBusy("cancel");
    try {
      const ids = posts.map((p) => p.scheduledPostId).filter((id): id is string => !!id);
      const results = await Promise.allSettled(ids.map((id) => cancelScheduledPost(id)));
      const cancelledIds = new Set(ids.filter((_, i) => results[i].status === "fulfilled"));
      const failed = ids.length - cancelledIds.size;

      await clearBatchScheduling(batch.id, cancelledIds);

      setPosts((prev) =>
        prev.map((p) => {
          if (p.scheduledPostId && !cancelledIds.has(p.scheduledPostId)) return p;
          const cleaned = { ...p };
          delete cleaned.scheduledPostId;
          delete cleaned.scheduledAt;
          return cleaned;
        })
      );
      setStatus("materialized");
      if (failed > 0) toast.error(c.card.toast.cancelSomeFail(failed));
      else toast.success(c.card.toast.cancelled(ids.length));
    } catch (err) {
      console.error("[BatchPlanCard] cancelScheduling failed:", err);
      toast.error(c.card.toast.cancelFail);
    } finally {
      setBusy(null);
    }
  };

  // ── Discarded: collapsed ───────────────────────────────────────────────
  if (status === "discarded") {
    return (
      <div className="flex items-center gap-3 px-4 min-h-[52px] rounded-2xl border border-dashed border-gray-300 dark:border-dark-border text-[14px] text-gray-600 dark:text-gray-300">
        <span className="flex-1 min-w-0 truncate">
          {c.card.discarded} · {batch.theme}
        </span>
        <Button variant="ghost" size="sm" onClick={() => void setLifecycle("draft")}>
          {c.card.restore}
        </Button>
      </div>
    );
  }

  const strategy = batch.strategy;
  const objective = strategy?.objective
    ? (normalizeGoal(strategy.objective) ? GOAL_LABELS[normalizeGoal(strategy.objective)!][lang] : capitalize(strategy.objective))
    : null;

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden"
    >
      {/* Header */}
      <header className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-dark-border/60">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-400/15 text-amber-700 dark:text-amber-400 flex-shrink-0">
            <StrategistMark className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 id={titleId} className="text-[16px] font-semibold leading-snug text-gray-900 dark:text-white break-words">
              {batch.theme}
            </h3>
            <p className="mt-0.5 text-[13px] text-gray-600 dark:text-gray-400">
              {c.card.posts(posts.length)}
              {dateRange ? ` · ${dateRange}` : ""}
            </p>
          </div>
        </div>
        {strategy?.summary && (
          <p className="mt-3 text-[14px] leading-relaxed text-gray-700 dark:text-gray-200">{strategy.summary}</p>
        )}
        {(strategy?.audience || objective || strategy?.tone) && (
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {strategy?.audience && <Fact label={c.card.audience} value={strategy.audience} />}
            {objective && <Fact label={c.card.objective} value={objective} />}
            {strategy?.tone && <Fact label={c.card.tone} value={capitalize(strategy.tone)} />}
          </dl>
        )}
        <Steps steps={c.card.steps} current={step} />
      </header>

      {/* Briefs */}
      <ul className="divide-y divide-gray-100 dark:divide-dark-border/60">
        <AnimatePresence initial={false}>
          {posts.map((p, idx) => (
            <BriefRow
              key={p.id}
              index={idx + 1}
              brief={p}
              c={c}
              lang={lang}
              editable={isDraft}
              saving={savingId === p.id}
              writing={writingIds.has(p.id) || (writingAll && !p.materialized)}
              canRemove={isDraft && posts.length > 1}
              onPatch={(patch) => patchRow(p.id, patch)}
              onRemove={() => removeRow(p.id)}
              onRewrite={(instruction) => materialize({ briefIds: [p.id], force: true, instruction })}
              onEditPost={(content) => editPost(p.id, content)}
              allowImages={allowImages}
              visualizing={visualizingId === p.id}
              onGenerateVisual={() => generateVisual(p.id)}
              locked={status === "scheduled"}
            />
          ))}
        </AnimatePresence>
      </ul>

      {/* Footer — one primary action per state */}
      {posts.length > 0 && (
        <footer className="px-4 py-3 border-t border-gray-100 dark:border-dark-border/60 bg-gray-50/60 dark:bg-white/[0.02]">
          {isDraft && (
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              <Button variant="ghost" onClick={() => void setLifecycle("discarded")}>
                {c.card.discard}
              </Button>
              <Button variant="primary" onClick={writeAll} icon={<Wand2 aria-hidden className="w-4 h-4" />}>
                {c.card.writeAll(posts.length)}
              </Button>
            </div>
          )}

          {!isDraft && status !== "scheduled" && !allWritten && (
            writingAll ? (
              <p role="status" className="flex items-center gap-2 min-h-[44px] text-[14px] text-gray-700 dark:text-gray-200">
                <Loader2 aria-hidden className="w-4 h-4 animate-spin motion-reduce:animate-none text-amber-600" />
                {c.card.writing(posts.length - written)}
              </p>
            ) : (
              <div className="flex justify-end">
                <Button variant="primary" onClick={() => materialize()} icon={<Wand2 aria-hidden className="w-4 h-4" />}>
                  {written > 0 ? c.card.writeMissing : c.card.writeAll(posts.length)}
                </Button>
              </div>
            )
          )}

          {status !== "scheduled" && allWritten && (
            confirming === "schedule" ? (
              <ConfirmBar
                text={c.card.scheduleConfirm(posts.length)}
                confirmLabel={c.card.confirm}
                cancelLabel={c.card.cancel}
                onConfirm={schedule}
                onCancel={() => setConfirming(null)}
              />
            ) : (
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => materialize({ force: true })}
                  disabled={writingAll || busy !== null}
                  icon={<RotateCw aria-hidden className={`w-4 h-4 ${writingAll ? "animate-spin motion-reduce:animate-none" : ""}`} />}
                >
                  {c.card.rewriteAll}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setConfirming("schedule")}
                  disabled={busy !== null || writingAll}
                  icon={busy === "schedule" ? <Loader2 aria-hidden className="w-4 h-4 animate-spin" /> : <CalendarClock aria-hidden className="w-4 h-4" />}
                >
                  {busy === "schedule" ? c.card.scheduling : c.card.schedule(posts.length)}
                </Button>
              </div>
            )
          )}

          {status === "scheduled" && (
            confirming === "cancel" ? (
              <ConfirmBar
                text={c.card.cancelConfirm}
                confirmLabel={c.card.confirm}
                cancelLabel={c.card.cancel}
                onConfirm={cancelScheduling}
                onCancel={() => setConfirming(null)}
                danger
              />
            ) : (
              <div className="space-y-2">
                <p className="flex items-start gap-2 text-[14px] text-emerald-800 dark:text-emerald-300">
                  <Check aria-hidden className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {c.card.scheduledSummary(scheduledCount)}
                </p>
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Button variant="danger" onClick={() => setConfirming("cancel")} disabled={busy !== null}>
                    {busy === "cancel" ? c.card.cancelling : c.card.cancelScheduling}
                  </Button>
                  <Link
                    href="/schedule"
                    onClick={close}
                    className={`inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-hover text-[14px] font-medium text-gray-800 dark:text-gray-100 ${focusRing}`}
                  >
                    <CalendarClock aria-hidden className="w-4 h-4" />
                    {c.card.viewCalendar}
                  </Link>
                </div>
              </div>
            )
          )}
        </footer>
      )}
    </section>
  );
}

// ─── Header atoms ───────────────────────────────────────────────────────────

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 min-w-0">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-gray-800 dark:text-gray-100 font-medium break-words">{value}</dd>
    </div>
  );
}

/** Plan → Writing → Scheduling. `current` = index of the active step (3 = all done). */
function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[12px] font-medium">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full ${
                done
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  : active
                    ? "bg-amber-100 dark:bg-amber-400/15 text-amber-900 dark:text-amber-200"
                    : "bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-gray-400"
              }`}
            >
              {done ? <Check aria-hidden className="w-3.5 h-3.5" /> : <span aria-hidden className="tabular-nums">{i + 1}</span>}
              {label}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="w-3 h-px bg-gray-300 dark:bg-gray-600" />}
          </li>
        );
      })}
    </ol>
  );
}

function ConfirmBar({
  text,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => confirmRef.current?.focus(), []);
  return (
    <div role="group" aria-label={text} className="space-y-3">
      <p className="text-[14px] leading-relaxed text-gray-800 dark:text-gray-100">{text}</p>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button ref={confirmRef} variant={danger ? "dangerSolid" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

// ─── Brief row ──────────────────────────────────────────────────────────────

function BriefRow({
  index,
  brief,
  c,
  lang,
  editable,
  saving,
  writing,
  canRemove,
  onPatch,
  onRemove,
  onRewrite,
  onEditPost,
  allowImages,
  visualizing,
  onGenerateVisual,
  locked,
}: {
  index: number;
  brief: PostBrief;
  c: StrategistCopy;
  lang: StrategistLang;
  editable: boolean;
  saving: boolean;
  writing: boolean;
  canRemove: boolean;
  onPatch: (patch: Partial<Omit<PostBrief, "id">>) => void;
  onRemove: () => void;
  onRewrite: (instruction?: string) => void;
  onEditPost: (content: string) => void;
  allowImages: boolean;
  visualizing: boolean;
  onGenerateVisual: () => void;
  locked: boolean;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const whyId = useId();
  const format = normalizeFormat(brief.format);
  const length = normalizeLength(brief.length, format);
  const goal = normalizeGoal(brief.goal);
  const hasPost = !!brief.materialized?.content;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="px-4 py-4"
    >
      {/* Meta: day · time · format · length */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
        <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
          {index}. {formatDay(brief.suggestedDate, lang)}
          <span className="font-normal text-gray-600 dark:text-gray-400"> · {brief.suggestedTime}</span>
        </span>
        <span className="inline-flex items-center h-6 px-2 rounded-md bg-gray-100 dark:bg-dark-elevated text-gray-800 dark:text-gray-200 font-medium">
          {FORMATS[format].label[lang]}
        </span>
        <span className="inline-flex items-center h-6 px-2 rounded-md border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300">
          {LENGTH_BANDS[length].label[lang]}
        </span>
        {saving && <span className="text-gray-500 dark:text-gray-400">{c.card.saving}</span>}
      </div>

      {editing ? (
        <BriefEditor
          brief={brief}
          c={c}
          lang={lang}
          canRemove={canRemove}
          onPatch={onPatch}
          onRemove={onRemove}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          {!hasPost && (
            <>
              <p className="mt-2 text-[15px] font-semibold leading-snug text-gray-900 dark:text-white break-words">{brief.hook}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-gray-700 dark:text-gray-300 break-words">
                <span className="font-medium text-gray-900 dark:text-white">{c.card.idea} : </span>
                {brief.angle}
              </p>
            </>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1 -ml-2">
            <button
              type="button"
              aria-expanded={whyOpen}
              aria-controls={whyId}
              onClick={() => setWhyOpen((v) => !v)}
              className={`inline-flex items-center gap-1 h-10 px-2 rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover ${focusRing}`}
            >
              {c.card.why}
              <ChevronDown aria-hidden className={`w-4 h-4 transition-transform ${whyOpen ? "rotate-180" : ""}`} />
            </button>
            {editable && !hasPost && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={`inline-flex items-center gap-1.5 h-10 px-2 rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover ${focusRing}`}
              >
                <Pencil aria-hidden className="w-3.5 h-3.5" />
                {c.card.edit}
              </button>
            )}
          </div>

          {whyOpen && (
            <div id={whyId} className="mt-1 rounded-xl bg-gray-50 dark:bg-white/[0.03] px-3 py-2.5 text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 space-y-1">
              <p>{brief.rationale}</p>
              {goal && (
                <p>
                  <span className="text-gray-500 dark:text-gray-400">{c.card.objective} : </span>
                  {GOAL_LABELS[goal][lang]}
                </p>
              )}
              {brief.audience && (
                <p>
                  <span className="text-gray-500 dark:text-gray-400">{c.card.audience} : </span>
                  {brief.audience}
                </p>
              )}
              {brief.tone && (
                <p>
                  <span className="text-gray-500 dark:text-gray-400">{c.card.tone} : </span>
                  {brief.tone}
                </p>
              )}
              {brief.userNote && (
                <p>
                  <span className="text-gray-500 dark:text-gray-400">{c.card.noteLabel} : </span>
                  {brief.userNote}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {(hasPost || writing) && (
        <PostPreview
          brief={brief}
          c={c}
          lang={lang}
          writing={writing}
          locked={locked}
          onRewrite={onRewrite}
          onEditPost={onEditPost}
          allowImages={allowImages}
          visualizing={visualizing}
          onGenerateVisual={onGenerateVisual}
        />
      )}
    </motion.li>
  );
}

function BriefEditor({
  brief,
  c,
  lang,
  canRemove,
  onPatch,
  onRemove,
  onDone,
}: {
  brief: PostBrief;
  c: StrategistCopy;
  lang: StrategistLang;
  canRemove: boolean;
  onPatch: (patch: Partial<Omit<PostBrief, "id">>) => void;
  onRemove: () => void;
  onDone: () => void;
}) {
  const [hook, setHook] = useState(brief.hook);
  const [angle, setAngle] = useState(brief.angle);
  const [note, setNote] = useState(brief.userNote ?? "");
  const format = normalizeFormat(brief.format);
  const length = normalizeLength(brief.length, format);
  const ids = { hook: useId(), angle: useId(), date: useId(), time: useId(), format: useId(), length: useId(), note: useId() };

  const commitText = (field: "hook" | "angle", value: string) => {
    const v = value.trim();
    if (v && v !== brief[field]) onPatch({ [field]: v });
  };
  const commitNote = () => {
    const v = note.trim();
    if (v !== (brief.userNote ?? "")) onPatch({ userNote: v || undefined });
  };
  // Esc inside a field cancels that field's edit — the drawer ignores it.
  const onEsc = (reset: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      reset();
      (e.target as HTMLElement).blur();
    }
  };

  const field =
    "w-full rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-elevated px-3 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25";
  const label = "block text-[13px] font-medium text-gray-800 dark:text-gray-200 mb-1";

  return (
    <div className="mt-3 space-y-3" data-no-drag>
      <div>
        <label htmlFor={ids.hook} className={label}>{c.card.hookLabel}</label>
        <textarea
          id={ids.hook}
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          onBlur={() => commitText("hook", hook)}
          onKeyDown={onEsc(() => setHook(brief.hook))}
          rows={2}
          maxLength={300}
          className={`${field} resize-y`}
          style={{ fontSize: "max(16px, 1rem)" }}
        />
      </div>
      <div>
        <label htmlFor={ids.angle} className={label}>{c.card.angleLabel}</label>
        <textarea
          id={ids.angle}
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          onBlur={() => commitText("angle", angle)}
          onKeyDown={onEsc(() => setAngle(brief.angle))}
          rows={3}
          maxLength={400}
          className={`${field} resize-y`}
          style={{ fontSize: "max(16px, 1rem)" }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={ids.date} className={label}>{c.card.dateLabel}</label>
          <input
            id={ids.date}
            type="date"
            value={brief.suggestedDate}
            onChange={(e) => e.target.value && onPatch({ suggestedDate: e.target.value })}
            className={field}
            style={{ fontSize: "max(16px, 1rem)" }}
          />
        </div>
        <div>
          <label htmlFor={ids.time} className={label}>{c.card.timeLabel}</label>
          <input
            id={ids.time}
            type="time"
            value={brief.suggestedTime}
            onChange={(e) => e.target.value && onPatch({ suggestedTime: e.target.value })}
            className={field}
            style={{ fontSize: "max(16px, 1rem)" }}
          />
        </div>
        <div>
          <label htmlFor={ids.format} className={label}>{c.card.formatLabel}</label>
          <select
            id={ids.format}
            value={format}
            onChange={(e) => onPatch({ format: e.target.value })}
            className={field}
            style={{ fontSize: "max(16px, 1rem)" }}
          >
            {FORMAT_SLUGS.map((s) => (
              <option key={s} value={s}>
                {FORMATS[s].label[lang]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={ids.length} className={label}>{c.card.lengthLabel}</label>
          <select
            id={ids.length}
            value={length}
            onChange={(e) => onPatch({ length: e.target.value as LengthBand })}
            className={field}
            style={{ fontSize: "max(16px, 1rem)" }}
          >
            {(["short", "medium", "long"] as LengthBand[]).map((l) => (
              <option key={l} value={l}>
                {LENGTH_BANDS[l].label[lang]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={ids.note} className={label}>{c.card.noteLabel}</label>
        <textarea
          id={ids.note}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={commitNote}
          onKeyDown={onEsc(() => setNote(brief.userNote ?? ""))}
          rows={2}
          maxLength={500}
          placeholder={c.card.notePlaceholder}
          className={`${field} resize-y placeholder:text-gray-500`}
          style={{ fontSize: "max(16px, 1rem)" }}
        />
        {STORY_FORMATS.includes(format) && (
          <p className="mt-1 text-[13px] text-gray-600 dark:text-gray-400">{c.card.noteHintStory}</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        {canRemove ? (
          <Button variant="danger" size="sm" onClick={onRemove} icon={<Trash2 aria-hidden className="w-4 h-4" />}>
            {c.card.deletePost}
          </Button>
        ) : (
          <span />
        )}
        <Button variant="secondary" size="sm" onClick={onDone} icon={<Check aria-hidden className="w-4 h-4" />}>
          {c.card.done}
        </Button>
      </div>
    </div>
  );
}

// ─── Written post ───────────────────────────────────────────────────────────

/** Where LinkedIn would fold the post: ~3 lines or ~210 characters. */
function foldIndex(text: string): number | null {
  if (text.length <= 300) return null;
  let lines = 0;
  let i = 0;
  while (i < text.length && i < 210) {
    const nl = text.indexOf("\n", i);
    const end = nl === -1 ? text.length : nl;
    if (text.slice(i, end).trim()) lines++;
    if (lines >= 3) return Math.min(end, 210);
    i = end + 1;
  }
  const cut = text.lastIndexOf(" ", 210);
  return cut > 120 ? cut : 210;
}

function PostPreview({
  brief,
  c,
  lang,
  writing,
  locked,
  onRewrite,
  onEditPost,
  allowImages,
  visualizing,
  onGenerateVisual,
}: {
  brief: PostBrief;
  c: StrategistCopy;
  lang: StrategistLang;
  writing: boolean;
  locked: boolean;
  onRewrite: (instruction?: string) => void;
  onEditPost: (content: string) => void;
  allowImages: boolean;
  visualizing: boolean;
  onGenerateVisual: () => void;
}) {
  const content = brief.materialized?.content ?? "";
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [copied, setCopied] = useState(false);
  const visualUrl = brief.materialized?.visual?.variants?.[0]?.url;
  const fold = foldIndex(content);
  const shown = !expanded && fold ? content.slice(0, fold).trimEnd() : content;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(c.card.toast.copyFail);
    }
  };

  const runRewrite = (text?: string) => {
    setRewriteOpen(false);
    setInstruction("");
    onRewrite(text?.trim() || undefined);
  };

  if (writing && !content) {
    return (
      <div className="mt-3 rounded-xl border border-gray-200 dark:border-dark-border p-4 space-y-2" role="status">
        <p className="flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-400">
          <Loader2 aria-hidden className="w-4 h-4 animate-spin motion-reduce:animate-none text-amber-600" />
          {c.card.writing(1)}
        </p>
        {[90, 75, 60].map((w) => (
          <div key={w} aria-hidden className="h-3 rounded bg-gray-100 dark:bg-dark-elevated animate-pulse motion-reduce:animate-none" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
      {editing ? (
        <div className="p-3" data-no-drag>
          <label className="sr-only" htmlFor={`edit-${brief.id}`}>{c.card.editPost}</label>
          <textarea
            id={`edit-${brief.id}`}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
            rows={Math.max(8, Math.min(22, draft.split("\n").length + 2))}
            className="w-full rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-elevated p-3 leading-relaxed text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 resize-y"
            style={{ fontSize: "max(16px, 1rem)" }}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              {c.card.cancelEdit}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditing(false);
                const next = draft.trim();
                if (next && next !== content) onEditPost(next);
              }}
            >
              {c.card.saveEdit}
            </Button>
          </div>
        </div>
      ) : (
        <div className={`px-4 pt-3.5 pb-3 ${writing ? "opacity-50" : ""}`} aria-busy={writing}>
          <p className="text-[14px] leading-[1.6] text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
            {shown}
            {!expanded && fold && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  aria-expanded={false}
                  className={`font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded ${focusRing}`}
                >
                  {c.card.seeMore}
                </button>
              </>
            )}
          </p>
          {expanded && fold && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-expanded
              className={`mt-1 h-9 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded ${focusRing}`}
            >
              {c.card.seeLess}
            </button>
          )}
          <p className="mt-2 text-[12px] text-gray-500 dark:text-gray-400 tabular-nums">{c.card.chars(content.length)}</p>
        </div>
      )}

      {allowImages && !editing && content && (
        <div className="px-4 pb-3">
          {visualUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={visualUrl} alt={c.card.visualAlt} className="w-full rounded-lg border border-gray-200 dark:border-dark-border" />
          ) : null}
          {!locked && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 -ml-3"
              onClick={onGenerateVisual}
              disabled={visualizing}
              icon={visualizing ? <Loader2 aria-hidden className="w-4 h-4 animate-spin" /> : visualUrl ? <RotateCw aria-hidden className="w-4 h-4" /> : <ImageIcon aria-hidden className="w-4 h-4" />}
            >
              {visualizing ? c.card.visualGenerating : visualUrl ? c.card.visualRegenerate : c.card.visualGenerate}
            </Button>
          )}
        </div>
      )}

      {brief.scheduledAt && (
        <p className="px-4 pb-3 flex items-center gap-1.5 text-[13px] font-medium text-emerald-800 dark:text-emerald-300">
          <CalendarClock aria-hidden className="w-4 h-4" />
          {c.card.scheduledFor(formatDateTime(brief.scheduledAt, lang))}
        </p>
      )}

      {!editing && content && (
        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-t border-gray-100 dark:border-dark-border/60 bg-gray-50/60 dark:bg-white/[0.02]">
          <Button variant="ghost" size="sm" onClick={copy} icon={copied ? <Check aria-hidden className="w-4 h-4" /> : <Copy aria-hidden className="w-4 h-4" />}>
            {copied ? c.card.copied : c.card.copyPost}
          </Button>
          {!locked && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft(content);
                  setEditing(true);
                }}
                icon={<Pencil aria-hidden className="w-4 h-4" />}
              >
                {c.card.editPost}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={rewriteOpen}
                onClick={() => setRewriteOpen((v) => !v)}
                disabled={writing}
                icon={<RotateCw aria-hidden className={`w-4 h-4 ${writing ? "animate-spin motion-reduce:animate-none" : ""}`} />}
              >
                {writing ? c.card.rewriting : c.card.rewrite}
              </Button>
            </>
          )}
        </div>
      )}

      {rewriteOpen && !locked && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-border/60 space-y-2" data-no-drag>
          <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{c.card.rewriteTitle}</p>
          <div className="flex flex-wrap gap-1.5">
            {c.card.rewriteChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => runRewrite(chip)}
                className={`h-9 px-3 rounded-full border border-gray-200 dark:border-dark-border text-[13px] text-gray-800 dark:text-gray-200 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-400/10 ${focusRing}`}
              >
                {chip}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              runRewrite(instruction);
            }}
          >
            <label className="sr-only" htmlFor={`rw-${brief.id}`}>{c.card.rewritePlaceholder}</label>
            <input
              id={`rw-${brief.id}`}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              maxLength={300}
              placeholder={c.card.rewritePlaceholder}
              className="flex-1 min-w-0 h-10 rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-elevated px-3 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25"
              style={{ fontSize: "max(16px, 1rem)" }}
            />
            <Button type="submit" variant="secondary" size="sm">
              {c.card.rewriteGo}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
