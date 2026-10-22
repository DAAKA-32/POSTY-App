/**
 * Pure ingestion planner.
 *
 * Given one incoming event and the current state of the visitor / session /
 * user documents it touches, decide exactly what to write: the event doc, the
 * updated visitor / session / user docs, and the counter increments for the
 * daily aggregates and dimension documents.
 *
 * No Firestore access here — `ingest.ts` does the reads/writes around it, and
 * this file is unit-tested directly. That is how we guarantee, in tests:
 *  - first-touch attribution is never overwritten by later visits
 *  - plan_click ≠ checkout_started ≠ subscription_created
 *  - a user's funnel stage is counted once, however many events repeat
 *  - revenue only ever comes from server-trust events
 */

import {
  classifyTouch,
  isAttributable,
  type Classification,
} from "./attribution";
import {
  ENGAGING_EVENTS,
  normalizePath,
  trustOf,
  utcDayKey,
  type AnalyticsEventName,
  type PlanId,
  type RawTouch,
  type TrustLevel,
} from "./events";

// ───────────────────────── Retention ─────────────────────────

/** Event-level data (anything tied to a pseudonymous id) lives 13 months. */
export const RETENTION_MS = 13 * 30 * 24 * 60 * 60 * 1000;
/** Hard cap so a single session/bot can't write unbounded events. */
export const MAX_EVENTS_PER_SESSION = 500;

// ───────────────────────── Funnel ─────────────────────────

/**
 * Cohort funnel. Each stage counts distinct people (visitors, then accounts)
 * who REACHED it at least once — not strictly sequential on purpose (a user
 * can pay straight from an in-app upsell without a recorded landing click).
 * Counters are written to the day the visitor FIRST ARRIVED ("cohort day"),
 * so a date range answers: "of the people who arrived in this period, how
 * many have reached each stage so far?".
 */
export const FUNNEL_STAGES = [
  "visitors",
  "pricing_view",
  "plan_click",
  "signup_started",
  "signup_completed",
  "activated",
  "checkout_started",
  "paid",
] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

const VISITOR_STAGE_OF: Partial<Record<AnalyticsEventName, FunnelStage>> = {
  pricing_page_view: "pricing_view",
  plan_view: "pricing_view",
  plan_click: "plan_click",
  signup_started: "signup_started",
};

// ───────────────────────── Documents ─────────────────────────

export interface TouchSummary {
  source: string;
  medium: string;
  key: string;
  channel: string;
  method: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrerDomain?: string;
  landing: string;
  at: number;
}

export interface VisitorDoc {
  firstSeenAt: number;
  firstSeenDay: string;
  lastSeenAt: number;
  lastDay: string;
  firstTouch: TouchSummary;
  lastNonDirect?: TouchSummary;
  userId?: string;
  stages: Record<string, number>;
  planIntent?: PlanId;
  sessions: number;
  expireAt: number;
}

export interface SessionDoc {
  vid: string;
  startedAt: number;
  lastAt: number;
  day: string;
  touch: TouchSummary;
  pageViews: number;
  eventCount: number;
  engaged: boolean;
  country?: string;
  userId?: string;
  expireAt: number;
}

export interface UserDoc {
  uid: string;
  vid?: string;
  /** Day the visitor first arrived; absent when the signup is unattributed. */
  cohortDay?: string;
  firstTouch?: TouchSummary;
  planIntent?: PlanId;
  signupAt: number;
  stages: Record<string, number>;
  purchasedPlan?: PlanId;
}

export interface EventDoc {
  id: string;
  name: AnalyticsEventName;
  ts: number;
  day: string;
  trust: TrustLevel;
  registered: boolean;
  status: "ok" | "failed";
  vid?: string;
  sid?: string;
  uid?: string;
  path?: string;
  plan?: PlanId;
  interval?: string;
  props?: Record<string, string | number | boolean>;
  source?: string;
  medium?: string;
  key?: string;
  campaign?: string;
  amount?: number;
  currency?: string;
  expireAt: number;
}

