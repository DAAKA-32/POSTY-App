import { describe, expect, it } from "vitest";
import {
  MAX_EVENTS_PER_SESSION,
  planIngest,
  type Counters,
  type DimOp,
  type PlanEvent,
  type PlanResult,
  type PlanState,
  type SessionDoc,
  type UserDoc,
  type VisitorDoc,
} from "@/lib/analytics/plan";
import type { RawTouch } from "@/lib/analytics/events";

const D1 = Date.UTC(2026, 9, 20, 10, 0, 0); // 2026-10-20
const D2 = Date.UTC(2026, 9, 22, 9, 0, 0); // 2026-10-22
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** In-memory stand-in for Firestore around the pure planner. */
class Sim {
  events = new Set<string>();
  visitors = new Map<string, VisitorDoc>();
  sessions = new Map<string, SessionDoc>();
  users = new Map<string, UserDoc>();
  daily: Record<string, Counters> = {};
  dims: DimOp[] = [];
  derived: string[] = [];
  last!: PlanResult;

  send(e: Partial<PlanEvent> & Pick<PlanEvent, "eventId" | "name" | "ts">): PlanResult {
    const event: PlanEvent = { trust: "client", ...e } as PlanEvent;
    const state: PlanState = {
      eventExists: this.events.has(event.eventId),
      visitor: event.vid ? this.visitors.get(event.vid) : undefined,
      session: event.sid && event.trust !== "server" ? this.sessions.get(event.sid) : undefined,
      user: event.uid ? this.users.get(event.uid) : undefined,
    };
    const r = planIngest(event, state);
    this.last = r;
    if (r.status !== "ok") return r;
    this.events.add(event.eventId);
    r.derived.forEach((d) => this.derived.push(d.name));
    if (r.visitor && event.vid) this.visitors.set(event.vid, r.visitor);
    if (r.session && event.sid) this.sessions.set(event.sid, r.session);
    if (r.user && event.uid) this.users.set(event.uid, r.user);
    for (const [d, c] of Object.entries(r.daily)) {
      const t = (this.daily[d] ??= {});
      for (const [k, v] of Object.entries(c)) t[k] = (t[k] ?? 0) + v;
    }
    this.dims.push(...r.dims);
    return r;
  }

  c(d: string, path: string): number {
    return this.daily[d]?.[path] ?? 0;
  }
  dim(d: string, kind: string, key: string, path: string): number {
    return this.dims
      .filter((o) => o.day === d && o.kind === kind && o.key === key)
      .reduce((a, o) => a + (o.counters[path] ?? 0), 0);
  }
}

const google: RawTouch = { referrer: "https://www.google.com" };
let n = 0;
const id = () => `evt_${String(++n).padStart(6, "0")}`;
const view = (s: Sim, vid: string, sid: string, ts: number, touch?: RawTouch, path = "/") =>
  s.send({ eventId: id(), name: "page_view", ts, vid, sid, path, touch });

