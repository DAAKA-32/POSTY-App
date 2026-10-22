import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CHANNEL_PRESETS, buildTaggedUrl } from "@/lib/analytics/links";
import { classifyTouch, sanitizeTag } from "@/lib/analytics/attribution";
import { trustOf } from "@/lib/analytics/events";

// ───────────────────────── Tagged links ─────────────────────────

function touchOf(url: string) {
  const p = new URL(url).searchParams;
  return {
    utm_source: p.get("utm_source") ?? undefined,
    utm_medium: p.get("utm_medium") ?? undefined,
    utm_campaign: p.get("utm_campaign") ?? undefined,
    utm_content: p.get("utm_content") ?? undefined,
    utm_term: p.get("utm_term") ?? undefined,
  };
}

describe("tagged link builder", () => {
  it("builds the canonical ChatGPT link", () => {
    const r = buildTaggedUrl({ source: "chatgpt.com", medium: "referral", campaign: "launch" });
    expect(r).toMatchObject({
      ok: true,
      url: "https://postyapp.ai/?utm_source=chatgpt.com&utm_medium=referral&utm_campaign=launch",
      recorded: { key: "chatgpt/referral", campaign: "launch" },
    });
  });

  it("every preset round-trips through the server's classification — even with no referrer", () => {
    for (const p of CHANNEL_PRESETS) {
      const r = buildTaggedUrl({ source: p.source, medium: p.medium, campaign: "Fall Launch", content: "Post 12" });
      expect(r.ok, p.id).toBe(true);
      if (!r.ok) continue;
      const c = classifyTouch(touchOf(r.url)); // note: no referrer at all
      expect(c.method).toBe("utm");
      expect(c.key).toBe(r.recorded.key);
      expect(c.key).not.toBe("direct/none");
      expect(c.campaign).toBe("fall-launch");
      expect(c.content).toBe("post-12");
    }
  });

  it("an untagged link with no referrer is exactly the 'direct' the tag fixes", () => {
    expect(classifyTouch({}).key).toBe("direct/none");
  });

  it("presets are unique and already normalised", () => {
    expect(new Set(CHANNEL_PRESETS.map((p) => p.id)).size).toBe(CHANNEL_PRESETS.length);
    for (const p of CHANNEL_PRESETS) {
      expect(sanitizeTag(p.source)).toBe(p.source);
      expect(sanitizeTag(p.medium)).toBe(p.medium);
    }
  });

  it("only ever points at postyapp.ai over https", () => {
    for (const base of ["https://evil.com/", "http://postyapp.ai/", "javascript:alert(1)", "https://postyapp.ai.evil.com/", "not a url", "https://postyapp.ai@evil.com/"]) {
      const r = buildTaggedUrl({ base, source: "x", medium: "social", campaign: "c" });
      expect(r.ok, base).toBe(false);
    }
    expect(buildTaggedUrl({ base: "https://www.postyapp.ai/pricing", source: "x", medium: "social", campaign: "c" }).ok).toBe(true);
  });

  it("replaces stale utm params, keeps others, normalises hostile input", () => {
    const r = buildTaggedUrl({
      base: "https://postyapp.ai/?ref=abc&utm_source=old&utm_campaign=old",
      source: " LinkedIn ",
      medium: "<script>",
      campaign: "A & B; DROP",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const u = new URL(r.url);
    expect(u.searchParams.get("ref")).toBe("abc");
    expect(u.searchParams.getAll("utm_source")).toEqual(["linkedin"]);
    expect(u.searchParams.get("utm_medium")).toBe("script");
    expect(u.searchParams.get("utm_campaign")).toMatch(/^[a-z0-9._-]+$/);
  });

  it("requires source, medium and campaign", () => {
    expect(buildTaggedUrl({ source: "", medium: "social", campaign: "c" }).ok).toBe(false);
    expect(buildTaggedUrl({ source: "x", medium: "  ", campaign: "c" }).ok).toBe(false);
    expect(buildTaggedUrl({ source: "x", medium: "social", campaign: "§§§" }).ok).toBe(false);
  });
});

// ───────────────────────── New events ─────────────────────────

describe("event trust for the newly wired events", () => {
  it("login_completed and strategy_plan_approved need a verified token", () => {
    expect(trustOf("login_completed")).toBe("client_authed");
    expect(trustOf("strategy_plan_approved")).toBe("client_authed");
  });
  it("first_post_approved is not an event (no matching product action)", () => {
    expect(trustOf("first_post_approved")).toBeNull();
  });
});

// ───────────────────────── GDPR erasure ─────────────────────────

type Row = Record<string, unknown>;
function fakeDb(seed: Record<string, Record<string, Row>>) {
  const store = new Map<string, Map<string, Row>>(
    Object.entries(seed).map(([c, docs]) => [c, new Map(Object.entries(docs))])
  );
  const col = (name: string) => store.get(name) ?? store.set(name, new Map()).get(name)!;
  const snap = (name: string, rows: Array<[string, Row]>) => ({
    empty: rows.length === 0,
    size: rows.length,
    docs: rows.map(([id, d]) => ({ id, data: () => d, ref: { c: name, id } })),
  });
  const query = (name: string, filters: Array<[string, unknown]>, lim = Infinity) => ({
    limit: (n: number) => query(name, filters, n),
    get: async () =>
      snap(name, [...col(name).entries()].filter(([, d]) => filters.every(([f, v]) => d[f] === v)).slice(0, lim)),
  });
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => ({ exists: col(name).has(id), data: () => col(name).get(id) }),
        delete: async () => void col(name).delete(id),
      }),
      where: (f: string, _op: string, v: unknown) => query(name, [[f, v]]),
    }),
    batch: () => {
      const ops: Array<{ c: string; id: string }> = [];
      return {
        delete: (ref: { c: string; id: string }) => void ops.push(ref),
        commit: async () => ops.forEach((o) => col(o.c).delete(o.id)),
      };
    },
  };
  return { db: db as unknown as FirebaseFirestore.Firestore, ids: (c: string) => [...col(c).keys()].sort() };
}