export interface PlanEvent {
  eventId: string;
  name: AnalyticsEventName;
  ts: number;
  trust: TrustLevel;
  vid?: string;
  sid?: string;
  uid?: string;
  path?: string;
  plan?: PlanId;
  interval?: string;
  props?: Record<string, string | number | boolean>;
  touch?: RawTouch;
  country?: string;
  /** Verified amount in the currency's minor unit (server events only). */
  amount?: number;
  currency?: string;
}

export interface PlanState {
  eventExists: boolean;
  visitor?: VisitorDoc;
  session?: SessionDoc;
  user?: UserDoc;
}

export type Counters = Record<string, number>;

export interface DimOp {
  day: string;
  kind: "source" | "campaign" | "landing" | "referrer";
  key: string;
  counters: Counters;
}

export interface PlanResult {
  status: "ok" | "duplicate" | "dropped";
  reason?: string;
  event?: EventDoc;
  /** Extra events derived from this one (first_content_created…). */
  derived: EventDoc[];
  visitor?: VisitorDoc;
  session?: SessionDoc;
  user?: UserDoc;
  daily: Record<string, Counters>;
  dims: DimOp[];
}

// ───────────────────────── Helpers ─────────────────────────

function summarize(c: Classification, landing: string, at: number): TouchSummary {
  const out: TouchSummary = {
    source: c.source,
    medium: c.medium,
    key: c.key,
    channel: c.channel,
    method: c.method,
    landing,
    at,
  };
  if (c.campaign) out.campaign = c.campaign;
  if (c.content) out.content = c.content;
  if (c.term) out.term = c.term;
  if (c.referrerDomain) out.referrerDomain = c.referrerDomain;
  return out;
}

class Collector {
  daily: Record<string, Counters> = {};
  private dimMap = new Map<string, DimOp>();

  inc(day: string, path: string, n = 1) {
    const d = (this.daily[day] ??= {});
    d[path] = (d[path] ?? 0) + n;
  }

  dim(day: string, kind: DimOp["kind"], key: string, path: string, n = 1) {
    const id = `${day}|${kind}|${key}`;
    let op = this.dimMap.get(id);
    if (!op) {
      op = { day, kind, key, counters: {} };
      this.dimMap.set(id, op);
    }
    op.counters[path] = (op.counters[path] ?? 0) + n;
  }

  get dims(): DimOp[] {
    return [...this.dimMap.values()];
  }
}

function eventDocOf(
  e: PlanEvent,
  extra: Partial<EventDoc>,
  registered: boolean
): EventDoc {
  const failed =
    e.name === "post_publish_failed" || e.name === "payment_failed";
  const doc: EventDoc = {
    id: e.eventId,
    name: e.name,
    ts: e.ts,
    day: utcDayKey(e.ts),
    trust: e.trust,
    registered,
    status: failed ? "failed" : "ok",
    expireAt: e.ts + RETENTION_MS,
    ...extra,
  };
  if (e.vid) doc.vid = e.vid;
  if (e.sid) doc.sid = e.sid;
  if (e.uid) doc.uid = e.uid;
  if (e.path) doc.path = e.path;
  if (e.plan) doc.plan = e.plan;
  if (e.interval) doc.interval = e.interval;
  if (e.props && Object.keys(e.props).length) doc.props = e.props;
  if (typeof e.amount === "number") doc.amount = e.amount;
  if (e.currency) doc.currency = e.currency;
  return doc;
}

// ───────────────────────── The planner ─────────────────────────

/**
 * A first real payment is THE conversion, even when Stripe labels it a
 * renewal (e.g. the first invoice after a trial). Resolved before anything
 * is counted so event counters, cohort stages and the stored doc agree.
 */
function resolveName(event: PlanEvent, state: PlanState): PlanEvent {
  if (
    event.name === "subscription_renewed" &&
    state.user &&
    !state.user.stages.paid
  ) {
    return { ...event, name: "subscription_created" };
  }
  return event;
}

