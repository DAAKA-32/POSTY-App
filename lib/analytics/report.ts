/**
 * Report builder — turns the stored daily + dimension aggregates into the
 * numbers the dashboard shows. Pure (no Firestore) so every formula is
 * unit-tested.
 *
 * Definitions (also shown in the UI tooltips / docs):
 *  - Sessions            new sessions started in the period (30-min idle rule)
 *  - Visitor-days        Σ over days of distinct visitors that day. A person
 *                        seen on 3 different days counts 3. We deliberately
 *                        do NOT call this "unique visitors" over a multi-day
 *                        range, because summing daily uniques over-counts.
 *  - New visitors        visitors whose very first visit falls in the period
 *                        (exact, cumulative-unique by construction)
 *  - Cohort funnel       of the visitors who FIRST ARRIVED in the period, how
 *                        many have reached each stage so far (stages are
 *                        written to the arrival day). Rates use these cohort
 *                        counts only — one entity (people), one window.
 *  - Revenue             verified Stripe invoice amounts (amount_paid), gross
 *                        of refunds, by event day; by source it is the revenue
 *                        of the arrival cohort, attributed to FIRST touch.
 */

import { labelForKey } from "./attribution";
import { enumerateDays, type DayRange } from "./range";
import { PLAN_IDS, type PlanId } from "./events";
import { FUNNEL_STAGES, type FunnelStage } from "./plan";

type Doc = Record<string, unknown>;

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function obj(v: unknown): Doc {
  return v && typeof v === "object" ? (v as Doc) : {};
}
function get(doc: Doc, ...path: string[]): number {
  let cur: unknown = doc;
  for (const p of path) cur = obj(cur)[p];
  return num(cur);
}
function addTo(target: Record<string, number>, src: unknown) {
  for (const [k, v] of Object.entries(obj(src))) target[k] = (target[k] ?? 0) + num(v);
}

export interface Rate {
  /** Percentage 0–100, or null when the denominator is 0 (unavailable). */
  value: number | null;
  num: number;
  den: number;
}
function rate(n: number, d: number): Rate {
  return { value: d > 0 ? (n / d) * 100 : null, num: n, den: d };
}

export interface SourceRow {
  key: string;
  label: string;
  source: string;
  medium: string;
  sessions: number;
  visitorDays: number;
  newVisitors: number;
  pageViews: number;
  engagedSessions: number;
  planClicks: Record<PlanId, number>;
  signups: number;
  activations: number;
  checkouts: number;
  paid: number;
  paidByPlan: Record<"pro" | "max", number>;
  revenue: Record<string, number>;
  visitorToSignup: Rate;
  signupToPaid: Rate;
  visitorToPaid: Rate;
}

export interface CampaignRow extends SourceRow {
  campaign: string;
}

export interface SimpleRow {
  key: string;
  sessions: number;
}

export interface DayPoint {
  day: string;
  sessions: number;
  visitorDays: number;
  newVisitors: number;
  pageViews: number;
  signups: number;
  paid: number;
  planClicks: Record<PlanId, number>;
  revenue: Record<string, number>;
}

export interface Report {
  range: DayRange;
  /** First day with detailed (session-level) tracking inside the range. */
  detailedSince: string | null;
  hasAnyData: boolean;
  updatedAtMs: number | null;
  kpis: {
    sessions: number;
    visitorDays: number;
    newVisitors: number;
    returningVisitorDays: number;
    pageViews: number;
    engagedSessions: number;
    engagementRate: Rate;
    pagesPerSession: number | null;
    pricingPageViews: number;
    ctaClicks: number;
    signupStarts: number;
    signupsCompleted: number;
    accountsCreated: number | null;
    planClicks: Record<PlanId, number>;
    activations: number;
    checkoutStarts: number;
    trialStarts: number;
    paidConversions: number;
    renewals: number;
    paymentFailures: number;
    cancellations: number;
    revenue: Record<string, number>;
  };
  rates: {
    visitorToSignup: Rate;
    visitorToPaid: Rate;
    signupToActivation: Rate;
    signupToPaid: Rate;
    pricingToCheckout: Rate;
    checkoutCompletion: Rate;
    planClickToSignup: Rate;
  };
  attribution: {
    signupsAttributed: number;
    signupsTotal: number;
    coverage: Rate;
  };
  funnel: Array<{
    stage: FunnelStage;
    count: number;
    byPlan: Record<PlanId, number>;
    fromPrevious: Rate;
    fromTop: Rate;
  }>;
  series: DayPoint[];
  plans: Array<{
    plan: PlanId;
    views: number;
    clicks: number;
    signups: number;
    checkoutStarts: number;
    paid: number;
    clickToPaid: Rate;
  }>;
  sources: SourceRow[];
  campaigns: CampaignRow[];
  landing: SimpleRow[];
  referrers: SimpleRow[];
  countries: SimpleRow[];
  /** Metrics we do not measure — shown as "unavailable", never as 0. */
  unavailable: string[];
}

