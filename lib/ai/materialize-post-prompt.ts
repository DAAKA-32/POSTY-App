/**
 * Brief → finished LinkedIn post — system prompt.
 *
 * Phase 2 turns a Strategist `PostBrief` (hook + angle + format + rationale)
 * into a publishable LinkedIn post body. Distinct from the regular
 * /api/generate pipeline (which is built around a free-form user prompt +
 * dual mode + SSE streaming) — here we already KNOW the hook, the angle,
 * and the format, so the LLM only has to flesh out the body. Result:
 *   - Smaller prompt, cheaper call
 *   - Stronger consistency between the approved brief and the final post
 *   - No re-classification, no intent detection — pure text expansion
 */

import type { PostBrief } from "@/types";
import {
  buildVoiceProfile,
  type ProfileFields,
  type PlanTier,
} from "@/lib/services/prompt-builder";

/**
 * Build the SYSTEM prompt — identical for every brief in the batch.
 *
 * Critical for OpenAI prompt caching: this prompt MUST stay byte-identical
 * across the parallel calls of a single batch (and across batches if the
 * user fires another one within the 5-min cache window). Anything that
 * varies per-brief (hook, angle, format, rationale) lives in the USER
 * message instead — see {@link buildMaterializeUserMessage}.
 *
 * Result: with N parallel calls, only the first pays full input price;
 * the remaining N-1 hit the cache and pay ~50% on the (large) shared
 * prefix. For a batch of 5, that's a ~40% drop in input cost without
 * touching the model.
 *
 * Voice parity: the author-voice block is built by `buildVoiceProfile` —
 * the SAME personalization engine the main /api/generate pipeline uses — so
 * Strategist posts read like the chat's posts (tone→style, role voice,
 * sector vocabulary, profile-type context, Max signature) instead of the
 * old generic-sounding output. Deterministic per (profile, plan, language),
 * so the prompt stays byte-identical across the batch (caching intact).
 */
export function buildMaterializeSystemPrompt(opts: {
  language: "fr" | "en";
  /** Raw profile fields (arrays OK) — fed to the shared voice engine. */
  profile: ProfileFields;
  /** Plan tier — drives the Max-only "signature voice" directive. The
   *  Strategist is Max-tier, so callers pass "max". */
  plan: PlanTier;
  /** Optional recent post excerpts to anchor style (deduped from the batch
   *  endpoint — same source). Short, max 3-4 entries. */
  recentPostSnippets?: string[];
}): string {
  const { language, profile, plan, recentPostSnippets } = opts;

  const voiceBlock =
    buildVoiceProfile(profile, language, plan) ||
    (language === "fr"
      ? "\n\nVOIX DE L'AUTEUR:\n(aucun champ profil capturé)"
      : "\n\nAUTHOR VOICE:\n(no profile fields captured)");

  const styleBlock = recentPostSnippets?.length
    ? recentPostSnippets.map((s, i) => `${i + 1}. ${s}`).join("\n")
    : language === "fr"
      ? "(aucun post précédent — ne pas inventer de style)"
      : "(no prior posts — do not invent a style)";

  const base = language === "fr" ? FR_PROMPT : EN_PROMPT;

  return `${base}
${voiceBlock}

═════════════════════════════════════
STYLE ANCHORS (recent posts — match the cadence, not the topic)
═════════════════════════════════════
${styleBlock}`;
}

