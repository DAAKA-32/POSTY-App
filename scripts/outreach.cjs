#!/usr/bin/env node
/**
 * Outreach CLI — the prospection system, from a terminal.
 *
 *   node scripts/outreach.cjs status
 *   node scripts/outreach.cjs import <fichier.csv>
 *   node scripts/outreach.cjs suppress <email|fichier>... [--reason manual|unsubscribed|bounced]
 *   node scripts/outreach.cjs stop <email>...                 enregistre une réponse « stop »
 *   node scripts/outreach.cjs test <destinataire> [--as <email-prospect>]
 *   node scripts/outreach.cjs send <email>... | --file <emails.txt> [--dry-run]
 *
 * It goes through the very modules the admin console uses — CSV parser, guards,
 * daily cap, templates, SMTP, audit trail — so a campaign run here is the same
 * campaign as one run from the UI. Credentials are the server's own
 * (service-account.json + .env.local), exactly like the API routes: no user
 * token is ever minted or borrowed.
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
// firebase-admin looks for service-account.json in the working directory.
process.chdir(root);
require("@next/env").loadEnvConfig(root, false, { info: () => {}, error: console.error });
// jiti (shipped with Tailwind) runs the TypeScript lib with the "@/" alias.
const load = require("jiti")(__filename, { alias: { "@": root }, interopDefault: true });

const send = load("../lib/outreach/send.ts");
const store = load("../lib/outreach/store.ts");
const csv = load("../lib/outreach/csv.ts");
const templates = load("../lib/outreach/templates.ts");
const campaign = load("../lib/outreach/campaign.ts");

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

/** Emails from arguments that are either addresses or files containing some. */
function collectEmails(items) {
  const out = [];
  for (const item of items) {
    if (fs.existsSync(item)) {
      const raw = fs.readFileSync(item, "utf8");
      out.push(...(raw.match(EMAIL_RE) || []));
    } else {
      out.push(item);
    }
  }
  return [...new Set(out.map((e) => send.normalizeEmail(e)).filter(Boolean))];
}

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

async function status() {
  const config = send.getOutreachConfig();
  const [prospects, suppressed, sentToday] = await Promise.all([
    store.listProspects(5000),
    store.listSuppressedEmails(),
    store.countSentToday(),
  ]);
  const cap = Number(process.env.OUTREACH_DAILY_CAP || campaign.DEFAULT_DAILY_CAP);
  console.log("\nConfiguration");
  if (config.ok) {
    console.log(`  expéditeur       ${config.config.from}`);
    console.log(`  désinscription   ${config.config.unsubscribeMode === "link" ? `lien (${config.config.baseUrl})` : "réponse « stop »"}`);
  } else {
    console.log(`  INCOMPLÈTE : ${config.missing.join(", ")}`);
  }
  console.log("\nBase");
  console.log(`  prospects        ${prospects.length}`);
  console.log(`  déjà contactés   ${prospects.filter((p) => p.lastContactedAt).length}`);
  console.log(`  en erreur        ${prospects.filter((p) => p.lastError).length}`);
  console.log(`  suppressions     ${suppressed.size}`);
  console.log(`\nAujourd'hui        ${sentToday} / ${cap} envois`);
}

async function importCsv(file) {
  if (!file || !fs.existsSync(file)) fail("Fichier CSV introuvable.");
  const inputs = csv.parseCsv(fs.readFileSync(file, "utf8")).map(csv.rowToInput).filter(Boolean);
  if (inputs.length === 0) fail("Aucune ligne exploitable — une colonne Email est-elle présente ?");
  const report = await store.upsertProspects(inputs);
  console.log(`\nLignes lues            ${inputs.length}`);
  console.log(`Créés                  ${report.created}`);
  console.log(`Complétés (existants)  ${report.updated}`);
  console.log(`Ignorés, invalides     ${report.skippedInvalid}`);
  console.log(`Ignorés, supprimés     ${report.skippedSuppressed}`);
  if (report.errors.length) console.log(`Erreurs\n  ${report.errors.join("\n  ")}`);
}

