/**
 * Cold outreach — message templates.
 *
 * Design rules, in order of importance:
 *
 *  1. It must read like one person wrote it to one person. No newsletter HTML,
 *     no tracking pixel, no image, no button. Plain text sent from a real
 *     mailbox is both the most human-looking and the most deliverable format.
 *  2. Nothing is ever invented about the prospect. Every sentence that mentions
 *     the recipient's company or sector is rendered ONLY when that field is
 *     actually present; otherwise the sentence disappears and an equally
 *     professional neutral opener is used.
 *  3. No unresolved placeholder can leave the building — `renderEmail` scans its
 *     own output and throws rather than return a body containing one.
 */

import type { Prospect, RenderedEmail } from "./types";

/** Who the recipient sees, and who they reply to. */
export interface SenderIdentity {
  name: string;
  role: string;
  email: string;
}

interface Ctx {
  greeting: string;
  /** Company name, or "" when unknown. Never a placeholder. */
  company: string;
  sector: string;
  role: string;
  /** Bare hostname of the prospect's own site, or "" — never a guess. */
  website: string;
  sender: SenderIdentity;
  /** null when the opt-out is a reply ("reply" mode): no link is printed. */
  unsubscribeUrl: string | null;
}

interface Variant {
  id: string;
  /** Subjects stay specific and quiet — no "Boostez votre LinkedIn". */
  subject: (ctx: Ctx) => string;
  body: (ctx: Ctx) => string;
}

/**
 * Sectors arrive capitalised ("Conseil RP & communication") and have to read as
 * running prose mid-sentence. A plain toLowerCase() would flatten the acronyms
 * that carry the meaning — "conseil rp", "formation ia" — so all-caps tokens
 * are left alone.
 */
function humanSector(sector: string): string {
  return sector
    .split(/(\s+|[&/,-])/)
    .map((token) => (/^[A-ZÀ-Ü0-9]{2,}$/.test(token) ? token : token.toLowerCase()))
    .join("");
}

/** "https://www.exemple.fr/" -> "exemple.fr". Returns "" if nothing usable. */
function bareDomain(website: string): string {
  const value = (website || "").trim();
  if (!value) return "";
  const host = value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#]/)[0]
    .toLowerCase();
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) ? host : "";
}

/**
 * The opening line is the only part that changes with what we actually know.
 * Each branch is a complete sentence, never a template with a hole in it.
 *
 * The site comes first when we have it: it is the one detail that proves the
 * message was written for this person and not blasted to a list. Everything
 * here is a fact we hold — nothing is inferred about the recipient.
 */
function opener(ctx: Ctx): string {
  if (ctx.website && ctx.sector) {
    return `Je me permets de vous écrire après être passé sur ${ctx.website}. Nous échangeons en ce moment avec plusieurs professionnels du secteur ${humanSector(ctx.sector)}, pour comprendre comment ils gèrent leur présence en ligne.`;
  }
  if (ctx.website) {
    return `Je me permets de vous écrire après être passé sur ${ctx.website}, et parce que votre travail correspond à ce que nous cherchons à mieux comprendre en ce moment.`;
  }
  if (ctx.company && ctx.sector) {
    return `Je me permets de vous écrire après être tombé sur ${ctx.company}. Nous échangeons en ce moment avec plusieurs acteurs du secteur ${humanSector(ctx.sector)}, et votre activité fait partie de celles qui ont retenu notre attention.`;
  }
  if (ctx.company) {
    return `Je me permets de vous écrire après être tombé sur ${ctx.company}. Nous cherchons en ce moment à échanger avec quelques entreprises dont l'activité nous semble particulièrement intéressante, et la vôtre en fait partie.`;
  }
  if (ctx.sector) {
    return `Je me permets de vous écrire car nous échangeons en ce moment avec plusieurs professionnels du secteur ${humanSector(ctx.sector)}, pour comprendre comment ils gèrent leur présence en ligne.`;
  }
  return "Je me permets de vous écrire car nous cherchons en ce moment à échanger avec quelques professionnels dont l'activité nous semble particulièrement intéressante.";
}

function signature(ctx: Ctx): string {
  return [
    "Bien à vous,",
    "",
    ctx.sender.name,
    `${ctx.sender.role} — Posty`,
    "https://postyapp.ai",
  ].join("\n");
}

/**
 * The legal footer. B2B prospection in France is allowed without prior consent
 * (CNIL "opt-out" regime for professional addresses) on three conditions: the
 * sender is identifiable, the message relates to the recipient's profession,
 * and opting out is simple and actually works. This line is what makes the
 * third one true — it is not decoration, do not remove it.
 */
function footer(ctx: Ctx): string {
  const optOut = ctx.unsubscribeUrl
    ? `Si vous ne souhaitez pas recevoir d'autres messages de ma part, répondez simplement « stop » ou cliquez ici : ${ctx.unsubscribeUrl}`
    : "Si vous ne souhaitez pas recevoir d'autres messages de ma part, répondez simplement « stop » à cet email.";
  return ["", "", "—", optOut].join("\n");
}

