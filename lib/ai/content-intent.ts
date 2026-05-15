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

RÈGLES de classification:

1. "image" — la demande mentionne UNIQUEMENT un visuel/image/photo/illustration/visuel.
   Exemples: "fais une image sur l'entrepreneuriat", "génère un visuel startup",
             "crée une publicité SaaS", "fais-moi une illustration moderne".
   Dans ce cas, mets imageBrief mais PAS postBrief.

2. "post" — la demande mentionne UNIQUEMENT un post/texte/article LinkedIn.
   Exemples: "fais un post sur X", "écris un post LinkedIn", "rédige un post growth".
   Dans ce cas, mets postBrief mais PAS imageBrief.

3. "both" — la demande mentionne EXPLICITEMENT un post LinkedIn ET un
   visuel/image/photo/illustration. Les DEUX modalités (texte + image)
   doivent être présentes. Une explication conversationnelle suivie d'un
   post n'est PAS "both" — c'est juste un post avec contexte explicatif,
   et tu réponds "post".
   Exemples "both" valides:
     - "fais un post avec un visuel"
     - "post LinkedIn + image moderne"
     - "génère un post et une image qui l'accompagne"
   Contre-exemples (à classer "post", PAS "both"):
     - "explique-moi X puis fais-moi un post dessus" → post (le "puis"
       relie deux étapes texte, pas un visuel)
     - "parle-moi de Y et rédige un post" → post
   Dans ce cas (vrai "both"), mets postBrief ET imageBrief, chacun scopé.

4. "conversation" — c'est une question, un avis, un brainstorming, une discussion.
   Exemples: "tu connais X ?", "comment améliorer mon marketing ?",
             "donne-moi des idées", "explique-moi le content marketing".
   Dans ce cas, ne mets ni postBrief ni imageBrief.

Quand le mot "post" est absent ET aucun mot image n'est présent ("fais sur l'entrepreneuriat"),
considère que c'est un POST (intent par défaut Posty).

postBrief / imageBrief: reformule la demande de manière propre, concise, sans le mot
"fais" ou "crée" — juste le sujet/contenu attendu. Exemple:
- Input: "fais une image moderne sur l'IA en startup"
- imageBrief: "visuel moderne sur l'IA en startup"

Confiance: 1.0 quand le mot-clé est explicite, 0.7 quand c'est implicite,
0.5 si vraiment ambigu (par défaut, choisis "post").

Ne renvoie rien d'autre que l'objet JSON.`;

/**
 * Run the classifier. The OpenAI key must already be in env; the function
 * throws on missing key so the caller can surface a clean 503 — never a
 * silent fallback to the wrong pipeline.
 */
export async function classifyContentIntent(
  prompt: string,
  hasPriorConversation: boolean = false
): Promise<ContentIntent> {
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
    model: "gpt-4o-mini",
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
  return check.data;
}

/**
 * Cheap regex pre-pass used when we want to short-circuit obvious cases
 * without paying for an LLM call. Returns null if the prompt is ambiguous,
 * letting the caller fall back to `classifyContentIntent`.
 *
 * Why we keep this: a single image-only request like "fais une image sur X"
 * is unambiguous in ~99% of cases. Skipping the LLM here saves ~250ms +
 * a token cost on the most common pattern.
 */
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

  // HYBRID first — explanation + post in one ask.
  if (EXPLAIN_TRIGGERS.test(lower) && (PRODUCTION_TRIGGERS.test(lower)
    || /\b(puis|ensuite|et\s+(fais|fait|cr[eé]e|[eé]cris|r[eé]dige)|then\s+(write|create|make|draft)|and\s+(write|create|make|draft))/i.test(lower))) {
    return "HYBRID";
  }
  // Explicit PRODUCTION request always wins.
  if (PRODUCTION_TRIGGERS.test(lower) || /\bpost\s+(sur|about|on)\s+\w/i.test(lower) || /\blinkedin\s+post\b/i.test(lower)) {
    return "PRODUCTION";
  }
  // SOCIAL: greetings / small talk, short standalone messages.
  if (/^(coucou|salut|hello|hey|hi|yo|bonjour|bonsoir|hola|wesh)[\s!.,?]*$/i.test(lower)
    || /^(ça va|ca va|comment ça va|comment ca va|how are you|what's up|quoi de neuf|sup)[\s!?,]*$/i.test(lower)
    || /^(merci|thanks|thank you|cool|nickel|parfait|super|génial|great|ok|d'accord|ouais|yes|no|non)[\s!.,]*$/i.test(lower)) {
    return "SOCIAL";
  }
  // ASSISTANCE: questions, explanations, advice, ideas, analysis.
  if (raw.endsWith("?")
    || /^(comment|pourquoi|quand|qui|est-?ce|peux-tu|tu connais|tu peux|donne-?moi des id[eé]es|explique|c'est quoi|qu'est-?ce)/i.test(lower)
    || /\b(conseils?|astuces?|tips?|strat[eé]gie|recommandations?|aide|help)\b/i.test(lower)
    || /\b(analyse|review|am[eé]liore|reformule|critique)\b/i.test(lower)) {
    return "ASSISTANCE";
  }
  return null;
}

export function fastClassifyIntent(prompt: string): ContentIntent | null {
  const lower = prompt.toLowerCase().trim();
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

  const imageWords = /(\bimage\b|\bvisuel\b|\billustration\b|\bphoto\b|\bpublicit[eé]\b|\bbanni[eè]re\b|\bcover\b|\bgraphique\b)/i;
  const postWords = /(\bpost\b|\barticle\b|\bcaption\b|\bcopy\b|\br[eé]dige\b)/i;
  const conversationWords = /^(comment|pourquoi|quand|qui|est-?ce|peux-tu|tu connais|tu peux|donne-?moi des id[eé]es|explique|c'est quoi|qu'est-?ce)/i;

  const hasImage = imageWords.test(lower);
  const hasPost = postWords.test(lower);
  const hasQuestion = conversationWords.test(lower) || /\?$/.test(lower);

  // Unambiguous image-only
  if (hasImage && !hasPost && !hasQuestion) {
    return {
      intent: "image",
      confidence: 0.95,
      imageBrief: prompt
        .replace(/^(fais|cr[eé]e?|g[eé]n[eè]re|montre-?moi|donne-?moi)\s+(une?|le|la)?\s*/i, "")
        // Keep the noun ("image", "visuel"…) — it tells the AI what to build —
        // but normalize the spacing so we don't pass "image  sur X" downstream.
        .replace(/\s+/g, " ")
        .trim(),
    };
  }
  // Unambiguous post + image combo
  if (hasImage && hasPost && !hasQuestion) {
    return {
      intent: "both",
      confidence: 0.9,
      postBrief: prompt,
      imageBrief: prompt,
      postType: "PRODUCTION",
    };
  }
  // Conversational pure question — no creation verb anywhere
  if (hasQuestion && !hasImage && !hasPost && !/\b(fais|cr[eé]e?|g[eé]n[eè]re|r[eé]dige|[eé]cris)\b/i.test(lower)) {
    return {
      intent: "conversation",
      confidence: 0.85,
      postType: fastClassifyPostType(prompt) ?? "ASSISTANCE",
    };
  }
  return null; // Let the LLM decide
}
