/**
 * Strategist UI copy — single source of truth for every string in the drawer.
 *
 * The Strategist writes content in FR or EN only (prompts are FR/EN), so its UI
 * ships FR + EN; every other locale falls back to EN (same behaviour the params
 * panel already had). French uses "tu" consistently.
 */

import { useLanguage } from "@/contexts/LanguageContext";

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

const fr = {
  title: "Stratège",
  active: "Actif",
  activeAria: "Mode autonome actif",
  newChat: "Nouvelle conversation",
  newChatDone: "Nouvelle conversation",
  openSettings: "Réglages",
  close: "Fermer",
  back: "Retour",

  hero: {
    title: "Ton stratège LinkedIn",
    subtitle:
      "Dis-moi ce que tu veux publier. Je prépare un plan pensé pour ton activité, je rédige les posts, tu valides et je les programme.",
    steps: ["Plan", "Posts rédigés", "Programmation"],
    primaryTitle: "Planifier ma semaine",
    primaryDesc: "5 posts variés, adaptés à ton activité et à ton audience",
    primaryPrompt: "Prépare-moi 5 posts pour la semaine prochaine, adaptés à mon activité et à mon audience.",
    more: "Ou commence par",
    writePostTitle: "Rédiger un post",
    writePostDesc: "Sur le sujet de ton choix",
    writePostPrefill: "Rédige un post sur ",
    ideasTitle: "Trouver des idées",
    ideasDesc: "Des angles qui te ressemblent",
    ideasPrompt:
      "Propose-moi 6 idées de posts LinkedIn qui me ressemblent. Pour chacune : le hook tel qu'il apparaîtrait, l'angle en une ligne et le format.",
    auditTitle: "Auditer ma présence",
    auditDesc: "Ce qui marche, ce qui bloque",
    auditPrompt:
      "Audite ma présence LinkedIn à partir de mon profil : 3 points qui fonctionnent, 3 à corriger cette semaine et 1 opportunité inexploitée.",
    lastPlan: "Ton dernier plan",
    resume: "Reprendre",
    autonomousOff: "Mode autonome désactivé",
    autonomousOn: (day: string, count: number) => `Mode autonome : chaque ${day}, ${count} posts`,
    configure: "Configurer",
  },

  composer: {
    placeholder: "Ex : 5 posts sur mon lancement, un post sur mon parcours…",
    inputLabel: "Message au Stratège",
    send: "Envoyer",
    stop: "Arrêter",
    retry: "Réessayer",
    dismiss: "Fermer le message",
    customSettings: (n: number) => `Réglages personnalisés · ${n}`,
  },

  thread: {
    planLoading: "Je prépare ton plan…",
    postLoading: "Je prépare ton post…",
    planLoadingDetail: "Profil, angles, formats, calendrier. Environ 20 secondes.",
    planIntro: (n: number) =>
      n === 1
        ? "Voici le brief de ton post. Ajuste-le si besoin, puis lance la rédaction."
        : `Voici ton plan de ${n} posts. Ajuste ce que tu veux, puis lance la rédaction.`,
    autoPlanIntro: "Voici le plan préparé pour toi. Relis-le avant de lancer la rédaction.",
    copy: "Copier",
    copied: "Copié",
    regenerate: "Régénérer",
    turnIntoPlan: "Transformer en plan",
    turnIntoPlanPrompt: (question: string, answer: string) =>
      `Prépare un plan de posts à partir de cette piste.\n\nMa question : ${question}\n\nLa piste retenue :\n${answer}`,
    answerReady: "Réponse prête",
    planReady: "Plan prêt",
    errorGeneric: "Le Stratège n'a pas pu répondre. Réessaie dans un instant.",
    errorRateLimit: "Tu as atteint la limite pour le moment. Réessaie dans quelques minutes.",
    errorNetwork: "Connexion interrompue. Vérifie ta connexion et réessaie.",
  },

  card: {
    steps: ["Plan", "Rédaction", "Programmation"],
    posts: (n: number) => `${n} ${plural(n, "post", "posts")}`,
    audience: "Pour",
    objective: "Objectif",
    tone: "Ton",
    idea: "Idée",
    why: "Pourquoi ce post",
    edit: "Modifier",
    done: "Terminé",
    deletePost: "Retirer ce post du plan",
    hookLabel: "Accroche",
    angleLabel: "Idée principale",
    dateLabel: "Date",
    timeLabel: "Heure",
    formatLabel: "Format",
    lengthLabel: "Longueur",
    noteLabel: "Note pour la rédaction",
    notePlaceholder: "Ex : parle de mon client de Lyon, garde un ton léger…",
    noteHintStory: "Ajoute ton anecdote réelle ici : le post sera plus juste.",
    saving: "Enregistrement…",
    writeAll: (n: number) => (n === 1 ? "Rédiger le post" : `Rédiger les ${n} posts`),
    writeMissing: "Rédiger les posts manquants",
    writing: (n: number) =>
      n === 1 ? "Rédaction du post… environ 15 secondes." : `Rédaction de ${n} posts… environ ${Math.max(20, n * 8)} secondes.`,
    discard: "Ignorer ce plan",
    schedule: (n: number) => (n === 1 ? "Programmer sur LinkedIn" : `Programmer les ${n} posts`),
    scheduleConfirm: (n: number) =>
      `${n === 1 ? "Ce post sera publié" : `Ces ${n} posts seront publiés`} automatiquement sur ton LinkedIn aux dates indiquées. Tu pourras annuler tant qu'ils ne sont pas en ligne.`,
    confirm: "Confirmer",
    cancel: "Annuler",
    rewriteAll: "Tout réécrire",
    scheduling: "Programmation…",
    scheduledSummary: (n: number) =>
      `${n} ${plural(n, "post programmé", "posts programmés")}. Publication automatique aux horaires prévus.`,
    viewCalendar: "Voir le calendrier",
    cancelScheduling: "Annuler la programmation",
    cancelConfirm: "Les posts seront retirés de la file et ne seront pas publiés. Ton plan reste modifiable.",
    cancelling: "Annulation…",
    discarded: "Plan ignoré",
    restore: "Restaurer",
    chars: (n: number) => `${n.toLocaleString("fr-FR")} caractères`,
    seeMore: "…voir plus",
    seeLess: "Réduire",
    copyPost: "Copier",
    copied: "Copié",
    editPost: "Modifier",
    rewrite: "Réécrire",
    rewriteTitle: "Réécrire ce post",
    rewriteChips: ["Plus court", "Plus direct", "Moins d'emojis", "Plus personnel", "Plus d'exemples concrets"],
    rewritePlaceholder: "Ou écris ta consigne…",
    rewriteGo: "Réécrire",
    rewriting: "Réécriture…",
    scheduledFor: (when: string) => `Programmé pour ${when}`,
    visualGenerate: "Générer un visuel",
    visualRegenerate: "Régénérer le visuel",
    visualGenerating: "Génération du visuel…",
    visualAlt: "Visuel du post",
    cancelEdit: "Annuler",
    saveEdit: "Enregistrer",
    toast: {
      saveFail: "Modification non enregistrée. Réessaie.",
      deleteFail: "Impossible de retirer ce post.",
      writeFail: "La rédaction a échoué. Réessaie.",
      writeSomeFail: (n: number) => `${n} ${plural(n, "post n'a", "posts n'ont")} pas pu être ${plural(n, "rédigé", "rédigés")}. Réessaie.`,
      written: (n: number) => (n === 1 ? "Post rédigé." : `${n} posts rédigés.`),
      rewritten: "Post réécrit.",
      scheduleFail: "La programmation a échoué. Réessaie.",
      scheduled: (n: number, adjusted: number) =>
        `${n} ${plural(n, "post programmé", "posts programmés")}${adjusted ? ` (${adjusted} ${plural(adjusted, "créneau ajusté", "créneaux ajustés")})` : ""}.`,
      scheduleSomeFail: (n: number) => `${n} ${plural(n, "post n'a", "posts n'ont")} pas pu être ${plural(n, "programmé", "programmés")}.`,
      cancelFail: "L'annulation a échoué. Réessaie.",
      cancelled: (n: number) => `Programmation annulée : ${n} ${plural(n, "post retiré", "posts retirés")} de la file.`,
      cancelSomeFail: (n: number) => `${n} ${plural(n, "post n'a", "posts n'ont")} pas pu être ${plural(n, "annulé", "annulés")} (déjà en ligne ou en cours).`,
      copyFail: "Copie impossible.",
      editFail: "Modification non enregistrée.",
      visualMaxOnly: "Visuels réservés au plan Max.",
      visualFail: "Visuel non généré. Réessaie.",
      visualSavedFail: "Visuel généré mais non enregistré : régénère-le avant de programmer.",
      visualDone: "Visuel généré.",
      network: "Connexion interrompue. Réessaie.",
    },
  },

  settings: {
    title: "Réglages",
    editorialTitle: "Ta ligne éditoriale",
    editorialDesc: "Le Stratège s'en sert pour chaque plan et chaque post.",
    sessionNote: "Les changements s'appliquent à tes prochains plans. Enregistre-les pour les garder.",
    refine: "Affiner (facultatif)",
    saveDefault: "Enregistrer",
    saved: "Réglages enregistrés.",
    reset: "Réinitialiser",
    context: {
      label: "Ton activité",
      placeholder:
        "Ex : studio de design produit pour startups SaaS. J'aide les fondateurs à sortir un MVP testé en 6 semaines.",
      hint: "Ce que tu fais, pour qui, ce qui te distingue. C'est ce qui rend les posts vraiment à toi.",
    },
    audience: { label: "Ton audience", placeholder: "Ex : fondateurs de startups early-stage" },
    objective: {
      label: "Objectif",
      authority: "Expertise",
      engagement: "Engagement",
      "lead-gen": "Prospects",
      conversion: "Conversion",
      branding: "Image de marque",
      storytelling: "Récit",
    },
    tone: { label: "Ton", direct: "Direct", expert: "Expert", inspiring: "Inspirant", bold: "Provocateur", warm: "Chaleureux" },
    formality: { label: "Registre", low: "Décontracté", high: "Corporate" },
    emotion: { label: "Émotion", low: "Factuel", high: "Vibrant" },
    cta: { label: "Fin de post", none: "Sans appel à l'action", soft: "Question ouverte", assertive: "Appel clair" },
    hook: { label: "Accroches", auto: "Variées", contrarian: "À contre-courant", story: "Récit", data: "Fait concret", question: "Question", confession: "Aveu" },
    orientation: { label: "Angle", personal: "Personnel", professional: "Professionnel", balanced: "Équilibré" },
    scaleAria: (label: string, n: number) => `${label} : ${n} sur 5`,
    autonomousTitle: "Mode autonome",
    autonomousDesc: "Chaque semaine, le Stratège prépare un plan pour toi. Rien n'est rédigé ni publié sans ta validation.",
    day: "Jour",
    count: "Posts par semaine",
    prompt: "Consigne (facultatif)",
    promptPlaceholder: "Ex : mets l'accent sur nos cas clients, ton direct.",
    activate: "Activer le mode autonome",
    deactivate: "Désactiver",
    nextPlan: "Prochain plan",
    lastPlan: "Dernier plan",
    none: "Aucun pour l'instant",
    generateNow: "Générer le plan maintenant",
    generating: "Préparation du plan…",
    activated: "Mode autonome activé.",
    deactivated: "Mode autonome désactivé.",
    saveFail: "Enregistrement impossible. Réessaie.",
    planReadyToast: "Plan prêt : relis-le dans la conversation.",
    days: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
  },

  gate: {
    lockedEyebrow: "Accès sur invitation",
    lockedTitle: "Le Stratège est en accès anticipé",
    lockedDesc:
      "Il planifie, rédige et programme tes posts LinkedIn à partir de ton activité. L'accès est ouvert progressivement.",
    lockedCta: "Nous contacter",
    linkedinEyebrow: "LinkedIn requis",
    linkedinTitle: "Connecte ton compte LinkedIn",
    linkedinDesc: "Le Stratège programme tes posts directement sur LinkedIn : il a besoin de ton compte connecté.",
    linkedinCta: "Connecter LinkedIn",
    linkedinSettings: "Gérer mes connexions",
  },

  banner: {
    title: "Ton plan de la semaine est prêt",
    desc: "Relis-le et lance la rédaction quand tu veux.",
    open: "Voir le plan",
    dismiss: "Ignorer",
  },
};

