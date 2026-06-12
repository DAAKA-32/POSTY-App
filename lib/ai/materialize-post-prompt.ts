/**
 * Brief → finished LinkedIn post — system prompt.
 *
 * Phase 2 turns a Strategist `PostBrief` (hook + angle + format + rationale)
 * into a publishable LinkedIn post body.
 *
 * QUALITY PARITY (2026-06-12): the system prompt is now assembled by the SAME
 * engine as the main /api/generate "Plan Max" pipeline — `buildOptimizedPrompt`
 * (plan-tier base prompt per mode, voice profile, objective strategy, audience
 * targeting, structure-variation seed, LinkedIn algorithm rules). The brief's
 * free-text `format` is mapped to the engine's binary PostType. A short
 * BRIEF MODE addendum keeps the approved hook/angle and forces a body-only
 * output. The route also aligns the model (gpt-4o) and the plan-aware
 * temperature to Plan Max. Result: Strategist posts reach the same level as
 * posts generated one-by-one in the chat.
 */

import type { PostBrief } from "@/types";
import {
  buildOptimizedPrompt,
  type ProfileFields,
  type PlanTier,
  type PostType,
} from "@/lib/services/prompt-builder";

/**
 * Map the brief's free-text `format` to the Plan Max engine's binary PostType.
 * Narrative formats → storytelling; analytical / expert formats → business.
 */
export function mapFormatToPostType(format: string): PostType {
  const f = (format || "").toLowerCase();
  if (
    f.includes("storytelling") ||
    f.includes("story") ||
    f.includes("récit") ||
    f.includes("recit") ||
    f.includes("anecdote") ||
    f.includes("behind") ||
    f.includes("coulisse") ||
    f.includes("confession") ||
    f.includes("aveu") ||
    f.includes("lesson") ||
    f.includes("leçon") ||
    f.includes("lecon") ||
    f.includes("personal") ||
    f.includes("perso")
  ) {
    return "storytelling";
  }
  // how-to, opinion, contrarian-take, data-drop, case-study, list, analysis…
  return "business";
}

/**
 * Build the SYSTEM prompt for one PostType, reusing the full Plan Max engine.
 *
 * `buildOptimizedPrompt` injects a randomized variation seed, so it MUST be
 * built ONCE per PostType and reused across briefs of that type (the route
 * does exactly this — which also keeps OpenAI prompt caching alive for
 * same-type briefs).
 */
export function buildMaterializeSystemPrompt(opts: {
  language: "fr" | "en";
  /** Raw profile fields (arrays OK) — fed straight to the engine. */
  profile: ProfileFields;
  /** Plan tier — drives the Max-tier base prompt + signature directive. The
   *  Strategist is Max, so callers pass "max". */
  plan: PlanTier;
  /** Brief format already mapped to the engine's PostType by the caller. */
  postType: PostType;
  /** Optional recent post excerpts to anchor style. Short, max 3-4 entries. */
  recentPostSnippets?: string[];
}): string {
  const { language, profile, plan, postType, recentPostSnippets } = opts;

  // THE Plan Max engine — identical to what /api/generate uses for the chat.
  const base = buildOptimizedPrompt(postType, language, profile, plan);

  const styleBlock = recentPostSnippets?.length
    ? recentPostSnippets.map((s, i) => `${i + 1}. ${s}`).join("\n")
    : language === "fr"
      ? "(aucun post précédent — ne pas inventer de style)"
      : "(no prior posts — do not invent a style)";

  const briefMode = language === "fr" ? FR_BRIEF_MODE : EN_BRIEF_MODE;

  return `${base}

═════════════════════════════════════
${language === "fr"
      ? "ANCRAGES DE STYLE (posts récents — calque la cadence, pas le sujet)"
      : "STYLE ANCHORS (recent posts — match the cadence, not the topic)"}
═════════════════════════════════════
${styleBlock}

${briefMode}`;
}

/**
 * Build the USER message — varies per brief.
 *
 * Kept short on purpose: the model already knows the rules (system prompt) and
 * now just needs the one specific approved brief to expand.
 */
export function buildMaterializeUserMessage(opts: {
  language: "fr" | "en";
  brief: PostBrief;
}): string {
  const { language, brief } = opts;
  if (language === "fr") {
    return `Brief à transformer en post LinkedIn complet :

Hook (à utiliser comme accroche — polis la ponctuation, ne change pas l'idée) :
${brief.hook}

Angle (ce que le post doit défendre / montrer / enseigner) :
${brief.angle}

Format : ${brief.format}
Rationale éditoriale (le *pourquoi* — implicite, ne le dis pas) :
${brief.rationale}
${brief.userNote ? `\nNote utilisateur (à respecter) :\n${brief.userNote}` : ""}

Retourne UNIQUEMENT le corps du post.`;
  }
  return `Brief to expand into a complete LinkedIn post:

Hook (use as the opener — polish punctuation, do not change the idea):
${brief.hook}

Angle (what the post must argue / show / teach):
${brief.angle}

Format: ${brief.format}
Editorial rationale (the *why* — keep it implicit, do not state it):
${brief.rationale}
${brief.userNote ? `\nUser note (must respect):\n${brief.userNote}` : ""}

Return ONLY the post body.`;
}

const EN_BRIEF_MODE = `═════════════════════════════════════
BRIEF MODE — you are expanding an APPROVED brief
═════════════════════════════════════
The user message gives you a pre-approved editorial brief (hook + angle + format + rationale).
- Keep the GIVEN hook as the opener — polish punctuation only, never change the idea.
- Build the body on the GIVEN angle, structured to read like the GIVEN format.
- Use the rationale as implicit guidance only — never state it.
- Invent nothing beyond the brief, the author profile, or the user note.
- Apply EVERY quality, voice and LinkedIn-algorithm rule above.
- FINAL CHECKLIST (non-negotiable — these are often skipped): (a) place 1-3 emojis as instructed, never zero unless the tone is strictly formal; (b) if the AUTHOR VOICE block defines a personalized signature, END with it; (c) close on exactly ONE open question OR CTA; (d) 3-5 camelCase hashtags on the last line, always ending with #posty.
- Return ONLY the finished post body — no preamble, no "here is", no commentary, no sign-off label.`;

const FR_BRIEF_MODE = `═════════════════════════════════════
MODE BRIEF — tu développes un brief DÉJÀ VALIDÉ
═════════════════════════════════════
Le message utilisateur te donne un brief éditorial validé (hook + angle + format + rationale).
- Garde le hook FOURNI comme accroche — polis la ponctuation seulement, ne change jamais l'idée.
- Construis le corps sur l'angle FOURNI, avec une structure qui SE LIT comme le format FOURNI.
- Sers-toi de la rationale comme guide implicite uniquement — ne la formule jamais.
- N'invente rien au-delà du brief, du profil de l'auteur ou de la note utilisateur.
- Applique TOUTES les règles de qualité, de voix et d'algorithme LinkedIn ci-dessus.
- CHECKLIST FINALE (non négociable — souvent oubliée) : (a) place 1 à 3 émojis comme indiqué, jamais zéro sauf si le ton est strictement formel ; (b) si le bloc VOIX DE L'AUTEUR définit une signature personnalisée, TERMINE par elle ; (c) clôture sur UNE seule question ouverte OU UN CTA ; (d) 3 à 5 hashtags camelCase sur la dernière ligne, en terminant toujours par #posty.
- Retourne UNIQUEMENT le corps du post fini — pas de préambule, pas de "voici", pas de commentaire ni de label.`;
