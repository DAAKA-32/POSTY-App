/**
 * Strategist Batch Plan — system prompt + Zod schema.
 *
 * Phase 1 deliverable: from a single user ask ("prépare-moi 5 posts cette
 * semaine"), produce a structured editorial plan of N briefs. NOT full post
 * copy — Phase 2 materializes each brief through the shared post engine.
 *
 * What makes a plan feel "made for me" rather than "10 generic ideas":
 *   - the model states the series STRATEGY first (JSON field order = reasoning
 *     order), then derives the briefs from it
 *   - a substitution test kills interchangeable angles
 *   - the format/length MIX is decided in code (lib/ai/post-formats) so a batch
 *     can't silently collapse into five variations of the same post
 *   - a strict truth rule: no invented figures, clients or results
 */

import { z } from "zod";
import type { StrategistAdvancedParams } from "@/types";
import type { ExtractedUrlContent } from "@/lib/utils/url-extract";
import {
  FORMATS,
  FORMAT_SLUGS,
  LENGTH_BANDS,
  formatCatalogueForPlanner,
  type PlannedSlot,
} from "@/lib/ai/post-formats";

/** Zod mirror of types/index.ts `PostBrief`. Used to validate the LLM output
 *  before persisting / rendering. The new descriptive fields are optional and
 *  lenient (`catch`) so one odd value never fails a whole batch. */
export const PostBriefSchema = z.object({
  id: z.string().min(1).max(40),
  hook: z.string().min(8).max(300),
  angle: z.string().min(8).max(400),
  format: z.string().min(2).max(40),
  suggestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  suggestedTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM"),
  rationale: z.string().min(8).max(300),
  length: z.enum(["short", "medium", "long"]).optional().catch(undefined),
  goal: z.string().max(40).optional().catch(undefined),
  audience: z.string().max(160).optional().catch(undefined),
  tone: z.string().max(120).optional().catch(undefined),
});

const StrategySchema = z
  .object({
    summary: z.string().max(400).optional().catch(undefined),
    audience: z.string().max(200).optional().catch(undefined),
    objective: z.string().max(200).optional().catch(undefined),
    tone: z.string().max(160).optional().catch(undefined),
    edge: z.string().max(400).optional().catch(undefined),
    pains: z.array(z.string().max(200)).max(5).optional().catch(undefined),
  })
  .optional()
  .catch(undefined);

export const BatchPlanResponseSchema = z.object({
  strategy: StrategySchema,
  theme: z.string().min(4).max(160),
  posts: z.array(PostBriefSchema).min(1).max(15),
});

export type BatchPlanResponse = z.infer<typeof BatchPlanResponseSchema>;

/**
 * Build the LLM system prompt. We inline the user profile + the requested
 * batch parameters (count, window, timezone) + the planned format mix so the
 * model has everything it needs in one pass.
 */
