"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types — must mirror /api/admin/users/[id]
// ─────────────────────────────────────────────────────────────────────────────

type RentabilityStatus =
  | "no-data"
  | "profitable"
  | "watch"
  | "unprofitable"
  | "free";

type DetailResponse = {
  user: {
    id: string;
    email: string;
    displayName: string;
    photoURL: string | null;
    plan: string | null;
    status: string | null;
    createdAt: number | null;
    language: string | null;
    onboardingComplete: boolean;
    trialEndsAt: number | null;
    freeTrialEndsAt: number | null;
    firstPaymentDate: number | null;
    refundRequested: boolean;
    lastActive: number | null;
    postsCount: number;
    sessionsCount: number;
    conversationsThisMonth: number;
    conversationsThisWeek: number;
    lastConversationDate: number | null;
  };
  aiUsage: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalImagesGenerated: number;
    callsCount: number;
    lastCallAt: number | null;
  };
  rentability: {
    totalCostUSD: number;
    totalCalls: number;
    totalTokens: number;
    avgCostPerCallUSD: number;
    monthlyRevenueUSD: number;
    marginPctOneMonth: number | null;
    status: RentabilityStatus;
  };
  byModel: Array<{
    model: string;
    label: string;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
    calls: number;
  }>;
  byRoute: Array<{
    route: string;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
    calls: number;
  }>;
  dailySeries: Array<{
    day: string;
    tokens: number;
    cost: number;
    calls: number;
  }>;
  recentEvents: Array<{
    id: string;
    route: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
    createdAt: number | null;
    metadata: Record<string, unknown> | null;
  }>;
  windowDays: number;
};

type LoadState = "idle" | "loading" | "ok" | "denied";

// ─────────────────────────────────────────────────────────────────────────────
// Formatters & small atoms
// ─────────────────────────────────────────────────────────────────────────────

function formatUSD(value: number, fractionDigits: number = 2): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(fractionDigits)}`;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${value}`;
}

function formatDate(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "à l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return formatDate(ms);
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneCls: Record<typeof tone, string> = {
    default: "text-gray-900 dark:text-white",
    good: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    bad: "text-red-600 dark:text-red-400",
  };
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
        {label}
      </p>
      <p className={`text-2xl font-semibold tabular-nums ${toneCls[tone]}`}>
        {value}
      </p>
      {hint ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string | null }) {
  const normalized = (plan || "").toLowerCase();
  const styles: Record<string, string> = {
    max: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
    pro: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20",
    free: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10",
  };
  const cls =
    styles[normalized] ||
    "bg-gray-50 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10";
  const label = normalized
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : "—";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border ${cls}`}
    >
      {label}
    </span>
  );
}

function RentabilityBadge({
  status,
  margin,
}: {
  status: RentabilityStatus;
  margin: number | null;
}) {
  const map: Record<RentabilityStatus, { label: string; cls: string }> = {
    profitable: {
      label: margin !== null ? `Rentable · +${margin.toFixed(0)}%` : "Rentable",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
    },
    watch: {
      label: margin !== null ? `À surveiller · ${margin.toFixed(0)}%` : "À surveiller",
      cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
    },
    unprofitable: {
      label: margin !== null ? `Déficitaire · ${margin.toFixed(0)}%` : "Déficitaire",
      cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
    },
    free: {
      label: "Plan Free (pas de revenu)",
      cls: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10",
    },
    "no-data": {
      label: "Aucun usage tracké",
      cls: "bg-gray-50 text-gray-400 border-gray-200 dark:bg-white/5 dark:text-gray-500 dark:border-white/10",
    },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border ${cls}`}
    >
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage chart — SVG, dual axis (bars = cost, line = tokens). Matches the visual
// language of the existing admin TrafficChart so the page feels native.
// ─────────────────────────────────────────────────────────────────────────────

