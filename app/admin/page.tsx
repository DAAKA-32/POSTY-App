"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";

type AdminStats = {
  totalUsers: number;
  byPlan: { free: number; pro: number; max: number; unset: number };
  activeSubscriptions: number;
  trialingNow: number;
  refundsRequested: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  totalPostsTracked: number;
};

type AdminUserRow = {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  plan: string | null;
  status: string | null;
  trialEndsAt: number | null;
  freeTrialEndsAt: number | null;
  firstPaymentDate: number | null;
  refundRequested: boolean;
  postsCount: number;
  sessionsCount: number;
  conversationsThisMonth: number;
  conversationsThisWeek: number;
  lastConversationDate: number | null;
  lastActive: number | null;
  onboardingComplete: boolean;
  createdAt: number | null;
  language: string | null;
};

type AnalyticsDay = {
  day: string;
  pageviews: number;
  pageviewsAuthed: number;
  pageviewsAnon: number;
  uniqueVisitors: number;
  uniqueAuthedVisitors: number;
  uniqueAnonVisitors: number;
  newVisitors: number;
  signups: number;
};

type AnalyticsResponse = {
  windowDays: number;
  series: AnalyticsDay[];
  today: AnalyticsDay;
  last7: AnalyticsDay[];
  totals7: {
    pageviews: number;
    uniqueVisitors: number;
    uniqueAuthedVisitors: number;
    uniqueAnonVisitors: number;
    newVisitors: number;
    signups: number;
  };
};

type LoadState = "idle" | "loading" | "ok" | "denied";

