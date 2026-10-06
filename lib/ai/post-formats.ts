/**
 * Strategist post formats — the ONE catalogue shared by the planner (Phase 1),
 * the writer (Phase 2) and the plan card UI.
 *
 * Why it exists: the planner used to propose ~11 formats as free text, but the
 * writer collapsed them into two base prompts (storytelling | business) with a
 * random structure seed — so a "list", an "opinion" and a "case study" all came
 * out with the same shape. Each format now carries its own structural guidance
 * (several alternative skeletons, never one template), its own way to close,
 * and its own emoji nuance. Length is a separate, explicit dimension.
 *
 * Pure module (no server deps) so the client card can import the labels.
 */

import type { PostType } from "@/lib/services/prompt-builder";
import type { StrategistAdvancedParams } from "@/types";

type L = { fr: string; en: string };
type LList = { fr: string[]; en: string[] };

export type FormatSlug =
  | "storytelling"
  | "lesson"
  | "opinion"
  | "advice"
  | "list"
  | "educational"
  | "analysis"
  | "case-study"
  | "behind-the-scenes"
  | "debate"
  | "quick-take";

export type LengthBand = "short" | "medium" | "long";

export type GoalSlug = "authority" | "engagement" | "lead-gen" | "conversion" | "branding";

export interface FormatSpec {
  slug: FormatSlug;
  label: L;
  /** One line for the planner: what the format is and what it is for. */
  planner: L;
  /** Which base ghostwriter prompt carries the voice for this format. */
  postType: PostType;
  defaultLength: LengthBand;
  /** Alternative skeletons — the writer picks ONE that fits the topic. */
  shapes: LList;
  /** How a post of this format should end (before CTA-intensity adjustments). */
  closing: L;
  /** Format-specific emoji nuance, layered on the central emoji policy. */
  emoji: L;
  /** Extra format rule when needed (e.g. a list IS allowed to be a list). */
  note?: L;
  /** Legacy / free-text spellings that map to this format. */
  aliases: string[];
}

export const LENGTH_BANDS: Record<LengthBand, { min: number; max: number; label: L; rule: L }> = {
  short: {
    min: 300,
    max: 750,
    label: { fr: "Court", en: "Short" },
    rule: {
      fr: "LONGUEUR : post COURT, 300 à 750 caractères au total. Chaque ligne compte : aucune transition, aucune phrase de remplissage.",
      en: "LENGTH: SHORT post, 300 to 750 characters in total. Every line earns its place: no transitions, no filler.",
    },
  },
  medium: {
    min: 800,
    max: 1400,
    label: { fr: "Moyen", en: "Medium" },
    rule: {
      fr: "LONGUEUR : 800 à 1400 caractères. Assez pour développer l'idée avec un exemple concret, pas plus.",
      en: "LENGTH: 800 to 1400 characters. Enough to develop the idea with one concrete example, no more.",
    },
  },
  long: {
    min: 1400,
    max: 2200,
    label: { fr: "Long", en: "Long" },
    rule: {
      fr: "LONGUEUR : post LONG, 1400 à 2200 caractères. De la matière (exemples, étapes, détails vécus), jamais du remplissage ; reste très aéré.",
      en: "LENGTH: LONG post, 1400 to 2200 characters. Substance (examples, steps, lived detail), never padding; keep it very airy.",
    },
  },
};

export const GOAL_LABELS: Record<GoalSlug, L> = {
  authority: { fr: "Expertise", en: "Expertise" },
  engagement: { fr: "Engagement", en: "Engagement" },
  "lead-gen": { fr: "Prospects", en: "Leads" },
  conversion: { fr: "Conversion", en: "Conversion" },
  branding: { fr: "Image de marque", en: "Brand" },
};

const GOAL_WRITER_HINT: Record<GoalSlug, L> = {
  authority: {
    fr: "montrer la maîtrise de l'auteur par la précision, pas par l'autopromotion",
    en: "show the author's mastery through precision, never self-promotion",
  },
  engagement: {
    fr: "donner envie de répondre : une tension ou une question à laquelle le lecteur a quelque chose à ajouter",
    en: "make people want to reply: a tension or question the reader has something to add to",
  },
  "lead-gen": {
    fr: "faire comprendre à la bonne personne que l'auteur peut résoudre son problème, sans pitch",
    en: "make the right reader realise the author can solve their problem, without pitching",
  },
  conversion: {
    fr: "lever une objection ou montrer la valeur concrète de l'offre, sans ton commercial",
    en: "remove an objection or show the offer's concrete value, without a sales tone",
  },
  branding: {
    fr: "rendre l'auteur reconnaissable : sa façon de voir, ses choix, sa personnalité",
    en: "make the author recognisable: their way of seeing, their choices, their personality",
  },
};