const VARIANTS: Variant[] = [
  {
    id: "ouverture-directe",
    subject: (c) => (c.company ? `Posty & ${c.company}` : "Posty — une question rapide"),
    body: (c) =>
      [
        c.greeting,
        "",
        opener(c),
        "",
        "Nous développons Posty, un outil qui aide les professionnels et les équipes à créer et publier leurs contenus LinkedIn sans y passer leurs soirées.",
        "",
        "Nous proposons aussi des offres Business pour les entreprises et les équipes, avec une formule que nous adaptons aux besoins de chaque organisation.",
        "",
        "Je serais ravi de vous en dire deux mots et de voir, très simplement, si cela peut avoir du sens chez vous. Si le sujet vous intéresse ou si vous avez la moindre question, répondez-moi directement à ce message.",
        "",
        signature(c),
      ].join("\n"),
  },
  {
    id: "curiosite-metier",
    subject: (c) => (c.company ? `Question sur ${c.company}` : "Votre présence LinkedIn"),
    body: (c) =>
      [
        c.greeting,
        "",
        opener(c),
        "",
        "Je travaille sur Posty : nous aidons les professionnels et les équipes à tenir un rythme de publication sur LinkedIn sans que cela devienne une corvée.",
        "",
        "Nous avons également des offres Business, pensées pour les entreprises qui veulent gérer plusieurs profils ou faire monter toute une équipe en visibilité.",
        "",
        "Est-ce un sujet chez vous en ce moment ? Si oui, je serais heureux d'échanger quelques minutes. Et si ce n'est pas le moment, dites-le-moi sans détour, je comprendrai très bien.",
        "",
        signature(c),
      ].join("\n"),
  },
  {
    id: "presentation-sobre",
    subject: () => "Posty — création de contenu LinkedIn",
    body: (c) =>
      [
        c.greeting,
        "",
        opener(c),
        "",
        "En deux phrases : Posty génère et programme vos publications LinkedIn à partir d'une simple idée, dans votre style, et se charge de la mise en ligne.",
        "",
        "Nous proposons par ailleurs des offres Business pour les entreprises et les équipes, que nous construisons au cas par cas.",
        "",
        "Si vous voulez en savoir plus, ou simplement voir à quoi cela ressemble, répondez-moi à ce message et je vous montre.",
        "",
        signature(c),
      ].join("\n"),
  },
];

export const VARIANT_IDS: readonly string[] = VARIANTS.map((v) => v.id);

/**
 * Rotates variants deterministically from the prospect id, so the same prospect
 * always gets the same message — previews are idempotent and an audit is
 * reproducible — while a batch never goes out as 200 identical copies.
 */
function pickVariant(seed: string, forced?: string): Variant {
  if (forced) {
    const match = VARIANTS.find((v) => v.id === forced);
    if (match) return match;
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return VARIANTS[Math.abs(hash) % VARIANTS.length];
}

/** Repairs a name imported as "JEAN" or "jean" without touching "McArthur". */
function cleanName(raw: string): string {
  const value = (raw || "").trim();
  if (!value) return "";
  if (value === value.toUpperCase() || value === value.toLowerCase()) {
    return value
      .toLowerCase()
      .split(/([ -])/)
      .map((part) =>
        /[ -]/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)
      )
      .join("");
  }
  return value;
}

/**
 * Any leftover templating syntax would be visible to a prospect, so it is
 * treated as the bug it is: the render fails instead of shipping it.
 */
const PLACEHOLDER_PATTERN = /\{\{?[a-zA-Z_][\w.]*\}?\}|\[[A-ZÀ-Ü_ ]{2,}\]|%[A-Z_]{2,}%/;

export function findPlaceholder(text: string): string | null {
  const match = text.match(PLACEHOLDER_PATTERN);
  return match ? match[0] : null;
}

export type RenderableProspect = Pick<
  Prospect,
  "id" | "email" | "firstName" | "lastName" | "company" | "sector" | "role"
> &
  Partial<Pick<Prospect, "website">>;

export function renderEmail(
  prospect: RenderableProspect,
  sender: SenderIdentity,
  unsubscribeUrl: string | null,
  forcedVariant?: string
): RenderedEmail {
  const warnings: string[] = [];

  const firstName = cleanName(prospect.firstName);
  if (!firstName) {
    warnings.push("Aucun prénom : formule d'appel générique utilisée.");
  }
  const website = bareDomain(prospect.website || "");
  if (!prospect.company?.trim() && !website) {
    warnings.push("Ni entreprise ni site : accroche neutre utilisée.");
  }

  const ctx: Ctx = {
    greeting: firstName ? `Bonjour ${firstName},` : "Bonjour,",
    company: (prospect.company || "").trim(),
    sector: (prospect.sector || "").trim(),
    role: (prospect.role || "").trim(),
    website,
    sender,
    unsubscribeUrl,
  };

  const variant = pickVariant(prospect.id || prospect.email, forcedVariant);
  const subject = variant.subject(ctx).trim();
  const text = `${variant.body(ctx)}${footer(ctx)}`;

  const leftover = findPlaceholder(`${subject}\n${text}`);
  if (leftover) {
    throw new Error(
      `Variable non résolue dans l'email (${leftover}) — envoi annulé pour ${prospect.email}.`
    );
  }

  return { subject, text, variantId: variant.id, warnings };
}