// The route test below mocks the ingest module for the whole file, so the
// real implementation is loaded explicitly here.
const realDelete = async (db: FirebaseFirestore.Firestore, uid: string) => {
  const actual = await vi.importActual<typeof import("@/lib/analytics/ingest")>("@/lib/analytics/ingest");
  return actual.deleteAnalyticsForUser(db, uid);
};

describe("deleteAnalyticsForUser", () => {
  const seed = () => ({
    analytics_users: { user1: { vid: "visitor-1" }, user2: { vid: "visitor-2" } },
    analytics_visitors: {
      "visitor-1": { userId: "user1" },
      "visitor-1b": { userId: "user1" }, // second device
      "visitor-2": { userId: "user2" },
      "visitor-anon": {},
    },
    analytics_sessions: {
      s1: { vid: "visitor-1" },
      s1b: { vid: "visitor-1b" },
      s2: { vid: "visitor-2" },
    },
    analytics_events: {
      e1: { uid: "user1", vid: "visitor-1" },
      e2: { vid: "visitor-1" }, // anonymous, before signup
      e3: { vid: "visitor-1b" },
      e4: { uid: "user1" }, // server event, no vid
      e5: { uid: "user2", vid: "visitor-2" },
      e6: { vid: "visitor-anon" },
    },
    analytics_daily: { "2026-10-22": { pageviews: 5 } },
  });

  it("erases the account's visitors, sessions, events and funnel link", async () => {
    const { db, ids } = fakeDb(seed());
    const res = await realDelete(db, "user1");
    expect(res).toMatchObject({ visitors: 2 });
    expect(ids("analytics_users")).toEqual(["user2"]);
    expect(ids("analytics_visitors")).toEqual(["visitor-2", "visitor-anon"]);
    expect(ids("analytics_sessions")).toEqual(["s2"]);
    expect(ids("analytics_events")).toEqual(["e5", "e6"]);
  });

  it("never touches another account's data or the anonymous aggregates", async () => {
    const { db, ids } = fakeDb(seed());
    await realDelete(db, "user1");
    expect(ids("analytics_events")).toContain("e5");
    expect(ids("analytics_events")).toContain("e6");
    expect(ids("analytics_daily")).toEqual(["2026-10-22"]);
  });

  it("is a no-op for an account with no analytics", async () => {
    const { db, ids } = fakeDb(seed());
    await realDelete(db, "nobody");
    expect(ids("analytics_events")).toHaveLength(6);
  });
});

// ───────────────────────── Erasure route ─────────────────────────

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
const verifyIdToken = vi.fn();
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken }) }));
vi.mock("@/lib/db/firebase-admin", () => ({ isAdminInitialized: () => true, adminDb: { marker: "db" } }));
const erase = vi.fn(async (..._args: unknown[]) => ({ events: 3, sessions: 1, visitors: 1 }));
vi.mock("@/lib/analytics/ingest", async (orig) => {
  const actual = await orig<typeof import("@/lib/analytics/ingest")>();
  return { ...actual, deleteAnalyticsForUser: (...a: unknown[]) => erase(...a) };
});

describe("POST /api/analytics/delete", () => {
  beforeEach(() => {
    erase.mockClear();
    verifyIdToken.mockReset();
    verifyIdToken.mockImplementation(async (t: string) => {
      if (t === "good") return { uid: "uid_caller", email: "a@b.c" };
      throw new Error("bad");
    });
  });

  const call = async (url: string, token?: string, body?: unknown) => {
    const { POST } = await import("@/app/api/analytics/delete/route");
    return POST(
      new NextRequest(`http://localhost${url}`, {
        method: "POST",
        headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "x-forwarded-for": `9.9.9.${Math.floor(Math.random() * 250)}` },
        body: body ? JSON.stringify(body) : undefined,
      })
    );
  };

  it("rejects callers without a valid token and deletes nothing", async () => {
    expect((await call("/api/analytics/delete")).status).toBe(401);
    expect((await call("/api/analytics/delete", "forged")).status).toBe(401);
    expect(erase).not.toHaveBeenCalled();
  });

  it("deletes only the token's own account, ignoring any uid in the request", async () => {
    const res = await call("/api/analytics/delete?uid=uid_victim", "good", { uid: "uid_victim", userId: "uid_victim" });
    expect(res.status).toBe(200);
    expect(erase).toHaveBeenCalledTimes(1);
    expect(erase.mock.calls[0]).toEqual([{ marker: "db" }, "uid_caller"]);
    expect(await res.json()).toMatchObject({ ok: true, events: 3 });
  });
});
