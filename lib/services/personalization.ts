// ============================================================
// PERSONALIZATION ENGINE
// Adapts UI text, placeholders, and template ordering
// based on the user's onboarding profile data.
// Supports English and French via language parameter.
// ============================================================

import { UserProfile } from "@/types";
import { Language } from "@/lib/i18n";

type ProfileData = UserProfile["profile"];
type LocalizedText = Partial<Record<Language, string>>;
type LocalizedTextArray = Partial<Record<Language, string[]>>;

// ---------------------------------------------------------------------------
// WELCOME SUBTITLE - adapts the description below "Bonjour, {name}!"
// ---------------------------------------------------------------------------

const SUBTITLE_BY_OBJECTIVE: Record<string, LocalizedText> = {
  "Trouver de nouveaux clients": {
    fr: "Creez des posts qui attirent vos futurs clients",
    en: "Create posts that attract your future clients",
  },
  "Augmenter mon chiffre d'affaires": {
    fr: "Generez des posts qui convertissent votre audience",
    en: "Generate posts that convert your audience",
  },
  "Developper ma visibilite et credibilite": {
    fr: "Renforcez votre image d'expert avec chaque post",
    en: "Strengthen your expert image with every post",
  },
  "Generer des leads qualifies": {
    fr: "Transformez votre audience LinkedIn en opportunites",
    en: "Turn your LinkedIn audience into opportunities",
  },
  "Construire une audience engagee": {
    fr: "Fidelisez votre communaute avec du contenu percutant",
    en: "Build a loyal community with impactful content",
  },
};

const DEFAULT_SUBTITLE: LocalizedText = {
  fr: "Decrivez votre idee et je genererai 2 versions optimisees de votre post LinkedIn",
  en: "Describe your idea and I'll generate 2 optimized versions of your LinkedIn post",
};

export function getPersonalizedSubtitle(profile?: ProfileData, language: Language = "fr"): string {
  if (!profile?.objective) return (DEFAULT_SUBTITLE[language] || DEFAULT_SUBTITLE.en!);

  // Try exact match first, then partial match
  for (const [key, subtitles] of Object.entries(SUBTITLE_BY_OBJECTIVE)) {
    if (profile.objective.toLowerCase().includes(key.toLowerCase().slice(0, 15))) {
      return subtitles[language] || subtitles.en!;
    }
  }

  return (DEFAULT_SUBTITLE[language] || DEFAULT_SUBTITLE.en!);
}

// ---------------------------------------------------------------------------
// PLACEHOLDER EXAMPLES - adapts rotating input placeholders to the sector
// ---------------------------------------------------------------------------

const PLACEHOLDERS_BY_SECTOR: Record<string, LocalizedTextArray> = {
  "Tech / IT": {
    fr: [
      "Un post sur une innovation tech...",
      "Comment l'IA transforme mon quotidien...",
      "Une lecon apprise en developpement...",
      "Les erreurs a eviter en gestion de projet tech...",
      "Pourquoi j'ai choisi cette stack technique...",
    ],
    en: [
      "A post about a tech innovation...",
      "How AI is transforming my daily work...",
      "A lesson learned in development...",
      "Mistakes to avoid in tech project management...",
      "Why I chose this tech stack...",
    ],
  },
  "Marketing / Communication": {
    fr: [
      "Une strategie qui a booste mes resultats...",
      "Les tendances marketing a suivre...",
      "Comment j'ai double mon taux d'engagement...",
      "Mon framework pour creer du contenu viral...",
      "Une campagne qui a tout change...",
    ],
    en: [
      "A strategy that boosted my results...",
      "Marketing trends to follow...",
      "How I doubled my engagement rate...",
      "My framework for creating viral content...",
      "A campaign that changed everything...",
    ],
  },
  "Finance / Banque": {
    fr: [
      "Ce que j'ai appris sur la gestion financiere...",
      "Une lecon sur l'investissement...",
      "Comment expliquer la finance simplement...",
      "Les erreurs financieres les plus courantes...",
      "Mon parcours dans la finance...",
    ],
    en: [
      "What I learned about financial management...",
      "A lesson about investing...",
      "How to explain finance simply...",
      "The most common financial mistakes...",
      "My journey in finance...",
    ],
  },
  "Sante": {
    fr: [
      "Un conseil bien-etre pour les professionnels...",
      "Ce que la sante m'a appris sur le leadership...",
      "L'importance de l'equilibre vie pro/perso...",
      "Innovation dans le secteur de la sante...",
      "Mon parcours dans le secteur medical...",
    ],
    en: [
      "A wellness tip for professionals...",
      "What healthcare taught me about leadership...",
      "The importance of work-life balance...",
      "Innovation in the healthcare sector...",
      "My journey in the medical field...",
    ],
  },
  "Commerce / Vente": {
    fr: [
      "Ma technique de vente la plus efficace...",
      "Comment j'ai conclu mon plus gros deal...",
      "Les objections clients et comment y repondre...",
      "Ce que j'ai appris en prospection...",
      "Pourquoi l'ecoute est la cle de la vente...",
    ],
    en: [
      "My most effective sales technique...",
      "How I closed my biggest deal...",
      "Client objections and how to handle them...",
      "What I learned from prospecting...",
      "Why listening is the key to sales...",
    ],
  },
  "Conseil": {
    fr: [
      "Un conseil que je donne a tous mes clients...",
      "Comment je structure une mission de conseil...",
      "Les defis du consulting et mes solutions...",
      "Ce que j'ai appris en accompagnant des entreprises...",
      "La methodologie qui fait la difference...",
    ],
    en: [
      "Advice I give to all my clients...",
      "How I structure a consulting engagement...",
      "Consulting challenges and my solutions...",
      "What I learned from working with companies...",
      "The methodology that makes the difference...",
    ],
  },
  "RH / Recrutement": {
    fr: [
      "Comment attirer les meilleurs talents...",
      "Les erreurs a eviter en recrutement...",
      "Ma vision du management bienveillant...",
      "L'entretien qui a change ma perspective...",
      "Pourquoi la culture d'entreprise est essentielle...",
    ],
    en: [
      "How to attract top talent...",
      "Mistakes to avoid in recruiting...",
      "My vision of compassionate management...",
      "The interview that changed my perspective...",
      "Why company culture is essential...",
    ],
  },
};

