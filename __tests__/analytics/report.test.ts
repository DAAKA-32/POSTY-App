import { describe, expect, it } from "vitest";
import { buildReport, csvCell, exportCsv } from "@/lib/analytics/report";
import { dayCount, enumerateDays, resolveRange, rangeFromParams } from "@/lib/analytics/range";
import {
  clientEventSchema,
  identifySchema,
  normalizePath,
  trustOf,
  utcDayKey,
} from "@/lib/analytics/events";

const NOW = new Date(Date.UTC(2026, 9, 22, 15, 30)); // 2026-10-22

describe("date ranges (UTC)", () => {
  it("resolves every preset", () => {
    const r = (p: Parameters<typeof resolveRange>[0]) => resolveRange(p, NOW);
    expect(r("today")).toEqual({ start: "2026-10-22", end: "2026-10-22", days: 1 });
    expect(r("yesterday")).toEqual({ start: "2026-10-21", end: "2026-10-21", days: 1 });
    expect(r("last_7_days")).toEqual({ start: "2026-10-16", end: "2026-10-22", days: 7 });
    expect(r("last_30_days")).toMatchObject({ start: "2026-09-23", days: 30 });
    expect(r("last_90_days")).toMatchObject({ start: "2026-07-25", days: 90 });
    expect(r("this_month")).toEqual({ start: "2026-10-01", end: "2026-10-22", days: 22 });
    expect(r("previous_month")).toEqual({ start: "2026-09-01", end: "2026-09-30", days: 30 });
  });

  it("previous_month crosses a year boundary", () => {
    const jan = new Date(Date.UTC(2027, 0, 5));
    expect(resolveRange("previous_month", jan)).toEqual({ start: "2026-12-01", end: "2026-12-31", days: 31 });
  });

  it("validates custom ranges", () => {
    expect(resolveRange("custom", NOW, { start: "2026-10-01", end: "2026-10-05" })?.days).toBe(5);
    expect(resolveRange("custom", NOW, { start: "2026-10-05", end: "2026-10-01" })).toBeNull();
    expect(resolveRange("custom", NOW, { start: "2026-02-30", end: "2026-03-01" })).toBeNull();
    expect(resolveRange("custom", NOW, { start: "garbage", end: "2026-03-01" })).toBeNull();
    expect(resolveRange("custom", NOW, { start: "2024-01-01", end: "2026-01-01" })).toBeNull();
    expect(resolveRange("custom", NOW, {})).toBeNull();
  });

  it("parses query params and rejects unknown presets", () => {
    expect(rangeFromParams(new URLSearchParams("preset=last_7_days"), NOW)?.days).toBe(7);
    expect(rangeFromParams(new URLSearchParams(""), NOW)?.days).toBe(30);
    expect(rangeFromParams(new URLSearchParams("preset=forever"), NOW)).toBeNull();
  });

  it("enumerates inclusive days across a month end", () => {
    expect(enumerateDays("2026-09-29", "2026-10-02")).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
    expect(dayCount("2026-10-01", "2026-10-01")).toBe(1);
    expect(utcDayKey(Date.UTC(2026, 0, 1, 23, 59))).toBe("2026-01-01");
  });
});

