"use client";

/**
 * MarketingOverview — the dashboard's "what is my marketing doing" block.
 *
 * Everything shown is derived from real data: the scheduledPosts collection
 * (counts, next date, failures), users/{uid}.profile.business (completeness),
 * users/{uid}.autonomousMode / pendingAutoBatchId (weekly plan) and
 * users/{uid}.profile.strategy (content pillars). The "next action" is a plain
 * rule over those numbers — no invented insight, no performance claims.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Building2, CalendarClock, CheckCircle2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getScheduledPosts } from "@/lib/db/firestore";
import { isStrategistAllowedForEmail } from "@/lib/strategist/access";
import { useBusinessCopy } from "@/lib/business/copy";
import { businessCompleteness, normalizeBusinessProfile } from "@/lib/business/profile";
import { canBuildStrategy, readContentStrategy, type ContentStrategy } from "@/lib/business/strategy";
import { trackEvent } from "@/lib/analytics/tracker";
import BusinessProfileModal from "@/components/business/BusinessProfileModal";
import toast from "@/components/ui/Toast";
import type { ScheduledPost } from "@/types";

interface Pipeline {
  scheduled: number;
  retrying: number;
  failed: number;
  published: number;
  nextAt: Date | null;
}

function summarize(posts: ScheduledPost[]): Pipeline {
  const out: Pipeline = { scheduled: 0, retrying: 0, failed: 0, published: 0, nextAt: null };
  for (const p of posts) {
    if (p.status === "pending" || p.status === "processing") out.scheduled++;
    else if (p.status === "retrying") out.retrying++;
    else if (p.status === "failed") out.failed++;
    else if (p.status === "published") out.published++;
    if (p.status === "pending" || p.status === "processing" || p.status === "retrying") {
      const d = p.scheduledAt?.toDate?.();
      if (d && (!out.nextAt || d < out.nextAt)) out.nextAt = d;
    }
  }
  return out;
}

const card = "rounded-2xl border border-gray-200 dark:border-dark-border bg-white/70 dark:bg-dark-elevated/60 p-4 sm:p-5";

export default function MarketingOverview() {
  const { c, lang } = useBusinessCopy();
  const O = c.overview;
  const { user, userProfile, refreshUserProfile } = useAuth();
  const locale = lang === "fr" ? "fr-FR" : "en-US";

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [freshStrategy, setFreshStrategy] = useState<ContentStrategy | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getScheduledPosts(user.uid)
      .then((posts) => !cancelled && setPipeline(summarize(posts)))
      .catch((err) => {
        console.error("MarketingOverview: scheduled posts load failed", err);
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const business = useMemo(() => normalizeBusinessProfile(userProfile?.profile?.business), [userProfile]);
  const completeness = businessCompleteness(business);
  const strategy = freshStrategy ?? readContentStrategy(userProfile?.profile?.strategy);
  const strategistOn = isStrategistAllowedForEmail(user?.email);
  const auto = userProfile?.autonomousMode;
  const pendingBatch = !!userProfile?.pendingAutoBatchId;

  const fmtDate = (d: Date) =>
    d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  const generateStrategy = useCallback(async () => {
    if (!user || generating) return;
    setGenerating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/business/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: lang }),
      });
      if (!res.ok) throw new Error(`strategy ${res.status}`);
      const data = (await res.json()) as { strategy?: ContentStrategy };
      const parsed = readContentStrategy(data.strategy);
      if (!parsed) throw new Error("invalid strategy payload");
      setFreshStrategy(parsed);
      void trackEvent("marketing_strategy_created");
      void refreshUserProfile();
    } catch (err) {
      console.error("generateStrategy failed:", err);
      toast.error(O.strategy.failed);
    } finally {
      setGenerating(false);
    }
  }, [user, generating, lang, refreshUserProfile, O.strategy.failed]);

  // ── Next best action: one rule over real numbers, most urgent first ──
  type Next = { tone: "alert" | "info" | "ok"; title: string; desc: string; cta: string; href?: string; onClick?: () => void };
  const next: Next | null = (() => {
    if (!pipeline) return null;
    if (pipeline.failed > 0)
      return { tone: "alert", title: O.next.failed(pipeline.failed), desc: O.next.failedDesc, cta: O.next.failedCta, href: "/schedule" };
    if (completeness.filledCore < completeness.totalCore)
      return { tone: "info", title: O.next.business, desc: O.next.businessDesc, cta: O.next.businessCta, onClick: () => setModalOpen(true) };
    if (pendingBatch)
      return { tone: "info", title: O.next.pending, desc: O.next.pendingDesc, cta: O.next.pendingCta, href: "/app" };
    if (pipeline.scheduled + pipeline.retrying === 0)
      return { tone: "info", title: O.next.empty, desc: O.next.emptyDesc, cta: O.next.emptyCta, href: "/app" };
    return {
      tone: "ok",
      title: O.next.ontrack(pipeline.scheduled + pipeline.retrying),
      desc: O.next.ontrackDesc,
      cta: O.next.ontrackCta,
      href: "/app",
    };
  })();

  const toneClass = {
    alert: "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900",
    info: "border-primary/30 bg-primary/5",
    ok: "border-emerald-300/60 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900",
  };
  const ToneIcon = next?.tone === "alert" ? AlertTriangle : next?.tone === "ok" ? CheckCircle2 : Sparkles;

  const stats: Array<{ label: string; hint: string; value: number; alert?: boolean }> = pipeline
    ? [
        { label: O.pipeline.scheduled, hint: O.pipeline.scheduledHint, value: pipeline.scheduled },
        { label: O.pipeline.published, hint: O.pipeline.publishedHint, value: pipeline.published },
        { label: O.pipeline.retrying, hint: O.pipeline.retryingHint, value: pipeline.retrying },
        { label: O.pipeline.attention, hint: O.pipeline.attentionHint, value: pipeline.failed, alert: pipeline.failed > 0 },
      ]
    : [];

  return (
    <section aria-labelledby="marketing-overview" className="mb-10 space-y-4">
      <div>
        <h2 id="marketing-overview" className="text-xl font-bold text-gray-900 dark:text-white">
          {O.title}
        </h2>
        <p className="text-sm text-text-secondary">{O.subtitle}</p>
      </div>

      {loadFailed && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{O.loadFail}</p>}

      {next && (
        <div className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 ${toneClass[next.tone]}`}>
          <ToneIcon aria-hidden className="w-6 h-6 shrink-0 text-gray-800 dark:text-gray-100" />
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">{O.next.title}</p>
            <p className="font-semibold text-gray-900 dark:text-white">{next.title}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{next.desc}</p>
          </div>
          {next.href ? (
            <Link href={next.href} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 min-h-[44px]">
              {next.cta} <ArrowRight aria-hidden className="w-4 h-4" />
            </Link>
          ) : (
            <button type="button" onClick={next.onClick} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 min-h-[44px]">
              {next.cta} <ArrowRight aria-hidden className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {pipeline && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className={card}>
              <p className="text-xs text-gray-600 dark:text-gray-400">{s.label}</p>
              <p className={`mt-1 text-3xl font-bold tabular-nums ${s.alert ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>{s.value}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{s.hint}</p>
            </div>
          ))}
        </div>
      )}

      {pipeline && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
          <CalendarClock aria-hidden className="w-4 h-4" />
          <span>{pipeline.nextAt ? O.pipeline.next(fmtDate(pipeline.nextAt)) : O.pipeline.none}</span>
          <Link href="/schedule" className="text-primary hover:underline">{O.pipeline.viewCalendar}</Link>
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className={card}>
          <div className="flex items-center gap-2">
            <Building2 aria-hidden className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{O.business.title}</h3>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {completeness.filled === 0 ? O.business.empty : O.business.progress(completeness.filledCore, completeness.totalCore)}
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completeness.percent}
            aria-label={O.business.title}
            className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden"
          >
            <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${completeness.percent}%` }} />
          </div>
          <button type="button" onClick={() => setModalOpen(true)} className="mt-3 text-sm font-medium text-primary hover:underline min-h-[44px]">
            {completeness.filled === 0 ? O.business.add : O.business.edit}
          </button>
        </div>

        <div className={card}>
          <h3 className="font-semibold text-gray-900 dark:text-white">{O.automation.title}</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
            <li>{O.automation.publishing}</li>
            <li className="text-gray-600 dark:text-gray-400">{O.automation.cancelHint}</li>
            {strategistOn && (
              <li>
                {auto?.enabled ? O.automation.weeklyOn(O.days[auto.dayOfWeek ?? 1], auto.count ?? 5) : O.automation.weeklyOff}
                <span className="block text-gray-600 dark:text-gray-400">{O.automation.weeklyHint}</span>
              </li>
            )}
            {strategistOn && pendingBatch && <li className="font-medium">{O.automation.pendingReview}</li>}
          </ul>
          {strategistOn && (
            <Link href="/app" className="mt-3 inline-flex items-center text-sm font-medium text-primary hover:underline min-h-[44px]">
              {O.automation.manage}
            </Link>
          )}
        </div>
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{O.strategy.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{O.strategy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={generateStrategy}
            disabled={generating || !canBuildStrategy(business)}
            className="rounded-xl border border-gray-300 dark:border-dark-border px-4 py-2.5 min-h-[44px] text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-dark-hover disabled:opacity-50"
          >
            {generating ? O.strategy.generating : strategy ? O.strategy.regenerate : O.strategy.generate}
          </button>
        </div>

        {!canBuildStrategy(business) && <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{O.strategy.needBusiness}</p>}

        {strategy && (
          <div className="mt-4 space-y-3">
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {strategy.pillars.map((p, i) => (
                <li key={`${p.name}-${i}`} className="rounded-xl border border-gray-200 dark:border-dark-border p-3">
                  <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">{O.strategy.purpose} : </span>{p.purpose}</p>
                  <p className="mt-1 text-sm italic text-gray-600 dark:text-gray-400">« {p.example} »</p>
                </li>
              ))}
            </ol>
            <p className="text-sm text-gray-800 dark:text-gray-200"><span className="font-medium">{O.strategy.cadence} : </span>{strategy.cadence}</p>
            {strategy.generatedAt && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {O.strategy.createdAt(new Date(strategy.generatedAt).toLocaleDateString(locale, { day: "numeric", month: "long" }))}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">{O.strategy.disclaimer}</p>
          </div>
        )}
      </div>

      <BusinessProfileModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
