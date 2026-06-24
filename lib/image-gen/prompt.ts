/**
 * Builds the OpenAI prompt that fills the image DSL.
 *
 * The model is constrained via JSON-mode (response_format=json_object) and
 * a tight system prompt that lists templates + accents + exact field shapes
 * with character limits. We validate the response against Zod after the fact,
 * so even if the model drifts we surface a clean 422 to the client.
 */

import {
  ACCENT_KEYS,
  PHOTO_TEMPLATES,
  TEMPLATE_GUIDE,
  TEMPLATE_IDS,
  isPhotoTemplate,
  type TemplateId,
} from "./dsl";
import { hasAnyAssetProvider } from "./assets";

// Exact JSON shape per template, with the same min/max char limits as the Zod
// schema. The model needs these explicitly — without them gpt-4o-mini routinely
// invents field names ("label" instead of "statLabel", "palette" instead of
// "accent") and overshoots the length caps.
const FIELD_SPEC_FR = {
  "photo-hero": `{
  "template": "photo-hero",
  "accent": "<une des 5 valeurs ci-dessus>",
  "searchQuery": "<2-5 mots-clés EN ANGLAIS, concrets, ex: 'modern startup office laptop'>",
  "headline": "<LE MESSAGE — 4 à 70 caractères, court et percutant, idéalement ≤ 45>",
  "body": "<optionnel, 0 à 140 caractères>",
  "eyebrow": "<optionnel, 0 à 40 caractères, étiquette majuscules>"
}`,
  "photo-clean": `{
  "template": "photo-clean",
  "accent": "<une des 5 valeurs ci-dessus>",
  "searchQuery": "<2-5 mots-clés EN ANGLAIS nommant un SUJET RÉEL concret, ex: 'paris haussmann street', 'french parliament chamber', 'founder coworking laptop'>",
  "caption": "<optionnel, 0 à 70 caractères — UNE ligne, à n'utiliser QUE pour un visuel volontairement sans message>",
  "eyebrow": "<optionnel, 0 à 40 caractères, étiquette majuscules>"
}`,
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
} as const;

const FIELD_SPEC_EN = {
  "photo-hero": `{
  "template": "photo-hero",
  "accent": "<one of the 5 values above>",
  "searchQuery": "<2-5 ENGLISH keywords, concrete subjects, e.g. 'modern startup office laptop'>",
  "headline": "<THE MESSAGE — 4 to 70 chars, short and punchy, ideally ≤ 45>",
  "body": "<optional, 0 to 140 chars>",
  "eyebrow": "<optional, 0 to 40 chars, uppercase label>"
}`,
  "photo-clean": `{
  "template": "photo-clean",
  "accent": "<one of the 5 values above>",
  "searchQuery": "<2-5 ENGLISH keywords naming a REAL concrete subject, e.g. 'paris haussmann street', 'parliament chamber session', 'founder coworking laptop'>",
  "caption": "<optional, 0 to 70 chars — a SINGLE line, use ONLY for a deliberately message-less visual>",
  "eyebrow": "<optional, 0 to 40 chars, uppercase label>"
}`,
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
} as const;