export function planIngest(input: PlanEvent, state: PlanState): PlanResult {
  const event = resolveName(input, state);
  const empty: PlanResult = { status: "ok", derived: [], daily: {}, dims: [] };

  if (state.eventExists) return { ...empty, status: "duplicate" };

  // The trust level must match the event's declared class. Callers set it,
  // but a mismatch is a programming error we refuse to count.
  const declared = trustOf(event.name);
  if (!declared) return { ...empty, status: "dropped", reason: "unknown_event" };
  const trustRank: Record<TrustLevel, number> = {
    client: 0,
    client_authed: 1,
    server: 2,
  };
  if (trustRank[event.trust] < trustRank[declared]) {
    return { ...empty, status: "dropped", reason: "insufficient_trust" };
  }

  const out = new Collector();
  const day = utcDayKey(event.ts);
  const result: PlanResult = { ...empty };
  let eventExtra: Partial<EventDoc> = {};

  // ── Visitor / session side (anything with a vid + sid) ──
  let visitor = state.visitor;
  let session = state.session;
  let sessionTouch: TouchSummary | undefined = session?.touch;

  if (event.vid && event.sid && event.trust !== "server") {
    if (session && session.eventCount >= MAX_EVENTS_PER_SESSION) {
      return { ...empty, status: "dropped", reason: "session_event_cap" };
    }

    const isNewVisitor = !visitor;
    const isNewSession = !session;
    const landing = normalizePath(event.path);

    if (isNewSession) {
      // Session-level attribution: classified from THIS session's raw
      // signals (landing referrer / UTM). Never inherited from earlier ones.
      const cls = classifyTouch(event.touch);
      sessionTouch = summarize(cls, landing, event.ts);
    }
    const touch = sessionTouch!;

    if (!visitor) {
      visitor = {
        firstSeenAt: event.ts,
        firstSeenDay: day,
        lastSeenAt: event.ts,
        lastDay: "",
        // First-touch is frozen at creation and never rewritten.
        firstTouch: touch,
        stages: {},
        sessions: 0,
        expireAt: event.ts + RETENTION_MS,
      };
    } else {
      visitor = { ...visitor, stages: { ...visitor.stages } };
    }

    const firstOfDay = visitor.lastDay !== day;
    visitor.lastSeenAt = event.ts;
    visitor.lastDay = day;
    visitor.expireAt = event.ts + RETENTION_MS;
    if (isNewSession) {
      visitor.sessions += 1;
      if (isAttributable({ key: touch.key })) visitor.lastNonDirect = touch;
    }
    if (event.uid) visitor.userId = event.uid;
    if (event.name === "plan_click" && event.plan) visitor.planIntent = event.plan;

    const isPageView = event.name === "page_view";
    const base: SessionDoc = session ?? {
      vid: event.vid,
      startedAt: event.ts,
      lastAt: event.ts,
      day,
      touch,
      pageViews: 0,
      eventCount: 0,
      engaged: false,
      expireAt: event.ts + RETENTION_MS,
    };
    session = { ...base, lastAt: event.ts, expireAt: event.ts + RETENTION_MS };
    session.eventCount += 1;
    if (isPageView) session.pageViews += 1;
    if (event.country && !session.country) session.country = event.country;
    if (event.uid) session.userId = event.uid;

    const becameEngaged =
      !session.engaged &&
      (session.pageViews >= 2 || ENGAGING_EVENTS.includes(event.name));
    if (becameEngaged) session.engaged = true;

    // ── counters: event day ──
    out.inc(day, `events.${event.name}`);
    if (isNewSession) out.inc(day, "sessions");
    if (becameEngaged) out.inc(day, "engagedSessions");
    if (firstOfDay) {
      out.inc(day, "visitors");
      out.inc(day, event.uid ? "visitorsAuthed" : "visitorsAnon");
      // legacy flat fields kept so the original /admin chart keeps working
      out.inc(day, "uniqueVisitors");
      out.inc(day, event.uid ? "uniqueAuthedVisitors" : "uniqueAnonVisitors");
      if (!isNewVisitor) out.inc(day, "returningVisitors");
    }
    if (isNewVisitor) {
      out.inc(day, "newVisitors");
      out.inc(day, "cohort.visitors");
    }
    if (isPageView) {
      out.inc(day, "pageViews");
      out.inc(day, "pageviews");
      out.inc(day, event.uid ? "pageviewsAuthed" : "pageviewsAnon");
      out.inc(day, `pathHits.${normalizePath(event.path).replace(/[^a-zA-Z0-9_]/g, "_")}`);
    }
    if (session.country && isNewSession) {
      out.inc(day, `countries.${session.country}`);
    }

    // ── counters: session-source dimension ──
    const key = touch.key;
    if (isNewSession) {
      out.dim(day, "source", key, "sessions");
      out.dim(day, "landing", touch.landing, "sessions");
      if (touch.referrerDomain)
        out.dim(day, "referrer", touch.referrerDomain, "sessions");
      if (touch.campaign)
        out.dim(day, "campaign", `${touch.campaign}|${key}`, "sessions");
    }
    if (firstOfDay) {
      out.dim(day, "source", key, "visitors");
      if (touch.campaign)
        out.dim(day, "campaign", `${touch.campaign}|${key}`, "visitors");
    }
    if (isNewVisitor) out.dim(day, "source", key, "newVisitors");
    if (isPageView) out.dim(day, "source", key, "pageViews");
    if (becameEngaged) out.dim(day, "source", key, "engagedSessions");

    if (event.name === "plan_click" && event.plan) {
      out.inc(day, `plans.${event.plan}.clicks`);
      out.dim(day, "source", key, `planClicks.${event.plan}`);
      if (touch.campaign)
        out.dim(day, "campaign", `${touch.campaign}|${key}`, `planClicks.${event.plan}`);
    }
    if (event.name === "plan_view" && event.plan) {
      out.inc(day, `plans.${event.plan}.views`);
    }

    // ── cohort funnel (visitor stages, first-reach only) ──
    const stage = VISITOR_STAGE_OF[event.name];
    if (stage) {
      const cohortDay = visitor.firstSeenDay;
      if (!visitor.stages[stage]) {
        visitor.stages[stage] = event.ts;
        out.inc(cohortDay, `cohort.${stage}`);
      }
      if (event.plan) {
        const planStage = `${stage}:${event.plan}`;
        if (!visitor.stages[planStage]) {
          visitor.stages[planStage] = event.ts;
          out.inc(cohortDay, `cohortByPlan.${event.plan}.${stage}`);
        }
      }
    }

    eventExtra = {
      source: touch.source,
      medium: touch.medium,
      key: touch.key,
      ...(touch.campaign ? { campaign: touch.campaign } : {}),
    };

    result.visitor = visitor;
    result.session = session;
  } else {
    // Server-side event with no browser context: count it on its own day.
    out.inc(day, `events.${event.name}`);
  }

  // ── User side (signup, activation, billing) ──
  let user = state.user;
  const registered = !!event.uid;

  if (event.uid) {
    if (event.name === "signup_completed") {
      if (!user) {
        const v = result.visitor ?? state.visitor;
        user = {
          uid: event.uid,
          ...(event.vid ? { vid: event.vid } : {}),
          ...(v
            ? { cohortDay: v.firstSeenDay, firstTouch: v.firstTouch }
            : {}),
          ...(event.plan ?? v?.planIntent
            ? { planIntent: (event.plan ?? v?.planIntent) as PlanId }
            : {}),
          signupAt: event.ts,
          stages: { signup: event.ts },
        };
        reachUserStage(out, user, "signup_completed", event, true);
      }
    } else if (user) {
      user = { ...user, stages: { ...user.stages } };
      applyUserEvent(out, user, event, day, result);
    }
    result.user = user;
  }

  if (user?.cohortDay) out.inc(day, `attributedEvents.${event.name}`);

  // Revenue: only ever from server-trust billing events.
  if (
    event.trust === "server" &&
    (event.name === "subscription_created" ||
      event.name === "subscription_renewed") &&
    typeof event.amount === "number" &&
    event.amount > 0 &&
    event.currency
  ) {
    const cur = event.currency.toLowerCase();
    out.inc(day, `revenue.${cur}`, event.amount);
    if (event.plan) out.inc(day, `revenueByPlan.${event.plan}.${cur}`, event.amount);
    if (user?.cohortDay && user.firstTouch) {
      out.dim(user.cohortDay, "source", user.firstTouch.key, `ft.revenue.${cur}`, event.amount);
      if (user.firstTouch.campaign)
        out.dim(
          user.cohortDay,
          "campaign",
          `${user.firstTouch.campaign}|${user.firstTouch.key}`,
          `ft.revenue.${cur}`,
          event.amount
        );
    }
  }

  result.event = eventDocOf(event, eventExtra, registered);
  result.daily = out.daily;
  result.dims = out.dims;
  return result;

}

