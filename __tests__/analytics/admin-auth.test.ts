import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks: Firebase Admin token verification + the Admin DB + the writer ──
// The first import of the route graph is slow on a cold Vite cache.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const verifyIdToken = vi.fn();
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken }) }));

const dbCalls: string[] = [];
const fakeDb = {
  collection: (name: string) => {
    dbCalls.push(name);
    throw new Error("db must not be reached by unauthorized callers");
  },
};
vi.mock("@/lib/db/firebase-admin", () => ({
  isAdminInitialized: () => true,
  adminDb: fakeDb,
}));

const ingestEvent = vi.fn(async () => ({ status: "ok" }));
vi.mock("@/lib/analytics/ingest", async (orig) => {
  const actual = await orig<typeof import("@/lib/analytics/ingest")>();
  return { ...actual, ingestEvent: (...a: unknown[]) => ingestEvent(...(a as [])) };
});

const ADMIN = "emilien.nepveu@gmail.com";
const tokens: Record<string, Record<string, unknown>> = {
  admin: { uid: "uid_admin", email: ADMIN, email_verified: true },
  adminUpper: { uid: "uid_admin", email: "Emilien.Nepveu@Gmail.com", email_verified: true },
  adminUnverified: { uid: "uid_admin", email: ADMIN, email_verified: false },
  user: { uid: "uid_user", email: "someone@example.com", email_verified: true },
  lookalike: { uid: "uid_x", email: "emilien.nepveu@gmail.com.evil.io", email_verified: true },
  noEmail: { uid: "uid_y", email_verified: true },
};

beforeEach(() => {
  verifyIdToken.mockReset();
  verifyIdToken.mockImplementation(async (t: string) => {
    if (tokens[t]) return tokens[t];
    throw new Error("invalid token");
  });
  ingestEvent.mockClear();
  dbCalls.length = 0;
});

