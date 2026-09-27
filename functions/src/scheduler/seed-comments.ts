import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { PublishError, sanitizeDetail, toPublishError } from "./errors";
import { classifyHttpStatus, readBodySafe, requestWithTimeout, type FetchLike } from "./http";
import type { SchedulerLogger } from "./logger";
import { assertNotExpired, decryptConnectionToken } from "./publishers/auth";
import { linkedInJsonHeaders } from "./publishers/linkedin";
import type { SeedCommentRequest } from "./run";
import { toMillis } from "./store-mapping";

export const SEED_COMMENTS_COLLECTION = "pendingSeedComments";
export const SEED_MAX_ATTEMPTS = 3;
export const SEED_RETRY_DELAY_MS = 5 * 60_000;
/** A comment that could not fire within this window is dropped (never posted late). */
export const SEED_STALE_MS = 60 * 60_000;
export const SEED_LEASE_MS = 10 * 60_000;
const SEED_BATCH_LIMIT = 25;

/**
 * Idempotent: one seed comment per scheduled post (deterministic doc id), so
 * a replayed publish can never queue a second comment.
 */
export async function enqueueSeedComment(
  db: Firestore,
  request: SeedCommentRequest,
  nowMs: number,
  random: () => number,
): Promise<"created" | "exists"> {
  // Lands after the post has gathered first impressions: base delay (1-15 min)
  // plus 0-4 min of organic jitter so comments never share a cadence.
  const baseDelayMin = Math.max(1, Math.min(15, request.delayMinutes || 5));
  const fireAtMs = nowMs + (baseDelayMin + random() * 4) * 60_000;
  try {
    await db
      .collection(SEED_COMMENTS_COLLECTION)
      .doc(`sc_${request.scheduledPostId}`)
      .create({
        userId: request.userId,
        parentScheduledPostId: request.scheduledPostId,
        parentPostUrn: request.parentPostUrn,
        parentPostUrl: request.parentPostUrl,
        actorUrn: request.actorUrn,
        text: request.text,
        fireAt: Timestamp.fromMillis(fireAtMs),
        status: "pending",
        attemptCount: 0,
        createdAt: Timestamp.fromMillis(nowMs),
      });
    return "created";
  } catch (err) {
    const code = (err as { code?: unknown } | null)?.code;
    if (code === 6 || code === "already-exists") return "exists";
    throw err;
  }
}

export interface SeedCommentDeps {
  db: Firestore;
  fetch: FetchLike;
  linkedinApiBaseUrl: string;
  autopostEnabled: boolean;
  now(): number;
  log: SchedulerLogger;
  runId: string;
}

type SeedClaim =
  | { kind: "claimed"; data: Record<string, unknown>; attempt: number }
  | { kind: "skipped"; reason: string }
  | { kind: "closed"; status: string };

async function claimSeedComment(deps: SeedCommentDeps, id: string): Promise<SeedClaim> {
  const ref = deps.db.collection(SEED_COMMENTS_COLLECTION).doc(id);
  return deps.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as Record<string, unknown> | undefined;
    if (!data || data.status !== "pending") return { kind: "skipped", reason: "not_pending" } as SeedClaim;
    const nowMs = deps.now();
    const fireAtMs = toMillis(data.fireAt);
    if (fireAtMs === null || fireAtMs > nowMs) return { kind: "skipped", reason: "not_due" } as SeedClaim;

    if (nowMs - fireAtMs > SEED_STALE_MS) {
      tx.update(ref, {
        status: "skipped_stale",
        failureReason: `Not fired within ${SEED_STALE_MS / 60_000} min of its slot (worker was unavailable)`,
      });
      return { kind: "closed", status: "skipped_stale" } as SeedClaim;
    }
    if (!deps.autopostEnabled) {
      tx.update(ref, {
        status: "skipped_flag_off",
        failureReason: "Auto-post disabled (SEED_COMMENT_AUTOPOST is not \"true\")",
      });
      return { kind: "closed", status: "skipped_flag_off" } as SeedClaim;
    }

    const attempt = (typeof data.attemptCount === "number" ? data.attemptCount : 0) + 1;
    tx.update(ref, {
      status: "posting",
      attemptCount: attempt,
      claimedBy: deps.runId,
      leaseExpiresAt: Timestamp.fromMillis(nowMs + SEED_LEASE_MS),
    });
    return { kind: "claimed", data, attempt } as SeedClaim;
  });
}

