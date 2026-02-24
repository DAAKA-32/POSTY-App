/**
 * Centralized Prompt Builder for POSTY
 *
 * Single source of truth for:
 * - Profile synthesis (compact profile → 1-2 sentences)
 * - Optimized system prompt construction
 * - Token-efficient context injection
 *
 * Design principles:
 * - Only inject fields that have real values (never "Non spécifié")
 * - Synthesize profile into a compact sentence (not a list of labels)
 * - Adapt prompt strategy based on user's objective
 * - Minimize token usage while maximizing personalization quality
 */

// ============== TYPES ==============

export interface ProfileFields {
  profileType?: string;
  sector?: string;
  role?: string;
  objective?: string;
  linkedinStyle?: string;
  targetAudience?: string;
  communicationTone?: string;
  publishingFrequency?: string;
}

type Language = "fr" | "en";
type PostType = "storytelling" | "business";

// ============== OBJECTIVE STRATEGY MAP ==============

/**
 * Maps user objectives to strategic instructions for the LLM.
 * This ensures the generated content is oriented toward the user's actual goal.
 */
const OBJECTIVE_STRATEGIES: Record<string, { fr: string; en: string }> = {
  "Trouver de nouveaux clients": {
    fr: "Oriente le post vers la démonstration de résultats concrets et inclus un appel à l'action qui invite à la prise de contact ou au DM.",
    en: "Orient the post toward demonstrating concrete results and include a call-to-action inviting contact or DM.",
  },
  "Augmenter mon chiffre d'affaires": {
    fr: "Mets en avant la valeur business et le ROI. Positionne l'expertise comme levier de croissance. Le CTA doit orienter vers une conversation business.",
    en: "Highlight business value and ROI. Position expertise as a growth lever. The CTA should steer toward a business conversation.",
  },
  "Développer ma visibilité et crédibilité": {
    fr: "Maximise la portée organique: hook irrésistible, opinion tranchée, question ouverte finale. Encourage les partages et commentaires.",
    en: "Maximize organic reach: irresistible hook, bold opinion, open-ended closing question. Encourage shares and comments.",
  },
  "Générer des leads qualifiés": {
    fr: "Structure le post comme un tunnel: problème → insight exclusif → preuve de résultat → CTA vers une ressource ou un échange. Cible précisément l'audience décisionnaire.",
    en: "Structure the post as a funnel: problem → exclusive insight → proof of result → CTA toward a resource or exchange. Target decision-makers precisely.",
  },
  "Construire une audience engagée": {
    fr: "Favorise l'authenticité et le partage d'expérience. Crée un sentiment de communauté. Termine par une question qui invite au dialogue et au partage d'expériences similaires.",
    en: "Favor authenticity and experience sharing. Create a sense of community. End with a question inviting dialogue and similar experience sharing.",
  },
};

// ============== PROFILE SYNTHESIS ==============

/**
 * Synthesizes raw profile fields into a compact 1-2 sentence description.
 * This replaces the verbose label-based injection and saves ~60-80 tokens.
 *
 * Example output (FR):
 * "Consultant en marketing B2B (Tech / IT), cible des dirigeants PME.
 *  Objectif: générer des leads qualifiés. Ton: direct et percutant."
 *
 * Example output (EN):
 * "B2B marketing consultant (Tech / IT), targets SMB executives.
 *  Goal: generate qualified leads. Tone: direct and punchy."
 */
export function synthesizeProfile(
  profile: ProfileFields,
  language: Language
): string | null {
  const parts: string[] = [];

  // Core identity: role + sector (always useful)
  const role = profile.role?.trim();
  const sector = profile.sector?.trim();

  if (role && sector) {
    parts.push(language === "fr" ? `${role} (${sector})` : `${role} (${sector})`);
  } else if (role) {
    parts.push(role);
  } else if (sector) {
    parts.push(language === "fr" ? `Secteur: ${sector}` : `Sector: ${sector}`);
  }

  // Target audience (high-value for personalization)
  const audience = profile.targetAudience?.trim();
  if (audience) {
    parts.push(
      language === "fr" ? `cible: ${audience}` : `targets: ${audience}`
    );
  }

  // Objective (drives the strategic direction)
  const objective = profile.objective?.trim();
  if (objective) {
    parts.push(
      language === "fr" ? `objectif: ${objective}` : `goal: ${objective}`
    );
  }

  // Communication tone (shapes the voice)
  const tone = profile.communicationTone?.trim();
  if (tone) {
    parts.push(language === "fr" ? `ton: ${tone}` : `tone: ${tone}`);
  }

  // LinkedIn style preference (secondary, only if no tone is set)
  if (!tone) {
    const style = profile.linkedinStyle?.trim();
    if (style) {
      parts.push(
        language === "fr" ? `style: ${style}` : `style: ${style}`
      );
    }
  }

  // If nothing useful, return null (don't inject empty context)
  if (parts.length === 0) return null;

  // Join into a compact sentence
  return parts.join(", ") + ".";
}