function formatDate(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

function StatusBadge({ status }: { status: string | null }) {
  if (!status)
    return <span className="text-xs text-gray-400 dark:text-gray-500">—</span>;
  const map: Record<string, string> = {
    active:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
    trialing:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
    past_due:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
    canceled:
      "bg-gray-50 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10",
    unpaid:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
    inactive:
      "bg-gray-50 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10",
  };
  const cls = map[status.toLowerCase()] || map.inactive;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border ${cls}`}
    >
      {status}
    </span>
  );
}

function TrafficChart({ series }: { series: AnalyticsDay[] }) {
  const width = 720;
  const height = 200;
  const padX = 28;
  const padY = 16;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const maxValue = Math.max(
    1,
    ...series.map((s) => Math.max(s.pageviews, s.uniqueVisitors))
  );
  const barSlot = innerW / Math.max(series.length, 1);
  const barW = Math.max(2, barSlot * 0.55);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[200px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* horizontal grid */}
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
        {/* bars (pageviews) + line (unique visitors) */}
        {series.map((d, i) => {
          const x = padX + barSlot * i + (barSlot - barW) / 2;
          const h = (d.pageviews / maxValue) * innerH;
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
              <title>{`${d.day} · ${d.pageviews} pages · ${d.uniqueVisitors} uniques · +${d.signups} signups`}</title>
            </rect>
          );
        })}
        {/* unique visitors line */}
        <polyline
          fill="none"
          strokeWidth={1.5}
          className="stroke-orange-500"
          points={series
            .map((d, i) => {
              const x = padX + barSlot * i + barSlot / 2;
              const y = padY + innerH - (d.uniqueVisitors / maxValue) * innerH;
              return `${x},${y}`;
            })
            .join(" ")}
        />
        {/* x-axis ticks (every ~5 days) */}
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

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
        {label}
      </p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>("idle");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "pro" | "max">(
    "all"
  );

  useEffect(() => {
    document.documentElement.classList.add("dashboard-scroll-enabled");
    document.body.classList.add("dashboard-scroll-enabled");
    document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked", "modal-open");
    return () => {
      document.documentElement.classList.remove("dashboard-scroll-enabled");
      document.body.classList.remove("dashboard-scroll-enabled");
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState("denied");
      return;
    }

    let cancelled = false;
    setState("loading");

    (async () => {
      try {
        const [statsRes, usersRes, analyticsRes] = await Promise.all([
          authFetch("/api/admin/stats"),
          authFetch("/api/admin/users?limit=500"),
          authFetch("/api/admin/analytics"),
        ]);

        if (cancelled) return;

        if (!statsRes.ok || !usersRes.ok || !analyticsRes.ok) {
          setState("denied");
          return;
        }

        const statsJson = (await statsRes.json()) as AdminStats;
        const usersJson = (await usersRes.json()) as { users: AdminUserRow[] };
        const analyticsJson = (await analyticsRes.json()) as AnalyticsResponse;

        if (cancelled) return;

        setStats(statsJson);
        setUsers(usersJson.users || []);
        setAnalytics(analyticsJson);
        setState("ok");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (planFilter !== "all") {
        const plan = (u.plan || "").toLowerCase();
        if (plan !== planFilter) return false;
      }
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    });
  }, [users, search, planFilter]);

  // Discretion: if backend rejects (or user is logged out), render the
  // standard Next.js 404. The API never returns 401/403, so an unauthorized
  // visitor cannot tell whether the route exists.
  if (state === "denied") {
    notFound();
  }

  if (authLoading || state === "idle" || state === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 dark:border-white/20 border-t-gray-700 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

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
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 px-2 items-center rounded-md bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-semibold tracking-wider">
              ADMIN
            </span>
            <h1 className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Console interne
            </h1>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {user?.email}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {stats ? (
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Utilisateurs"
              value={stats.totalUsers}
              hint={`+${stats.newUsersLast7Days} sur 7 j · +${stats.newUsersLast30Days} sur 30 j`}
            />
            <StatCard
              label="Abonnements actifs"
              value={stats.activeSubscriptions}
              hint={`${stats.trialingNow} en essai`}
            />
            <StatCard
              label="Répartition plans"
              value={`${stats.byPlan.max} M · ${stats.byPlan.pro} P · ${stats.byPlan.free} F`}
              hint={
                stats.byPlan.unset > 0
                  ? `${stats.byPlan.unset} sans plan`
                  : undefined
              }
            />
            <StatCard
              label="Posts (cumulés)"
              value={stats.totalPostsTracked}
              hint={
                stats.refundsRequested > 0
                  ? `${stats.refundsRequested} remb. demandé(s)`
                  : "Aucun remboursement"
              }
            />
          </section>
        ) : null}

        {analytics ? (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">Trafic & visiteurs</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Sur les {analytics.windowDays} derniers jours · UTC
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gray-900 dark:bg-white/80" />
                  Pages vues
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  Visiteurs uniques
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
              <StatCard
                label="Pages vues · aujourd'hui"
                value={analytics.today.pageviews}
                hint={`${analytics.totals7.pageviews} sur 7 j`}
              />
              <StatCard
                label="Visiteurs uniques · aujourd'hui"
                value={analytics.today.uniqueVisitors}
                hint={`${analytics.totals7.uniqueVisitors} sur 7 j`}
              />
              <StatCard
                label="Connectés · aujourd'hui"
                value={analytics.today.uniqueAuthedVisitors}
                hint={`${analytics.totals7.uniqueAuthedVisitors} sur 7 j`}
              />
              <StatCard
                label="Anonymes · aujourd'hui"
                value={analytics.today.uniqueAnonVisitors}
                hint={`${analytics.totals7.uniqueAnonVisitors} sur 7 j`}
              />
              <StatCard
                label="Nouveaux visiteurs · auj."
                value={analytics.today.newVisitors}
                hint={`${analytics.totals7.newVisitors} sur 7 j`}
              />
              <StatCard
                label="Signups · aujourd'hui"
                value={analytics.today.signups}
                hint={`${analytics.totals7.signups} sur 7 j`}
              />
            </div>

            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl p-4">
              <TrafficChart series={analytics.series} />
            </div>
          </section>
        ) : null}

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <h2 className="text-base font-semibold">
              Utilisateurs{" "}
              <span className="text-gray-400 dark:text-gray-500 font-normal">
                ({filteredUsers.length}/{users.length})
              </span>
            </h2>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <select
                value={planFilter}
                onChange={(e) =>
                  setPlanFilter(
                    e.target.value as "all" | "free" | "pro" | "max"
                  )
                }
                className="h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-white/20"
              >
                <option value="all">Tous les plans</option>
                <option value="max">Max</option>
                <option value="pro">Pro</option>
                <option value="free">Free</option>
              </select>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher email, nom, id…"
                className="h-9 px-3 w-64 max-w-full text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-white/20"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 font-medium">Utilisateur</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Posts</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Sessions
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      Convos&nbsp;(mois)
                    </th>
                    <th className="px-4 py-3 font-medium">Dernière activité</th>
                    <th className="px-4 py-3 font-medium">Inscrit le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        Aucun utilisateur ne correspond aux filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 shrink-0">
                              {(u.displayName || u.email || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {u.displayName || "—"}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {u.email || u.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <PlanBadge plan={u.plan} />
                          {u.refundRequested ? (
                            <span className="ml-2 text-[10px] text-red-600 dark:text-red-400 uppercase tracking-wider">
                              remb.
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-200">
                          {u.postsCount}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-200">
                          {u.sessionsCount}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-200">
                          {u.conversationsThisMonth}
                          {u.conversationsThisWeek > 0 ? (
                            <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
                              /sem {u.conversationsThisWeek}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {formatRelative(u.lastActive ?? u.lastConversationDate)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {formatDate(u.createdAt)}
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