describe("event schema", () => {
  const ok = { eventId: "abcd1234", name: "plan_click", vid: "visitor-1234", sid: "session-1234", plan: "pro" };

  it("accepts a well-formed event", () => {
    expect(clientEventSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects unknown keys, bad ids and bad plans", () => {
    expect(clientEventSchema.safeParse({ ...ok, amount: 1900 }).success).toBe(false);
    expect(clientEventSchema.safeParse({ ...ok, vid: "x" }).success).toBe(false);
    expect(clientEventSchema.safeParse({ ...ok, plan: "enterprise" }).success).toBe(false);
    expect(clientEventSchema.safeParse({ ...ok, uid: "someone" }).success).toBe(false);
  });

  it("rejects oversized property bags", () => {
    const props = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k${i}`, i]));
    expect(clientEventSchema.safeParse({ ...ok, props }).success).toBe(false);
    expect(clientEventSchema.safeParse({ ...ok, props: { a: "x".repeat(101) } }).success).toBe(false);
    expect(clientEventSchema.safeParse({ ...ok, props: { a: { nested: 1 } } }).success).toBe(false);
  });

  it("tolerates malformed attribution fields without losing the event", () => {
    const r = clientEventSchema.safeParse({
      ...ok,
      touch: { utm_source: "x".repeat(5000), utm_campaign: 42, gclid: "yes", referrer: "https://ex.com" },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.touch?.utm_source).toBeUndefined();
      expect(r.data.touch?.utm_campaign).toBeUndefined();
      expect(r.data.touch?.gclid).toBeUndefined();
      expect(r.data.touch?.referrer).toBe("https://ex.com");
    }
    expect(clientEventSchema.safeParse({ ...ok, touch: "nonsense" }).success).toBe(true);
  });

  it("identify takes only a visitor id and plan intent — never a uid", () => {
    expect(identifySchema.safeParse({ vid: "visitor-1234" }).success).toBe(true);
    expect(identifySchema.safeParse({ vid: "visitor-1234", uid: "evil" }).success).toBe(false);
  });

  it("classifies who may emit what", () => {
    expect(trustOf("plan_click")).toBe("client");
    expect(trustOf("post_created")).toBe("client_authed");
    expect(trustOf("business_profile_completed")).toBe("client_authed");
    for (const n of ["signup_completed", "checkout_started", "subscription_created", "payment_failed", "trial_started"]) {
      expect(trustOf(n)).toBe("server");
    }
    expect(trustOf("made_up")).toBeNull();
  });

  it("reduces paths to a bounded vocabulary", () => {
    expect(normalizePath("/subscription?plan=pro")).toBe("/subscription");
    expect(normalizePath("/app/c/abc123")).toBe("/app");
    expect(normalizePath("/some-random-slug")).toBe("/other");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath(undefined)).toBe("/");
  });
});

// ───────────────────────── Report maths ─────────────────────────

const range = { start: "2026-10-20", end: "2026-10-22", days: 3 };

const daily = [
  {
    day: "2026-10-20",
    sessions: 100, visitors: 90, newVisitors: 80, returningVisitors: 10, pageViews: 300, engagedSessions: 40,
    events: { signup_completed: 8, subscription_created: 2, checkout_started: 4, pricing_page_view: 30, first_content_created: 5 },
    attributedEvents: { signup_completed: 6 },
    cohort: { visitors: 80, pricing_view: 30, plan_click: 20, signup_started: 12, signup_completed: 8, activated: 5, checkout_started: 4, paid: 2 },
    cohortByPlan: { pro: { plan_click: 12, paid: 1 }, max: { plan_click: 6, paid: 1 }, free: { plan_click: 2 } },
    plans: { pro: { clicks: 14, views: 40 }, max: { clicks: 7, views: 35 }, free: { clicks: 3, views: 38 } },
    revenue: { eur: 6800 },
    countries: { FR: 70, US: 30 },
  },
  { day: "2026-10-21", sessions: 0 },
  { day: "2026-10-22", sessions: 50, visitors: 40, newVisitors: 20, pageViews: 100, events: { signup_completed: 1 }, attributedEvents: {}, cohort: { visitors: 20, signup_completed: 0 } },
];

const dims = [
  { kind: "source", key: "chatgpt/referral", day: "2026-10-20", sessions: 30, visitors: 25, newVisitors: 20, planClicks: { pro: 5 }, ft: { signups: 4, paid: 1, paid_pro: 1, activations: 3, checkouts: 2, revenue: { eur: 1900 } } },
  { kind: "source", key: "chatgpt/referral", day: "2026-10-22", sessions: 10, visitors: 8, newVisitors: 5, ft: { signups: 1 } },
  { kind: "source", key: "google/organic", day: "2026-10-20", sessions: 60, visitors: 55, newVisitors: 50, ft: { signups: 2 } },
  { kind: "source", key: "direct/none", day: "2026-10-20", sessions: 10, visitors: 10, newVisitors: 10 },
  { kind: "campaign", key: "launch|linkedin/social", day: "2026-10-20", sessions: 20, newVisitors: 15, ft: { signups: 3, paid: 1, revenue: { eur: 4900 } } },
  { kind: "landing", key: "/", day: "2026-10-20", sessions: 90 },
  { kind: "referrer", key: "chatgpt.com", day: "2026-10-20", sessions: 30 },
];

describe("buildReport", () => {
  const r = buildReport({ range, daily, dims, accountsCreated: 12 });

  it("sums period totals and keeps entities apart", () => {
    expect(r.kpis.sessions).toBe(150);
    expect(r.kpis.visitorDays).toBe(130);
    expect(r.kpis.newVisitors).toBe(100);
    expect(r.kpis.returningVisitorDays).toBe(10);
    expect(r.kpis.pageViews).toBe(400);
    expect(r.kpis.signupsCompleted).toBe(9);
    expect(r.kpis.accountsCreated).toBe(12);
    expect(r.kpis.paidConversions).toBe(2);
    expect(r.kpis.revenue).toEqual({ eur: 6800 });
    expect(r.kpis.planClicks).toEqual({ free: 3, pro: 14, max: 7 });
  });

  it("derives per-session ratios only when defined", () => {
    expect(r.kpis.pagesPerSession).toBeCloseTo(400 / 150);
    expect(r.kpis.engagementRate.value).toBeCloseTo((40 / 150) * 100);
    const empty = buildReport({ range, daily: [], dims: [] });
    expect(empty.kpis.pagesPerSession).toBeNull();
    expect(empty.kpis.engagementRate.value).toBeNull();
    expect(empty.hasAnyData).toBe(false);
  });

  it("computes cohort conversion rates on one entity and one window", () => {
    expect(r.rates.visitorToSignup).toMatchObject({ num: 8, den: 100 });
    expect(r.rates.visitorToSignup.value).toBeCloseTo(8);
    expect(r.rates.signupToActivation.value).toBeCloseTo((5 / 8) * 100);
    expect(r.rates.signupToPaid.value).toBeCloseTo(25);
    expect(r.rates.visitorToPaid.value).toBeCloseTo(2);
    expect(r.rates.checkoutCompletion.value).toBeCloseTo(50);
  });

  it("reports an unavailable rate as null, never 0", () => {
    const none = buildReport({ range, daily: [{ day: "2026-10-20", sessions: 5 }], dims: [] });
    expect(none.rates.visitorToSignup.value).toBeNull();
    expect(none.rates.signupToPaid.value).toBeNull();
  });

  it("builds the funnel in order, with plan splits", () => {
    expect(r.funnel.map((f) => f.stage)).toEqual([
      "visitors", "pricing_view", "plan_click", "signup_started", "signup_completed", "activated", "checkout_started", "paid",
    ]);
    const click = r.funnel.find((f) => f.stage === "plan_click")!;
    expect(click.count).toBe(20);
    expect(click.byPlan).toEqual({ free: 2, pro: 12, max: 6 });
    expect(click.fromPrevious.value).toBeCloseTo((20 / 30) * 100);
    expect(r.funnel.find((f) => f.stage === "paid")!.byPlan).toEqual({ free: 0, pro: 1, max: 1 });
  });

  it("separates plan interest from paid", () => {
    const pro = r.plans.find((p) => p.plan === "pro")!;
    expect(pro).toMatchObject({ clicks: 14, views: 40, paid: 1 });
    expect(pro.clickToPaid.value).toBeCloseTo((1 / 12) * 100);
    expect(r.plans.find((p) => p.plan === "free")!.paid).toBe(0);
  });

  it("merges per-day dimension docs into source rows", () => {
    const chat = r.sources.find((s) => s.key === "chatgpt/referral")!;
    expect(chat).toMatchObject({ sessions: 40, newVisitors: 25, signups: 5, paid: 1, activations: 3 });
    expect(chat.visitorToSignup.value).toBeCloseTo(20);
    expect(chat.revenue).toEqual({ eur: 1900 });
    expect(chat.planClicks.pro).toBe(5);
    expect(r.sources.map((s) => s.key)).toEqual(["google/organic", "chatgpt/referral", "direct/none"]); // by sessions
    expect(r.sources.find((s) => s.key === "direct/none")!.visitorToSignup.value).toBe(0);
  });

  it("builds campaign rows with their source", () => {
    expect(r.campaigns[0]).toMatchObject({ campaign: "launch", key: "linkedin/social", sessions: 20, paid: 1 });
  });

  it("reports attribution coverage honestly", () => {
    expect(r.attribution).toMatchObject({ signupsAttributed: 6, signupsTotal: 9 });
    expect(r.attribution.coverage.value).toBeCloseTo((6 / 9) * 100);
  });

  it("shows where detailed tracking begins and lists unmeasured metrics", () => {
    expect(r.detailedSince).toBe("2026-10-20");
    expect(r.unavailable.join(" ")).toMatch(/session duration/i);
    expect(r.unavailable.join(" ")).toMatch(/advertising spend/i);
  });

  it("fills every day of the range in the series", () => {
    expect(r.series.map((d) => d.day)).toEqual(["2026-10-20", "2026-10-21", "2026-10-22"]);
    expect(r.series[1].sessions).toBe(0);
  });

  it("legacy-only days (pre-attribution) count as data but not as detailed", () => {
    const legacy = buildReport({ range, daily: [{ day: "2026-10-20", pageviews: 40, uniqueVisitors: 10 }], dims: [] });
    expect(legacy.hasAnyData).toBe(true);
    expect(legacy.detailedSince).toBeNull();
  });
});

describe("CSV export", () => {
  it("neutralises spreadsheet formula injection and quotes specials", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-cmd")).toBe("'-cmd");
    expect(csvCell("@sum")).toBe("'@sum");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(12)).toBe("12");
  });

  it("exports aggregate rows only — never visitor or account identifiers", () => {
    const r = buildReport({ range, daily, dims });
    for (const kind of ["sources", "campaigns", "funnel", "plans", "daily"] as const) {
      const csv = exportCsv(kind, r);
      expect(csv.split("\n")[0].length).toBeGreaterThan(5);
      expect(csv).not.toMatch(/visitor-|session-|user\d|@/);
    }
    expect(exportCsv("sources", r)).toContain("chatgpt/referral");
  });
});