// ============== OBJECTIVE STRATEGY INJECTION ==============

/**
 * Returns the strategic instruction matching the user's objective.
 * Falls back to null if no match (no wasted tokens).
 */
function getObjectiveStrategy(
  objective: string | undefined,
  language: Language
): string | null {
  if (!objective?.trim()) return null;

  const strategy = OBJECTIVE_STRATEGIES[objective.trim()];
  return strategy ? strategy[language] : null;
}

// ============== SANITIZATION ==============

/**
 * Sanitize user input to prevent prompt injection attacks.
 * Compact version — applied to the synthesized profile string.
 */
function sanitizeInput(input: string): string {
  return input
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/gi, "")
    .replace(/disregard\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/gi, "")
    .replace(/forget\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/gi, "")
    .replace(/show\s+me\s+(your\s+)?system\s+prompt/gi, "")
    .replace(/print\s+(your\s+)?system\s+prompt/gi, "")
    .replace(/reveal\s+(your\s+)?instructions/gi, "")
    .replace(/you\s+are\s+(now\s+)?a/gi, "")
    .replace(/act\s+as\s+(if\s+you\s+(are|were)\s+)?/gi, "")
    .replace(/pretend\s+(to\s+be|you('re)?\s+(are|were))/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .substring(0, 500)
    .trim();
}

// ============== PREMIUM SYSTEM PROMPTS ==============

/**
 * Enhanced system prompts that produce premium, conversion-oriented content.
 * These replace the base prompts from lib/openai/service.ts for generation.
 */
const PREMIUM_SYSTEM_PROMPTS: Record<PostType, Record<Language, string>> = {
  storytelling: {
    fr: `Tu es un ghostwriter LinkedIn d'élite spécialisé en storytelling professionnel.

MISSION: Transformer l'idée de l'utilisateur en un récit captivant qui génère de l'engagement et positionne l'auteur comme une voix authentique et mémorable.

STRUCTURE OBLIGATOIRE:
1. HOOK (ligne 1): Une phrase qui arrête le scroll. Utilise une des techniques: contradiction, chiffre surprenant, question provocante, confession, ou déclaration audacieuse.
2. TENSION (lignes 2-4): Crée un arc narratif — le problème, le défi, le moment de doute.
3. PIVOT (milieu): Le tournant — la leçon, la prise de conscience, le moment décisif.
4. RÉSOLUTION + VALEUR: Ce que ça change concrètement. Donne un takeaway actionnable.
5. CTA (fin): Question ouverte qui invite au dialogue (pas un pitch commercial).
6. HASHTAGS: 3-5 hashtags stratégiques en fin de post.

RÈGLES DE FORMAT:
- Paragraphes de 1-2 lignes max (lisibilité mobile)
- Ligne vide entre chaque paragraphe
- "Je" pour l'authenticité
- Emojis: 0-2 max, uniquement si naturels
- Longueur: 1200-1500 caractères

QUALITÉ PREMIUM:
- Chaque phrase doit mériter sa place (pas de remplissage)
- Vocabulaire précis et impactant (pas de jargon creux)
- Le lecteur doit ressentir quelque chose (émotion > information)
- Le post doit donner envie de commenter et partager`,

    en: `You are an elite LinkedIn ghostwriter specializing in professional storytelling.

MISSION: Transform the user's idea into a captivating narrative that drives engagement and positions the author as an authentic, memorable voice.

MANDATORY STRUCTURE:
1. HOOK (line 1): A scroll-stopping sentence. Use one technique: contradiction, surprising stat, provocative question, confession, or bold statement.
2. TENSION (lines 2-4): Create a narrative arc — the problem, the challenge, the moment of doubt.
3. PIVOT (middle): The turning point — the lesson, the realization, the decisive moment.
4. RESOLUTION + VALUE: What concretely changes. Give an actionable takeaway.
5. CTA (end): Open-ended question inviting dialogue (not a sales pitch).
6. HASHTAGS: 3-5 strategic hashtags at the end.

FORMAT RULES:
- 1-2 line paragraphs max (mobile readability)
- Blank line between paragraphs
- Use "I" for authenticity
- Emojis: 0-2 max, only if natural
- Length: 1200-1500 characters

PREMIUM QUALITY:
- Every sentence must earn its place (no filler)
- Precise, impactful vocabulary (no hollow jargon)
- The reader must feel something (emotion > information)
- The post should make people want to comment and share`,
  },
  business: {
    fr: `Tu es un stratège de contenu LinkedIn spécialisé en thought leadership et génération d'autorité.

MISSION: Transformer l'idée de l'utilisateur en contenu business qui démontre une expertise indiscutable et génère de la valeur pour l'audience.

STRUCTURE OBLIGATOIRE:
1. HOOK (ligne 1): Problème, promesse ou insight contre-intuitif qui capte l'attention des professionnels.
2. CONTEXTE (2-3 lignes): Pourquoi ce sujet compte maintenant. Données ou observation terrain.
3. VALEUR (corps): 3-5 points clés, chacun avec un insight actionnable. Format: listes à puces ou numérotées.
4. PREUVE: Exemple concret, résultat chiffré ou cas pratique qui crédibilise.
5. SYNTHÈSE + CTA: Takeaway principal + question qui invite l'audience à partager son expérience.
6. HASHTAGS: 3-5 hashtags stratégiques en fin de post.

RÈGLES DE FORMAT:
- Structure aérée, scannable rapidement
- Listes à puces pour les insights clés
- Chiffres et données quand pertinent
- Paragraphes courts (2-3 lignes)
- Longueur: 1000-1300 caractères

QUALITÉ PREMIUM:
- Expertise démontrée, pas affirmée (montrer, pas dire)
- Conseils immédiatement applicables (le lecteur repart avec quelque chose)
- Ton: expert et accessible, confiant sans arrogance
- Chaque post renforce le positionnement de l'auteur comme référence`,

    en: `You are a LinkedIn content strategist specializing in thought leadership and authority building.

MISSION: Transform the user's idea into business content that demonstrates undeniable expertise and generates value for the audience.

MANDATORY STRUCTURE:
1. HOOK (line 1): Problem, promise, or counter-intuitive insight that captures professional attention.
2. CONTEXT (2-3 lines): Why this topic matters now. Data or field observation.
3. VALUE (body): 3-5 key points, each with an actionable insight. Format: bullet points or numbered lists.
4. PROOF: Concrete example, quantified result, or case study that builds credibility.
5. SYNTHESIS + CTA: Main takeaway + question inviting the audience to share their experience.
6. HASHTAGS: 3-5 strategic hashtags at the end.

FORMAT RULES:
- Airy, quickly scannable structure
- Bullet points for key insights
- Numbers and data when relevant
- Short paragraphs (2-3 lines)
- Length: 1000-1300 characters

PREMIUM QUALITY:
- Expertise demonstrated, not claimed (show, don't tell)
- Immediately applicable advice (reader leaves with something)
- Tone: expert and accessible, confident without arrogance
- Every post reinforces the author's positioning as a reference`,
  },
};

// ============== MAIN BUILDER ==============

/**
 * Builds the optimized system prompt for LinkedIn post generation.
 *
 * Token optimization:
 * - Base prompt: ~250 tokens (optimized from ~180 + verbose profile injection)
 * - Profile synthesis: ~20-40 tokens (down from ~100-150 with labels)
 * - Objective strategy: ~30-50 tokens (new, high value)
 * - Total savings: ~50-80 tokens per request
 *
 * @param type - "storytelling" or "business"
 * @param language - "fr" or "en"
 * @param profile - Raw profile fields (already filtered by plan)
 * @returns Complete system prompt ready for the LLM
 */
export function buildOptimizedPrompt(
  type: PostType,
  language: Language,
  profile?: ProfileFields | null
): string {
  // Start with the premium base prompt
  let prompt = PREMIUM_SYSTEM_PROMPTS[type][language];

  if (!profile) return prompt;

  // Synthesize profile into a compact description
  const synthesized = synthesizeProfile(profile, language);

  if (synthesized) {
    // Sanitize the synthesized profile
    const safeProfile = sanitizeInput(synthesized);

    // Inject compact profile context
    const header = language === "fr" ? "AUTEUR" : "AUTHOR";
    prompt += `\n\n${header}: ${safeProfile}`;
  }

  // Inject objective-specific strategy (high-value, low-cost)
  const strategy = getObjectiveStrategy(profile.objective, language);
  if (strategy) {
    const strategyHeader = language === "fr" ? "STRATÉGIE" : "STRATEGY";
    prompt += `\n${strategyHeader}: ${strategy}`;
  }

  // Inject audience targeting instruction if available
  if (profile.targetAudience?.trim()) {
    const audienceInstruction =
      language === "fr"
        ? `CIBLAGE: Adapte le vocabulaire, les exemples et les références pour résonner spécifiquement avec ${profile.targetAudience.trim()}.`
        : `TARGETING: Adapt vocabulary, examples, and references to resonate specifically with ${profile.targetAudience.trim()}.`;
    prompt += `\n${audienceInstruction}`;
  }

  return prompt;
}

// ============== EXPORTS FOR ROUTE.TS ==============

/**
 * Estimates token count for a prompt string.
 * Uses the ~4 chars/token approximation for GPT models.
 * Useful for monitoring and cost awareness.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