describe("visitor & session attribution", () => {
  it("creates visitor, session and counters for a first visit", () => {
    const s = new Sim();
    view(s, "visitor-aaaa", "session-aaaa", D1, google);
    const v = s.visitors.get("visitor-aaaa")!;
    expect(v.firstTouch.key).toBe("google/organic");
    expect(v.firstSeenDay).toBe("2026-10-20");
    expect(s.c("2026-10-20", "sessions")).toBe(1);
    expect(s.c("2026-10-20", "visitors")).toBe(1);
    expect(s.c("2026-10-20", "newVisitors")).toBe(1);
    expect(s.c("2026-10-20", "cohort.visitors")).toBe(1);
    expect(s.c("2026-10-20", "events.page_view")).toBe(1);
    expect(s.c("2026-10-20", "pageviews")).toBe(1); // legacy field kept
    expect(s.dim("2026-10-20", "source", "google/organic", "sessions")).toBe(1);
  });

  it("never overwrites first touch; later sessions get their own source", () => {
    const s = new Sim();
    view(s, "visitor-aaaa", "session-aaaa", D1, google);
    view(s, "visitor-aaaa", "session-bbbb", D2, { referrer: "https://chatgpt.com" });
    const v = s.visitors.get("visitor-aaaa")!;
    expect(v.firstTouch.key).toBe("google/organic");
    expect(v.lastNonDirect?.key).toBe("chatgpt/referral");
    expect(s.sessions.get("session-bbbb")!.touch.key).toBe("chatgpt/referral");
    expect(s.sessions.get("session-aaaa")!.touch.key).toBe("google/organic");
  });

  it("a later direct session does not replace the latest non-direct touch", () => {
    const s = new Sim();
    view(s, "visitor-aaaa", "session-aaaa", D1, { referrer: "https://www.tiktok.com" });
    view(s, "visitor-aaaa", "session-bbbb", D2, {});
    expect(s.visitors.get("visitor-aaaa")!.lastNonDirect?.key).toBe("tiktok/social");
  });

  it("does not re-attribute events inside an existing session", () => {
    const s = new Sim();
    view(s, "visitor-aaaa", "session-aaaa", D1, google);
    view(s, "visitor-aaaa", "session-aaaa", D1 + 5000, { referrer: "https://chatgpt.com" });
    expect(s.sessions.get("session-aaaa")!.touch.key).toBe("google/organic");
    expect(s.c("2026-10-20", "sessions")).toBe(1);
  });

  it("counts a returning visitor on a later day, not as new", () => {
    const s = new Sim();
    view(s, "visitor-aaaa", "session-aaaa", D1, google);
    view(s, "visitor-aaaa", "session-bbbb", D2, {});
    expect(s.c("2026-10-22", "visitors")).toBe(1);
    expect(s.c("2026-10-22", "returningVisitors")).toBe(1);
    expect(s.c("2026-10-22", "newVisitors")).toBe(0);
  });

  it("counts a visitor once per day however many events", () => {
    const s = new Sim();
    view(s, "visitor-aaaa", "session-aaaa", D1, google);
    view(s, "visitor-aaaa", "session-aaaa", D1 + 1000, google, "/subscription");
    expect(s.c("2026-10-20", "visitors")).toBe(1);
    expect(s.c("2026-10-20", "events.page_view")).toBe(2);
  });

  it("marks a session engaged once, on the 2nd page view", () => {
    const s = new Sim();
    view(s, "visitor-aaaa", "session-aaaa", D1, google);
    expect(s.c("2026-10-20", "engagedSessions")).toBe(0);
    view(s, "visitor-aaaa", "session-aaaa", D1 + 1000, undefined, "/about");
    view(s, "visitor-aaaa", "session-aaaa", D1 + 2000, undefined, "/business");
    expect(s.c("2026-10-20", "engagedSessions")).toBe(1);
  });
});

describe("idempotency & abuse guards", () => {
  it("a duplicate eventId changes nothing", () => {
    const s = new Sim();
    const e = { eventId: "dup_000001", name: "page_view" as const, ts: D1, vid: "visitor-aaaa", sid: "session-aaaa", touch: google };
    expect(s.send(e).status).toBe("ok");
    const before = JSON.stringify(s.daily);
    expect(s.send(e).status).toBe("duplicate");
    expect(JSON.stringify(s.daily)).toBe(before);
  });

  it("refuses server-only events from a client", () => {
    const s = new Sim();
    for (const name of ["subscription_created", "signup_completed", "checkout_started", "payment_failed"] as const) {
      const r = s.send({ eventId: id(), name, ts: D1, vid: "visitor-aaaa", sid: "session-aaaa", trust: "client" });
      expect(r.status).toBe("dropped");
      expect(r.reason).toBe("insufficient_trust");
    }
    expect(Object.keys(s.daily)).toHaveLength(0);
  });

  it("refuses authed-only events from an anonymous client", () => {
    const s = new Sim();
    const r = s.send({ eventId: id(), name: "post_created", ts: D1, vid: "visitor-aaaa", sid: "session-aaaa", trust: "client" });
    expect(r.status).toBe("dropped");
  });

  it("caps events per session", () => {
    const s = new Sim();
    view(s, "visitor-aaaa", "session-aaaa", D1, google);
    s.sessions.get("session-aaaa")!.eventCount = MAX_EVENTS_PER_SESSION;
    expect(view(s, "visitor-aaaa", "session-aaaa", D1 + 10).status).toBe("dropped");
  });

  it("drops unknown event names", () => {
    const s = new Sim();
    const r = planIngest({ eventId: "x_00000001", name: "nope" as never, ts: D1, trust: "server" }, { eventExists: false });
    expect(r.status).toBe("dropped");
    void s;
  });
});