async function suppress(items, reason) {
  const allowed = ["manual", "unsubscribed", "bounced"];
  if (!allowed.includes(reason)) fail(`--reason doit valoir ${allowed.join(", ")}.`);
  const emails = collectEmails(items);
  if (emails.length === 0) fail("Aucune adresse fournie.");
  for (const email of emails) {
    await store.suppressEmail(email, reason);
    console.log(`  bloqué  ${email}  (${reason})`);
  }
  console.log(`\n${emails.length} adresse(s) en liste de suppression — elles ne recevront plus rien.`);
}

async function test(to, asEmail) {
  const config = send.getOutreachConfig();
  if (!config.ok) fail(`Configuration incomplète : ${config.missing.join(", ")}.`);
  const target = send.normalizeEmail(to || "");
  if (!send.isSendableEmail(target)) fail("Adresse de test invalide.");

  let prospect = { id: "test", email: target, firstName: "", lastName: "", company: "", sector: "", role: "", website: "" };
  if (asEmail) {
    const found = await store.getProspect(store.emailToId(asEmail));
    if (!found) fail(`Prospect ${asEmail} introuvable — importez-le d'abord.`);
    prospect = found;
  }

  const unsubscribeUrl =
    config.config.unsubscribeMode === "link"
      ? await send.buildUnsubscribeUrl(config.config.baseUrl, target)
      : null;
  const sender = { name: config.config.senderName, role: config.config.senderRole, email: config.config.replyTo };
  const rendered = templates.renderEmail(prospect, sender, unsubscribeUrl);

  console.log(`\nÀ      ${target}${asEmail ? `   (rendu comme pour ${asEmail})` : ""}`);
  console.log(`Objet  ${rendered.subject}`);
  console.log("─".repeat(72));
  console.log(rendered.text);
  console.log("─".repeat(72));

  // Deliberately NOT recorded and nobody is marked contacted: a test must never
  // pollute the campaign statistics or burn a prospect.
  const outcome = await send.sendRawEmail(config.config, target, rendered.subject, rendered.text, unsubscribeUrl);
  if (!outcome.ok) fail(`Envoi refusé : ${outcome.error}`);
  console.log(`✓ Accepté par le serveur SMTP (Message-ID ${outcome.providerId})`);
}

async function runSend(items, fileFlag, dryRun) {
  const emails = collectEmails(fileFlag ? [fileFlag, ...items] : items);
  if (emails.length === 0) fail("Aucun destinataire.");

  const label = dryRun ? "APERÇU (rien n'est envoyé)" : "ENVOI RÉEL";
  console.log(`\n${label} — ${emails.length} destinataire(s)\n`);

  let n = 0;
  const outcome = await campaign.runCampaign({
    prospectIds: emails.map((e) => store.emailToId(e)),
    dryRun,
    onResult: (row) => {
      n++;
      const tag =
        row.status === "sent" ? (dryRun ? "prévu " : "envoyé") : row.status === "failed" ? "ÉCHEC " : "ignoré";
      const detail = row.status === "skipped" || row.status === "failed" ? row.reason : row.subject;
      console.log(`${String(n).padStart(2)}. ${tag}  ${(row.email || row.prospectId).padEnd(36)} ${detail}`);
    },
  });

  if (!outcome.ok) fail(outcome.error);
  const { summary } = outcome;
  console.log(
    `\n${dryRun ? "Prévus" : "Envoyés"} ${summary.sent} · échecs ${summary.failed} · ignorés ${summary.skipped}` +
      (outcome.truncated ? ` · ${outcome.truncated} au-delà du plafond par exécution (${campaign.MAX_PER_RUN})` : "")
  );
  if (!dryRun) console.log(`Campagne ${outcome.campaignId} · ${outcome.sentToday}/${outcome.dailyCap} envois aujourd'hui`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, flags } = parseArgs(rest);

  switch (command) {
    case "status":
      return status();
    case "import":
      return importCsv(positional[0]);
    case "suppress":
      return suppress(positional, flags.reason || "manual");
    case "stop":
      return suppress(positional, "unsubscribed");
    case "test":
      return test(positional[0], flags.as);
    case "send":
      return runSend(positional, typeof flags.file === "string" ? flags.file : null, Boolean(flags["dry-run"]));
    default:
      console.log(fs.readFileSync(__filename, "utf8").split("*/")[0]);
      process.exit(command ? 1 : 0);
  }
}

main()
  .then(() => process.exit(0)) // the pooled SMTP connection would keep node alive
  .catch((error) => fail(error && error.stack ? error.stack : String(error)));
