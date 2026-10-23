import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Regression tests for the "Quota atteint on first chat open" bug.
 *
 * Root cause: a brand-new Free user is written with `subscription.plan: null`
 * and `createdAt: serverTimestamp()`. The quota check's "recently created" net
 * keyed off `createdAt`, which reads back null on the just-written doc
 * (serverTimestamp not yet resolved), so the check fell through to
 * `canSendMessage/canGenerate: false` — a false "quota reached" that only a
 * hard refresh cleared.
 *
 * Fix: a user inside an UNEXPIRED Free trial is treated as Free, anchored on
 * `subscription.freeTrialStartedAt/EndsAt` (resolved Timestamps written at
 * signup). The monthly quota (3/month) and trial expiry are still enforced.
 *
 * These tests pin the client (`getUserQuota`) and server (`checkUserQuotaAdmin`)
 * to the SAME decision on identical inputs.
 */

const DAY = 24 * 60 * 60 * 1000;
const ts = (d: Date) => ({ toDate: () => d });
const now = () => new Date();
const inDays = (n: number) => new Date(Date.now() + n * DAY);
const monthStartUTC = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1));
};

// ---- Client getUserQuota: mock firebase/firestore getDoc + db ----
const clientState = vi.hoisted(() => ({
  snap: null as null | { exists: () => boolean; data: () => unknown },
}));
vi.mock("@/lib/db/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", async (orig) => ({
  ...(await orig<typeof import("firebase/firestore")>()),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => clientState.snap),
}));

// ---- Server checkUserQuotaAdmin: mock adminDb ----
const adminState = vi.hoisted(() => ({
  snap: null as null | { exists: boolean; data: () => unknown },
}));
vi.mock("@/lib/db/firebase-admin", () => ({
  adminDb: {
    collection: () => ({ doc: () => ({ get: async () => adminState.snap }) }),
  },
}));

import { getUserQuota } from "@/lib/db/firestore";
import { checkUserQuotaAdmin } from "@/lib/db/firestore-admin";

function setClientDoc(data: Record<string, unknown> | null) {
  clientState.snap = data === null
    ? { exists: () => false, data: () => undefined }
    : { exists: () => true, data: () => data };
}
function setAdminDoc(data: Record<string, unknown> | null) {
  adminState.snap = data === null
    ? { exists: false, data: () => undefined }
    : { exists: true, data: () => data };
}

/** A freshly-signed-up Free user: plan not written yet, createdAt a pending
 *  serverTimestamp (reads back undefined), but trial timestamps are resolved. */
const freshSignupDoc = {
  subscription: {
    plan: null,
    status: "inactive",
    freeTrialStartedAt: ts(now()),
    freeTrialEndsAt: ts(inDays(30)),
  },
  createdAt: undefined, // serverTimestamp not yet resolved on the local read
  usage: { conversationsThisMonth: 0, monthStartDate: ts(monthStartUTC()) },
};

describe("quota resolution for plan-less in-trial users (bug fix)", () => {
  beforeEach(() => {
    clientState.snap = null;
    adminState.snap = null;
  });

  it("client: fresh signup (plan null, createdAt pending) can send", async () => {
    setClientDoc(freshSignupDoc);
    const q = await getUserQuota("u1", "u1@test.dev");
    expect(q.canSendMessage).toBe(true);
    expect(q.plan).toBe("free");
  });

  it("server: fresh signup (plan null, createdAt pending) can generate", async () => {
    setAdminDoc(freshSignupDoc);
    const q = await checkUserQuotaAdmin("u1", "u1@test.dev");
    expect(q.canGenerate).toBe(true);
    expect(q.plan).toBe("free");
  });

  it("client+server agree: in-trial but monthly quota used (3/3) is blocked", async () => {
    const used = {
      ...freshSignupDoc,
      usage: { conversationsThisMonth: 3, monthStartDate: ts(monthStartUTC()) },
    };
    setClientDoc(used);
    setAdminDoc(used);
    const c = await getUserQuota("u2", "u2@test.dev");
    const s = await checkUserQuotaAdmin("u2", "u2@test.dev");
    expect(c.canSendMessage).toBe(false);
    expect(s.canGenerate).toBe(false);
    expect(c.plan).toBe("free");
    expect(s.plan).toBe("free");
  });

  it("client+server agree: plan null with an EXPIRED trial is blocked (paywall)", async () => {
    const expired = {
      subscription: { plan: null, freeTrialStartedAt: ts(inDays(-40)), freeTrialEndsAt: ts(inDays(-10)) },
      createdAt: ts(inDays(-40)),
      usage: { conversationsThisMonth: 0, monthStartDate: ts(monthStartUTC()) },
    };
    setClientDoc(expired);
    setAdminDoc(expired);
    const c = await getUserQuota("u3", "u3@test.dev");
    const s = await checkUserQuotaAdmin("u3", "u3@test.dev");
    expect(c.canSendMessage).toBe(false);
    expect(s.canGenerate).toBe(false);
    expect(c.plan).toBe(null);
    expect(s.plan).toBe(null);
  });

  it("client: missing doc still fails open to Free (unchanged)", async () => {
    setClientDoc(null);
    const q = await getUserQuota("u4", "u4@test.dev");
    expect(q.canSendMessage).toBe(true);
    expect(q.plan).toBe("free");
  });

  it("client+server agree: explicit free plan, 0/3 allowed, 3/3 blocked", async () => {
    const free0 = {
      subscription: { plan: "free", status: "active", freeTrialStartedAt: ts(now()), freeTrialEndsAt: ts(inDays(30)) },
      createdAt: ts(now()),
      usage: { conversationsThisMonth: 0, monthStartDate: ts(monthStartUTC()) },
    };
    setClientDoc(free0);
    setAdminDoc(free0);
    expect((await getUserQuota("u5")).canSendMessage).toBe(true);
    expect((await checkUserQuotaAdmin("u5")).canGenerate).toBe(true);

    const free3 = { ...free0, usage: { conversationsThisMonth: 3, monthStartDate: ts(monthStartUTC()) } };
    setClientDoc(free3);
    setAdminDoc(free3);
    expect((await getUserQuota("u6")).canSendMessage).toBe(false);
    expect((await checkUserQuotaAdmin("u6")).canGenerate).toBe(false);
  });
});