describe("plan interest is not payment", () => {
  it("plan_click only moves plan/intention counters", () => {
    const s = new Sim();
    view(s, "visitor-aaaa", "session-aaaa", D1, google);
    s.send({ eventId: id(), name: "plan_click", ts: D1 + 1000, vid: "visitor-aaaa", sid: "session-aaaa", plan: "pro", path: "/subscription" });
    expect(s.c("2026-10-20", "plans.pro.clicks")).toBe(1);
    expect(s.c("2026-10-20", "cohort.plan_click")).toBe(1);
    expect(s.c("2026-10-20", "cohortByPlan.pro.plan_click")).toBe(1);
    expect(s.dim("2026-10-20", "source", "google/organic", "planClicks.pro")).toBe(1);
    expect(s.c("2026-10-20", "events.checkout_started")).toBe(0);
    expect(s.c("2026-10-20", "events.subscription_created")).toBe(0);
    expect(s.c("2026-10-20", "cohort.paid")).toBe(0);
    expect(Object.keys(s.daily["2026-10-20"]).some((k) => k.startsWith("revenue"))).toBe(false);
    expect(s.visitors.get("visitor-aaaa")!.planIntent).toBe("pro");
  });

  it("repeated clicks count as events but the cohort stage once per plan", () => {
    const s = new Sim();
    view(s, "visitor-aaaa", "session-aaaa", D1, google);
    for (const [plan, t] of [["pro", 1], ["pro", 2], ["max", 3]] as const) {
      s.send({ eventId: id(), name: "plan_click", ts: D1 + t * 1000, vid: "visitor-aaaa", sid: "session-aaaa", plan });
    }
    expect(s.c("2026-10-20", "events.plan_click")).toBe(3);
    expect(s.c("2026-10-20", "cohort.plan_click")).toBe(1);
    expect(s.c("2026-10-20", "cohortByPlan.pro.plan_click")).toBe(1);
    expect(s.c("2026-10-20", "cohortByPlan.max.plan_click")).toBe(1);
    expect(s.c("2026-10-20", "plans.pro.clicks")).toBe(2);
  });

  it("free, pro and max are tracked separately", () => {
    const s = new Sim();
    view(s, "visitor-aaaa", "session-aaaa", D1, google);
    for (const plan of ["free", "pro", "max"] as const) {
      s.send({ eventId: id(), name: "plan_click", ts: D1 + 1000, vid: "visitor-aaaa", sid: "session-aaaa", plan });
    }
    expect(["free", "pro", "max"].map((p) => s.c("2026-10-20", `plans.${p}.clicks`))).toEqual([1, 1, 1]);
  });
});

describe("signup attribution", () => {
  function visitorWhoSignsUp(s: Sim, touch: RawTouch = { referrer: "https://chatgpt.com" }) {
    view(s, "visitor-aaaa", "session-aaaa", D1, touch);
    s.send({ eventId: id(), name: "plan_click", ts: D1 + 1000, vid: "visitor-aaaa", sid: "session-aaaa", plan: "max" });
    return s.send({ eventId: "signup_user0001", name: "signup_completed", ts: D2, uid: "user0001", vid: "visitor-aaaa", trust: "server" });
  }

  it("links a signup to the visitor's FIRST touch and arrival day", () => {
    const s = new Sim();
    visitorWhoSignsUp(s);
    const u = s.users.get("user0001")!;
    expect(u.cohortDay).toBe("2026-10-20");
    expect(u.firstTouch?.key).toBe("chatgpt/referral");
    expect(u.planIntent).toBe("max");
    // cohort counters land on the ARRIVAL day...
    expect(s.c("2026-10-20", "cohort.signup_completed")).toBe(1);
    expect(s.c("2026-10-20", "cohortByPlan.max.signup_completed")).toBe(1);
    expect(s.dim("2026-10-20", "source", "chatgpt/referral", "ft.signups")).toBe(1);
    // ...while the raw event is counted on the event day
    expect(s.c("2026-10-22", "events.signup_completed")).toBe(1);
    expect(s.c("2026-10-22", "attributedEvents.signup_completed")).toBe(1);
  });

  it("server events never open or alter a browser session", () => {
    const s = new Sim();
    visitorWhoSignsUp(s);
    expect(s.sessions.size).toBe(1);
    expect(s.sessions.get("session-aaaa")!.eventCount).toBe(2);
  });

  it("an unattributed signup stays unattributed (nothing fabricated)", () => {
    const s = new Sim();
    s.send({ eventId: "signup_user0002", name: "signup_completed", ts: D2, uid: "user0002", trust: "server" });
    const u = s.users.get("user0002")!;
    expect(u.cohortDay).toBeUndefined();
    expect(u.firstTouch).toBeUndefined();
    expect(s.c("2026-10-22", "events.signup_completed")).toBe(1);
    expect(s.c("2026-10-22", "attributedEvents.signup_completed")).toBe(0);
    expect(Object.keys(s.daily).some((d) => Object.keys(s.daily[d]).some((k) => k.startsWith("cohort.")))).toBe(false);
    expect(s.dims).toHaveLength(0);
  });

  it("a second signup_completed for the same uid is a duplicate", () => {
    const s = new Sim();
    visitorWhoSignsUp(s);
    const r = s.send({ eventId: "signup_user0001", name: "signup_completed", ts: D2 + 1, uid: "user0001", trust: "server" });
    expect(r.status).toBe("duplicate");
  });
});

