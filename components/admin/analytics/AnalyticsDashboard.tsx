"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import type { Report, Rate, SourceRow } from "@/lib/analytics/report";
import type { FeedRow } from "@/lib/analytics/load";
import { RANGE_PRESETS, type RangePreset } from "@/lib/analytics/range";
import { ALL_EVENT_NAMES } from "@/lib/analytics/events";
import { CHANNEL_PRESETS, DEFAULT_LINK_BASE, buildTaggedUrl } from "@/lib/analytics/links";
import { labelForKey } from "@/lib/analytics/attribution";
import { BarList, LineChart } from "./charts";
import {
  EVENT_LABELS,
  STAGE_LABELS,
  fmtAgo,
  fmtInt,
  fmtMoney,
  fmtRate,
  fmtTime,
  rateTitle,
} from "./format";

type ReportResponse = Report & { truncated: boolean };
type LoadState = "loading" | "ok" | "error" | "denied";

const PRESET_LABELS: Record<RangePreset, string> = {
  today: "Aujourd'hui",
  yesterday: "Hier",
  last_7_days: "7 derniers jours",
  last_30_days: "30 derniers jours",
  last_90_days: "90 derniers jours",
  this_month: "Ce mois-ci",
  previous_month: "Mois précédent",
  custom: "Personnalisé",
};

const card = "bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl";

// ───────────────────────── Small building blocks ─────────────────────────