export type StrategistCopy = typeof fr;

const en: StrategistCopy = {
  title: "Strategist",
  active: "Active",
  activeAria: "Autonomous mode on",
  newChat: "New conversation",
  newChatDone: "New conversation",
  openSettings: "Settings",
  close: "Close",
  back: "Back",

  hero: {
    title: "Your LinkedIn strategist",
    subtitle:
      "Tell me what you want to publish. I build a plan around your business, write the posts, you approve and I schedule them.",
    steps: ["Plan", "Written posts", "Scheduling"],
    primaryTitle: "Plan my week",
    primaryDesc: "5 varied posts, tailored to your business and audience",
    primaryPrompt: "Prepare 5 posts for next week, tailored to my business and my audience.",
    more: "Or start with",
    writePostTitle: "Write a post",
    writePostDesc: "On the topic of your choice",
    writePostPrefill: "Write a post about ",
    ideasTitle: "Find ideas",
    ideasDesc: "Angles that sound like you",
    ideasPrompt:
      "Suggest 6 LinkedIn post ideas that sound like me. For each: the hook as it would appear, the angle in one line and the format.",
    auditTitle: "Audit my presence",
    auditDesc: "What works, what's holding you back",
    auditPrompt:
      "Audit my LinkedIn presence based on my profile: 3 things that work, 3 to fix this week and 1 untapped opportunity.",
    lastPlan: "Your latest plan",
    resume: "Resume",
    autonomousOff: "Autonomous mode off",
    autonomousOn: (day: string, count: number) => `Autonomous mode: every ${day}, ${count} posts`,
    configure: "Set up",
  },

  composer: {
    placeholder: "e.g. 5 posts about my launch, a post about my journey…",
    inputLabel: "Message the Strategist",
    send: "Send",
    stop: "Stop",
    retry: "Retry",
    dismiss: "Dismiss message",
    customSettings: (n: number) => `Custom settings · ${n}`,
  },

  thread: {
    planLoading: "Preparing your plan…",
    postLoading: "Preparing your post…",
    planLoadingDetail: "Profile, angles, formats, calendar. About 20 seconds.",
    planIntro: (n: number) =>
      n === 1
        ? "Here's the brief for your post. Adjust it if needed, then start writing."
        : `Here's your ${n}-post plan. Adjust anything you like, then start writing.`,
    autoPlanIntro: "Here's the plan prepared for you. Review it before starting the writing.",
    copy: "Copy",
    copied: "Copied",
    regenerate: "Regenerate",
    turnIntoPlan: "Turn into a plan",
    turnIntoPlanPrompt: (question: string, answer: string) =>
      `Prepare a post plan from this direction.\n\nMy question: ${question}\n\nThe direction we kept:\n${answer}`,
    answerReady: "Answer ready",
    planReady: "Plan ready",
    errorGeneric: "The Strategist couldn't answer. Try again in a moment.",
    errorRateLimit: "You've hit the limit for now. Try again in a few minutes.",
    errorNetwork: "Connection lost. Check your connection and try again.",
  },

  card: {
    steps: ["Plan", "Writing", "Scheduling"],
    posts: (n: number) => `${n} ${plural(n, "post", "posts")}`,
    audience: "For",
    objective: "Goal",
    tone: "Tone",
    idea: "Idea",
    why: "Why this post",
    edit: "Edit",
    done: "Done",
    deletePost: "Remove this post from the plan",
    hookLabel: "Hook",
    angleLabel: "Main idea",
    dateLabel: "Date",
    timeLabel: "Time",
    formatLabel: "Format",
    lengthLabel: "Length",
    noteLabel: "Note for the writing",
    notePlaceholder: "e.g. mention my client in Lyon, keep it light…",
    noteHintStory: "Add your real anecdote here: the post will ring truer.",
    saving: "Saving…",
    writeAll: (n: number) => (n === 1 ? "Write the post" : `Write the ${n} posts`),
    writeMissing: "Write the missing posts",
    writing: (n: number) =>
      n === 1 ? "Writing the post… about 15 seconds." : `Writing ${n} posts… about ${Math.max(20, n * 8)} seconds.`,
    discard: "Dismiss this plan",
    schedule: (n: number) => (n === 1 ? "Schedule on LinkedIn" : `Schedule the ${n} posts`),
    scheduleConfirm: (n: number) =>
      `${n === 1 ? "This post" : `These ${n} posts`} will be published automatically on your LinkedIn on the dates shown. You can cancel until they go live.`,
    confirm: "Confirm",
    cancel: "Cancel",
    rewriteAll: "Rewrite all",
    scheduling: "Scheduling…",
    scheduledSummary: (n: number) => `${n} ${plural(n, "post scheduled", "posts scheduled")}. Published automatically at the planned times.`,
    viewCalendar: "View calendar",
    cancelScheduling: "Cancel scheduling",
    cancelConfirm: "The posts will be removed from the queue and won't be published. Your plan stays editable.",
    cancelling: "Cancelling…",
    discarded: "Plan dismissed",
    restore: "Restore",
    chars: (n: number) => `${n.toLocaleString("en-US")} characters`,
    seeMore: "…see more",
    seeLess: "Show less",
    copyPost: "Copy",
    copied: "Copied",
    editPost: "Edit",
    rewrite: "Rewrite",
    rewriteTitle: "Rewrite this post",
    rewriteChips: ["Shorter", "More direct", "Fewer emojis", "More personal", "More concrete examples"],
    rewritePlaceholder: "Or type your own instruction…",
    rewriteGo: "Rewrite",
    rewriting: "Rewriting…",
    scheduledFor: (when: string) => `Scheduled for ${when}`,
    visualGenerate: "Generate a visual",
    visualRegenerate: "Regenerate the visual",
    visualGenerating: "Generating the visual…",
    visualAlt: "Post visual",
    cancelEdit: "Cancel",
    saveEdit: "Save",
    toast: {
      saveFail: "Change not saved. Try again.",
      deleteFail: "Couldn't remove this post.",
      writeFail: "Writing failed. Try again.",
      writeSomeFail: (n: number) => `${n} ${plural(n, "post", "posts")} couldn't be written. Try again.`,
      written: (n: number) => (n === 1 ? "Post written." : `${n} posts written.`),
      rewritten: "Post rewritten.",
      scheduleFail: "Scheduling failed. Try again.",
      scheduled: (n: number, adjusted: number) =>
        `${n} ${plural(n, "post scheduled", "posts scheduled")}${adjusted ? ` (${adjusted} ${plural(adjusted, "slot adjusted", "slots adjusted")})` : ""}.`,
      scheduleSomeFail: (n: number) => `${n} ${plural(n, "post", "posts")} couldn't be scheduled.`,
      cancelFail: "Cancelling failed. Try again.",
      cancelled: (n: number) => `Scheduling cancelled: ${n} ${plural(n, "post", "posts")} removed from the queue.`,
      cancelSomeFail: (n: number) => `${n} ${plural(n, "post", "posts")} couldn't be cancelled (already live or publishing).`,
      copyFail: "Couldn't copy.",
      editFail: "Edit not saved.",
      visualMaxOnly: "Visuals are a Max plan feature.",
      visualFail: "Visual not generated. Try again.",
      visualSavedFail: "Visual generated but not saved: regenerate it before scheduling.",
      visualDone: "Visual generated.",
      network: "Connection lost. Try again.",
    },
  },

  settings: {
    title: "Settings",
    editorialTitle: "Your editorial line",
    editorialDesc: "The Strategist uses it for every plan and every post.",
    sessionNote: "Changes apply to your next plans. Save them to keep them.",
    refine: "Fine-tune (optional)",
    saveDefault: "Save",
    saved: "Settings saved.",
    reset: "Reset",
    context: {
      label: "Your business",
      placeholder: "e.g. product design studio for SaaS startups. I help founders ship a tested MVP in 6 weeks.",
      hint: "What you do, for whom, what sets you apart. This is what makes the posts truly yours.",
    },
    audience: { label: "Your audience", placeholder: "e.g. early-stage startup founders" },
    objective: {
      label: "Goal",
      authority: "Expertise",
      engagement: "Engagement",
      "lead-gen": "Leads",
      conversion: "Conversion",
      branding: "Brand",
      storytelling: "Storytelling",
    },
    tone: { label: "Tone", direct: "Direct", expert: "Expert", inspiring: "Inspiring", bold: "Bold", warm: "Warm" },
    formality: { label: "Register", low: "Casual", high: "Corporate" },
    emotion: { label: "Emotion", low: "Factual", high: "Vivid" },
    cta: { label: "Post ending", none: "No call to action", soft: "Open question", assertive: "Clear call to action" },
    hook: { label: "Hooks", auto: "Varied", contrarian: "Contrarian", story: "Story", data: "Concrete fact", question: "Question", confession: "Confession" },
    orientation: { label: "Angle", personal: "Personal", professional: "Professional", balanced: "Balanced" },
    scaleAria: (label: string, n: number) => `${label}: ${n} of 5`,
    autonomousTitle: "Autonomous mode",
    autonomousDesc: "Every week, the Strategist prepares a plan for you. Nothing is written or published without your approval.",
    day: "Day",
    count: "Posts per week",
    prompt: "Instruction (optional)",
    promptPlaceholder: "e.g. focus on our client stories, direct tone.",
    activate: "Turn on autonomous mode",
    deactivate: "Turn off",
    nextPlan: "Next plan",
    lastPlan: "Last plan",
    none: "None yet",
    generateNow: "Generate the plan now",
    generating: "Preparing the plan…",
    activated: "Autonomous mode on.",
    deactivated: "Autonomous mode off.",
    saveFail: "Couldn't save. Try again.",
    planReadyToast: "Plan ready: review it in the conversation.",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },

  gate: {
    lockedEyebrow: "Invitation only",
    lockedTitle: "The Strategist is in early access",
    lockedDesc: "It plans, writes and schedules your LinkedIn posts from your business. Access is opening gradually.",
    lockedCta: "Contact us",
    linkedinEyebrow: "LinkedIn required",
    linkedinTitle: "Connect your LinkedIn account",
    linkedinDesc: "The Strategist schedules your posts directly on LinkedIn, so it needs your account connected.",
    linkedinCta: "Connect LinkedIn",
    linkedinSettings: "Manage my connections",
  },

  banner: {
    title: "Your plan for the week is ready",
    desc: "Review it and start the writing whenever you like.",
    open: "View the plan",
    dismiss: "Dismiss",
  },
};