export function buildBatchPlanPrompt(opts: {
  language: "fr" | "en";
  count: number;
  startDate: string;          // YYYY-MM-DD
  timezone: string;           // e.g. "Europe/Paris"
  /** Publication window length in days (7 = one editorial week, 28 = a month). */
  windowDays?: number;
  userContext: {
    name?: string;
    profileType?: string;
    sector?: string;
    role?: string;
    objective?: string;
    targetAudience?: string;
    communicationTone?: string;
    publishingFrequency?: string;
    bio?: string;
    tagline?: string;
    website?: string;
  };
  /** Last 3-5 post excerpts — used to AVOID repeating recent topics/openings. */
  recentPostSnippets?: string[];
  /** Advanced steering from the drawer panel / saved profile defaults. Only
   *  the fields the user actually set are turned into instruction lines. */
  advanced?: StrategistAdvancedParams;
  /** Format + length mix decided in code (pickFormatMix). Empty → free choice. */
  formatMix?: PlannedSlot[];
}): string {
  const { language, count, startDate, timezone, userContext, recentPostSnippets, advanced, formatMix } = opts;
  const fr = language === "fr";
  const windowDays = Math.max(1, opts.windowDays ?? 7);

  const profileBlock = [
    userContext.name && `- ${fr ? "Nom" : "Name"}: ${userContext.name}`,
    userContext.profileType && `- ${fr ? "Type de profil" : "Profile type"}: ${userContext.profileType}`,
    userContext.sector && `- ${fr ? "Secteur" : "Sector"}: ${userContext.sector}`,
    userContext.role && `- ${fr ? "Rôle" : "Role"}: ${userContext.role}`,
    userContext.tagline && `- Tagline: ${userContext.tagline}`,
    userContext.website && `- ${fr ? "Site" : "Website"}: ${userContext.website}`,
    userContext.bio && `- Bio: ${userContext.bio.slice(0, 400)}`,
    userContext.objective && `- ${fr ? "Objectif business" : "Business objective"}: ${userContext.objective}`,
    userContext.targetAudience && `- ${fr ? "Audience cible" : "Target audience"}: ${userContext.targetAudience}`,
    userContext.communicationTone && `- ${fr ? "Ton" : "Tone"}: ${userContext.communicationTone}`,
    userContext.publishingFrequency && `- ${fr ? "Fréquence souhaitée" : "Preferred frequency"}: ${userContext.publishingFrequency}`,
  ].filter(Boolean).join("\n") || (fr ? "- (aucun champ de profil renseigné)" : "- (no profile fields captured yet)");

  const recentBlock = recentPostSnippets?.length
    ? recentPostSnippets.map((s, i) => `${i + 1}. ${s}`).join("\n")
    : fr ? "(aucun post récent)" : "(no recent posts)";

  // The author's own description of what they do / their offer — the source of
  // truth when they ask for posts "about my product/brand". Without it the
  // model has only categorical fields and drifts generic.
  const ctxText = advanced?.context?.trim();
  const activityBlock = ctxText
    ? `
═════════════════════════════════════
${fr ? "ACTIVITÉ DE L'AUTEUR (source de vérité — utilise-la)" : "AUTHOR'S BUSINESS (source of truth — use it)"}
═════════════════════════════════════
${ctxText.slice(0, 800)}
${fr
        ? "→ Ancre les angles ICI : son offre, ses clients, son quotidien. N'invente RIEN au-delà de ces éléments."
        : "→ Anchor the angles HERE: their offer, their clients, their day-to-day. Invent NOTHING beyond these elements."}
`
    : "";

  const base = fr ? buildFrPrompt(count) : buildEnPrompt(count);
  const directionBlock = buildAdvancedDirectionBlock(advanced, language);
  const windowEnd = addDaysIso(startDate, windowDays - 1);
  const mixBlock = buildMixBlock(formatMix, language);

  return `${base}

═════════════════════════════════════
FORMATS
═════════════════════════════════════
${formatCatalogueForPlanner(language)}
${mixBlock}
═════════════════════════════════════
${fr ? "PROFIL DE L'AUTEUR" : "AUTHOR PROFILE"}
═════════════════════════════════════
${profileBlock}
${activityBlock}
═════════════════════════════════════
${fr ? "POSTS RÉCENTS (ne répète ni ces sujets ni ces ouvertures)" : "RECENT POSTS (do not repeat these topics or openings)"}
═════════════════════════════════════
${recentBlock}

═════════════════════════════════════
${fr ? "PARAMÈTRES DU PLAN" : "PLAN PARAMETERS"}
═════════════════════════════════════
- ${fr ? "Nombre de briefs" : "Number of briefs"}: ${count}
- ${fr ? "Première date possible" : "First eligible date"}: ${startDate}
- ${fr ? "Fenêtre de publication — CHAQUE post doit tomber dans ces dates" : "Publication window — EVERY post must fall within these dates"}: ${startDate} → ${windowEnd}
- ${fr ? "Fuseau horaire (suggestedTime s'entend dans ce fuseau)" : "Timezone (suggestedTime is in this timezone)"}: ${timezone}
${directionBlock}`;
}

