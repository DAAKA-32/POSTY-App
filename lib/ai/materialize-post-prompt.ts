/**
 * Strategist brief → post: everything the Strategist adds on top of the shared
 * engine (lib/services/post-generator).
 *
 * The engine still owns the canonical prompt (base ghostwriter prompt, voice
 * profile, emoji policy, anti-AI craft rules), the model, the temperature and
 * the quality gate. The Strategist runs it in BRIEF MODE: the random variation
 * seed, the Max authority posture, the objective funnel, the fixed exemplar and
 * the first-name signature are left out (they fought the approved brief), and
 * the LENGTH / ENGAGEMENT craft sections are replaced by format-aware ones.
 *
 * What this module contributes, per brief:
 *   - the FORMAT block (alternative skeletons, closing, emoji nuance, length)
 *   - the author's direction (tone, formality, emotion, orientation) and business
 *   - the series context (through-line, this post's goal, sibling hooks to avoid)
 *   - the BRIEF MODE contract (priority order, truth rules, output contract)
 */

import type {
  PostBrief,
  StrategistAdvancedParams,
  StrategyBatchStrategy,
} from "@/types";
import type { OptimizedPromptOptions, PostType } from "@/lib/services/prompt-builder";
import type { LintOptions } from "@/lib/services/post-quality";
import {
  FORMATS,
  LENGTH_BANDS,
  briefEngagementRule,
  closingRule,
  formatBlockForWriter,
  goalHint,
  isSoberRegister,
  minEmojisFor,
  needsVisualBlock,
  normalizeFormat,
  normalizeGoal,
  normalizeLength,
  type FormatSlug,
  type LengthBand,
} from "@/lib/ai/post-formats";
import { buildWriterDirectionBlock } from "@/lib/ai/batch-plan-prompt";
import { findUnverifiedFigures } from "@/lib/ai/plan-quality";

/** Kept for backward compatibility: brief format (any spelling) → base PostType. */
export function mapFormatToPostType(format: string): PostType {
  return FORMATS[normalizeFormat(format)].postType;
}

export interface BriefSeriesContext {
  theme?: string;
  strategy?: StrategyBatchStrategy;
  /** The other briefs of the batch — their ideas and openings must not repeat. */
  siblings?: Array<Pick<PostBrief, "id" | "hook" | "format">>;
}

export interface BriefGeneration {
  postType: PostType;
  format: FormatSlug;
  length: LengthBand;
  promptOptions: OptimizedPromptOptions;
  lintOptions: LintOptions;
  systemBlocks: string[];
  userMessage: string;
}

/**
 * Everything the materialize route needs to write ONE brief through the shared
 * engine. Pure — unit-tested and reused by scripts/strategist-eval.ts.
 */
