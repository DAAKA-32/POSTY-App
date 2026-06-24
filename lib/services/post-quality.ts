/**
 * Post Quality Lint (2026) — deterministic output validator for generated
 * LinkedIn posts.
 *
 * Why deterministic, not an LLM judge: the failure modes that actually make a
 * post read as AI-written in 2026 are mechanical and structural (em-dash
 * density, templated openers like "Here's how", the "It's not X, it's Y"
 * contrast, reveal bridges, frictionless both-sides balance, engagement bait,
 * vague "What do you think?" closes, missing concrete anchors). These are
 * cheaply and reliably caught by rules — no model round-trip needed, zero
 * latency on the (majority) of posts that pass.
 *
 * Flow (see generate/route.ts): generate on gpt-4o → lintPost() → only if a
 * HARD issue is present, run ONE gpt-4o-mini repair pass with
 * buildRepairMessages(). Good posts pay nothing.
 *
 * This module is pure (no OpenAI / tracking deps) so it is unit-testable and
 * the API call + cost tracking stay in the route, consistent with the rest of
 * the codebase.
 */

export type QualitySeverity = "hard" | "soft";

export interface QualityIssue {
  code: string;
  severity: QualitySeverity;
  /** Human-readable instruction, in the post's language, for the repair pass. */
  message: string;
}

export interface QualityReport {
  issues: QualityIssue[];
  /** True when at least one HARD issue is present → a repair pass is worthwhile. */
  needsRepair: boolean;
}

type Lang = "fr" | "en";

/** Normalize curly quotes/apostrophes to straight so regexes match reliably. */
function normalizeQuotes(s: string): string {
  return s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”«»]/g, '"');
}

/** Count em-dashes (— U+2014). En-dashes and hyphens are ignored. */
function countEmDashes(text: string): number {
  return (text.match(/—/g) || []).length;
}