function buildMixBlock(mix: PlannedSlot[] | undefined, language: "fr" | "en"): string {
  if (!mix || mix.length === 0) {
    return language === "fr"
      ? "\nChoisis pour chaque post le format et la longueur qui servent le mieux son sujet.\n"
      : "\nFor each post, choose the format and length that best serve its topic.\n";
  }
  const lines = mix
    .map((s, i) => `${i + 1}. ${s.format} (${FORMATS[s.format].label[language]}) — ${LENGTH_BANDS[s.length].label[language].toLowerCase()}`)
    .join("\n");
  return language === "fr"
    ? `
MIX PRÉVU POUR CETTE SÉRIE (un emplacement par post ; tu choisis quel angle va dans quel format et l'ordre de publication) :
${lines}
→ Respecte ce mix SAUF si l'auteur demande explicitement un format, une longueur ou un type de contenu : sa demande prime.
`
    : `
PLANNED MIX FOR THIS SERIES (one slot per post; you decide which angle goes in which format and the publishing order):
${lines}
→ Follow this mix UNLESS the author explicitly asks for a format, a length or a content type: their request wins.
`;
}

/** Add `n` days to a YYYY-MM-DD string, returning YYYY-MM-DD. UTC math so it
 *  never shifts a day across the server timezone. */
function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/**
 * Chantier 2 — inject the content of a URL the author referenced (their own
 * site, a brand, a competitor) so the briefs are grounded in / analyze the real
 * page instead of guessing. Truncated for token cost; the extractor already
 * capped the source at ~8KB, we inject the most relevant head of it.
 */
export function buildSourceAnalysisBlock(
  src: Pick<ExtractedUrlContent, "url" | "title" | "description" | "textContent">,
  language: "fr" | "en",
): string {
  const body = src.textContent.slice(0, 3500);
  if (language === "fr") {
    return `
═════════════════════════════════════
SOURCE ANALYSÉE (page web fournie par l'auteur)
═════════════════════════════════════
URL : ${src.url}
${src.title ? `Titre : ${src.title}\n` : ""}${src.description ? `Description : ${src.description}\n` : ""}Contenu extrait :
${body}

COMMENT L'UTILISER :
- Si c'est le site de L'AUTEUR : source de vérité sur son offre, son positionnement et son vocabulaire. Ancre les posts dessus, dans SA voix (première personne).
- Si c'est une AUTRE marque / un concurrent : analyse son positionnement, sa promesse, ses angles, ses forces/faiblesses — et propose des angles ORIGINAUX et tranchants (réaction, contraste, leçon à en tirer). NE copie PAS et n'usurpe PAS son identité.
- N'invente RIEN au-delà de ce que contient la page.`;
  }
  return `
═════════════════════════════════════
ANALYZED SOURCE (web page provided by the author)
═════════════════════════════════════
URL: ${src.url}
${src.title ? `Title: ${src.title}\n` : ""}${src.description ? `Description: ${src.description}\n` : ""}Extracted content:
${body}

HOW TO USE IT:
- If it's the AUTHOR's own site: source of truth on their offer, positioning and vocabulary. Ground the posts in it, in THEIR voice (first person).
- If it's ANOTHER brand / competitor: analyze its positioning, promise, angles, strengths/weaknesses — and propose ORIGINAL, sharp angles (reaction, contrast, lesson to draw). Do NOT copy it and do NOT impersonate its identity.
- Invent NOTHING beyond what the page contains.`;
}

/** Wraps the real-time facts block for the PLANNER: the facts feed a few angles,
 *  they must not turn the whole series into a news digest. */
