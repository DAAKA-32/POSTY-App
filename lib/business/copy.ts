/**
 * Business-context + marketing-overview UI copy (FR + EN).
 *
 * Same convention as lib/strategist/copy.ts: this surface ships FR and EN, every
 * other locale falls back to EN. Kept out of lib/i18n/translations so the ten
 * locale files (and their shared Translations type) don't have to move together.
 */

import { useLanguage } from "@/contexts/LanguageContext";
import type { BusinessField } from "./profile";

type FieldCopy = { label: string; placeholder: string; hint?: string };

const fr = {
  modal: {
    title: "Le contexte de votre entreprise",
    description:
      "Posty s'en sert pour écrire des posts précis, adaptés à votre offre et à vos clients, sans que vous ayez à tout réexpliquer.",
    save: "Enregistrer",
    saving: "Enregistrement…",
    cancel: "Plus tard",
    saved: "Contexte enregistré",
    saveFail: "Impossible d'enregistrer. Réessayez.",
    optional: "Facultatif",
    privacy: "Ces informations ne servent qu'à personnaliser vos contenus.",
  },
  fields: {
    name: { label: "Nom de l'entreprise", placeholder: "Ex : Atelier Dupont" },
    offer: {
      label: "Ce que vous vendez",
      placeholder: "Ex : Un logiciel de devis pour artisans du bâtiment, à 29 €/mois",
      hint: "Produit ou service principal, en une ou deux phrases.",
    },
    idealCustomer: {
      label: "Votre client idéal",
      placeholder: "Ex : Artisans de 1 à 10 salariés, plombiers et électriciens",
    },
    customerProblems: {
      label: "Leurs problèmes",
      placeholder: "Ex : Ils perdent des chantiers parce que leurs devis partent trop tard",
    },
    differentiator: {
      label: "Ce qui vous distingue",
      placeholder: "Ex : Un devis prêt en 3 minutes depuis le téléphone",
    },
    proofPoints: {
      label: "Preuves que vous pouvez citer",
      placeholder: "Ex : 40 artisans clients depuis 2023",
      hint: "Seuls ces chiffres et références pourront apparaître dans vos posts. Laissez vide pour n'en citer aucun.",
    },
    website: { label: "Site web", placeholder: "https://…" },
    preferredCta: { label: "Appel à l'action préféré", placeholder: "Ex : Écrivez-moi en message privé" },
    avoidTopics: {
      label: "Sujets à éviter",
      placeholder: "Ex : politique, comparaison nominative avec des concurrents",
    },
  } satisfies Record<BusinessField, FieldCopy>,

  overview: {
    title: "Votre marketing LinkedIn",
    subtitle: "Ce que Posty prépare, ce qui est publié et ce qui demande votre attention.",
    loading: "Chargement…",
    loadFail: "Impossible de charger l'état de vos publications.",
    pipeline: {
      scheduled: "Programmés",
      published: "Publiés",
      attention: "À corriger",
      retrying: "En nouvel essai",
      scheduledHint: "En attente de leur heure",
      publishedHint: "Confirmés par LinkedIn",
      attentionHint: "Échec de publication",
      retryingHint: "Posty réessaie",
      next: (date: string) => `Prochain post : ${date}`,
      none: "Aucun post programmé",
      viewCalendar: "Voir le calendrier",
    },
    business: {
      title: "Contexte de l'entreprise",
      empty: "Pas encore renseigné",
      progress: (done: number, total: number) => `${done}/${total} informations clés`,
      add: "Renseigner",
      edit: "Modifier",
    },
    automation: {
      title: "Automatisation",
      weeklyOn: (day: string, count: number) => `Plan hebdomadaire actif : ${count} posts préparés chaque ${day}`,
      weeklyOff: "Plan hebdomadaire désactivé",
      weeklyHint: "Chaque plan est à valider avant programmation.",
      pendingReview: "Un plan est prêt et attend votre validation",
      publishing: "Publication programmée : Posty publie à l'heure prévue et réessaie en cas d'erreur passagère.",
      manage: "Gérer",
      cancelHint: "Pour arrêter une publication, annulez le post dans le calendrier.",
    },
    next: {
      title: "Prochaine action recommandée",
      failed: (n: number) => (n > 1 ? `${n} publications ont échoué` : "1 publication a échoué"),
      failedDesc: "Ouvrez le calendrier pour voir la cause et la corriger.",
      failedCta: "Corriger",
      business: "Ajoutez le contexte de votre entreprise",
      businessDesc: "Vos prochains posts seront plus précis et mieux ancrés dans votre offre.",
      businessCta: "Renseigner",
      pending: "Un plan de posts attend votre validation",
      pendingDesc: "Relisez-le, ajustez-le et programmez-le.",
      pendingCta: "Ouvrir",
      empty: "Rien n'est programmé",
      emptyDesc: "Préparez vos prochains posts pour garder une présence régulière.",
      emptyCta: "Préparer des posts",
      ontrack: (n: number) => (n > 1 ? `${n} posts programmés` : "1 post programmé"),
      ontrackDesc: "Votre calendrier est alimenté. Gardez le rythme.",
      ontrackCta: "Créer un post",
    },
    strategy: {
      title: "Votre stratégie de contenu",
      subtitle: "Des piliers éditoriaux construits à partir de votre entreprise.",
      generate: "Construire ma stratégie",
      regenerate: "Régénérer",
      generating: "Construction en cours…",
      needBusiness: "Renseignez d'abord votre offre et votre client idéal pour obtenir une stratégie utile.",
      failed: "La stratégie n'a pas pu être générée. Réessayez.",
      cadence: "Rythme conseillé",
      purpose: "À quoi ça sert",
      createdAt: (date: string) => `Générée le ${date}`,
      disclaimer:
        "Une stratégie guide votre contenu ; elle ne garantit pas de résultat. L'effet dépend de votre offre, de votre audience et de votre régularité.",
    },
    days: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
  },
};