const DEFAULT_PLACEHOLDERS: LocalizedTextArray = {
  fr: [
    "Un post sur le leadership...",
    "Une astuce productivite...",
    "Mon parcours professionnel...",
    "Une lecon apprise recemment...",
    "Un conseil pour les juniors...",
    "Une reflexion sur le teletravail...",
    "Un moment cle de ma carriere...",
  ],
  en: [
    "A post about leadership...",
    "A productivity tip...",
    "My professional journey...",
    "A lesson learned recently...",
    "Advice for junior professionals...",
    "A thought on remote work...",
    "A key moment in my career...",
  ],
};

export function getPersonalizedPlaceholders(profile?: ProfileData, language: Language = "fr"): string[] {
  if (!profile?.sector) return (DEFAULT_PLACEHOLDERS[language] || DEFAULT_PLACEHOLDERS.en!);

  const sectorData = PLACEHOLDERS_BY_SECTOR[profile.sector];
  if (!sectorData) return (DEFAULT_PLACEHOLDERS[language] || DEFAULT_PLACEHOLDERS.en!);

  return sectorData[language] || sectorData.en!;
}

// ---------------------------------------------------------------------------
// TEMPLATE ORDERING - prioritizes templates based on profile type & objective
// ---------------------------------------------------------------------------

// Maps profile characteristics to preferred template IDs (in priority order)
const TEMPLATE_PRIORITY_BY_PROFILE: Record<string, string[]> = {
  "Independant / Freelance": ["storytelling", "tips", "success", "lesson", "controversial", "question"],
  "Agence": ["success", "tips", "controversial", "storytelling", "question", "lesson"],
  "Entrepreneur / Founder": ["storytelling", "success", "controversial", "tips", "lesson", "question"],
  "Salarie en entreprise": ["tips", "lesson", "storytelling", "question", "success", "controversial"],
};

const TEMPLATE_PRIORITY_BY_OBJECTIVE: Record<string, string[]> = {
  "Trouver de nouveaux clients": ["tips", "success", "storytelling"],
  "Augmenter mon chiffre d'affaires": ["success", "tips", "controversial"],
  "Developper ma visibilite et credibilite": ["storytelling", "controversial", "lesson"],
  "Generer des leads qualifies": ["tips", "success", "question"],
  "Construire une audience engagee": ["question", "storytelling", "controversial"],
};

/**
 * Returns template IDs sorted by relevance for this user's profile.
 * Templates not in the priority list are appended at the end in original order.
 */
export function getPersonalizedTemplateOrder(
  templateIds: string[],
  profile?: ProfileData
): string[] {
  if (!profile) return templateIds;

  // Merge priorities: objective first (more specific), then profileType
  const prioritySet = new Set<string>();

  if (profile.objective) {
    const objPriority = Object.entries(TEMPLATE_PRIORITY_BY_OBJECTIVE)
      .find(([key]) => profile.objective?.toLowerCase().includes(key.toLowerCase().slice(0, 15)));
    if (objPriority) {
      objPriority[1].forEach(id => prioritySet.add(id));
    }
  }

  if (profile.profileType) {
    const profilePriority = TEMPLATE_PRIORITY_BY_PROFILE[profile.profileType];
    if (profilePriority) {
      profilePriority.forEach(id => prioritySet.add(id));
    }
  }

  if (prioritySet.size === 0) return templateIds;

  const prioritized = [...prioritySet].filter(id => templateIds.includes(id));
  const remaining = templateIds.filter(id => !prioritySet.has(id));

  return [...prioritized, ...remaining];
}

// ---------------------------------------------------------------------------
// GREETING - time-aware personalized greeting
// ---------------------------------------------------------------------------

export function getPersonalizedGreeting(firstName?: string, language: Language = "fr"): string {
  const hour = new Date().getHours();

  let timeGreeting: string;
  if (language === "en") {
    if (hour < 12) {
      timeGreeting = "Good morning";
    } else if (hour < 18) {
      timeGreeting = "Good afternoon";
    } else {
      timeGreeting = "Good evening";
    }
  } else {
    if (hour < 12) {
      timeGreeting = "Bonjour";
    } else if (hour < 18) {
      timeGreeting = "Bon apres-midi";
    } else {
      timeGreeting = "Bonsoir";
    }
  }

  const fallback = language === "en" ? "Welcome to POSTY" : "Bienvenue sur POSTY";
  return firstName ? `${timeGreeting}, ` : fallback;
}
