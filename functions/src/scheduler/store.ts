import { Timestamp, type Firestore, type QuerySnapshot } from "firebase-admin/firestore";
import {
  decideClaim,
  decideFinalize,
  decideLeaseRecovery,
  decideSending,
  type AttemptResult,
  type FinalizeDecision,
  type RecoveryDecision,
  type SkipReason,
} from "./policy";
import { readState, toFirestoreUpdate, toMillis } from "./store-mapping";
import type { PublishErrorCode, ScheduledPostState } from "./types";
import type { SchedulerLogger } from "./logger";

export const SCHEDULED_POSTS_COLLECTION = "scheduledPosts";
export const SCHEDULER_HEALTH_DOC = "systemHealth/scheduler";

export interface DueRef {
  id: string;
  kind: "first_attempt" | "retry";
}

export interface ClaimedPost {
  id: string;
  attempt: number;
  claimedAtMs: number;
  /** Raw document as read inside the claim transaction. */
  data: Record<string, unknown>;
  state: ScheduledPostState;
}

export type ClaimOutcome =
  | { kind: "claimed"; post: ClaimedPost }
  | { kind: "skipped"; reason: SkipReason }
  | { kind: "failed_without_attempt"; code: PublishErrorCode };

export interface SchedulerHeartbeat {
  runId: string;
  startedAtMs: number;
  finishedAtMs: number;
  stats: Record<string, number>;
  config: Record<string, string>;
  error: string | null;
}

export interface SchedulerStore {
  listDue(nowMs: number, limit: number): Promise<DueRef[]>;
  listExpiredLeases(nowMs: number, limit: number): Promise<string[]>;
  claim(id: string, nowMs: number, runId: string): Promise<ClaimOutcome>;
  /** Persists stage=sending; false when `runId` no longer owns a live lease. */
  markSending(id: string, runId: string, nowMs: number, resumeState?: Record<string, string>): Promise<boolean>;
  finalize(
    id: string,
    runId: string,
    nowMs: number,
    attemptStartedAtMs: number,
    result: AttemptResult,
    random: () => number,
  ): Promise<FinalizeDecision>;
  recoverLease(id: string, nowMs: number, runId: string, random: () => number): Promise<RecoveryDecision>;
  writeHeartbeat(heartbeat: SchedulerHeartbeat): Promise<void>;
}

export type DocMutation<T> = (data: Record<string, unknown> | null) => {
  result: T;
  update?: Record<string, unknown>;
};

/**
 * All state transitions share one shape: read the doc, let the pure policy
 * decide, apply the patch — atomically. Subclasses only provide the
 * transaction primitive and the queries, so the Firestore store and the
 * in-memory test store run the exact same transition code.
 */
export abstract class TransactionalSchedulerStore implements SchedulerStore {
  protected abstract runOnDoc<T>(id: string, mutation: DocMutation<T>): Promise<T>;

  abstract listDue(nowMs: number, limit: number): Promise<DueRef[]>;
  abstract listExpiredLeases(nowMs: number, limit: number): Promise<string[]>;
  abstract writeHeartbeat(heartbeat: SchedulerHeartbeat): Promise<void>;

  claim(id: string, nowMs: number, runId: string): Promise<ClaimOutcome> {
    return this.runOnDoc<ClaimOutcome>(id, (data) => {
      const state = readState(data);
      const decision = decideClaim(state, nowMs, runId);
      if (decision.kind === "skip" || !data || !state) {
        return { result: { kind: "skipped", reason: decision.kind === "skip" ? decision.reason : "not_found" } };
      }
      const update = toFirestoreUpdate(decision.patch, data);
      if (decision.kind === "fail") return { result: { kind: "failed_without_attempt", code: decision.code }, update };
      return {
        result: { kind: "claimed", post: { id, attempt: decision.attempt, claimedAtMs: nowMs, data, state } },
        update,
      };
    });
  }

  markSending(id: string, runId: string, nowMs: number, resumeState?: Record<string, string>): Promise<boolean> {
    return this.runOnDoc<boolean>(id, (data) => {
      const decision = decideSending(readState(data), runId, nowMs, resumeState);
      if (!decision.ok || !data) return { result: false };
      return { result: true, update: toFirestoreUpdate(decision.patch, data) };
    });
  }

  finalize(
    id: string,
    runId: string,
    nowMs: number,
    attemptStartedAtMs: number,
    result: AttemptResult,
    random: () => number,
  ): Promise<FinalizeDecision> {
    return this.runOnDoc<FinalizeDecision>(id, (data) => {
      const decision = decideFinalize(readState(data), runId, nowMs, attemptStartedAtMs, result, random);
      if (!("patch" in decision) || !data) return { result: decision };
      return { result: decision, update: toFirestoreUpdate(decision.patch, data) };
    });
  }