export const FORMATS: Record<FormatSlug, FormatSpec> = {
  storytelling: {
    slug: "storytelling",
    label: { fr: "Récit", en: "Story" },
    planner: {
      fr: "une scène vécue (un moment, une conversation, une décision) qui mène à une idée — pour créer du lien et montrer qui est l'auteur",
      en: "a lived scene (a moment, a conversation, a decision) that leads to an idea — to build connection and show who the author is",
    },
    postType: "storytelling",
    defaultLength: "long",
    shapes: {
      fr: [
        "Scène au présent (où, quand, avec qui), en lignes courtes → la tension ou le doute → ce qui s'est passé → ce que l'auteur en retient, en 2 ou 3 lignes-puces (👉).",
        "Une phrase entendue, entre guillemets, en ouverture → le contexte en 2-3 lignes → pourquoi elle a dérangé ou éclairé → ce que ça a changé concrètement, en mini-liste.",
        "La fin d'abord (le résultat ou l'erreur) → retour en arrière, ligne par ligne → le moment où tout a basculé → l'enseignement en une phrase mise en avant (💡).",
      ],
      en: [
        "Scene in the present (where, when, with whom), in short lines → the tension or doubt → what happened → what the author takes away, as 2 or 3 bullet lines (👉).",
        "A sentence someone said, in quotes, as the opener → the context in 2-3 lines → why it stung or clarified → what it concretely changed, as a mini-list.",
        "The ending first (the result or the mistake) → flashback, line by line → the moment it tipped → the takeaway in one highlighted line (💡).",
      ],
    },
    closing: {
      fr: "Termine sur une phrase forte qui laisse résonner l'histoire, OU sur une question qui invite le lecteur à raconter la sienne. Jamais de morale plaquée.",
      en: "End on a strong line that lets the story resonate, OR on a question inviting the reader to share theirs. Never a tacked-on moral.",
    },
    emoji: {
      fr: "2 à 4 : sur les temps forts, sur la liste d'enseignements et sur la chute — pas dans chaque phrase du récit.",
      en: "2 to 4: on the strong beats, on the list of takeaways and on the ending — not in every sentence of the story.",
    },
    aliases: ["story", "storytelling", "récit", "recit", "anecdote", "narratif", "narrative", "personal-story", "histoire"],
  },

  lesson: {
    slug: "lesson",
    label: { fr: "Retour d'expérience", en: "Lesson learned" },
    planner: {
      fr: "ce que l'auteur a appris (souvent en se trompant) sur un sujet de son métier — crédibilité par l'aveu et le concret",
      en: "what the author learned (often the hard way) about part of their craft — credibility through honesty and specifics",
    },
    postType: "storytelling",
    defaultLength: "medium",
    shapes: {
      fr: [
        "L'erreur ou la croyance de départ → ce qui a révélé le problème → ce que l'auteur fait différemment aujourd'hui, en liste de 3 à 4 points concrets.",
        "Avant / après en lignes opposées (❌ avant / ✅ maintenant) → ce qui a déclenché le changement → ce que ça lui coûte encore.",
        "Une décision difficile → les options sur la table, en mini-liste → ce qui a fait pencher → le bilan honnête, y compris ce qui n'a pas marché.",
      ],
      en: [
        "The starting mistake or belief → what exposed the problem → what the author does differently now, as a list of 3 to 4 concrete points.",
        "Before / after in opposed lines (❌ before / ✅ now) → what triggered the change → what it still costs them.",
        "A hard decision → the options on the table, as a mini-list → what tipped it → an honest review, including what didn't work.",
      ],
    },
    closing: {
      fr: "Termine par ce que l'auteur referait (ou ne referait jamais), ou par une question précise sur l'expérience du lecteur.",
      en: "End with what the author would do again (or never again), or with a precise question about the reader's experience.",
    },
    emoji: {
      fr: "3 à 5 : ❌ / ✅ pour l'avant/après, des repères sur la liste de leçons, un emoji juste sur l'aveu.",
      en: "3 to 5: ❌ / ✅ for the before/after, markers on the list of lessons, one fitting emoji on the confession.",
    },
    aliases: ["lesson", "lesson-learned", "lessons", "leçon", "lecon", "retour-experience", "retour d'expérience", "rex", "learning", "confession", "aveu"],
  },

  opinion: {
    slug: "opinion",
    label: { fr: "Opinion", en: "Opinion" },
    planner: {
      fr: "une prise de position assumée sur une pratique ou une croyance de son secteur — pour faire réagir et marquer les esprits",
      en: "an owned stance on a practice or belief in their field — to spark reactions and be remembered",
    },
    postType: "business",
    defaultLength: "medium",
    shapes: {
      fr: [
        "La position en une phrase, sans prudence → la croyance dominante qu'elle contredit → 2 ou 3 arguments tirés du terrain, une ligne chacun (👉 ou →) → la limite que l'auteur reconnaît, sans se renier.",
        "Un constat qui agace → pourquoi tout le monde continue quand même → ce que l'auteur fait à la place, en 2-3 lignes courtes.",
      ],
      en: [
        "The stance in one sentence, no hedging → the dominant belief it contradicts → 2 or 3 arguments from the field, one line each (👉 or →) → the limit the author admits, without backing down.",
        "An annoying observation → why everyone keeps doing it anyway → what the author does instead, in 2-3 short lines.",
      ],
    },
    closing: {
      fr: "Termine sur la position réaffirmée en une ligne, ou sur un défi au lecteur (« dites-moi où je me trompe »). Aucun ré-équilibrage final.",
      en: "End on the stance restated in one line, or a challenge to the reader (\"tell me where I'm wrong\"). No final re-balancing.",
    },
    emoji: {
      fr: "2 à 3 : en repères d'arguments et pour souligner la position (⚡ 🎯). Pas d'emoji d'émotion gratuit.",
      en: "2 to 3: as argument markers and to underline the stance (⚡ 🎯). No gratuitous emotion emoji.",
    },
    aliases: ["opinion", "contrarian", "contrarian-take", "take", "hot-take", "prise-de-position", "tribune", "thread-of-thought", "point-de-vue"],
  },

  advice: {
    slug: "advice",
    label: { fr: "Conseil", en: "How-to" },
    planner: {
      fr: "une méthode actionnable pour résoudre un problème précis de l'audience — pour être utile et sauvegardé",
      en: "an actionable method for one precise audience problem — to be useful and saved",
    },
    postType: "business",
    defaultLength: "medium",
    shapes: {
      fr: [
        "Le problème tel que l'audience le vit → pourquoi les solutions habituelles échouent → la méthode en 3 à 5 étapes numérotées (1️⃣ 2️⃣ 3️⃣), une ligne d'action chacune → le piège à éviter (⚠️).",
        "Une situation précise (« quand un client vous dit X ») → ce que l'auteur répond ou fait, mot pour mot → pourquoi ça marche, en 2-3 puces.",
      ],
      en: [
        "The problem as the audience lives it → why the usual fixes fail → the method in 3 to 5 numbered steps (1️⃣ 2️⃣ 3️⃣), one action line each → the trap to avoid (⚠️).",
        "A precise situation (\"when a client tells you X\") → what the author says or does, word for word → why it works, in 2-3 bullets.",
      ],
    },
    closing: {
      fr: "Termine par l'étape la plus simple à tester dès aujourd'hui, ou par une question sur la façon dont le lecteur gère ce problème.",
      en: "End with the simplest step to try today, or a question about how the reader handles this problem.",
    },
    emoji: {
      fr: "3 à 6 : numéros ou puces pour les étapes, ⚠️ pour le piège, 👇 ou 💬 pour inviter à réagir.",
      en: "3 to 6: numbers or bullets for the steps, ⚠️ for the trap, 👇 or 💬 to invite a reply.",
    },
    note: {
      fr: "Ici, des étapes numérotées sont voulues : c'est la structure du format.",
      en: "Numbered steps are intended here: they are the structure of the format.",
    },
    aliases: ["advice", "how-to", "howto", "how to", "tuto", "tutorial", "tutoriel", "conseil", "conseils", "méthode", "methode", "guide", "tips"],
  },

  list: {
    slug: "list",
    label: { fr: "Liste", en: "List" },
    planner: {
      fr: "une liste de points très spécifiques (erreurs, signaux, règles, outils) — pour être parcourue vite et sauvegardée",
      en: "a list of very specific points (mistakes, signals, rules, tools) — to be scanned fast and saved",
    },
    postType: "business",
    defaultLength: "medium",
    shapes: {
      fr: [
        "Une phrase qui dit pourquoi cette liste compte → 4 à 7 items (un intitulé court + une ligne concrète chacun) → l'item que l'auteur juge le plus important, expliqué.",
        "Un contexte vécu (« en 3 ans de… ») → la liste, du plus évident au plus contre-intuitif → celui que l'auteur garderait s'il n'en gardait qu'un.",
      ],
      en: [
        "One line on why this list matters → 4 to 7 items (a short title + one concrete line each) → the item the author considers most important, explained.",
        "A lived context (\"in 3 years of…\") → the list, from most obvious to most counter-intuitive → the one the author would keep if only one.",
      ],
    },
    closing: {
      fr: "Termine en demandant quel item manque, ou lequel le lecteur applique déjà — une seule question.",
      en: "End by asking which item is missing, or which one the reader already applies — a single question.",
    },
    emoji: {
      fr: "Un repère emoji par item (un seul style par liste : 1️⃣ 2️⃣ 3️⃣, ✅, ❌ ou 👉) + 1 ou 2 ailleurs (💡 sur l'item clé, 👇 sur la question).",
      en: "One emoji marker per item (one style per list: 1️⃣ 2️⃣ 3️⃣, ✅, ❌ or 👉) + 1 or 2 elsewhere (💡 on the key item, 👇 on the question).",
    },
    note: {
      fr: "Ici, la liste EST la structure (cela prime sur la règle générale contre les listes). Chaque item doit être spécifique au métier de l'auteur — pas de « soyez régulier ». Pas de règle de trois : 4 à 7 items. N'ouvre pas par « Voici X… ».",
      en: "Here the list IS the structure (this overrides the general rule against lists). Each item must be specific to the author's craft — no \"be consistent\". No rule of three: 4 to 7 items. Do not open with \"Here are X…\".",
    },
    aliases: ["list", "liste", "listicle", "checklist", "carrousel", "carousel", "top", "inventaire"],
  },

  educational: {
    slug: "educational",
    label: { fr: "Pédagogie", en: "Explainer" },
    planner: {
      fr: "expliquer simplement un concept, un mécanisme ou une notion de son domaine que l'audience comprend mal — pour asseoir l'expertise",
      en: "explain simply a concept or mechanism from their field that the audience misunderstands — to establish expertise",
    },
    postType: "business",
    defaultLength: "long",
    shapes: {
      fr: [
        "Une idée reçue ou une confusion fréquente → l'explication simple (une comparaison concrète tirée du métier, pas une métaphore littéraire) → les 3 points à retenir en puces (📌) → ce que ça change pour le lecteur.",
        "Une question que les clients posent souvent → la réponse courte → la réponse complète en 3 temps (1️⃣ 2️⃣ 3️⃣) → le piège à éviter (⚠️).",
      ],
      en: [
        "A common misconception or confusion → the simple explanation (a concrete comparison from the craft, not a literary metaphor) → the 3 things to remember as bullets (📌) → what it changes for the reader.",
        "A question clients often ask → the short answer → the full answer in 3 beats (1️⃣ 2️⃣ 3️⃣) → the trap to avoid (⚠️).",
      ],
    },
    closing: {
      fr: "Termine par l'application concrète pour le lecteur, ou par une question qui vérifie s'il se reconnaît dans la confusion de départ.",
      en: "End with the concrete application for the reader, or a question checking whether they recognise the initial confusion.",
    },
    emoji: {
      fr: "3 à 5 pour structurer (📌 🔎 ⚠️ 💡 1️⃣) ; sur un sujet très technique, garde-les en repères de structure seulement.",
      en: "3 to 5 to structure (📌 🔎 ⚠️ 💡 1️⃣); on a very technical topic, keep them as structure markers only.",
    },
    aliases: ["educational", "education", "éducatif", "educatif", "pédagogie", "pedagogie", "pédagogique", "explainer", "expertise", "décryptage-notion", "concept"],
  },

  analysis: {
    slug: "analysis",
    label: { fr: "Analyse", en: "Analysis" },
    planner: {
      fr: "décrypter une tendance, une actualité ou un changement du secteur et ce qu'il implique concrètement — pour montrer du recul",
      en: "decode a trend, news item or industry shift and what it concretely implies — to show perspective",
    },
    postType: "business",
    defaultLength: "long",
    shapes: {
      fr: [
        "Le fait ou le signal observé (daté, vécu ou issu du contexte fourni) → ce que la plupart en concluent → ce que l'auteur y voit → les conséquences concrètes pour l'audience, en 3 puces (→).",
        "Ce qui a changé → pourquoi maintenant → qui y gagne / qui y perd (✅ / ❌) → ce que l'auteur fait déjà différemment.",
      ],
      en: [
        "The observed fact or signal (dated, lived, or from the provided context) → what most people conclude → what the author sees in it → concrete consequences for the audience, as 3 bullets (→).",
        "What changed → why now → who wins / who loses (✅ / ❌) → what the author already does differently.",
      ],
    },
    closing: {
      fr: "Termine par une prédiction assumée ou une question sur la façon dont le lecteur s'y prépare.",
      en: "End with an owned prediction or a question about how the reader is preparing for it.",
    },
    emoji: {
      fr: "2 à 4, en repères (→ ✅ ❌ 📌) et sur la conclusion (🎯).",
      en: "2 to 4, as markers (→ ✅ ❌ 📌) and on the conclusion (🎯).",
    },
    aliases: ["analysis", "analyse", "décryptage", "decryptage", "data-drop", "data", "trend", "tendance", "insight", "veille", "news"],
  },

  "case-study": {
    slug: "case-study",
    label: { fr: "Étude de cas", en: "Case study" },
    planner: {
      fr: "un cas réel (client, projet, test) décortiqué : situation, décisions, résultat, enseignement — pour prouver par l'exemple",
      en: "a real case (client, project, experiment) broken down: situation, decisions, result, lesson — to prove by example",
    },
    postType: "business",
    defaultLength: "long",
    shapes: {
      fr: [
        "L'enjeu en ouverture → la situation de départ en 2 lignes → ce qui a été fait, en étapes (1️⃣ 2️⃣ 3️⃣) → ce qui a moins bien marché → l'enseignement réutilisable (💡).",
        "Le problème du client avec ses mots → le diagnostic → les 2 ou 3 décisions clés en puces → le résultat → ce qu'on peut en tirer.",
      ],
      en: [
        "The stakes up front → the starting situation in 2 lines → what was done, as steps (1️⃣ 2️⃣ 3️⃣) → what worked less well → the reusable lesson (💡).",
        "The client's problem in their own words → the diagnosis → the 2 or 3 key decisions as bullets → the result → what to take from it.",
      ],
    },
    closing: {
      fr: "Termine sur l'enseignement réutilisable, ou sur une question à propos d'un cas similaire chez le lecteur.",
      en: "End on the reusable lesson, or a question about a similar case on the reader's side.",
    },
    emoji: {
      fr: "3 à 5 : repères d'étapes, 💡 sur l'enseignement (📈 seulement si un vrai résultat chiffré est fourni).",
      en: "3 to 5: step markers, 💡 on the lesson (📈 only if a real measured result is provided).",
    },
    note: {
      fr: "N'invente ni nom de client ni chiffre : sans données fournies, reste qualitatif (« un client dans la logistique », « le délai a fondu »).",
      en: "Invent no client name and no figure: without provided data, stay qualitative (\"a client in logistics\", \"the delay shrank\").",
    },
    aliases: ["case-study", "case study", "étude de cas", "etude de cas", "etude-de-cas", "cas client", "cas-client", "use case", "teardown", "retex"],
  },

  "behind-the-scenes": {
    slug: "behind-the-scenes",
    label: { fr: "Coulisses", en: "Behind the scenes" },
    planner: {
      fr: "montrer l'envers du décor : comment l'auteur travaille, décide, se trompe, construit — pour humaniser",
      en: "show what happens backstage: how the author works, decides, fails, builds — to humanise",
    },
    postType: "storytelling",
    defaultLength: "medium",
    shapes: {
      fr: [
        "Un moment précis de la semaine, tel qu'il se passe vraiment, en lignes courtes → ce que personne ne voit, en mini-liste → pourquoi l'auteur fait comme ça.",
        "Un outil, un rituel ou une règle interne → comment il se déroule, étape par étape → ce qu'il a changé, y compris ses limites.",
      ],
      en: [
        "A specific moment of the week, as it really happens, in short lines → what nobody sees, as a mini-list → why the author does it that way.",
        "A tool, ritual or internal rule → how it runs, step by step → what it changed, including its limits.",
      ],
    },
    closing: {
      fr: "Termine sur une phrase simple et sincère, ou sur une question qui invite le lecteur à partager ses propres coulisses.",
      en: "End on a simple, sincere line, or a question inviting the reader to share their own backstage.",
    },
    emoji: {
      fr: "3 à 5, naturels et personnels (☕ 😅 🛠️ 👀…) — c'est le format le plus humain.",
      en: "3 to 5, natural and personal (☕ 😅 🛠️ 👀…) — this is the most human format.",
    },
    aliases: ["behind-the-scenes", "behind the scenes", "bts", "coulisses", "coulisse", "making-of", "envers du décor", "quotidien"],
  },

  debate: {
    slug: "debate",
    label: { fr: "Débat", en: "Debate" },
    planner: {
      fr: "poser une vraie question qui divise le secteur, avec la position de l'auteur — pour générer des commentaires argumentés",
      en: "ask a real question that divides the field, with the author's position — to generate argued comments",
    },
    postType: "business",
    defaultLength: "short",
    shapes: {
      fr: [
        "Le dilemme en une ligne (A ou B ?) → ✅ Pour : 1-2 lignes → ❌ Contre : 1-2 lignes → où l'auteur penche et pourquoi → la question au lecteur (👇).",
        "Une situation concrète qui pose problème → ce que l'auteur a fait → « et vous, qu'auriez-vous fait ? » formulé précisément.",
      ],
      en: [
        "The dilemma in one line (A or B?) → ✅ For: 1-2 lines → ❌ Against: 1-2 lines → where the author leans and why → the question to the reader (👇).",
        "A concrete problematic situation → what the author did → \"what would you have done?\" phrased precisely.",
      ],
    },
    closing: {
      fr: "La question finale EST le cœur du post : précise, répondable en une phrase, jamais « qu'en pensez-vous ? ».",
      en: "The final question IS the heart of the post: precise, answerable in one sentence, never \"what do you think?\".",
    },
    emoji: {
      fr: "2 à 4 : ✅ / ❌ pour les deux camps, 🤔 ou 👇 sur la question.",
      en: "2 to 4: ✅ / ❌ for the two sides, 🤔 or 👇 on the question.",
    },
    note: {
      fr: "Présenter les deux camps est voulu ici, à condition que l'auteur dise clairement où il penche.",
      en: "Presenting both sides is intended here, as long as the author clearly says where they lean.",
    },
    aliases: ["debate", "débat", "debat", "question", "poll", "sondage", "dilemme", "dilemma"],
  },

  "quick-take": {
    slug: "quick-take",
    label: { fr: "Post court", en: "Quick take" },
    planner: {
      fr: "une idée forte en quelques lignes : un constat, une règle, une phrase qui reste — pour la régularité et la mémorisation",
      en: "one strong idea in a few lines: an observation, a rule, a line that sticks — for consistency and recall",
    },
    postType: "business",
    defaultLength: "short",
    shapes: {
      fr: [
        "L'idée en une phrase → 2 à 4 lignes très courtes qui l'ancrent dans un exemple concret → une chute courte.",
        "Une règle personnelle → pourquoi, en 2 lignes → ce qu'elle a évité ou permis, en une ligne-choc.",
      ],
      en: [
        "The idea in one sentence → 2 to 4 very short lines anchoring it in a concrete example → a short punchline.",
        "A personal rule → why, in 2 lines → what it prevented or enabled, in one punchy line.",
      ],
    },
    closing: {
      fr: "Une chute d'une ligne. Pas de question obligatoire.",
      en: "A one-line punchline. No question required.",
    },
    emoji: {
      fr: "1 à 2, sur l'idée clé ou la chute.",
      en: "1 to 2, on the key idea or the punchline.",
    },
    aliases: ["quick-take", "quick take", "short", "court", "post court", "punchline", "one-liner", "pensée", "pensee", "réflexion courte"],
  },
};

