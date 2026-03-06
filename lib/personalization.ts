// ============================================================
// PERSONALIZATION ENGINE
// Adapts UI text, placeholders, and template ordering
// based on the user's onboarding profile data.
// ============================================================

import { UserProfile } from "@/types";

type ProfileData = UserProfile["profile"];

// ---------------------------------------------------------------------------
// WELCOME SUBTITLE - adapts the description below "Bonjour, {name}!"
// ---------------------------------------------------------------------------

const SUBTITLE_BY_OBJECTIVE: Record<string, string> = {
  "Trouver de nouveaux clients": "Creez des posts qui attirent vos futurs clients",
  "Augmenter mon chiffre d'affaires": "Generez des posts qui convertissent votre audience",
  "Developper ma visibilite et credibilite": "Renforcez votre image d'expert avec chaque post",
  "Generer des leads qualifies": "Transformez votre audience LinkedIn en opportunites",
  "Construire une audience engagee": "Fidelisez votre communaute avec du contenu percutant",
};

const DEFAULT_SUBTITLE = "Decrivez votre idee et je genererai 2 versions optimisees de votre post LinkedIn";

export function getPersonalizedSubtitle(profile?: ProfileData): string {
  if (!profile?.objective) return DEFAULT_SUBTITLE;

  // Try exact match first, then partial match
  for (const [key, subtitle] of Object.entries(SUBTITLE_BY_OBJECTIVE)) {
    if (profile.objective.toLowerCase().includes(key.toLowerCase().slice(0, 15))) {
      return subtitle;
    }
  }

  return DEFAULT_SUBTITLE;
}

// ---------------------------------------------------------------------------
// PLACEHOLDER EXAMPLES - adapts rotating input placeholders to the sector
// ---------------------------------------------------------------------------

const PLACEHOLDERS_BY_SECTOR: Record<string, string[]> = {
  "Tech / IT": [
    "Un post sur une innovation tech...",
    "Comment l'IA transforme mon quotidien...",
    "Une lecon apprise en developpement...",
    "Les erreurs a eviter en gestion de projet tech...",
    "Pourquoi j'ai choisi cette stack technique...",
  ],
  "Marketing / Communication": [
    "Une strategie qui a booste mes resultats...",
    "Les tendances marketing a suivre...",
    "Comment j'ai double mon taux d'engagement...",
    "Mon framework pour creer du contenu viral...",
    "Une campagne qui a tout change...",
  ],
  "Finance / Banque": [
    "Ce que j'ai appris sur la gestion financiere...",
    "Une lecon sur l'investissement...",
    "Comment expliquer la finance simplement...",
    "Les erreurs financieres les plus courantes...",
    "Mon parcours dans la finance...",
  ],
  "Sante": [
    "Un conseil bien-etre pour les professionnels...",
    "Ce que la sante m'a appris sur le leadership...",
    "L'importance de l'equilibre vie pro/perso...",
    "Innovation dans le secteur de la sante...",
    "Mon parcours dans le secteur medical...",
  ],
  "Commerce / Vente": [
    "Ma technique de vente la plus efficace...",
    "Comment j'ai conclu mon plus gros deal...",
    "Les objections clients et comment y repondre...",
    "Ce que j'ai appris en prospection...",
    "Pourquoi l'ecoute est la cle de la vente...",
  ],
  "Conseil": [
    "Un conseil que je donne a tous mes clients...",
    "Comment je structure une mission de conseil...",
    "Les defis du consulting et mes solutions...",
    "Ce que j'ai appris en accompagnant des entreprises...",
    "La methodologie qui fait la difference...",
  ],
  "RH / Recrutement": [
    "Comment attirer les meilleurs talents...",
    "Les erreurs a eviter en recrutement...",
    "Ma vision du management bienveillant...",
    "L'entretien qui a change ma perspective...",
    "Pourquoi la culture d'entreprise est essentielle...",
  ],
};

const DEFAULT_PLACEHOLDERS = [
  "Un post sur le leadership...",
  "Une astuce productivite...",
  "Mon parcours professionnel...",
  "Une lecon apprise recemment...",
  "Un conseil pour les juniors...",
  "Une reflexion sur le teletravail...",
  "Un moment cle de ma carriere...",
];

export function getPersonalizedPlaceholders(profile?: ProfileData): string[] {
  if (!profile?.sector) return DEFAULT_PLACEHOLDERS;

  return PLACEHOLDERS_BY_SECTOR[profile.sector] || DEFAULT_PLACEHOLDERS;
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

export function getPersonalizedGreeting(firstName?: string): string {
  const hour = new Date().getHours();

  let timeGreeting: string;
  if (hour < 12) {
    timeGreeting = "Bonjour";
  } else if (hour < 18) {
    timeGreeting = "Bon apres-midi";
  } else {
    timeGreeting = "Bonsoir";
  }

  return firstName ? `${timeGreeting}, ` : "Bienvenue sur POSTY";
}