const req = (url: string, init: { token?: string; headers?: Record<string, string>; method?: string; body?: unknown } = {}) =>
  new NextRequest(`http://localhost${url}`, {
    method: init.method ?? "GET",
    headers: {
      "user-agent": "Mozilla/5.0 (X11; Linux) Chrome/120",
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

describe("admin guard", () => {
  it("admits only the verified allowlisted email (case-insensitive)", async () => {
    const { guardAdmin } = await import("@/lib/analytics/admin-route");
    const ok = await guardAdmin(req("/x", { token: "admin" }));
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.uid).toBe("uid_admin");
    expect((await guardAdmin(req("/x", { token: "adminUpper" }))).ok).toBe(true);
  });

  it.each([
    ["no token", undefined],
    ["a garbage token", "nope"],
    ["an ordinary signed-in user", "user"],
    ["the admin email but unverified", "adminUnverified"],
    ["a lookalike email", "lookalike"],
    ["a token without email", "noEmail"],
  ])("rejects %s with an opaque 404", async (_label, token) => {
    const { guardAdmin } = await import("@/lib/analytics/admin-route");
    const g = await guardAdmin(req("/x", { token }));
    expect(g.ok).toBe(false);
    if (!g.ok) {
      expect(g.response.status).toBe(404);
      expect(await g.response.json()).toEqual({ error: "not_found" });
    }
  });

  it("ignores client-supplied identity hints", async () => {
    const { guardAdmin } = await import("@/lib/analytics/admin-route");
    const g = await guardAdmin(
      req(`/x?email=${ADMIN}&isAdmin=true&uid=uid_admin`, {
        token: "user",
        headers: { "x-user-email": ADMIN, "x-admin": "1", cookie: "isAdmin=true" },
      })
    );
    expect(g.ok).toBe(false);
  });
});

describe("every admin analytics endpoint is guarded before touching data", () => {
  const routes: Array<[string, string]> = [
    ["report", "/api/admin/analytics/report?preset=last_7_days"],
    ["feed", "/api/admin/analytics/feed?preset=today"],
    ["journey", "/api/admin/analytics/journey?sid=session-aaaa"],
    ["export", "/api/admin/analytics/export?kind=sources&preset=last_7_days"],
  ];

  const loaders: Record<string, () => Promise<{ GET: (r: NextRequest) => Promise<Response> }>> = {
    report: () => import("@/app/api/admin/analytics/report/route"),
    feed: () => import("@/app/api/admin/analytics/feed/route"),
    journey: () => import("@/app/api/admin/analytics/journey/route"),
    export: () => import("@/app/api/admin/analytics/export/route"),
  };

  for (const [name, url] of routes) {
    it(`${name}: 404 for anonymous and non-admin callers, db untouched`, async () => {
      const mod = await loaders[name]();
      for (const token of [undefined, "user", "adminUnverified"]) {
        const res = await mod.GET(req(url, { token }));
        expect(res.status).toBe(404);
      }
      expect(dbCalls).toEqual([]);
    });
  }

  it("the legacy summary endpoint is still guarded", async () => {
    const mod = await import("@/app/api/admin/analytics/route");
    expect((await mod.GET(req("/api/admin/analytics"))).status).toBe(404);
    expect((await mod.GET(req("/api/admin/analytics", { token: "user" }))).status).toBe(404);
  });

  it("an authorized admin with bad parameters gets 400, not data", async () => {
    const report = await import("@/app/api/admin/analytics/report/route");
    expect((await report.GET(req("/api/admin/analytics/report?preset=forever", { token: "admin" }))).status).toBe(400);
    const exp = await import("@/app/api/admin/analytics/export/route");
    expect((await exp.GET(req("/api/admin/analytics/export?kind=users&preset=today", { token: "admin" }))).status).toBe(400);
    const journey = await import("@/app/api/admin/analytics/journey/route");
    expect((await journey.GET(req("/api/admin/analytics/journey?sid=../x", { token: "admin" }))).status).toBe(400);
    const feed = await import("@/app/api/admin/analytics/feed/route");
    expect((await feed.GET(req("/api/admin/analytics/feed?preset=today&cursor=junk", { token: "admin" }))).status).toBe(400);
    expect(dbCalls).toEqual([]);
  });
});

describe("event ingestion trust boundary", () => {
  const base = { eventId: "evt_00000001", vid: "visitor-aaaa", sid: "session-aaaa" };
  const post = async (body: unknown, token?: string) => {
    const { POST } = await import("@/app/api/analytics/event/route");
    return POST(req("/api/analytics/event", { method: "POST", body, token }));
  };

  it("accepts an anonymous plan_click with server-side time and trust", async () => {
    const res = await post({ ...base, name: "plan_click", plan: "pro" });
    expect(res.status).toBe(204);
    expect(ingestEvent).toHaveBeenCalledTimes(1);
    const arg = (ingestEvent.mock.calls[0] as unknown as [unknown, Record<string, unknown>])[1];
    expect(arg).toMatchObject({ name: "plan_click", trust: "client", plan: "pro" });
    expect(arg.uid).toBeUndefined();
    expect(Math.abs((arg.ts as number) - Date.now())).toBeLessThan(5000);
  });

  it.each(["subscription_created", "signup_completed", "checkout_started", "payment_failed", "trial_started", "first_content_created"])(
    "silently refuses the server-only event %s from a browser — even with an admin token",
    async (name) => {
      expect((await post({ ...base, name, plan: "pro" }, "admin")).status).toBe(204);
      expect(ingestEvent).not.toHaveBeenCalled();
    }
  );

  it("refuses an authed-only event without a verified token", async () => {
    await post({ ...base, name: "post_created" });
    await post({ ...base, name: "post_created" }, "garbage");
    expect(ingestEvent).not.toHaveBeenCalled();
  });

  it("takes the uid from the verified token, never from the body", async () => {
    await post({ ...base, name: "post_created" }, "user");
    expect(ingestEvent).toHaveBeenCalledTimes(1);
    const arg = (ingestEvent.mock.calls[0] as unknown as [unknown, Record<string, unknown>])[1];
    expect(arg).toMatchObject({ uid: "uid_user", trust: "client_authed" });

    ingestEvent.mockClear();
    await post({ ...base, eventId: "evt_00000002", name: "post_created", uid: "uid_victim" }, "user");
    expect(ingestEvent).not.toHaveBeenCalled(); // body uid → schema rejects the whole event
  });

  it("rejects malformed payloads and bots", async () => {
    await post({ ...base, name: "plan_click", plan: "gold" });
    await post({ name: "page_view" });
    await post("not json at all");
    const { POST } = await import("@/app/api/analytics/event/route");
    await POST(new NextRequest("http://localhost/api/analytics/event", {
      method: "POST",
      headers: { "user-agent": "Googlebot/2.1", "content-type": "application/json" },
      body: JSON.stringify({ ...base, name: "page_view" }),
    }));
    expect(ingestEvent).not.toHaveBeenCalled();
  });
});
