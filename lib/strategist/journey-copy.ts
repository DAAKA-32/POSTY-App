/**
 * Copy of the Strategist workspace chrome and guided journey (FR + EN, like
 * the rest of the Strategist UI — other locales fall back to EN). Kept apart
 * from lib/strategist/copy.ts so the conversation strings stay untouched.
 * French uses "tu", like the rest of the Strategist.
 */

import { useLanguage } from "@/contexts/LanguageContext";
import type { JourneyStep, Objective } from "./journey";
import { strategistLang, type StrategistLang } from "./copy";

type StepCopy = { label: string; title: string; why: string };

const fr = {
  brand: "Posty Stratège",
  tagline: "Ta stratégie LinkedIn, étape par étape",
  tabsLabel: "Espace du Stratège",
  tabs: { plan: "Stratégie", chat: "Conversation" },
  settings: "Réglages",
  closeSettings: "Fermer les réglages",
  navLabel: "Étapes de ta stratégie",
  stepOf: (i: number, n: number) => `Étape ${i} sur ${n}`,
  kicker: (i: number, label: string) => `Étape ${String(i).padStart(2, "0")} · ${label}`,
  mobileProgress: (i: number, n: number, label: string) => `${i}/${n} · ${label}`,
  announce: (i: number, n: number, label: string) => `Étape ${i} sur ${n} : ${label}`,
  done: "terminée",
  current: "en cours",
  autonomousOn: "Mode autonome actif",
  autonomousOff: "Mode autonome désactivé",
  autonomousSetup: "Régler",
  autonomousInactive: "Inactif",

  steps: {
    activity: {
      label: "Activité",
      title: "Que fais-tu, et pour qui ?",
      why: "C'est la base de tous tes posts : le Stratège ne parle que de ce que tu fais vraiment.",
    },
    audience: {
      label: "Audience",
      title: "À qui veux-tu parler ?",
      why: "Une audience précise, ce sont des sujets, des exemples et des mots qui lui parlent.",
    },
    goal: {
      label: "Objectif",
      title: "Qu'attends-tu de LinkedIn ?",
      why: "L'objectif oriente le choix des formats et la façon dont chaque post se termine.",
    },
    style: {
      label: "Ton & style",
      title: "Comment veux-tu sonner ?",
      why: "Ton ton fait que tes posts te ressemblent. Tout est facultatif : sans choix, le Stratège reste naturel.",
    },
    content: {
      label: "Plan de contenu",
      title: "Quel rythme pour ce plan ?",
      why: "Combien de posts, sur quelle période, et ce que tu veux mettre en avant.",
    },
    review: {
      label: "Valider",
      title: "Ta stratégie en un coup d'œil",
      why: "Vérifie, corrige si besoin, puis lance ton plan.",
    },
  } satisfies Record<JourneyStep, StepCopy>,

  activity: {
    field: "Ton activité",
    hint: "Ce que tu proposes, à qui, et ce qui te distingue. 2 ou 3 phrases suffisent.",
    placeholder: "Ex : studio de design produit pour startups SaaS. J'aide les fondateurs à sortir un MVP testé en 6 semaines.",
    useProfile: "Reprendre mon profil business",
    examplesLabel: "S'inspirer d'un exemple",
    examples: [
      "Coach en reconversion pour cadres : j'aide les managers à changer de métier en 6 mois, sans repartir de zéro.",
      "Cabinet de recrutement tech à Lyon : on place des développeurs seniors dans des scale-ups en 3 semaines.",
    ],
  },
  audience: {
    field: "Ton audience",
    hint: "Leur métier, leur type d'entreprise, ce qui les préoccupe.",
    placeholder: "Ex : dirigeants de PME industrielles qui veulent digitaliser leur production",
    suggestions: "Depuis ton profil",
    examplesLabel: "Exemples",
    examples: ["Fondateurs de startups early-stage", "DRH de PME en croissance", "Développeurs freelance en quête de missions"],
  },
  goal: {
    optional: "Facultatif : sans choix, le Stratège équilibre visibilité et engagement.",
    options: {
      authority: { title: "Asseoir mon expertise", desc: "Montrer ce que tu sais faire, preuves à l'appui." },
      engagement: { title: "Créer de l'engagement", desc: "Faire réagir et commenter ta communauté." },
      "lead-gen": { title: "Attirer des prospects", desc: "Donner envie à ta cible de te contacter." },
      conversion: { title: "Mettre en avant mon offre", desc: "Faire connaître ton offre et inviter à passer à l'action." },
      branding: { title: "Développer mon image", desc: "Rendre ta marque reconnaissable et mémorable." },
      storytelling: { title: "Raconter mon histoire", desc: "Partager ton parcours, tes coulisses et tes leçons." },
    } satisfies Record<Objective, { title: string; desc: string }>,
  },
  style: {
    fine: "Ajuster finement",
    fineHint: "Registre, émotion, accroches et fin de post",
    finePages: ["Registre", "Accroches & fin"],
    finePagesLabel: "Réglages fins",
    fineBack: "Ton & angle",
    fineTitle: "Réglages fins",
    toneLabel: "Ton",
    toneExamples: {
      direct: "« Publier tous les jours ne sert à rien. Publier juste, si. »",
      expert: "« 3 indicateurs suffisent pour piloter une production. Les voici. »",
      inspiring: "« Il y a un an, je doutais de tout. Un seul choix a tout changé. »",
      bold: "« Les réunions d'équipe tuent plus de projets qu'elles n'en sauvent. »",
      warm: "« Merci à celles et ceux qui m'ont écrit cette semaine. Je vous réponds ici. »",
    },
    orientationLabel: "Angle",
    orientationDesc: {
      personal: "Ton vécu et tes convictions en premier",
      balanced: "Un équilibre entre toi et ton expertise",
      professional: "Ton expertise et ton offre en premier",
    },
  },
  content: {
    count: "Nombre de posts",
    countAria: (n: number) => `${n} posts`,
    fewer: "Un post de moins",
    more: "Un post de plus",
    period: "Période",
    periods: { week: "La semaine", month: "Le mois" },
    focus: "À mettre en avant (facultatif)",
    focusPlaceholder: "Ex : le lancement de notre nouvelle offre, nos résultats clients, un salon en novembre.",
    formatsNote: "Les formats (récit, liste, cas client, avis tranché…) sont choisis automatiquement selon ton objectif.",
  },
  review: {
    edit: "Modifier",
    editAria: (label: string) => `Modifier : ${label}`,
    notSet: "Au choix du Stratège",
    plan: (n: number, period: "week" | "month") => `${n} posts sur ${period === "month" ? "le mois" : "la semaine"}`,
    focusLine: (t: string) => `À mettre en avant : ${t}`,
    saveNote: "En lançant le plan, ces réglages deviennent ta ligne éditoriale : ils servent aussi au mode autonome.",
    generate: "Générer mon plan",
    resume: "Reprendre mon dernier plan",
    styleLine: (parts: string[]) => parts.join(" · "),
  },
  issues: {
    contextShort: "Décris ton activité en une phrase au moins pour continuer.",
    audienceShort: "Indique à qui tu t'adresses pour continuer.",
  },
  actions: { back: "Retour", next: "Continuer", cancel: "Annuler", retry: "Réessayer" },
  generating: {
    title: "Ton plan se prépare…",
    detail: "Le Stratège construit tes posts à partir de ta stratégie. Compte une vingtaine de secondes.",
    slow: "C'est un peu plus long que d'habitude, on y est presque.",
    verySlow: "Toujours en cours. Tu peux aller ailleurs dans Posty : le plan t'attendra ici.",
  },
  result: {
    title: "Ton plan est prêt",
    subtitle: (n: number) => `${n} post${n > 1 ? "s" : ""} planifié${n > 1 ? "s" : ""}. Relis, ajuste, puis lance la rédaction.`,
    edit: "Modifier ma stratégie",
    discuss: "En discuter",
    newPlan: "Nouveau plan",
    kicker: (n: number) => `Ton plan · ${n} post${n > 1 ? "s" : ""}`,
  },
  settingsView: {
    unsaved: (n: number) => `${n} modification${n > 1 ? "s" : ""} non enregistrée${n > 1 ? "s" : ""}`,
    fineTune: "Ajustements fins",
    fineTuneHint: "Registre, émotion, accroches et fin de post",
    kicker: "Réglages",
  },
  chatKicker: "Conversation",
  saveFailed: "Ta ligne éditoriale n'a pas pu être enregistrée, mais le plan a bien été lancé.",
};