const zeroPlans = (): Record<PlanId, number> => ({ free: 0, pro: 0, max: 0 });

function sourceRowOf(key: string, d: Doc, extra: Doc = {}): SourceRow {
  const [source, medium] = key.split("/");
  const planClicks = zeroPlans();
  for (const p of PLAN_IDS) planClicks[p] = get(d, "planClicks", p);
  const revenue: Record<string, number> = {};
  addTo(revenue, obj(obj(d).ft).revenue);
  const signups = get(d, "ft", "signups");
  const paid = get(d, "ft", "paid");
  const newVisitors = num(d.newVisitors);
  return {
    key,
    label: labelForKey(key),
    source: source ?? key,
    medium: medium ?? "",
    sessions: num(d.sessions),
    visitorDays: num(d.visitors),
    newVisitors,
    pageViews: num(d.pageViews),
    engagedSessions: num(d.engagedSessions),
    planClicks,
    signups,
    activations: get(d, "ft", "activations"),
    checkouts: get(d, "ft", "checkouts"),
    paid,
    paidByPlan: { pro: get(d, "ft", "paid_pro"), max: get(d, "ft", "paid_max") },
    revenue,
    visitorToSignup: rate(signups, newVisitors),
    signupToPaid: rate(paid, signups),
    visitorToPaid: rate(paid, newVisitors),
    ...extra,
  };
}

/** Sum several dimension docs (one per day) into one merged doc. */
function mergeDims(docs: Doc[]): Doc {
  const out: Doc = {};
  const scalars = ["sessions", "visitors", "newVisitors", "pageViews", "engagedSessions"];
  for (const k of scalars) out[k] = docs.reduce((a, d) => a + num(d[k]), 0);
  const planClicks: Record<string, number> = {};
  const ft: Record<string, number> = {};
  const ftRevenue: Record<string, number> = {};
  for (const d of docs) {
    addTo(planClicks, d.planClicks);
    const f = obj(d.ft);
    for (const [k, v] of Object.entries(f)) {
      if (k === "revenue") addTo(ftRevenue, v);
      else ft[k] = (ft[k] ?? 0) + num(v);
    }
  }
  out.planClicks = planClicks;
  out.ft = { ...ft, revenue: ftRevenue };
  return out;
}

function groupDims(dims: Doc[], kind: string): Map<string, Doc[]> {
  const m = new Map<string, Doc[]>();
  for (const d of dims) {
    if (d.kind !== kind || typeof d.key !== "string") continue;
    const arr = m.get(d.key) ?? [];
    arr.push(d);
    m.set(d.key, arr);
  }
  return m;
}

export interface ReportInput {
  range: DayRange;
  daily: Doc[]; // each with `day`
  dims: Doc[]; // each with `kind`, `key`
  accountsCreated?: number | null;
}