function UsageChart({ series }: { series: DetailResponse["dailySeries"] }) {
  const width = 720;
  const height = 220;
  const padX = 36;
  const padY = 16;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const maxCost = Math.max(0.0001, ...series.map((s) => s.cost));
  const maxTokens = Math.max(1, ...series.map((s) => s.tokens));
  const barSlot = innerW / Math.max(series.length, 1);
  const barW = Math.max(2, barSlot * 0.55);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[220px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padY + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              className="stroke-gray-200 dark:stroke-white/10"
              strokeWidth={1}
              strokeDasharray={t === 0 ? "" : "2 3"}
            />
          );
        })}
        {series.map((d, i) => {
          const x = padX + barSlot * i + (barSlot - barW) / 2;
          const h = (d.cost / maxCost) * innerH;
          const y = padY + innerH - h;
          return (
            <rect
              key={`bar-${d.day}`}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={2}
              className="fill-gray-900 dark:fill-white/80"
            >
              <title>{`${d.day} · ${formatUSD(d.cost)} · ${formatCompact(d.tokens)} tokens · ${d.calls} calls`}</title>
            </rect>
          );
        })}
        <polyline
          fill="none"
          strokeWidth={1.5}
          className="stroke-orange-500"
          points={series
            .map((d, i) => {
              const x = padX + barSlot * i + barSlot / 2;
              const y = padY + innerH - (d.tokens / maxTokens) * innerH;
              return `${x},${y}`;
            })
            .join(" ")}
        />
        {series.map((d, i) => {
          if (i % 5 !== 0 && i !== series.length - 1) return null;
          const x = padX + barSlot * i + barSlot / 2;
          return (
            <text
              key={`tick-${d.day}`}
              x={x}
              y={height - 2}
              textAnchor="middle"
              className="fill-gray-400 dark:fill-gray-500 text-[9px]"
            >
              {d.day.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [state, setState] = useState<LoadState>("idle");
  const [data, setData] = useState<DetailResponse | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("dashboard-scroll-enabled");
    document.body.classList.add("dashboard-scroll-enabled");
    document.body.classList.remove(
      "pwa-mobile",
      "no-scroll",
      "scroll-locked",
      "modal-open"
    );
    return () => {
      document.documentElement.classList.remove("dashboard-scroll-enabled");
      document.body.classList.remove("dashboard-scroll-enabled");
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !id) {
      setState("denied");
      return;
    }
    let cancelled = false;
    setState("loading");

    (async () => {
      try {
        const res = await authFetch(`/api/admin/users/${id}`);
        if (cancelled) return;
        if (!res.ok) {
          setState("denied");
          return;
        }
        const json = (await res.json()) as DetailResponse;
        if (cancelled) return;
        setData(json);
        setState("ok");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, id]);

  const totalTokens = useMemo(() => {
    if (!data) return 0;
    return data.aiUsage.totalInputTokens + data.aiUsage.totalOutputTokens;
  }, [data]);

  if (state === "denied") {
    notFound();
  }
  if (authLoading || state === "idle" || state === "loading" || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 dark:border-white/20 border-t-gray-700 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const u = data.user;
  const r = data.rentability;

  return (
    <div
      className="bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white"
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
      }}
      tabIndex={-1}
    >
      <header className="border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/30 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/admin"
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ← Admin
            </Link>
            <span className="text-gray-300 dark:text-white/20">/</span>
            <h1 className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
              {u.displayName || u.email || u.id}
            </h1>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            {user?.email}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Profile header */}
        <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-lg font-semibold text-gray-600 dark:text-gray-300 shrink-0">
              {(u.displayName || u.email || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold truncate">
                  {u.displayName || "—"}
                </h2>
                <PlanBadge plan={u.plan} />
                <RentabilityBadge status={r.status} margin={r.marginPctOneMonth} />
                {u.refundRequested ? (
                  <span className="text-[10px] text-red-600 dark:text-red-400 uppercase tracking-wider">
                    remboursement demandé
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                {u.email}
              </p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <div>
                  <span className="text-gray-400 dark:text-gray-500">ID</span>
                  <div className="truncate font-mono text-[11px] text-gray-700 dark:text-gray-300">
                    {u.id}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500">Inscrit</span>
                  <div className="text-gray-700 dark:text-gray-300">
                    {formatDate(u.createdAt)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500">
                    Statut Stripe
                  </span>
                  <div className="text-gray-700 dark:text-gray-300">
                    {u.status || "—"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500">
                    Dernière activité
                  </span>
                  <div className="text-gray-700 dark:text-gray-300">
                    {formatRelative(u.lastActive)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KPI grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <StatCard
            label="Coût IA cumulé"
            value={formatUSD(r.totalCostUSD)}
            hint={`${r.totalCalls} appels`}
            tone={
              r.status === "unprofitable"
                ? "bad"
                : r.status === "watch"
                  ? "warn"
                  : r.status === "profitable"
                    ? "good"
                    : "default"
            }
          />
          <StatCard
            label="Revenu mensuel"
            value={formatUSD(r.monthlyRevenueUSD, 0)}
            hint={u.plan ? `Plan ${u.plan.toUpperCase()}` : "Sans plan"}
          />
          <StatCard
            label="Marge brute IA"
            value={
              r.marginPctOneMonth !== null
                ? `${r.marginPctOneMonth.toFixed(0)}%`
                : "—"
            }
            hint="Revenu mois − coût cumulé"
          />
          <StatCard
            label="Tokens cumulés"
            value={formatCompact(totalTokens)}
            hint={`${formatCompact(data.aiUsage.totalInputTokens)} in · ${formatCompact(data.aiUsage.totalOutputTokens)} out`}
          />
          <StatCard
            label="Coût moyen / appel"
            value={formatUSD(r.avgCostPerCallUSD, 4)}
          />
          <StatCard
            label="Coût / post"
            value={
              u.postsCount > 0
                ? formatUSD(r.totalCostUSD / u.postsCount, 4)
                : "—"
            }
            hint={`${u.postsCount} posts`}
          />
        </section>

        {/* 30-day chart */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold">
                Consommation sur {data.windowDays} jours
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                UTC · barres = coût, ligne = tokens
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gray-900 dark:bg-white/80" />
                Coût ($)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                Tokens
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl p-4">
            <UsageChart series={data.dailySeries} />
          </div>
        </section>

        {/* Breakdown by model + by route — two-column on desktop */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">Par modèle</h3>
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 font-medium">Modèle</th>
                    <th className="px-4 py-3 font-medium text-right">Appels</th>
                    <th className="px-4 py-3 font-medium text-right">Tokens</th>
                    <th className="px-4 py-3 font-medium text-right">Coût</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {data.byModel.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        Aucun appel IA tracké.
                      </td>
                    </tr>
                  ) : (
                    data.byModel.map((m) => (
                      <tr key={m.model}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {m.label}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                            {m.model}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-200">
                          {m.calls}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-200">
                          {formatCompact(m.inputTokens + m.outputTokens)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white font-medium">
                          {formatUSD(m.costUSD)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Par route</h3>
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 font-medium">Route</th>
                    <th className="px-4 py-3 font-medium text-right">Appels</th>
                    <th className="px-4 py-3 font-medium text-right">Tokens</th>
                    <th className="px-4 py-3 font-medium text-right">Coût</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {data.byRoute.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        Aucun appel IA tracké.
                      </td>
                    </tr>
                  ) : (
                    data.byRoute.map((m) => (
                      <tr key={m.route}>
                        <td className="px-4 py-3 font-mono text-[12px] text-gray-700 dark:text-gray-200">
                          {m.route}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-200">
                          {m.calls}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-200">
                          {formatCompact(m.inputTokens + m.outputTokens)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white font-medium">
                          {formatUSD(m.costUSD)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Recent events */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold">Appels récents</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Les 50 derniers événements bruts (collection <code className="font-mono">ai_events</code>)
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 font-medium">Quand</th>
                    <th className="px-4 py-3 font-medium">Route</th>
                    <th className="px-4 py-3 font-medium">Modèle</th>
                    <th className="px-4 py-3 font-medium text-right">In</th>
                    <th className="px-4 py-3 font-medium text-right">Out</th>
                    <th className="px-4 py-3 font-medium text-right">Coût</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {data.recentEvents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        Aucun appel IA enregistré.
                      </td>
                    </tr>
                  ) : (
                    data.recentEvents.map((e) => (
                      <tr key={e.id}>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {formatDateTime(e.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-gray-700 dark:text-gray-200">
                          {e.route}
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-gray-700 dark:text-gray-200">
                          {e.model}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                          {formatCompact(e.inputTokens)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                          {formatCompact(e.outputTokens)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white font-medium">
                          {formatUSD(e.costUSD, 4)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
