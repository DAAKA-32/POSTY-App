/**
 * Ready-posts prompt builder — Max-only personalized post generation.
 *
 * Builds the system prompt that powers the /api/ready-posts/generate endpoint.
 * Maps each ready-post category to a tailored angle directive, then layers
 * the existing user-specific voice profile (sector, role, tone, objective,
 * audience) on top via buildOptimizedPrompt().
 *
 * Design contract:
 *   - Every category produces a *different* writing angle.
 *   - Profile signals drive vocabulary, tone and signature.
 *   - Optional memory items inject contextual hooks (recurring themes,
 *     declared facts/events) without overriding the category angle.
 */

import type { ReadyPostCategory } from "@/lib/data/ready-posts";
import {
  buildOptimizedPrompt,
  getGenerationTemperature,
  type PlanTier,
  type ProfileFields,
} from "@/lib/services/prompt-builder";
import { buildMemoryContext } from "@/lib/services/memory";
import type { MemoryItem } from "@/types";

type Language = "fr" | "en";

/**
 * Each category resolves to a base post type understood by buildOptimizedPrompt
 * (storytelling vs business voice) plus a tight angle directive that locks
 * the structure of the post.
 */
interface CategoryDirective {
  postType: "storytelling" | "business";
  angle: { fr: string; en: string };
  /** Topic seed handed to the user-prompt of the chat completion. */
  seed: { fr: string; en: string };
}

const CATEGORY_DIRECTIVES: Record<ReadyPostCategory, CategoryDirective> = {
  storytelling: {
    postType: "storytelling",
    angle: {
      fr: `ANGLE DE CETTE GÉNÉRATION (Storytelling): Ouvre par un moment précis et daté tiré du quotidien de l'auteur (ex. "Il y a 3 mois...", "Mardi dernier..."). Construis une tension narrative en 2-3 paragraphes courts. Termine par UNE leçon métier nette, pas un sermon. Pas de morale plaquée, pas d'open-ended cliché.`,
      en: `ANGLE FOR THIS GENERATION (Storytelling): Open with a precise, dated moment from the author's life (e.g. "3 months ago...", "Last Tuesday..."). Build narrative tension across 2-3 short paragraphs. Land on ONE crisp professional lesson — no preaching, no clichéd open-ended close.`,
    },
    seed: {
      fr: "Raconte une expérience marquante de ton parcours professionnel récent qui a changé ta façon de voir ton métier.",
      en: "Tell a recent meaningful experience from your professional journey that changed how you see your work.",
    },
  },
  tips: {
    postType: "business",
    angle: {
      fr: `ANGLE DE CETTE GÉNÉRATION (Conseils pratiques): Liste 3 à 5 conseils opérationnels que TOI tu as testés. Chaque conseil = une seule action concrète, pas une généralité. Numérote. Mentionne au moins UN conseil contre-intuitif ou que les autres ratent. Pas de "mindset", pas de "be authentic" — du terrain.`,
      en: `ANGLE FOR THIS GENERATION (Practical Tips): List 3 to 5 operational tips YOU have actually tested. Each tip = one concrete action, not a generality. Number them. Include at least ONE counter-intuitive tip or one most people miss. No "mindset talk", no "be authentic" — real-world only.`,
    },
    seed: {
      fr: "Partage tes meilleures astuces opérationnelles pour ton domaine — celles que tu utilises vraiment au quotidien.",
      en: "Share your best operational tips for your field — the ones you actually use daily.",
    },
  },
  controversial: {
    postType: "business",
    angle: {
      fr: `ANGLE DE CETTE GÉNÉRATION (Opinion forte): Ouvre par une prise de position claire, contre-intuitive et spécifique à ton industrie (ex. "Opinion impopulaire :"). Défends-la avec 2-3 raisons concrètes basées sur ton expérience. Termine par une question ouverte au lecteur. Évite les attaques personnelles et les sujets clivants hors du métier.`,
      en: `ANGLE FOR THIS GENERATION (Strong Opinion): Open with a clear, counter-intuitive stance specific to your industry (e.g. "Hot take:"). Defend it with 2-3 concrete reasons drawn from your experience. End with an open question to the reader. Avoid personal attacks and divisive topics outside your field.`,
    },
    seed: {
      fr: "Prends une position forte et contre-intuitive sur une pratique courante de ton secteur que la plupart des gens ne remettent jamais en question.",
      en: "Take a strong, counter-intuitive stance on a common practice in your field that most people never question.",
    },
  },
  success: {
    postType: "business",
    angle: {
      fr: `ANGLE DE CETTE GÉNÉRATION (Victoires & Résultats): Ouvre par UN résultat chiffré crédible (ex. "+47% en 90 jours"). Décris brièvement le contexte de départ. Liste les 3 leviers concrets qui ont vraiment fait la différence. Termine par UN insight non-évident — ce qui t'a surpris dans le process. Pas de bragging, pas de "humble brag" — montre le mécanisme.`,
      en: `ANGLE FOR THIS GENERATION (Wins & Results): Open with ONE credible numbered result (e.g. "+47% in 90 days"). Briefly describe the starting context. List the 3 concrete levers that actually moved the needle. End with ONE non-obvious insight — what surprised you in the process. No bragging, no humble-brag — show the mechanism.`,
    },
    seed: {
      fr: "Détaille un résultat concret que tu as obtenu récemment dans ton métier, et les 3 leviers qui ont vraiment fait la différence.",
      en: "Break down a concrete result you achieved recently in your work, and the 3 levers that actually made the difference.",
    },
  },
  lesson: {
    postType: "storytelling",
    angle: {
      fr: `ANGLE DE CETTE GÉNÉRATION (Leçon apprise): Cadre le post comme "Ce que j'aurais aimé savoir avant de [X]" ou "Les erreurs qui m'ont coûté cher". Liste 3-4 leçons spécifiques à ton métier. Pour chaque leçon, dis pourquoi elle t'a semblé contre-intuitive sur le moment. Termine par ce que tu ferais différemment maintenant.`,
      en: `ANGLE FOR THIS GENERATION (Lesson Learned): Frame the post as "What I wish I'd known before [X]" or "The mistakes that cost me". List 3-4 lessons specific to your work. For each, say why it felt counter-intuitive at the time. End with what you'd do differently today.`,
    },
    seed: {
      fr: "Partage les leçons les plus importantes que tu as apprises dans ton métier, idéalement celles qui t'ont coûté avant de les comprendre.",
      en: "Share the most important lessons you've learned in your work — ideally the ones that cost you before you understood them.",
    },
  },
  question: {
    postType: "business",
    angle: {
      fr: `ANGLE DE CETTE GÉNÉRATION (Engagement): Pose UNE question nette et précise à ton audience cible. Donne le contexte qui motive ta question. Partage ta propre réponse partielle pour amorcer le débat. Termine par une reformulation pour inviter à répondre. La question doit être ancrée métier, pas philosophique.`,
      en: `ANGLE FOR THIS GENERATION (Engagement): Ask ONE sharp, precise question to your target audience. Give the context that motivates the question. Share your own partial take to seed the debate. End with a restated invitation to answer. The question must be field-anchored, not philosophical.`,
    },
    seed: {
      fr: "Pose une question franche à ta communauté professionnelle sur un sujet qui te questionne actuellement dans ton métier.",
      en: "Ask your professional community an honest question about something you're currently wrestling with in your work.",
    },
  },
};