export function wrapRealtimeBlockForPlanner(block: string, language: "fr" | "en"): string {
  if (!block.trim()) return "";
  return `${block}
${language === "fr"
    ? "→ POUR CE PLAN : ces faits peuvent nourrir au plus 1 ou 2 briefs, seulement s'ils servent vraiment l'auteur et son audience. Si un brief s'appuie sur un fait, écris le fait (et sa source) dans l'angle pour que la rédaction puisse l'utiliser. Le reste de la série reste ancré dans le métier de l'auteur."
    : "→ FOR THIS PLAN: these facts may feed at most 1 or 2 briefs, only if they genuinely serve the author and their audience. If a brief relies on a fact, write the fact (and its source) in the angle so the writer can use it. The rest of the series stays anchored in the author's craft."}
`;
}

/** Tone preset slug → human phrasing injected into the prompt. Falls back to
 *  the raw slug for any free-text value the panel might pass in future. */
export const TONE_PHRASES: Record<string, { fr: string; en: string }> = {
  direct: { fr: "direct et sans détour", en: "direct and to the point" },
  expert: { fr: "expert et précis", en: "expert and precise" },
  inspiring: { fr: "inspirant et mobilisateur", en: "inspiring and uplifting" },
  bold: { fr: "provocateur, à contre-courant", en: "bold and contrarian" },
  warm: { fr: "chaleureux et accessible", en: "warm and approachable" },
};

function tonePhrase(tone: string, fr: boolean): string {
  return TONE_PHRASES[tone] ? (fr ? TONE_PHRASES[tone].fr : TONE_PHRASES[tone].en) : tone;
}

function formalityLine(f: number, fr: boolean): string {
  return fr
    ? f <= 2
      ? "Registre décontracté, tutoiement, langage parlé."
      : f >= 4
        ? "Registre soutenu et corporate, vouvoiement, vocabulaire professionnel."
        : "Registre équilibré, ni trop familier ni trop formel."
    : f <= 2
      ? "Casual register, conversational and informal language."
      : f >= 4
        ? "Formal, corporate register with professional vocabulary."
        : "Balanced register — neither too casual nor too formal.";
}

function emotionLine(e: number, fr: boolean): string {
  return fr
    ? e <= 2
      ? "Reste factuel et sobre, peu de charge émotionnelle."
      : e >= 4
        ? "Forte charge émotionnelle, langage vivant et imagé."
        : "Émotion mesurée, sans être plat ni excessif."
    : e <= 2
      ? "Stay factual and sober, low emotional charge."
      : e >= 4
        ? "High emotional charge, vivid and evocative language."
        : "Measured emotion — neither flat nor over-the-top.";
}

const ORIENTATION_LINES: Record<string, { fr: string; en: string }> = {
  personal: {
    fr: "Angle personnel à la première personne (je, mon expérience vécue).",
    en: "Personal first-person angle (I, my lived experience).",
  },
  professional: {
    fr: "Angle analytique et professionnel, centré sur le métier et les faits.",
    en: "Analytical, professional angle centered on craft and facts.",
  },
};

/**
 * Translate the advanced params into a compact "STRATEGIC DIRECTION" block for
 * the PLANNER. Returns "" when nothing is set so the prompt (and its token cost)
 * is identical to the no-params path.
 */
