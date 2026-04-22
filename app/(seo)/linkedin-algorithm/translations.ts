export const translations = {
  en: {
    meta: {
      title: "LinkedIn Algorithm 2026: How It Actually Works | Posty",
      description:
        "How the LinkedIn algorithm ranks posts in 2026 — the 4 distribution phases, 5 key ranking signals, what changed this year, and 7 proven tactics that still work.",
    },
    breadcrumb: "LinkedIn Algorithm",
    badge: "2026 Algorithm Guide",
    heroTitle: "How the",
    heroTitleHighlight: "LinkedIn algorithm",
    heroSubtitle:
      "LinkedIn doesn't publish its ranking code, but a decade of engineering blog posts, patent filings, and consistent creator experiments have pinned down how it actually works. Here's the practical, no-fluff version.",
    ctaPrimary: "Write better posts with AI",
    ctaSecondary: "Jump to the breakdown",
    tldr: {
      label: "TL;DR",
      body: "LinkedIn scores every post in four phases: quality check, test distribution to a small seed audience, engagement evaluation, then viral distribution if the signals are strong. The signals that matter most — in order — are meaningful comments, dwell time, content relevance, creator authority, and connection strength. Everything else is noise.",
    },
    phasesSection: {
      title: "The 4 distribution phases",
      subtitle:
        "Your post moves through four automated checkpoints before it reaches a large audience. Understanding each one tells you where you're actually losing reach.",
      phases: [
        {
          title: "Quality check (spam filter)",
          description:
            "Within seconds of publishing, LinkedIn runs the post through classifiers that flag spam, low-quality, or policy-violating content. Too many hashtags, external links without context, generic engagement bait, or AI-obvious patterns get downranked here — often silently.",
          outcomeLabel: "Outcome",
          outcome: "Low-quality posts are capped before distribution even starts.",
        },
        {
          title: "Seed audience test",
          description:
            "The post is shown to a small slice of your network (typically 50 to a few hundred people) — picked by connection strength, past engagement with you, and topical relevance. The first 60 minutes of this test window are critical.",
          outcomeLabel: "Outcome",
          outcome: "If engagement rate stays above a threshold, the post advances.",
        },
        {
          title: "Engagement evaluation",
          description:
            "LinkedIn weighs what happened during the seed test: comment-to-view ratio, dwell time (how long people stop scrolling), share volume, and the profile authority of everyone who engaged. A meaningful comment from an active creator is worth exponentially more than a passive like from a dormant account.",
          outcomeLabel: "Outcome",
          outcome: "Strong signals trigger expansion to the broader feed.",
        },
        {
          title: "Viral distribution",
          description:
            "If the post clears the engagement threshold, LinkedIn pushes it to second-degree connections and beyond — users interested in the topic, not just your network. This is where reach multiplies 10x to 100x. Viral posts can keep earning impressions for 48 to 72 hours.",
          outcomeLabel: "Outcome",
          outcome: "Reach compounds until engagement decays.",
        },
      ],
    },
    signalsSection: {
      title: "The 5 ranking signals that actually move the needle",
      subtitle:
        "LinkedIn considers dozens of factors. In practice, these five explain 90% of why one post takes off and another doesn't.",
      signals: [
        {
          emoji: "\u{1F4AC}",
          title: "Meaningful comments",
          description:
            "Not emojis, not one-word replies. Substantive comments — especially ones that trigger a back-and-forth — signal that your content is worth pausing for. This is the single heaviest positive signal.",
          weightLabel: "Highest weight",
        },
        {
          emoji: "\u{23F1}\u{FE0F}",
          title: "Dwell time",
          description:
            "How long people stop scrolling on your post. Long-form posts that actually keep attention beat short posts that get a skim-and-scroll. The 'See more' click is a measurable proxy.",
          weightLabel: "High",
        },
        {
          emoji: "\u{1F3AF}",
          title: "Content relevance",
          description:
            "The algorithm matches your topic to each viewer's inferred interests. Posts that stay in a consistent niche build topical authority and get shown to tighter, more relevant audiences over time.",
          weightLabel: "High",
        },
        {
          emoji: "\u{1F3C6}",
          title: "Creator authority",
          description:
            "LinkedIn tracks your historical engagement rate, post frequency, and network quality. Consistent creators with solid engagement earn a baseline boost on every post.",
          weightLabel: "Medium",
        },
        {
          emoji: "\u{1F517}",
          title: "Connection strength",
          description:
            "Weighted by past interactions — people who've liked or commented on your posts before are heavily prioritized in the seed audience. Reconnecting with dormant contacts costs you early-window engagement.",
          weightLabel: "Medium",
        },
      ],
    },
    recentChanges: {
      title: "What changed in 2026",
      subtitle:
        "LinkedIn has been re-tuning distribution aggressively. Four changes this year have the biggest impact on what you should actually post.",
      changes: [
        {
          label: "Q1 2026",
          title: "External links penalty softened",
          description:
            "Posts with external links no longer get auto-capped. LinkedIn started rewarding links when the post itself gets substantial dwell time — effectively requiring the link to be earned by the content.",
        },
        {
          label: "Q2 2026",
          title: "Video gets priority in professional topics",
          description:
            "Short-form vertical video posts (under 90 seconds) are seeing 2 to 3x the reach on B2B/career topics compared to text-only equivalents. Captions and strong hooks in the first 3 seconds matter more than production quality.",
        },
        {
          label: "Rolling",
          title: "AI-generated content detection",
          description:
            "Posts with generic AI patterns (excessive lists, boilerplate openers, hollow thought leadership) are increasingly downranked. The fix is specificity: real names, real numbers, real lived experience.",
        },
        {
          label: "Rolling",
          title: "Comment quality weighting",
          description:
            "Comments over 12 words count significantly more than short ones. Reciprocal commenting loops (pods) are still detectable and devalued — organic depth wins.",
        },
      ],
    },
    tipsSection: {
      title: "7 tactics that still work in 2026",
      subtitle:
        "These aren't hacks. They're the patterns that correlate with reach across thousands of posts analyzed in 2025 and 2026.",
      tips: [
        {
          title: "Win the first 60 minutes",
          description:
            "Post when your core audience is actually online. The engagement your post earns in the first hour determines whether it escapes the seed-audience test. Check your analytics for your personal peak window.",
        },
        {
          title: "Hook in the first 2 lines",
          description:
            "Those are the only lines visible before 'See more'. Specific, unexpected, or slightly contrarian openers trigger the click — which LinkedIn measures as dwell time.",
        },
        {
          title: "Trigger comments, not just likes",
          description:
            "End posts with a question that requires an opinion, not a yes/no. Reply to every comment in the first 2 hours to keep the thread alive — thread depth is a strong signal.",
        },
        {
          title: "Ship 3 to 5 times per week, consistently",
          description:
            "Creator authority compounds. Posting Monday-Wednesday-Friday for 3 months beats 20 posts in week 1 and silence after. LinkedIn rewards the creators who show up.",
        },
        {
          title: "Stay in a clear niche for 6 months",
          description:
            "Jumping between unrelated topics resets your topical authority. Pick a narrow lane and dominate it — the algorithm will eventually push your posts to people who care.",
        },
        {
          title: "Use native formats, not reposts",
          description:
            "Original text, native video, native document, and native polls all outperform link shares. Documents (PDF carousels) specifically still have very high dwell-time averages.",
        },
        {
          title: "Write like a human, not like LinkedIn",
          description:
            "Formulaic 'leadership' posts, motivational fluff, and obvious ChatGPT structure are downranked. Specific stories, unusual opinions, and one-of-a-kind experiences are rewarded.",
        },
      ],
    },
    mythsSection: {
      title: "Common myths, fact-checked",
      subtitle:
        "These claims spread every year. None of them hold up against actual data.",
      mythLabel: "Myth",
      realityLabel: "Reality",
      myths: [
        {
          claim: "More hashtags = more reach",
          reality:
            "Three to five relevant hashtags are fine. Beyond that, the spam classifier kicks in and caps distribution. Hashtags are a tiny relevance signal, not a reach multiplier.",
        },
        {
          claim: "External links kill your reach",
          reality:
            "Not anymore. Since Q1 2026, LinkedIn measures dwell time before deciding to cap. A well-written post with one contextual link outperforms a link-free post with no substance.",
        },
        {
          claim: "There's a best time to post",
          reality:
            "There's a best time for your specific audience. Generic '8 AM Tuesday' advice is worthless — check when your connections are actually online and engaged, which varies wildly by industry.",
        },
        {
          claim: "Engagement pods work",
          reality:
            "They used to. LinkedIn's classifier now detects repetitive cross-engagement between the same accounts and devalues the reach boost. Real engagement scales; artificial doesn't.",
        },
        {
          claim: "Posts with images always win",
          reality:
            "Text-only posts often outperform posts with stock images. What matters is dwell time — if the image doesn't add signal, it's just slowing down the read and reducing your hook effectiveness.",
        },
      ],
    },
    aiCta: {
      title: "Skip the guesswork. Write posts the algorithm actually rewards.",
      subtitle:
        "Posty is trained on thousands of posts that went viral in 2025 and 2026. It generates hooks, structure, and CTAs calibrated for the signals above — in seconds.",
      button: "Try Posty free",
    },
    faqTitle: "LinkedIn algorithm FAQ",
    faq: [
      {
        question: "How often should I post on LinkedIn for the algorithm?",
        answer:
          "3 to 5 times per week is the sweet spot for most creators. Daily posting can work if you sustain the quality — but one thoughtful post beats five rushed ones every time. Consistency over months matters more than raw frequency.",
      },
      {
        question: "Does the LinkedIn algorithm punish external links?",
        answer:
          "Not since early 2026. External links used to cap reach automatically, but LinkedIn now measures dwell time on the post itself before deciding. If your post earns attention, the link ships with it. If the post is thin, the link is what gets blamed but the real issue is the content.",
      },
      {
        question: "What's the best time to post on LinkedIn?",
        answer:
          "There's no universal answer. Check your own analytics for when your audience engages most — it varies wildly by industry, country, and role. Tuesday to Thursday mornings work for most B2B audiences, but your peak might be Sunday night if you serve founders.",
      },
      {
        question: "Why do some posts get 0 views?",
        answer:
          "Three common causes: the spam classifier flagged the post (hashtag stuffing, engagement bait, or AI-obvious patterns), the seed audience didn't engage in the first hour, or your historical engagement rate is so low the algorithm isn't testing you with enough people. Fix the post pattern, then the timing, then the consistency.",
      },
      {
        question: "Do comments or likes matter more?",
        answer:
          "Comments dominate. A single substantive comment is worth more than 10 likes. A reciprocal thread where the original commenter replies again is worth much more than a one-shot comment. The algorithm heavily weights dialogue over passive reactions.",
      },
      {
        question: "Does LinkedIn penalize AI-generated content?",
        answer:
          "LinkedIn doesn't ban AI posts, but it downranks generic AI patterns: over-listed content, boilerplate openers, hollow 'leadership' advice, and obvious ChatGPT structure. Human specifics — names, numbers, unexpected opinions — are what gets rewarded regardless of whether AI helped draft it.",
      },
      {
        question: "What counts as 'dwell time' on LinkedIn?",
        answer:
          "How long someone pauses on your post before scrolling past. Clicking 'See more' is the strongest proxy. Long posts that keep attention beat short posts that get a skim. This is measured silently — you can't see it directly, but it drives whether your post moves to the next distribution phase.",
      },
      {
        question: "How long does a LinkedIn post keep earning reach?",
        answer:
          "Most posts peak within 24 hours and decay fast. Viral posts can keep accruing impressions for 48 to 72 hours. A very small subset — highly shareable evergreen content — keep earning engagement for weeks, but these are rare.",
      },
    ],
    aboutAlgorithmLabel: "About the LinkedIn algorithm",
    internalLinks: [
      { label: "LinkedIn Post Ideas", href: "/linkedin-post-ideas" },
      { label: "LinkedIn Post Examples", href: "/linkedin-post-examples" },
      { label: "AI LinkedIn Post Generator", href: "/ai-linkedin-post-generator" },
      { label: "Write a LinkedIn Post", href: "/write-linkedin-post" },
      { label: "Sign Up Free", href: "/signup" },
    ],
    exploreMore: "More resources",
    finalCta: {
      title: "Understand the algorithm. Outsource the writing.",
      subtitle:
        "Posty drafts posts calibrated for the exact signals on this page — hooks for dwell time, structure for comments, tone for your niche. Generate your first post free.",
      button: "Start writing better posts",
    },
  },

  fr: {
    meta: {
      title: "Algorithme LinkedIn 2026 : Comment il fonctionne vraiment | Posty",
      description:
        "Comment l'algorithme LinkedIn classe les posts en 2026 — les 4 phases de distribution, les 5 signaux clés, ce qui a changé cette année et 7 tactiques qui fonctionnent vraiment.",
    },
    breadcrumb: "Algorithme LinkedIn",
    badge: "Guide algorithme 2026",
    heroTitle: "Comment fonctionne l'",
    heroTitleHighlight: "algorithme LinkedIn",
    heroSubtitle:
      "LinkedIn ne publie pas son code de classement, mais une décennie de blog posts techniques, de brevets et d'expériences convergentes de créateurs permettent de cerner son vrai fonctionnement. Voici la version pratique, sans bla-bla.",
    ctaPrimary: "Écrire de meilleurs posts avec l'IA",
    ctaSecondary: "Voir le détail",
    tldr: {
      label: "TL;DR",
      body: "LinkedIn note chaque post en 4 phases : contrôle qualité, test sur une audience restreinte, évaluation de l'engagement, puis distribution virale si les signaux sont forts. Les signaux les plus importants — dans l'ordre — sont les commentaires pertinents, le dwell time, la cohérence thématique, l'autorité du créateur et la force des connexions. Le reste, c'est du bruit.",
    },
    phasesSection: {
      title: "Les 4 phases de distribution",
      subtitle:
        "Ton post passe par 4 checkpoints automatiques avant d'atteindre une large audience. Comprendre chacun t'indique où tu perds vraiment de la portée.",
      phases: [
        {
          title: "Contrôle qualité (filtre anti-spam)",
          description:
            "Dans les secondes qui suivent la publication, LinkedIn passe le post dans des classifieurs qui détectent le spam, le contenu low-quality et les violations de règles. Trop de hashtags, liens externes sans contexte, engagement bait générique ou patterns trop IA sont déclassés ici — souvent silencieusement.",
          outcomeLabel: "Résultat",
          outcome: "Les posts low-quality sont plafonnés avant même le début de la distribution.",
        },
        {
          title: "Test sur audience seed",
          description:
            "Le post est montré à une petite partie de ton réseau (50 à quelques centaines de personnes) — sélectionnée selon la force des connexions, l'engagement passé avec toi, et la pertinence thématique. Les 60 premières minutes de cette fenêtre sont critiques.",
          outcomeLabel: "Résultat",
          outcome: "Si le taux d'engagement dépasse un seuil, le post passe à la phase suivante.",
        },
        {
          title: "Évaluation de l'engagement",
          description:
            "LinkedIn pondère ce qui s'est passé pendant le test : ratio commentaires/vues, dwell time (combien de temps les gens s'arrêtent), volume de partages, autorité des profils qui ont interagi. Un commentaire pertinent d'un créateur actif vaut exponentiellement plus qu'un like passif d'un compte dormant.",
          outcomeLabel: "Résultat",
          outcome: "Des signaux forts déclenchent l'extension au feed plus large.",
        },
        {
          title: "Distribution virale",
          description:
            "Si le post passe le seuil, LinkedIn le pousse aux connexions de 2e degré et au-delà — utilisateurs intéressés par le sujet, pas seulement ton réseau direct. C'est là que la portée est multipliée par 10 à 100. Les posts viraux peuvent continuer à générer des impressions pendant 48 à 72 h.",
          outcomeLabel: "Résultat",
          outcome: "La portée se compose jusqu'à ce que l'engagement décroisse.",
        },
      ],
    },
    signalsSection: {
      title: "Les 5 signaux qui font vraiment la différence",
      subtitle:
        "LinkedIn considère des dizaines de facteurs. En pratique, ces cinq expliquent 90% de pourquoi un post décolle et un autre non.",
      signals: [
        {
          emoji: "\u{1F4AC}",
          title: "Commentaires pertinents",
          description:
            "Pas des emojis, pas des réponses d'un mot. Des commentaires substantiels — surtout ceux qui déclenchent un échange — signalent que ton contenu vaut qu'on s'arrête. C'est le signal positif le plus lourd à lui seul.",
          weightLabel: "Poids max",
        },
        {
          emoji: "\u{23F1}\u{FE0F}",
          title: "Dwell time",
          description:
            "Combien de temps les gens arrêtent de scroller sur ton post. Les posts longs qui retiennent l'attention battent les posts courts qui se font survoler. Le clic sur « Voir plus » est un proxy mesurable.",
          weightLabel: "Élevé",
        },
        {
          emoji: "\u{1F3AF}",
          title: "Pertinence du contenu",
          description:
            "L'algo fait matcher ton sujet avec les intérêts inférés de chaque viewer. Les posts qui restent dans une niche cohérente construisent une autorité thématique et sont ensuite montrés à des audiences plus serrées et plus pertinentes.",
          weightLabel: "Élevé",
        },
        {
          emoji: "\u{1F3C6}",
          title: "Autorité du créateur",
          description:
            "LinkedIn track ton taux d'engagement historique, ta fréquence de publication, la qualité de ton réseau. Les créateurs constants avec un bon engagement bénéficient d'un boost de base sur chaque post.",
          weightLabel: "Moyen",
        },
        {
          emoji: "\u{1F517}",
          title: "Force des connexions",
          description:
            "Pondérée par les interactions passées — les gens qui ont déjà liké ou commenté tes posts sont massivement priorisés dans l'audience seed. Se reconnecter à des contacts dormants te coûte de l'engagement en fenêtre précoce.",
          weightLabel: "Moyen",
        },
      ],
    },
    recentChanges: {
      title: "Ce qui a changé en 2026",
      subtitle:
        "LinkedIn retune sa distribution agressivement. Quatre changements cette année ont le plus d'impact sur ce que tu devrais vraiment poster.",
      changes: [
        {
          label: "T1 2026",
          title: "Pénalité sur les liens externes assouplie",
          description:
            "Les posts avec liens externes ne sont plus auto-plafonnés. LinkedIn a commencé à récompenser les liens quand le post lui-même obtient un bon dwell time — en pratique, il faut que le lien soit mérité par le contenu.",
        },
        {
          label: "T2 2026",
          title: "La vidéo prioritaire sur les sujets pro",
          description:
            "Les vidéos verticales courtes (moins de 90 s) voient 2 à 3x la portée sur les sujets B2B/carrière vs le texte seul. Sous-titres et hook fort dans les 3 premières secondes comptent plus que la qualité de production.",
        },
        {
          label: "Continu",
          title: "Détection du contenu IA-générique",
          description:
            "Les posts avec des patterns IA génériques (listes à rallonge, intros stéréotypées, thought leadership creux) sont de plus en plus déclassés. Le remède : la spécificité — vrais noms, vrais chiffres, vraie expérience vécue.",
        },
        {
          label: "Continu",
          title: "Pondération sur la qualité des commentaires",
          description:
            "Les commentaires de plus de 12 mots comptent significativement plus que les courts. Les boucles de commentaires réciproques (pods) sont toujours détectables et dévaluées — c'est la profondeur organique qui gagne.",
        },
      ],
    },
    tipsSection: {
      title: "7 tactiques qui fonctionnent en 2026",
      subtitle:
        "Pas des hacks. Les patterns qui corrèlent avec la portée sur des milliers de posts analysés en 2025 et 2026.",
      tips: [
        {
          title: "Gagne les 60 premières minutes",
          description:
            "Poste quand ton audience cœur est vraiment en ligne. L'engagement que ton post obtient dans la 1re heure détermine s'il passe le test d'audience seed. Regarde tes analytics pour ta fenêtre peak perso.",
        },
        {
          title: "Accroche dans les 2 premières lignes",
          description:
            "Ce sont les seules visibles avant « Voir plus ». Des intros spécifiques, inattendues ou légèrement à contre-courant déclenchent le clic — que LinkedIn mesure comme dwell time.",
        },
        {
          title: "Déclenche des commentaires, pas juste des likes",
          description:
            "Termine tes posts par une question qui demande un avis, pas un oui/non. Réponds à chaque commentaire dans les 2 premières heures pour maintenir le thread vivant — la profondeur du thread est un signal fort.",
        },
        {
          title: "Publie 3 à 5 fois par semaine, de façon constante",
          description:
            "L'autorité de créateur se compose. Poster lundi-mercredi-vendredi pendant 3 mois bat 20 posts en semaine 1 puis silence. LinkedIn récompense les créateurs qui sont là.",
        },
        {
          title: "Reste dans une niche claire pendant 6 mois",
          description:
            "Sauter entre sujets sans lien reset ton autorité thématique. Choisis une ligne étroite et domine-la — l'algo finira par pousser tes posts aux gens qui s'y intéressent.",
        },
        {
          title: "Utilise les formats natifs, pas les reposts",
          description:
            "Texte original, vidéo native, document natif, sondage natif — tous surperforment les partages de lien. Les documents (carrousels PDF) ont notamment un dwell time moyen très élevé.",
        },
        {
          title: "Écris comme un humain, pas comme LinkedIn",
          description:
            "Les posts « leadership » formulaires, la motivation creuse et la structure ChatGPT évidente sont déclassés. Les histoires spécifiques, les opinions inattendues et les expériences uniques sont récompensées.",
        },
      ],
    },
    mythsSection: {
      title: "Mythes courants, vérifiés",
      subtitle:
        "Ces affirmations reviennent chaque année. Aucune ne tient face aux données réelles.",
      mythLabel: "Mythe",
      realityLabel: "Réalité",
      myths: [
        {
          claim: "Plus de hashtags = plus de portée",
          reality:
            "3 à 5 hashtags pertinents, c'est ok. Au-delà, le classifieur spam se déclenche et plafonne la distribution. Les hashtags sont un petit signal de pertinence, pas un multiplicateur de portée.",
        },
        {
          claim: "Les liens externes tuent ta portée",
          reality:
            "Plus maintenant. Depuis T1 2026, LinkedIn mesure le dwell time avant de décider de plafonner. Un post bien écrit avec un lien contextuel surperforme un post sans lien sans substance.",
        },
        {
          claim: "Il y a un meilleur moment pour poster",
          reality:
            "Il y a un meilleur moment pour TON audience. Les conseils génériques « 8h mardi » sont sans valeur — regarde quand tes connexions sont vraiment en ligne et engagées, ça varie énormément par industrie.",
        },
        {
          claim: "Les pods d'engagement marchent",
          reality:
            "Ils marchaient. Le classifieur de LinkedIn détecte maintenant les cross-engagements répétés entre les mêmes comptes et dévalue le boost. L'engagement réel scale, l'artificiel non.",
        },
        {
          claim: "Les posts avec images gagnent toujours",
          reality:
            "Les posts en texte seul surperforment souvent les posts avec images stock. Ce qui compte c'est le dwell time — si l'image n'apporte pas de signal, elle ralentit juste la lecture et réduit l'efficacité de ton hook.",
        },
      ],
    },
    aiCta: {
      title: "Arrête de deviner. Écris des posts que l'algo récompense vraiment.",
      subtitle:
        "Posty est entraîné sur des milliers de posts qui ont cartonné en 2025 et 2026. Il génère hook, structure et CTA calibrés pour les signaux ci-dessus — en secondes.",
      button: "Essayer Posty gratuitement",
    },
    faqTitle: "FAQ algorithme LinkedIn",
    faq: [
      {
        question: "À quelle fréquence poster sur LinkedIn pour l'algo ?",
        answer:
          "3 à 5 fois par semaine, c'est le sweet spot pour la plupart des créateurs. Poster tous les jours peut marcher si la qualité tient — mais un post pensé bat cinq posts bâclés à chaque fois. La constance sur des mois compte plus que la fréquence brute.",
      },
      {
        question: "L'algorithme LinkedIn pénalise-t-il les liens externes ?",
        answer:
          "Plus depuis début 2026. Les liens externes plafonnaient automatiquement la portée, mais LinkedIn mesure maintenant le dwell time sur le post lui-même avant de décider. Si ton post capte l'attention, le lien est embarqué avec. Si le post est creux, c'est le lien qu'on blâme mais le vrai problème c'est le contenu.",
      },
      {
        question: "Quel est le meilleur moment pour poster sur LinkedIn ?",
        answer:
          "Pas de réponse universelle. Regarde tes propres analytics pour voir quand ton audience engage le plus — ça varie énormément par industrie, pays et rôle. Le créneau mardi-jeudi matin marche pour la plupart des audiences B2B, mais ton peak peut être dimanche soir si tu vises des fondateurs.",
      },
      {
        question: "Pourquoi certains posts font 0 vue ?",
        answer:
          "Trois causes communes : le classifieur spam a flaggé le post (hashtag stuffing, engagement bait, patterns trop IA), l'audience seed n'a pas engagé dans la 1re heure, ou ton taux d'engagement historique est tellement bas que l'algo ne te teste pas avec assez de monde. Corrige le pattern du post, puis le timing, puis la constance.",
      },
      {
        question: "Commentaires ou likes, qu'est-ce qui compte le plus ?",
        answer:
          "Les commentaires dominent largement. Un seul commentaire substantiel vaut plus que 10 likes. Un thread réciproque où le commentateur d'origine re-répond vaut bien plus qu'un commentaire one-shot. L'algo pondère fortement le dialogue vs les réactions passives.",
      },
      {
        question: "LinkedIn pénalise-t-il le contenu généré par IA ?",
        answer:
          "LinkedIn ne bannit pas les posts IA, mais déclasse les patterns IA génériques : contenu sur-listé, intros stéréotypées, conseils « leadership » creux et structure ChatGPT évidente. Les spécificités humaines — noms, chiffres, opinions inattendues — sont récompensées, peu importe si l'IA a aidé à rédiger.",
      },
      {
        question: "C'est quoi le « dwell time » sur LinkedIn ?",
        answer:
          "Combien de temps quelqu'un s'arrête sur ton post avant de scroller plus loin. Cliquer sur « Voir plus » est le plus fort proxy. Les posts longs qui retiennent l'attention battent les posts courts qui se font survoler. C'est mesuré en silence — tu ne le vois pas directement, mais ça détermine si ton post passe à la phase de distribution suivante.",
      },
      {
        question: "Combien de temps un post LinkedIn continue de générer de la portée ?",
        answer:
          "La plupart des posts peakent en 24 h et décroissent vite. Les posts viraux peuvent continuer à accumuler des impressions pendant 48 à 72 h. Une toute petite partie — contenu evergreen très partageable — continue de gagner de l'engagement pendant des semaines, mais c'est rare.",
      },
    ],
    aboutAlgorithmLabel: "À propos de l'algorithme LinkedIn",
    internalLinks: [
      { label: "Idées de posts LinkedIn", href: "/linkedin-post-ideas" },
      { label: "Exemples de posts LinkedIn", href: "/linkedin-post-examples" },
      { label: "Générateur de posts LinkedIn IA", href: "/ai-linkedin-post-generator" },
      { label: "Écrire un post LinkedIn", href: "/write-linkedin-post" },
      { label: "Inscription gratuite", href: "/signup" },
    ],
    exploreMore: "Plus de ressources",
    finalCta: {
      title: "Comprends l'algo. Délègue l'écriture.",
      subtitle:
        "Posty rédige des posts calibrés pour les signaux exacts de cette page — hooks pour le dwell time, structure pour les commentaires, ton pour ta niche. Génère ton premier post gratuitement.",
      button: "Commencer à écrire mieux",
    },
  },
};