type Copy = typeof fr;

const en: Copy = {
  modal: {
    title: "Your business context",
    description:
      "Posty uses this to write precise posts grounded in your offer and your customers, so you never have to re-explain it.",
    save: "Save",
    saving: "Saving…",
    cancel: "Later",
    saved: "Business context saved",
    saveFail: "Couldn't save. Please try again.",
    optional: "Optional",
    privacy: "This information is only used to personalize your content.",
  },
  fields: {
    name: { label: "Business name", placeholder: "e.g. Dupont Workshop" },
    offer: {
      label: "What you sell",
      placeholder: "e.g. Quoting software for building tradespeople, $29/month",
      hint: "Your main product or service, in a sentence or two.",
    },
    idealCustomer: {
      label: "Your ideal customer",
      placeholder: "e.g. Tradespeople with 1–10 employees: plumbers, electricians",
    },
    customerProblems: {
      label: "Their problems",
      placeholder: "e.g. They lose jobs because their quotes go out too late",
    },
    differentiator: {
      label: "What sets you apart",
      placeholder: "e.g. A quote ready in 3 minutes from a phone",
    },
    proofPoints: {
      label: "Proof you can cite",
      placeholder: "e.g. 40 tradesperson customers since 2023",
      hint: "Only these figures and references may appear in your posts. Leave empty to cite none.",
    },
    website: { label: "Website", placeholder: "https://…" },
    preferredCta: { label: "Preferred call to action", placeholder: "e.g. Message me directly" },
    avoidTopics: {
      label: "Topics to avoid",
      placeholder: "e.g. politics, naming competitors in comparisons",
    },
  },

  overview: {
    title: "Your LinkedIn marketing",
    subtitle: "What Posty is preparing, what is published and what needs your attention.",
    loading: "Loading…",
    loadFail: "Couldn't load the state of your publications.",
    pipeline: {
      scheduled: "Scheduled",
      published: "Published",
      attention: "Needs attention",
      retrying: "Retrying",
      scheduledHint: "Waiting for their time",
      publishedHint: "Confirmed by LinkedIn",
      attentionHint: "Publishing failed",
      retryingHint: "Posty is retrying",
      next: (date: string) => `Next post: ${date}`,
      none: "No post scheduled",
      viewCalendar: "View calendar",
    },
    business: {
      title: "Business context",
      empty: "Not filled in yet",
      progress: (done: number, total: number) => `${done}/${total} key details`,
      add: "Fill in",
      edit: "Edit",
    },
    automation: {
      title: "Automation",
      weeklyOn: (day: string, count: number) => `Weekly plan on: ${count} posts prepared every ${day}`,
      weeklyOff: "Weekly plan is off",
      weeklyHint: "Every plan needs your approval before it is scheduled.",
      pendingReview: "A plan is ready and waiting for your approval",
      publishing: "Scheduled publishing: Posty publishes at the planned time and retries on temporary errors.",
      manage: "Manage",
      cancelHint: "To stop a publication, cancel the post in the calendar.",
    },
    next: {
      title: "Recommended next action",
      failed: (n: number) => (n > 1 ? `${n} publications failed` : "1 publication failed"),
      failedDesc: "Open the calendar to see the cause and fix it.",
      failedCta: "Fix",
      business: "Add your business context",
      businessDesc: "Your next posts will be more precise and better grounded in your offer.",
      businessCta: "Fill in",
      pending: "A post plan is waiting for your approval",
      pendingDesc: "Review it, adjust it and schedule it.",
      pendingCta: "Open",
      empty: "Nothing is scheduled",
      emptyDesc: "Prepare your next posts to keep a regular presence.",
      emptyCta: "Prepare posts",
      ontrack: (n: number) => (n > 1 ? `${n} posts scheduled` : "1 post scheduled"),
      ontrackDesc: "Your calendar is stocked. Keep the rhythm.",
      ontrackCta: "Create a post",
    },
    strategy: {
      title: "Your content strategy",
      subtitle: "Editorial pillars built from your business.",
      generate: "Build my strategy",
      regenerate: "Regenerate",
      generating: "Building…",
      needBusiness: "Fill in your offer and ideal customer first to get a useful strategy.",
      failed: "The strategy couldn't be generated. Please try again.",
      cadence: "Suggested rhythm",
      purpose: "What it's for",
      createdAt: (date: string) => `Generated on ${date}`,
      disclaimer:
        "A strategy guides your content; it does not guarantee a result. Outcomes depend on your offer, your audience and your consistency.",
    },
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
};

export type BusinessCopy = Copy;

export function useBusinessCopy(): { c: BusinessCopy; lang: "fr" | "en" } {
  const { language } = useLanguage();
  const lang = language === "fr" ? "fr" : "en";
  return { c: lang === "fr" ? fr : en, lang };
}