function buildAdvancedDirectionBlock(
  advanced: StrategistAdvancedParams | undefined,
  language: "fr" | "en"
): string {
  if (!advanced) return "";
  const fr = language === "fr";
  const lines: string[] = [];

  const objective = advanced.objective;
  if (objective) {
    const map: Record<string, { fr: string; en: string }> = {
      authority: {
        fr: "Objectif : asseoir l'autorité et l'expertise — chaque post renforce la crédibilité.",
        en: "Objective: build authority and expertise — every post reinforces credibility.",
      },
      engagement: {
        fr: "Objectif : maximiser l'engagement (commentaires, partages) — pousse au débat et à la réaction.",
        en: "Objective: maximize engagement (comments, shares) — spark debate and reactions.",
      },
      "lead-gen": {
        fr: "Objectif : générer des leads qualifiés — chaque post oriente vers une prochaine étape concrète.",
        en: "Objective: generate qualified leads — each post nudges toward a concrete next step.",
      },
      conversion: {
        fr: "Objectif : convertir (essai, démo, achat) — montre la valeur et lève les objections.",
        en: "Objective: drive conversion (trial, demo, purchase) — show value and address objections.",
      },
      branding: {
        fr: "Objectif : renforcer la marque personnelle et la mémorabilité — voix et point de vue marqués.",
        en: "Objective: strengthen personal brand and memorability — distinct voice and point of view.",
      },
      storytelling: {
        fr: "Objectif : privilégier le récit et l'émotion narrative plutôt que la liste de conseils.",
        en: "Objective: favor narrative and emotional storytelling over tip-lists.",
      },
    };
    const m = map[objective];
    if (m) lines.push(`- ${fr ? m.fr : m.en}`);
  }

  if (advanced.tone) {
    const phrase = tonePhrase(advanced.tone, fr);
    lines.push(`- ${fr ? `Ton à adopter : ${phrase}.` : `Tone to adopt: ${phrase}.`}`);
  }

  if (advanced.audience?.trim()) {
    const a = advanced.audience.trim();
    lines.push(
      `- ${fr ? `Audience cible prioritaire pour ce plan : ${a}.` : `Priority target audience for this plan: ${a}.`}`
    );
  }

  if (advanced.formality) lines.push(`- ${formalityLine(advanced.formality, fr)}`);

  if (advanced.ctaIntensity) {
    const map: Record<string, { fr: string; en: string }> = {
      none: {
        fr: "Pas de CTA explicite — les posts se terminent sans appel à l'action.",
        en: "No explicit CTA — posts end without a call to action.",
      },
      soft: {
        fr: "CTA léger : une question ouverte ou une invitation douce en fin de post.",
        en: "Soft CTA: an open question or gentle invitation at the end.",
      },
      assertive: {
        fr: "CTA clair et assertif en fin de post (action précise attendue).",
        en: "Clear, assertive CTA at the end (a precise expected action).",
      },
    };
    const m = map[advanced.ctaIntensity];
    if (m) lines.push(`- ${fr ? m.fr : m.en}`);
  }

  if (advanced.hookStyle && advanced.hookStyle !== "auto") {
    const map: Record<string, { fr: string; en: string }> = {
      contrarian: {
        fr: "Hooks contrariens / à contre-courant qui cassent une croyance répandue.",
        en: "Contrarian hooks that break a widely-held belief.",
      },
      story: {
        fr: "Hooks en amorce narrative (anecdote, scène, moment précis).",
        en: "Narrative cold-open hooks (anecdote, scene, specific moment).",
      },
      data: {
        fr: "Hooks appuyés sur un fait ou une donnée — UNIQUEMENT si elle est fournie par l'auteur ou le contexte.",
        en: "Hooks built on a fact or data point — ONLY if provided by the author or the context.",
      },
      question: {
        fr: "Hooks en question forte qui interpelle l'audience.",
        en: "Hooks as a strong, pointed question.",
      },
      confession: {
        fr: "Hooks en aveu ou vulnérabilité assumée.",
        en: "Hooks as a confession or owned vulnerability.",
      },
    };
    const m = map[advanced.hookStyle];
    if (m) lines.push(`- ${fr ? m.fr : m.en}`);
  }

  if (advanced.orientation && advanced.orientation !== "balanced") {
    const m = ORIENTATION_LINES[advanced.orientation];
    if (m) lines.push(`- ${fr ? m.fr : m.en}`);
  }

  if (advanced.emotion) lines.push(`- ${emotionLine(advanced.emotion, fr)}`);

  if (lines.length === 0) return "";

  const header = fr
    ? "DIRECTION STRATÉGIQUE (priorité haute — ces consignes priment sur les défauts)"
    : "STRATEGIC DIRECTION (high priority — these override the defaults)";

  return `
═════════════════════════════════════
${header}
═════════════════════════════════════
${lines.join("\n")}
`;
}