export function buildReport(input: ReportInput): Report {
  const { range, daily, dims } = input;
  const byDay = new Map<string, Doc>();
  for (const d of daily) if (typeof d.day === "string") byDay.set(d.day, d);

  const events: Record<string, number> = {};
  const attributedEvents: Record<string, number> = {};
  const cohort: Record<string, number> = {};
  const cohortByPlan: Record<PlanId, Record<string, number>> = {
    free: {},
    pro: {},
    max: {},
  };
  const planViews = zeroPlans();
  const planClicks = zeroPlans();
  const revenue: Record<string, number> = {};
  const countries: Record<string, number> = {};
  let sessions = 0,
    visitorDays = 0,
    newVisitors = 0,
    returning = 0,
    pageViews = 0,
    engaged = 0;
  let detailedSince: string | null = null;
  let updatedAtMs: number | null = null;

  const series: DayPoint[] = [];
  for (const day of enumerateDays(range.start, range.end)) {
    const d = byDay.get(day) ?? {};
    const dSessions = num(d.sessions);
    if (dSessions > 0 && !detailedSince) detailedSince = day;

    sessions += dSessions;
    visitorDays += num(d.visitors);
    newVisitors += num(d.newVisitors);
    returning += num(d.returningVisitors);
    pageViews += num(d.pageViews);
    engaged += num(d.engagedSessions);
    addTo(events, d.events);
    addTo(attributedEvents, d.attributedEvents);
    addTo(cohort, d.cohort);
    addTo(revenue, d.revenue);
    addTo(countries, d.countries);
    for (const p of PLAN_IDS) {
      addTo(cohortByPlan[p], obj(d.cohortByPlan)[p]);
      planViews[p] += get(d, "plans", p, "views");
      planClicks[p] += get(d, "plans", p, "clicks");
    }
    const ts = obj(d.updatedAt);
    const ms =
      typeof (d.updatedAt as { toMillis?: () => number })?.toMillis === "function"
        ? (d.updatedAt as { toMillis: () => number }).toMillis()
        : typeof ts._seconds === "number"
          ? ts._seconds * 1000
          : null;
    if (ms && (!updatedAtMs || ms > updatedAtMs)) updatedAtMs = ms;

    const dayRevenue: Record<string, number> = {};
    addTo(dayRevenue, d.revenue);
    series.push({
      day,
      sessions: dSessions,
      visitorDays: num(d.visitors),
      newVisitors: num(d.newVisitors),
      pageViews: num(d.pageViews),
      signups: get(d, "events", "signup_completed"),
      paid: get(d, "events", "subscription_created"),
      planClicks: {
        free: get(d, "plans", "free", "clicks"),
        pro: get(d, "plans", "pro", "clicks"),
        max: get(d, "plans", "max", "clicks"),
      },
      revenue: dayRevenue,
    });
  }

  // Funnel
  const topCount = cohort.visitors ?? 0;
  const funnel = FUNNEL_STAGES.map((stage, i) => {
    const count = cohort[stage] ?? 0;
    const prev = i === 0 ? null : cohort[FUNNEL_STAGES[i - 1]] ?? 0;
    const byPlan = zeroPlans();
    for (const p of PLAN_IDS) byPlan[p] = cohortByPlan[p][stage] ?? 0;
    return {
      stage,
      count,
      byPlan,
      fromPrevious: prev === null ? rate(count, count) : rate(count, prev),
      fromTop: rate(count, topCount),
    };
  });

  // Sources / campaigns
  const sources = [...groupDims(dims, "source").entries()]
    .map(([key, docs]) => sourceRowOf(key, mergeDims(docs)))
    .sort((a, b) => b.sessions - a.sessions);

  const campaigns = [...groupDims(dims, "campaign").entries()]
    .map(([key, docs]) => {
      const [campaign, srcKey] = key.split("|");
      return sourceRowOf(srcKey ?? key, mergeDims(docs), { campaign }) as CampaignRow;
    })
    .sort((a, b) => b.sessions - a.sessions);

  const simple = (kind: string): SimpleRow[] =>
    [...groupDims(dims, kind).entries()]
      .map(([key, docs]) => ({ key, sessions: docs.reduce((a, d) => a + num(d.sessions), 0) }))
      .sort((a, b) => b.sessions - a.sessions);

  const signupsEvents = events.signup_completed ?? 0;
  const signupsAttributed = attributedEvents.signup_completed ?? 0;

  const plans = PLAN_IDS.map((plan) => {
    const signups = cohortByPlan[plan].signup_completed ?? 0;
    const paid = cohortByPlan[plan].paid ?? 0;
    return {
      plan,
      views: planViews[plan],
      clicks: planClicks[plan],
      signups,
      checkoutStarts: cohortByPlan[plan].checkout_started ?? 0,
      paid,
      clickToPaid: rate(paid, cohortByPlan[plan].plan_click ?? 0),
    };
  });

  const hasAnyData = daily.some(
    (d) => num(d.pageviews) > 0 || num(d.sessions) > 0 || Object.keys(obj(d.events)).length > 0
  );

  return {
    range,
    detailedSince,
    hasAnyData,
    updatedAtMs,
    kpis: {
      sessions,
      visitorDays,
      newVisitors,
      returningVisitorDays: returning,
      pageViews,
      engagedSessions: engaged,
      engagementRate: rate(engaged, sessions),
      pagesPerSession: sessions > 0 ? pageViews / sessions : null,
      pricingPageViews: events.pricing_page_view ?? 0,
      ctaClicks: events.cta_click ?? 0,
      signupStarts: events.signup_started ?? 0,
      signupsCompleted: signupsEvents,
      accountsCreated: input.accountsCreated ?? null,
      planClicks,
      activations: events.first_content_created ?? 0,
      checkoutStarts: events.checkout_started ?? 0,
      trialStarts: events.trial_started ?? 0,
      paidConversions: events.subscription_created ?? 0,
      renewals: events.subscription_renewed ?? 0,
      paymentFailures: events.payment_failed ?? 0,
      cancellations: events.subscription_cancelled ?? 0,
      revenue,
    },
    rates: {
      visitorToSignup: rate(cohort.signup_completed ?? 0, topCount),
      visitorToPaid: rate(cohort.paid ?? 0, topCount),
      signupToActivation: rate(cohort.activated ?? 0, cohort.signup_completed ?? 0),
      signupToPaid: rate(cohort.paid ?? 0, cohort.signup_completed ?? 0),
      pricingToCheckout: rate(cohort.checkout_started ?? 0, cohort.pricing_view ?? 0),
      checkoutCompletion: rate(cohort.paid ?? 0, cohort.checkout_started ?? 0),
      planClickToSignup: rate(cohort.signup_completed ?? 0, cohort.plan_click ?? 0),
    },
    attribution: {
      signupsAttributed,
      signupsTotal: signupsEvents,
      coverage: rate(signupsAttributed, signupsEvents),
    },
    funnel,
    series,
    plans,
    sources,
    campaigns,
    landing: simple("landing"),
    referrers: simple("referrer"),
    countries: Object.entries(countries)
      .map(([key, sessions]) => ({ key, sessions }))
      .sort((a, b) => b.sessions - a.sessions),
    unavailable: [
      "Average session duration (not measured: no reliable end-of-session signal)",
      "Cost per acquisition / ROAS (no advertising spend data is connected)",
      "Refund-adjusted revenue (revenue is gross of refunds)",
    ],
  };
}

