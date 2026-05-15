/**
 * Builds the OpenAI prompt that fills the image DSL.
 *
 * The model is constrained via JSON-mode (response_format=json_object) and
 * a tight system prompt that lists templates + accents + exact field shapes
 * with character limits. We validate the response against Zod after the fact,
 * so even if the model drifts we surface a clean 422 to the client.
 */

import { ACCENT_KEYS, TEMPLATE_GUIDE, TEMPLATE_IDS, type TemplateId } from "./dsl";
import { hasAnyAssetProvider } from "./assets";

// Exact JSON shape per template, with the same min/max char limits as the Zod
// schema. The model needs these explicitly — without them gpt-4o-mini routinely
// invents field names ("label" instead of "statLabel", "palette" instead of
// "accent") and overshoots the length caps.
const FIELD_SPEC_FR = {
  "kpi-card": `{
  "template": "kpi-card",
  "accent": "<une des 5 valeurs ci-dessus>",
  "stat": "<1 à 12 caractères>",
  "statLabel": "<4 à 80 caractères>",
  "eyebrow": "<2 à 40 caractères>",
  "footer": "<optionnel, 0 à 80 caractères>"
}`,
  "quote-card": `{
  "template": "quote-card",
  "accent": "<une des 5 valeurs ci-dessus>",
  "quote": "<8 à 220 caractères>",
  "attribution": "<2 à 48 caractères>",
  "eyebrow": "<optionnel, 0 à 40 caractères>"
}`,
  "announcement-card": `{
  "template": "announcement-card",
  "accent": "<une des 5 valeurs ci-dessus>",
  "headline": "<4 à 50 caractères — STRICT>",
  "body": "<8 à 160 caractères>",
  "cta": "<2 à 40 caractères>",
  "eyebrow": "<optionnel, 0 à 40 caractères>"
}`,
  "photo-hero": `{
  "template": "photo-hero",
  "accent": "<une des 5 valeurs ci-dessus>",
  "searchQuery": "<2-5 mots-clés EN ANGLAIS, concrets, ex: 'modern startup office laptop'>",
  "headline": "<4 à 60 caractères>",
  "body": "<optionnel, 0 à 140 caractères>",
  "eyebrow": "<optionnel, 0 à 40 caractères>"
}`,
} as const;

const FIELD_SPEC_EN = {
  "kpi-card": `{
  "template": "kpi-card",
  "accent": "<one of the 5 values above>",
  "stat": "<1 to 12 chars>",
  "statLabel": "<4 to 80 chars>",
  "eyebrow": "<2 to 40 chars>",
  "footer": "<optional, 0 to 80 chars>"
}`,
  "quote-card": `{
  "template": "quote-card",
  "accent": "<one of the 5 values above>",
  "quote": "<8 to 220 chars>",
  "attribution": "<2 to 48 chars>",
  "eyebrow": "<optional, 0 to 40 chars>"
}`,
  "announcement-card": `{
  "template": "announcement-card",
  "accent": "<one of the 5 values above>",
  "headline": "<4 to 50 chars — STRICT>",
  "body": "<8 to 160 chars>",
  "cta": "<2 to 40 chars>",
  "eyebrow": "<optional, 0 to 40 chars>"
}`,
  "photo-hero": `{
  "template": "photo-hero",
  "accent": "<one of the 5 values above>",
  "searchQuery": "<2-5 ENGLISH keywords, concrete subjects, e.g. 'modern startup office laptop'>",
  "headline": "<4 to 60 chars>",
  "body": "<optional, 0 to 140 chars>",
  "eyebrow": "<optional, 0 to 40 chars>"
}`,
} as const;