/**
 * The same steering, phrased for the WRITER (Phase 2). The hook and the angle
 * are already decided by the brief and the CTA is folded into the format's
 * closing rule, so only voice-level levers remain here.
 */
export function buildWriterDirectionBlock(
  advanced: StrategistAdvancedParams | undefined,
  language: "fr" | "en",
): string {
  if (!advanced) return "";
  const fr = language === "fr";
  const lines: string[] = [];
  if (advanced.tone) {
    lines.push(`- ${fr ? `Ton : ${tonePhrase(advanced.tone, fr)}.` : `Tone: ${tonePhrase(advanced.tone, fr)}.`}`);
  }
  if (advanced.formality) lines.push(`- ${formalityLine(advanced.formality, fr)}`);
  if (advanced.emotion) lines.push(`- ${emotionLine(advanced.emotion, fr)}`);
  if (advanced.orientation && advanced.orientation !== "balanced") {
    const m = ORIENTATION_LINES[advanced.orientation];
    if (m) lines.push(`- ${fr ? m.fr : m.en}`);
  }
  if (advanced.audience?.trim()) {
    lines.push(`- ${fr ? `Lecteur visé : ${advanced.audience.trim()}.` : `Intended reader: ${advanced.audience.trim()}.`}`);
  }
  if (lines.length === 0) return "";
  return `

═════════════════════════════════════
${fr ? "DIRECTION DE L'AUTEUR (prime sur le style déclaré au profil)" : "AUTHOR'S DIRECTION (overrides the style declared in the profile)"}
═════════════════════════════════════
${lines.join("\n")}`;
}

const GOAL_SLUGS = `"authority" | "engagement" | "lead-gen" | "conversion" | "branding"`;
const FORMAT_LIST = FORMAT_SLUGS.map((s) => `"${s}"`).join(" | ");