async function postComment(deps: SeedCommentDeps, data: Record<string, unknown>): Promise<string | null> {
  const userId = typeof data.userId === "string" ? data.userId : "";
  const parentUrn = typeof data.parentPostUrn === "string" ? data.parentPostUrn : "";
  if (!userId || !parentUrn) {
    throw new PublishError({ code: "INVALID_POST_DATA", platform: "linkedin", detail: "userId or parentPostUrn missing" });
  }
  const connSnap = await deps.db.collection("linkedinConnections").doc(userId).get();
  if (!connSnap.exists) throw new PublishError({ code: "CONNECTION_NOT_FOUND", platform: "linkedin" });
  const conn = connSnap.data() as Record<string, unknown>;
  const accessToken = decryptConnectionToken(conn.accessToken, "linkedin");
  assertNotExpired(conn.expiresAt, deps.now(), "linkedin");

  const res = await requestWithTimeout(
    deps.fetch,
    `${deps.linkedinApiBaseUrl}/socialActions/${encodeURIComponent(parentUrn)}/comments`,
    {
      method: "POST",
      headers: linkedInJsonHeaders(accessToken),
      body: JSON.stringify({ actor: data.actorUrn, object: parentUrn, message: { text: data.text } }),
    },
    { platform: "linkedin", stage: "send" },
  );
  const text = await readBodySafe(res);
  if (!res.ok) throw classifyHttpStatus({ platform: "linkedin", status: res.status, body: text, stage: "send" });
  try {
    const parsed = JSON.parse(text) as { $URN?: unknown; id?: unknown };
    if (typeof parsed.$URN === "string") return parsed.$URN;
    if (typeof parsed.id === "string") return parsed.id;
  } catch {
    // posted, id unknown
  }
  return null;
}

/** One worker tick: recovers abandoned claims, then fires due comments. */
export async function runSeedCommentTick(deps: SeedCommentDeps): Promise<Record<string, number>> {
  const stats = { recovered: 0, due: 0, posted: 0, retried: 0, failed: 0, skipped: 0 };
  const col = deps.db.collection(SEED_COMMENTS_COLLECTION);
  const now = Timestamp.fromMillis(deps.now());

  // A comment stuck in "posting" may or may not exist on LinkedIn — never
  // re-post it (a duplicate self-comment is visible); close it instead.
  const posting = await col.where("status", "==", "posting").limit(100).get();
  for (const doc of posting.docs) {
    const lease = toMillis(doc.get("leaseExpiresAt"));
    if (lease !== null && lease > deps.now()) continue;
    await doc.ref.update({ status: "failed", failureReason: "Worker stopped while posting — outcome unknown, not retried" });
    stats.recovered++;
    deps.log.log("WARNING", "seed_comment.lease_recovered", { runId: deps.runId, seedCommentId: doc.id });
  }

  let dueIds: string[];
  try {
    const snap = await col.where("status", "==", "pending").where("fireAt", "<=", now).limit(SEED_BATCH_LIMIT).get();
    dueIds = snap.docs.map((d) => d.id);
  } catch (err) {
    // Composite index (status ASC, fireAt ASC) still building / missing.
    deps.log.log("WARNING", "seed_comment.query_index_missing", {
      runId: deps.runId,
      detail: err instanceof Error ? err.message.slice(0, 300) : String(err),
    });
    const snap = await col.where("status", "==", "pending").limit(200).get();
    dueIds = snap.docs
      .filter((d) => {
        const fireAt = toMillis(d.get("fireAt"));
        return fireAt !== null && fireAt <= deps.now();
      })
      .slice(0, SEED_BATCH_LIMIT)
      .map((d) => d.id);
  }
  stats.due = dueIds.length;

  for (const id of dueIds) {
    const claim = await claimSeedComment(deps, id);
    if (claim.kind === "skipped") {
      stats.skipped++;
      continue;
    }
    if (claim.kind === "closed") {
      stats.skipped++;
      deps.log.log("INFO", "seed_comment.closed", { runId: deps.runId, seedCommentId: id, status: claim.status });
      continue;
    }

    const ref = col.doc(id);
    try {
      const commentUrn = await postComment(deps, claim.data);
      await ref.update({ status: "posted", postedAt: Timestamp.fromMillis(deps.now()), commentUrn, failureReason: null });
      stats.posted++;
      deps.log.log("INFO", "seed_comment.posted", { runId: deps.runId, seedCommentId: id, attempt: claim.attempt });
    } catch (err) {
      const error = toPublishError(err, "linkedin");
      const retry = error.retryable && !error.ambiguous && claim.attempt < SEED_MAX_ATTEMPTS;
      await ref.update({
        status: retry ? "pending" : "failed",
        failureReason: sanitizeDetail(`${error.code}${error.detail ? ` — ${error.detail}` : ""}`),
        lastErrorCode: error.code,
        ...(retry ? { fireAt: Timestamp.fromMillis(deps.now() + SEED_RETRY_DELAY_MS) } : {}),
      });
      if (retry) stats.retried++;
      else stats.failed++;
      deps.log.log(retry ? "WARNING" : "ERROR", retry ? "seed_comment.retry_scheduled" : "seed_comment.failed", {
        runId: deps.runId,
        seedCommentId: id,
        attempt: claim.attempt,
        code: error.code,
        httpStatus: error.httpStatus,
        ambiguous: error.ambiguous,
        detail: error.detail,
      });
    }
  }
  return stats;
}
