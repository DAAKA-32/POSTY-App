"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";

// ─────────────────────────────────────────────────────────────────────────────
// Admin — scheduled publishing health. Answers "why wasn't this post
// published?" from /api/admin/scheduler-health (heartbeat, counts, overdue
// posts, recent problems with their real error, per-post attempt history).
// ─────────────────────────────────────────────────────────────────────────────

type PostSummary = {
  id: string;
  userId: string | null;
  platform: string | null;
  status: string | null;
  verdict: string;
  verdictLabel: string;
  scheduledAt: number | null;
  updatedAt: number | null;
  attemptCount: number;
  nextAttemptAt: number | null;
  externalPostId: string | null;
  lastError: { code: string | null; detail: string | null; httpStatus: number | null; ambiguous: boolean; at: number | null } | null;
  legacyFailureReason: string | null;
};

type Heartbeat = {
  lastRunAt: number | null;
  lastRunId: string | null;
  lastRunDurationMs: number | null;
  lastRunStats: Record<string, number> | null;
  lastRunError: string | null;
  config: Record<string, string> | null;
  stale: boolean;
};

type HealthResponse = {
  now: number;
  heartbeat: Heartbeat;
  counts: Record<string, number>;
  overdue: PostSummary[];
  problems: PostSummary[];
};

type Attempt = {
  attempt: number;
  runId: string;
  startedAt: number | null;
  finishedAt: number | null;
  outcome: string;
  code: string | null;
  httpStatus: number | null;
  detail: string | null;
};

type LoadState = "loading" | "ok" | "denied";

