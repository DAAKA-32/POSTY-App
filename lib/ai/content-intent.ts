/**
 * Content-intent classifier.
 *
 * One short LLM call (gpt-4o-mini, JSON mode) that reads a free-form prompt
 * and decides what the user actually wants Posty to produce:
 *
 *   - "post"         → LinkedIn post text (default flow)
 *   - "image"        → a visual only (no post body)
 *   - "both"         → a post AND a matching visual, fired in parallel
 *   - "conversation" → conversational reply (advice, Q&A, brainstorming)
 *
 * The classifier also extracts a short `postBrief` and/or `imageBrief` so the
 * post / image pipelines downstream don't have to re-read the original prompt
 * — they each receive a clean, scoped instruction.
 *
 * Designed to be cheap (~$0.0001/call) and fast (~150-300ms). The route that
 * uses it caches nothing — content intent is highly prompt-specific so a
 * cache would barely hit.
 *
 * 2026-05-26 refactor: the fast-path regex AND the LLM prompt were both
 * tightened to distinguish an image noun used as a SUBJECT ("fais un post
 * SUR la photo de mariage") from an image noun used as a DELIVERABLE
 * ("fais un post AVEC une photo"). The old version routed both to "both"
 * and produced phantom image loaders on text-only requests.
 */

import OpenAI from "openai";
import { z } from "zod";

/**
 * Sub-classification for prompts routed to the post pipeline. Matches the
 * IntentType used internally by /api/generate so the route can use this as
 * a hint and skip its own classification pass entirely:
 *   - PRODUCTION : explicit post request ("fais un post sur X")
 *   - HYBRID     : conversational explanation + post ("explique X puis fais un post")
 *   - ASSISTANCE : ideas, advice, brainstorming, analysis
 *   - SOCIAL     : pure greeting / small talk
 */
export const PostTypeEnum = z.enum(["PRODUCTION", "HYBRID", "ASSISTANCE", "SOCIAL"]);
export type PostType = z.infer<typeof PostTypeEnum>;

export const ContentIntentSchema = z.object({
  intent: z.enum(["post", "image", "both", "conversation"]),
  confidence: z.number().min(0).max(1),
  /** Cleaned, scoped instruction for the post pipeline. Only set when
   *  intent ∈ {"post", "both"}. */
  postBrief: z.string().min(1).max(800).optional(),
  /** Cleaned, scoped instruction for the image pipeline. Only set when
   *  intent ∈ {"image", "both"}. */
  imageBrief: z.string().min(1).max(800).optional(),
  /** Hint for /api/generate's internal routing — when set, the post route
   *  trusts this value and skips its own classifier. Only set when
   *  intent ∈ {"post", "both", "conversation"}. */
  postType: PostTypeEnum.optional(),
});

export type ContentIntent = z.infer<typeof ContentIntentSchema>;