export type StrategistLang = "fr" | "en";

export function strategistLang(language: string | undefined): StrategistLang {
  return language === "fr" ? "fr" : "en";
}

export function getStrategistCopy(language: string | undefined): StrategistCopy {
  return strategistLang(language) === "fr" ? fr : en;
}

/** Copy + the FR/EN language the Strategist generates in. */
export function useStrategistCopy(): { c: StrategistCopy; lang: StrategistLang } {
  const { language } = useLanguage();
  const lang = strategistLang(language);
  return { c: lang === "fr" ? fr : en, lang };
}

// ─── Dates ───────────────────────────────────────────────────────────────────

const locale = (lang: StrategistLang) => (lang === "fr" ? "fr-FR" : "en-US");

function parseIso(iso: string): Date | null {
  const [y, m, d] = (iso || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** "2026-10-06" → "mar. 6 oct." / "Tue, Oct 6" */
export function formatDay(iso: string, lang: StrategistLang): string {
  const date = parseIso(iso);
  if (!date) return iso;
  return date.toLocaleDateString(locale(lang), { weekday: "short", day: "numeric", month: "short" });
}

/** "6–10 oct." / "Oct 6 – 10" style range for the card header. */
export function formatRange(fromIso: string, toIso: string, lang: StrategistLang): string {
  const a = parseIso(fromIso);
  const b = parseIso(toIso);
  if (!a || !b) return "";
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (a.getTime() === b.getTime()) return a.toLocaleDateString(locale(lang), opts);
  return `${a.toLocaleDateString(locale(lang), opts)} – ${b.toLocaleDateString(locale(lang), opts)}`;
}

/** UTC millis → "mar. 6 oct. à 08:30" / "Tue, Oct 6 at 8:30 AM" */
export function formatDateTime(ms: number, lang: StrategistLang): string {
  const d = new Date(ms);
  const day = d.toLocaleDateString(locale(lang), { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString(locale(lang), { hour: "2-digit", minute: "2-digit" });
  return lang === "fr" ? `${day} à ${time}` : `${day} at ${time}`;
}
