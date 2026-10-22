/**
 * Cold outreach — one campaign run, preview or real.
 *
 * Lives outside the route so the admin console (`/api/admin/outreach/send`) and
 * the terminal (`scripts/outreach.cjs`) run the very same code: the guards, the
 * daily cap and the audit trail cannot drift between the two.
 *
 * Every guard that can stop a message is applied per prospect, in order:
 *   suppression list → hard bounce → malformed address → already contacted →
 *   daily cap → unresolved placeholder. A prospect that trips any of them is
 *   reported as "skipped" with the reason, never silently dropped.
 */

import {
  buildUnsubscribeUrl,
  getOutreachConfig,
  isSendableEmail,
  normalizeEmail,
  readUnsubscribeMode,
  sendRawEmail,
} from "./send";
import { renderEmail } from "./templates";
import {
  countSentToday,
  getProspect,
  listSuppressedEmails,
  markProspectContacted,
  markProspectFailed,
  recordSend,
} from "./store";
import type { SendStatus } from "./types";

/**
 * Low-intensity by construction.
 *
 * These ceilings are the whole safety model. A real mailbox sending a handful
 * of personalised messages a day is invisible to spam filters; the same mailbox
 * sending two hundred is a bulk sender, and providers treat it as one. The
 * limits are deliberately below what Gmail would technically allow, because the
 * constraint that matters is looking human, not the provider quota.
 */
export const MAX_PER_RUN = 25;
export const DEFAULT_DAILY_CAP = 25;
/** Randomised gap, so a batch never lands as a machine-gun burst of identical
 *  timestamps. A full run averages ~210s and can reach 300s, which is the
 *  route's maxDuration: the console may time out on the last message or two.
 *  Nothing is lost or duplicated when it does — each send is recorded before
 *  the next, and `lastContactedAt` makes a re-run skip whoever already got it.
 *  The CLI has no such ceiling. */
const MIN_DELAY_MS = 5000;
const MAX_DELAY_MS = 12000;

export interface CampaignOptions {
  prospectIds: string[];
  dryRun: boolean;
  /** Force one variant for the whole batch (otherwise rotated per prospect). */
  variantId?: string;
  /** Per-prospect body override, edited in the UI. Subject stays generated. */
  overrides?: Record<string, string>;
  /** Called as each prospect is settled — lets a terminal print progress live. */
  onResult?: (row: CampaignResultRow) => void;
}

export interface CampaignResultRow {
  prospectId: string;
  email: string;
  status: SendStatus;
  subject: string;
  body: string;
  variantId: string;
  reason: string | null;
  warnings: string[];
}

export type CampaignOutcome =
  | { ok: false; error: string }
  | {
      ok: true;
      dryRun: boolean;
      campaignId: string;
      truncated: number;
      dailyCap: number;
      sentToday: number;
      summary: { sent: number; failed: number; skipped: number };
      results: CampaignResultRow[];
    };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const humanDelay = () =>
  MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));