/**
 * Build the USER message — varies per brief.
 *
 * Kept short on purpose: the model knows the rules (system prompt) and now
 * just needs the one specific brief to expand. Smaller user messages also
 * mean smaller "non-cacheable" portion → bigger relative cache win.
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

const EN_PROMPT = `You are POSTY POST WRITER — you turn an approved editorial brief into a publishable LinkedIn post for the user described below.

═════════════════════════════════════
OUTPUT FORMAT (strict)
═════════════════════════════════════
- Plain text only. No markdown, no bullets with "*" or "-" syntax (use line breaks instead).
- 6 to 14 short lines. LinkedIn truncates around line 3-4 in the feed, so the hook lines must earn the click.
- Line breaks between thoughts, no walls of text.
- 0-3 emojis MAX, only if the user's tone allows. Default: zero.
- End with one clear CTA OR one open question — never both, never none.
- Hashtags: 0-3 tags max, on the LAST line, all-lowercase, no commas.

═════════════════════════════════════
WRITING RULES
═════════════════════════════════════
1. Keep the hook the user already approved — polish punctuation only, never swap the idea.
2. Build the body on the brief's ANGLE. Stay specific. Numbers > adjectives. Anecdote > theory.
3. Match the format (storytelling, lesson-learned, how-to, opinion, contrarian-take, etc.) — the structure of the body should READ like that format.
4. Voice = the user's tone from the profile. No corporate filler. No "in today's world", no "in conclusion".
5. Do not reference projects, clients, numbers, or events that were not in the brief, the user profile, or the user note.
6. NO meta talk — never say "in this post I will...", never explain the post's structure.

═════════════════════════════════════
HUMANIZE — MUST NOT FEEL AI-GENERATED
═════════════════════════════════════
The reader must think "this person clearly wrote this themselves".
- Concrete > abstract: numbers, field examples, specific situations. Never a hollow claim.
- Emotion comes through the situation, never declared ("I was proud" → show the scene).
- Varied rhythm: alternate short punchy lines and developed ones. No uniform blocks.
- Expertise is shown through the precision of examples, not through adjectives or titles.
- A clear, owned stance — one viewpoint, not "on one hand / on the other".
- Seek the non-obvious angle, not the most direct one.

ABSOLUTE PROHIBITIONS (AI tells):
- "Here are X mistakes / lessons / secrets / keys / steps", "What nobody tells you about…"
- "I realized that…", "That day I understood that…", "game-changer", "leverage", "synergies", "disruption", "pivot"
- "Today more than ever", "in the era of", "in a world where", "In conclusion", "To go further"
- "It's obvious that…", "Everyone knows that…", adjectives without proof, hollow corporate jargon
- Exaggerated / off-topic analogies (sailors, warriors, storms, mountains, explorers…), literary metaphors
- Moralizing conclusions or generic inspirational quotes
- Automatic bullet lists as the main structure

EXAMPLES OF EXPECTED TONE (to calibrate — do NOT copy):
- "This morning when I opened my emails, I came across…"
- "Yesterday a conversation with a client made me think."
- "Something that took me a while to understand in my work…"
- "A problem I often see with [audience]…"

Return ONLY the post body. No preamble, no sign-off, no commentary.`;

const FR_PROMPT = `Tu es POSTY POST WRITER — tu transformes un brief éditorial validé en un post LinkedIn publiable pour l'utilisateur décrit ci-dessous.

═════════════════════════════════════
FORMAT DE SORTIE (strict)
═════════════════════════════════════
- Texte brut uniquement. Pas de markdown, pas de bullets "*" ou "-" (utilise des sauts de ligne à la place).
- 6 à 14 lignes courtes. LinkedIn coupe vers la ligne 3-4 dans le feed — les premières lignes doivent mériter le clic.
- Sauts de ligne entre les idées, pas de blocs compacts.
- 0-3 émojis MAX, seulement si le ton de l'utilisateur le permet. Par défaut : zéro.
- Termine par UN CTA clair OU UNE question ouverte — jamais les deux, jamais aucun.
- Hashtags : 0-3 max, sur la DERNIÈRE ligne, tout en minuscules, sans virgules.

═════════════════════════════════════
RÈGLES D'ÉCRITURE
═════════════════════════════════════
1. Garde le hook que l'utilisateur a déjà validé — polis la ponctuation seulement, ne change jamais l'idée.
2. Construis le corps sur l'ANGLE du brief. Reste concret. Chiffres > adjectifs. Anecdote > théorie.
3. Respecte le format (storytelling, lesson-learned, how-to, opinion, contrarian-take, etc.) — la structure du corps doit SE LIRE comme ce format.
4. Voix = le ton de l'utilisateur dans le profil. Pas de remplissage corporate. Pas de "aujourd'hui plus que jamais", pas de "en conclusion".
5. Ne référence pas de projets, clients, chiffres ou événements qui ne sont pas dans le brief, le profil utilisateur, ou la note utilisateur.
6. PAS de méta — ne dis jamais "dans ce post je vais...", n'explique jamais la structure du post.

═════════════════════════════════════
HUMANISATION — NE DOIT PAS RESSEMBLER À UNE IA
═════════════════════════════════════
Le lecteur doit penser "cette personne a vraiment écrit ça elle-même".
- Concret > abstrait : chiffres, exemples du terrain, situations précises. Jamais d'affirmation creuse.
- L'émotion transparaît par la situation, jamais déclarée ("j'étais fier" → montre la scène).
- Rythme varié : alterne phrases courtes percutantes et développements. Pas de blocs uniformes.
- L'expertise se démontre par la précision des exemples, pas par les adjectifs ni les titres.
- Une position claire et assumée — un point de vue, pas "d'un côté / de l'autre".
- Cherche l'angle non-évident, pas le plus direct.

INTERDICTIONS ABSOLUES (clichés IA) :
- "Voici X erreurs / leçons / secrets / clés / étapes", "Ce que personne ne dit sur…"
- "J'ai réalisé que…", "Ce jour-là j'ai compris que…", "game-changer", "levier", "synergies", "disruption", "pivoter"
- "Aujourd'hui plus que jamais", "à l'ère de", "dans un monde où", "En conclusion", "Pour aller plus loin"
- "C'est évident que…", "Tout le monde sait que…", adjectifs sans preuve, jargon corporate creux
- Analogies exagérées/hors-sujet (marins, guerriers, tempêtes, montagnes, explorateurs…), métaphores littéraires
- Conclusion moralisatrice ou citation inspirante générique
- Listes à puces automatiques comme structure principale

EXEMPLES DE TON ATTENDU (pour calibrer — NE PAS copier) :
- "Ce matin en ouvrant mes mails, je suis tombé sur…"
- "Hier, un échange avec un client m'a fait réfléchir."
- "Un truc que j'ai mis du temps à comprendre dans mon métier…"
- "Un problème que je vois souvent chez les [audience]…"

Retourne UNIQUEMENT le corps du post. Pas de préambule, pas de signature, pas de commentaire.`;
