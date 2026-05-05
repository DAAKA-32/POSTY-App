// ============================================================
// READY-TO-PUBLISH POSTS
// Pre-written, premium LinkedIn posts surfaced in the /app
// carousel. Replaces the legacy "fill-the-blank" templates.
//
// Two distinct datasets:
//   - READY_POSTS         → real, ready-to-publish (Max plan only)
//   - LOCKED_PREVIEW_POSTS → fake-but-credible teasers used
//                            behind the blur for Free / Pro plans
// ============================================================

import type { UserProfile } from "@/types";

export type ReadyPostCategory =
  | "storytelling"
  | "tips"
  | "controversial"
  | "success"
  | "lesson"
  | "question";

type ProfileData = UserProfile["profile"];

export interface ReadyPost {
  id: string;
  category: ReadyPostCategory;
  /** Primary post body, localized. Other languages fall back to `en`. */
  body: { fr: string; en: string };
  hashtags?: string[];
  /** Sectors that should bubble this post up first when matched. */
  sectorAffinity?: string[];
}

// ---------------------------------------------------------------------------
// CATEGORY VISUAL TOKENS — aligns with sidebar nav colors used elsewhere
// ---------------------------------------------------------------------------

export interface CategoryStyle {
  icon: string;
  /** tailwind text-color class for the icon/label tint */
  accent: string;
  /** tailwind background tint for the card top strip */
  stripe: string;
  /** tailwind ring tint applied on hover */
  ring: string;
}

export const CATEGORY_STYLES: Record<ReadyPostCategory, CategoryStyle> = {
  storytelling: {
    icon: "📖",
    accent: "text-[#F8935D]",
    stripe: "from-[#F8935D] to-[#F76B54]",
    ring: "ring-[#F8935D]/35",
  },
  tips: {
    icon: "💡",
    accent: "text-cyan-500",
    stripe: "from-cyan-500 to-cyan-400",
    ring: "ring-cyan-500/35",
  },
  controversial: {
    icon: "🎯",
    accent: "text-violet-500",
    stripe: "from-violet-500 to-violet-400",
    ring: "ring-violet-500/35",
  },
  success: {
    icon: "🏆",
    accent: "text-emerald-500",
    stripe: "from-emerald-500 to-emerald-400",
    ring: "ring-emerald-500/35",
  },
  lesson: {
    icon: "🎓",
    accent: "text-[#F8935D]",
    stripe: "from-[#F8935D] to-[#F76B54]",
    ring: "ring-[#F8935D]/35",
  },
  question: {
    icon: "❓",
    accent: "text-cyan-500",
    stripe: "from-cyan-500 to-cyan-400",
    ring: "ring-cyan-500/35",
  },
};

// ---------------------------------------------------------------------------
// REAL READY-TO-PUBLISH POSTS — Max plan only
// ---------------------------------------------------------------------------