export function buildSystemPrompt(language: "fr" | "en"): string {
  const isFr = language === "fr";

  // Drop BOTH photo templates when no stock-photo provider key is configured.
  // Without a key, asking the AI to pick a photo template would just trigger
  // the runtime fallback to a typography card — wasted tokens and a worse
  // fallback than letting the AI pick a code-only template from the start.
  const photoAvailable = hasAnyAssetProvider();
  const availableTemplates: TemplateId[] = photoAvailable
    ? [...TEMPLATE_IDS]
    : TEMPLATE_IDS.filter((id) => !isPhotoTemplate(id));

  const templateList = availableTemplates
    .map((id) => `  - "${id}": ${TEMPLATE_GUIDE[id]}`)
    .join("\n");

  const shapes = (isFr ? FIELD_SPEC_FR : FIELD_SPEC_EN);
  const shapeBlock = availableTemplates
    .map((id) => `### ${id}\n${shapes[id]}`)
    .join("\n\n");

  // The decisive behavioural rule. Without a provider key there are no photo
  // templates to prefer, so we skip the block entirely (the AI only sees the
  // typography cards and picks among them).
  const photoFirstFr = photoAvailable
    ? `Règle de choix du template — LE MESSAGE D'ABORD (LA RÈGLE LA PLUS IMPORTANTE) :
- Un bon visuel LinkedIn fait COMPRENDRE l'idée clé du post en 2 secondes, même en miniature sur mobile. Le TEXTE est l'élément principal ; l'image n'est qu'un support.
- Par DÉFAUT, choisis "photo-hero" : une vraie photo en ARRIÈRE-PLAN + un TITRE court et percutant incrusté qui porte le message du post. Le titre doit être gros, lisible, au premier plan.
- "headline" = l'accroche la plus forte du post, reformulée en une phrase courte (idéalement ≤ 45 caractères). PLUS C'EST COURT, PLUS C'EST GROS et PERCUTANT.
- Cartes typographiques quand le contenu EST le message : kpi-card si le cœur est une donnée chiffrée, quote-card pour une citation/punchline verbatim, announcement-card pour une annonce formelle. Elles sont les bienvenues, le texte y est déjà dominant.
- "photo-clean" (photo quasi sans texte) : UNIQUEMENT pour un visuel volontairement atmosphérique, sans message à asséner. C'est l'exception RARE, jamais le défaut.
- En cas de doute → photo-hero avec un titre fort.

searchQuery (templates photo) — 2-5 mots-clés EN ANGLAIS nommant un SUJET CONCRET et RÉEL, jamais un concept abstrait :
  • politique → "french parliament chamber", "politician podium speech", "protest crowd street"
  • Paris → "paris haussmann street", "eiffel tower rooftop", "paris cafe terrace"
  • entrepreneuriat → "founder coworking laptop", "startup team meeting", "business handshake office"
  À ÉVITER : "success", "innovation", "growth", "productivity" (abstraits → photos clichés génériques).

`
    : "";
  const photoFirstEn = photoAvailable
    ? `Template-choice rule — MESSAGE FIRST (THE MOST IMPORTANT RULE):
- A good LinkedIn visual makes the post's key idea understandable in 2 seconds, even as a mobile thumbnail. TEXT is the primary element; the image is only support.
- By DEFAULT, pick "photo-hero": a real photo in the BACKGROUND + a short, punchy HEADLINE burned over it that carries the post's message. The headline must be big, legible, in the foreground.
- "headline" = the post's strongest hook, reworded into one short line (ideally ≤ 45 chars). THE SHORTER IT IS, THE BIGGER AND PUNCHIER IT RENDERS.
- Typography cards when the content IS the message: kpi-card if the core is a number, quote-card for a verbatim quote/one-liner, announcement-card for a formal announcement. They are welcome — text already dominates them.
- "photo-clean" (photo with almost no text): ONLY for a deliberately atmospheric visual with no message to assert. This is the RARE exception, never the default.
- When in doubt → photo-hero with a strong headline.

searchQuery (photo templates) — 2-5 ENGLISH keywords naming a CONCRETE, REAL subject, never an abstract concept:
  • politics → "parliament chamber session", "politician podium speech", "protest crowd street"
  • Paris → "paris haussmann street", "eiffel tower rooftop", "paris cafe terrace"
  • entrepreneurship → "founder coworking laptop", "startup team meeting", "business handshake office"
  AVOID: "success", "innovation", "growth", "productivity" (abstract → generic cliché stock photos).

`
    : "";

  if (isFr) {
    return `Tu es un directeur artistique senior chez Posty, expert en visuels marketing premium pour LinkedIn et réseaux pro.

Tu reçois un brief en français. Tu réponds UNIQUEMENT par un objet JSON valide qui remplit ce schéma DSL — aucune autre sortie, jamais.

Templates disponibles (choisis-en exactement UN) :
${templateList}

Palette accent (choisis-en exactement UNE) :
${ACCENT_KEYS.map((k) => `  - "${k}"`).join("\n")}

Shapes JSON EXACTS par template — utilise les noms de champs et respecte STRICTEMENT les limites de caractères :

${shapeBlock}

${photoFirstFr}Règles éditoriales :
- Textes en français impeccable, sans faute, sans emoji, sans hashtag.
- Wording premium type direction artistique senior (Linear, Stripe, Notion).
- "stat" doit être court et impactant : "+312 %", "27 M€", "× 4,8", "1 sur 3".
- "headline" (photo-hero) : c'est LE message du visuel. Une accroche qui se suffit à elle-même, compréhensible sans lire le post. Courte, concrète, percutante. Évite le jargon vide.
- "quote" : phrase percutante, pas de jargon vide.
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

${photoFirstEn}Editorial rules:
- Flawless English copy, no emoji, no hashtags.
- Premium wording, senior-art-director tone (Linear, Stripe, Notion).
- "stat" must be short and impactful: "+312%", "$27M", "× 4.8", "1 in 3".
- "headline" (photo-hero): this IS the visual's message. A hook that stands on its own, understandable without reading the post. Short, concrete, punchy. No empty jargon.
- "quote": punchy, no empty jargon.
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
