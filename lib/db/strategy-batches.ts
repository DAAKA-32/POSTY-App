/**
 * Firestore helpers for `strategyBatches` (Strategist Phase 1 deliverable).
 *
 * The API endpoint persists the initial batch server-side via admin SDK; this
 * module lives on the client and handles all subsequent reads/mutations
 * (review, edit row, approve, discard). Keeping the per-row patch path
 * client-side avoids a round-trip per edit and lets us optimistic-update the
 * table UI.
 *
 * Firestore rules (assumed): `request.auth.uid == resource.data.userId` on
 * read/update/delete; create is gated by the API endpoint, not the rules.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as fsLimit,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/db/firebase";
import type { StrategyBatch, PostBrief } from "@/types";

const COLLECTION = "strategyBatches";

/** Read a single batch by id. Returns null if not found or denied by rules. */
export async function getStrategyBatch(batchId: string): Promise<StrategyBatch | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, batchId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      userId: data.userId,
      sourcePrompt: data.sourcePrompt,
      theme: data.theme,
      posts: data.posts ?? [],
      status: data.status,
      timezone: data.timezone,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp | undefined,
    };
  } catch (err) {
    console.warn("[strategy-batches] getStrategyBatch failed:", err);
    return null;
  }
}

/** List the user's batches, newest first. Capped at `max` (default 20) so the
 *  client doesn't accidentally pull the entire history into memory. */
export async function listStrategyBatches(
  userId: string,
  max: number = 20
): Promise<StrategyBatch[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      fsLimit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        sourcePrompt: data.sourcePrompt,
        theme: data.theme,
        posts: data.posts ?? [],
        status: data.status,
        timezone: data.timezone,
        createdAt: data.createdAt as Timestamp,
        updatedAt: data.updatedAt as Timestamp | undefined,
      };
    });
  } catch (err) {
    console.warn("[strategy-batches] listStrategyBatches failed:", err);
    return [];
  }
}

/** Patch a single brief in-place. Reads the doc, swaps the matching row by
 *  id, writes back. Used by the table when the user edits a hook / time /
 *  date inline. Concurrent edits are rare here (single-user, single-browser)
 *  so we skip the transaction overhead. */
export async function patchPostBrief(
  batchId: string,
  briefId: string,
  patch: Partial<Omit<PostBrief, "id">>
): Promise<void> {
  const ref = doc(db, COLLECTION, batchId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("batch_not_found");
  const data = snap.data();
  const posts: PostBrief[] = Array.isArray(data.posts) ? data.posts : [];
  const next = posts.map((p) => (p.id === briefId ? { ...p, ...patch } : p));
  await updateDoc(ref, { posts: next, updatedAt: serverTimestamp() });
}

/** Remove a brief from a batch (user clicked the row trash icon). */
export async function deletePostBrief(batchId: string, briefId: string): Promise<void> {
  const ref = doc(db, COLLECTION, batchId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("batch_not_found");
  const data = snap.data();
  const posts: PostBrief[] = Array.isArray(data.posts) ? data.posts : [];
  await updateDoc(ref, {
    posts: posts.filter((p) => p.id !== briefId),
    updatedAt: serverTimestamp(),
  });
}

/** Transition the batch lifecycle. Phase 1 only uses "draft" → "approved" or
 *  "discarded"; later phases will hit "materialized" / "scheduled". */
export async function setBatchStatus(
  batchId: string,
  status: StrategyBatch["status"]
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, batchId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/** Hard delete the whole batch (user dismissed it from the list). */
export async function deleteStrategyBatch(batchId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, batchId));
}

/** Patch the materialized body of one brief — used when the user inline-edits
 *  the generated post copy without re-running the LLM. Distinct from
 *  patchPostBrief so we don't accidentally allow the brief fields (hook /
 *  angle / etc.) to be edited after materialization. */
export async function patchMaterializedPost(
  batchId: string,
  briefId: string,
  newContent: string
): Promise<void> {
  const ref = doc(db, COLLECTION, batchId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("batch_not_found");
  const data = snap.data();
  const posts: PostBrief[] = Array.isArray(data.posts) ? data.posts : [];
  const next = posts.map((p) =>
    p.id === briefId && p.materialized
      ? { ...p, materialized: { ...p.materialized, content: newContent } }
      : p
  );
  await updateDoc(ref, { posts: next, updatedAt: serverTimestamp() });
}