export const FORMAT_SLUGS = Object.keys(FORMATS) as FormatSlug[];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_\s]+/g, "-")
    .trim();

/**
 * Map any format string (canonical slug, legacy slug, free text from an old
 * batch) to a canonical format. Unknown values fall back to "opinion" only when
 * nothing matches — never throws, so old batches keep working.
 */
export function normalizeFormat(raw: string | undefined | null): FormatSlug {
  const v = norm(raw ?? "");
  if (!v) return "opinion";
  if ((FORMAT_SLUGS as string[]).includes(v)) return v as FormatSlug;
  for (const spec of Object.values(FORMATS)) {
    if (spec.aliases.some((a) => norm(a) === v)) return spec.slug;
  }
  // Partial match on free text ("storytelling personnel", "mini case study"…).
  for (const spec of Object.values(FORMATS)) {
    if (spec.aliases.some((a) => a.length > 3 && v.includes(norm(a)))) return spec.slug;
  }
  return "opinion";
}

export function normalizeLength(raw: unknown, format: FormatSlug): LengthBand {
  if (raw === "short" || raw === "medium" || raw === "long") {
    // A quick take is short by definition.
    return format === "quick-take" ? "short" : raw;
  }
  return FORMATS[format].defaultLength;
}

export function normalizeGoal(raw: unknown): GoalSlug | undefined {
  const v = typeof raw === "string" ? norm(raw) : "";
  if (!v) return undefined;
  if (v === "authority" || v.includes("expert") || v.includes("autorit")) return "authority";
  if (v === "engagement" || v.includes("engag") || v.includes("communaut")) return "engagement";
  if (v === "lead-gen" || v.includes("lead") || v.includes("prospect")) return "lead-gen";
  if (v === "conversion" || v.includes("convers") || v.includes("vente")) return "conversion";
  if (v === "branding" || v.includes("brand") || v.includes("marque") || v.includes("notori")) return "branding";
  return undefined;
}