function formatDateTime(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatAge(ms: number | null, now: number): string {
  if (!ms) return "jamais";
  const s = Math.round((now - ms) / 1000);
  if (s < 90) return `il y a ${s} s`;
  if (s < 5400) return `il y a ${Math.round(s / 60)} min`;
  return `il y a ${Math.round(s / 3600)} h`;
}

const card = "bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl p-5 sm:p-6";

function PostRow({ post }: { post: PostSummary }) {
  return (
    <tr className="border-t border-gray-100 dark:border-white/5 align-top">
      <td className="py-2 pr-3 font-mono text-xs">{post.id}</td>
      <td className="py-2 pr-3 text-xs">{post.platform}</td>
      <td className="py-2 pr-3 text-xs">{post.status}</td>
      <td className="py-2 pr-3 text-xs">{post.verdictLabel}</td>
      <td className="py-2 pr-3 text-xs break-all">
        {post.lastError ? (
          <>
            <span className="font-mono">{post.lastError.code}</span>
            {post.lastError.httpStatus ? ` · HTTP ${post.lastError.httpStatus}` : ""}
            {post.lastError.detail ? <div className="text-gray-500 dark:text-gray-400">{post.lastError.detail}</div> : null}
          </>
        ) : (
          post.legacyFailureReason ?? "—"
        )}
      </td>
      <td className="py-2 text-xs whitespace-nowrap">{formatDateTime(post.updatedAt)}</td>
    </tr>
  );
}

export default function AdminSchedulerPage() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<HealthResponse | null>(null);
  const [postId, setPostId] = useState("");
  const [lookup, setLookup] = useState<{ post: PostSummary & { attempts: Attempt[] } } | { error: string } | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/admin/scheduler-health");
        if (cancelled) return;
        if (!res.ok) {
          setState("denied");
          return;
        }
        setData((await res.json()) as HealthResponse);
        setState("ok");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const diagnose = async () => {
    const id = postId.trim();
    if (!id) return;
    const res = await authFetch(`/api/admin/scheduler-health?postId=${encodeURIComponent(id)}`);
    setLookup(res.ok ? await res.json() : { error: res.status === 404 ? "Post introuvable" : `Erreur ${res.status}` });
  };

  // Signed-out → 404 (derived during render; the API enforces the admin allowlist).
  if (state === "denied" || (!authLoading && !user)) notFound();
  if (authLoading || state !== "ok" || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 dark:border-white/20 border-t-gray-700 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const hb = data.heartbeat;
  const keyStatus = hb.config?.encryptionKeyStatus ?? "inconnu";

  return (
    <div
      className="bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white"
      style={{ height: "100dvh", maxHeight: "100dvh", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" }}
    >
      <header className="border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/30 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <Link href="/admin" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            ← Admin
          </Link>
          <span className="text-gray-300 dark:text-white/20">/</span>
          <h1 className="text-sm font-medium text-gray-700 dark:text-gray-200">Programmation — santé du scheduler</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <section className={card}>
          <h2 className="text-base font-semibold mb-3">Scheduler</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Dernier passage</div>
              <div className={hb.stale ? "text-red-600 dark:text-red-400 font-semibold" : "font-semibold"}>
                {formatAge(hb.lastRunAt, data.now)}
                {hb.stale ? " — le scheduler ne tourne pas" : ""}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(hb.lastRunAt)} · {hb.lastRunDurationMs ?? "—"} ms</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Clé de chiffrement (Functions)</div>
              <div className={keyStatus === "ok" ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold text-red-600 dark:text-red-400"}>
                {keyStatus}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Zernio : {hb.config?.zernioKeyStatus ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Dernier passage — résultat</div>
              <div className="text-xs font-mono break-all">{hb.lastRunStats ? JSON.stringify(hb.lastRunStats) : "—"}</div>
              {hb.lastRunError && <div className="text-xs text-red-600 dark:text-red-400 mt-1">{hb.lastRunError}</div>}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(data.counts).map(([status, count]) => (
              <span key={status} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10">
                {status} : <span className="font-semibold">{count}</span>
              </span>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-base font-semibold mb-3">Diagnostiquer un post</h2>
          <div className="flex gap-2">
            <input
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void diagnose();
              }}
              placeholder="ID du document scheduledPosts"
              className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-transparent"
            />
            <button onClick={() => void diagnose()} className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white dark:bg-white dark:text-black">
              Diagnostiquer
            </button>
          </div>
          {lookup && "error" in lookup && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{lookup.error}</p>}
          {lookup && "post" in lookup && (
            <div className="mt-4 text-sm space-y-2">
              <p>
                <span className="font-semibold">{lookup.post.verdictLabel}</span> · statut <span className="font-mono">{lookup.post.status}</span> ·{" "}
                {lookup.post.attemptCount} tentative(s) · prévu {formatDateTime(lookup.post.scheduledAt)}
                {lookup.post.externalPostId ? ` · ${lookup.post.externalPostId}` : ""}
              </p>
              {lookup.post.lastError && (
                <p className="text-xs break-all">
                  <span className="font-mono">{lookup.post.lastError.code}</span> — {lookup.post.lastError.detail ?? "sans détail"}
                </p>
              )}
              <table className="w-full text-left">
                <tbody>
                  {lookup.post.attempts.map((a) => (
                    <tr key={`${a.attempt}-${a.runId}`} className="border-t border-gray-100 dark:border-white/5 text-xs align-top">
                      <td className="py-1.5 pr-3">#{a.attempt}</td>
                      <td className="py-1.5 pr-3">{formatDateTime(a.startedAt)}</td>
                      <td className="py-1.5 pr-3 font-mono">{a.outcome}</td>
                      <td className="py-1.5 pr-3 font-mono">{a.code ?? ""}</td>
                      <td className="py-1.5 break-all">{a.detail ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {[
          { title: `Posts échus non traités (${data.overdue.length})`, rows: data.overdue },
          { title: `Problèmes récents (${data.problems.length})`, rows: data.problems },
        ].map(({ title, rows }) => (
          <section key={title} className={card}>
            <h2 className="text-base font-semibold mb-3">{title}</h2>
            {rows.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Rien à signaler.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-gray-500 dark:text-gray-400">
                      <th className="pb-2 pr-3 font-medium">Post</th>
                      <th className="pb-2 pr-3 font-medium">Plateforme</th>
                      <th className="pb-2 pr-3 font-medium">Statut</th>
                      <th className="pb-2 pr-3 font-medium">Diagnostic</th>
                      <th className="pb-2 pr-3 font-medium">Erreur</th>
                      <th className="pb-2 font-medium">MAJ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <PostRow key={p.id} post={p} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
