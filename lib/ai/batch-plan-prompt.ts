/**
 * Strategist Batch Plan — system prompt + Zod schema.
 *
 * Phase 1 deliverable: from a single user ask ("prépare-moi 5 posts cette
 * semaine"), produce a structured editorial plan of N briefs (hook + angle +
 * format + suggested slot). NOT full post copy — Phase 2 materializes each
 * brief via the existing /api/generate pipeline.
 *
 * Why a dedicated prompt (separate from the conversational Strategist):
 *   - JSON-mode call, gpt-4o, temperature 0.7 to encourage angle variety
 *   - Refuses to write post body (same boundary as the chat persona) — only
 *     briefs, so the output stays cheap and re-generable per row
 *   - Embeds an explicit anti-repetition rule on hooks/angles/formats —
 *     batches that read like the same post 5 times are the #1 risk
 */

import { z } from "zod";
import type { StrategistAdvancedParams } from "@/types";
import type { ExtractedUrlContent } from "@/lib/utils/url-extract";

/** Zod mirror of types/index.ts `PostBrief`. Used to validate the LLM output
 *  before persisting / rendering — a malformed brief breaks the table. */
export const PostBriefSchema = z.object({
  id: z.string().min(1).max(40),
  hook: z.string().min(8).max(280),
  angle: z.string().min(8).max(400),
  format: z.string().min(2).max(40),
  suggestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  suggestedTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM"),
  rationale: z.string().min(8).max(280),
});

export const BatchPlanResponseSchema = z.object({
  theme: z.string().min(4).max(160),
  posts: z.array(PostBriefSchema).min(1).max(15),
});

export type BatchPlanResponse = z.infer<typeof BatchPlanResponseSchema>;

/**
 * Build the LLM system prompt. We inline the user profile + the requested
 * batch parameters (count, period, start date, timezone) so the model has
 * everything it needs in one pass — no multi-turn back-and-forth (the user
 * already committed to the batch when they pressed enter).
 */