// ─── Format mix for a batch ────────────────────────────────────────────────

const OBJECTIVE_PREFS: Record<string, FormatSlug[]> = {
  authority: ["analysis", "educational", "opinion", "case-study", "advice"],
  engagement: ["debate", "opinion", "storytelling", "quick-take", "behind-the-scenes"],
  "lead-gen": ["case-study", "advice", "lesson", "educational"],
  conversion: ["case-study", "advice", "lesson", "educational"],
  branding: ["storytelling", "behind-the-scenes", "opinion", "lesson"],
  storytelling: ["storytelling", "lesson", "behind-the-scenes"],
};

/** Best-effort mapping of the free-text profile objective to a planner objective. */
export function objectiveFromProfile(text: string | undefined): StrategistAdvancedParams["objective"] | undefined {
  const v = norm(text ?? "");
  if (!v) return undefined;
  if (v.includes("lead") || v.includes("client") || v.includes("prospect")) return "lead-gen";
  if (v.includes("chiffre") || v.includes("revenue") || v.includes("vente") || v.includes("sales")) return "conversion";
  if (v.includes("visibil") || v.includes("credib") || v.includes("expert") || v.includes("authority")) return "authority";
  if (v.includes("audience") || v.includes("communaut") || v.includes("engag")) return "engagement";
  if (v.includes("marque") || v.includes("brand")) return "branding";
  return undefined;
}