/** Strip a trailing hashtag block + signature so length/anchor checks look at the body. */
function bodyWithoutTags(text: string): string {
  return text.replace(/(^|\n)[^\n]*#\w[^\n]*$/g, "").trim() || text.trim();
}

const BANNED_OPENERS: Record<Lang, Array<{ re: RegExp; label: string }>> = {
  fr: [
    { re: /^(voici (comment|ce que|les|pourquoi))/i, label: '"Voici comment / ce que…"' },
    { re: /^(et si je vous disais)/i, label: '"Et si je vous disais…"' },
    { re: /^(dans un monde où)/i, label: '"Dans un monde où…"' },
    { re: /^(aujourd'hui,? plus que jamais)/i, label: '"Aujourd\'hui plus que jamais…"' },
    { re: /^(je suis (ravi|fier|heureux|honoré)( de| d'))/i, label: '"Je suis ravi/fier d\'annoncer…"' },
    { re: /^(en tant que [a-zàâçéèêëîïôûù]+,)/i, label: 'auto-présentation "En tant que…"' },
  ],
  en: [
    { re: /^(here'?s (how|what|why|the))/i, label: '"Here\'s how / what…"' },
    { re: /^(what if i told you)/i, label: '"What if I told you…"' },
    { re: /^(in a world where)/i, label: '"In a world where…"' },
    { re: /^(in today'?s)/i, label: '"In today\'s … world"' },
    { re: /^(now more than ever)/i, label: '"Now more than ever…"' },
    { re: /^(i'?m (thrilled|excited|proud|humbled)( to))/i, label: '"I\'m thrilled/proud to announce…"' },
    { re: /^(as an? [a-z]+,)/i, label: 'self-introduction "As a…"' },
  ],
};

const BANNED_TEMPLATES: Record<Lang, Array<{ re: RegExp; label: string }>> = {
  fr: [
    { re: /ce n'est pas .{1,45}?\bc'est\b/i, label: 'le contraste "Ce n\'est pas X, c\'est Y"' },
    { re: /\ble résultat\s*\?/i, label: 'le pont-révélation "Le résultat ?"' },
    { re: /\ble (plus fou|plus dingue|pire)\s*\?/i, label: 'le pont-révélation "Le plus fou ?"' },
    { re: /\bspoiler\s*:/i, label: '"Spoiler :"' },
  ],
  en: [
    { re: /it'?s not .{1,45}?\bit'?s\b/i, label: 'the "It\'s not X, it\'s Y" contrast' },
    { re: /\bthe result\s*\?/i, label: 'the reveal bridge "The result?"' },
    { re: /\bthe (kicker|crazy part|best part)\s*\?/i, label: 'the reveal bridge "The kicker?"' },
    { re: /\bplot twist\s*:?/i, label: '"Plot twist"' },
  ],
};

const HEDGES: Record<Lang, Array<{ re: RegExp; label: string }>> = {
  fr: [
    { re: /\bles deux (ont|approches ont|options ont) (du bon|leurs mérites|du sens)\b/i, label: '"les deux ont du bon"' },
    { re: /\b(ça|cela) dépend de (votre|ta|la|chaque|son) (situation|contexte|cas|objectif|besoin)/i, label: '"ça dépend de votre situation"' },
    { re: /\bil n'y a pas de (recette|formule|solution|réponse) (unique|magique|miracle|toute faite)\b/i, label: '"il n\'y a pas de recette unique"' },
  ],
  en: [
    { re: /\b(both (have|approaches have) (merit|merits|their place))\b/i, label: '"both have merit"' },
    { re: /\b(it (just )?depends)\b(?!\s+on (you|your team))/i, label: '"it depends"' },
    { re: /\b(there'?s no (one[- ]size[- ]fits[- ]all|silver bullet|magic (formula|bullet)))\b/i, label: '"there\'s no one-size-fits-all"' },
  ],
};

const ENGAGEMENT_BAIT: Record<Lang, Array<{ re: RegExp; label: string }>> = {
  fr: [
    { re: /\b(commentez? (oui|ci-dessous)|tapez? oui|identifiez? un (ami|collègue)|repartagez? si|like(z)? si)\b/i, label: "appât à engagement (Commentez OUI / Identifiez un ami / Repartagez si…)" },
  ],
  en: [
    { re: /\b(comment (yes|below)|type yes|tag a (friend|colleague)|repost if|like if)\b/i, label: "engagement bait (Comment YES / Tag a friend / Repost if…)" },
  ],
};

const VAGUE_CLOSERS: Record<Lang, RegExp> = {
  fr: /(qu'en pensez[- ]vous|qu'en penses[- ]tu|vos avis|votre avis|et vous\s*\?)\s*[?.!]*\s*$/i,
  en: /(what do you think|thoughts\?|what about you|agree\?)\s*[?.!]*\s*$/i,
};

const DATE_WORDS: Record<Lang, RegExp> = {
  fr: /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre|hier|aujourd'hui|la semaine dernière|le mois dernier|l'an dernier|l'année dernière)\b/i,
  en: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|yesterday|today|last (week|month|year|quarter))\b/i,
};

/**
 * Lint a finished post. The `text` should be the post AS RETURNED to the user
 * (after hashtag normalization). `language` is the generation language.
 */
export function lintPost(rawText: string, language: Lang): QualityReport {
  const issues: QualityIssue[] = [];
  const isFr = language === "fr";
  const text = normalizeQuotes(rawText).trim();
  const firstLine = text.split("\n").find((l) => l.trim().length > 0)?.trim() ?? "";
  const body = bodyWithoutTags(text);

  const push = (code: string, severity: QualitySeverity, message: string) =>
    issues.push({ code, severity, message });

  // --- HARD: structural AI tells -------------------------------------------
  for (const { re, label } of BANNED_OPENERS[language]) {
    if (re.test(firstLine)) {
      push("banned-opener", "hard",
        isFr ? `Réécris l'accroche: elle commence par ${label}, un cliché IA. Trouve une ouverture concrète et spécifique.`
             : `Rewrite the hook: it opens with ${label}, an AI cliché. Find a concrete, specific opener.`);
      break;
    }
  }
  for (const { re, label } of BANNED_TEMPLATES[language]) {
    if (re.test(text)) {
      push("banned-template", "hard",
        isFr ? `Supprime ${label}: c'est une structure typiquement IA. Reformule l'idée autrement.`
             : `Remove ${label}: it's a hallmark AI structure. Rephrase the idea differently.`);
    }
  }
  for (const { re, label } of HEDGES[language]) {
    if (re.test(text)) {
      push("frictionless-balance", "hard",
        isFr ? `Enlève ${label} et prends UNE position claire et assumée à la place.`
             : `Drop ${label} and take ONE clear, owned position instead.`);
    }
  }
  for (const { re, label } of ENGAGEMENT_BAIT[language]) {
    if (re.test(text)) {
      push("engagement-bait", "hard",
        isFr ? `Retire l'${label}: LinkedIn pénalise ces formules. Remplace par une vraie question d'expérience.`
             : `Remove the ${label}: LinkedIn down-ranks these. Replace with a genuine experience question.`);
    }
  }
  if (VAGUE_CLOSERS[language].test(text)) {
    push("vague-close", "hard",
      isFr ? `Remplace la question de fin vague ("Qu'en pensez-vous ?") par UNE question précise, répondable depuis l'expérience du lecteur.`
           : `Replace the vague closing question ("What do you think?") with ONE specific question answerable from the reader's experience.`);
  }
  if (countEmDashes(text) > 2) {
    push("em-dash-density", "hard",
      isFr ? `Réduis les tirets cadratins (—) à 1 maximum: convertis les autres en points, virgules ou parenthèses (la densité de tirets est un marqueur IA).`
           : `Cut em-dashes (—) to 1 max: convert the rest to periods, commas, or parentheses (em-dash density is an AI tell).`);
  }

  // --- SOFT: reported, included in a repair only if a HARD issue triggers it -
  const bodyLen = body.length;
  if (bodyLen > 0 && bodyLen < 700) {
    push("too-short", "soft",
      isFr ? `Le corps est court (${bodyLen} car.): étoffe avec un exemple concret ou une étape, vise 1300-2000 car.`
           : `Body is short (${bodyLen} chars): add a concrete example or step, aim for 1300-2000 chars.`);
  } else if (bodyLen > 2600) {
    push("too-long", "soft",
      isFr ? `Le corps est long (${bodyLen} car.): resserre vers 1300-2000 car. en coupant le superflu.`
           : `Body is long (${bodyLen} chars): tighten toward 1300-2000 chars by cutting filler.`);
  }

  // Concrete anchor heuristic: a real post almost always has a number, a date,
  // or a quoted line. Lenient on purpose to avoid false positives on
  // name-anchored posts.
  const hasDigit = /\d/.test(body);
  const hasDate = DATE_WORDS[language].test(body);
  const hasQuote = /"[^"]{3,}"/.test(text);
  if (!hasDigit && !hasDate && !hasQuote) {
    push("no-concrete-anchor", "soft",
      isFr ? `Ajoute au moins un ancrage concret (un chiffre, une date comme "mardi dernier", un nom propre, ou une phrase citée). Le flou est le marqueur IA n°1.`
           : `Add at least one concrete anchor (a number, a date like "last Tuesday", a proper name, or a quoted line). Vagueness is AI tell #1.`);
  }

  // Wall-of-text: any paragraph block that's too dense for mobile.
  const denseBlock = text.split(/\n\s*\n/).some((p) => {
    const lines = p.split("\n").filter((l) => l.trim());
    return lines.length > 5 || p.replace(/\s/g, "").length > 400;
  });
  if (denseBlock) {
    push("dense-block", "soft",
      isFr ? `Aère: un paragraphe est trop dense. Coupe en blocs de 1-3 lignes séparés par une ligne vide.`
           : `Add white space: a paragraph is too dense. Break into 1-3 line blocks separated by blank lines.`);
  }

  const needsRepair = issues.some((i) => i.severity === "hard");
  return { issues, needsRepair };
}

/**
 * Build the messages for the single gpt-4o-mini repair pass. The repair is
 * surgical: fix ONLY the listed issues, preserve everything else (voice, facts,
 * language, hashtags, signature, overall structure).
 */
export function buildRepairMessages(
  post: string,
  issues: QualityIssue[],
  language: Lang
): { system: string; user: string } {
  const isFr = language === "fr";
  // Repair against ALL issues once a repair is triggered (soft ones too).
  const list = issues.map((i, idx) => `${idx + 1}. ${i.message}`).join("\n");

  const system = isFr
    ? `Tu es un éditeur LinkedIn. On te donne un post et une liste de corrections précises. Applique UNIQUEMENT ces corrections.
RÈGLES STRICTES:
- Préserve le sens, les faits, les chiffres, la langue (français), la signature et les hashtags du post.
- Ne change rien qui ne soit pas explicitement demandé. Édition chirurgicale, pas réécriture.
- Garde un ton humain et naturel, le rythme aéré (paragraphes courts).
- Réponds UNIQUEMENT avec le post corrigé, sans guillemets, sans commentaire, sans préambule.`
    : `You are a LinkedIn editor. You're given a post and a list of precise fixes. Apply ONLY those fixes.
STRICT RULES:
- Preserve the meaning, facts, numbers, language (English), signature, and hashtags of the post.
- Change nothing that isn't explicitly requested. Surgical edit, not a rewrite.
- Keep a human, natural tone and airy rhythm (short paragraphs).
- Respond ONLY with the corrected post — no quotes, no commentary, no preamble.`;

  const user = isFr
    ? `CORRECTIONS À APPLIQUER:\n${list}\n\n— POST À CORRIGER —\n${post}\n— FIN —`
    : `FIXES TO APPLY:\n${list}\n\n— POST TO FIX —\n${post}\n— END —`;

  return { system, user };
}