export function buildBatchPlanPrompt(opts: {
  language: "fr" | "en";
  count: number;
  startDate: string;          // YYYY-MM-DD
  timezone: string;           // e.g. "Europe/Paris"
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
  /** Last 3-5 post excerpts (first ~200 chars each) to anchor the style. */
  recentPostSnippets?: string[];
  /** Advanced steering from the drawer panel / saved profile defaults. Only
   *  the fields the user actually set are turned into instruction lines. */
  advanced?: StrategistAdvancedParams;
}): string {
  const { language, count, startDate, timezone, userContext, recentPostSnippets, advanced } = opts;

  const profileBlock = [
    userContext.name && `- Name: ${userContext.name}`,
    userContext.profileType && `- Profile type: ${userContext.profileType}`,
    userContext.sector && `- Sector: ${userContext.sector}`,
    userContext.role && `- Role: ${userContext.role}`,
    userContext.tagline && `- Tagline: ${userContext.tagline}`,
    userContext.website && `- Website: ${userContext.website}`,
    userContext.bio && `- Bio: ${userContext.bio.slice(0, 400)}`,
    userContext.objective && `- Business objective: ${userContext.objective}`,
    userContext.targetAudience && `- Target audience: ${userContext.targetAudience}`,
    userContext.communicationTone && `- Tone: ${userContext.communicationTone}`,
    userContext.publishingFrequency && `- Preferred frequency: ${userContext.publishingFrequency}`,
  ].filter(Boolean).join("\n") || "- (no profile fields captured yet)";

  const recentBlock = recentPostSnippets?.length
    ? recentPostSnippets.map((s, i) => `${i + 1}. ${s}`).join("\n")
    : "(no prior posts on file)";

  // The author's own description of what they do / their offer — the source of
  // truth when they ask for posts "about my product/brand". Without it the
  // model has only categorical fields and drifts generic.
  const ctxText = advanced?.context?.trim();
  const activityBlock = ctxText
    ? `
═════════════════════════════════════
${language === "fr" ? "ACTIVITÉ DE L'AUTEUR (source de vérité — utilise-la)" : "AUTHOR'S BUSINESS (source of truth — use it)"}
═════════════════════════════════════
${ctxText.slice(0, 800)}
${language === "fr"
        ? "→ Quand l'auteur demande des posts sur son produit / sa marque / son activité, ancre-toi ICI. N'invente RIEN au-delà de ces éléments."
        : "→ When the author asks for posts about their product / brand / business, ground yourself HERE. Invent NOTHING beyond these elements."}
`
    : "";

  const base = language === "fr" ? FR_PROMPT : EN_PROMPT;
  const directionBlock = buildAdvancedDirectionBlock(advanced, language);

  return `${base}

═════════════════════════════════════
USER PROFILE
═════════════════════════════════════
${profileBlock}
${activityBlock}
═════════════════════════════════════
RECENT POSTS (for style anchoring — do NOT copy)
═════════════════════════════════════
${recentBlock}

═════════════════════════════════════
BATCH PARAMETERS
═════════════════════════════════════
- Number of briefs to produce: ${count}
- First eligible publication date: ${startDate}
- User timezone (interpret suggestedTime in this TZ): ${timezone}
${directionBlock}`;
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

/** Tone preset slug → human phrasing injected into the prompt. Falls back to
 *  the raw slug for any free-text value the panel might pass in future. */
const TONE_PHRASES: Record<string, { fr: string; en: string }> = {
  direct: { fr: "direct et sans détour", en: "direct and to the point" },
  expert: { fr: "expert et précis", en: "expert and precise" },
  inspiring: { fr: "inspirant et mobilisateur", en: "inspiring and uplifting" },
  bold: { fr: "provocateur, à contre-courant", en: "bold and contrarian" },
  warm: { fr: "chaleureux et accessible", en: "warm and approachable" },
};

/**
 * Translate the advanced params into a compact "STRATEGIC DIRECTION" block.
 * Returns "" when nothing is set so the prompt (and its token cost) is
 * identical to the no-params path. Each set field becomes one instruction
 * line — terse on purpose to keep the call cheap.
 */
function buildAdvancedDirectionBlock(
  advanced: StrategistAdvancedParams | undefined,
  language: "fr" | "en"
): string {
  if (!advanced) return "";
  const fr = language === "fr";
  const lines: string[] = [];

  // Objective
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

  // Tone
  if (advanced.tone) {
    const phrase = TONE_PHRASES[advanced.tone]
      ? fr
        ? TONE_PHRASES[advanced.tone].fr
        : TONE_PHRASES[advanced.tone].en
      : advanced.tone;
    lines.push(`- ${fr ? `Ton à adopter : ${phrase}.` : `Tone to adopt: ${phrase}.`}`);
  }

  // Audience override
  if (advanced.audience?.trim()) {
    const a = advanced.audience.trim();
    lines.push(
      `- ${fr ? `Audience cible prioritaire pour ce batch : ${a}.` : `Priority target audience for this batch: ${a}.`}`
    );
  }

  // Formality (1 casual … 5 corporate)
  if (advanced.formality) {
    const f = advanced.formality;
    const phrase = fr
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
    lines.push(`- ${phrase}`);
  }

  // CTA intensity
  if (advanced.ctaIntensity) {
    const map: Record<string, { fr: string; en: string }> = {
      none: {
        fr: "Pas de CTA explicite — laisse le post ouvert, sans appel à l'action.",
        en: "No explicit CTA — leave the post open, no call to action.",
      },
      soft: {
        fr: "CTA léger : une question ouverte ou une invitation douce en fin de post.",
        en: "Soft CTA: an open question or gentle invitation at the end.",
      },
      assertive: {
        fr: "Termine par un CTA clair et assertif (action précise attendue).",
        en: "End with a clear, assertive CTA (a precise expected action).",
      },
    };
    const m = map[advanced.ctaIntensity];
    if (m) lines.push(`- ${fr ? m.fr : m.en}`);
  }

  // Hook style ("auto" = no constraint, skip)
  if (advanced.hookStyle && advanced.hookStyle !== "auto") {
    const map: Record<string, { fr: string; en: string }> = {
      contrarian: {
        fr: "Hooks contrariens / à contre-courant qui cassent une croyance répandue.",
        en: "Contrarian hooks that break a widely-held belief.",
      },
      story: {
        fr: "Ouvre par une amorce narrative (anecdote, scène, moment précis).",
        en: "Open with a narrative cold-open (anecdote, scene, specific moment).",
      },
      data: {
        fr: "Ouvre par un chiffre ou une donnée qui surprend.",
        en: "Open with a surprising number or data point.",
      },
      question: {
        fr: "Ouvre par une question forte qui interpelle l'audience.",
        en: "Open with a strong, pointed question.",
      },
      confession: {
        fr: "Ouvre par un aveu ou une vulnérabilité assumée.",
        en: "Open with a confession or owned vulnerability.",
      },
    };
    const m = map[advanced.hookStyle];
    if (m) lines.push(`- ${fr ? m.fr : m.en}`);
  }

  // Orientation ("balanced" = no constraint, skip)
  if (advanced.orientation && advanced.orientation !== "balanced") {
    const map: Record<string, { fr: string; en: string }> = {
      personal: {
        fr: "Angle personnel à la première personne (je, mon expérience vécue).",
        en: "Personal first-person angle (I, my lived experience).",
      },
      professional: {
        fr: "Angle analytique et professionnel, centré sur le métier et les faits.",
        en: "Analytical, professional angle centered on craft and facts.",
      },
    };
    const m = map[advanced.orientation];
    if (m) lines.push(`- ${fr ? m.fr : m.en}`);
  }

  // Emotion (1 factual … 5 vibrant)
  if (advanced.emotion) {
    const e = advanced.emotion;
    const phrase = fr
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
    lines.push(`- ${phrase}`);
  }

  if (lines.length === 0) return "";

  const header = fr
    ? "STRATEGIC DIRECTION (priorité haute — ces consignes priment sur les défauts)"
    : "STRATEGIC DIRECTION (high priority — these override the defaults)";

  return `
═════════════════════════════════════
${header}
═════════════════════════════════════
${lines.join("\n")}
`;
}

const EN_PROMPT = `You are POSTY STRATEGIST — a senior B2B LinkedIn growth advisor producing an editorial batch plan for a single user.

Your job for this call: produce a JSON object describing ${"<N>"} post BRIEFS (NOT full post copy) that the user can review, edit, and later materialize through the regular post pipeline.

═════════════════════════════════════
HARD RULES (all required)
═════════════════════════════════════
1. JSON ONLY. No prose around the object. No code fences. Output must parse with JSON.parse.
2. Shape exactly:
   { "theme": string, "posts": Array<{ id, hook, angle, format, suggestedDate, suggestedTime, rationale }> }
3. NEVER write the full post body. \`hook\` is the opening 1-2 sentences only. \`angle\` describes what the post will argue or show in 1-2 lines — not the post itself.
4. \`format\` must vary across the batch. Pick from (or invent equivalents): "storytelling", "lesson-learned", "how-to", "opinion", "carrousel", "data-drop", "behind-the-scenes", "thread-of-thought", "case-study", "list", "contrarian-take". No batch should use the same format twice in a row. \`format\` MUST be a short slug — max 40 characters, no sentences.
5. \`hook\` and \`angle\` must be SUBSTANTIALLY different from one post to the next. No "5 posts about X" cookie-cutter.
6. \`suggestedDate\` must be ≥ the first eligible date provided. Spread the batch across days according to the user's preferred publishing frequency (daily / 3-4x week / 1-2x week). Never schedule 2 posts on the same day unless frequency = daily AND count > 5.
7. \`suggestedTime\` should target LinkedIn peak windows for B2B audiences (typically 07:30-09:30 and 11:30-13:30 local time, with 17:00-18:30 as a secondary slot). Vary within these windows — do NOT propose 09:00 for every post.
8. \`rationale\` is one sentence explaining why this angle on this day at this time fits the user's profile. Concrete, not generic.
9. \`id\` is a short slug derived from the angle (e.g. "p1-friction-paradox") — must be unique within the batch.

═════════════════════════════════════
STYLE
═════════════════════════════════════
- Hooks are scroll-stoppers: a counter-intuitive claim, a number that surprises, a confession, a hard question. Avoid "Did you know" / "In today's world" / "X is more important than ever".
- Angles must be SHARP. "Productivity tips" is too vague. "The 3-meeting rule I stole from Stripe" is sharp.
- Respect the user's tone field from the profile block.
- Ground every brief in the author's REAL profile + business above. When they ask for posts about their own product/brand/company, the AUTHOR'S BUSINESS block is the source of truth — write AS THE AUTHOR (first person, their voice), human and specific, never a generic outsider pitch and never invented facts. Use the product / brand / domain name EXACTLY as the author wrote it (e.g. keep "postyapp.ai" verbatim) — never alter, abbreviate or misspell it.
- All free-text fields (hook, angle, format, rationale, theme) MUST be written in the user's language: ${"<LANG>"}.

═════════════════════════════════════
WHAT YOU REFUSE
═════════════════════════════════════
- Writing the actual post copy.
- Generic motivational content.
- Inventing user data (don't reference projects, clients, or numbers the user didn't provide).
- Suggesting more or fewer briefs than requested.`;

const FR_PROMPT = `Tu es POSTY STRATEGIST — un conseiller senior en croissance LinkedIn B2B qui produit un PLAN éditorial pour un seul utilisateur.

Ton job pour cet appel : produire un objet JSON décrivant N BRIEFS de posts (PAS le texte complet) que l'utilisateur pourra relire, éditer, puis matérialiser via le pipeline post normal.

═════════════════════════════════════
RÈGLES STRICTES (toutes requises)
═════════════════════════════════════
1. JSON UNIQUEMENT. Pas de prose autour. Pas de fences markdown. La sortie doit passer JSON.parse.
2. Forme exacte :
   { "theme": string, "posts": Array<{ id, hook, angle, format, suggestedDate, suggestedTime, rationale }> }
3. JAMAIS écrire le corps complet du post. \`hook\` = les 1-2 premières phrases d'accroche seulement. \`angle\` = ce que le post va défendre ou montrer en 1-2 lignes — pas le post lui-même.
4. \`format\` doit VARIER dans le batch. Choisis (ou invente des équivalents) : "storytelling", "lesson-learned", "how-to", "opinion", "carrousel", "data-drop", "behind-the-scenes", "thread-of-thought", "case-study", "list", "contrarian-take". Jamais le même format deux posts d'affilée. \`format\` DOIT être un slug court — 40 caractères max, pas de phrase.
5. \`hook\` et \`angle\` doivent être TRÈS différents d'un post à l'autre. Pas de "5 posts sur X" en mode template.
6. \`suggestedDate\` doit être ≥ à la première date éligible fournie. Répartis le batch sur les jours selon la fréquence de publication préférée de l'utilisateur (quotidien / 3-4x semaine / 1-2x semaine). Jamais 2 posts le même jour SAUF si fréquence = quotidien ET count > 5.
7. \`suggestedTime\` cible les fenêtres de pointe LinkedIn pour audience B2B (typiquement 07:30-09:30 et 11:30-13:30 heure locale, avec 17:00-18:30 en créneau secondaire). Varie dans ces fenêtres — ne propose PAS 09:00 pour chaque post.
8. \`rationale\` = une phrase qui explique pourquoi cet angle, ce jour, cette heure correspondent au profil utilisateur. Concret, pas générique.
9. \`id\` = slug court dérivé de l'angle (ex : "p1-paradoxe-friction") — unique dans le batch.

═════════════════════════════════════
STYLE
═════════════════════════════════════
- Les hooks doivent arrêter le scroll : affirmation contre-intuitive, chiffre qui surprend, aveu, question dure. Évite "Saviez-vous" / "Aujourd'hui plus que jamais" / "X est plus important que jamais".
- Les angles doivent être TRANCHANTS. "Conseils productivité" est trop vague. "La règle des 3 réunions que j'ai volée chez Stripe" est tranchant.
- Respecte le ton de l'utilisateur (champ du profil).
- Ancre chaque brief dans le profil + l'activité RÉELS de l'auteur ci-dessus. Quand il demande des posts sur son propre produit/sa marque/son entreprise, le bloc ACTIVITÉ DE L'AUTEUR est la source de vérité — écris COMME L'AUTEUR (première personne, sa voix), humain et spécifique, jamais un pitch générique d'observateur extérieur et jamais de faits inventés. Reprends le nom du produit / de la marque / du domaine EXACTEMENT comme l'auteur l'a écrit (ex : garde « postyapp.ai » tel quel) — ne l'altère, ne l'abrège et ne le déforme jamais.
- Tous les champs texte (hook, angle, format, rationale, theme) DOIVENT être écrits dans la langue de l'utilisateur : français.

═════════════════════════════════════
CE QUE TU REFUSES
═════════════════════════════════════
- Écrire le texte complet du post.
- Du contenu motivationnel générique.
- Inventer des données utilisateur (ne référence pas de projets, clients, chiffres que l'utilisateur n'a pas donnés).
- Proposer plus ou moins de briefs que demandé.`;