export interface PlannedSlot {
  format: FormatSlug;
  length: LengthBand;
}

/**
 * Pick a diverse format + length mix for a batch of `count` posts.
 * - distinct formats while count ≤ catalogue size, no two identical adjacent
 * - weighted toward the objective / orientation / hook style
 * - at least one short and one long post from 3 posts up
 * `random` is injectable for tests.
 */
export function pickFormatMix(
  count: number,
  opts: {
    objective?: StrategistAdvancedParams["objective"];
    orientation?: StrategistAdvancedParams["orientation"];
    hookStyle?: StrategistAdvancedParams["hookStyle"];
  } = {},
  random: () => number = Math.random,
): PlannedSlot[] {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return [];

  const weight = new Map<FormatSlug, number>(FORMAT_SLUGS.map((f) => [f, 1]));
  const boost = (list: FormatSlug[] | undefined, by: number) =>
    list?.forEach((f) => weight.set(f, (weight.get(f) ?? 1) + by));
  boost(opts.objective ? OBJECTIVE_PREFS[opts.objective] : undefined, 2.5);
  if (opts.orientation === "personal") boost(["storytelling", "lesson", "behind-the-scenes"], 1.5);
  if (opts.orientation === "professional") boost(["educational", "analysis", "advice", "case-study"], 1.5);
  if (opts.hookStyle === "story" || opts.hookStyle === "confession") boost(["storytelling", "lesson"], 1);
  if (opts.hookStyle === "contrarian") boost(["opinion", "debate"], 1);
  if (opts.hookStyle === "question") boost(["debate"], 1);
  if (opts.hookStyle === "data") boost(["analysis", "case-study"], 1);

  // Weighted sampling without replacement, refilled when the catalogue runs out.
  const picked: FormatSlug[] = [];
  let pool = [...FORMAT_SLUGS];
  while (picked.length < n) {
    if (pool.length === 0) pool = [...FORMAT_SLUGS];
    const total = pool.reduce((s, f) => s + (weight.get(f) ?? 1), 0);
    let r = random() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= weight.get(pool[idx]) ?? 1;
      if (r <= 0) break;
    }
    const choice = pool[idx];
    // Avoid an identical neighbour when the pool was just refilled.
    if (picked.length > 0 && picked[picked.length - 1] === choice && pool.length > 1) {
      continue;
    }
    picked.push(choice);
    pool = pool.filter((f) => f !== choice);
  }

  const slots: PlannedSlot[] = picked.map((format) => ({
    format,
    length: FORMATS[format].defaultLength,
  }));

  // Length variety: from 3 posts up, guarantee at least one short and one long.
  if (n >= 3) {
    const has = (b: LengthBand) => slots.some((s) => s.length === b);
    const firstIndex = (...preds: Array<(s: PlannedSlot) => boolean>) => {
      for (const p of preds) {
        const i = slots.findIndex(p);
        if (i >= 0) return i;
      }
      return -1;
    };
    if (!has("short")) {
      const i = firstIndex(
        (s) => ["debate", "opinion", "advice", "lesson"].includes(s.format),
        (s) => s.length === "medium",
      );
      if (i >= 0) slots[i].length = "short";
    }
    if (!has("long")) {
      const i = firstIndex(
        (s) => s.length === "medium" && ["storytelling", "educational", "analysis", "case-study", "lesson", "advice", "list", "behind-the-scenes"].includes(s.format),
        (s) => s.length === "medium",
      );
      if (i >= 0) slots[i].length = "long";
    }
  }
  return slots;
}