function buildFrPrompt(count: number): string {
  return `Tu es POSTY STRATEGIST — un stratège éditorial LinkedIn senior. Tu construis un plan de posts pour UN auteur précis, à partir de sa demande, de son profil et de son activité.

Ton livrable : un objet JSON décrivant ${count} brief${count > 1 ? "s" : ""} de post${count > 1 ? "s" : ""} (PAS le texte des posts). L'auteur va relire le plan, l'ajuster, puis chaque brief sera rédigé.

═════════════════════════════════════
MÉTHODE (dans cet ordre)
═════════════════════════════════════
1. Comprends l'auteur : ce qu'il vend ou défend, à qui il parle, ce que son audience vit au quotidien. La demande de l'auteur prime sur tout le reste.
2. Pose la stratégie dans "strategy", AVANT les posts :
   - "edge" : ce que l'auteur sait ou a vécu que son audience n'a pas (tiré du profil et de l'activité) — c'est la matière première des angles ;
   - "pains" : 2 ou 3 frictions concrètes que son audience vit (des situations, pas des catégories : « le no-show de 9h qui décale toute la matinée », pas « la gestion du temps ») ;
   - "summary" : le fil rouge en 1-2 phrases, ce que la série doit faire penser de l'auteur — spécifique, jamais « X est un expert en Y » ;
   - "audience", "objective", "tone".
3. Chaque angle croise "edge" et une "pain". TEST DE SUBSTITUTION : si un autre professionnel, dans un autre secteur, pouvait publier le brief tel quel, il est trop générique → rends-le spécifique (une situation de son métier, une objection de ses clients, une décision qu'il a prise, un outil qu'il utilise).
4. Évite l'angle le plus évident. Cherche la tension : une croyance répandue que l'auteur conteste, un coût caché, une erreur fréquente, un arbitrage difficile.
5. Construis une progression : les posts se complètent (poser un problème → montrer une méthode → prouver par un cas → ouvrir le débat…), sans jamais se répéter.

═════════════════════════════════════
RÈGLES DU JSON (toutes obligatoires)
═════════════════════════════════════
1. JSON UNIQUEMENT, qui passe JSON.parse. Pas de texte autour, pas de balises markdown.
2. Forme exacte, dans cet ordre :
   { "strategy": { "edge", "pains", "summary", "audience", "objective", "tone" }, "theme": string, "posts": [ { "id", "format", "length", "goal", "hook", "angle", "rationale", "suggestedDate", "suggestedTime" } ] }
   "pains" est un tableau de chaînes. Optionnel par post : "audience" et "tone", UNIQUEMENT s'ils diffèrent de la stratégie.
   "theme" = titre court et spécifique de la série (pas une catégorie générique du type « Optimisation de la gestion »).
3. "format" ∈ ${FORMAT_LIST}. "length" ∈ "short" | "medium" | "long". "goal" ∈ ${GOAL_SLUGS}.
4. "hook" = la première ligne du post, telle que l'auteur la DIRAIT à voix haute, PAS un titre d'article (140 caractères max). Elle porte un élément concret (un moment, une décision, une phrase entendue, un détail du métier, un chiffre FOURNI) ou une prise de position nette.
   ✗ Formes interdites : « Comment X a… », « N conseils pour… », « X : par où commencer ? », « Pourquoi X… », « Le secret de… », « … plus que jamais », « Voici ma checklist », « Retour sur… », les questions fermées génériques (« X est-il inévitable ? »), « Saviez-vous », « Et si je vous disais », « Dans un monde où ».
   ✓ Exemples de FORME (ne reprends pas les sujets) : « Mardi, une cliente m'a demandé de retirer la moitié des fonctionnalités de son appli. Elle avait raison. » · « J'ai arrêté d'envoyer mes devis en PDF. » · « Mon pire recrutement avait le meilleur CV de la pile. » · « Un agenda rempli à 100 % est un agenda mal construit. »
5. "angle" = l'idée principale que le post défend ou démontre, en 1-2 phrases, avec LE détail qui la rend propre à l'auteur. Pas le post lui-même.
6. "rationale" = une phrase : pourquoi CE post, pour CETTE audience, à ce moment de la série.
7. Hooks et angles TRÈS différents d'un post à l'autre : jamais deux hooks qui commencent de la même façon, jamais deux posts sur la même idée.
8. "suggestedDate" dans la fenêtre de publication donnée plus bas, posts répartis sur toute la fenêtre. Au plus 1 post par jour (2 seulement s'il y a plus de posts que de jours). Jours ouvrés de préférence pour une audience B2B.
9. "suggestedTime" dans les créneaux de pointe LinkedIn (07:30-09:30, 11:30-13:30 ; secondaire 17:00-18:30), variés — pas la même heure partout.
10. "id" = slug court et unique (ex. "p1-objection-prix").
11. Exactement ${count} post${count > 1 ? "s" : ""}. Tous les textes en français.

═════════════════════════════════════
VÉRITÉ
═════════════════════════════════════
- N'invente aucun fait vérifiable sur l'auteur : pas de client nommé, de résultat chiffré, de pourcentage, de montant ou d'étude qu'il n'a pas fournis. Dans "hook" et "angle", AUCUN pourcentage, montant, multiple (« x3 ») ou résultat chiffré qui n'apparaît pas mot pour mot dans le profil, l'activité, la demande ou un bloc de contexte fourni. Un cas client sans données fournies se raconte de façon qualitative.
- Les situations vécues restent plausibles et typiques de son métier (l'auteur relira et complétera).
- Reprends les noms de produit, de marque ou de domaine EXACTEMENT comme l'auteur les écrit (ex. « postyapp.ai » tel quel).
- Refuse le contenu motivationnel générique.`;
}