export async function runCampaign(options: CampaignOptions): Promise<CampaignOutcome> {
  const { dryRun } = options;
  const config = getOutreachConfig();

  // A preview must work before anything is configured — that is how you check
  // the copy while the mailbox is still being set up. Sending never does.
  if (!dryRun && !config.ok) {
    return {
      ok: false,
      error: `Configuration incomplète : ${config.missing.join(", ")}. Aucun email n'a été envoyé.`,
    };
  }

  const sender = config.ok
    ? {
        name: config.config.senderName,
        role: config.config.senderRole,
        email: config.config.replyTo,
      }
    : { name: "Emilien", role: "Cofondateur", email: "contact@postyapp.ai" };
  const unsubscribeMode = config.ok ? config.config.unsubscribeMode : readUnsubscribeMode();
  // Never NEXT_PUBLIC_BASE_URL, even for a preview: locally it is localhost, and
  // a preview is only worth reading if it shows the link the recipient gets.
  const baseUrl = config.ok ? config.config.baseUrl : "https://postyapp.ai";

  const ids = options.prospectIds.slice(0, MAX_PER_RUN);
  const truncated = options.prospectIds.length - ids.length;

  const dailyCap = Number(process.env.OUTREACH_DAILY_CAP || DEFAULT_DAILY_CAP);
  let sentToday = dryRun ? 0 : await countSentToday();

  const suppressed = await listSuppressedEmails();
  const campaignId = `camp_${Date.now()}`;
  const results: CampaignResultRow[] = [];

  const settle = (row: CampaignResultRow): void => {
    results.push(row);
    options.onResult?.(row);
  };

  for (let index = 0; index < ids.length; index++) {
    const prospectId = ids[index];
    const prospect = await getProspect(prospectId);
    if (!prospect) {
      settle({
        prospectId,
        email: "",
        status: "skipped",
        subject: "",
        body: "",
        variantId: "",
        reason: "Prospect introuvable.",
        warnings: [],
      });
      continue;
    }

    const email = normalizeEmail(prospect.email);
    const skip = (reason: string): void =>
      settle({
        prospectId,
        email,
        status: "skipped",
        subject: "",
        body: "",
        variantId: "",
        reason,
        warnings: [],
      });

    if (suppressed.has(email) || prospect.unsubscribedAt) {
      skip("Désabonné ou en liste de suppression — jamais recontacté.");
      continue;
    }
    if (prospect.bouncedAt) {
      skip("Adresse en erreur permanente lors d'un envoi précédent.");
      continue;
    }
    if (!isSendableEmail(email)) {
      skip("Adresse invalide ou générique (noreply, postmaster…).");
      continue;
    }
    if (prospect.lastContactedAt) {
      skip("Déjà contacté — protection anti-doublon.");
      continue;
    }
    if (!dryRun && sentToday >= dailyCap) {
      skip(`Plafond quotidien atteint (${dailyCap}). Reprenez demain.`);
      continue;
    }

    let rendered;
    let unsubscribeUrl: string | null = null;
    try {
      if (unsubscribeMode === "link") {
        unsubscribeUrl = await buildUnsubscribeUrl(baseUrl, email);
      }
      rendered = renderEmail(prospect, sender, unsubscribeUrl, options.variantId);
    } catch (error) {
      skip(error instanceof Error ? error.message : "Rendu impossible.");
      continue;
    }

    const finalBody = options.overrides?.[prospectId]?.trim() || rendered.text;

    if (dryRun) {
      settle({
        prospectId,
        email,
        status: "sent",
        subject: rendered.subject,
        body: finalBody,
        variantId: rendered.variantId,
        reason: null,
        warnings: rendered.warnings,
      });
      continue;
    }

    // Re-checked inside the loop rather than trusted from the early return:
    // it costs nothing and it is what proves to the compiler — and to the next
    // reader — that no send path can run without a verified configuration.
    if (!config.ok) {
      skip(`Configuration incomplète : ${config.missing.join(", ")}.`);
      continue;
    }

    const outcome = await sendRawEmail(
      config.config,
      email,
      rendered.subject,
      finalBody,
      unsubscribeUrl
    );

    await recordSend({
      prospectId,
      email,
      campaignId,
      subject: rendered.subject,
      body: finalBody,
      variantId: rendered.variantId,
      status: outcome.ok ? "sent" : "failed",
      providerId: outcome.providerId,
      error: outcome.error,
      skipReason: null,
      createdAt: Date.now(),
    });

    if (outcome.ok) {
      sentToday++;
      await markProspectContacted(prospectId, prospect.emailsSentCount);
    } else {
      await markProspectFailed(prospectId, outcome.error ?? "Erreur inconnue");
    }

    settle({
      prospectId,
      email,
      status: outcome.ok ? "sent" : "failed",
      subject: rendered.subject,
      body: finalBody,
      variantId: rendered.variantId,
      reason: outcome.error,
      warnings: rendered.warnings,
    });

    if (index < ids.length - 1) await sleep(humanDelay());
  }

  return {
    ok: true,
    dryRun,
    campaignId,
    truncated,
    dailyCap,
    sentToday,
    summary: {
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
    },
    results,
  };
}
