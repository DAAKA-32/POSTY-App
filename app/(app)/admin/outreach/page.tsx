"use client";

/**
 * /admin/outreach — the prospection console.
 *
 * Mirrors the existing admin page: same client-side `notFound()` guard on a
 * non-admin account, same `authFetch` for the Bearer token, same visual
 * language. The server is the real gate; this only avoids rendering a shell to
 * someone who cannot use it.
 *
 * The flow is deliberately two-step. "Prévisualiser" renders through the exact
 * code path that sends, so nothing goes out before you have read it — and the
 * send button stays disabled until you have.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import { PROSPECT_STATUS_LABELS, type ProspectStatus } from "@/lib/outreach/types";

const ADMIN_EMAILS = ["emilien.nepveu@gmail.com"];

type ProspectRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  sector: string;
  status: ProspectStatus;
  lastContactedAt: number | null;
  emailsSentCount: number;
  unsubscribedAt: number | null;
  bouncedAt: number | null;
  lastError: string | null;
  suppressed: boolean;
  emailValid: boolean;
};

type PreviewRow = {
  prospectId: string;
  email: string;
  status: "sent" | "failed" | "skipped";
  subject: string;
  body: string;
  variantId: string;
  reason: string | null;
  warnings: string[];
};

type ConfigState = { ready: boolean; from: string | null; missing: string[] };

export default function OutreachPage() {
  const { user, loading: authLoading } = useAuth();

  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/admin/outreach/prospects");
      if (!response.ok) throw new Error("Chargement impossible.");
      const data = await response.json();
      setProspects(data.prospects ?? []);
      setConfig(data.config ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  if (!authLoading && (!user || !ADMIN_EMAILS.includes((user.email ?? "").toLowerCase()))) {
    notFound();
  }

  /** Contactable = never mailed, not suppressed, address parses. */
  const contactable = useMemo(
    () => prospects.filter((p) => !p.lastContactedAt && !p.suppressed && p.emailValid),
    [prospects]
  );

  const stats = useMemo(
    () => ({
      total: prospects.length,
      contacted: prospects.filter((p) => p.lastContactedAt).length,
      contactable: contactable.length,
      suppressed: prospects.filter((p) => p.suppressed).length,
      invalid: prospects.filter((p) => !p.emailValid).length,
    }),
    [prospects, contactable]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPreview(null);
  };

  const selectAllContactable = () => {
    setSelected(new Set(contactable.slice(0, 50).map((p) => p.id)));
    setPreview(null);
  };

  /** Connection check when the field is empty, real test message when it is not. */
  const runTest = async (withSend: boolean) => {
    setBusy(true);
    setReport(null);
    try {
      const response = await authFetch("/api/admin/outreach/test", {
        method: "POST",
        body: JSON.stringify(withSend ? { to: testEmail } : {}),
      });
      const data = await response.json();
      setReport(response.ok ? data.message : data.error);
    } catch (err) {
      setReport(err instanceof Error ? err.message : "Test impossible.");
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    if (!csvText.trim()) return;
    setBusy(true);
    setReport(null);
    try {
      const response = await authFetch("/api/admin/outreach/prospects", {
        method: "POST",
        body: JSON.stringify({ csv: csvText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Import impossible.");
      const r = data.report;
      setReport(
        `Import terminé : ${r.created} créés, ${r.updated} enrichis, ${r.skippedInvalid} sans email, ${r.skippedSuppressed} désabonnés ignorés.`
      );
      setCsvText("");
      await load();
    } catch (err) {
      setReport(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setBusy(false);
    }
  };

  const call = async (dryRun: boolean) => {
    if (selected.size === 0) return;
    setBusy(true);
    setReport(null);
    try {
      const response = await authFetch("/api/admin/outreach/send", {
        method: "POST",
        body: JSON.stringify({
          prospectIds: Array.from(selected),
          dryRun,
          overrides: dryRun ? undefined : overrides,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Requête refusée.");

      setPreview(data.results ?? []);
      if (!dryRun) {
        setReport(
          `Campagne terminée : ${data.summary.sent} envoyés, ${data.summary.failed} en erreur, ${data.summary.skipped} ignorés. ${data.sentToday}/${data.dailyCap} aujourd'hui.`
        );
        setSelected(new Set());
        setOverrides({});
        await load();
      } else {
        setReport(
          `Prévisualisation de ${data.results.length} message(s). Rien n'a été envoyé.`
        );
      }
    } catch (err) {
      setReport(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="p-8 text-text-secondary">Chargement…</div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <header className="space-y-2">
        <Link href="/admin" className="text-xs text-text-muted hover:text-primary">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Prospection</h1>
        <p className="text-sm text-text-secondary">
          Emails de prospection B2B, en texte brut, depuis l&apos;adresse Posty.
          Un prospect déjà contacté ne peut pas l&apos;être une seconde fois.
        </p>
      </header>

      {config && !config.ready && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-text-primary">
          <p className="font-semibold mb-1">Envoi non configuré</p>
          <p className="text-text-secondary">
            Variables manquantes : <code>{config.missing.join(", ")}</code>. La
            prévisualisation fonctionne, l&apos;envoi est bloqué tant que ce
            n&apos;est pas renseigné.
          </p>
        </div>
      )}

      {config?.ready && (
        <p className="text-xs text-text-muted">
          Expéditeur : <code>{config.from}</code>
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Prospects", value: stats.total },
          { label: "Contactables", value: stats.contactable },
          { label: "Déjà contactés", value: stats.contacted },
          { label: "Désabonnés", value: stats.suppressed },
          { label: "Emails invalides", value: stats.invalid },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4"
          >
            <div className="text-xs text-text-muted">{card.label}</div>
            <div className="text-xl font-bold text-text-primary tabular-nums">
              {card.value}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-5 space-y-3">
        <h2 className="font-semibold text-text-primary">Vérifier la boîte d&apos;envoi</h2>
        <p className="text-xs text-text-secondary">
          À faire avant la première campagne. Le test ne compte pas dans les
          statistiques et ne marque personne comme contacté.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runTest(false)}
            disabled={busy}
            className="px-3 py-2 rounded-lg border border-light-border dark:border-dark-border text-xs disabled:opacity-40"
          >
            Tester la connexion SMTP
          </button>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="votre@email.com"
            className="flex-1 min-w-[200px] rounded-lg border border-light-border dark:border-dark-border bg-transparent px-3 py-2 text-xs text-text-primary"
          />
          <button
            type="button"
            onClick={() => runTest(true)}
            disabled={busy || !testEmail.trim()}
            className="px-3 py-2 rounded-lg border border-primary text-primary text-xs font-semibold disabled:opacity-40"
          >
            M&apos;envoyer un vrai message
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-5 space-y-3">
        <h2 className="font-semibold text-text-primary">Importer des prospects</h2>
        <p className="text-xs text-text-secondary">
          Collez le CSV (séparateur <code>;</code> ou <code>,</code>). Seule la
          colonne Email est obligatoire. Les doublons enrichissent la fiche
          existante sans jamais réinitialiser son statut.
        </p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={4}
          placeholder="Prénom;Nom;Email;Entreprise;Rôle;Secteur"
          className="w-full rounded-lg border border-light-border dark:border-dark-border bg-transparent p-3 text-xs font-mono text-text-primary"
        />
        <button
          type="button"
          onClick={runImport}
          disabled={busy || !csvText.trim()}
          className="px-4 py-2 rounded-lg bg-primary text-white/100 text-sm font-semibold disabled:opacity-40"
        >
          Importer
        </button>
      </section>

      {report && (
        <div className="rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4 text-sm text-text-primary">
          {report}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold text-text-primary">
            Liste ({selected.size} sélectionné{selected.size > 1 ? "s" : ""})
          </h2>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={selectAllContactable}
              className="px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border text-xs"
            >
              Sélectionner les contactables (max 50)
            </button>
            <button
              type="button"
              onClick={() => call(true)}
              disabled={busy || selected.size === 0}
              className="px-3 py-1.5 rounded-lg border border-primary text-primary text-xs font-semibold disabled:opacity-40"
            >
              Prévisualiser
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Envoyer réellement ${selected.size} email(s) ? Cette action est irréversible.`
                  )
                ) {
                  void call(false);
                }
              }}
              disabled={busy || !preview || selected.size === 0 || !config?.ready}
              title={!preview ? "Prévisualisez d'abord" : undefined}
              className="px-3 py-1.5 rounded-lg bg-primary text-white/100 text-xs font-semibold disabled:opacity-40"
            >
              Envoyer
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-light-elevated dark:bg-dark-elevated">
              <tr className="text-left text-xs text-text-muted">
                <th className="p-3 w-8"></th>
                <th className="p-3">Contact</th>
                <th className="p-3">Email</th>
                <th className="p-3">Entreprise</th>
                <th className="p-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((p) => {
                const blocked = p.suppressed || !p.emailValid || !!p.lastContactedAt;
                return (
                  <tr
                    key={p.id}
                    className="border-t border-light-border dark:border-dark-border"
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        disabled={blocked}
                        aria-label={`Sélectionner ${p.email}`}
                      />
                    </td>
                    <td className="p-3 text-text-primary">
                      {[p.firstName, p.lastName].filter(Boolean).join(" ") || "—"}
                      {p.role && (
                        <div className="text-xs text-text-muted">{p.role}</div>
                      )}
                    </td>
                    <td className="p-3 text-text-secondary break-all">
                      {p.email}
                      {!p.emailValid && (
                        <span className="ml-2 text-xs text-error">invalide</span>
                      )}
                    </td>
                    <td className="p-3 text-text-secondary">
                      {p.company || "—"}
                      {p.sector && (
                        <div className="text-xs text-text-muted">{p.sector}</div>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {p.suppressed ? (
                        <span className="text-error">Désabonné</span>
                      ) : p.lastContactedAt ? (
                        <span className="text-success">
                          Contacté ·{" "}
                          {new Date(p.lastContactedAt).toLocaleDateString("fr-FR")}
                        </span>
                      ) : (
                        <span className="text-text-muted">
                          {PROSPECT_STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      )}
                      {p.lastError && (
                        <div className="text-error mt-1">{p.lastError}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {prospects.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-text-muted">
                    Aucun prospect. Importez un CSV pour commencer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {preview && (
        <section className="space-y-3">
          <h2 className="font-semibold text-text-primary">
            Prévisualisation — rien n&apos;est envoyé
          </h2>
          {preview.map((row) => (
            <div
              key={row.prospectId}
              className="rounded-xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-4 space-y-2"
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <span className="text-sm font-semibold text-text-primary">
                  {row.email}
                </span>
                <span className="text-xs text-text-muted">
                  {row.variantId || "—"}
                </span>
              </div>

              {row.status === "skipped" ? (
                <p className="text-sm text-warning">Ignoré : {row.reason}</p>
              ) : (
                <>
                  <p className="text-sm text-text-secondary">
                    <strong>Objet :</strong> {row.subject}
                  </p>
                  <textarea
                    value={overrides[row.prospectId] ?? row.body}
                    onChange={(e) =>
                      setOverrides((prev) => ({
                        ...prev,
                        [row.prospectId]: e.target.value,
                      }))
                    }
                    rows={14}
                    className="w-full rounded-lg border border-light-border dark:border-dark-border bg-transparent p-3 text-xs font-mono text-text-primary leading-relaxed"
                  />
                  {row.warnings.length > 0 && (
                    <ul className="text-xs text-warning list-disc pl-5">
                      {row.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
