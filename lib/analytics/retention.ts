/**
 * Retention purge — enforces the 13-month limit on personal analytics data.
 *
 * Firestore's native TTL policy would do this, but it can't be enabled on a
 * project without billing (tink-dc3d4 has billing disabled), so a daily cron
 * (/api/cron/analytics-retention) deletes every document whose `expireAt` has
 * passed. Aggregates (analytics_daily / analytics_dims) hold no personal data
 * and are not purged.
 */

import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { COL } from "./ingest";

export const PURGED_COLLECTIONS = [
  COL.events,
  COL.sessions,
  COL.visitors,
  COL.audit,
] as const;

const BATCH = 300;

export interface PurgeResult {
  deleted: Record<string, number>;
  /** True when the run stopped early (deadline / batch cap): more remains. */
  partial: boolean;
}

export async function purgeExpired(
  db: Firestore,
  opts: { now?: number; deadline?: number; maxBatchesPerCollection?: number } = {}
): Promise<PurgeResult> {
  const now = opts.now ?? Date.now();
  const cutoff = Timestamp.fromMillis(now);
  const maxBatches = opts.maxBatchesPerCollection ?? 40;
  const deleted: Record<string, number> = {};
  let partial = false;

  for (const name of PURGED_COLLECTIONS) {
    deleted[name] = 0;
    for (let i = 0; i < maxBatches; i++) {
      if (opts.deadline && Date.now() > opts.deadline) {
        return { deleted, partial: true };
      }
      const snap = await db
        .collection(name)
        .where("expireAt", "<", cutoff)
        .limit(BATCH)
        .get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted[name] += snap.size;
      if (snap.size < BATCH) break;
      if (i === maxBatches - 1) partial = true;
    }
  }
  return { deleted, partial };
}
