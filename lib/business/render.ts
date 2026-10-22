/**
 * Server-side rendering of the business context for prompts.
 *
 * Every value is free text typed by the user and ends up inside a system
 * prompt, so it goes through sanitizeProfileField (strips injection phrases,
 * zero-width/bidi chars, collapses whitespace, caps length) — the same
 * contract as every other profile field.
 */

import { sanitizeProfileField } from "@/lib/ai/sanitize-profile";
import { BUSINESS_FIELDS, normalizeBusinessProfile, hasBusinessContext, type BusinessField } from "./profile";

type Lang = "fr" | "en";

const LABELS: Record<BusinessField, { fr: string; en: string }> = {
  name: { fr: "Entreprise", en: "Business" },
  website: { fr: "Site", en: "Website" },
  offer: { fr: "Offre", en: "Offer" },
  idealCustomer: { fr: "Client idéal", en: "Ideal customer" },
  customerProblems: { fr: "Problèmes des clients", en: "Customer problems" },
  differentiator: { fr: "Différenciation", en: "Differentiator" },
  proofPoints: { fr: "Preuves vérifiables", en: "Verifiable proof" },
  preferredCta: { fr: "Appel à l'action préféré", en: "Preferred call to action" },
  avoidTopics: { fr: "À ne jamais aborder", en: "Never write about" },
};

/** Fields in prompt order (proof + avoid last so the guardrails are the
 *  freshest thing the model reads). */
const ORDER: BusinessField[] = [
  "name",
  "offer",
  "idealCustomer",
  "customerProblems",
  "differentiator",
  "website",
  "preferredCta",
  "proofPoints",
  "avoidTopics",
];

/** Plain "- Label: value" lines, sanitized. Empty string when nothing is set. */
export function renderBusinessLines(raw: unknown, language: Lang): string {
  const bp = normalizeBusinessProfile(raw);
  if (!hasBusinessContext(bp)) return "";
  const caps = new Map(BUSINESS_FIELDS.map((f) => [f.key, f.max]));
  const lines: string[] = [];
  for (const key of ORDER) {
    const v = bp[key];
    if (!v) continue;
    const clean = sanitizeProfileField(v, caps.get(key) ?? 300);
    if (clean) lines.push(`- ${LABELS[key][language]}: ${clean}`);
  }
  return lines.join("\n");
}

/**
 * Full prompt block with the honesty guardrails attached. Returns "" when the
 * user has not provided any business context, so prompts stay byte-identical
 * for them.
 */
export function renderBusinessBlock(raw: unknown, language: Lang): string {
  const lines = renderBusinessLines(raw, language);
  if (!lines) return "";
  const hasProof = /^- (Preuves vérifiables|Verifiable proof):/m.test(lines);
  if (language === "fr") {
    return [
      "ENTREPRISE DE L'AUTEUR (source de vérité — ancre le contenu ici, ne la récite pas) :",
      lines,
      hasProof
        ? "Chiffres, clients et résultats : uniquement ceux listés dans « Preuves vérifiables »."
        : "N'invente AUCUN chiffre, client nommé, témoignage ou résultat : aucune preuve n'a été fournie.",
    ].join("\n");
  }
  return [
    "AUTHOR'S BUSINESS (source of truth — ground the content here, don't recite it):",
    lines,
    hasProof
      ? 'Figures, clients and results: only those listed under "Verifiable proof".'
      : "Invent NO figure, named client, testimonial or result: no proof was provided.",
  ].join("\n");
}