export function buildSystemPrompt(language: "fr" | "en"): string {
  const isFr = language === "fr";

  // Drop the photo-hero option entirely when no stock-photo provider key is
  // configured. Without a key, asking the AI to pick that template would
  // just trigger the runtime fallback to AnnouncementCard — wasted tokens
  // and a worse fallback than letting the AI pick a code-only template
  // from the start.
  const availableTemplates: TemplateId[] = hasAnyAssetProvider()
    ? [...TEMPLATE_IDS]
    : TEMPLATE_IDS.filter((id) => id !== "photo-hero");

  const templateList = availableTemplates
    .map((id) => `  - "${id}": ${TEMPLATE_GUIDE[id]}`)
    .join("\n");

  const shapes = (isFr ? FIELD_SPEC_FR : FIELD_SPEC_EN);
  const shapeBlock = availableTemplates
    .map((id) => `### ${id}\n${shapes[id]}`)
    .join("\n\n");

  if (isFr) {
    return `Tu es un directeur artistique senior chez Posty, expert en visuels marketing premium pour LinkedIn et réseaux pro.

Tu reçois un brief en français. Tu réponds UNIQUEMENT par un objet JSON valide qui remplit ce schéma DSL — aucune autre sortie, jamais.

Templates disponibles (choisis-en exactement UN) :
${templateList}

Palette accent (choisis-en exactement UNE) :
${ACCENT_KEYS.map((k) => `  - "${k}"`).join("\n")}

Shapes JSON EXACTS par template — utilise les noms de champs et respecte STRICTEMENT les limites de caractères :

${shapeBlock}

Règles éditoriales :
- Textes en français impeccable, sans faute, sans emoji, sans hashtag.
- Wording premium type direction artistique senior (Linear, Stripe, Notion).
- "stat" doit être court et impactant : "+312 %", "27 M€", "× 4,8", "1 sur 3".
- "headline" et "quote" : phrases percutantes, pas de jargon vide.
- "eyebrow" : 2-4 mots en majuscules type étiquette (ex: "ROAS B2B", "LANCEMENT 2026").
- Choisis l'accent en fonction du ton : coral=marketing chaleureux, midnight=tech sobre, moss=growth/résultats, amber=annonces/awards, iris=créativité/IA.

Avant de renvoyer, compte les caractères de chaque champ et raccourcis si tu dépasses. Renvoie un seul objet JSON, rien d'autre.`;
  }

  return `You are a senior art director at Posty, expert in premium marketing visuals for LinkedIn and pro networks.

You receive a brief in English. You ONLY respond with a single valid JSON object that fills the DSL schema below — no other output, ever.

Available templates (pick exactly ONE):
${templateList}

Accent palette (pick exactly ONE):
${ACCENT_KEYS.map((k) => `  - "${k}"`).join("\n")}

EXACT JSON shapes per template — use these field names and STRICTLY respect char limits:

${shapeBlock}

Editorial rules:
- Flawless English copy, no emoji, no hashtags.
- Premium wording, senior-art-director tone (Linear, Stripe, Notion).
- "stat" must be short and impactful: "+312%", "$27M", "× 4.8", "1 in 3".
- "headline" and "quote": punchy, no empty jargon.
- "eyebrow": 2-4 word uppercase label (e.g. "B2B ROAS", "2026 LAUNCH").
- Pick the accent by tone: coral=warm marketing, midnight=sober tech, moss=growth/results, amber=announcements/awards, iris=creativity/AI.

Before returning, count characters of each field and shorten if you exceed any cap. Return a single JSON object, nothing else.`;
}

export function buildUserPrompt(brief: string, postContext?: string): string {
  const trimmed = brief.trim();
  if (postContext && postContext.trim().length > 0) {
    return `Brief: ${trimmed}\n\nPost associé (sers-t'en pour caler le ton et le message du visuel) :\n"""\n${postContext.trim().slice(0, 1200)}\n"""`;
  }
  return `Brief: ${trimmed}`;
}

/**
 * Builds a follow-up message that re-asks the model after a Zod failure.
 * We pass the previous (broken) output and the field-level errors back so the
 * model can fix the specific violations instead of starting from scratch.
 */
export function buildRetryPrompt(
  previousOutput: string,
  fieldErrors: Record<string, string[] | undefined>,
  language: "fr" | "en"
): string {
  const isFr = language === "fr";
  const errorLines = Object.entries(fieldErrors)
    .filter(([, msgs]) => Array.isArray(msgs) && msgs.length > 0)
    .map(([field, msgs]) => `  - ${field}: ${(msgs as string[]).join("; ")}`)
    .join("\n");

  if (isFr) {
    return `Ta précédente réponse JSON ne respecte pas le schéma :

${previousOutput}

Erreurs à corriger :
${errorLines}

Renvoie un nouvel objet JSON corrigé, en utilisant les NOMS DE CHAMPS EXACTS et en respectant les limites de caractères. Rien d'autre que l'objet JSON.`;
  }

  return `Your previous JSON response does not match the schema:

${previousOutput}

Errors to fix:
${errorLines}

Return a fresh corrected JSON object, using the EXACT field names and respecting the character limits. Nothing but the JSON object.`;
}