// ─── House-style rules (enforced by the writer prompt AND the lint) ────────

/** The author explicitly asked for a sober register → emojis only as markers. */
export function isSoberRegister(direction?: Pick<StrategistAdvancedParams, "emotion" | "formality">): boolean {
  return (direction?.emotion !== undefined && direction.emotion <= 2) ||
    (direction?.formality !== undefined && direction.formality >= 4);
}

/** Every Strategist post is scannable (a list, a before/after, a series of
 *  short lines) — except a short quick take or short opinion (one idea). */
export function needsVisualBlock(format: FormatSlug, length: LengthBand): boolean {
  return !(format === "quick-take" || (format === "opinion" && length === "short"));
}

/** Minimum emojis the lint expects (0 under a sober register). */
export function minEmojisFor(length: LengthBand, sober: boolean): number {
  if (sober) return 0;
  return length === "short" ? 1 : 2;
}

// ─── Prompt blocks ─────────────────────────────────────────────────────────

/** Catalogue lines for the planner prompt. */
export function formatCatalogueForPlanner(language: "fr" | "en"): string {
  return FORMAT_SLUGS.map((slug) => {
    const f = FORMATS[slug];
    return `- "${slug}" (${f.label[language]}) : ${f.planner[language]}`;
  }).join("\n");
}