export function buildBriefGeneration(opts: {
  language: "fr" | "en";
  brief: PostBrief;
  direction?: StrategistAdvancedParams;
  /** Bio / tagline / website (sanitized by the caller). */
  businessContext?: string;
  /** Recent post excerpts — topics to avoid repeating. */
  recentPostSnippets?: string[];
  series?: BriefSeriesContext;
  /** Everything the author actually said (request, business text…). Figures in
   *  the brief that are not in here are flagged as unverified. */
  knownFacts?: string;
  /** One-off rewrite ("shorter", "fewer emojis"…) applied to the previous
   *  version — not stored on the brief. */
  rewrite?: { instruction: string; previous?: string };
}): BriefGeneration {
  const { language, brief, direction, businessContext, recentPostSnippets, series } = opts;
  const fr = language === "fr";
  const format = normalizeFormat(brief.format);
  const length = normalizeLength(brief.length, format);
  const closing = closingRule(format, direction?.ctaIntensity, language);
  const band = LENGTH_BANDS[length];

  const sober = isSoberRegister(direction);
  const promptOptions: OptimizedPromptOptions = {
    brief: {
      lengthRule: band.rule[language],
      engagementRule: briefEngagementRule(closing, language),
      basePrompt: fr ? FR_HOUSE_STYLE : EN_HOUSE_STYLE,
      emojiRule: sober
        ? fr ? FR_EMOJI_RULE_SOBER : EN_EMOJI_RULE_SOBER
        : fr ? FR_EMOJI_RULE : EN_EMOJI_RULE,
    },
  };
  const lintOptions: LintOptions = {
    lengthBand: { min: band.min, max: band.max },
    endCheckOnBody: direction?.ctaIntensity !== "none",
    strict: true,
    minEmojis: minEmojisFor(length, sober),
    requireVisualBlock: needsVisualBlock(format, length),
    // Invented-statistic check: only the author's own words (request, business
    // text, note) vouch for a figure — never the brief, which may carry one the
    // planner made up.
    knownFacts:
      opts.knownFacts !== undefined ? `${opts.knownFacts}\n${brief.userNote ?? ""}` : undefined,
  };

  const blocks: string[] = [];

  // 1. The author's business — what they actually do (activity field first).
  const business = [direction?.context?.trim(), businessContext?.trim()].filter(Boolean).join("\n");
  if (business) {
    blocks.push(`

═════════════════════════════════════
${fr ? "ACTIVITÉ DE L'AUTEUR (pour ancrer le post — ne la récite pas)" : "AUTHOR'S BUSINESS (to ground the post — do not recite it)"}
═════════════════════════════════════
${business.slice(0, 1200)}`);
  }

  // 2. Voice-level direction (tone / formality / emotion / orientation).
  const directionBlock = buildWriterDirectionBlock(direction, language);
  if (directionBlock) blocks.push(directionBlock);

  // 3. The format of THIS post.
  blocks.push(
    formatBlockForWriter({
      format,
      length,
      language,
      closing,
      emotion: direction?.emotion,
      formality: direction?.formality,
    }),
  );

  // 4. Series context.
  const seriesLines: string[] = [];
  if (series?.theme) seriesLines.push(fr ? `Ce post fait partie du plan « ${series.theme} ».` : `This post belongs to the plan "${series.theme}".`);
  if (series?.strategy?.summary) seriesLines.push(`${fr ? "Fil rouge" : "Through-line"} : ${series.strategy.summary}`);
  if (series?.strategy?.edge) {
    seriesLines.push(`${fr ? "Ce qui distingue l'auteur (puise dedans pour les détails)" : "What sets the author apart (draw details from it)"} : ${series.strategy.edge}`);
  }
  const goal = goalHint(normalizeGoal(brief.goal), language);
  if (goal) seriesLines.push(`${fr ? "Objectif de CE post" : "Goal of THIS post"} : ${goal}`);
  const siblings = (series?.siblings ?? []).filter((s) => s.id !== brief.id).slice(0, 14);
  if (siblings.length) {
    seriesLines.push(
      fr
        ? "Les autres posts de la série — n'en reprends ni l'idée, ni la façon d'ouvrir, ni les exemples :"
        : "The other posts in the series — reuse neither their idea, nor their opening, nor their examples:",
    );
    for (const s of siblings) {
      seriesLines.push(`- [${FORMATS[normalizeFormat(s.format)].label[language]}] ${s.hook.slice(0, 160)}`);
    }
  }
  if (seriesLines.length) {
    blocks.push(`

═════════════════════════════════════
${fr ? "SÉRIE" : "SERIES"}
═════════════════════════════════════
${seriesLines.join("\n")}`);
  }

  // 5. Recent posts — topics and openings already used.
  if (recentPostSnippets?.length) {
    blocks.push(`

═════════════════════════════════════
${fr ? "POSTS RÉCENTS DE L'AUTEUR (déjà publiés ou rédigés — ne répète ni ces sujets ni ces ouvertures)" : "AUTHOR'S RECENT POSTS (already published or drafted — repeat neither these topics nor these openings)"}
═════════════════════════════════════
${recentPostSnippets.map((s, i) => `${i + 1}. ${s}`).join("\n")}`);
  }

  // 6. Figures the planner may have invented.
  if (opts.knownFacts !== undefined) {
    const unverified = findUnverifiedFigures(brief, opts.knownFacts);
    if (unverified.length) {
      blocks.push(
        fr
          ? `\n\n⚠️ CHIFFRES NON VÉRIFIÉS : le brief contient ${unverified.map((u) => `« ${u} »`).join(", ")}, absent${unverified.length > 1 ? "s" : ""} des données de l'auteur. Ne ${unverified.length > 1 ? "les" : "le"} reprends pas, même dans le hook : reformule de façon qualitative.`
          : `\n\n⚠️ UNVERIFIED FIGURES: the brief contains ${unverified.map((u) => `"${u}"`).join(", ")}, not found in the author's data. Do not reuse ${unverified.length > 1 ? "them" : "it"}, not even in the hook: rephrase qualitatively.`,
      );
    }
  }

  // 7. The brief-mode contract — last, so it is the freshest instruction.
  blocks.push(fr ? FR_BRIEF_MODE : EN_BRIEF_MODE);

  return {
    postType: FORMATS[format].postType,
    format,
    length,
    promptOptions,
    lintOptions,
    systemBlocks: blocks,
    userMessage: buildMaterializeUserMessage({ language, brief, rewrite: opts.rewrite }),
  };
}