export const READY_POSTS: ReadyPost[] = [
  {
    id: "max-storytelling-pivot",
    category: "storytelling",
    sectorAffinity: ["Tech / IT", "Entrepreneur / Founder", "Independant / Freelance"],
    hashtags: ["#linkedin", "#career"],
    body: {
      fr: `Il y a 3 ans, j'ai dit non à un poste senior bien payé.\n\nTout le monde m'a regardé comme si j'étais fou.\n\nJ'ai préféré construire mon truc, à zéro, dans un coworking bruyant.\n\nAujourd'hui, l'équipe a 12 personnes, on travaille avec 30+ clients récurrents, et je n'ai jamais autant appris en si peu de temps.\n\nLa leçon : la sécurité, c'est rarement où on l'imagine.\n\nElle est dans ta capacité à créer de la valeur — pas dans un titre.\n\n#linkedin #career`,
      en: `3 years ago, I turned down a well-paid senior role.\n\nEveryone looked at me like I was insane.\n\nI chose to build my own thing — from scratch, in a noisy coworking space.\n\nToday: a team of 12, 30+ recurring clients, and the steepest learning curve of my life.\n\nThe lesson: safety is rarely where you think it is.\n\nIt's in your ability to create value — not in a title.\n\n#linkedin #career`,
    },
  },
  {
    id: "max-tips-linkedin-hooks",
    category: "tips",
    sectorAffinity: ["Marketing / Communication", "Independant / Freelance", "Conseil"],
    hashtags: ["#linkedin", "#copywriting"],
    body: {
      fr: `5 accroches LinkedIn qui marchent (testées sur 100+ posts) :\n\n1. "J'ai perdu 12K€ ce mois-ci. Voici pourquoi."\n2. "Personne n'en parle, mais [observation contre-intuitive]."\n3. "Si je devais recommencer demain, je ferais X."\n4. "[Métrique impressionnante]. En 90 jours. Sans pub payante."\n5. "Tu fais [erreur courante] ? Arrête. Voilà ce qui marche."\n\nPoint commun : zéro fluff, une promesse claire, un angle perso.\n\nTu en utilises déjà certaines ?\n\n#linkedin #copywriting`,
      en: `5 LinkedIn hooks that actually work (tested on 100+ posts):\n\n1. "I lost $12K this month. Here's why."\n2. "Nobody talks about this, but [counterintuitive take]."\n3. "If I had to start over tomorrow, I'd do X."\n4. "[Impressive metric]. In 90 days. Zero paid ads."\n5. "Doing [common mistake]? Stop. Here's what works."\n\nWhat they share: no fluff, one clear promise, a personal angle.\n\nWhich one do you already use?\n\n#linkedin #copywriting`,
    },
  },
  {
    id: "max-controversial-meetings",
    category: "controversial",
    sectorAffinity: ["Tech / IT", "Conseil", "Entrepreneur / Founder"],
    hashtags: ["#productivity", "#leadership"],
    body: {
      fr: `Opinion impopulaire : 80% des réunions devraient être un message Slack.\n\nOn a normalisé l'idée qu'être occupé = être utile.\n\nC'est faux.\n\nLe vrai travail demande des blocs de concentration. Pas un agenda transformé en gruyère par 6 sync de 30 min.\n\nLes équipes qui performent ne se réunissent pas plus. Elles écrivent mieux.\n\nUn doc clair > une réunion floue.\n\nÀ ton avis : combien de temps tu récupères en passant la moitié de tes meetings en async ?\n\n#productivity #leadership`,
      en: `Hot take: 80% of meetings should be a Slack message.\n\nWe've normalized the idea that "busy" equals "useful."\n\nIt's not true.\n\nReal work needs deep blocks. Not a calendar shredded by six 30-minute syncs.\n\nThe teams that perform don't meet more. They write better.\n\nA clear doc > a fuzzy meeting.\n\nHonest question: how much time would you reclaim by moving half your meetings to async?\n\n#productivity #leadership`,
    },
  },
  {
    id: "max-success-launch",
    category: "success",
    sectorAffinity: ["Marketing / Communication", "Entrepreneur / Founder", "Independant / Freelance"],
    hashtags: ["#growth", "#startup"],
    body: {
      fr: `Résultat : +320% de leads qualifiés en 90 jours.\n\nLe contexte : pipeline en chute libre, équipe sales démotivée, zéro budget pub.\n\nCe qui a fonctionné :\n• Repositionner le pitch sur UN persona précis (et virer les 3 autres)\n• Publier 3 posts LinkedIn par semaine, en 1ère personne\n• Remplacer la newsletter par 1 deep-dive mensuel\n\nLa leçon clé : moins de surface, plus de profondeur.\n\nLa visibilité, c'est une conséquence — pas une stratégie.\n\n#growth #startup`,
      en: `Result: +320% qualified leads in 90 days.\n\nContext: pipeline in free-fall, sales team demoralized, zero paid budget.\n\nWhat worked:\n• Re-pitched around ONE specific persona (and dropped the other 3)\n• Posted on LinkedIn 3x/week, first person\n• Replaced the newsletter with one monthly deep-dive\n\nKey lesson: less surface, more depth.\n\nVisibility is a consequence — not a strategy.\n\n#growth #startup`,
    },
  },
  {
    id: "max-lesson-feedback",
    category: "lesson",
    sectorAffinity: ["RH / Recrutement", "Conseil", "Entrepreneur / Founder"],
    hashtags: ["#leadership", "#management"],
    body: {
      fr: `Ce que j'aurais aimé savoir avant de manager ma première équipe :\n\n1. Le silence d'un collaborateur n'est pas un accord.\n2. "Je suis dispo si besoin" ne suffit pas — il faut provoquer la conversation.\n3. Un feedback différé d'une semaine perd 80% de son impact.\n4. Les meilleurs partent rarement pour le salaire. Ils partent pour le sens.\n\nSi je devais recommencer ?\n\nJe poserais cette question chaque semaine :\n\n"Qu'est-ce qui t'a freiné cette semaine que je peux enlever ?"\n\nPas de carrière construite sans franchise.\n\n#leadership #management`,
      en: `What I wish I'd known before managing my first team:\n\n1. A teammate's silence is not agreement.\n2. "Ping me if you need anything" isn't enough — you create the conversation.\n3. Feedback delayed by a week loses 80% of its impact.\n4. The best people rarely leave for salary. They leave for meaning.\n\nIf I had to start over?\n\nI'd ask one question every week:\n\n"What slowed you down this week that I can remove?"\n\nNo career is built without honest conversations.\n\n#leadership #management`,
    },
  },
  {
    id: "max-question-remote",
    category: "question",
    sectorAffinity: ["Tech / IT", "RH / Recrutement"],
    hashtags: ["#remote", "#future-of-work"],
    body: {
      fr: `Question franche à la communauté :\n\nVous, le 100% remote, ça vous rend meilleur dans votre job — ou juste plus seul ?\n\nContexte : je vois 2 camps qui ne se parlent plus.\n\nD'un côté, ceux qui jurent par la flexibilité, l'autonomie, les blocs profonds.\n\nDe l'autre, ceux qui décrivent un sentiment d'isolement, de fatigue Zoom, de carrière qui plafonne.\n\nMon avis : le remote n'est pas le problème. C'est l'absence de rituels qui l'est.\n\nEt vous — qu'est-ce qui a vraiment changé pour vous depuis 2020 ?\n\n#remote #future-of-work`,
      en: `Honest question for the community:\n\nDoes 100% remote make you better at your job — or just more isolated?\n\nContext: I see two camps that don't speak anymore.\n\nOn one side: people who swear by flexibility, autonomy, deep blocks.\n\nOn the other: people describing isolation, Zoom fatigue, stalled careers.\n\nMy take: remote isn't the problem. The absence of rituals is.\n\nAnd you — what really changed for you since 2020?\n\n#remote #future-of-work`,
    },
  },
  {
    id: "max-tips-personal-brand",
    category: "tips",
    sectorAffinity: ["Independant / Freelance", "Marketing / Communication"],
    hashtags: ["#personalbranding", "#linkedin"],
    body: {
      fr: `3 erreurs qui tuent ta marque personnelle sur LinkedIn :\n\n1. Tu publies pour "exister" → poste pour transmettre.\n2. Tu cherches la viralité → cherche la pertinence pour 100 personnes.\n3. Tu copies les codes des autres → ta voix est ton avantage défendable.\n\nUn bon post LinkedIn ne plaît pas à tout le monde.\n\nIl parle fort à un sous-segment précis — et fait scroller les autres.\n\nC'est exactement ce qu'on cherche.\n\n#personalbranding #linkedin`,
      en: `3 mistakes killing your personal brand on LinkedIn:\n\n1. You post to "exist" → post to transmit.\n2. You chase virality → chase relevance for 100 specific people.\n3. You copy others' codes → your voice is your defensible edge.\n\nA good LinkedIn post doesn't please everyone.\n\nIt speaks loudly to a precise sub-segment — and bores the rest.\n\nThat's exactly what we want.\n\n#personalbranding #linkedin`,
    },
  },
  {
    id: "max-storytelling-firstclient",
    category: "storytelling",
    sectorAffinity: ["Independant / Freelance", "Entrepreneur / Founder"],
    hashtags: ["#freelance", "#entrepreneurship"],
    body: {
      fr: `Mon premier client m'a payé 600€.\n\nJ'avais préparé 18 slides. Il m'en a regardé 2.\n\n"En vrai, j'ai pas besoin de tout ça. J'ai besoin que tu me dises quoi faire lundi matin."\n\nC'est ce jour-là que j'ai compris une chose :\n\n→ Personne ne paie pour ton expertise.\n→ On paie pour la décision que tu prends à sa place.\n\nDepuis, j'ai retiré 80% de mes deliverables. Et doublé mes tarifs.\n\nLes clients ne sont pas plus rares. Ils sont plus alignés.\n\n#freelance #entrepreneurship`,
      en: `My first client paid me $600.\n\nI'd prepared 18 slides. He looked at 2.\n\n"Honestly, I don't need all this. I need you to tell me what to do Monday morning."\n\nThat day, I learned one thing:\n\n→ Nobody pays for your expertise.\n→ They pay for the decision you make on their behalf.\n\nSince then, I've cut 80% of my deliverables. And doubled my rates.\n\nClients aren't rarer. They're more aligned.\n\n#freelance #entrepreneurship`,
    },
  },
  {
    id: "max-success-content-engine",
    category: "success",
    sectorAffinity: ["Marketing / Communication", "Independant / Freelance"],
    hashtags: ["#content", "#marketing"],
    body: {
      fr: `4 mois. 0 pub. 87 leads inbound qualifiés.\n\nVoilà ce qu'on a fait :\n\n• 1 angle éditorial unique (pas 10)\n• 1 format-pivot dupliqué partout (LinkedIn → newsletter → podcast)\n• 1 CTA discret en fin de chaque post\n\nLe reste, on l'a coupé.\n\nLa vérité ? Le content marketing ne fonctionne pas quand on en fait trop.\n\nIl fonctionne quand on creuse un seul sillon — assez profondément pour qu'il devienne notre territoire.\n\n#content #marketing`,
      en: `4 months. Zero ads. 87 inbound qualified leads.\n\nHere's what we did:\n\n• 1 editorial angle (not 10)\n• 1 pivot format duplicated everywhere (LinkedIn → newsletter → podcast)\n• 1 subtle CTA at the end of every post\n\nWe cut everything else.\n\nTruth? Content marketing doesn't work when you do too much.\n\nIt works when you dig one trench — deep enough that it becomes your territory.\n\n#content #marketing`,
    },
  },
  {
    id: "max-controversial-titles",
    category: "controversial",
    sectorAffinity: ["RH / Recrutement", "Entrepreneur / Founder"],
    hashtags: ["#hr", "#leadership"],
    body: {
      fr: `Opinion impopulaire : les titres "Senior", "Lead", "Head of" ne veulent plus rien dire.\n\nJ'ai vu des "Head of" sans personne dans leur équipe.\nDes "Seniors" 6 mois après leur premier job.\nDes "VP" qui n'ont jamais piloté de budget.\n\nL'inflation des titres a tué l'information qu'ils portaient.\n\nCe qui compte vraiment :\n\n→ Les problèmes que tu sais résoudre.\n→ Les décisions que tu prends sans valider.\n→ La taille du périmètre dont tu réponds quand ça casse.\n\nUn CV sans titres serait souvent plus parlant qu'un CV plein de promotions cosmétiques.\n\n#hr #leadership`,
      en: `Hot take: "Senior", "Lead", "Head of" titles mean nothing anymore.\n\nI've seen "Heads of" with no team.\n"Seniors" 6 months into their first job.\n"VPs" who've never owned a budget.\n\nTitle inflation has killed the signal they used to carry.\n\nWhat actually matters:\n\n→ The problems you can solve.\n→ The decisions you make without approval.\n→ The scope you answer for when things break.\n\nA résumé without titles would often say more than one full of cosmetic promotions.\n\n#hr #leadership`,
    },
  },
];

