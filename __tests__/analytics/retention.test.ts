import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { PURGED_COLLECTIONS } from "@/lib/analytics/retention";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

type Row = Record<string, unknown>;
const NOW = Date.UTC(2026, 9, 22);
const DAY = 86_400_000;
const exp = (ms: number) => ({ expireAt: Timestamp.fromMillis(ms) });

function fakeDb(seed: Record<string, Record<string, Row>>) {
  const store = new Map(Object.entries(seed).map(([c, d]) => [c, new Map(Object.entries(d))]));
  const col = (n: string) => store.get(n) ?? store.set(n, new Map()).get(n)!;
  const db = {
    collection: (name: string) => ({
      where: (_f: string, _op: string, cutoff: Timestamp) => ({
        limit: (n: number) => ({
          get: async () => {
            const rows = [...col(name).entries()]
              .filter(([, d]) => d.expireAt instanceof Timestamp && d.expireAt.toMillis() < cutoff.toMillis())
              .slice(0, n);
            return { empty: rows.length === 0, size: rows.length, docs: rows.map(([id]) => ({ id, ref: { c: name, id } })) };
          },
        }),
      }),
    }),
    batch: () => {
      const ops: Array<{ c: string; id: string }> = [];
      return {
        delete: (r: { c: string; id: string }) => void ops.push(r),
        commit: async () => ops.forEach((o) => col(o.c).delete(o.id)),
      };
    },
  };
  return { db: db as unknown as FirebaseFirestore.Firestore, ids: (c: string) => [...col(c).keys()].sort() };
}

// The route test below mocks the retention module for the whole file, so the
// real implementation is loaded explicitly here.
const purgeExpired = async (...args: Parameters<typeof import("@/lib/analytics/retention").purgeExpired>) => {
  const actual = await vi.importActual<typeof import("@/lib/analytics/retention")>("@/lib/analytics/retention");
  return actual.purgeExpired(...args);
};

describe("purgeExpired", () => {
  it("deletes only documents past expireAt, in every personal-data collection", async () => {
    const seed: Record<string, Record<string, Row>> = {};
    for (const c of PURGED_COLLECTIONS) {
      seed[c] = {
        old1: exp(NOW - 2 * DAY),
        old2: exp(NOW - 1),
        fresh: exp(NOW + 30 * DAY),
        noExpiry: { a: 1 }, // never purged: no expireAt
      };
    }
    seed.analytics_daily = { "2020-01-01": { pageviews: 1 } };
    seed.analytics_dims = { "source~2020-01-01~x": { sessions: 1 } };
    seed.analytics_users = { u1: { stages: {} } };
    const { db, ids } = fakeDb(seed);

    const res = await purgeExpired(db, { now: NOW });
    for (const c of PURGED_COLLECTIONS) {
      expect(ids(c)).toEqual(["fresh", "noExpiry"]);
      expect(res.deleted[c]).toBe(2);
    }
    // anonymous aggregates and the account-lifetime funnel link are untouched
    expect(ids("analytics_daily")).toEqual(["2020-01-01"]);
    expect(ids("analytics_dims")).toEqual(["source~2020-01-01~x"]);
    expect(ids("analytics_users")).toEqual(["u1"]);
    expect(res.partial).toBe(false);
  });

  it("does not purge the 13-month boundary early", async () => {
    const { db, ids } = fakeDb({ analytics_events: { edge: exp(NOW + 1) } });
    await purgeExpired(db, { now: NOW });
    expect(ids("analytics_events")).toEqual(["edge"]);
  });

  it("works through a backlog larger than one batch", async () => {
    const many = Object.fromEntries(Array.from({ length: 650 }, (_, i) => [`e${i}`, exp(NOW - DAY)]));
    const { db, ids } = fakeDb({ analytics_events: many });
    const res = await purgeExpired(db, { now: NOW });
    expect(res.deleted.analytics_events).toBe(650);
    expect(ids("analytics_events")).toHaveLength(0);
  });

  it("reports a partial run when the batch cap is hit", async () => {
    const many = Object.fromEntries(Array.from({ length: 700 }, (_, i) => [`e${i}`, exp(NOW - DAY)]));
    const { db, ids } = fakeDb({ analytics_events: many });
    const res = await purgeExpired(db, { now: NOW, maxBatchesPerCollection: 1 });
    expect(res.partial).toBe(true);
    expect(res.deleted.analytics_events).toBe(300);
    expect(ids("analytics_events")).toHaveLength(400);
  });

  it("stops at the deadline", async () => {
    const { db } = fakeDb({ analytics_events: { a: exp(NOW - DAY) } });
    const res = await purgeExpired(db, { now: NOW, deadline: Date.now() - 1 });
    expect(res.partial).toBe(true);
    expect(res.deleted.analytics_events).toBe(0);
  });
});

// ───────────────────────── Cron route ─────────────────────────

const purge = vi.fn(async (..._a: unknown[]) => ({ deleted: { analytics_events: 5 }, partial: false }));
vi.mock("@/lib/db/firebase-admin", () => ({ isAdminInitialized: () => true, adminDb: { marker: "db" } }));
vi.mock("@/lib/analytics/retention", async (orig) => {
  const actual = await orig<typeof import("@/lib/analytics/retention")>();
  return { ...actual, purgeExpired: (...a: unknown[]) => purge(...a) };
});

describe("GET /api/cron/analytics-retention", () => {
  const saved = process.env.CRON_SECRET;
  beforeEach(() => purge.mockClear());
  afterEach(() => {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  });

  const call = async (headers: Record<string, string> = {}) => {
    const { GET } = await import("@/app/api/cron/analytics-retention/route");
    return GET(new NextRequest("http://localhost/api/cron/analytics-retention", { headers }));
  };

  it("refuses when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await call({ authorization: "Bearer anything" })).status).toBe(500);
    expect(purge).not.toHaveBeenCalled();
  });

  it("refuses missing or wrong secrets", async () => {
    process.env.CRON_SECRET = "s3cret-value";
    expect((await call()).status).toBe(403);
    expect((await call({ authorization: "Bearer wrong" })).status).toBe(403);
    expect((await call({ "x-cron-secret": "nope" })).status).toBe(403);
    expect(purge).not.toHaveBeenCalled();
  });

  it("runs the purge for Vercel Cron's bearer secret", async () => {
    process.env.CRON_SECRET = "s3cret-value";
    const res = await call({ authorization: "Bearer s3cret-value" });
    expect(res.status).toBe(200);
    expect(purge).toHaveBeenCalledTimes(1);
    expect(await res.json()).toMatchObject({ ok: true, deleted: { analytics_events: 5 } });
  });
});