/**
 * The closing rule for one post: the format's own close, adjusted by the
 * author's CTA intensity. A debate keeps its question whatever happens — the
 * question IS the post.
 */
export function closingRule(
  format: FormatSlug,
  cta: StrategistAdvancedParams["ctaIntensity"] | undefined,
  language: "fr" | "en",
): string {
  const fr = language === "fr";
  const base = FORMATS[format].closing[language];
  if (cta === "none" && format !== "debate") {
    return fr
      ? "Pas d'appel à l'action ni de question de fin imposée : termine sur la dernière idée forte, en une ligne."
      : "No call to action and no mandatory closing question: end on the last strong idea, in one line.";
  }
  if (cta === "assertive") {
    return `${base} ${fr
      ? "Ajoute ensuite UNE invitation claire à une action précise (ex. écrire en message privé, réserver un échange), en une ligne, sans ton commercial."
      : "Then add ONE clear invitation to a precise action (e.g. send a DM, book a call), in one line, without a sales tone."}`;
  }
  return base;
}

/** Replacement for the craft rules' ENGAGEMENT section in brief mode. */
export function briefEngagementRule(closing: string, language: "fr" | "en"): string {
  return language === "fr"
    ? `ENGAGEMENT (commentaires & sauvegardes > likes):
- Clôture de CE post: ${closing}
- Si tu poses une question, UNE seule, précise, répondable depuis l'expérience du lecteur (jamais "Qu'en pensez-vous ?").
- Aucun appât à engagement ("Commentez OUI", "Identifiez un ami", "Repartagez si…").
- Aucun lien externe dans le corps du post.`
    : `ENGAGEMENT (comments & saves > likes):
- Closing of THIS post: ${closing}
- If you ask a question, only ONE, specific, answerable from the reader's own experience (never "What do you think?").
- No engagement bait ("Comment YES", "Tag a friend", "Repost if…").
- No external links in the post body.`;
}