// ---------------------------------------------------------------------------
// LOCKED PREVIEW POSTS — Free / Pro plans
// Plausible-looking decoys shown blurred behind an upgrade overlay.
// Never mistaken for real, ready-to-publish content.
// ---------------------------------------------------------------------------

export const LOCKED_PREVIEW_POSTS: ReadyPost[] = [
  {
    id: "lock-storytelling-1",
    category: "storytelling",
    body: {
      fr: `Il y a deux ans, j'ai pris une décision que personne ne comprenait. Aujourd'hui, c'est devenu la base de tout ce que je construis. Voici ce qui s'est vraiment passé entre les deux — et la leçon la plus dure à accepter.`,
      en: `Two years ago, I made a decision nobody understood. Today, it's the foundation of everything I'm building. Here's what really happened in between — and the hardest lesson I had to accept.`,
    },
  },
  {
    id: "lock-tips-1",
    category: "tips",
    body: {
      fr: `7 micro-habitudes qui ont transformé ma productivité (testées 6 mois). Aucune ne prend plus de 5 minutes. La n°4 a changé ma manière de finir mes journées.`,
      en: `7 micro-habits that transformed my productivity (tested for 6 months). None take more than 5 minutes. #4 changed how I close my days.`,
    },
  },
  {
    id: "lock-controversial-1",
    category: "controversial",
    body: {
      fr: `Opinion impopulaire : la moitié des conseils carrière qu'on lit sur LinkedIn sont écrits par des gens qui n'ont jamais managé personne. Voilà comment les filtrer en 30 secondes.`,
      en: `Hot take: half the career advice on LinkedIn is written by people who've never managed anyone. Here's how to filter it in 30 seconds.`,
    },
  },
  {
    id: "lock-success-1",
    category: "success",
    body: {
      fr: `+47% de chiffre d'affaires en un trimestre. Sans recrutement. Sans pub payante. Sans nouvelle offre. Voici les 3 leviers qu'on a actionnés — et celui que j'aurais sous-estimé sans les chiffres.`,
      en: `+47% revenue in a quarter. No new hires. No paid ads. No new offering. Here are the 3 levers we pulled — and the one I would have underestimated without the data.`,
    },
  },
  {
    id: "lock-lesson-1",
    category: "lesson",
    body: {
      fr: `Ce que j'aurais aimé savoir à 25 ans : on ne progresse pas en faisant plus, on progresse en supprimant les bonnes choses au bon moment. Voici les 5 que j'aurais coupées plus tôt.`,
      en: `What I wish I'd known at 25: progress isn't about doing more, it's about cutting the right things at the right time. Here are the 5 I would have cut sooner.`,
    },
  },
  {
    id: "lock-question-1",
    category: "question",
    body: {
      fr: `Question honnête : quel est le meilleur conseil pro que vous ayez reçu — celui qui vous semblait bizarre sur le coup, et qui s'est avéré juste 2 ans plus tard ?`,
      en: `Honest question: what's the best career advice you ever got — the one that felt odd at the time, and turned out to be right two years later?`,
    },
  },
  {
    id: "lock-tips-2",
    category: "tips",
    body: {
      fr: `3 questions à poser en entretien client qui changent tout (et qu'on n'apprend nulle part). Réponses inattendues garanties. La n°2 m'a fait gagner 30% de closing.`,
      en: `3 questions to ask in client meetings that change everything (and you'll never learn anywhere). Unexpected answers guaranteed. #2 lifted my close rate by 30%.`,
    },
  },
  {
    id: "lock-storytelling-2",
    category: "storytelling",
    body: {
      fr: `Le matin où j'ai failli tout abandonner, un message a tout changé. Pas un client, pas un investisseur. Quelqu'un que je n'avais pas vu depuis 8 ans.`,
      en: `The morning I almost quit, one message changed everything. Not a client, not an investor. Someone I hadn't seen in 8 years.`,
    },
  },
  {
    id: "lock-controversial-2",
    category: "controversial",
    body: {
      fr: `Arrêtez d'optimiser votre routine matinale. Le vrai levier, c'est les 90 minutes avant de dormir. Voici pourquoi — et ce que les top performers font à 22h.`,
      en: `Stop optimizing your morning routine. The real lever is the 90 minutes before sleep. Here's why — and what top performers do at 10pm.`,
    },
  },
  {
    id: "lock-success-2",
    category: "success",
    body: {
      fr: `De 0 à 10K abonnés en 6 mois, sans algorithme magique. Juste une méthode simple, répétée chaque semaine. Voici exactement ce que j'ai fait — semaine par semaine.`,
      en: `From 0 to 10K followers in 6 months, no algorithm hack. Just one simple method, repeated weekly. Here's exactly what I did — week by week.`,
    },
  },
];

// ---------------------------------------------------------------------------
// SELECTORS / HELPERS
// ---------------------------------------------------------------------------

/**
 * Returns the post body for the requested language, with English as the
 * universal fallback. Keeps the rest of the codebase free of nested ternaries.
 */
export function getReadyPostBody(post: ReadyPost, language: string): string {
  if (language === "fr") return post.body.fr;
  return post.body.en;
}

function normalizeSector(profile?: ProfileData): string | null {
  const raw = profile?.sector;
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

/**
 * Orders ready posts by sector affinity (matching first), preserving the
 * original order within each bucket. Posts without affinity are appended.
 */
export function getOrderedReadyPosts(profile?: ProfileData): ReadyPost[] {
  const sector = normalizeSector(profile);
  if (!sector) return READY_POSTS;

  const matched: ReadyPost[] = [];
  const rest: ReadyPost[] = [];
  for (const post of READY_POSTS) {
    if (post.sectorAffinity?.includes(sector)) matched.push(post);
    else rest.push(post);
  }
  return [...matched, ...rest];
}