const SYSTEM_PROMPT = `Tu es un classifieur d'intention pour Posty, un assistant IA qui peut générer:
- des POSTS LinkedIn (texte uniquement)
- des IMAGES marketing (visuels carrés, code-only)
- ou les DEUX simultanément
- ou simplement RÉPONDRE comme un assistant conversationnel

Tu lis la demande utilisateur et tu réponds UNIQUEMENT par un objet JSON:

{
  "intent": "post" | "image" | "both" | "conversation",
  "confidence": 0.0 à 1.0,
  "postBrief": "<instruction nettoyée pour le pipeline post, si applicable>",
  "imageBrief": "<instruction nettoyée pour le pipeline image, si applicable>"
}

═══════════════════════════════════════════════════════════════════
RÈGLE FONDAMENTALE — ASSET COMME LIVRABLE vs ASSET COMME SUJET
═══════════════════════════════════════════════════════════════════

Un mot d'asset visuel (image, visuel, photo, illustration, publicité, bannière, carrousel, mockup, etc.) peut apparaître dans deux fonctions très différentes:

1. LIVRABLE (l'utilisateur veut qu'on lui RENDE ce visuel)
   → préposition "avec / + / et / accompagné de"
   → verbe additif "ajoute / mets / rajoute / inclus"
   → verbe créatif direct "fais une image / génère un visuel"
   Exemples LIVRABLE:
     - "fais un post avec une image"            → both
     - "post LinkedIn + visuel"                 → both
     - "ajoute des visuels"                     → image
     - "fais une image moderne sur l'IA"        → image

2. SUJET (l'utilisateur parle DU thème "la photo", "la pub", mais veut juste du texte)
   → préposition "sur / à propos de / au sujet de / concernant"
   → le mot d'asset est introduit comme topic, pas comme objet à produire
   Exemples SUJET (à classer "post", JAMAIS "image" ni "both"):
     - "fais un post sur la photo de mariage"           → post
     - "rédige un article sur la publicité digitale"    → post
     - "post LinkedIn sur l'industrie graphique"        → post
     - "fais un post sur les illustrations IA"          → post
     - "post sur Instagram Stories"                     → post
     - "fais un post sur l'impact visuel des marques"   → post

Si tu doutes entre LIVRABLE et SUJET, défaut = SUJET → classe "post".
Posty a un bouton "Ajouter des visuels" sous chaque post : l'utilisateur peut générer un visuel après coup s'il en veut un. Une génération d'image non demandée est un bug grave qui détruit l'UX. Une absence de génération quand l'utilisateur en voulait une est récupérable en un clic.

═══════════════════════════════════════════════════════════════════
RÈGLES DE CLASSIFICATION (dans l'ordre de priorité)
═══════════════════════════════════════════════════════════════════

1. "both" — la demande contient:
   - un mot de post/article ET
   - un mot d'asset visuel ET
   - un signal LIVRABLE clair (préposition "avec/+/et" entre les deux, OU verbe créatif partagé)
   Exemples valides "both":
     - "fais un post avec un visuel"
     - "post LinkedIn + image moderne"
     - "génère un post et une image qui l'accompagne"
     - "rédige un post avec illustration"
   Contre-exemples (PAS "both", à classer "post"):
     - "fais un post sur la photo"          (sur = sujet)
     - "explique-moi X puis fais un post"   ("puis" relie deux étapes texte)
     - "fais un post à propos des visuels"  ("à propos de" = sujet)

2. "image" — l'utilisateur veut UN OU PLUSIEURS visuels comme LIVRABLE PRINCIPAL:
   a) Création standalone: "fais une image", "génère un visuel", "crée une publicité SaaS"
      → mot d'asset présent + verbe créatif + AUCUN mot de post
   b) Ajout additif dans une conversation: "ajoute des images", "mets des visuels",
      "rajoute un carrousel", "inclus 3 illustrations"
      → verbe additif + mot d'asset
   Dans ce cas: imageBrief rempli, postBrief vide.

3. "post" — DÉFAUT pour la plupart des demandes textuelles. À choisir si:
   - Le prompt mentionne un post/article SANS signal livrable d'image
   - OU le prompt mentionne un mot d'asset uniquement comme SUJET
   - OU le prompt ne mentionne ni image-livrable ni question pure
   Exemples:
     - "fais un post sur X"                     → post (PRODUCTION)
     - "rédige un post growth"                  → post (PRODUCTION)
     - "fais un post sur la photographie"       → post (SUJET, pas LIVRABLE)
     - "explique-moi X puis fais un post"       → post (HYBRID)

4. "conversation" — questions pures, brainstorming, conseils, analyses:
   - "tu connais X ?", "comment améliorer mon marketing ?"
   - "donne-moi des idées", "explique-moi le content marketing"
   - "ça va ?", "merci", "ok parfait" → conversation (SOCIAL)
   Le prompt ne demande PAS de livrable créatif (ni post ni image).

═══════════════════════════════════════════════════════════════════
RÈGLES DE BRIEF
═══════════════════════════════════════════════════════════════════

postBrief / imageBrief: reformule la demande de manière propre, concise, sans le verbe
"fais"/"crée"/"génère" — juste le sujet/contenu attendu. Exemple:
- Input: "fais une image moderne sur l'IA en startup"
- imageBrief: "visuel moderne sur l'IA en startup"

═══════════════════════════════════════════════════════════════════
CONFIANCE
═══════════════════════════════════════════════════════════════════

- 1.0 quand le signal livrable/sujet est totalement explicite
- 0.7 quand c'est implicite mais clair
- 0.5 si vraiment ambigu (par défaut, choisis "post" — c'est la classe la plus sûre)

Ne renvoie rien d'autre que l'objet JSON.`;