function buildEnPrompt(count: number): string {
  return `You are POSTY STRATEGIST — a senior LinkedIn editorial strategist. You build a post plan for ONE specific author, from their request, their profile and their business.

Your deliverable: a JSON object describing ${count} post brief${count > 1 ? "s" : ""} (NOT the post copy). The author will review the plan, adjust it, then each brief will be written.

═════════════════════════════════════
METHOD (in this order)
═════════════════════════════════════
1. Understand the author: what they sell or stand for, who they talk to, what their audience lives day to day. The author's request overrides everything else.
2. Set the strategy in "strategy", BEFORE the posts:
   - "edge": what the author knows or has lived that their audience hasn't (from the profile and business block) — the raw material of the angles;
   - "pains": 2 or 3 concrete frictions the audience lives with (situations, not categories: "the 9am no-show that shifts the whole morning", not "time management");
   - "summary": the through-line in 1-2 sentences, what the series should make readers think of the author — specific, never "X is an expert in Y";
   - "audience", "objective", "tone".
3. Each angle crosses the "edge" with a "pain". SUBSTITUTION TEST: if another professional in another field could publish the brief unchanged, it is too generic → make it specific (a situation from their craft, an objection their clients raise, a decision they made, a tool they use).
4. Avoid the most obvious angle. Look for tension: a common belief the author disputes, a hidden cost, a frequent mistake, a hard trade-off.
5. Build a progression: posts complement each other (frame a problem → show a method → prove with a case → open the debate…), never repeating.

═════════════════════════════════════
JSON RULES (all required)
═════════════════════════════════════
1. JSON ONLY, parseable by JSON.parse. No text around it, no markdown fences.
2. Exact shape, in this order:
   { "strategy": { "edge", "pains", "summary", "audience", "objective", "tone" }, "theme": string, "posts": [ { "id", "format", "length", "goal", "hook", "angle", "rationale", "suggestedDate", "suggestedTime" } ] }
   "pains" is an array of strings. Optional per post: "audience" and "tone", ONLY when they differ from the strategy.
   "theme" = a short, specific title for the series (not a generic category like "Optimizing operations").
3. "format" ∈ ${FORMAT_LIST}. "length" ∈ "short" | "medium" | "long". "goal" ∈ ${GOAL_SLUGS}.
4. "hook" = the first line of the post, as the author would SAY it out loud, NOT an article title (max 140 characters). It carries something concrete (a moment, a decision, a sentence someone said, a detail of the craft, a PROVIDED number) or a clear stance.
   ✗ Forbidden shapes: "How X did…", "N tips to…", "X: where to start?", "Why X…", "The secret to…", "…more than ever", "Here's my checklist", generic yes/no questions ("Is X inevitable?"), "Did you know", "What if I told you", "In a world where".
   ✓ SHAPE examples (don't reuse the topics): "On Tuesday a client asked me to cut half the features from her app. She was right." · "I stopped sending quotes as PDFs." · "My worst hire had the best résumé in the pile." · "A calendar booked at 100% is a badly built calendar."
5. "angle" = the main idea the post argues or demonstrates, in 1-2 sentences, with THE detail that makes it the author's own. Not the post itself.
6. "rationale" = one sentence: why THIS post, for THIS audience, at this point in the series.
7. Hooks and angles VERY different from one post to the next: never two hooks opening the same way, never two posts on the same idea.
8. "suggestedDate" inside the publication window given below, spread across the whole window. At most 1 post per day (2 only if there are more posts than days). Business days preferred for a B2B audience.
9. "suggestedTime" in LinkedIn peak windows (07:30-09:30, 11:30-13:30; secondary 17:00-18:30), varied — not the same time everywhere.
10. "id" = short unique slug (e.g. "p1-price-objection").
11. Exactly ${count} post${count > 1 ? "s" : ""}. All text in English.

═════════════════════════════════════
TRUTH
═════════════════════════════════════
- Invent no verifiable fact about the author: no named client, measured result, percentage, amount or study they did not provide. In "hook" and "angle", NO percentage, amount, multiple ("3x") or measured result that doesn't appear verbatim in the profile, the business block, the request or a provided context block. A client case without provided data is told qualitatively.
- Lived situations stay plausible and typical of their craft (the author will review and complete them).
- Keep product, brand or domain names EXACTLY as the author writes them (e.g. keep "postyapp.ai" verbatim).
- Refuse generic motivational content.`;
}