/** Mark a user funnel stage first-reached and write cohort counters. */
function reachUserStage(
  out: Collector,
  user: UserDoc,
  stage: FunnelStage,
  event: PlanEvent,
  isSignup = false
) {
  const cohortDay = user.cohortDay;
  if (!cohortDay) return; // unattributed: still counted as an event, not a cohort member
  out.inc(cohortDay, `cohort.${stage}`);
  const plan = isSignup ? user.planIntent : event.plan ?? user.purchasedPlan ?? user.planIntent;
  if (plan) out.inc(cohortDay, `cohortByPlan.${plan}.${stage}`);

  const ft = user.firstTouch;
  if (ft) {
    const field = {
      signup_completed: "signups",
      activated: "activations",
      checkout_started: "checkouts",
      paid: "paid",
    }[stage as string];
    if (field) {
      out.dim(cohortDay, "source", ft.key, `ft.${field}`);
      if (ft.campaign)
        out.dim(cohortDay, "campaign", `${ft.campaign}|${ft.key}`, `ft.${field}`);
      if (stage === "paid" && plan)
        out.dim(cohortDay, "source", ft.key, `ft.paid_${plan}`);
    }
  }
}

function applyUserEvent(
  out: Collector,
  user: UserDoc,
  event: PlanEvent,
  day: string,
  result: PlanResult
) {
  switch (event.name) {
    case "onboarding_completed":
      user.stages.onboarded ??= event.ts;
      break;

    case "post_created":
      if (!user.stages.activated) {
        user.stages.activated = event.ts;
        reachUserStage(out, user, "activated", event);
        out.inc(day, "events.first_content_created");
        result.derived.push(
          eventDocOf(
            {
              ...event,
              eventId: `first_content_${user.uid}`,
              name: "first_content_created",
              trust: "server",
            },
            {},
            true
          )
        );
      }
      break;

    case "post_published":
      if (!user.stages.firstPublish) {
        user.stages.firstPublish = event.ts;
        out.inc(day, "events.first_post_published");
        result.derived.push(
          eventDocOf(
            {
              ...event,
              eventId: `first_publish_${user.uid}`,
              name: "first_post_published",
              trust: "server",
            },
            {},
            true
          )
        );
      }
      break;

    case "checkout_started":
      if (!user.stages.checkout) {
        user.stages.checkout = event.ts;
        reachUserStage(out, user, "checkout_started", event);
      }
      break;

    case "trial_started":
      user.stages.trial ??= event.ts;
      break;

    case "subscription_created":
    case "subscription_renewed":
      if (!user.stages.paid) {
        user.stages.paid = event.ts;
        if (event.plan) user.purchasedPlan = event.plan;
        reachUserStage(out, user, "paid", event);
      }
      break;

    default:
      break;
  }
}