/**
 * Run the classifier. The OpenAI key must already be in env; the function
 * throws on missing key so the caller can surface a clean 503 — never a
 * silent fallback to the wrong pipeline.
 */
/** Wire-level model used by the intent classifier (exported so the route can attribute cost). */
export const INTENT_MODEL = "gpt-4o-mini";

export interface ClassifyContentIntentResult {
  intent: ContentIntent;
  /** Raw token usage from the OpenAI response, used by the cost tracker. */
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
  };
}

export async function classifyContentIntent(
  prompt: string,
  hasPriorConversation: boolean = false
): Promise<ClassifyContentIntentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }
  // 8s hard cap — the classifier runs BEFORE the user sees anything, so a
  // slow OpenAI day shouldn't make Posty feel hung. Worst case we fall back
  // to the "post" default and the user gets a post pipeline run (safe).
  const openai = new OpenAI({ apiKey, timeout: 8_000, maxRetries: 0 });

  // The "prior conversation" hint helps the model decide between "image"
  // (standalone) and "both" (post + image in a chat that already has posts).
  const userPrompt = hasPriorConversation
    ? `Conversation en cours. Demande: """${prompt}"""`
    : `Demande: """${prompt}"""`;

  const completion = await openai.chat.completions.create({
    model: INTENT_MODEL,
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 250,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("intent classifier returned empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("intent classifier returned non-JSON");
  }

  const check = ContentIntentSchema.safeParse(parsed);
  if (!check.success) {
    throw new Error("intent classifier response failed schema validation");
  }

  const usage = completion.usage;
  return {
    intent: check.data,
    usage: {
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
      cachedInputTokens: usage?.prompt_tokens_details?.cached_tokens ?? 0,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Regex fast-path
// ──────────────────────────────────────────────────────────────────────────
// Mirrors lib/ai/client-intent.ts EXACTLY so the server fast-path and the
// client pre-pass make the same decision. When you change one, change the
// other. Both default to POST in ambiguous cases — see the rule in the
// system prompt above.

const IMAGE_NOUNS_SRC = `images?|visuels?|illustrations?|photos?|publicit[eé]s?|banni[eè]res?|banners?|covers?|graphiques?|cr[eé]as?|assets?|slides?|carrousels?|carousels?|infographies?|infographics?|mockups?|vignettes?|pictures?`;
// Unicode-aware "word boundaries" — JS's native `\b` fails AFTER accented
// letters ("publicité" + space wouldn't match `\b` because `é` is treated
// as non-word). See the matching block in client-intent.ts for the full
// rationale. Both files MUST use the same constants or they will diverge.
const WB_PRE = `(?<![A-Za-z\\u00C0-\\u024F0-9_])`;
const WB_POST = `(?![A-Za-z\\u00C0-\\u024F0-9_])`;
const IMAGE_NOUNS_RE = new RegExp(`${WB_PRE}(?:${IMAGE_NOUNS_SRC})${WB_POST}`, "i");

const POST_NOUNS_SRC = `posts?|articles?|captions?|copys?|copies?|drafts?|contenus?|publications?|stor(?:y|ies)`;
const POST_NOUNS_RE = new RegExp(`${WB_PRE}(?:${POST_NOUNS_SRC})${WB_POST}`, "i");
const POST_REDIGE = new RegExp(`${WB_PRE}r[eé]dig(?:e|er|es|ent)${WB_POST}`, "i");

const ADDITIVE_VERBS_SRC = `ajoute|ajouter|rajoute|rajouter|mets|met|mettre|inclus|inclu|colle|joins|joindre|compl[eè]te|compl[eè]ter|adjoint|add(?:s|ed|ing)?|attach(?:es|ed|ing)?`;
const CREATE_VERBS_SRC = `fais|fait|faire|cr[eé]e|cr[eé]er|cr[eé]é|[eé]cris|[eé]crit|[eé]crire|g[eé]n[eè]re|g[eé]n[eè]rer|r[eé]dige|r[eé]diger|compose|composer|pr[eé]pare|pr[eé]parer|write|create|generate|make|draft|design`;

const QUESTION_OPENERS = /^(?:comment|pourquoi|quand|qui|est-?ce|peux-tu|tu connais|tu peux|donne-?moi des id[eé]es|explique|c'est quoi|qu'est-?ce|how|why|when|who|what|can you|do you know)/i;

const IMAGE_AS_ADJECTIVE = new RegExp(
  `${WB_PRE}(?:impact|aspect|style|c[oô]t[eé]|design|rendu|effet|attrait|appel|approche|fil|guideline|charte|identit[eé])\\s+(?:visuels?|graphiques?)${WB_POST}`,
  "i"
);

const SUBJECT_PREP_BEFORE_IMAGE = new RegExp(
  `${WB_PRE}(?:sur|[aà]\\s+propos\\s+de|au\\s+sujet\\s+de|concernant|about|on|regarding|over|de(?:\\s+la)?)${WB_POST}\\s+(?:un|une|des|le|la|les|l['’]|mon|ma|mes|ton|ta|tes|son|sa|ses|leur|leurs|du|de\\s+l['’]?|d['’])?\\s*(?:[\\w\\u00C0-\\u024F]+\\s+){0,3}(?:${IMAGE_NOUNS_SRC})${WB_POST}`,
  "i"
);

const ADDITIVE_DELIVERABLE = new RegExp(
  `${WB_PRE}(?:${ADDITIVE_VERBS_SRC})${WB_POST}(?:[- ](?:moi|me|nous|us))?\\s+(?:un|une|des|le|la|les|quelques|plusieurs|mes|tes|ses|leur|leurs|\\d+|trois|quatre|cinq|two|three|four|five)?\\s*(?:[\\w\\u00C0-\\u024F]+\\s+){0,2}(?:${IMAGE_NOUNS_SRC})${WB_POST}`,
  "i"
);

const STANDALONE_IMAGE_CREATION = new RegExp(
  `${WB_PRE}(?:${CREATE_VERBS_SRC})${WB_POST}(?:[- ](?:moi|me|nous|us))?\\s+(?:un|une|des|le|la|les|quelques|plusieurs|\\d+|trois|quatre|cinq|two|three|four|five)?\\s*(?:[\\w\\u00C0-\\u024F]+\\s+){0,2}(?:${IMAGE_NOUNS_SRC})${WB_POST}`,
  "i"
);

const DELIVERABLE_PREP_IMAGE = new RegExp(
  `(?:${WB_PRE}(?:avec|with|accompagn[eé](?:s|es|[eé]es?)?\\s+(?:d['’]?|de|par)?|illustr[eé](?:s|es|[eé]es?)?\\s+(?:par|d['’]?|de|avec)?|including|incluant|inclu(?:s|ses)?|comprenant)${WB_POST}|[+&])\\s*(?:un|une|des|le|la|les|quelques|plusieurs|\\d+|trois|quatre|cinq|two|three|four|five)?\\s*(?:[\\w\\u00C0-\\u024F]+\\s+){0,2}(?:${IMAGE_NOUNS_SRC})${WB_POST}`,
  "i"
);

const POST_AND_IMAGE = new RegExp(
  `${WB_PRE}(?:${POST_NOUNS_SRC})${WB_POST}[^.!?]*?\\s(?:et|and|puis)\\s+(?:un|une|des|le|la|quelques|plusieurs|\\d+)?\\s*(?:[\\w\\u00C0-\\u024F]+\\s+){0,2}(?:${IMAGE_NOUNS_SRC})${WB_POST}`,
  "i"
);

/**
 * Sub-classify a prompt that's heading to the post pipeline. Mirrors the
 * fast-path regex inside /api/generate (PRODUCTION / HYBRID / ASSISTANCE /
 * SOCIAL) so the downstream route can trust this value as a hint and skip
 * its own classifier. Returns null when the prompt is too ambiguous — the
 * caller falls back to PRODUCTION as a safe default for "intent=post".
 */
function fastClassifyPostType(prompt: string): PostType | null {
  const raw = prompt.trim();
  const lower = raw.toLowerCase();

  const PRODUCTION_TRIGGERS = /\b(fais|fait|cr[eé]e|cr[eé]é|[eé]cris|[eé]crit|g[eé]n[eè]re|r[eé]dige|compose|pr[eé]pare|write|create|generate|make|draft)\s*(moi|me|nous)?\s*(un|une|des|le|la|a|an|the)?\s*(post|article|texte|contenu|publication|story|carrousel)/i;
  const EXPLAIN_TRIGGERS = /\b(explique|explique-moi|parle-moi|raconte-moi|dis-moi|d[eé]taille|r[eé]sume|c'?est quoi|qu'?est[- ]ce que|peux-tu (m')?expliquer|explain|tell me (about|what)|describe|walk me through|summarize)/i;

  if (EXPLAIN_TRIGGERS.test(lower) && (PRODUCTION_TRIGGERS.test(lower)
    || /\b(puis|ensuite|et\s+(fais|fait|cr[eé]e|[eé]cris|r[eé]dige)|then\s+(write|create|make|draft)|and\s+(write|create|make|draft))/i.test(lower))) {
    return "HYBRID";
  }
  if (PRODUCTION_TRIGGERS.test(lower) || /\bpost\s+(sur|about|on)\s+\w/i.test(lower) || /\blinkedin\s+post\b/i.test(lower)) {
    return "PRODUCTION";
  }
  if (/^(coucou|salut|hello|hey|hi|yo|bonjour|bonsoir|hola|wesh)[\s!.,?]*$/i.test(lower)
    || /^(ça va|ca va|comment ça va|comment ca va|how are you|what's up|quoi de neuf|sup)[\s!?,]*$/i.test(lower)
    || /^(merci|thanks|thank you|cool|nickel|parfait|super|génial|great|ok|d'accord|ouais|yes|no|non)[\s!.,]*$/i.test(lower)) {
    return "SOCIAL";
  }
  if (raw.endsWith("?")
    || /^(comment|pourquoi|quand|qui|est-?ce|peux-tu|tu connais|tu peux|donne-?moi des id[eé]es|explique|c'est quoi|qu'est-?ce)/i.test(lower)
    || /\b(conseils?|astuces?|tips?|strat[eé]gie|recommandations?|aide|help)\b/i.test(lower)
    || /\b(analyse|review|am[eé]liore|reformule|critique)\b/i.test(lower)) {
    return "ASSISTANCE";
  }
  return null;
}

/**
 * Decide if a prompt contains a clear DELIVERABLE signal for an image.
 * Conservative — when in doubt, returns no signal so the caller defaults
 * to the post pipeline.
 */
function detectImageDeliverableServer(lower: string): {
  isAdditive: boolean;
  isStandaloneCreation: boolean;
  isPairedWithPost: boolean;
} {
  // Strip adjective compounds ("impact visuel") so they don't trigger
  // the deliverable patterns below.
  const cleaned = lower.replace(IMAGE_AS_ADJECTIVE, " ");
  const subjectOnly = SUBJECT_PREP_BEFORE_IMAGE.test(cleaned);

  const isAdditive = ADDITIVE_DELIVERABLE.test(cleaned);
  const pairedPrep = DELIVERABLE_PREP_IMAGE.test(cleaned) || POST_AND_IMAGE.test(cleaned);
  const standalone = STANDALONE_IMAGE_CREATION.test(cleaned) && !POST_NOUNS_RE.test(cleaned) && !POST_REDIGE.test(cleaned);
  const standaloneSafe = standalone && (!subjectOnly || isAdditive || pairedPrep);

  return {
    isAdditive,
    isStandaloneCreation: standaloneSafe,
    isPairedWithPost: pairedPrep,
  };
}

/**
 * Cheap regex pre-pass used when we want to short-circuit obvious cases
 * without paying for an LLM call. Returns null if the prompt is ambiguous,
 * letting the caller fall back to `classifyContentIntent`.
 *
 * 2026-05-26 refactor: tightened so a bare image noun never routes to
 * image/both unless paired with a deliverable verb or preposition. Subject
 * mentions ("fais un post SUR la photo") now correctly land on "post".
 */
export function fastClassifyIntent(prompt: string): ContentIntent | null {
  const raw = prompt.trim();
  const lower = raw.toLowerCase();
  if (lower.length < 2) return null;

  // Short greetings / acknowledgements — instant conversation classification
  // with SOCIAL post-type. Catches "salut", "hello", "merci", "ok", etc.
  // BEFORE we look for image/post markers so we never mis-route a 5-char
  // social ping to the post pipeline.
  if (/^(coucou|salut|hello|hey|hi|yo|bonjour|bonsoir|hola|wesh)[\s!.,?]*$/i.test(lower)
    || /^(ça va|ca va|comment ça va|comment ca va|how are you|what's up|quoi de neuf|sup)[\s!?,]*$/i.test(lower)
    || /^(merci|thanks|thank you|cool|nickel|parfait|super|génial|great|ok|d'accord|ouais|yes|no|non)[\s!.,]*$/i.test(lower)) {
    return {
      intent: "conversation",
      confidence: 0.95,
      postType: "SOCIAL",
    };
  }

  const hasImage = IMAGE_NOUNS_RE.test(lower);
  const hasPost = POST_NOUNS_RE.test(lower) || POST_REDIGE.test(lower);
  const hasQuestion = QUESTION_OPENERS.test(lower) || raw.endsWith("?");

  const deliverable = detectImageDeliverableServer(lower);

  // intent="both" — post + image deliverable in the same ask.
  if (hasPost && deliverable.isPairedWithPost && !hasQuestion) {
    return {
      intent: "both",
      confidence: 0.95,
      postBrief: prompt,
      imageBrief: prompt,
      postType: "PRODUCTION",
    };
  }

  // intent="image" — image is the primary deliverable.
  if (deliverable.isAdditive && !hasQuestion) {
    return {
      intent: "image",
      confidence: 0.95,
      imageBrief: cleanImageBrief(prompt),
    };
  }
  if (deliverable.isStandaloneCreation && !hasPost && !hasQuestion) {
    return {
      intent: "image",
      confidence: 0.9,
      imageBrief: cleanImageBrief(prompt),
    };
  }

  // intent="post" — explicit post mention with no image deliverable.
  // CRITICAL: image-noun-as-subject ("post sur la photo") lands here.
  if (hasPost && !hasQuestion) {
    return {
      intent: "post",
      confidence: hasImage ? 0.75 : 0.9,
      postBrief: prompt,
      postType: fastClassifyPostType(prompt) ?? "PRODUCTION",
    };
  }

  // intent="conversation" — pure question with no creation verb.
  if (hasQuestion && !hasImage && !hasPost && !/\b(fais|cr[eé]e?|g[eé]n[eè]re|r[eé]dige|[eé]cris)\b/i.test(lower)) {
    return {
      intent: "conversation",
      confidence: 0.85,
      postType: fastClassifyPostType(prompt) ?? "ASSISTANCE",
    };
  }

  return null; // Let the LLM decide
}

function cleanImageBrief(prompt: string): string {
  return prompt
    .replace(/^(fais|cr[eé]e?|g[eé]n[eè]re|montre-?moi|donne-?moi|ajoute(?:-moi)?|rajoute|mets(?:-moi)?|inclus|write|create|generate|make|draft|add)\s+(une?|des|le|la|quelques|plusieurs|\d+)?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}