describe("billing events", () => {
  function paidUser(s: Sim) {
    view(s, "visitor-aaaa", "session-aaaa", D1, { referrer: "https://www.linkedin.com", utm_campaign: "oct" });
    s.send({ eventId: "signup_user0001", name: "signup_completed", ts: D1 + 1000, uid: "user0001", vid: "visitor-aaaa", trust: "server" });
  }

  it("checkout_started marks the stage once per user and is not a payment", () => {
    const s = new Sim();
    paidUser(s);
    s.send({ eventId: "checkout_cs_1", name: "checkout_started", ts: D2, uid: "user0001", plan: "pro", trust: "server" });
    s.send({ eventId: "checkout_cs_2", name: "checkout_started", ts: D2 + 1, uid: "user0001", plan: "pro", trust: "server" });
    expect(s.c("2026-10-22", "events.checkout_started")).toBe(2);
    expect(s.c("2026-10-20", "cohort.checkout_started")).toBe(1);
    expect(s.c("2026-10-20", "cohort.paid")).toBe(0);
    expect(s.c("2026-10-22", "revenue.eur")).toBe(0);
  });

  it("a verified payment counts the conversion and the revenue, on first touch", () => {
    const s = new Sim();
    paidUser(s);
    s.send({ eventId: "invoice_in_1", name: "subscription_created", ts: D2, uid: "user0001", plan: "pro", amount: 1900, currency: "EUR", trust: "server" });
    expect(s.c("2026-10-22", "events.subscription_created")).toBe(1);
    expect(s.c("2026-10-22", "revenue.eur")).toBe(1900);
    expect(s.c("2026-10-22", "revenueByPlan.pro.eur")).toBe(1900);
    expect(s.c("2026-10-20", "cohort.paid")).toBe(1);
    expect(s.c("2026-10-20", "cohortByPlan.pro.paid")).toBe(1);
    expect(s.dim("2026-10-20", "source", "linkedin/social", "ft.paid")).toBe(1);
    expect(s.dim("2026-10-20", "source", "linkedin/social", "ft.paid_pro")).toBe(1);
    expect(s.dim("2026-10-20", "source", "linkedin/social", "ft.revenue.eur")).toBe(1900);
    expect(s.dim("2026-10-20", "campaign", "oct|linkedin/social", "ft.revenue.eur")).toBe(1900);
  });

  it("a replayed webhook (same invoice id) does not double-count", () => {
    const s = new Sim();
    paidUser(s);
    const e = { eventId: "invoice_in_1", name: "subscription_created" as const, ts: D2, uid: "user0001", plan: "pro" as const, amount: 1900, currency: "eur", trust: "server" as const };
    s.send(e);
    s.send(e);
    s.send(e);
    expect(s.c("2026-10-22", "revenue.eur")).toBe(1900);
    expect(s.c("2026-10-22", "events.subscription_created")).toBe(1);
    expect(s.c("2026-10-20", "cohort.paid")).toBe(1);
  });

  it("renewals add revenue but not a second conversion", () => {
    const s = new Sim();
    paidUser(s);
    s.send({ eventId: "invoice_in_1", name: "subscription_created", ts: D2, uid: "user0001", plan: "pro", amount: 1900, currency: "eur", trust: "server" });
    s.send({ eventId: "invoice_in_2", name: "subscription_renewed", ts: D2 + 86_400_000 * 30, uid: "user0001", plan: "pro", amount: 1900, currency: "eur", trust: "server" });
    expect(s.c(day(D2 + 86_400_000 * 30), "events.subscription_renewed")).toBe(1);
    expect(s.c("2026-10-20", "cohort.paid")).toBe(1);
    expect(s.dim("2026-10-20", "source", "linkedin/social", "ft.revenue.eur")).toBe(3800);
  });

  it("the first real payment is the conversion even when labelled a renewal (post-trial)", () => {
    const s = new Sim();
    paidUser(s);
    const r = s.send({ eventId: "invoice_in_9", name: "subscription_renewed", ts: D2, uid: "user0001", plan: "max", amount: 4900, currency: "eur", trust: "server" });
    expect(r.event!.name).toBe("subscription_created");
    expect(s.c("2026-10-22", "events.subscription_created")).toBe(1);
    expect(s.c("2026-10-22", "events.subscription_renewed")).toBe(0);
    expect(s.c("2026-10-20", "cohort.paid")).toBe(1);
  });

  it("revenue of an unattributed customer is kept by day, not by source", () => {
    const s = new Sim();
    s.send({ eventId: "signup_user0003", name: "signup_completed", ts: D1, uid: "user0003", trust: "server" });
    s.send({ eventId: "invoice_in_3", name: "subscription_created", ts: D2, uid: "user0003", plan: "pro", amount: 1900, currency: "eur", trust: "server" });
    expect(s.c("2026-10-22", "revenue.eur")).toBe(1900);
    expect(s.dims).toHaveLength(0);
  });

  it("payment_failed is recorded as a failed event and moves no revenue", () => {
    const s = new Sim();
    paidUser(s);
    const r = s.send({ eventId: "failed_in_5", name: "payment_failed", ts: D2, uid: "user0001", trust: "server" });
    expect(r.event!.status).toBe("failed");
    expect(s.c("2026-10-22", "events.payment_failed")).toBe(1);
    expect(s.c("2026-10-22", "revenue.eur")).toBe(0);
  });

  it("zero-amount invoices produce no revenue", () => {
    const s = new Sim();
    paidUser(s);
    s.send({ eventId: "invoice_in_0", name: "subscription_created", ts: D2, uid: "user0001", plan: "pro", amount: 0, currency: "eur", trust: "server" });
    expect(s.c("2026-10-22", "revenue.eur")).toBe(0);
  });
});