  recoverLease(id: string, nowMs: number, runId: string, random: () => number): Promise<RecoveryDecision> {
    return this.runOnDoc<RecoveryDecision>(id, (data) => {
      const decision = decideLeaseRecovery(readState(data), nowMs, runId, random);
      if (decision.kind === "skip" || !data) return { result: decision };
      return { result: decision, update: toFirestoreUpdate(decision.patch, data) };
    });
  }
}

/** Queries fall back to a single-field scan while a new composite index builds. */
const FALLBACK_SCAN_LIMIT = 300;

function isMissingIndexError(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  const message = err instanceof Error ? err.message : "";
  return code === 9 || code === "failed-precondition" || /FAILED_PRECONDITION|requires an index/i.test(message);
}

export class FirestoreSchedulerStore extends TransactionalSchedulerStore {
  constructor(
    private readonly db: Firestore,
    private readonly log: SchedulerLogger,
  ) {
    super();
  }

  protected runOnDoc<T>(id: string, mutation: DocMutation<T>): Promise<T> {
    const ref = this.db.collection(SCHEDULED_POSTS_COLLECTION).doc(id);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const { result, update } = mutation(snap.exists ? (snap.data() as Record<string, unknown>) : null);
      if (update) tx.update(ref, update);
      return result;
    });
  }

  private async queryWithFallback(
    label: string,
    primary: () => Promise<QuerySnapshot>,
    fallback: () => Promise<QuerySnapshot>,
    keep: (data: Record<string, unknown>) => boolean,
    limit: number,
  ): Promise<string[]> {
    try {
      const snap = await primary();
      return snap.docs.map((d) => d.id);
    } catch (err) {
      if (!isMissingIndexError(err)) throw err;
      this.log.log("WARNING", "scheduler.query_index_missing", {
        query: label,
        detail: err instanceof Error ? err.message.slice(0, 300) : String(err),
      });
      const snap = await fallback();
      return snap.docs.filter((d) => keep(d.data() as Record<string, unknown>)).slice(0, limit).map((d) => d.id);
    }
  }

  async listDue(nowMs: number, limit: number): Promise<DueRef[]> {
    const now = Timestamp.fromMillis(nowMs);
    const col = this.db.collection(SCHEDULED_POSTS_COLLECTION);

    // First attempts — composite index (status ASC, scheduledAt ASC), deployed.
    const firstSnap = await col
      .where("status", "==", "pending")
      .where("scheduledAt", "<=", now)
      .orderBy("scheduledAt", "asc")
      .limit(limit)
      .get();

    // Retries — composite index (status ASC, nextAttemptAt ASC).
    const retryIds = await this.queryWithFallback(
      "retrying_due",
      () =>
        col
          .where("status", "==", "retrying")
          .where("nextAttemptAt", "<=", now)
          .orderBy("nextAttemptAt", "asc")
          .limit(limit)
          .get(),
      () => col.where("status", "==", "retrying").limit(FALLBACK_SCAN_LIMIT).get(),
      (data) => {
        const next = toMillis(data.nextAttemptAt);
        return next === null || next <= nowMs;
      },
      limit,
    );

    const seen = new Set<string>();
    const out: DueRef[] = [];
    for (const d of firstSnap.docs) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        out.push({ id: d.id, kind: "first_attempt" });
      }
    }
    for (const id of retryIds) {
      if (!seen.has(id)) {
        seen.add(id);
        out.push({ id, kind: "retry" });
      }
    }
    return out;
  }

  listExpiredLeases(nowMs: number, limit: number): Promise<string[]> {
    const now = Timestamp.fromMillis(nowMs);
    const col = this.db.collection(SCHEDULED_POSTS_COLLECTION);
    // Composite index (status ASC, leaseExpiresAt ASC).
    return this.queryWithFallback(
      "expired_leases",
      () =>
        col
          .where("status", "==", "processing")
          .where("leaseExpiresAt", "<=", now)
          .orderBy("leaseExpiresAt", "asc")
          .limit(limit)
          .get(),
      () => col.where("status", "==", "processing").limit(FALLBACK_SCAN_LIMIT).get(),
      (data) => {
        const lease = toMillis(data.leaseExpiresAt);
        return lease === null || lease <= nowMs;
      },
      limit,
    );
  }

  async writeHeartbeat(heartbeat: SchedulerHeartbeat): Promise<void> {
    await this.db.doc(SCHEDULER_HEALTH_DOC).set(
      {
        lastRunId: heartbeat.runId,
        lastRunStartedAt: Timestamp.fromMillis(heartbeat.startedAtMs),
        lastRunAt: Timestamp.fromMillis(heartbeat.finishedAtMs),
        lastRunDurationMs: heartbeat.finishedAtMs - heartbeat.startedAtMs,
        lastRunStats: heartbeat.stats,
        config: heartbeat.config,
        lastRunError: heartbeat.error,
      },
      { merge: true },
    );
  }
}