/**
 * Build the USER message — the one approved brief. Short on purpose: the rules
 * live in the system prompt.
 */
export function buildMaterializeUserMessage(opts: {
  language: "fr" | "en";
  brief: PostBrief;
  rewrite?: { instruction: string; previous?: string };
}): string {
  const { language, brief, rewrite } = opts;
  const format = normalizeFormat(brief.format);
  const length = normalizeLength(brief.length, format);
  const instruction = rewrite?.instruction.trim().slice(0, 300);
  const rewriteBlock = instruction
    ? language === "fr"
      ? `\nConsigne de réécriture de l'auteur (prioritaire) : ${instruction}\n${rewrite?.previous ? `Version précédente — réécris-la en appliquant la consigne et garde ce qui fonctionne :\n---\n${rewrite.previous.slice(0, 3000)}\n---\n` : ""}`
      : `\nAuthor's rewrite instruction (takes priority): ${instruction}\n${rewrite?.previous ? `Previous version — rewrite it applying the instruction and keep what works:\n---\n${rewrite.previous.slice(0, 3000)}\n---\n` : ""}`
    : "";
  if (language === "fr") {
    return `Brief validé à rédiger :

Hook (ouverture du post — resserre la forme si besoin, garde l'idée) :
${brief.hook}

Idée principale (ce que le post défend ou démontre) :
${brief.angle}

Format : ${FORMATS[format].label.fr} · Longueur : ${LENGTH_BANDS[length].label.fr.toLowerCase()}
${brief.audience ? `Lecteur visé pour ce post : ${brief.audience}\n` : ""}${brief.tone ? `Ton pour ce post : ${brief.tone}\n` : ""}Pourquoi ce post (guide implicite — ne l'écris pas) : ${brief.rationale}
${brief.userNote?.trim() ? `\nNote de l'auteur (prioritaire, à respecter) :\n${brief.userNote.trim()}\n` : ""}${rewriteBlock}
Rappel : aucun chiffre, nom de client, ville, prénom ou citation qui ne figure pas ci-dessus ou dans les données de l'auteur. Texte brut, sans markdown.
Retourne UNIQUEMENT le texte du post.`;
  }
  return `Approved brief to write:

Hook (opening of the post — tighten the wording if needed, keep the idea):
${brief.hook}

Main idea (what the post argues or demonstrates):
${brief.angle}

Format: ${FORMATS[format].label.en} · Length: ${LENGTH_BANDS[length].label.en.toLowerCase()}
${brief.audience ? `Intended reader for this post: ${brief.audience}\n` : ""}${brief.tone ? `Tone for this post: ${brief.tone}\n` : ""}Why this post (implicit guidance — do not write it): ${brief.rationale}
${brief.userNote?.trim() ? `\nAuthor's note (takes priority, must be respected):\n${brief.userNote.trim()}\n` : ""}${rewriteBlock}
Reminder: no figure, client name, city, first name or quote that isn't above or in the author's data. Plain text, no markdown.
Return ONLY the post text.`;
}

// ─── House style (replaces the shared ghostwriter base prompt in brief mode) ─
// Real generations with the shared MAX base prompt came out as dense, sober
// prose (it bans "bullet points as the main structure" and the central emoji
// policy calls 0 emoji "a good choice"). The Strategist's promise is posts
// people WANT to read: scannable, rhythmic, concrete, with emojis as visual cues.

const FR_HOUSE_STYLE = `Tu es le ghostwriter LinkedIn de l'auteur. Ton job : des posts qu'on a envie de lire jusqu'au bout et de commenter. Vivants, concrets, rythmés, faciles à parcourir sur un téléphone.

STYLE MAISON :
- Une idée par ligne. Phrases courtes, parfois très courtes. Beaucoup de retours à la ligne : jamais plus de 2 lignes de texte d'affilée sans respiration.
- Le post se parcourt en 3 secondes : il contient au moins un bloc visuel — une mini-liste de 3 à 5 lignes courtes avec des repères (👉 ✅ ❌ 📌 → ou 1️⃣ 2️⃣ 3️⃣), un avant/après, ou une série de lignes-chocs.
- De la vie : verbes d'action, détails concrets du quotidien de l'auteur, une pointe d'émotion, d'autodérision ou d'humour quand le ton s'y prête. Tu parles à UN lecteur, pas à une foule.
- Du concret, jamais du vague : un moment, un geste, une phrase entendue, un outil, une objection réelle. Si une phrase pourrait figurer dans le post de n'importe qui, remplace-la.
- Interdit : le ton brochure ou communiqué de presse, les phrases de remplissage (« beaucoup d'entrepreneurs font face à… », « considérablement », « de précieuses ressources », « d'autres aspects critiques »), les conclusions morales génériques.
- C'est l'auteur qui parle, à la première personne, avec sa personnalité.

RYTHME VISÉ (exemple de texture uniquement — n'en reprends ni le sujet, ni les mots, ni la structure) :
---
« Je n'ai rien d'intéressant à raconter. »

C'est ce qu'une cliente m'a dit mardi.

Juste après m'avoir raconté :
👉 le devis signé à la dernière minute
👉 le client qu'elle a refusé
👉 l'erreur qu'elle ne refera plus

Trois posts. Sans chercher.

💡 Ta semaine contient déjà tes meilleurs posts.

Quel moment de ta semaine mériterait d'être raconté ?
---`;

const EN_HOUSE_STYLE = `You are the author's LinkedIn ghostwriter. Your job: posts people want to read to the end and comment on. Lively, concrete, rhythmic, easy to scan on a phone.

HOUSE STYLE:
- One idea per line. Short sentences, sometimes very short. Plenty of line breaks: never more than 2 lines of text in a row without a breath.
- The post scans in 3 seconds: it contains at least one visual block — a mini-list of 3 to 5 short lines with markers (👉 ✅ ❌ 📌 → or 1️⃣ 2️⃣ 3️⃣), a before/after, or a series of punchy lines.
- Life: action verbs, concrete details from the author's day-to-day, a touch of emotion, self-mockery or humour when the tone allows it. You talk to ONE reader, not a crowd.
- Concrete, never vague: a moment, a gesture, a sentence someone said, a tool, a real objection. If a sentence could sit in anyone's post, replace it.
- Forbidden: brochure or press-release tone, filler sentences ("many entrepreneurs face…", "considerably", "valuable resources", "other critical aspects"), generic moral conclusions.
- The author speaks, in the first person, with their personality.

TARGET RHYTHM (texture example only — reuse neither its topic, nor its words, nor its structure):
---
"I have nothing interesting to share."

A client told me that on Tuesday.

Right after telling me about:
👉 the quote she signed at the last minute
👉 the client she turned down
👉 the mistake she'll never make again

Three posts. Without even looking.

💡 Your week already holds your best posts.

Which moment of your week deserves to be told?
---`;

const FR_EMOJI_RULE = `

EMOJIS — ils rendent le post vivant et lisible, ils ne décorent pas :
- Vise 3 à 6 emojis sur un post moyen ou long, 1 à 3 sur un post court. Un post sans aucun emoji est raté (sauf registre sobre demandé).
- Rôles : repères de liste (👉 ✅ ❌ 📌 → 1️⃣ 2️⃣ 3️⃣), mise en avant d'une idée forte (💡 ⚡ 🎯 🔥), émotion juste sur un temps fort (😅 🙃 🤯 😬), invitation à réagir (👇 💬).
- Varie : pas deux fois le même emoji hors puces d'une même liste, pas d'empilement (🔥🔥), jamais un emoji à la fin de chaque phrase, pas de 🚀 par réflexe.`;

const EN_EMOJI_RULE = `

EMOJIS — they make the post lively and readable, they don't decorate:
- Aim for 3 to 6 emojis on a medium or long post, 1 to 3 on a short one. A post with no emoji at all has failed (unless a sober register is requested).
- Roles: list markers (👉 ✅ ❌ 📌 → 1️⃣ 2️⃣ 3️⃣), highlighting a strong idea (💡 ⚡ 🎯 🔥), the right emotion on a strong beat (😅 🙃 🤯 😬), an invitation to react (👇 💬).
- Vary: never the same emoji twice outside the bullets of one list, no stacking (🔥🔥), never one at the end of every sentence, no reflex 🚀.`;

const FR_EMOJI_RULE_SOBER = `

EMOJIS — registre sobre demandé par l'auteur : 0 à 2, uniquement comme repères de liste (→ ✅ 📌). Aucun emoji d'émotion. Le rythme et la mise en page portent la lisibilité.`;

const EN_EMOJI_RULE_SOBER = `

EMOJIS — the author asked for a sober register: 0 to 2, only as list markers (→ ✅ 📌). No emotion emoji. Rhythm and layout carry the readability.`;

const FR_BRIEF_MODE = `

═════════════════════════════════════
MODE BRIEF — tu rédiges UN post à partir d'un brief validé par l'auteur
═════════════════════════════════════
ORDRE DE PRIORITÉ si deux consignes se contredisent : 1) le brief et la note de l'auteur ; 2) le FORMAT DE CE POST (structure, longueur, clôture, emojis) ; 3) le STYLE MAISON (début du prompt) et la direction de l'auteur ; 4) les autres règles ci-dessus.
- Ouvre avec le hook FOURNI : tu peux resserrer la formulation ou la ponctuation, jamais changer l'idée. Il tient en 1-2 lignes, sans ligne vide à l'intérieur.
- Le corps développe l'IDÉE fournie avec UN des squelettes du format. Les étapes du squelette ne sont pas des intertitres à recopier.
- Le « pourquoi » du brief reste implicite : ne l'énonce jamais.
- Chiffres : uniquement ceux présents dans le brief, la note ou les données de l'auteur. N'en ajoute aucun (ni %, ni montant, ni « x3 »).
- Pas de nom d'entreprise cliente, de ville, de résultat ou de citation inventés, ni de prénom inventé présenté comme une vraie personne : dis « une cliente », « un manager de l'équipe ». Ancre plutôt par un moment, un outil, une phrase entendue, un geste du métier.
- Aucun fait daté ou chiffré sur l'entreprise de l'auteur (date de création ou de lancement, nombre de clients, résultats) qui ne figure pas dans ses données. Un moment vécu peut être situé (« un jeudi matin »), pas un fait d'entreprise.
- Pas de signature ni de prénom en fin de post : il est publié sous le nom de l'auteur.
- Texte brut uniquement : LinkedIn n'affiche pas le markdown. Jamais de **gras**, de ## titre ni d'intertitres du type « Situation de départ : ».
- Phrases de remplissage et clichés à proscrire : « sortir des sentiers battus », « plonger dans l'inconnu », « faire toute la différence », « la clé du succès », « un véritable défi », « crucial », « dans un monde en constante évolution », « Résultat ? », « La leçon ? », une première phrase de contexte générique (« Gérer X est un défi quotidien »), une dernière ligne en « Et si… ? ».
- Hashtags : 2 à 3 vraiment pertinents, SEULS sur la dernière ligne (jamais collés à la dernière phrase), en terminant par #posty.
- Relis-toi avant de répondre : supprime chaque phrase qui répète une idée, chaque transition creuse, chaque généralité. Chaque ligne doit apporter quelque chose au lecteur.
- Retourne UNIQUEMENT le texte du post : pas de titre, pas de préambule, pas de commentaire.`;

const EN_BRIEF_MODE = `

═════════════════════════════════════
BRIEF MODE — you are writing ONE post from a brief the author approved
═════════════════════════════════════
PRIORITY ORDER when two instructions conflict: 1) the brief and the author's note; 2) the FORMAT OF THIS POST (structure, length, closing, emojis); 3) the HOUSE STYLE (top of the prompt) and the author's direction; 4) the other rules above.
- Open with the GIVEN hook: you may tighten wording or punctuation, never change the idea. It fits in 1-2 lines, with no blank line inside.
- The body develops the GIVEN idea using ONE of the format's skeletons. Skeleton steps are not headings to copy.
- The brief's "why" stays implicit: never state it.
- Numbers: only those present in the brief, the note or the author's data. Add none (no %, no amounts, no "3x").
- No invented client company, city, result or quote, and no invented first name presented as a real person: say "a client", "a manager on the team". Anchor instead with a moment, a tool, a sentence someone said, a gesture of the craft.
- No dated or numeric fact about the author's company (founding or launch date, client count, results) that isn't in their data. A lived moment can be placed in time ("one Thursday morning"); a company fact cannot.
- No signature or first name at the end: the post is published under the author's name.
- Plain text only: LinkedIn does not render markdown. Never **bold**, ## headings or label lines like "Starting point:".
- Filler and clichés to avoid: "think outside the box", "game-changer", "make all the difference", "the key to success", "crucial", "in today's fast-paced world", "Let's dig in", "The result?", "The lesson?", a generic context opener ("Managing X is a daily challenge"), a closing "What if…?" line.
- Hashtags: 2 to 3 genuinely relevant ones, ALONE on the last line (never glued to the last sentence), ending with #posty.
- Re-read before answering: cut every sentence that repeats an idea, every hollow transition, every generality. Every line must give the reader something.
- Return ONLY the post text: no title, no preamble, no commentary.`;