describe("activation", () => {
  it("the first post_created activates the user once and derives first_content_created", () => {
    const s = new Sim();
    view(s, "visitor-aaaa", "session-aaaa", D1, google);
    s.send({ eventId: "signup_user0001", name: "signup_completed", ts: D1 + 1000, uid: "user0001", vid: "visitor-aaaa", trust: "server" });
    const e = (i: number) => ({ eventId: id(), name: "post_created" as const, ts: D2 + i, vid: "visitor-aaaa", sid: "session-bbbb", uid: "user0001", trust: "client_authed" as const });
    s.send(e(0));
    s.send(e(1));
    expect(s.derived).toEqual(["first_content_created"]);
    expect(s.c("2026-10-20", "cohort.activated")).toBe(1);
    expect(s.c("2026-10-22", "events.first_content_created")).toBe(1);
    expect(s.c("2026-10-22", "events.post_created")).toBe(2);
    expect(s.dim("2026-10-20", "source", "google/organic", "ft.activations")).toBe(1);
  });

  it("failed publishes are stored as failed", () => {
    const s = new Sim();
    const r = s.send({ eventId: id(), name: "post_publish_failed", ts: D1, vid: "visitor-aaaa", sid: "session-aaaa", uid: "user0001", trust: "client_authed" });
    expect(r.event!.status).toBe("failed");
  });
});

describe("event documents carry no sensitive payload", () => {
  it("stores only whitelisted fields", () => {
    const s = new Sim();
    const r = s.send({ eventId: id(), name: "cta_click", ts: D1, vid: "visitor-aaaa", sid: "session-aaaa", path: "/", props: { surface: "hero" }, touch: google });
    expect(Object.keys(r.event!).sort()).toEqual(
      ["day", "expireAt", "id", "key", "medium", "name", "path", "props", "registered", "sid", "source", "status", "trust", "ts", "vid"].sort()
    );
    expect(r.event!.registered).toBe(false);
  });
});