// ───────────────────────── CSV ─────────────────────────

/** Neutralise spreadsheet formula injection and quote when needed. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Array<Array<unknown>>): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

export const EXPORT_KINDS = ["sources", "campaigns", "funnel", "plans", "daily"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

const pct = (r: Rate) => (r.value === null ? "" : r.value.toFixed(2));
const eur = (m: Record<string, number>) =>
  Object.entries(m)
    .map(([c, v]) => `${(v / 100).toFixed(2)} ${c.toUpperCase()}`)
    .join(" + ");

export function exportCsv(kind: ExportKind, r: Report): string {
  switch (kind) {
    case "sources":
      return toCsv([
        ["source_medium", "sessions", "visitor_days", "new_visitors", "page_views", "engaged_sessions",
          "free_clicks", "pro_clicks", "max_clicks", "signups", "activations", "checkouts", "paid",
          "visitor_to_signup_pct", "visitor_to_paid_pct", "revenue"],
        ...r.sources.map((s) => [s.key, s.sessions, s.visitorDays, s.newVisitors, s.pageViews,
          s.engagedSessions, s.planClicks.free, s.planClicks.pro, s.planClicks.max, s.signups,
          s.activations, s.checkouts, s.paid, pct(s.visitorToSignup), pct(s.visitorToPaid), eur(s.revenue)]),
      ]);
    case "campaigns":
      return toCsv([
        ["campaign", "source_medium", "sessions", "new_visitors", "plan_clicks", "signups",
          "activations", "paid", "revenue"],
        ...r.campaigns.map((c) => [c.campaign, c.key, c.sessions, c.newVisitors,
          c.planClicks.free + c.planClicks.pro + c.planClicks.max, c.signups, c.activations, c.paid, eur(c.revenue)]),
      ]);
    case "funnel":
      return toCsv([
        ["stage", "count", "free", "pro", "max", "pct_of_previous", "pct_of_top"],
        ...r.funnel.map((f) => [f.stage, f.count, f.byPlan.free, f.byPlan.pro, f.byPlan.max,
          pct(f.fromPrevious), pct(f.fromTop)]),
      ]);
    case "plans":
      return toCsv([
        ["plan", "views", "clicks", "signups", "checkout_starts", "paid", "click_to_paid_pct"],
        ...r.plans.map((p) => [p.plan, p.views, p.clicks, p.signups, p.checkoutStarts, p.paid, pct(p.clickToPaid)]),
      ]);
    case "daily":
      return toCsv([
        ["day", "sessions", "visitor_days", "new_visitors", "page_views", "signups", "paid",
          "free_clicks", "pro_clicks", "max_clicks", "revenue"],
        ...r.series.map((d) => [d.day, d.sessions, d.visitorDays, d.newVisitors, d.pageViews, d.signups,
          d.paid, d.planClicks.free, d.planClicks.pro, d.planClicks.max, eur(d.revenue)]),
      ]);
  }
}