export type JourneyCopy = typeof fr;

const en: JourneyCopy = {
  brand: "Posty Strategist",
  tagline: "Your LinkedIn strategy, step by step",
  tabsLabel: "Strategist workspace",
  tabs: { plan: "Strategy", chat: "Conversation" },
  settings: "Settings",
  closeSettings: "Close settings",
  navLabel: "Steps of your strategy",
  stepOf: (i, n) => `Step ${i} of ${n}`,
  kicker: (i, label) => `Step ${String(i).padStart(2, "0")} · ${label}`,
  mobileProgress: (i, n, label) => `${i}/${n} · ${label}`,
  announce: (i, n, label) => `Step ${i} of ${n}: ${label}`,
  done: "done",
  current: "current",
  autonomousOn: "Autonomous mode on",
  autonomousOff: "Autonomous mode off",
  autonomousSetup: "Set up",
  autonomousInactive: "Off",

  steps: {
    activity: {
      label: "Business",
      title: "What do you do, and for whom?",
      why: "It's the base of every post: the Strategist only talks about what you really do.",
    },
    audience: {
      label: "Audience",
      title: "Who do you want to reach?",
      why: "A precise audience means topics, examples and words that speak to them.",
    },
    goal: {
      label: "Goal",
      title: "What do you want from LinkedIn?",
      why: "Your goal steers the formats and how each post ends.",
    },
    style: {
      label: "Tone & style",
      title: "How do you want to sound?",
      why: "Your tone makes the posts sound like you. Everything is optional: with no choice, the Strategist stays natural.",
    },
    content: {
      label: "Content plan",
      title: "What pace for this plan?",
      why: "How many posts, over which period, and what you want to put forward.",
    },
    review: {
      label: "Review",
      title: "Your strategy at a glance",
      why: "Check it, fix anything, then launch your plan.",
    },
  },

  activity: {
    field: "Your business",
    hint: "What you offer, to whom, and what sets you apart. 2 or 3 sentences are enough.",
    placeholder: "e.g. product design studio for SaaS startups. I help founders ship a tested MVP in 6 weeks.",
    useProfile: "Use my business profile",
    examplesLabel: "Start from an example",
    examples: [
      "Career-change coach for executives: I help managers switch careers in 6 months without starting from scratch.",
      "Tech recruitment firm in Lyon: we place senior developers in scale-ups within 3 weeks.",
    ],
  },
  audience: {
    field: "Your audience",
    hint: "Their job, their kind of company, what keeps them busy.",
    placeholder: "e.g. owners of industrial SMEs who want to digitise their production",
    suggestions: "From your profile",
    examplesLabel: "Examples",
    examples: ["Early-stage startup founders", "HR directors of growing SMEs", "Freelance developers looking for projects"],
  },
  goal: {
    optional: "Optional: with no choice, the Strategist balances visibility and engagement.",
    options: {
      authority: { title: "Establish my expertise", desc: "Show what you can do, with proof." },
      engagement: { title: "Spark engagement", desc: "Get your community reacting and commenting." },
      "lead-gen": { title: "Attract prospects", desc: "Make your target want to get in touch." },
      conversion: { title: "Put my offer forward", desc: "Make your offer known and invite action." },
      branding: { title: "Build my brand", desc: "Make your brand recognisable and memorable." },
      storytelling: { title: "Tell my story", desc: "Share your journey, behind the scenes and lessons." },
    },
  },
  style: {
    fine: "Fine-tune",
    fineHint: "Register, emotion, hooks and post endings",
    finePages: ["Register", "Hooks & ending"],
    finePagesLabel: "Fine settings",
    fineBack: "Tone & angle",
    fineTitle: "Fine settings",
    toneLabel: "Tone",
    toneExamples: {
      direct: "“Posting every day is pointless. Posting right isn't.”",
      expert: "“3 metrics are enough to run a production line. Here they are.”",
      inspiring: "“A year ago I doubted everything. One choice changed it all.”",
      bold: "“Team meetings kill more projects than they save.”",
      warm: "“Thank you to everyone who wrote to me this week. I'm answering here.”",
    },
    orientationLabel: "Angle",
    orientationDesc: {
      personal: "Your experience and convictions first",
      balanced: "A balance between you and your expertise",
      professional: "Your expertise and offer first",
    },
  },
  content: {
    count: "Number of posts",
    countAria: (n) => `${n} posts`,
    fewer: "One post fewer",
    more: "One more post",
    period: "Period",
    periods: { week: "The week", month: "The month" },
    focus: "Put forward (optional)",
    focusPlaceholder: "e.g. the launch of our new offer, our client results, a trade show in November.",
    formatsNote: "Formats (story, list, case study, hot take…) are picked automatically from your goal.",
  },
  review: {
    edit: "Edit",
    editAria: (label) => `Edit: ${label}`,
    notSet: "Strategist's choice",
    plan: (n, period) => `${n} posts over the ${period === "month" ? "month" : "week"}`,
    focusLine: (t) => `Put forward: ${t}`,
    saveNote: "When you launch the plan, these settings become your editorial line: autonomous mode uses them too.",
    generate: "Generate my plan",
    resume: "Resume my last plan",
    styleLine: (parts) => parts.join(" · "),
  },
  issues: {
    contextShort: "Describe your business in at least one sentence to continue.",
    audienceShort: "Say who you are talking to, to continue.",
  },
  actions: { back: "Back", next: "Continue", cancel: "Cancel", retry: "Try again" },
  generating: {
    title: "Your plan is on its way…",
    detail: "The Strategist is building your posts from your strategy. It takes about twenty seconds.",
    slow: "A little longer than usual, almost there.",
    verySlow: "Still working. You can go elsewhere in Posty: the plan will be waiting here.",
  },
  result: {
    title: "Your plan is ready",
    subtitle: (n) => `${n} post${n > 1 ? "s" : ""} planned. Review, adjust, then start the writing.`,
    edit: "Edit my strategy",
    discuss: "Discuss it",
    newPlan: "New plan",
    kicker: (n) => `Your plan · ${n} post${n > 1 ? "s" : ""}`,
  },
  settingsView: {
    unsaved: (n) => `${n} unsaved change${n > 1 ? "s" : ""}`,
    fineTune: "Fine-tuning",
    fineTuneHint: "Register, emotion, hooks and post endings",
    kicker: "Settings",
  },
  chatKicker: "Conversation",
  saveFailed: "Your editorial line couldn't be saved, but the plan was launched.",
};

export function useJourneyCopy(): { j: JourneyCopy; lang: StrategistLang } {
  const { language } = useLanguage();
  const lang = strategistLang(language);
  return { j: lang === "fr" ? fr : en, lang };
}