function Section({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className={`${card} p-4 sm:p-5 min-w-0`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-3xl">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, hint, title }: { label: string; value: string; hint?: string; title?: string }) {
  return (
    <div className={`${card} p-4`} title={title}>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
      <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white tabular-nums break-words">{value}</p>
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function RateKpi({ label, r, hint }: { label: string; r: Rate; hint: string }) {
  return <Kpi label={label} value={fmtRate(r)} hint={hint} title={rateTitle(r)} />;
}

function Pill({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "red" | "orange" | "amber" }) {
  const tones = {
    gray: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
    // No "bg-orange*" class here on purpose: globals.css forces white text on
    // anything whose class contains it in the light theme (the badge went blank).
    orange: "bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA] dark:bg-[#F97316]/10 dark:text-[#FDBA74] dark:border-[#F97316]/20",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

function Notice({ tone, children }: { tone: "info" | "warn"; children: React.ReactNode }) {
  const cls =
    tone === "warn"
      ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-200"
      : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-200";
  return <div className={`text-xs rounded-lg border px-3 py-2 ${cls}`} role="status">{children}</div>;
}

const selectCls =
  "text-xs rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-100 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40";

// ───────────────────────── Main component ─────────────────────────

export default function AnalyticsDashboard() {
  const { user, loading: authLoading } = useAuth();

  const [preset, setPreset] = useState<RangePreset>("last_30_days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  const rangeQuery = useMemo(() => {
    const q = new URLSearchParams({ preset });
    if (preset === "custom") {
      q.set("start", customStart);
      q.set("end", customEnd);
    }
    return q;
  }, [preset, customStart, customEnd]);

  const customReady = preset !== "custom" || (!!customStart && !!customEnd && customStart <= customEnd);

  const loadReport = useCallback(async () => {
    if (!customReady) return;
    setState((s) => (s === "ok" ? s : "loading"));
    try {
      const res = await authFetch(`/api/admin/analytics/report?${rangeQuery}`);
      if (res.status === 404) return setState("denied");
      if (!res.ok) return setState("error");
      setReport((await res.json()) as ReportResponse);
      setLoadedAt(Date.now());
      setState("ok");
    } catch {
      setState("error");
    }
  }, [rangeQuery, customReady]);

  useEffect(() => {
    if (authLoading) return;
    void loadReport();
  }, [authLoading, loadReport]);

  if (state === "denied") notFound();

  if (authLoading || (state === "loading" && !report)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center" role="status" aria-label="Chargement">
        <div className="w-8 h-8 border-2 border-gray-300 dark:border-white/20 border-t-gray-700 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white"
      style={{ height: "100dvh", maxHeight: "100dvh", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      tabIndex={-1}
    >
      <header className="border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/30 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 px-2 items-center rounded-md bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-semibold tracking-wider">ADMIN</span>
            <h1 className="text-sm font-medium text-gray-600 dark:text-gray-300">Analytics & acquisition</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/admin" className="font-medium text-primary hover:underline">Console</Link>
            <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">{user?.email}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
            Période
            <select className={selectCls} value={preset} onChange={(e) => setPreset(e.target.value as RangePreset)}>
              {RANGE_PRESETS.map((p) => (
                <option key={p} value={p}>{PRESET_LABELS[p]}</option>
              ))}
            </select>
          </label>
          {preset === "custom" && (
            <>
              <label className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                Du
                <input type="date" className={selectCls} value={customStart} max={customEnd || undefined} onChange={(e) => setCustomStart(e.target.value)} />
              </label>
              <label className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                Au
                <input type="date" className={selectCls} value={customEnd} min={customStart || undefined} onChange={(e) => setCustomEnd(e.target.value)} />
              </label>
            </>
          )}
          <button type="button" onClick={() => void loadReport()} className="text-xs font-medium rounded-md border border-gray-200 dark:border-white/10 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-white/5">
            Actualiser
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400 ml-auto text-right">
            {report && (
              <p>
                {report.range.start} → {report.range.end} · jours calendaires <strong>UTC</strong>
              </p>
            )}
            <p>
              Mis à jour {fmtAgo(loadedAt)} · dernier événement agrégé {fmtAgo(report?.updatedAtMs ?? null)} · rafraîchissement manuel (pas de temps réel)
            </p>
          </div>
        </div>

        {preset === "custom" && !customReady && <Notice tone="info">Choisissez une date de début et de fin (début ≤ fin, 366 jours maximum).</Notice>}
        {state === "error" && (
          <Notice tone="warn">
            Impossible de charger le rapport (erreur serveur ou période invalide). Les données déjà affichées peuvent être obsolètes.{" "}
            <button className="underline" onClick={() => void loadReport()}>Réessayer</button>
          </Notice>
        )}

        {report && <ReportBody report={report} rangeQuery={rangeQuery} />}
      </main>
    </div>
  );
}

// ───────────────────────── Report body ─────────────────────────

type SortKey = "sessions" | "newVisitors" | "signups" | "visitorToSignup" | "visitorToPaid" | "revenue";

function revenueTotal(r: Record<string, number>) {
  return Object.values(r).reduce((a, b) => a + b, 0);
}

function ReportBody({ report, rangeQuery }: { report: ReportResponse; rangeQuery: URLSearchParams }) {
  const k = report.kpis;
  const [sortKey, setSortKey] = useState<SortKey>("sessions");

  const partial = report.detailedSince !== null && report.detailedSince > report.range.start;
  const labels = report.series.map((d) => d.day);

  const sortedSources = useMemo(() => {
    const val = (s: SourceRow): number =>
      sortKey === "visitorToSignup" || sortKey === "visitorToPaid"
        ? s[sortKey].value ?? -1
        : sortKey === "revenue"
          ? revenueTotal(s.revenue)
          : (s[sortKey] as number);
    return [...report.sources].sort((a, b) => val(b) - val(a));
  }, [report.sources, sortKey]);

  const anyRevenueAttributed = report.sources.some((s) => revenueTotal(s.revenue) > 0);

  return (
    <>
      {!report.hasAnyData && (
        <Notice tone="info">
          Aucune donnée enregistrée sur cette période. Cela peut signifier : aucun visiteur, un suivi bloqué (refus du consentement analytics, bloqueurs de publicités, Do Not Track/GPC), ou des données pas encore agrégées. Ce n&apos;est pas un « 0 » mesuré.
        </Notice>
      )}
      {report.hasAnyData && report.detailedSince === null && (
        <Notice tone="info">
          Seuls les anciens compteurs (pages vues / visiteurs) existent sur cette période : le suivi détaillé (sources, plans, entonnoir) n&apos;était pas encore actif.
        </Notice>
      )}
      {partial && (
        <Notice tone="warn">
          Le suivi détaillé commence le <strong>{report.detailedSince}</strong> : avant cette date, sources, plans et entonnoir sont indisponibles (et non nuls).
        </Notice>
      )}
      {report.truncated && <Notice tone="warn">Certains rapports par dimension sont tronqués (volume élevé) : réduisez la période.</Notice>}

      {/* Acquisition KPIs */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Acquisition & engagement</h2>
        <div className="grid [&>*]:min-w-0 grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Sessions" value={fmtInt(k.sessions)} hint="Nouvelles sessions (inactivité 30 min)" />
          <Kpi label="Nouveaux visiteurs" value={fmtInt(k.newVisitors)} hint="Première visite dans la période" />
          <Kpi label="Visiteurs (par jour)" value={fmtInt(k.visitorDays)} hint="Σ des visiteurs distincts de chaque jour" title="Un visiteur vu 3 jours différents compte 3 : ce n'est pas un nombre de personnes uniques sur la période." />
          <Kpi label="Retours (par jour)" value={fmtInt(k.returningVisitorDays)} hint="Visiteurs déjà connus" />
          <Kpi label="Pages vues" value={fmtInt(k.pageViews)} />
          <Kpi label="Pages / session" value={k.pagesPerSession === null ? "—" : k.pagesPerSession.toFixed(2).replace(".", ",")} />
          <RateKpi label="Sessions engagées" r={k.engagementRate} hint="≥ 2 pages vues ou 1 interaction (clic CTA/plan, FAQ, inscription)" />
          <Kpi label="Vues page tarifs" value={fmtInt(k.pricingPageViews)} />
        </div>
      </div>

      {/* Conversion KPIs */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Conversion & revenu</h2>
        <div className="grid [&>*]:min-w-0 grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Clics Free / Pro / Max" value={`${fmtInt(k.planClicks.free)} / ${fmtInt(k.planClicks.pro)} / ${fmtInt(k.planClicks.max)}`} hint="Intentions : pas des paiements" />
          <Kpi label="Inscriptions" value={fmtInt(k.signupsCompleted)} hint={k.accountsCreated === null ? "Comptes créés : indisponible" : `${fmtInt(k.accountsCreated)} comptes créés (toutes sources, consentement ou non)`} />
          <Kpi label="Activations" value={fmtInt(k.activations)} hint="1er contenu créé" />
          <Kpi label="Paiements démarrés" value={fmtInt(k.checkoutStarts)} hint={`${fmtInt(k.trialStarts)} essais démarrés`} />
          <Kpi label="Abonnements confirmés" value={fmtInt(k.paidConversions)} hint="Webhook Stripe vérifié, 1er paiement" />
          <Kpi label="Renouvellements" value={fmtInt(k.renewals)} hint={`${fmtInt(k.paymentFailures)} échecs · ${fmtInt(k.cancellations)} résiliations`} />
          <Kpi label="Revenu vérifié" value={fmtMoney(k.revenue)} hint="Brut, avant remboursements" />
          <Kpi label="Attribution des inscriptions" value={fmtRate(report.attribution.coverage)} hint={`${fmtInt(report.attribution.signupsAttributed)} / ${fmtInt(report.attribution.signupsTotal)} liées à une source`} title="Part des inscriptions reliées à un visiteur consentant. Le reste est « non attribué »." />
        </div>
      </div>

      {/* Cohort rates */}
      <Section
        title="Taux de conversion (cohorte d'arrivée)"
        subtitle="Parmi les visiteurs arrivés pendant la période, part ayant atteint chaque étape à ce jour. Même population et même fenêtre au numérateur et au dénominateur ; les cohortes récentes sont encore immatures."
      >
        <div className="grid [&>*]:min-w-0 grid-cols-2 md:grid-cols-4 gap-3">
          <RateKpi label="Visiteur → inscrit" r={report.rates.visitorToSignup} hint="inscrits / nouveaux visiteurs" />
          <RateKpi label="Visiteur → payant" r={report.rates.visitorToPaid} hint="payants / nouveaux visiteurs" />
          <RateKpi label="Inscrit → activé" r={report.rates.signupToActivation} hint="activés / inscrits" />
          <RateKpi label="Inscrit → payant" r={report.rates.signupToPaid} hint="payants / inscrits" />
          <RateKpi label="Tarifs → paiement" r={report.rates.pricingToCheckout} hint="paiements démarrés / ont vu les tarifs" />
          <RateKpi label="Paiement → confirmé" r={report.rates.checkoutCompletion} hint="payants / paiements démarrés" />
          <RateKpi label="Clic plan → inscrit" r={report.rates.planClickToSignup} hint="inscrits / ont cliqué un plan" />
        </div>
      </Section>

      <div className="grid [&>*]:min-w-0 lg:grid-cols-2 gap-6">
        <Section title="Trafic dans le temps" subtitle="Sessions et nouveaux visiteurs par jour (UTC).">
          <LineChart
            title="Trafic par jour"
            labels={labels}
            series={[
              { name: "Sessions", color: "stroke-orange-500", values: report.series.map((d) => d.sessions) },
              { name: "Nouveaux visiteurs", color: "stroke-sky-500", values: report.series.map((d) => d.newVisitors) },
            ]}
          />
        </Section>
        <Section title="Inscriptions & abonnements confirmés" subtitle="Événements par jour (jour de l'événement, pas de la cohorte).">
          <LineChart
            title="Inscriptions et abonnements par jour"
            labels={labels}
            series={[
              { name: "Inscriptions", color: "stroke-emerald-500", values: report.series.map((d) => d.signups) },
              { name: "Abonnements confirmés", color: "stroke-violet-500", values: report.series.map((d) => d.paid) },
            ]}
          />
        </Section>
      </div>

      {/* Funnel */}
      <Section
        title="Entonnoir de conversion"
        subtitle="Personnes distinctes ayant atteint l'étape (non strictement séquentiel : on peut payer depuis une offre in-app sans clic landing). Free n'est pas un paiement."
      >
        {report.funnel[0].count === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">Pas de nouveau visiteur suivi sur la période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-white/10">
                  <th className="py-2 pr-3 font-medium">Étape</th>
                  <th className="py-2 pr-3 font-medium w-1/3">Volume</th>
                  <th className="py-2 pr-3 font-medium text-right">Total</th>
                  <th className="py-2 pr-3 font-medium text-right">% étape préc.</th>
                  <th className="py-2 pr-3 font-medium text-right">% du départ</th>
                  <th className="py-2 pr-3 font-medium text-right">Free</th>
                  <th className="py-2 pr-3 font-medium text-right">Pro</th>
                  <th className="py-2 font-medium text-right">Max</th>
                </tr>
              </thead>
              <tbody>
                {report.funnel.map((f, i) => (
                  <tr key={f.stage} className="border-b border-gray-50 dark:border-white/5">
                    <td className="py-2 pr-3 text-gray-800 dark:text-gray-100">{STAGE_LABELS[f.stage]}</td>
                    <td className="py-2 pr-3">
                      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden" aria-hidden>
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${report.funnel[0].count ? Math.min(100, (f.count / report.funnel[0].count) * 100) : 0}%` }} />
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums font-medium">{fmtInt(f.count)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums" title={rateTitle(f.fromPrevious)}>{i === 0 ? "—" : fmtRate(f.fromPrevious)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums" title={rateTitle(f.fromTop)}>{i === 0 ? "—" : fmtRate(f.fromTop)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{i === 0 ? "—" : fmtInt(f.byPlan.free)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{i === 0 ? "—" : fmtInt(f.byPlan.pro)}</td>
                    <td className="py-2 text-right tabular-nums">{i === 0 ? "—" : fmtInt(f.byPlan.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Plans */}
      <Section title="Plans : Free, Pro, Max" subtitle="Vues et clics = intérêt. Inscriptions / paiements = cohorte rattachée au plan visé ou acheté. Seul un abonnement confirmé par Stripe compte comme conversion payante.">
        <div className="grid [&>*]:min-w-0 lg:grid-cols-2 gap-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[460px]">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-white/10">
                  <th className="py-2 pr-3 font-medium">Plan</th>
                  <th className="py-2 pr-3 font-medium text-right">Vues</th>
                  <th className="py-2 pr-3 font-medium text-right">Clics</th>
                  <th className="py-2 pr-3 font-medium text-right">Inscrits</th>
                  <th className="py-2 pr-3 font-medium text-right">Paiements démarrés</th>
                  <th className="py-2 pr-3 font-medium text-right">Payants</th>
                  <th className="py-2 font-medium text-right">Clic → payant</th>
                </tr>
              </thead>
              <tbody>
                {report.plans.map((p) => (
                  <tr key={p.plan} className="border-b border-gray-50 dark:border-white/5">
                    <td className="py-2 pr-3"><Pill tone={p.plan === "max" ? "amber" : p.plan === "pro" ? "orange" : "gray"}>{p.plan.toUpperCase()}</Pill></td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(p.views)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(p.clicks)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(p.signups)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{p.plan === "free" ? "—" : fmtInt(p.checkoutStarts)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{p.plan === "free" ? "—" : fmtInt(p.paid)}</td>
                    <td className="py-2 text-right tabular-nums" title={rateTitle(p.clickToPaid)}>{p.plan === "free" ? "—" : fmtRate(p.clickToPaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <LineChart
            title="Clics par plan et par jour"
            labels={labels}
            series={[
              { name: "Free", color: "stroke-gray-400", values: report.series.map((d) => d.planClicks.free) },
              { name: "Pro", color: "stroke-orange-500", values: report.series.map((d) => d.planClicks.pro) },
              { name: "Max", color: "stroke-amber-500", values: report.series.map((d) => d.planClicks.max) },
            ]}
            emptyLabel="Aucun clic de plan sur la période"
          />
        </div>
      </Section>

      {/* Sources */}
      <div className="grid [&>*]:min-w-0 lg:grid-cols-3 gap-6">
        <Section title="Répartition des sources" subtitle="Part des sessions par source / canal (source de la session).">
          <BarList
            rows={report.sources.slice(0, 10).map((s) => ({ label: s.label, value: s.sessions, hint: `${fmtInt(s.newVisitors)} nouveaux visiteurs` }))}
            emptyLabel="Aucune session attribuée sur la période"
          />
        </Section>
        <div className="lg:col-span-2">
          <Section
            title="Qualité des sources"
            subtitle="Inscriptions et paiements = visiteurs arrivés dans la période via cette source (première touche). « direct / none » regroupe aussi les liens sans referrer (apps, assistants IA…) : ce n'est pas une preuve d'absence d'origine."
            right={
              <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                Trier par
                <select className={selectCls} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                  <option value="sessions">Sessions</option>
                  <option value="newVisitors">Nouveaux visiteurs</option>
                  <option value="signups">Inscriptions</option>
                  <option value="visitorToSignup">Taux d&apos;inscription</option>
                  <option value="visitorToPaid">Taux de paiement</option>
                  <option value="revenue" disabled={!anyRevenueAttributed}>Revenu {anyRevenueAttributed ? "" : "(aucun revenu attribué)"}</option>
                </select>
              </label>
            }
          >
            <SourceTable rows={sortedSources} showRevenue={anyRevenueAttributed} />
          </Section>
        </div>
      </div>

      <Section title="Campagnes (UTM)" subtitle="Seules les campagnes explicitement balisées (utm_campaign valide) apparaissent. Valeurs normalisées en minuscules, 40 caractères max.">
        <SourceTable rows={report.campaigns} showRevenue={report.campaigns.some((c) => revenueTotal(c.revenue) > 0)} campaign emptyLabel="Aucune campagne UTM sur la période" />
      </Section>

      <div className="grid [&>*]:min-w-0 md:grid-cols-3 gap-6">
        <Section title="Pages d'entrée"><BarList rows={report.landing.slice(0, 8).map((r) => ({ label: r.key, value: r.sessions }))} emptyLabel="Aucune donnée" /></Section>
        <Section title="Domaines référents"><BarList rows={report.referrers.slice(0, 8).map((r) => ({ label: r.key, value: r.sessions }))} emptyLabel="Aucun referrer externe" /></Section>
        <Section title="Pays" subtitle="Niveau pays uniquement, via l'en-tête de l'hébergeur (aucune IP stockée)."><BarList rows={report.countries.slice(0, 8).map((r) => ({ label: r.key, value: r.sessions }))} emptyLabel="Pays indisponible" /></Section>
      </div>

      <ActivityFeed report={report} rangeQuery={rangeQuery} />

      <Section
        title="Liens balisés"
        subtitle="Les assistants IA, certaines apps et navigateurs n'envoient pas de referrer : sans balise, la visite tombe en « direct ». Un lien balisé impose la source (priorité maximale) — c'est la seule façon fiable de mesurer ChatGPT, Instagram, une newsletter…"
      >
        <LinkBuilder />
      </Section>

      <Section title="Exports CSV" subtitle="Rapports agrégés uniquement (aucun identifiant de visiteur ou de compte), avec la période sélectionnée. Chaque export est journalisé.">
        <ExportButtons rangeQuery={rangeQuery} />
      </Section>

      <Section title="Définitions & limites">
        <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5 list-disc pl-4">
          <li><strong>Source d&apos;une session</strong> : UTM → identifiant publicitaire (gclid…) → referrer reconnu → autre site → direct → inconnu. Les domaines sont comparés exactement (ou sous-domaine), jamais par sous-chaîne.</li>
          <li><strong>Première touche</strong> : source de la toute première session du visiteur, jamais écrasée. Les paiements et inscriptions lui sont rattachés.</li>
          <li>Le suivi n&apos;existe que pour les visiteurs ayant accepté la catégorie « analytics » du bandeau cookies (et sans signal GPC) : les chiffres sont des minimums.</li>
          <li>Les liens ouverts depuis un assistant IA n&apos;envoient souvent pas de referrer : ils tombent en « direct ». Pour mesurer ChatGPT & co. fiablement, utilisez des liens balisés (<code>?utm_source=chatgpt.com</code>).</li>
          {report.unavailable.map((u) => (
            <li key={u}><strong>Non disponible</strong> : {u}.</li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function SourceTable({ rows, showRevenue, campaign = false, emptyLabel = "Aucune source sur la période" }: { rows: Array<SourceRow & { campaign?: string }>; showRevenue: boolean; campaign?: boolean; emptyLabel?: string }) {
  if (rows.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">{emptyLabel}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[720px]">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-white/10">
            <th className="py-2 pr-3 font-medium">{campaign ? "Campagne" : "Source / canal"}</th>
            <th className="py-2 pr-3 font-medium text-right">Sessions</th>
            <th className="py-2 pr-3 font-medium text-right">Nouveaux</th>
            <th className="py-2 pr-3 font-medium text-right" title="Free / Pro / Max">Clics plans</th>
            <th className="py-2 pr-3 font-medium text-right">Inscrits</th>
            <th className="py-2 pr-3 font-medium text-right">Activés</th>
            <th className="py-2 pr-3 font-medium text-right">Payants</th>
            <th className="py-2 pr-3 font-medium text-right">Visiteur → inscrit</th>
            <th className="py-2 pr-3 font-medium text-right">Visiteur → payant</th>
            {showRevenue && <th className="py-2 font-medium text-right">Revenu</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={`${s.campaign ?? ""}|${s.key}`} className="border-b border-gray-50 dark:border-white/5">
              <td className="py-2 pr-3 text-gray-800 dark:text-gray-100">
                {campaign ? <><span className="font-medium">{s.campaign}</span> <span className="text-gray-500">· {s.label}</span></> : s.label}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(s.sessions)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(s.newVisitors)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(s.planClicks.free)} / {fmtInt(s.planClicks.pro)} / {fmtInt(s.planClicks.max)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(s.signups)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(s.activations)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(s.paid)}</td>
              <td className="py-2 pr-3 text-right tabular-nums" title={rateTitle(s.visitorToSignup)}>{fmtRate(s.visitorToSignup)}</td>
              <td className="py-2 pr-3 text-right tabular-nums" title={rateTitle(s.visitorToPaid)}>{fmtRate(s.visitorToPaid)}</td>
              {showRevenue && <td className="py-2 text-right tabular-nums">{fmtMoney(s.revenue)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ───────────────────────── Activity feed ─────────────────────────

function ActivityFeed({ report, rangeQuery }: { report: ReportResponse; rangeQuery: URLSearchParams }) {
  const [filters, setFilters] = useState({ name: "", source: "", plan: "", registered: "", status: "" });
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [journeySid, setJourneySid] = useState<string | null>(null);

  const query = useMemo(() => {
    const q = new URLSearchParams(rangeQuery);
    for (const [key, v] of Object.entries(filters)) if (v) q.set(key, v);
    return q;
  }, [rangeQuery, filters]);

  const load = useCallback(
    async (append: boolean, from: string | null) => {
      setState("loading");
      try {
        const q = new URLSearchParams(query);
        if (append && from) q.set("cursor", from);
        const res = await authFetch(`/api/admin/analytics/feed?${q}`);
        if (!res.ok) return setState("error");
        const data = (await res.json()) as { rows: FeedRow[]; nextCursor: string | null };
        setRows((prev) => (append ? [...prev, ...data.rows] : data.rows));
        setCursor(data.nextCursor);
        setState("ok");
      } catch {
        setState("error");
      }
    },
    [query]
  );

  useEffect(() => {
    void load(false, null);
  }, [load, report.updatedAtMs]);

  const set = (key: keyof typeof filters) => (e: React.ChangeEvent<HTMLSelectElement>) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Section
      title="Activité récente"
      subtitle="Événements enregistrés, du plus récent au plus ancien, chargés par pages. Références pseudonymes masquées ; aucun contenu utilisateur."
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <select aria-label="Type d'événement" className={selectCls} value={filters.name} onChange={set("name")}>
          <option value="">Tous les événements</option>
          {ALL_EVENT_NAMES.map((n) => <option key={n} value={n}>{EVENT_LABELS[n] ?? n}</option>)}
        </select>
        <select aria-label="Source" className={selectCls} value={filters.source} onChange={set("source")}>
          <option value="">Toutes les sources</option>
          {report.sources.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select aria-label="Plan" className={selectCls} value={filters.plan} onChange={set("plan")}>
          <option value="">Tous les plans</option>
          <option value="free">Free</option><option value="pro">Pro</option><option value="max">Max</option>
        </select>
        <select aria-label="Visiteur" className={selectCls} value={filters.registered} onChange={set("registered")}>
          <option value="">Anonymes + inscrits</option>
          <option value="no">Anonymes</option><option value="yes">Inscrits</option>
        </select>
        <select aria-label="Statut" className={selectCls} value={filters.status} onChange={set("status")}>
          <option value="">Tous statuts</option>
          <option value="ok">Réussis</option><option value="failed">Échecs</option>
        </select>
      </div>

      {state === "error" && <Notice tone="warn">Impossible de charger l&apos;activité. <button className="underline" onClick={() => void load(false, null)}>Réessayer</button></Notice>}

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[720px]">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-white/10">
              <th className="py-2 pr-3 font-medium">Heure (locale)</th>
              <th className="py-2 pr-3 font-medium">Événement</th>
              <th className="py-2 pr-3 font-medium">Source</th>
              <th className="py-2 pr-3 font-medium">Page</th>
              <th className="py-2 pr-3 font-medium">Plan</th>
              <th className="py-2 pr-3 font-medium">Visiteur</th>
              <th className="py-2 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 dark:border-white/5">
                <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{fmtTime(r.ts)}</td>
                <td className="py-2 pr-3 text-gray-800 dark:text-gray-100">
                  {EVENT_LABELS[r.name] ?? r.name}
                  {r.amount ? <span className="text-gray-500"> · {fmtMoney({ [r.currency ?? "eur"]: r.amount })}</span> : null}
                </td>
                <td className="py-2 pr-3">{r.source ? r.source.replace("/", " / ") : <span className="text-gray-400">—</span>}{r.campaign ? <span className="text-gray-500"> · {r.campaign}</span> : null}</td>
                <td className="py-2 pr-3">{r.path ?? "—"}</td>
                <td className="py-2 pr-3">{r.plan ? <Pill tone={r.plan === "max" ? "amber" : r.plan === "pro" ? "orange" : "gray"}>{r.plan}</Pill> : "—"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {r.sid ? (
                    <button className="underline decoration-dotted hover:text-primary" onClick={() => setJourneySid(r.sid)} title="Voir le parcours de cette session">
                      {r.account ?? r.visitor ?? "session"}
                    </button>
                  ) : (
                    r.account ?? "backend"
                  )}{" "}
                  <span className="text-gray-400">{r.registered ? "· inscrit" : "· anonyme"}</span>
                </td>
                <td className="py-2">{r.status === "failed" ? <Pill tone="red">échec</Pill> : <Pill tone="green">ok</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state === "loading" && <p className="text-xs text-gray-500 py-4 text-center" role="status">Chargement…</p>}
      {state === "ok" && rows.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">Aucun événement ne correspond à ces filtres sur la période.</p>
      )}
      {cursor && state !== "loading" && (
        <div className="text-center mt-3">
          <button className="text-xs font-medium rounded-md border border-gray-200 dark:border-white/10 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-white/5" onClick={() => void load(true, cursor)}>
            Charger plus
          </button>
        </div>
      )}

      {journeySid && <JourneyModal sid={journeySid} onClose={() => setJourneySid(null)} />}
    </Section>
  );
}

interface Journey {
  sid: string;
  session: { startedAt: number; lastAt: number; pageViews: number; engaged: boolean; country: string | null; source: string | null; campaign: string | null; landing: string | null; referrerDomain: string | null; registered: boolean } | null;
  events: FeedRow[];
}

function JourneyModal({ sid, onClose }: { sid: string; onClose: () => void }) {
  const [data, setData] = useState<Journey | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await authFetch(`/api/admin/analytics/journey?sid=${encodeURIComponent(sid)}`);
        if (!res.ok) throw new Error();
        const j = (await res.json()) as Journey;
        if (alive) setData(j);
      } catch {
        if (alive) setErr(true);
      }
    })();
    return () => { alive = false; };
  }, [sid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Parcours de la session" onClick={onClose}>
      <div className="bg-white dark:bg-[#14161a] w-full sm:max-w-xl max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-white/10 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Parcours de la session</h3>
          <button className="text-xs underline" onClick={onClose}>Fermer</button>
        </div>
        {err && <p className="text-sm text-red-600">Parcours indisponible.</p>}
        {!data && !err && <p className="text-xs text-gray-500" role="status">Chargement…</p>}
        {data?.session && (
          <dl className="grid [&>*]:min-w-0 grid-cols-2 gap-x-4 gap-y-1 text-xs mb-4 text-gray-600 dark:text-gray-300">
            <dt className="text-gray-500">Source</dt><dd>{data.session.source?.replace("/", " / ") ?? "—"}</dd>
            <dt className="text-gray-500">Campagne</dt><dd>{data.session.campaign ?? "—"}</dd>
            <dt className="text-gray-500">Page d&apos;entrée</dt><dd>{data.session.landing ?? "—"}</dd>
            <dt className="text-gray-500">Referrer</dt><dd>{data.session.referrerDomain ?? "—"}</dd>
            <dt className="text-gray-500">Pays</dt><dd>{data.session.country ?? "—"}</dd>
            <dt className="text-gray-500">Pages vues</dt><dd>{data.session.pageViews}</dd>
            <dt className="text-gray-500">Engagée</dt><dd>{data.session.engaged ? "oui" : "non"}</dd>
            <dt className="text-gray-500">Compte</dt><dd>{data.session.registered ? "inscrit" : "anonyme"}</dd>
          </dl>
        )}
        <ol className="space-y-1.5">
          {data?.events.map((e) => (
            <li key={e.id} className="flex items-baseline gap-3 text-xs">
              <span className="tabular-nums text-gray-500 shrink-0">{new Date(e.ts).toLocaleTimeString("fr-FR")}</span>
              <span className="text-gray-800 dark:text-gray-100">{EVENT_LABELS[e.name] ?? e.name}{e.plan ? ` (${e.plan})` : ""}{e.path ? ` · ${e.path}` : ""}</span>
              {e.status === "failed" && <Pill tone="red">échec</Pill>}
            </li>
          ))}
          {data && data.events.length === 0 && <li className="text-xs text-gray-500">Aucun événement conservé pour cette session.</li>}
        </ol>
      </div>
    </div>
  );
}

// ───────────────────────── Export ─────────────────────────

const EXPORTS: Array<[string, string]> = [
  ["sources", "Sources"],
  ["campaigns", "Campagnes"],
  ["funnel", "Entonnoir"],
  ["plans", "Plans"],
  ["daily", "Par jour"],
];

function ExportButtons({ rangeQuery }: { rangeQuery: URLSearchParams }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const download = async (kind: string) => {
    setBusy(kind);
    setError(false);
    try {
      const q = new URLSearchParams(rangeQuery);
      q.set("kind", kind);
      const res = await authFetch(`/api/admin/analytics/export?${q}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? `posty-${kind}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {EXPORTS.map(([kind, label]) => (
        <button key={kind} disabled={busy !== null} onClick={() => void download(kind)} className="text-xs font-medium rounded-md border border-gray-200 dark:border-white/10 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50">
          {busy === kind ? "Export…" : label}
        </button>
      ))}
      {error && <span className="text-xs text-red-600" role="alert">Export impossible.</span>}
    </div>
  );
}

// ───────────────────────── Tagged-link builder ─────────────────────────

function LinkBuilder() {
  const [presetId, setPresetId] = useState(CHANNEL_PRESETS[0].id);
  const preset = CHANNEL_PRESETS.find((p) => p.id === presetId) ?? CHANNEL_PRESETS[0];
  const [source, setSource] = useState(preset.source);
  const [medium, setMedium] = useState(preset.medium);
  const [campaign, setCampaign] = useState("launch");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => buildTaggedUrl({ base: DEFAULT_LINK_BASE, source, medium, campaign, content }),
    [source, medium, campaign, content]
  );

  const pick = (id: string) => {
    const p = CHANNEL_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setSource(p.source);
    setMedium(p.medium);
  };

  const copy = async () => {
    if (!result.ok) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const field = "flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400";
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className={field}>
          Canal
          <select className={selectCls} value={presetId} onChange={(e) => pick(e.target.value)}>
            {CHANNEL_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label className={field}>
          utm_source
          <input className={selectCls} value={source} onChange={(e) => setSource(e.target.value)} maxLength={60} />
        </label>
        <label className={field}>
          utm_medium
          <input className={selectCls} value={medium} onChange={(e) => setMedium(e.target.value)} maxLength={40} />
        </label>
        <label className={field}>
          utm_campaign
          <input className={selectCls} value={campaign} onChange={(e) => setCampaign(e.target.value)} maxLength={60} />
        </label>
        <label className={`${field} sm:col-span-2 lg:col-span-2`}>
          utm_content (optionnel : variante, post, créa…)
          <input className={selectCls} value={content} onChange={(e) => setContent(e.target.value)} maxLength={60} placeholder="ex. post-12" />
        </label>
      </div>
      {preset.note && <p className="text-xs text-gray-500 dark:text-gray-400">{preset.note}</p>}

      {result.ok ? (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input readOnly aria-label="Lien balisé" value={result.url} onFocus={(e) => e.currentTarget.select()} className={`${selectCls} flex-1 font-mono min-w-0`} />
            <button type="button" onClick={() => void copy()} className="text-xs font-medium rounded-md border border-gray-200 dark:border-white/10 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-white/5">
              {copied ? "Copié ✓" : "Copier"}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sera enregistré comme <strong>{labelForKey(result.recorded.key)}</strong>
            {result.recorded.campaign ? <> · campagne <strong>{result.recorded.campaign}</strong></> : null}
            {result.recorded.content ? <> · contenu <strong>{result.recorded.content}</strong></> : null}. Valeurs normalisées (minuscules, caractères sûrs).
          </p>
        </div>
      ) : (
        <p className="text-xs text-red-600" role="alert">{result.error}</p>
      )}
    </div>
  );
}
