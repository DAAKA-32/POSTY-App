/**
 * Lightweight image-generation history per user.
 *
 * Why: the prior brainstorm diversified angles ACROSS variants of a single
 * call but had zero memory ACROSS calls. A user who generated three KPI
 * cards in a row would get a fourth one no matter how creative the prompt —
 * the model had no way to know it was repeating itself. We persist only
 * `(template, accent, ts)` (no DSL bodies, no PII) and feed the recent
 * window back into the prompt as a soft anti-repetition bias.
 *
 * Storage: `users/{uid}.imageGenHistory: Array<HistoryEntry>` (length-capped).
 * We don't use a sub-collection because we always need the WHOLE recent
 * window in one read at the start of every generation, and a sub-collection
 * would mean an unbounded query per call.
 */
import { adminDb } from "@/lib/db/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { TemplateId, AccentKey } from "@/lib/image-gen/dsl";

/** One persisted generation. Kept minimal — purely a diversity signal. */
export interface ImageGenHistoryEntry {
  /** Which template (kpi-card, quote-card, …) was picked. */
  template: TemplateId;
  /** Which accent palette was chosen. */
  accent: AccentKey;
  /** Epoch ms — older entries are aged out on read. */
  ts: number;
}

/** How many recent entries we keep on the user doc. */
const HISTORY_CAP = 30;
/** How many of those we surface to the bias logic. */
const RECENT_WINDOW = 10;

/**
 * Read the last `n` history entries (most recent first).
 * Returns [] on any read error so generation is never blocked by analytics.
 */
export async function readRecentHistory(
  uid: string,
  n: number = RECENT_WINDOW,
): Promise<ImageGenHistoryEntry[]> {
  if (!adminDb) return [];
  try {
    const snap = await adminDb.collection("users").doc(uid).get();
    if (!snap.exists) return [];
    const raw = snap.data()?.imageGenHistory;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (e: unknown): e is ImageGenHistoryEntry =>
          !!e &&
          typeof e === "object" &&
          typeof (e as ImageGenHistoryEntry).template === "string" &&
          typeof (e as ImageGenHistoryEntry).accent === "string" &&
          typeof (e as ImageGenHistoryEntry).ts === "number",
      )
      .sort((a, b) => b.ts - a.ts)
      .slice(0, n);
  } catch (err) {
    console.warn("[image-gen/history] readRecentHistory failed (returning empty):", err);
    return [];
  }
}

/**
 * Append entries to the history array and trim to `HISTORY_CAP`.
 * Best-effort: a write failure must not break the user-facing response,
 * because by the time we call this the image has already been served.
 *
 * We use a read-modify-write rather than `arrayUnion` because we need to
 * cap the array length; `arrayUnion` doesn't support trimming. Concurrent
 * calls from the same user could race here, but the worst case is a few
 * lost diversity signals — there's no consistency requirement on this
 * data path.
 */
export async function appendToHistory(
  uid: string,
  entries: ImageGenHistoryEntry[],
): Promise<void> {
  if (!adminDb || entries.length === 0) return;
  try {
    const ref = adminDb.collection("users").doc(uid);
    const snap = await ref.get();
    const existing: ImageGenHistoryEntry[] = Array.isArray(snap.data()?.imageGenHistory)
      ? snap.data()!.imageGenHistory
      : [];
    const merged = [...entries, ...existing].slice(0, HISTORY_CAP);
    await ref.set(
      {
        imageGenHistory: merged,
        imageGenHistoryUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.warn("[image-gen/history] appendToHistory failed (non-blocking):", err);
  }
}

/**
 * Templates/accents the next call should bias AWAY from.
 *
 * "Recent" means top-K of history sorted by ts. We don't try to be clever
 * about decay or weighting — a simple set membership check inside the
 * brainstorm prompt is what the model actually responds to. If every
 * template has been used recently, the bias collapses to "no bias" rather
 * than blocking the call, so the user never gets a hard refusal because
 * of history.
 */
export interface DiversityBias {
  /** Templates used in the last `RECENT_WINDOW` gens (most-frequent first). */
  recentTemplates: TemplateId[];
  /** Accents used in the last `RECENT_WINDOW` gens (most-frequent first). */
  recentAccents: AccentKey[];
}

export function computeDiversityBias(history: ImageGenHistoryEntry[]): DiversityBias {
  const tCount = new Map<TemplateId, number>();
  const aCount = new Map<AccentKey, number>();
  for (const h of history) {
    tCount.set(h.template, (tCount.get(h.template) ?? 0) + 1);
    aCount.set(h.accent, (aCount.get(h.accent) ?? 0) + 1);
  }
  const recentTemplates = [...tCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);
  const recentAccents = [...aCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([a]) => a);
  return { recentTemplates, recentAccents };
}