export interface BuildReadyPostPromptArgs {
  category: ReadyPostCategory;
  profile?: ProfileFields | null;
  language: Language;
  /** Optional contextual memory items extracted from past conversations. */
  memoryItems?: MemoryItem[];
}

export interface BuiltReadyPostPrompt {
  systemPrompt: string;
  userPrompt: string;
  postType: "storytelling" | "business";
  temperature: number;
}

/**
 * Builds the full prompt pair for a personalized ready post.
 *
 * The system prompt = base Max-tier prompt (with rich voice profile) +
 * category angle directive + (optional) memory context. The user prompt is
 * a category-aligned topic seed; the heavy lifting happens in the system.
 */
export function buildReadyPostPrompt({
  category,
  profile,
  language,
  memoryItems,
}: BuildReadyPostPromptArgs): BuiltReadyPostPrompt {
  const directive = CATEGORY_DIRECTIVES[category];
  const plan: PlanTier = "max";

  // Base prompt = Max-tier voice + sector + role + tone + objective strategy + audience.
  let systemPrompt = buildOptimizedPrompt(directive.postType, language, profile ?? null, plan);

  // Hard category override appended LAST so it wins over generic structure variations.
  systemPrompt += `\n\n${directive.angle[language]}`;

  // Memory context (subtle injection — instructs the LLM to weave it in only when relevant).
  if (memoryItems && memoryItems.length > 0) {
    const memoryBlock = buildMemoryContext(memoryItems, directive.seed[language], language);
    if (memoryBlock) {
      systemPrompt += memoryBlock;
    }
  }

  return {
    systemPrompt,
    userPrompt: directive.seed[language],
    postType: directive.postType,
    temperature: getGenerationTemperature(directive.postType, plan),
  };
}