/** Writer block describing the format of the post being written. */
export function formatBlockForWriter(opts: {
  format: FormatSlug;
  length: LengthBand;
  language: "fr" | "en";
  closing: string;
  emotion?: number;
  formality?: number;
}): string {
  const { format, length, language, closing, emotion, formality } = opts;
  const f = FORMATS[format];
  const fr = language === "fr";
  const shapes = f.shapes[language].map((s) => `- ${s}`).join("\n");

  let emojiNuance = "";
  if (isSoberRegister({ emotion: emotion as StrategistAdvancedParams["emotion"], formality: formality as StrategistAdvancedParams["formality"] })) {
    emojiNuance = fr ? " Registre sobre demandé : 0 à 2, uniquement en repères de liste." : " Sober register requested: 0 to 2, only as list markers.";
  } else if (emotion !== undefined && emotion >= 4 && (formality === undefined || formality <= 3)) {
    emojiNuance = fr ? " Registre vivant demandé : vise le haut de la fourchette." : " Lively register requested: aim for the top of the range.";
  }
  const visual = needsVisualBlock(format, length)
    ? fr
      ? "\nBloc visuel OBLIGATOIRE pour ce format : au moins une mini-liste de 3 à 5 lignes courtes à puces, un avant/après ou une série de lignes-chocs."
      : "\nVisual block REQUIRED for this format: at least one mini-list of 3 to 5 short bulleted lines, a before/after, or a series of punchy lines."
    : "";

  return `

═════════════════════════════════════
${fr ? `FORMAT DE CE POST : ${f.label.fr}` : `FORMAT OF THIS POST: ${f.label.en}`}
═════════════════════════════════════
${fr ? `Ce que c'est : ${f.planner.fr}.` : `What it is: ${f.planner.en}.`}
${fr ? "Squelettes possibles — choisis-en UN, celui qui sert le mieux le sujet. Ce sont des repères de progression, pas des intertitres à recopier :" : "Possible skeletons — pick ONE, the one that best serves the topic. They are progression cues, not headings to copy:"}
${shapes}
${f.note ? `${f.note[language]}\n` : ""}${fr ? "Clôture" : "Closing"} : ${closing}
${fr ? "Emojis pour ce format" : "Emojis for this format"} : ${f.emoji[language]}${emojiNuance}${visual}
${LENGTH_BANDS[length].rule[language]}`;
}

export function goalHint(goal: GoalSlug | undefined, language: "fr" | "en"): string | undefined {
  if (!goal) return undefined;
  return `${GOAL_LABELS[goal][language]} — ${GOAL_WRITER_HINT[goal][language]}`;
}
