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

  de: {
      meta: {
        title: "LinkedIn-Algorithmus 2026: Wie er wirklich funktioniert | Posty",
        description: 
          "Wie der LinkedIn-Algorithmus 2026 Beiträge rankt — die 4 Verteilungsphasen, 5 Schlüsselsignale, die Änderungen dieses Jahres und 7 bewährte Taktiken, die noch funktionieren.",
      },
      breadcrumb: "LinkedIn-Algorithmus",
      badge: "Algorithmus-Guide 2026",
      heroTitle: "Wie der",
      heroTitleHighlight: "LinkedIn-Algorithmus",
      heroSubtitle: 
        "LinkedIn veröffentlicht seinen Ranking-Code nicht, aber ein Jahrzehnt technischer Blogposts, Patentanmeldungen und konsistente Creator-Experimente haben sein tatsächliches Funktionieren identifiziert. Hier die praktische Version ohne Bla-Bla.",
      ctaPrimary: "Bessere Beiträge mit KI schreiben",
      ctaSecondary: "Zur Aufschlüsselung",
      tldr: {
        label: "TL;DR",
        body: 
          "LinkedIn bewertet jeden Beitrag in 4 Phasen: Qualitätsprüfung, Test auf kleinem Seed-Publikum, Engagement-Bewertung, dann virale Verteilung bei starken Signalen. Die wichtigsten Signale — in Reihenfolge — sind aussagekräftige Kommentare, Dwell Time, thematische Kohärenz, Creator-Autorität und Verbindungsstärke. Alles andere ist Rauschen.",
      },
      phasesSection: {
        title: "Die 4 Verteilungsphasen",
        subtitle: 
          "Dein Beitrag durchläuft 4 automatische Checkpoints, bevor er ein breites Publikum erreicht. Jeden zu verstehen zeigt dir, wo du wirklich Reichweite verlierst.",
        phases: [
          {
            title: "Qualitätsprüfung (Spam-Filter)",
            description: 
              "Sekunden nach Veröffentlichung lässt LinkedIn den Beitrag durch Klassifikatoren laufen, die Spam, Low-Quality oder Regelverstöße markieren. Zu viele Hashtags, Externlinks ohne Kontext, generische Engagement-Köder oder KI-offensichtliche Muster werden hier herabgestuft — oft stillschweigend.",
            outcomeLabel: "Ergebnis",
            outcome: "Low-Quality-Beiträge werden vor Verteilungsbeginn begrenzt.",
          },
          {
            title: "Seed-Publikum-Test",
            description: 
              "Der Beitrag wird einem kleinen Teil deines Netzwerks gezeigt (50 bis einige hundert Personen) — ausgewählt nach Verbindungsstärke, vergangenem Engagement und thematischer Relevanz. Die ersten 60 Minuten dieses Testfensters sind kritisch.",
            outcomeLabel: "Ergebnis",
            outcome: "Übersteigt die Engagement-Rate einen Schwellwert, geht der Beitrag weiter.",
          },
          {
            title: "Engagement-Bewertung",
            description: 
              "LinkedIn gewichtet, was während des Seed-Tests passiert ist: Kommentar-zu-Views-Verhältnis, Dwell Time, Share-Volumen, Autorität der interagierenden Profile. Ein aussagekräftiger Kommentar eines aktiven Creators ist exponentiell mehr wert als ein passiver Like von einem inaktiven Konto.",
            outcomeLabel: "Ergebnis",
            outcome: "Starke Signale lösen die Ausweitung auf den breiteren Feed aus.",
          },
          {
            title: "Virale Verteilung",
            description: 
              "Übersteigt der Beitrag den Schwellwert, pusht LinkedIn ihn an Verbindungen zweiten Grades und darüber hinaus — Nutzer, die sich für das Thema interessieren, nicht nur dein direktes Netzwerk. Hier multipliziert sich die Reichweite um das 10- bis 100-fache. Virale Beiträge können 48 bis 72 Stunden lang Impressionen sammeln.",
            outcomeLabel: "Ergebnis",
            outcome: "Die Reichweite steigt bis Engagement abklingt.",
          },
        ],
      },
      signalsSection: {
        title: "Die 5 Signale, die wirklich den Unterschied machen",
        subtitle: 
          "LinkedIn berücksichtigt Dutzende Faktoren. In der Praxis erklären diese fünf 90% davon, warum ein Beitrag abhebt und ein anderer nicht.",
        signals: [
          {
            emoji: "💬",
            title: "Aussagekräftige Kommentare",
            description: 
              "Keine Emojis, keine Ein-Wort-Antworten. Substanzielle Kommentare — besonders solche, die einen Austausch auslösen — signalisieren, dass dein Inhalt eine Pause wert ist. Das einzige schwerste positive Signal.",
            weightLabel: "Höchstes Gewicht",
          },
          {
            emoji: "⏱️",
            title: "Dwell Time",
            description: 
              "Wie lange Leute aufhören zu scrollen bei deinem Beitrag. Lange Beiträge, die Aufmerksamkeit halten, schlagen kurze Beiträge, die nur überflogen werden. Der Klick auf „Mehr anzeigen“ ist ein messbarer Proxy.",
            weightLabel: "Hoch",
          },
          {
            emoji: "🎯",
            title: "Thematische Relevanz",
            description: 
              "Der Algo matcht dein Thema mit den inferierten Interessen jedes Viewers. Beiträge, die in einer kohärenten Nische bleiben, bauen thematische Autorität auf und werden dann engeren, relevanteren Zielgruppen gezeigt.",
            weightLabel: "Hoch",
          },
          {
            emoji: "🏆",
            title: "Creator-Autorität",
            description: 
              "LinkedIn trackt deine historische Engagement-Rate, Posting-Frequenz, Netzwerkqualität. Konstante Creator mit solidem Engagement bekommen einen Basisboost bei jedem Beitrag.",
            weightLabel: "Mittel",
          },
          {
            emoji: "🔗",
            title: "Verbindungsstärke",
            description: 
              "Gewichtet nach vergangenen Interaktionen — Menschen, die deine Beiträge schon geliked oder kommentiert haben, werden massiv priorisiert im Seed-Publikum. Reaktivierung dormanter Kontakte kostet dich Frühfenster-Engagement.",
            weightLabel: "Mittel",
          },
        ],
      },
      recentChanges: {
        title: "Was sich 2026 geändert hat",
        subtitle: 
          "LinkedIn justiert die Verteilung aggressiv neu. Vier Änderungen dieses Jahres haben den größten Impact auf das, was du wirklich posten solltest.",
        changes: [
          {
            label: "Q1 2026",
            title: "Externlink-Strafe gelockert",
            description: 
              "Beiträge mit Externlinks werden nicht mehr automatisch begrenzt. LinkedIn begann, Links zu belohnen, wenn der Beitrag selbst gute Dwell Time erzielt — in der Praxis muss der Link vom Inhalt verdient werden.",
          },
          {
            label: "Q2 2026",
            title: "Video priorisiert bei Pro-Themen",
            description: 
              "Kurze vertikale Videos (unter 90 Sek) sehen 2 bis 3x Reichweite bei B2B/Karriere-Themen vs nur Text. Untertitel und starker Hook in den ersten 3 Sekunden zählen mehr als Produktionsqualität.",
          },
          {
            label: "Laufend",
            title: "Erkennung generischer KI-Inhalte",
            description: 
              "Beiträge mit generischen KI-Mustern (übermäßige Listen, stereotype Opener, hohles Leadership-Gerede) werden zunehmend herabgestuft. Die Lösung: Spezifität — echte Namen, echte Zahlen, echt Erlebtes.",
          },
          {
            label: "Laufend",
            title: "Gewichtung der Kommentar-Qualität",
            description: 
              "Kommentare über 12 Wörter zählen signifikant mehr als kurze. Reziproke Kommentar-Loops (Pods) sind weiterhin erkennbar und abgewertet — organische Tiefe gewinnt.",
          },
        ],
      },
      tipsSection: {
        title: "7 Taktiken, die 2026 funktionieren",
        subtitle: 
          "Keine Hacks. Die Muster, die mit Reichweite korrelieren über Tausende von Beiträgen aus 2025 und 2026 analysiert.",
        tips: [
          {
            title: "Gewinne die ersten 60 Minuten",
            description: 
              "Poste, wenn dein Kern-Publikum wirklich online ist. Das Engagement der ersten Stunde bestimmt, ob dein Beitrag den Seed-Test besteht. Schau in deine Analytics für dein persönliches Peak-Fenster.",
          },
          {
            title: "Hook in den ersten 2 Zeilen",
            description: 
              "Das sind die einzigen Zeilen vor „Mehr anzeigen“. Spezifische, unerwartete oder leicht konträre Opener lösen den Klick aus — den LinkedIn als Dwell Time misst.",
          },
          {
            title: "Löse Kommentare aus, nicht nur Likes",
            description: 
              "Beende Beiträge mit einer Frage, die eine Meinung erfordert, kein Ja/Nein. Beantworte jeden Kommentar in den ersten 2 Stunden, um den Thread lebendig zu halten — Thread-Tiefe ist ein starkes Signal.",
          },
          {
            title: "Poste 3 bis 5 Mal pro Woche, konstant",
            description: 
              "Creator-Autorität akkumuliert sich. Montag-Mittwoch-Freitag über 3 Monate schlägt 20 Beiträge in Woche 1 und dann Stille. LinkedIn belohnt Creator, die da sind.",
          },
          {
            title: "Bleib 6 Monate in einer klaren Nische",
            description: 
              "Zwischen unzusammenhängenden Themen springen resettet deine thematische Autorität. Wähle eine schmale Linie und dominiere sie — der Algo wird deine Beiträge schließlich Menschen zeigen, die sich dafür interessieren.",
          },
          {
            title: "Native Formate, keine Reposts",
            description: 
              "Originaltext, natives Video, natives Dokument, native Umfrage — alle übertreffen Link-Shares. Dokumente (PDF-Karussells) haben besonders hohe durchschnittliche Dwell Time.",
          },
          {
            title: "Schreib wie ein Mensch, nicht wie LinkedIn",
            description: 
              "Formelhafte „Leadership“-Beiträge, hohle Motivation und offensichtliche ChatGPT-Struktur werden herabgestuft. Spezifische Geschichten, ungewöhnliche Meinungen und einzigartige Erfahrungen werden belohnt.",
          },
        ],
      },
      mythsSection: {
        title: "Häufige Mythen, überprüft",
        subtitle: "Diese Behauptungen kommen jedes Jahr. Keine hält echten Daten stand.",
        mythLabel: "Mythos",
        realityLabel: "Realität",
        myths: [
          {
            claim: "Mehr Hashtags = mehr Reichweite",
            reality: 
              "3 bis 5 relevante Hashtags sind ok. Darüber greift der Spam-Klassifikator und begrenzt die Verteilung. Hashtags sind ein kleines Relevanzsignal, kein Reichweiten-Multiplikator.",
          },
          {
            claim: "Externlinks töten deine Reichweite",
            reality: 
              "Nicht mehr. Seit Q1 2026 misst LinkedIn Dwell Time vor der Entscheidung zur Begrenzung. Ein gut geschriebener Beitrag mit einem kontextuellen Link übertrifft einen linklosen Beitrag ohne Substanz.",
          },
          {
            claim: "Es gibt einen besten Zeitpunkt zum Posten",
            reality: 
              "Es gibt einen besten Zeitpunkt für DEIN Publikum. Generische Ratschläge „8 Uhr Dienstag“ sind wertlos — schau, wann deine Verbindungen wirklich online und engagiert sind, das variiert stark nach Branche.",
          },
          {
            claim: "Engagement-Pods funktionieren",
            reality: 
              "Funktionierten. Der Klassifikator von LinkedIn erkennt jetzt wiederholte Cross-Engagements zwischen denselben Konten und wertet den Boost ab. Echtes Engagement skaliert, künstliches nicht.",
          },
          {
            claim: "Beiträge mit Bildern gewinnen immer",
            reality: 
              "Nur-Text-Beiträge übertreffen oft Beiträge mit Stock-Bildern. Wichtig ist die Dwell Time — wenn das Bild kein Signal hinzufügt, verlangsamt es nur das Lesen und reduziert die Hook-Effektivität.",
          },
        ],
      },
      aiCta: {
        title: "Hör auf zu raten. Schreib Beiträge, die der Algo wirklich belohnt.",
        subtitle: 
          "Posty ist trainiert auf Tausenden von Beiträgen, die 2025 und 2026 viral gingen. Er generiert Hook, Struktur und CTA kalibriert für die obigen Signale — in Sekunden.",
        button: "Posty kostenlos testen",
      },
      faqTitle: "LinkedIn-Algorithmus FAQ",
      faq: [
        {
          question: "Wie oft sollte ich für den Algorithmus auf LinkedIn posten?",
          answer: 
            "3 bis 5 Mal pro Woche ist der Sweet Spot für die meisten Creator. Tägliches Posten kann funktionieren, wenn die Qualität hält — aber ein durchdachter Beitrag schlägt fünf überhastete jedes Mal. Konstanz über Monate zählt mehr als reine Frequenz.",
        },
        {
          question: "Bestraft der LinkedIn-Algorithmus Externlinks?",
          answer: 
            "Nicht mehr seit Anfang 2026. Externlinks begrenzten früher automatisch die Reichweite, aber LinkedIn misst jetzt die Dwell Time auf dem Beitrag selbst vor der Entscheidung. Wenn dein Beitrag Aufmerksamkeit verdient, wird der Link mitgenommen.",
        },
        {
          question: "Wann ist die beste Zeit zum Posten auf LinkedIn?",
          answer: 
            "Es gibt keine universelle Antwort. Schau in deine Analytics, wann dein Publikum am meisten engagiert — variiert stark nach Branche, Land und Rolle. Dienstag bis Donnerstag morgens funktioniert für die meisten B2B-Zielgruppen.",
        },
        {
          question: "Warum bekommen manche Beiträge 0 Views?",
          answer: 
            "Drei häufige Ursachen: der Spam-Klassifikator hat den Beitrag markiert (Hashtag-Stuffing, Engagement-Köder, KI-offensichtliche Muster), das Seed-Publikum hat in der ersten Stunde nicht engagiert, oder deine historische Engagement-Rate ist so niedrig, dass der Algo dich nicht mit genug Leuten testet.",
        },
        {
          question: "Zählen Kommentare oder Likes mehr?",
          answer: 
            "Kommentare dominieren. Ein einzelner substanzieller Kommentar ist mehr wert als 10 Likes. Ein reziproker Thread, in dem der ursprüngliche Kommentator wieder antwortet, ist viel mehr wert als ein einmaliger Kommentar.",
        },
        {
          question: "Bestraft LinkedIn KI-generierte Inhalte?",
          answer: 
            "LinkedIn verbietet keine KI-Beiträge, aber stuft generische KI-Muster herab: überlistete Inhalte, stereotype Opener, hohle „Leadership“-Ratschläge und offensichtliche ChatGPT-Struktur. Menschliche Spezifika — Namen, Zahlen, unerwartete Meinungen — werden belohnt.",
        },
        {
          question: "Was zählt als „Dwell Time“ auf LinkedIn?",
          answer: 
            "Wie lange jemand vor deinem Beitrag pausiert, bevor er weiter scrollt. Das Klicken auf „Mehr anzeigen“ ist der stärkste Proxy. Lange Beiträge, die Aufmerksamkeit halten, schlagen kurze Beiträge, die nur überflogen werden.",
        },
        {
          question: "Wie lange verdient ein LinkedIn-Beitrag weiterhin Reichweite?",
          answer: 
            "Die meisten Beiträge peaken innerhalb 24 Stunden und verfallen schnell. Virale Beiträge können 48 bis 72 Stunden lang Impressionen sammeln. Eine sehr kleine Untergruppe — hochteilbarer Evergreen-Inhalt — verdient wochenlang Engagement, aber selten.",
        },
      ],
      aboutAlgorithmLabel: "Über den LinkedIn-Algorithmus",
      internalLinks: [
        {
          label: "LinkedIn-Beitragsideen",
          href: "/linkedin-post-ideas",
        },
        {
          label: "LinkedIn-Beitragsbeispiele",
          href: "/linkedin-post-examples",
        },
        {
          label: "LinkedIn-Beitragsgenerator",
          href: "/ai-linkedin-post-generator",
        },
        {
          label: "LinkedIn-Beitrag schreiben",
          href: "/write-linkedin-post",
        },
        {
          label: "Kostenlos anmelden",
          href: "/signup",
        },
      ],
      exploreMore: "Weitere Ressourcen",
      finalCta: {
        title: "Verstehe den Algo. Delegiere das Schreiben.",
        subtitle: 
          "Posty entwirft Beiträge kalibriert für die exakten Signale auf dieser Seite — Hooks für Dwell Time, Struktur für Kommentare, Ton für deine Nische. Generiere deinen ersten Beitrag kostenlos.",
        button: "Besser schreiben starten",
      },
    },

  es: {
      meta: {
        title: "Algoritmo de LinkedIn 2026: Cómo funciona realmente | Posty",
        description: 
          "Cómo el algoritmo de LinkedIn clasifica las publicaciones en 2026 — las 4 fases de distribución, 5 señales clave, qué cambió este año y 7 tácticas probadas que aún funcionan.",
      },
      breadcrumb: "Algoritmo de LinkedIn",
      badge: "Guía del algoritmo 2026",
      heroTitle: "Cómo funciona el",
      heroTitleHighlight: "algoritmo de LinkedIn",
      heroSubtitle: 
        "LinkedIn no publica su código de clasificación, pero una década de publicaciones de ingeniería, patentes y experimentos consistentes de creadores permiten identificar cómo funciona realmente. Aquí la versión práctica, sin adornos.",
      ctaPrimary: "Escribir mejores posts con IA",
      ctaSecondary: "Ver el desglose",
      tldr: {
        label: "TL;DR",
        body: 
          "LinkedIn puntúa cada post en 4 fases: control de calidad, prueba en audiencia seed, evaluación de engagement, luego distribución viral si las señales son fuertes. Las señales más importantes — en orden — son comentarios significativos, dwell time, relevancia del contenido, autoridad del creador y fuerza de conexión. Lo demás es ruido.",
      },
      phasesSection: {
        title: "Las 4 fases de distribución",
        subtitle: 
          "Tu post pasa por 4 checkpoints automáticos antes de alcanzar una gran audiencia. Entender cada uno te indica dónde pierdes alcance realmente.",
        phases: [
          {
            title: "Control de calidad (filtro anti-spam)",
            description: 
              "En segundos tras la publicación, LinkedIn pasa el post por clasificadores que marcan spam, baja calidad o violaciones. Demasiados hashtags, enlaces sin contexto, engagement bait genérico o patrones IA obvios son degradados aquí — a menudo silenciosamente.",
            outcomeLabel: "Resultado",
            outcome: "Los posts de baja calidad son limitados antes incluso de iniciar la distribución.",
          },
          {
            title: "Prueba en audiencia seed",
            description: 
              "El post se muestra a una pequeña parte de tu red (50 a unos cientos de personas) — seleccionada por fuerza de conexión, engagement pasado y relevancia temática. Los primeros 60 minutos de esta ventana son críticos.",
            outcomeLabel: "Resultado",
            outcome: "Si el engagement supera un umbral, el post avanza.",
          },
          {
            title: "Evaluación del engagement",
            description: 
              "LinkedIn pondera lo ocurrido durante la prueba: ratio comentarios/vistas, dwell time, volumen de shares, autoridad de los perfiles que interactuaron. Un comentario significativo de un creador activo vale exponencialmente más que un like pasivo.",
            outcomeLabel: "Resultado",
            outcome: "Señales fuertes activan la expansión al feed más amplio.",
          },
          {
            title: "Distribución viral",
            description: 
              "Si el post supera el umbral, LinkedIn lo empuja a conexiones de segundo grado y más allá — usuarios interesados en el tema, no solo tu red. Aquí el alcance se multiplica 10x a 100x. Los posts virales pueden seguir generando impresiones 48 a 72h.",
            outcomeLabel: "Resultado",
            outcome: "El alcance se compone hasta que decae el engagement.",
          },
        ],
      },
      signalsSection: {
        title: "Las 5 señales que realmente mueven la aguja",
        subtitle: 
          "LinkedIn considera docenas de factores. En la práctica, estas cinco explican el 90% de por qué un post despega y otro no.",
        signals: [
          {
            emoji: "💬",
            title: "Comentarios significativos",
            description: 
              "No emojis, no respuestas de una palabra. Comentarios sustanciales — especialmente los que generan diálogo — indican que tu contenido vale una pausa. La señal positiva individual más pesada.",
            weightLabel: "Peso máximo",
          },
          {
            emoji: "⏱️",
            title: "Dwell time",
            description: 
              "Cuánto tiempo la gente deja de scrollear en tu post. Los posts largos que retienen la atención vencen a los cortos que solo se ojean. El clic en «Ver más» es un proxy medible.",
            weightLabel: "Alta",
          },
          {
            emoji: "🎯",
            title: "Relevancia del contenido",
            description: 
              "El algoritmo empareja tu tema con los intereses inferidos de cada viewer. Los posts que permanecen en una nicho coherente construyen autoridad temática y son mostrados a audiencias más relevantes.",
            weightLabel: "Alta",
          },
          {
            emoji: "🏆",
            title: "Autoridad del creador",
            description: 
              "LinkedIn rastrea tu tasa de engagement histórica, frecuencia de publicación, calidad de red. Los creadores consistentes con buen engagement reciben un boost base en cada post.",
            weightLabel: "Media",
          },
          {
            emoji: "🔗",
            title: "Fuerza de conexión",
            description: 
              "Ponderada por interacciones pasadas — las personas que ya han dado like o comentado tus posts son altamente priorizadas en la audiencia seed. Reconectar con contactos dormantes te cuesta engagement en la ventana temprana.",
            weightLabel: "Media",
          },
        ],
      },
      recentChanges: {
        title: "Qué cambió en 2026",
        subtitle: 
          "LinkedIn ha estado reajustando la distribución agresivamente. Cuatro cambios este año tienen el mayor impacto en lo que deberías publicar.",
        changes: [
          {
            label: "T1 2026",
            title: "Penalización a enlaces externos suavizada",
            description: 
              "Los posts con enlaces externos ya no son auto-limitados. LinkedIn empezó a recompensar los enlaces cuando el post obtiene buen dwell time — efectivamente requiriendo que el enlace sea merecido por el contenido.",
          },
          {
            label: "T2 2026",
            title: "Video prioritario en temas profesionales",
            description: 
              "Videos verticales cortos (menos de 90s) ven 2 a 3x el alcance en temas B2B/carrera vs solo texto. Subtítulos y hook fuerte en los primeros 3 segundos importan más que calidad de producción.",
          },
          {
            label: "Continuo",
            title: "Detección de contenido IA-genérico",
            description: 
              "Posts con patrones IA genéricos (listas excesivas, openers estereotipados, thought leadership hueco) son crecientemente degradados. La solución: especificidad — nombres reales, números reales, experiencia vivida real.",
          },
          {
            label: "Continuo",
            title: "Ponderación de calidad de comentarios",
            description: 
              "Comentarios de más de 12 palabras cuentan significativamente más que los cortos. Los bucles recíprocos (pods) siguen siendo detectables y devaluados — gana la profundidad orgánica.",
          },
        ],
      },
      tipsSection: {
        title: "7 tácticas que aún funcionan en 2026",
        subtitle: 
          "No son hacks. Los patrones que correlacionan con alcance en miles de posts analizados en 2025 y 2026.",
        tips: [
          {
            title: "Gana los primeros 60 minutos",
            description: 
              "Publica cuando tu audiencia núcleo está realmente online. El engagement de la primera hora determina si tu post escapa del test de audiencia seed. Revisa tus analytics para tu ventana peak personal.",
          },
          {
            title: "Hook en las primeras 2 líneas",
            description: 
              "Son las únicas visibles antes de «Ver más». Openers específicos, inesperados o ligeramente contrarios disparan el clic — que LinkedIn mide como dwell time.",
          },
          {
            title: "Dispara comentarios, no solo likes",
            description: 
              "Termina los posts con una pregunta que requiere opinión, no sí/no. Responde a cada comentario en las primeras 2 horas para mantener el thread vivo — la profundidad del thread es señal fuerte.",
          },
          {
            title: "Publica 3 a 5 veces por semana, consistentemente",
            description: 
              "La autoridad del creador se acumula. Publicar lunes-miércoles-viernes durante 3 meses supera a 20 posts en la semana 1 y silencio después. LinkedIn recompensa a los creadores que aparecen.",
          },
          {
            title: "Mantente en un nicho claro durante 6 meses",
            description: 
              "Saltar entre temas no relacionados resetea tu autoridad temática. Elige un carril estrecho y domínalo — el algoritmo eventualmente mostrará tus posts a gente que le interesa.",
          },
          {
            title: "Usa formatos nativos, no reposts",
            description: 
              "Texto original, video nativo, documento nativo y encuesta nativa superan a los shares de enlaces. Los documentos (carruseles PDF) tienen promedios de dwell time muy altos.",
          },
          {
            title: "Escribe como humano, no como LinkedIn",
            description: 
              "Los posts «leadership» formulaicos, la motivación vacía y la estructura ChatGPT obvia son degradados. Las historias específicas, las opiniones inusuales y las experiencias únicas son recompensadas.",
          },
        ],
      },
      mythsSection: {
        title: "Mitos comunes, verificados",
        subtitle: "Estas afirmaciones se propagan cada año. Ninguna se sostiene frente a datos reales.",
        mythLabel: "Mito",
        realityLabel: "Realidad",
        myths: [
          {
            claim: "Más hashtags = más alcance",
            reality: 
              "3 a 5 hashtags relevantes están bien. Más allá, el clasificador de spam se activa y limita la distribución. Los hashtags son una pequeña señal de relevancia, no un multiplicador de alcance.",
          },
          {
            claim: "Los enlaces externos matan tu alcance",
            reality: 
              "Ya no. Desde T1 2026, LinkedIn mide dwell time antes de decidir limitar. Un post bien escrito con un enlace contextual supera a un post sin enlace sin sustancia.",
          },
          {
            claim: "Hay un mejor momento para publicar",
            reality: 
              "Hay un mejor momento para TU audiencia. Los consejos genéricos «8 AM martes» son sin valor — revisa cuándo tus conexiones están realmente online y engagement, varía enormemente por industria.",
          },
          {
            claim: "Los pods de engagement funcionan",
            reality: 
              "Funcionaban. El clasificador de LinkedIn ahora detecta cross-engagement repetido entre las mismas cuentas y devalúa el boost. El engagement real escala, el artificial no.",
          },
          {
            claim: "Los posts con imágenes siempre ganan",
            reality: 
              "Los posts solo texto a menudo superan a los posts con imágenes stock. Lo que importa es el dwell time — si la imagen no aporta señal, solo ralentiza la lectura y reduce la efectividad del hook.",
          },
        ],
      },
      aiCta: {
        title: "Deja de adivinar. Escribe posts que el algoritmo realmente recompensa.",
        subtitle: 
          "Posty está entrenado con miles de posts que se volvieron virales en 2025 y 2026. Genera hook, estructura y CTA calibrados para las señales anteriores — en segundos.",
        button: "Probar Posty gratis",
      },
      faqTitle: "FAQ del algoritmo de LinkedIn",
      faq: [
        {
          question: "¿Con qué frecuencia debo publicar en LinkedIn para el algoritmo?",
          answer: 
            "3 a 5 veces por semana es el sweet spot para la mayoría. Publicar diariamente puede funcionar si sostienes la calidad — pero un post pensado supera a cinco apurados siempre. La consistencia durante meses importa más que la frecuencia bruta.",
        },
        {
          question: "¿El algoritmo de LinkedIn penaliza los enlaces externos?",
          answer: 
            "No desde principios de 2026. Los enlaces externos antes limitaban automáticamente el alcance, pero LinkedIn ahora mide dwell time en el post mismo antes de decidir. Si tu post gana atención, el enlace va con él.",
        },
        {
          question: "¿Cuál es el mejor momento para publicar en LinkedIn?",
          answer: 
            "No hay respuesta universal. Revisa tus analytics para cuando tu audiencia engagement más — varía enormemente por industria, país y rol. Martes a jueves por la mañana funciona para la mayoría de audiencias B2B.",
        },
        {
          question: "¿Por qué algunos posts obtienen 0 vistas?",
          answer: 
            "Tres causas comunes: el clasificador de spam marcó el post (hashtag stuffing, engagement bait, patrones IA obvios), la audiencia seed no engagement en la primera hora, o tu tasa de engagement histórica es tan baja que el algoritmo no te prueba con suficiente gente.",
        },
        {
          question: "¿Los comentarios o likes importan más?",
          answer: 
            "Los comentarios dominan. Un solo comentario sustancial vale más que 10 likes. Un thread recíproco donde el comentarista original responde otra vez vale mucho más que un comentario único.",
        },
        {
          question: "¿LinkedIn penaliza el contenido generado por IA?",
          answer: 
            "LinkedIn no prohíbe posts de IA, pero degrada los patrones IA genéricos: contenido sobrelistado, openers estereotipados, consejos «leadership» huecos y estructura ChatGPT obvia. Los detalles humanos — nombres, números, opiniones inesperadas — son recompensados.",
        },
        {
          question: "¿Qué cuenta como «dwell time» en LinkedIn?",
          answer: 
            "Cuánto tiempo alguien pausa en tu post antes de scrollear. Hacer clic en «Ver más» es el proxy más fuerte. Los posts largos que mantienen atención vencen a los cortos solo ojeados.",
        },
        {
          question: "¿Cuánto tiempo un post de LinkedIn sigue ganando alcance?",
          answer: 
            "La mayoría de posts peak en 24h y decaen rápido. Los posts virales pueden seguir acumulando impresiones 48 a 72 horas. Un subconjunto muy pequeño — contenido evergreen altamente compartible — gana engagement durante semanas.",
        },
      ],
      aboutAlgorithmLabel: "Sobre el algoritmo de LinkedIn",
      internalLinks: [
        {
          label: "Ideas de posts de LinkedIn",
          href: "/linkedin-post-ideas",
        },
        {
          label: "Ejemplos de posts de LinkedIn",
          href: "/linkedin-post-examples",
        },
        {
          label: "Generador de posts de LinkedIn IA",
          href: "/ai-linkedin-post-generator",
        },
        {
          label: "Escribir un post de LinkedIn",
          href: "/write-linkedin-post",
        },
        {
          label: "Registro gratis",
          href: "/signup",
        },
      ],
      exploreMore: "Más recursos",
      finalCta: {
        title: "Entiende el algoritmo. Delega la escritura.",
        subtitle: 
          "Posty redacta posts calibrados para las señales exactas de esta página — hooks para dwell time, estructura para comentarios, tono para tu nicho. Genera tu primer post gratis.",
        button: "Empezar a escribir mejor",
      },
    },

  it: {
      meta: {
        title: "Algoritmo LinkedIn 2026: Come funziona davvero | Posty",
        description: 
          "Come l'algoritmo LinkedIn classifica i post nel 2026 — le 4 fasi di distribuzione, 5 segnali chiave, cosa è cambiato quest'anno e 7 tattiche provate che funzionano.",
      },
      breadcrumb: "Algoritmo LinkedIn",
      badge: "Guida algoritmo 2026",
      heroTitle: "Come funziona l'",
      heroTitleHighlight: "algoritmo LinkedIn",
      heroSubtitle: 
        "LinkedIn non pubblica il suo codice di ranking, ma un decennio di blog post ingegneristici, brevetti ed esperimenti di creator coerenti hanno identificato il suo reale funzionamento. Ecco la versione pratica, senza fronzoli.",
      ctaPrimary: "Scrivi post migliori con l'IA",
      ctaSecondary: "Vai ai dettagli",
      tldr: {
        label: "TL;DR",
        body: 
          "LinkedIn valuta ogni post in 4 fasi: controllo qualità, test su audience seed, valutazione engagement, poi distribuzione virale se i segnali sono forti. I segnali più importanti — in ordine — sono commenti significativi, dwell time, rilevanza del contenuto, autorità del creator e forza delle connessioni. Il resto è rumore.",
      },
      phasesSection: {
        title: "Le 4 fasi di distribuzione",
        subtitle: 
          "Il tuo post passa per 4 checkpoint automatici prima di raggiungere un grande pubblico. Capire ognuno ti dice dove stai perdendo reach realmente.",
        phases: [
          {
            title: "Controllo qualità (filtro anti-spam)",
            description: 
              "In secondi dalla pubblicazione, LinkedIn passa il post attraverso classificatori che flaggano spam, low-quality o violazioni. Troppi hashtag, link esterni senza contesto, engagement bait generico o pattern IA ovvi vengono declassati qui — spesso silenziosamente.",
            outcomeLabel: "Risultato",
            outcome: "I post low-quality sono limitati prima che la distribuzione inizi.",
          },
          {
            title: "Test audience seed",
            description: 
              "Il post è mostrato a una piccola parte della tua rete (50 a qualche centinaio) — selezionata per forza di connessione, engagement passato e rilevanza tematica. I primi 60 minuti sono critici.",
            outcomeLabel: "Risultato",
            outcome: "Se il tasso di engagement supera una soglia, il post avanza.",
          },
          {
            title: "Valutazione dell'engagement",
            description: 
              "LinkedIn pesa ciò che è accaduto durante il test: rapporto commenti/visualizzazioni, dwell time, volume di condivisioni, autorità dei profili che hanno interagito. Un commento significativo di un creator attivo vale esponenzialmente di più di un like passivo.",
            outcomeLabel: "Risultato",
            outcome: "Segnali forti attivano l'espansione al feed più ampio.",
          },
          {
            title: "Distribuzione virale",
            description: 
              "Se il post supera la soglia, LinkedIn lo spinge alle connessioni di secondo grado e oltre — utenti interessati al tema, non solo la tua rete. Qui il reach si moltiplica 10x-100x. I post virali possono continuare a generare impressioni per 48-72h.",
            outcomeLabel: "Risultato",
            outcome: "Il reach si compone finché l'engagement decade.",
          },
        ],
      },
      signalsSection: {
        title: "I 5 segnali che fanno davvero la differenza",
        subtitle: 
          "LinkedIn considera decine di fattori. In pratica, questi cinque spiegano il 90% del perché un post decolla e un altro no.",
        signals: [
          {
            emoji: "💬",
            title: "Commenti significativi",
            description: 
              "Non emoji, non risposte di una parola. Commenti sostanziali — specialmente quelli che innescano scambio — segnalano che il tuo contenuto vale una pausa. Il singolo segnale positivo più pesante.",
            weightLabel: "Peso massimo",
          },
          {
            emoji: "⏱️",
            title: "Dwell time",
            description: 
              "Quanto tempo la gente smette di scorrere sul tuo post. I post lunghi che trattengono l'attenzione battono i corti che vengono sfogliati. Il click su «Vedi altro» è un proxy misurabile.",
            weightLabel: "Alto",
          },
          {
            emoji: "🎯",
            title: "Rilevanza del contenuto",
            description: 
              "L'algoritmo abbina il tuo tema agli interessi inferiti di ogni viewer. I post che restano in una nicchia coerente costruiscono autorità tematica e vengono poi mostrati a audience più strette e rilevanti.",
            weightLabel: "Alto",
          },
          {
            emoji: "🏆",
            title: "Autorità del creator",
            description: 
              "LinkedIn traccia il tuo tasso di engagement storico, frequenza di pubblicazione, qualità della rete. I creator costanti con buon engagement ricevono un boost base su ogni post.",
            weightLabel: "Medio",
          },
          {
            emoji: "🔗",
            title: "Forza delle connessioni",
            description: 
              "Pesata dalle interazioni passate — le persone che hanno già messo like o commentato i tuoi post sono ampiamente prioritizzate nell'audience seed. Riconnettersi a contatti dormienti ti costa engagement nella finestra iniziale.",
            weightLabel: "Medio",
          },
        ],
      },
      recentChanges: {
        title: "Cosa è cambiato nel 2026",
        subtitle: 
          "LinkedIn ha ritarato la distribuzione aggressivamente. Quattro cambi quest'anno hanno il maggior impatto su cosa dovresti pubblicare davvero.",
        changes: [
          {
            label: "Q1 2026",
            title: "Penalità link esterni attenuata",
            description: 
              "I post con link esterni non vengono più auto-limitati. LinkedIn ha iniziato a premiare i link quando il post ottiene buon dwell time — in pratica il link deve essere meritato dal contenuto.",
          },
          {
            label: "Q2 2026",
            title: "Video prioritario sui temi pro",
            description: 
              "Video verticali brevi (sotto 90s) vedono 2-3x il reach su temi B2B/carriera vs solo testo. Sottotitoli e hook forte nei primi 3 secondi contano più della qualità di produzione.",
          },
          {
            label: "Continuo",
            title: "Rilevamento contenuto IA-generico",
            description: 
              "Post con pattern IA generici (liste eccessive, opener stereotipati, thought leadership vuoto) sono progressivamente declassati. La soluzione: specificità — nomi reali, numeri reali, esperienza vissuta reale.",
          },
          {
            label: "Continuo",
            title: "Ponderazione qualità commenti",
            description: 
              "Commenti oltre 12 parole contano significativamente più di quelli corti. I loop reciproci (pod) sono ancora rilevabili e svalutati — vince la profondità organica.",
          },
        ],
      },
      tipsSection: {
        title: "7 tattiche che funzionano ancora nel 2026",
        subtitle: "Non sono hack. I pattern che correlano con il reach su migliaia di post analizzati nel 2025 e 2026.",
        tips: [
          {
            title: "Vinci i primi 60 minuti",
            description: 
              "Pubblica quando il tuo pubblico core è davvero online. L'engagement della prima ora determina se il tuo post supera il test dell'audience seed. Controlla i tuoi analytics per la tua finestra peak personale.",
          },
          {
            title: "Hook nelle prime 2 righe",
            description: 
              "Sono le uniche visibili prima di «Vedi altro». Opener specifici, inattesi o leggermente controcorrente scatenano il click — che LinkedIn misura come dwell time.",
          },
          {
            title: "Scatena commenti, non solo like",
            description: 
              "Termina i post con una domanda che richiede un'opinione, non sì/no. Rispondi a ogni commento nelle prime 2 ore per tenere il thread vivo — la profondità del thread è segnale forte.",
          },
          {
            title: "Pubblica 3-5 volte a settimana, costantemente",
            description: 
              "L'autorità del creator si accumula. Pubblicare lunedì-mercoledì-venerdì per 3 mesi batte 20 post in settimana 1 e silenzio. LinkedIn premia i creator che si presentano.",
          },
          {
            title: "Resta in una nicchia chiara per 6 mesi",
            description: 
              "Saltare tra temi non correlati resetta la tua autorità tematica. Scegli una corsia stretta e dominala — l'algoritmo alla fine spingerà i tuoi post a persone interessate.",
          },
          {
            title: "Usa formati nativi, non repost",
            description: 
              "Testo originale, video nativo, documento nativo e sondaggio nativo battono tutti i link share. I documenti (caroselli PDF) hanno dwell time medio molto alto.",
          },
          {
            title: "Scrivi come umano, non come LinkedIn",
            description: 
              "Post «leadership» formulaic, motivazione vuota e struttura ChatGPT ovvia sono declassati. Storie specifiche, opinioni inusuali ed esperienze uniche sono premiate.",
          },
        ],
      },
      mythsSection: {
        title: "Miti comuni, verificati",
        subtitle: "Queste affermazioni si diffondono ogni anno. Nessuna regge contro dati reali.",
        mythLabel: "Mito",
        realityLabel: "Realtà",
        myths: [
          {
            claim: "Più hashtag = più reach",
            reality: 
              "Da 3 a 5 hashtag rilevanti va bene. Oltre, il classificatore spam si attiva e limita la distribuzione. Gli hashtag sono un piccolo segnale di rilevanza, non un moltiplicatore di reach.",
          },
          {
            claim: "I link esterni uccidono il tuo reach",
            reality: 
              "Non più. Da Q1 2026, LinkedIn misura il dwell time prima di decidere di limitare. Un post ben scritto con un link contestuale batte un post senza link senza sostanza.",
          },
          {
            claim: "C'è un momento migliore per postare",
            reality: 
              "C'è un momento migliore per IL TUO pubblico. I consigli generici «martedì 8 AM» sono senza valore — guarda quando le tue connessioni sono davvero online e attive, varia enormemente per industria.",
          },
          {
            claim: "I pod di engagement funzionano",
            reality: 
              "Funzionavano. Il classificatore di LinkedIn ora rileva cross-engagement ripetuto tra gli stessi account e svaluta il boost. L'engagement reale scala, l'artificiale no.",
          },
          {
            claim: "I post con immagini vincono sempre",
            reality: 
              "I post solo testo spesso superano i post con immagini stock. Ciò che conta è il dwell time — se l'immagine non aggiunge segnale, rallenta solo la lettura e riduce l'efficacia dell'hook.",
          },
        ],
      },
      aiCta: {
        title: "Smetti di indovinare. Scrivi post che l'algoritmo premia davvero.",
        subtitle: 
          "Posty è addestrato su migliaia di post diventati virali nel 2025 e 2026. Genera hook, struttura e CTA calibrati per i segnali sopra — in secondi.",
        button: "Prova Posty gratis",
      },
      faqTitle: "FAQ algoritmo LinkedIn",
      faq: [
        {
          question: "Con che frequenza dovrei postare su LinkedIn per l'algoritmo?",
          answer: 
            "Da 3 a 5 volte a settimana è il sweet spot per la maggior parte dei creator. Postare ogni giorno può funzionare se sostieni la qualità — ma un post pensato batte cinque affrettati sempre. La costanza su mesi conta più della frequenza bruta.",
        },
        {
          question: "L'algoritmo LinkedIn penalizza i link esterni?",
          answer: 
            "Non da inizio 2026. I link esterni prima limitavano automaticamente il reach, ma LinkedIn ora misura il dwell time sul post stesso prima di decidere. Se il tuo post merita attenzione, il link va con esso.",
        },
        {
          question: "Qual è il momento migliore per postare su LinkedIn?",
          answer: 
            "Nessuna risposta universale. Controlla i tuoi analytics per quando il tuo pubblico engagement di più — varia enormemente per industria, paese e ruolo. Martedì-giovedì mattina funziona per la maggior parte delle audience B2B.",
        },
        {
          question: "Perché alcuni post ottengono 0 visualizzazioni?",
          answer: 
            "Tre cause comuni: il classificatore spam ha flaggato il post (hashtag stuffing, engagement bait, pattern IA ovvi), l'audience seed non ha engagement nella prima ora, o il tuo tasso di engagement storico è così basso che l'algoritmo non ti testa con abbastanza persone.",
        },
        {
          question: "Commenti o like contano di più?",
          answer: 
            "I commenti dominano. Un singolo commento sostanziale vale più di 10 like. Un thread reciproco dove il commentatore originale risponde di nuovo vale molto più di un commento one-shot.",
        },
        {
          question: "LinkedIn penalizza il contenuto generato dall'IA?",
          answer: 
            "LinkedIn non bandisce i post IA, ma declassa i pattern IA generici: contenuto sovralistato, opener stereotipati, consigli «leadership» vuoti e struttura ChatGPT ovvia. Le specifiche umane — nomi, numeri, opinioni inaspettate — sono premiate.",
        },
        {
          question: "Cosa conta come «dwell time» su LinkedIn?",
          answer: 
            "Quanto tempo qualcuno si ferma sul tuo post prima di scorrere oltre. Cliccare «Vedi altro» è il proxy più forte. I post lunghi che trattengono l'attenzione battono i corti sfogliati.",
        },
        {
          question: "Quanto a lungo un post LinkedIn continua a guadagnare reach?",
          answer: 
            "La maggior parte dei post raggiunge il peak entro 24h e decade rapidamente. I post virali possono continuare ad accumulare impressioni per 48-72 ore. Un sottogruppo molto piccolo — contenuto evergreen altamente condivisibile — guadagna engagement per settimane.",
        },
      ],
      aboutAlgorithmLabel: "Sull'algoritmo LinkedIn",
      internalLinks: [
        {
          label: "Idee post LinkedIn",
          href: "/linkedin-post-ideas",
        },
        {
          label: "Esempi post LinkedIn",
          href: "/linkedin-post-examples",
        },
        {
          label: "Generatore post LinkedIn IA",
          href: "/ai-linkedin-post-generator",
        },
        {
          label: "Scrivi un post LinkedIn",
          href: "/write-linkedin-post",
        },
        {
          label: "Registrazione gratuita",
          href: "/signup",
        },
      ],
      exploreMore: "Altre risorse",
      finalCta: {
        title: "Capisci l'algoritmo. Delega la scrittura.",
        subtitle: 
          "Posty redige post calibrati per i segnali esatti di questa pagina — hook per il dwell time, struttura per i commenti, tono per la tua nicchia. Genera il tuo primo post gratis.",
        button: "Inizia a scrivere meglio",
      },
    },

  pt: {
      meta: {
        title: "Algoritmo do LinkedIn 2026: Como realmente funciona | Posty",
        description: 
          "Como o algoritmo do LinkedIn classifica posts em 2026 — as 4 fases de distribuição, 5 sinais-chave, o que mudou este ano e 7 táticas comprovadas que ainda funcionam.",
      },
      breadcrumb: "Algoritmo do LinkedIn",
      badge: "Guia do algoritmo 2026",
      heroTitle: "Como funciona o",
      heroTitleHighlight: "algoritmo do LinkedIn",
      heroSubtitle: 
        "O LinkedIn não publica seu código de ranqueamento, mas uma década de posts de engenharia, patentes e experimentos consistentes de criadores identificou como ele realmente funciona. Aqui a versão prática, sem enfeites.",
      ctaPrimary: "Escrever posts melhores com IA",
      ctaSecondary: "Ver o detalhamento",
      tldr: {
        label: "TL;DR",
        body: 
          "O LinkedIn pontua cada post em 4 fases: controle de qualidade, teste em audiência seed, avaliação de engajamento, depois distribuição viral se os sinais são fortes. Os sinais mais importantes — em ordem — são comentários significativos, dwell time, relevância do conteúdo, autoridade do criador e força de conexão. O resto é ruído.",
      },
      phasesSection: {
        title: "As 4 fases de distribuição",
        subtitle: 
          "Seu post passa por 4 checkpoints automáticos antes de alcançar uma grande audiência. Entender cada um indica onde você perde alcance de verdade.",
        phases: [
          {
            title: "Controle de qualidade (filtro anti-spam)",
            description: 
              "Em segundos após publicação, o LinkedIn passa o post por classificadores que sinalizam spam, baixa qualidade ou violações. Muitos hashtags, links externos sem contexto, engajamento bait genérico ou padrões IA óbvios são rebaixados aqui — frequentemente em silêncio.",
            outcomeLabel: "Resultado",
            outcome: "Posts de baixa qualidade são limitados antes mesmo da distribuição começar.",
          },
          {
            title: "Teste em audiência seed",
            description: 
              "O post é mostrado a uma pequena parte da sua rede (50 a algumas centenas) — selecionada por força de conexão, engajamento passado e relevância temática. Os primeiros 60 minutos desta janela são críticos.",
            outcomeLabel: "Resultado",
            outcome: "Se a taxa de engajamento supera um limiar, o post avança.",
          },
          {
            title: "Avaliação do engajamento",
            description: 
              "O LinkedIn pesa o que aconteceu durante o teste: razão comentários/visualizações, dwell time, volume de compartilhamentos, autoridade dos perfis que interagiram. Um comentário significativo de um criador ativo vale exponencialmente mais que um like passivo.",
            outcomeLabel: "Resultado",
            outcome: "Sinais fortes acionam a expansão ao feed mais amplo.",
          },
          {
            title: "Distribuição viral",
            description: 
              "Se o post supera o limiar, o LinkedIn empurra às conexões de segundo grau e além — usuários interessados no tema, não só sua rede. Aqui o alcance multiplica 10x a 100x. Posts virais podem continuar a gerar impressões por 48 a 72h.",
            outcomeLabel: "Resultado",
            outcome: "O alcance se compõe até o engajamento decair.",
          },
        ],
      },
      signalsSection: {
        title: "Os 5 sinais que realmente fazem a diferença",
        subtitle: 
          "O LinkedIn considera dezenas de fatores. Na prática, estes cinco explicam 90% do porquê um post decola e outro não.",
        signals: [
          {
            emoji: "💬",
            title: "Comentários significativos",
            description: 
              "Não emojis, não respostas de uma palavra. Comentários substantivos — especialmente os que disparam troca — sinalizam que seu conteúdo vale uma pausa. O sinal positivo individual mais pesado.",
            weightLabel: "Peso máximo",
          },
          {
            emoji: "⏱️",
            title: "Dwell time",
            description: 
              "Quanto tempo as pessoas param de scrollar no seu post. Posts longos que retêm atenção vencem posts curtos apenas folheados. O clique em «Ver mais» é um proxy mensurável.",
            weightLabel: "Alto",
          },
          {
            emoji: "🎯",
            title: "Relevância do conteúdo",
            description: 
              "O algoritmo combina seu tema com os interesses inferidos de cada viewer. Posts que permanecem num nicho coerente constroem autoridade temática e são mostrados a audiências mais relevantes.",
            weightLabel: "Alto",
          },
          {
            emoji: "🏆",
            title: "Autoridade do criador",
            description: 
              "O LinkedIn rastreia sua taxa de engajamento histórica, frequência de posts, qualidade da rede. Criadores consistentes com bom engajamento recebem um boost base em cada post.",
            weightLabel: "Médio",
          },
          {
            emoji: "🔗",
            title: "Força de conexão",
            description: 
              "Ponderada por interações passadas — pessoas que já deram like ou comentaram seus posts são fortemente priorizadas na audiência seed. Reconectar contatos dormentes custa engajamento na janela inicial.",
            weightLabel: "Médio",
          },
        ],
      },
      recentChanges: {
        title: "O que mudou em 2026",
        subtitle: 
          "O LinkedIn vem reajustando a distribuição agressivamente. Quatro mudanças este ano têm o maior impacto no que você deveria postar.",
        changes: [
          {
            label: "T1 2026",
            title: "Penalidade a links externos suavizada",
            description: 
              "Posts com links externos não são mais auto-limitados. O LinkedIn começou a recompensar links quando o post ganha bom dwell time — efetivamente exigindo que o link seja merecido pelo conteúdo.",
          },
          {
            label: "T2 2026",
            title: "Vídeo prioritário em temas profissionais",
            description: 
              "Vídeos verticais curtos (menos de 90s) veem 2 a 3x o alcance em temas B2B/carreira vs só texto. Legendas e hook forte nos primeiros 3 segundos importam mais que qualidade de produção.",
          },
          {
            label: "Contínuo",
            title: "Detecção de conteúdo IA-genérico",
            description: 
              "Posts com padrões IA genéricos (listas excessivas, openers estereotipados, thought leadership vazio) são crescentemente rebaixados. A solução: especificidade — nomes reais, números reais, experiência vivida real.",
          },
          {
            label: "Contínuo",
            title: "Ponderação de qualidade de comentários",
            description: 
              "Comentários acima de 12 palavras contam significativamente mais que os curtos. Loops recíprocos (pods) ainda são detectáveis e desvalorizados — profundidade orgânica vence.",
          },
        ],
      },
      tipsSection: {
        title: "7 táticas que ainda funcionam em 2026",
        subtitle: 
          "Não são hacks. Os padrões que correlacionam com alcance em milhares de posts analisados em 2025 e 2026.",
        tips: [
          {
            title: "Ganhe os primeiros 60 minutos",
            description: 
              "Poste quando sua audiência core está realmente online. O engajamento da primeira hora determina se seu post escapa do teste de audiência seed. Veja seus analytics para sua janela peak pessoal.",
          },
          {
            title: "Hook nas primeiras 2 linhas",
            description: 
              "São as únicas visíveis antes de «Ver mais». Openers específicos, inesperados ou ligeiramente contrários disparam o clique — que o LinkedIn mede como dwell time.",
          },
          {
            title: "Dispare comentários, não só likes",
            description: 
              "Termine posts com uma pergunta que exige opinião, não sim/não. Responda a cada comentário nas primeiras 2 horas para manter o thread vivo — a profundidade do thread é sinal forte.",
          },
          {
            title: "Poste 3 a 5 vezes por semana, consistentemente",
            description: 
              "A autoridade do criador se acumula. Postar segunda-quarta-sexta por 3 meses vence 20 posts na semana 1 e silêncio. O LinkedIn recompensa criadores que aparecem.",
          },
          {
            title: "Fique num nicho claro por 6 meses",
            description: 
              "Pular entre temas não relacionados reseta sua autoridade temática. Escolha uma faixa estreita e domine — o algoritmo eventualmente mostrará seus posts a pessoas interessadas.",
          },
          {
            title: "Use formatos nativos, não reposts",
            description: 
              "Texto original, vídeo nativo, documento nativo e enquete nativa superam compartilhamentos de link. Documentos (carrosséis PDF) têm dwell time médio muito alto.",
          },
          {
            title: "Escreva como humano, não como LinkedIn",
            description: 
              "Posts «liderança» formulaicos, motivação vazia e estrutura ChatGPT óbvia são rebaixados. Histórias específicas, opiniões incomuns e experiências únicas são recompensadas.",
          },
        ],
      },
      mythsSection: {
        title: "Mitos comuns, verificados",
        subtitle: "Essas afirmações se espalham a cada ano. Nenhuma se sustenta diante de dados reais.",
        mythLabel: "Mito",
        realityLabel: "Realidade",
        myths: [
          {
            claim: "Mais hashtags = mais alcance",
            reality: 
              "De 3 a 5 hashtags relevantes está bem. Além, o classificador de spam ativa e limita a distribuição. Hashtags são um pequeno sinal de relevância, não multiplicador de alcance.",
          },
          {
            claim: "Links externos matam seu alcance",
            reality: 
              "Não mais. Desde T1 2026, o LinkedIn mede dwell time antes de decidir limitar. Um post bem escrito com um link contextual supera um post sem link sem substância.",
          },
          {
            claim: "Existe um melhor momento para postar",
            reality: 
              "Existe um melhor momento para SUA audiência. Conselhos genéricos «8h terça» são sem valor — veja quando suas conexões estão realmente online e engajadas, varia enormemente por indústria.",
          },
          {
            claim: "Pods de engajamento funcionam",
            reality: 
              "Funcionavam. O classificador do LinkedIn agora detecta cross-engagement repetido entre as mesmas contas e desvaloriza o boost. Engajamento real escala, artificial não.",
          },
          {
            claim: "Posts com imagens sempre ganham",
            reality: 
              "Posts só texto frequentemente superam posts com imagens stock. O que importa é o dwell time — se a imagem não adiciona sinal, só retarda a leitura e reduz eficácia do hook.",
          },
        ],
      },
      aiCta: {
        title: "Pare de adivinhar. Escreva posts que o algoritmo realmente recompensa.",
        subtitle: 
          "Posty é treinado em milhares de posts que viralizaram em 2025 e 2026. Gera hook, estrutura e CTA calibrados para os sinais acima — em segundos.",
        button: "Experimentar Posty grátis",
      },
      faqTitle: "FAQ algoritmo do LinkedIn",
      faq: [
        {
          question: "Com que frequência devo postar no LinkedIn para o algoritmo?",
          answer: 
            "De 3 a 5 vezes por semana é o sweet spot para maioria. Postar diariamente pode funcionar se mantiver a qualidade — mas um post pensado bate cinco apressados sempre. Consistência ao longo de meses importa mais que frequência bruta.",
        },
        {
          question: "O algoritmo do LinkedIn penaliza links externos?",
          answer: 
            "Não desde início de 2026. Links externos antes limitavam automaticamente o alcance, mas o LinkedIn agora mede dwell time no próprio post antes de decidir. Se seu post ganha atenção, o link vai junto.",
        },
        {
          question: "Qual é o melhor horário para postar no LinkedIn?",
          answer: 
            "Sem resposta universal. Veja seus analytics para quando sua audiência engaja mais — varia enormemente por indústria, país e papel. Terça a quinta de manhã funciona para maioria das audiências B2B.",
        },
        {
          question: "Por que alguns posts têm 0 visualizações?",
          answer: 
            "Três causas comuns: o classificador de spam sinalizou o post (hashtag stuffing, engagement bait, padrões IA óbvios), a audiência seed não engajou na primeira hora, ou sua taxa de engajamento histórica é tão baixa que o algoritmo não te testa com gente suficiente.",
        },
        {
          question: "Comentários ou likes importam mais?",
          answer: 
            "Comentários dominam. Um comentário substantivo vale mais que 10 likes. Um thread recíproco onde o comentarista original responde de novo vale muito mais que um comentário único.",
        },
        {
          question: "O LinkedIn penaliza conteúdo gerado por IA?",
          answer: 
            "O LinkedIn não bane posts de IA, mas rebaixa padrões IA genéricos: conteúdo sobrelistado, openers estereotipados, conselhos «liderança» vazios e estrutura ChatGPT óbvia. Especificidades humanas — nomes, números, opiniões inesperadas — são recompensadas.",
        },
        {
          question: "O que conta como «dwell time» no LinkedIn?",
          answer: 
            "Quanto tempo alguém pausa em seu post antes de scrollar. Clicar «Ver mais» é o proxy mais forte. Posts longos que retêm atenção batem posts curtos só folheados.",
        },
        {
          question: "Quanto tempo um post do LinkedIn continua ganhando alcance?",
          answer: 
            "Maioria dos posts pico em 24h e decai rápido. Posts virais podem continuar a acumular impressões por 48 a 72 horas. Um subconjunto muito pequeno — conteúdo evergreen altamente compartilhável — ganha engajamento por semanas.",
        },
      ],
      aboutAlgorithmLabel: "Sobre o algoritmo do LinkedIn",
      internalLinks: [
        {
          label: "Ideias de posts LinkedIn",
          href: "/linkedin-post-ideas",
        },
        {
          label: "Exemplos de posts LinkedIn",
          href: "/linkedin-post-examples",
        },
        {
          label: "Gerador de posts LinkedIn IA",
          href: "/ai-linkedin-post-generator",
        },
        {
          label: "Escrever um post LinkedIn",
          href: "/write-linkedin-post",
        },
        {
          label: "Cadastro grátis",
          href: "/signup",
        },
      ],
      exploreMore: "Mais recursos",
      finalCta: {
        title: "Entenda o algoritmo. Delegue a escrita.",
        subtitle: 
          "Posty redige posts calibrados para os sinais exatos desta página — hooks para dwell time, estrutura para comentários, tom para seu nicho. Gere seu primeiro post grátis.",
        button: "Começar a escrever melhor",
      },
    },

  nl: {
      meta: {
        title: "LinkedIn-algoritme 2026: Hoe het echt werkt | Posty",
        description: 
          "Hoe het LinkedIn-algoritme posts in 2026 rangschikt — de 4 distributiefasen, 5 belangrijkste signalen, wat dit jaar veranderde en 7 bewezen tactieken die nog werken.",
      },
      breadcrumb: "LinkedIn-algoritme",
      badge: "Algoritme-gids 2026",
      heroTitle: "Hoe werkt het",
      heroTitleHighlight: "LinkedIn-algoritme",
      heroSubtitle: 
        "LinkedIn publiceert zijn rangschikkingscode niet, maar een decennium van engineering-blogposts, octrooi-aanvragen en consistente creator-experimenten hebben vastgesteld hoe het werkelijk werkt. Hier de praktische versie, zonder poespas.",
      ctaPrimary: "Schrijf betere posts met AI",
      ctaSecondary: "Bekijk het overzicht",
      tldr: {
        label: "TL;DR",
        body: 
          "LinkedIn scoort elke post in 4 fases: kwaliteitscontrole, test op seed-publiek, engagement-evaluatie, dan virale distributie als de signalen sterk zijn. De belangrijkste signalen — in volgorde — zijn betekenisvolle reacties, dwell time, contentrelevantie, creator-autoriteit en verbindingssterkte. De rest is ruis.",
      },
      phasesSection: {
        title: "De 4 distributiefasen",
        subtitle: 
          "Je post doorloopt 4 automatische checkpoints voordat hij een groot publiek bereikt. Elk begrijpen laat zien waar je echt bereik verliest.",
        phases: [
          {
            title: "Kwaliteitscontrole (spamfilter)",
            description: 
              "Binnen seconden na publicatie laat LinkedIn de post door classifiers lopen die spam, lage kwaliteit of regelovertredingen markeren. Te veel hashtags, externe links zonder context, generieke engagement-bait of AI-overduidelijke patronen worden hier gedevalueerd — vaak stilzwijgend.",
            outcomeLabel: "Resultaat",
            outcome: "Posts van lage kwaliteit worden beperkt voor de distributie begint.",
          },
          {
            title: "Seed-publiek test",
            description: 
              "De post wordt getoond aan een klein deel van je netwerk (50 tot enkele honderden) — geselecteerd op verbindingssterkte, eerdere engagement en thematische relevantie. De eerste 60 minuten van dit testvenster zijn cruciaal.",
            outcomeLabel: "Resultaat",
            outcome: "Als de engagement-ratio boven een drempelwaarde blijft, gaat de post verder.",
          },
          {
            title: "Engagement-evaluatie",
            description: 
              "LinkedIn weegt wat er tijdens de test gebeurde: commentaar-view-ratio, dwell time, share-volume, autoriteit van de profielen die interactie hadden. Een betekenisvolle reactie van een actieve creator is exponentieel meer waard dan een passieve like.",
            outcomeLabel: "Resultaat",
            outcome: "Sterke signalen triggeren uitbreiding naar de bredere feed.",
          },
          {
            title: "Virale distributie",
            description: 
              "Als de post de drempel passeert, duwt LinkedIn hem naar tweede-graads connecties en verder — gebruikers geïnteresseerd in het onderwerp, niet alleen je netwerk. Hier vermenigvuldigt bereik 10x tot 100x. Virale posts kunnen 48 tot 72 uur impressies blijven verdienen.",
            outcomeLabel: "Resultaat",
            outcome: "Bereik stapelt op tot engagement afneemt.",
          },
        ],
      },
      signalsSection: {
        title: "De 5 signalen die echt het verschil maken",
        subtitle: 
          "LinkedIn weegt tientallen factoren. In de praktijk verklaren deze vijf 90% van waarom de ene post doorbreekt en de andere niet.",
        signals: [
          {
            emoji: "💬",
            title: "Betekenisvolle reacties",
            description: 
              "Geen emoji's, geen één-woord antwoorden. Substantiële reacties — vooral die een heen-en-weer triggeren — signaleren dat je content een pauze waard is. Het zwaarste individuele positieve signaal.",
            weightLabel: "Hoogste gewicht",
          },
          {
            emoji: "⏱️",
            title: "Dwell time",
            description: 
              "Hoe lang mensen stoppen met scrollen bij jouw post. Lange posts die aandacht vasthouden verslaan korte posts die alleen worden gescand. De klik op «Meer zien» is een meetbare proxy.",
            weightLabel: "Hoog",
          },
          {
            emoji: "🎯",
            title: "Contentrelevantie",
            description: 
              "Het algoritme matcht je onderwerp met de afgeleide interesses van elke viewer. Posts die in een consistente niche blijven bouwen thematische autoriteit en worden vervolgens getoond aan strakkere, relevantere doelgroepen.",
            weightLabel: "Hoog",
          },
          {
            emoji: "🏆",
            title: "Creator-autoriteit",
            description: 
              "LinkedIn volgt je historische engagement-ratio, postfrequentie, netwerkkwaliteit. Consistente creators met solide engagement krijgen een basisboost op elke post.",
            weightLabel: "Middel",
          },
          {
            emoji: "🔗",
            title: "Verbindingssterkte",
            description: 
              "Gewogen op basis van eerdere interacties — mensen die al je posts geliket of becommentarieerd hebben worden zwaar geprioriteerd in het seed-publiek. Heractivering van sluimerende contacten kost je vroeg-venster engagement.",
            weightLabel: "Middel",
          },
        ],
      },
      recentChanges: {
        title: "Wat veranderde in 2026",
        subtitle: 
          "LinkedIn heeft de distributie agressief bijgesteld. Vier wijzigingen dit jaar hebben de grootste impact op wat je eigenlijk zou moeten posten.",
        changes: [
          {
            label: "Q1 2026",
            title: "Externe link-straf verzacht",
            description: 
              "Posts met externe links worden niet meer automatisch beperkt. LinkedIn begon links te belonen wanneer de post zelf goede dwell time oplevert — effectief vereist de link te worden verdiend door content.",
          },
          {
            label: "Q2 2026",
            title: "Video krijgt prioriteit bij professionele onderwerpen",
            description: 
              "Korte verticale video's (onder 90s) zien 2 tot 3x het bereik op B2B/carrière-onderwerpen vs alleen-tekst. Ondertitels en sterke hook in de eerste 3 seconden tellen meer dan productiekwaliteit.",
          },
          {
            label: "Doorlopend",
            title: "Detectie van AI-generische content",
            description: 
              "Posts met generieke AI-patronen (buitensporige lijsten, stereotype openers, holle thought leadership) worden steeds meer gedevalueerd. De oplossing: specificiteit — echte namen, echte cijfers, echte doorleefde ervaring.",
          },
          {
            label: "Doorlopend",
            title: "Weging van reactie-kwaliteit",
            description: 
              "Reacties boven 12 woorden tellen significant meer dan korte. Wederzijdse reactie-loops (pods) zijn nog detecteerbaar en gedevalueerd — organische diepte wint.",
          },
        ],
      },
      tipsSection: {
        title: "7 tactieken die nog werken in 2026",
        subtitle: "Geen hacks. De patronen die correleren met bereik over duizenden posts geanalyseerd in 2025 en 2026.",
        tips: [
          {
            title: "Win de eerste 60 minuten",
            description: 
              "Post wanneer je kerndoelgroep echt online is. De engagement in het eerste uur bepaalt of je post de seed-audience test overleeft. Check je analytics voor je persoonlijke piek-venster.",
          },
          {
            title: "Hook in de eerste 2 regels",
            description: 
              "Dat zijn de enige zichtbare voor «Meer zien». Specifieke, onverwachte of licht tegendraadse openers triggeren de klik — die LinkedIn meet als dwell time.",
          },
          {
            title: "Trigger reacties, niet alleen likes",
            description: 
              "Eindig posts met een vraag die een mening vereist, geen ja/nee. Reageer op elke reactie in de eerste 2 uur om de thread levend te houden — thread-diepte is een sterk signaal.",
          },
          {
            title: "Post 3 tot 5 keer per week, consistent",
            description: 
              "Creator-autoriteit stapelt op. Maandag-woensdag-vrijdag posten gedurende 3 maanden verslaat 20 posts in week 1 en dan stilte. LinkedIn beloont creators die opdagen.",
          },
          {
            title: "Blijf 6 maanden in een duidelijke niche",
            description: 
              "Springen tussen niet-gerelateerde onderwerpen reset je thematische autoriteit. Kies een smalle baan en domineer het — het algoritme zal je posts uiteindelijk tonen aan mensen die geïnteresseerd zijn.",
          },
          {
            title: "Gebruik native formats, geen reposts",
            description: 
              "Oorspronkelijke tekst, native video, native document en native poll presteren allemaal beter dan link-shares. Documenten (PDF-carrousels) hebben zeer hoge gemiddelde dwell time.",
          },
          {
            title: "Schrijf als een mens, niet als LinkedIn",
            description: 
              "Formulaic «leadership»-posts, holle motivatie en voor de hand liggende ChatGPT-structuur worden gedevalueerd. Specifieke verhalen, ongebruikelijke meningen en unieke ervaringen worden beloond.",
          },
        ],
      },
      mythsSection: {
        title: "Veelvoorkomende mythes, gecheckt",
        subtitle: "Deze claims verspreiden zich elk jaar. Geen houdt stand tegen echte data.",
        mythLabel: "Mythe",
        realityLabel: "Realiteit",
        myths: [
          {
            claim: "Meer hashtags = meer bereik",
            reality: 
              "3 tot 5 relevante hashtags is prima. Daarboven schopt de spamclassifier aan en beperkt distributie. Hashtags zijn een klein relevantiesignaal, geen bereik-multiplier.",
          },
          {
            claim: "Externe links doden je bereik",
            reality: 
              "Niet meer. Sinds Q1 2026 meet LinkedIn dwell time voordat wordt besloten te beperken. Een goed geschreven post met een contextuele link verslaat een link-loze post zonder substantie.",
          },
          {
            claim: "Er is een beste tijd om te posten",
            reality: 
              "Er is een beste tijd voor JOUW publiek. Generieke «8 uur dinsdag»-adviezen zijn waardeloos — kijk wanneer je connecties echt online en betrokken zijn, varieert enorm per industrie.",
          },
          {
            claim: "Engagement-pods werken",
            reality: 
              "Werkten. LinkedIn's classifier detecteert nu herhaalde cross-engagement tussen dezelfde accounts en devalueert de boost. Echte engagement schaalt, kunstmatige niet.",
          },
          {
            claim: "Posts met afbeeldingen winnen altijd",
            reality: 
              "Alleen-tekst posts presteren vaak beter dan posts met stockfoto's. Wat telt is dwell time — als de afbeelding geen signaal toevoegt, vertraagt het alleen het lezen en vermindert de hook-effectiviteit.",
          },
        ],
      },
      aiCta: {
        title: "Stop met gokken. Schrijf posts die het algoritme echt beloont.",
        subtitle: 
          "Posty is getraind op duizenden posts die in 2025 en 2026 viraal gingen. Genereert hook, structuur en CTA gekalibreerd voor de bovengenoemde signalen — in seconden.",
        button: "Posty gratis proberen",
      },
      faqTitle: "LinkedIn-algoritme FAQ",
      faq: [
        {
          question: "Hoe vaak moet ik op LinkedIn posten voor het algoritme?",
          answer: 
            "3 tot 5 keer per week is de sweet spot voor de meeste creators. Dagelijks posten kan werken als je de kwaliteit volhoudt — maar één doordachte post verslaat vijf haastige altijd. Consistentie over maanden telt meer dan pure frequentie.",
        },
        {
          question: "Straft het LinkedIn-algoritme externe links?",
          answer: 
            "Niet meer sinds begin 2026. Externe links beperkten eerder automatisch het bereik, maar LinkedIn meet nu dwell time op de post zelf voor de beslissing. Als je post aandacht verdient, gaat de link mee.",
        },
        {
          question: "Wat is de beste tijd om op LinkedIn te posten?",
          answer: 
            "Er is geen universeel antwoord. Check je eigen analytics voor wanneer je publiek het meest betrokken is — varieert enorm per industrie, land en rol. Dinsdag tot donderdag ochtenden werken voor de meeste B2B-doelgroepen.",
        },
        {
          question: "Waarom krijgen sommige posts 0 views?",
          answer: 
            "Drie veelvoorkomende oorzaken: de spamclassifier markeerde de post (hashtag stuffing, engagement bait, AI-overduidelijke patronen), het seed-publiek engageerde niet in het eerste uur, of je historische engagement-ratio is zo laag dat het algoritme je niet test met genoeg mensen.",
        },
        {
          question: "Tellen reacties of likes meer?",
          answer: 
            "Reacties domineren. Eén substantiële reactie is meer waard dan 10 likes. Een wederzijdse thread waar de originele becommentarieer opnieuw reageert is veel meer waard dan een one-shot reactie.",
        },
        {
          question: "Straft LinkedIn AI-gegenereerde content?",
          answer: 
            "LinkedIn verbiedt geen AI-posts, maar devalueert generieke AI-patronen: overmatig gelisteerd content, stereotype openers, holle «leadership»-adviezen en voor de hand liggende ChatGPT-structuur. Menselijke specifieke — namen, cijfers, onverwachte meningen — worden beloond.",
        },
        {
          question: "Wat telt als «dwell time» op LinkedIn?",
          answer: 
            "Hoe lang iemand pauzeert op je post voordat hij verder scrollt. Klikken op «Meer zien» is de sterkste proxy. Lange posts die aandacht vasthouden verslaan korte posts die worden gescand.",
        },
        {
          question: "Hoe lang verdient een LinkedIn-post door aan bereik?",
          answer: 
            "De meeste posts pieken binnen 24 uur en vervallen snel. Virale posts kunnen 48 tot 72 uur impressies blijven accumuleren. Een zeer kleine subset — hoogdeelbare evergreen content — blijft weken engagement verdienen.",
        },
      ],
      aboutAlgorithmLabel: "Over het LinkedIn-algoritme",
      internalLinks: [
        {
          label: "LinkedIn-postideeën",
          href: "/linkedin-post-ideas",
        },
        {
          label: "LinkedIn-postvoorbeelden",
          href: "/linkedin-post-examples",
        },
        {
          label: "LinkedIn-postgenerator AI",
          href: "/ai-linkedin-post-generator",
        },
        {
          label: "Schrijf een LinkedIn-post",
          href: "/write-linkedin-post",
        },
        {
          label: "Gratis aanmelden",
          href: "/signup",
        },
      ],
      exploreMore: "Meer bronnen",
      finalCta: {
        title: "Begrijp het algoritme. Delegeer het schrijven.",
        subtitle: 
          "Posty schrijft posts gekalibreerd voor de exacte signalen op deze pagina — hooks voor dwell time, structuur voor reacties, toon voor je niche. Genereer je eerste post gratis.",
        button: "Beter schrijven starten",
      },
    },

  zh: {
      meta: {
        title: "LinkedIn 算法 2026：它到底如何运作 | Posty",
        description: "LinkedIn 算法在 2026 年如何对帖子进行排名 —— 4 个分发阶段、5 个关键排名信号、今年发生了什么变化，以及 7 个经过验证仍然有效的策略。",
      },
      breadcrumb: "LinkedIn 算法",
      badge: "2026 算法指南",
      heroTitle: "了解",
      heroTitleHighlight: "LinkedIn 算法",
      heroSubtitle: "LinkedIn 没有公开其排名代码，但十年的工程博客、专利文件和一致的创作者实验已经确定了它的实际运作方式。这里是实用的无废话版本。",
      ctaPrimary: "用 AI 写出更好的帖子",
      ctaSecondary: "查看详细分解",
      tldr: {
        label: "简要",
        body: 
          "LinkedIn 在 4 个阶段对每个帖子进行评分：质量检查、在小范围种子受众中测试、评估互动，然后在信号强烈时进行病毒式分发。最重要的信号 —— 按顺序 —— 是有意义的评论、停留时间、内容相关性、创作者权威性和连接强度。其余都是噪音。",
      },
      phasesSection: {
        title: "4 个分发阶段",
        subtitle: "你的帖子在到达大量受众之前会经过 4 个自动检查点。了解每一个会告诉你实际在哪里失去覆盖率。",
        phases: [
          {
            title: "质量检查（垃圾邮件过滤）",
            description: "发布后几秒钟内，LinkedIn 会通过分类器运行帖子，标记垃圾邮件、低质量或违规内容。过多的主题标签、没有上下文的外部链接、通用的互动诱饵或 AI 明显的模式会在此处被降级 —— 通常是悄悄地。",
            outcomeLabel: "结果",
            outcome: "低质量帖子在分发开始前就被限制了。",
          },
          {
            title: "种子受众测试",
            description: "该帖子会向您网络的一小部分（50 到几百人）显示 —— 按连接强度、过去互动和主题相关性选择。此测试窗口的前 60 分钟至关重要。",
            outcomeLabel: "结果",
            outcome: "如果互动率超过阈值，帖子将继续。",
          },
          {
            title: "互动评估",
            description: "LinkedIn 权衡种子测试期间发生的事情：评论与查看比率、停留时间、分享量、互动个人资料的权威性。活跃创作者的有意义评论的价值远远超过被动点赞。",
            outcomeLabel: "结果",
            outcome: "强烈信号会触发扩展到更广泛的订阅源。",
          },
          {
            title: "病毒式分发",
            description: 
              "如果帖子通过阈值，LinkedIn 会将其推送到二级连接及更远处 —— 对该主题感兴趣的用户，而不仅仅是您的网络。这里的覆盖率会增加 10 倍到 100 倍。病毒式帖子可以在 48 到 72 小时内继续获得展示次数。",
            outcomeLabel: "结果",
            outcome: "覆盖率继续增加，直到互动减弱。",
          },
        ],
      },
      signalsSection: {
        title: "真正改变局面的 5 个信号",
        subtitle: "LinkedIn 考虑了数十个因素。实际上，这五个因素解释了为什么一个帖子起飞而另一个没有的 90% 原因。",
        signals: [
          {
            emoji: "💬",
            title: "有意义的评论",
            description: "不是表情符号，不是单字回复。实质性的评论 —— 特别是那些引发来回交流的 —— 表明您的内容值得停留。单一最重要的正面信号。",
            weightLabel: "最高权重",
          },
          {
            emoji: "⏱️",
            title: "停留时间",
            description: "人们在您的帖子上停止滚动的时间长度。保持注意力的长帖子胜过被略过滚动的短帖子。点击「查看更多」是可衡量的代理指标。",
            weightLabel: "高",
          },
          {
            emoji: "🎯",
            title: "内容相关性",
            description: "算法将您的主题与每个观众推断出的兴趣相匹配。保持在一致细分领域的帖子建立主题权威，随着时间推移会被展示给更紧密、更相关的受众。",
            weightLabel: "高",
          },
          {
            emoji: "🏆",
            title: "创作者权威",
            description: "LinkedIn 跟踪您的历史互动率、发帖频率、网络质量。有稳定互动的持续创作者在每个帖子上都会获得基础提升。",
            weightLabel: "中",
          },
          {
            emoji: "🔗",
            title: "连接强度",
            description: "按过去的互动加权 —— 之前点赞或评论过您的帖子的人在种子受众中被高度优先。重新连接休眠联系人会让您损失早期窗口的互动。",
            weightLabel: "中",
          },
        ],
      },
      recentChanges: {
        title: "2026 年的变化",
        subtitle: "LinkedIn 一直在大力重新调整分发。今年的四项变化对您实际应该发布的内容影响最大。",
        changes: [
          {
            label: "2026 年第一季度",
            title: "外部链接惩罚减轻",
            description: "带有外部链接的帖子不再自动受限。LinkedIn 开始在帖子本身获得足够停留时间时奖励链接 —— 实际上要求链接由内容赢得。",
          },
          {
            label: "2026 年第二季度",
            title: "视频在专业主题上获得优先",
            description: "短竖屏视频（不到 90 秒）在 B2B/职业主题上的覆盖率比纯文本高 2 到 3 倍。前 3 秒的字幕和强力钩子比制作质量更重要。",
          },
          {
            label: "持续",
            title: "AI 生成内容检测",
            description: "具有通用 AI 模式（过度列表、模板化开头、空洞的思想领导力）的帖子越来越被降级。解决方法：具体性 —— 真实姓名、真实数字、真实亲身经历。",
          },
          {
            label: "持续",
            title: "评论质量加权",
            description: "超过 12 个词的评论比短评论重要得多。相互评论循环（pod）仍可检测并被贬值 —— 有机深度胜出。",
          },
        ],
      },
      tipsSection: {
        title: "2026 年仍然有效的 7 种策略",
        subtitle: "这些不是黑客。这些是在 2025 年和 2026 年分析的数千个帖子中与覆盖率相关的模式。",
        tips: [
          {
            title: "赢得前 60 分钟",
            description: "在您的核心受众真正在线时发布。您的帖子在第一个小时获得的互动决定了它是否能通过种子受众测试。查看您的分析以了解您的个人高峰时段。",
          },
          {
            title: "前 2 行的钩子",
            description: "这是「查看更多」之前唯一可见的行。具体的、意想不到的或略带反对的开头会触发点击 —— LinkedIn 将其衡量为停留时间。",
          },
          {
            title: "触发评论，而不只是点赞",
            description: "以需要意见的问题结束帖子，而不是是/否。在前 2 小时内回复每一条评论以保持线程活跃 —— 线程深度是强烈信号。",
          },
          {
            title: "每周持续发布 3 到 5 次",
            description: "创作者权威会累积。连续 3 个月周一-周三-周五发帖胜过第 1 周发 20 个帖子然后沉默。LinkedIn 奖励持续出现的创作者。",
          },
          {
            title: "在明确的细分领域坚持 6 个月",
            description: "在不相关的主题之间跳跃会重置您的主题权威。选择一条狭窄的车道并主导它 —— 算法最终会将您的帖子推送给关心的人。",
          },
          {
            title: "使用原生格式，而不是转发",
            description: "原创文本、原生视频、原生文档和原生投票都胜过链接分享。文档（PDF 轮播）的平均停留时间特别高。",
          },
          {
            title: "像人一样写作，而不是像 LinkedIn",
            description: "公式化的「领导力」帖子、空洞的励志内容和明显的 ChatGPT 结构会被降级。具体的故事、不寻常的观点和独特的经历会得到奖励。",
          },
        ],
      },
      mythsSection: {
        title: "常见神话，已事实核查",
        subtitle: "这些说法每年都会传播。没有一个能经受住真实数据的考验。",
        mythLabel: "神话",
        realityLabel: "现实",
        myths: [
          {
            claim: "更多的主题标签 = 更多的覆盖率",
            reality: "3 到 5 个相关主题标签可以。超过这个数量，垃圾邮件分类器就会启动并限制分发。主题标签是一个小的相关性信号，而不是覆盖率乘数。",
          },
          {
            claim: "外部链接会扼杀你的覆盖率",
            reality: "不再是了。自 2026 年第一季度起，LinkedIn 在决定限制之前测量停留时间。一个写得很好、带有上下文链接的帖子胜过一个没有链接但没有实质内容的帖子。",
          },
          {
            claim: "有一个最佳发布时间",
            reality: "有一个最适合您的受众的时间。通用的「周二早上 8 点」建议毫无价值 —— 查看您的连接实际在线和参与的时间，这因行业而异。",
          },
          {
            claim: "互动 pod 有效",
            reality: "曾经有效。LinkedIn 的分类器现在会检测相同账户之间重复的交叉互动并贬值提升。真实的互动会扩展，人工的不会。",
          },
          {
            claim: "带图片的帖子总是赢",
            reality: "纯文本帖子通常胜过带有库存图片的帖子。重要的是停留时间 —— 如果图片不增加信号，它只会减慢阅读速度并降低钩子的有效性。",
          },
        ],
      },
      aiCta: {
        title: "停止猜测。写出算法真正奖励的帖子。",
        subtitle: "Posty 是在 2025 年和 2026 年数千个病毒式帖子上训练的。它生成针对上述信号校准的钩子、结构和 CTA —— 只需几秒钟。",
        button: "免费试用 Posty",
      },
      faqTitle: "LinkedIn 算法常见问题",
      faq: [
        {
          question: "我应该多久发布一次 LinkedIn 帖子才能适应算法？",
          answer: "对大多数创作者来说，每周 3 到 5 次是最佳点。如果您能保持质量，每天发布也可以 —— 但一个深思熟虑的帖子总是胜过五个仓促的帖子。数月的一致性比原始频率更重要。",
        },
        {
          question: "LinkedIn 算法会惩罚外部链接吗？",
          answer: "自 2026 年初以来不再。外部链接过去会自动限制覆盖率，但 LinkedIn 现在在决定之前会测量帖子本身的停留时间。如果您的帖子获得关注，链接会随之而来。",
        },
        {
          question: "在 LinkedIn 上发布的最佳时间是什么？",
          answer: "没有普遍的答案。查看您自己的分析以了解您的受众何时参与最多 —— 这因行业、国家和角色而异。周二至周四早晨适合大多数 B2B 受众。",
        },
        {
          question: "为什么有些帖子的浏览量为 0？",
          answer: "三个常见原因：垃圾邮件分类器标记了该帖子（主题标签堆砌、互动诱饵、AI 明显模式），种子受众在第一个小时内未参与，或者您的历史互动率太低以至于算法无法用足够的人来测试您。",
        },
        {
          question: "评论还是点赞更重要？",
          answer: "评论占主导地位。一个有实质内容的评论胜过 10 个点赞。原始评论者再次回复的互惠线程比一次性评论更有价值。",
        },
        {
          question: "LinkedIn 会惩罚 AI 生成的内容吗？",
          answer: 
            "LinkedIn 不禁止 AI 帖子，但会降级通用的 AI 模式：过度列出的内容、模板化开头、空洞的「领导力」建议和明显的 ChatGPT 结构。人类的具体内容 —— 姓名、数字、意外观点 —— 会得到奖励。",
        },
        {
          question: "LinkedIn 上的「停留时间」算什么？",
          answer: "某人在继续滚动之前暂停在您的帖子上的时间长度。点击「查看更多」是最强的代理指标。保持注意力的长帖子胜过被略过的短帖子。",
        },
        {
          question: "LinkedIn 帖子会持续获得覆盖率多长时间？",
          answer: "大多数帖子在 24 小时内达到峰值并迅速衰减。病毒式帖子可以在 48 至 72 小时内继续累积展示次数。一个非常小的子集 —— 高度可分享的常青内容 —— 会持续数周获得互动。",
        },
      ],
      aboutAlgorithmLabel: "关于 LinkedIn 算法",
      internalLinks: [
        {
          label: "LinkedIn 帖子创意",
          href: "/linkedin-post-ideas",
        },
        {
          label: "LinkedIn 帖子示例",
          href: "/linkedin-post-examples",
        },
        {
          label: "LinkedIn 帖子生成器 AI",
          href: "/ai-linkedin-post-generator",
        },
        {
          label: "撰写 LinkedIn 帖子",
          href: "/write-linkedin-post",
        },
        {
          label: "免费注册",
          href: "/signup",
        },
      ],
      exploreMore: "更多资源",
      finalCta: {
        title: "理解算法。委派写作。",
        subtitle: "Posty 撰写针对此页面上确切信号校准的帖子 —— 用于停留时间的钩子、用于评论的结构、用于您细分领域的语气。免费生成您的第一个帖子。",
        button: "开始更好地写作",
      },
    },

  ja: {
      meta: {
        title: "LinkedIn アルゴリズム 2026：実際の仕組み | Posty",
        description: "2026 年の LinkedIn アルゴリズムによる投稿ランキングの仕組み — 4 つの配信フェーズ、5 つの主要シグナル、今年の変更点、そして今でも通用する 7 つの実証済み戦術。",
      },
      breadcrumb: "LinkedIn アルゴリズム",
      badge: "2026 アルゴリズムガイド",
      heroTitle: "",
      heroTitleHighlight: "LinkedIn アルゴリズム",
      heroSubtitle: 
        "LinkedIn はランキングコードを公開していませんが、10 年分のエンジニアリングブログ、特許出願、そして一貫したクリエイター実験により、実際の動作が特定されています。ここでは実用的で飾り気のないバージョンを紹介します。",
      ctaPrimary: "AI でより良い投稿を書く",
      ctaSecondary: "詳細を見る",
      tldr: {
        label: "概要",
        body: 
          "LinkedIn は各投稿を 4 フェーズでスコアリングします：品質チェック、シード受容者でのテスト、エンゲージメント評価、そしてシグナルが強ければバイラル配信。最も重要なシグナル（順番に）は、意味のあるコメント、ドウェルタイム、コンテンツの関連性、クリエイターの権威、接続の強さです。それ以外はノイズです。",
      },
      phasesSection: {
        title: "4 つの配信フェーズ",
        subtitle: "投稿は大きな受容者に到達する前に 4 つの自動チェックポイントを通過します。それぞれを理解することで、実際にどこでリーチを失っているかがわかります。",
        phases: [
          {
            title: "品質チェック（スパムフィルター）",
            description: 
              "公開から数秒以内に、LinkedIn はスパム、低品質、またはポリシー違反コンテンツをフラグする分類器を通して投稿を実行します。ハッシュタグの過剰使用、文脈のない外部リンク、汎用のエンゲージメントベイト、または AI の明らかなパターンはここで下位に置かれます — 多くの場合静かに。",
            outcomeLabel: "結果",
            outcome: "低品質な投稿は配信が始まる前に制限されます。",
          },
          {
            title: "シード受容者テスト",
            description: "投稿はあなたのネットワークの一部（50 人から数百人）に表示されます — 接続の強さ、過去のエンゲージメント、トピックの関連性で選ばれます。このテストウィンドウの最初の 60 分が重要です。",
            outcomeLabel: "結果",
            outcome: "エンゲージメント率が閾値を超えれば、投稿は進みます。",
          },
          {
            title: "エンゲージメント評価",
            description: 
              "LinkedIn はシードテスト中に起こったことを重み付けします：コメント対ビュー比率、ドウェルタイム、シェアの量、エンゲージしたプロファイルの権威。アクティブなクリエイターからの意味のあるコメントは、パッシブな「いいね」よりも指数関数的に価値があります。",
            outcomeLabel: "結果",
            outcome: "強いシグナルはより広いフィードへの拡大をトリガーします。",
          },
          {
            title: "バイラル配信",
            description: 
              "投稿が閾値をクリアすると、LinkedIn はそれを 2 次接続以降にプッシュします — トピックに興味のあるユーザー、あなたのネットワークだけではありません。ここでリーチが 10 倍から 100 倍に増加します。バイラル投稿は 48 から 72 時間インプレッションを獲得し続けることができます。",
            outcomeLabel: "結果",
            outcome: "エンゲージメントが衰えるまでリーチは積み重なります。",
          },
        ],
      },
      signalsSection: {
        title: "本当に動きを生み出す 5 つのシグナル",
        subtitle: "LinkedIn は多くの要因を考慮しています。実際には、これら 5 つが、1 つの投稿が離陸し、別の投稿が離陸しない理由の 90% を説明しています。",
        signals: [
          {
            emoji: "💬",
            title: "意味のあるコメント",
            description: "絵文字ではなく、一言の返信ではありません。実質的なコメント — 特にやり取りを引き起こすもの — は、あなたのコンテンツが一時停止に値することを示します。最も重いポジティブシグナル単体。",
            weightLabel: "最高重み",
          },
          {
            emoji: "⏱️",
            title: "ドウェルタイム",
            description: "人々があなたの投稿でスクロールを止める時間の長さ。注目を保つ長い投稿は、流し読みされる短い投稿に勝ります。「もっと見る」クリックは測定可能な代理指標です。",
            weightLabel: "高",
          },
          {
            emoji: "🎯",
            title: "コンテンツの関連性",
            description: "アルゴリズムはあなたのトピックを各視聴者の推測された興味と一致させます。一貫したニッチに留まる投稿はトピック権威を構築し、時間の経過とともにより厳密で関連性の高い受容者に表示されます。",
            weightLabel: "高",
          },
          {
            emoji: "🏆",
            title: "クリエイターの権威",
            description: 
              "LinkedIn は、あなたの歴史的なエンゲージメント率、投稿頻度、ネットワークの質を追跡します。しっかりとしたエンゲージメントを持つ一貫したクリエイターは、すべての投稿にベースラインブーストを得ます。",
            weightLabel: "中",
          },
          {
            emoji: "🔗",
            title: "接続の強さ",
            description: "過去の相互作用で重み付けされます — 以前にあなたの投稿にいいねやコメントをした人は、シード受容者で優先されます。休眠中の連絡先との再接続は、早期ウィンドウのエンゲージメントにコストがかかります。",
            weightLabel: "中",
          },
        ],
      },
      recentChanges: {
        title: "2026 年に変わったこと",
        subtitle: "LinkedIn は配信を積極的に再調整しています。今年の 4 つの変更は、あなたが実際に投稿すべきものに最大の影響を与えます。",
        changes: [
          {
            label: "2026 年 Q1",
            title: "外部リンクペナルティが緩和",
            description: 
              "外部リンク付きの投稿は、自動的にキャップされなくなりました。LinkedIn は、投稿自体が実質的なドウェルタイムを獲得した場合にリンクを報酬し始めました — 効果的にリンクがコンテンツによって獲得される必要があります。",
          },
          {
            label: "2026 年 Q2",
            title: "プロフェッショナルなトピックでビデオが優先される",
            description: "ショート縦型ビデオ投稿（90 秒未満）は、テキストのみと比較して B2B/キャリアトピックで 2 〜 3 倍のリーチを見ています。最初の 3 秒のキャプションと強いフックは、制作品質よりも重要です。",
          },
          {
            label: "継続中",
            title: "AI 生成コンテンツの検出",
            description: "汎用的な AI パターン（過剰なリスト、定型的な冒頭、中身のないソートリーダーシップ）を持つ投稿は、ますます下位に置かれています。修正は具体性です：実名、実数、実体験。",
          },
          {
            label: "継続中",
            title: "コメント品質の重み付け",
            description: "12 語を超えるコメントは、短いコメントよりも大幅に重要です。相互コメントループ（ポッド）は依然として検出可能で、価値が下がっています — オーガニックな深さが勝ちます。",
          },
        ],
      },
      tipsSection: {
        title: "2026 年でも機能する 7 つの戦術",
        subtitle: "ハックではありません。2025 年と 2026 年に分析された何千もの投稿でリーチと相関するパターンです。",
        tips: [
          {
            title: "最初の 60 分を制す",
            description: 
              "コアオーディエンスが本当にオンラインのときに投稿してください。投稿が最初の時間で獲得するエンゲージメントは、シード受容者テストを抜け出すかどうかを決定します。個人のピークウィンドウのために分析を確認してください。",
          },
          {
            title: "最初の 2 行のフック",
            description: "「もっと見る」の前に表示される唯一の行です。具体的、予想外、またはやや逆張りな冒頭はクリックをトリガーします — LinkedIn はこれをドウェルタイムとして測定します。",
          },
          {
            title: "いいねだけでなくコメントをトリガー",
            description: "はい / いいえではなく意見が必要な質問で投稿を終えます。最初の 2 時間以内にすべてのコメントに返信してスレッドを生かし続けてください — スレッドの深さは強いシグナルです。",
          },
          {
            title: "週に 3 〜 5 回、一貫して投稿する",
            description: "クリエイターの権威は蓄積されます。月水金を 3 か月続けることは、第 1 週に 20 投稿してその後沈黙するよりも勝ります。LinkedIn は姿を現すクリエイターを報酬します。",
          },
          {
            title: "6 か月間、明確なニッチに留まる",
            description: "無関係なトピック間でジャンプすると、トピックの権威がリセットされます。狭い車線を選んでそれを支配してください — アルゴリズムは最終的にあなたの投稿を気にかける人々にプッシュします。",
          },
          {
            title: "ネイティブフォーマットを使用、リポストではなく",
            description: 
              "オリジナルのテキスト、ネイティブビデオ、ネイティブドキュメント、ネイティブポーリングはすべてリンクシェアを上回ります。ドキュメント（PDF カルーセル）は特に非常に高い平均ドウェルタイムを持っています。",
          },
          {
            title: "LinkedIn のようにではなく、人間のように書く",
            description: "定型的な「リーダーシップ」投稿、空虚なモチベーション、明らかな ChatGPT 構造は下位に置かれます。具体的なストーリー、珍しい意見、ユニークな経験が報酬されます。",
          },
        ],
      },
      mythsSection: {
        title: "よくある神話、事実確認済み",
        subtitle: "これらの主張は毎年広まります。実際のデータに対してはどれも持ちこたえません。",
        mythLabel: "神話",
        realityLabel: "現実",
        myths: [
          {
            claim: "ハッシュタグが多い = リーチが多い",
            reality: "3 〜 5 の関連ハッシュタグは問題ありません。それ以上、スパム分類器が作動し、配信を制限します。ハッシュタグは小さな関連性シグナルであり、リーチの乗数ではありません。",
          },
          {
            claim: "外部リンクはリーチを殺す",
            reality: "もうそうではありません。2026 年 Q1 以降、LinkedIn は制限を決定する前にドウェルタイムを測定します。コンテキストリンクを持つよく書かれた投稿は、実体のないリンクなし投稿を上回ります。",
          },
          {
            claim: "投稿するのに最適な時間がある",
            reality: 
              "あなたの特定の受容者にとって最適な時間があります。一般的な「火曜日午前 8 時」のアドバイスは無価値です — 接続が実際にオンラインでエンゲージしている時間を確認してください。業界によって大きく異なります。",
          },
          {
            claim: "エンゲージメントポッドは機能する",
            reality: 
              "機能していました。LinkedIn の分類器は、同じアカウント間の繰り返しのクロスエンゲージメントを検出し、リーチブーストの価値を下げるようになりました。本物のエンゲージメントはスケールし、人工的なものはしません。",
          },
          {
            claim: "画像付きの投稿は常に勝つ",
            reality: "テキストのみの投稿は、ストック画像付きの投稿を上回ることがよくあります。重要なのはドウェルタイムです — 画像がシグナルを追加しない場合、読み取りを遅くし、フックの効果を減らすだけです。",
          },
        ],
      },
      aiCta: {
        title: "推測をやめて、アルゴリズムが実際に報酬する投稿を書きましょう。",
        subtitle: "Posty は 2025 年と 2026 年にバイラルになった何千もの投稿でトレーニングされています。上記のシグナル用に調整されたフック、構造、CTA を生成します — 数秒で。",
        button: "Posty を無料で試す",
      },
      faqTitle: "LinkedIn アルゴリズム FAQ",
      faq: [
        {
          question: "アルゴリズムのために LinkedIn にどれくらいの頻度で投稿すべきですか？",
          answer: 
            "ほとんどのクリエイターにとって、週 3 〜 5 回がスイートスポットです。質を維持できれば毎日の投稿も機能しますが、よく考えられた 1 つの投稿は常に 5 つの急いだものに勝ります。数か月にわたる一貫性は、生の頻度よりも重要です。",
        },
        {
          question: "LinkedIn アルゴリズムは外部リンクを罰しますか？",
          answer: 
            "2026 年初頭以降はしません。外部リンクは自動的にリーチをキャップしていましたが、LinkedIn は現在、決定する前に投稿自体のドウェルタイムを測定します。投稿が注目を集めれば、リンクは一緒に運ばれます。",
        },
        {
          question: "LinkedIn に投稿するのに最適な時間は？",
          answer: 
            "普遍的な答えはありません。受容者が最もエンゲージしている時期について、自分の分析を確認してください — 業界、国、役割によって大きく異なります。ほとんどの B2B 受容者にとって火曜日から木曜日の朝が機能します。",
        },
        {
          question: "なぜ一部の投稿は 0 ビューを取得するのですか？",
          answer: 
            "3 つの一般的な原因：スパム分類器が投稿をフラグした（ハッシュタグスタッフィング、エンゲージメントベイト、AI の明らかなパターン）、シード受容者が最初の時間にエンゲージしなかった、またはあなたの歴史的なエンゲージメント率が低すぎてアルゴリズムがあなたを十分な人々でテストしていない。",
        },
        {
          question: "コメントといいねでは、どちらがより重要ですか？",
          answer: "コメントが優勢です。1 つの実質的なコメントは 10 個のいいねよりも価値があります。元のコメント者が再び返信する相互スレッドは、単発のコメントよりもはるかに価値があります。",
        },
        {
          question: "LinkedIn は AI 生成コンテンツにペナルティを課しますか？",
          answer: 
            "LinkedIn は AI 投稿を禁止しませんが、汎用的な AI パターン（過剰にリストされたコンテンツ、定型的な冒頭、空虚な「リーダーシップ」のアドバイス、明らかな ChatGPT 構造）を下位に置きます。人間の具体性（名前、数字、予想外の意見）が報酬されます。",
        },
        {
          question: "LinkedIn の「ドウェルタイム」とは何を指しますか？",
          answer: "誰かがスクロールする前に投稿で一時停止する時間の長さ。「もっと見る」クリックは最も強い代理指標です。注目を保つ長い投稿は、流し読みされる短い投稿に勝ります。",
        },
        {
          question: "LinkedIn 投稿はどれくらいの期間リーチを獲得し続けますか？",
          answer: 
            "ほとんどの投稿は 24 時間以内にピークに達し、急速に衰えます。バイラル投稿は 48 〜 72 時間インプレッションを獲得し続けることができます。非常に小さなサブセット — 共有性の高いエバーグリーンコンテンツ — は数週間エンゲージメントを獲得し続けますが、まれです。",
        },
      ],
      aboutAlgorithmLabel: "LinkedIn アルゴリズムについて",
      internalLinks: [
        {
          label: "LinkedIn 投稿アイデア",
          href: "/linkedin-post-ideas",
        },
        {
          label: "LinkedIn 投稿例",
          href: "/linkedin-post-examples",
        },
        {
          label: "LinkedIn 投稿ジェネレーター AI",
          href: "/ai-linkedin-post-generator",
        },
        {
          label: "LinkedIn 投稿を書く",
          href: "/write-linkedin-post",
        },
        {
          label: "無料登録",
          href: "/signup",
        },
      ],
      exploreMore: "その他のリソース",
      finalCta: {
        title: "アルゴリズムを理解。執筆を委託。",
        subtitle: "Posty はこのページの正確なシグナル用に調整された投稿を起草します — ドウェルタイム用のフック、コメント用の構造、ニッチ用のトーン。最初の投稿を無料で生成。",
        button: "より良い投稿を書き始める",
      },
    },

  ko: {
      meta: {
        title: "LinkedIn 알고리즘 2026: 실제 작동 방식 | Posty",
        description: "2026년 LinkedIn 알고리즘이 게시물을 순위 매기는 방법 — 4가지 배포 단계, 5가지 핵심 신호, 올해 변경된 것, 그리고 여전히 효과적인 7가지 검증된 전술.",
      },
      breadcrumb: "LinkedIn 알고리즘",
      badge: "2026 알고리즘 가이드",
      heroTitle: "어떻게 작동하는가",
      heroTitleHighlight: "LinkedIn 알고리즘",
      heroSubtitle: 
        "LinkedIn은 순위 코드를 공개하지 않지만, 10년 동안의 엔지니어링 블로그, 특허 출원, 그리고 일관된 크리에이터 실험을 통해 실제 작동 방식이 확인되었습니다. 여기에 실용적이고 군더더기 없는 버전을 소개합니다.",
      ctaPrimary: "AI로 더 나은 게시물 쓰기",
      ctaSecondary: "자세히 보기",
      tldr: {
        label: "요약",
        body: 
          "LinkedIn은 각 게시물을 4단계로 점수를 매깁니다: 품질 검사, 소규모 시드 오디언스에서의 테스트, 참여도 평가, 그리고 신호가 강하면 바이럴 배포. 가장 중요한 신호 — 순서대로 — 는 의미 있는 댓글, 체류 시간, 콘텐츠 관련성, 크리에이터 권위, 연결 강도입니다. 그 외의 것은 잡음입니다.",
      },
      phasesSection: {
        title: "4가지 배포 단계",
        subtitle: "게시물은 대규모 오디언스에 도달하기 전에 4개의 자동 체크포인트를 통과합니다. 각각을 이해하면 실제로 어디서 도달을 잃는지 알 수 있습니다.",
        phases: [
          {
            title: "품질 검사 (스팸 필터)",
            description: 
              "게시 후 몇 초 내에 LinkedIn은 스팸, 저품질 또는 정책 위반 콘텐츠를 표시하는 분류기를 통해 게시물을 실행합니다. 너무 많은 해시태그, 맥락이 없는 외부 링크, 일반적인 참여 미끼 또는 AI가 명백한 패턴은 여기에서 순위가 내려가며 종종 조용히 수행됩니다.",
            outcomeLabel: "결과",
            outcome: "저품질 게시물은 배포가 시작되기 전에 제한됩니다.",
          },
          {
            title: "시드 오디언스 테스트",
            description: "게시물은 네트워크의 작은 부분(50명에서 수백 명)에 표시됩니다 — 연결 강도, 과거 참여도, 주제 관련성에 따라 선택됩니다. 이 테스트 창의 처음 60분이 중요합니다.",
            outcomeLabel: "결과",
            outcome: "참여율이 임계값을 초과하면 게시물이 진행됩니다.",
          },
          {
            title: "참여도 평가",
            description: 
              "LinkedIn은 시드 테스트 중에 발생한 것을 저울질합니다: 댓글 대 조회수 비율, 체류 시간, 공유량, 참여한 프로필의 권위. 활성 크리에이터의 의미 있는 댓글은 수동적인 좋아요보다 기하급수적으로 가치가 있습니다.",
            outcomeLabel: "결과",
            outcome: "강한 신호는 더 넓은 피드로의 확장을 유발합니다.",
          },
          {
            title: "바이럴 배포",
            description: 
              "게시물이 임계값을 통과하면 LinkedIn은 이를 2차 연결 이상으로 푸시합니다 — 주제에 관심이 있는 사용자이며 네트워크만이 아닙니다. 여기에서 도달이 10배에서 100배로 증가합니다. 바이럴 게시물은 48-72시간 동안 계속 노출을 얻을 수 있습니다.",
            outcomeLabel: "결과",
            outcome: "참여도가 감소할 때까지 도달이 누적됩니다.",
          },
        ],
      },
      signalsSection: {
        title: "실제로 차이를 만드는 5가지 신호",
        subtitle: "LinkedIn은 수십 가지 요인을 고려합니다. 실제로 이 5가지가 한 게시물이 뜨고 다른 게시물이 뜨지 않는 이유의 90%를 설명합니다.",
        signals: [
          {
            emoji: "💬",
            title: "의미 있는 댓글",
            description: "이모지가 아니며, 한 단어 답변이 아닙니다. 실질적인 댓글 — 특히 주고받음을 유발하는 것 — 은 콘텐츠가 잠시 멈출 가치가 있음을 알립니다. 가장 무거운 단일 긍정적 신호입니다.",
            weightLabel: "최대 가중치",
          },
          {
            emoji: "⏱️",
            title: "체류 시간",
            description: "사람들이 게시물에서 스크롤을 멈추는 시간. 주의를 끄는 긴 게시물이 훑어보는 짧은 게시물을 이깁니다. '더 보기' 클릭은 측정 가능한 프록시입니다.",
            weightLabel: "높음",
          },
          {
            emoji: "🎯",
            title: "콘텐츠 관련성",
            description: "알고리즘은 주제를 각 시청자의 추론된 관심사와 일치시킵니다. 일관된 틈새에 머무는 게시물은 주제 권위를 구축하고 시간이 지남에 따라 더 긴밀하고 관련성 있는 오디언스에 표시됩니다.",
            weightLabel: "높음",
          },
          {
            emoji: "🏆",
            title: "크리에이터 권위",
            description: "LinkedIn은 과거 참여율, 게시 빈도, 네트워크 품질을 추적합니다. 견고한 참여도를 가진 일관된 크리에이터는 모든 게시물에서 기본 부스트를 받습니다.",
            weightLabel: "중간",
          },
          {
            emoji: "🔗",
            title: "연결 강도",
            description: 
              "과거 상호 작용에 따라 가중됩니다 — 이전에 게시물을 좋아요하거나 댓글을 단 사람들은 시드 오디언스에서 크게 우선 순위가 지정됩니다. 휴면 연락처와 다시 연결하는 것은 초기 창 참여도에 비용이 듭니다.",
            weightLabel: "중간",
          },
        ],
      },
      recentChanges: {
        title: "2026년에 변경된 것",
        subtitle: "LinkedIn은 배포를 공격적으로 재조정하고 있습니다. 올해의 4가지 변경 사항은 실제로 게시해야 할 것에 가장 큰 영향을 미칩니다.",
        changes: [
          {
            label: "2026년 1분기",
            title: "외부 링크 페널티 완화",
            description: 
              "외부 링크가 있는 게시물은 더 이상 자동으로 제한되지 않습니다. LinkedIn은 게시물 자체가 실질적인 체류 시간을 얻을 때 링크에 보상하기 시작했습니다 — 사실상 링크가 콘텐츠로 얻어지도록 요구합니다.",
          },
          {
            label: "2026년 2분기",
            title: "전문 주제에서 동영상 우선",
            description: "짧은 세로 동영상 게시물(90초 미만)은 텍스트 전용 대비 B2B/경력 주제에서 2~3배의 도달을 보입니다. 처음 3초의 캡션과 강력한 훅은 제작 품질보다 더 중요합니다.",
          },
          {
            label: "진행 중",
            title: "AI 생성 콘텐츠 감지",
            description: "일반적인 AI 패턴(과도한 목록, 상용구 시작, 속 빈 사상 리더십)이 있는 게시물은 점점 순위가 내려갑니다. 해결책은 구체성입니다: 실명, 실수, 실제 체험.",
          },
          {
            label: "진행 중",
            title: "댓글 품질 가중치",
            description: "12 단어를 초과하는 댓글은 짧은 댓글보다 훨씬 더 많이 계산됩니다. 상호 댓글 루프(포드)는 여전히 감지 가능하며 가치가 떨어집니다 — 유기적 깊이가 이깁니다.",
          },
        ],
      },
      tipsSection: {
        title: "2026년에도 여전히 효과적인 7가지 전술",
        subtitle: "해킹이 아닙니다. 2025년과 2026년에 분석된 수천 개의 게시물에서 도달과 상관관계를 보이는 패턴입니다.",
        tips: [
          {
            title: "처음 60분을 확보",
            description: "핵심 오디언스가 실제로 온라인일 때 게시하세요. 게시물이 첫 시간에 얻는 참여도가 시드 오디언스 테스트를 탈출할지 결정합니다. 개인 피크 창을 위해 분석을 확인하세요.",
          },
          {
            title: "처음 2줄의 훅",
            description: "'더 보기' 전에 보이는 유일한 줄입니다. 구체적이거나 예상치 못하거나 약간 반대되는 시작은 클릭을 유발합니다 — LinkedIn은 이를 체류 시간으로 측정합니다.",
          },
          {
            title: "좋아요뿐 아니라 댓글을 유발",
            description: "예/아니오가 아니라 의견이 필요한 질문으로 게시물을 끝내세요. 처음 2시간 동안 모든 댓글에 답하여 스레드를 생생하게 유지하세요 — 스레드 깊이는 강한 신호입니다.",
          },
          {
            title: "일관되게 주 3~5회 게시",
            description: "크리에이터 권위는 누적됩니다. 3개월 동안 월-수-금에 게시하는 것이 1주차에 20개를 게시한 후 침묵하는 것을 이깁니다. LinkedIn은 나타나는 크리에이터에게 보상합니다.",
          },
          {
            title: "6개월 동안 명확한 틈새에 머물기",
            description: "관련 없는 주제 사이를 뛰어다니면 주제 권위가 재설정됩니다. 좁은 차선을 선택하고 그것을 지배하세요 — 알고리즘은 결국 관심 있는 사람들에게 게시물을 푸시할 것입니다.",
          },
          {
            title: "리포스트가 아닌 네이티브 형식 사용",
            description: "원본 텍스트, 네이티브 동영상, 네이티브 문서, 네이티브 투표는 모두 링크 공유를 능가합니다. 특히 문서(PDF 캐러셀)는 매우 높은 평균 체류 시간을 가집니다.",
          },
          {
            title: "LinkedIn처럼이 아닌 사람처럼 쓰기",
            description: "공식화된 '리더십' 게시물, 속 빈 동기 부여, 명백한 ChatGPT 구조는 순위가 내려갑니다. 구체적인 이야기, 특이한 의견, 독특한 경험이 보상됩니다.",
          },
        ],
      },
      mythsSection: {
        title: "일반적인 신화, 사실 확인",
        subtitle: "이러한 주장은 매년 퍼집니다. 실제 데이터에 대해 어느 것도 버티지 못합니다.",
        mythLabel: "신화",
        realityLabel: "현실",
        myths: [
          {
            claim: "해시태그가 많을수록 도달이 많다",
            reality: "3~5개의 관련 해시태그는 괜찮습니다. 그 이상이면 스팸 분류기가 켜지고 배포를 제한합니다. 해시태그는 작은 관련성 신호이며 도달 승수가 아닙니다.",
          },
          {
            claim: "외부 링크는 도달을 죽인다",
            reality: "더 이상 아닙니다. 2026년 1분기 이후 LinkedIn은 제한 결정 전에 체류 시간을 측정합니다. 맥락 링크가 있는 잘 쓰인 게시물은 실체 없는 링크 없는 게시물을 능가합니다.",
          },
          {
            claim: "게시하기에 가장 좋은 시간이 있다",
            reality: "당신의 오디언스에게 가장 좋은 시간이 있습니다. 일반적인 '화요일 오전 8시' 조언은 가치가 없습니다 — 연결이 실제로 온라인이고 참여할 때를 확인하세요. 산업별로 크게 다릅니다.",
          },
          {
            claim: "참여 포드가 작동한다",
            reality: "작동했습니다. LinkedIn의 분류기는 이제 동일한 계정 간의 반복되는 크로스 참여를 감지하고 부스트 값을 내립니다. 실제 참여도는 확장되며 인공적인 것은 그렇지 않습니다.",
          },
          {
            claim: "이미지가 있는 게시물은 항상 이긴다",
            reality: "텍스트 전용 게시물은 종종 스톡 이미지가 있는 게시물을 능가합니다. 중요한 것은 체류 시간입니다 — 이미지가 신호를 추가하지 않으면 읽기를 늦추고 훅 효과를 줄일 뿐입니다.",
          },
        ],
      },
      aiCta: {
        title: "추측을 멈추세요. 알고리즘이 실제로 보상하는 게시물을 작성하세요.",
        subtitle: "Posty는 2025년과 2026년에 바이럴이 된 수천 개의 게시물로 훈련되었습니다. 위의 신호에 맞춰 조정된 훅, 구조, CTA를 몇 초 만에 생성합니다.",
        button: "Posty 무료로 시도",
      },
      faqTitle: "LinkedIn 알고리즘 FAQ",
      faq: [
        {
          question: "알고리즘을 위해 LinkedIn에 얼마나 자주 게시해야 하나요?",
          answer: 
            "대부분의 크리에이터에게 주 3~5회가 스윗 스팟입니다. 품질을 유지할 수 있다면 매일 게시도 가능합니다 — 하지만 잘 생각된 게시물은 언제나 서둘러 만든 5개를 이깁니다. 몇 달에 걸친 일관성은 원시 빈도보다 더 중요합니다.",
        },
        {
          question: "LinkedIn 알고리즘은 외부 링크를 처벌합니까?",
          answer: 
            "2026년 초부터는 아닙니다. 외부 링크는 이전에 자동으로 도달을 제한했지만, LinkedIn은 이제 결정을 내리기 전에 게시물 자체의 체류 시간을 측정합니다. 게시물이 주의를 얻으면 링크가 함께 갑니다.",
        },
        {
          question: "LinkedIn에 게시하기 가장 좋은 시간은?",
          answer: 
            "보편적인 답은 없습니다. 자신의 분석을 확인하여 오디언스가 가장 참여하는 때를 확인하세요 — 산업, 국가, 역할에 따라 크게 다릅니다. 대부분의 B2B 오디언스에게 화요일에서 목요일 아침이 효과적입니다.",
        },
        {
          question: "왜 일부 게시물은 0 조회수를 얻습니까?",
          answer: 
            "세 가지 일반적인 원인: 스팸 분류기가 게시물을 표시했습니다(해시태그 스터핑, 참여 미끼, AI가 명백한 패턴), 시드 오디언스가 첫 시간에 참여하지 않았습니다, 또는 과거 참여율이 너무 낮아 알고리즘이 충분한 사람들로 테스트하지 않습니다.",
        },
        {
          question: "댓글이 좋아요보다 더 중요합니까?",
          answer: "댓글이 우세합니다. 하나의 실질적인 댓글은 10개의 좋아요보다 가치가 있습니다. 원래 댓글 작성자가 다시 답하는 상호 스레드는 일회성 댓글보다 훨씬 더 가치가 있습니다.",
        },
        {
          question: "LinkedIn은 AI 생성 콘텐츠에 페널티를 줍니까?",
          answer: 
            "LinkedIn은 AI 게시물을 금지하지 않지만, 일반적인 AI 패턴(과도하게 나열된 콘텐츠, 상용구 시작, 속 빈 '리더십' 조언, 명백한 ChatGPT 구조)은 순위를 내립니다. 사람의 구체성 — 이름, 숫자, 예상치 못한 의견 — 은 보상됩니다.",
        },
        {
          question: "LinkedIn에서 '체류 시간'은 무엇으로 계산됩니까?",
          answer: "누군가가 스크롤하기 전에 게시물에서 일시 중지하는 시간. '더 보기' 클릭은 가장 강한 프록시입니다. 주의를 끄는 긴 게시물은 훑어보는 짧은 게시물을 이깁니다.",
        },
        {
          question: "LinkedIn 게시물은 얼마 동안 도달을 계속 얻습니까?",
          answer: 
            "대부분의 게시물은 24시간 이내에 피크에 도달하고 빠르게 감소합니다. 바이럴 게시물은 48~72시간 동안 노출을 계속 누적할 수 있습니다. 매우 작은 하위 집합 — 매우 공유 가능한 에버그린 콘텐츠 — 은 몇 주 동안 참여도를 얻지만 드뭅니다.",
        },
      ],
      aboutAlgorithmLabel: "LinkedIn 알고리즘 소개",
      internalLinks: [
        {
          label: "LinkedIn 게시물 아이디어",
          href: "/linkedin-post-ideas",
        },
        {
          label: "LinkedIn 게시물 예제",
          href: "/linkedin-post-examples",
        },
        {
          label: "LinkedIn 게시물 생성기 AI",
          href: "/ai-linkedin-post-generator",
        },
        {
          label: "LinkedIn 게시물 작성",
          href: "/write-linkedin-post",
        },
        {
          label: "무료 가입",
          href: "/signup",
        },
      ],
      exploreMore: "추가 리소스",
      finalCta: {
        title: "알고리즘을 이해하세요. 작성은 위임하세요.",
        subtitle: "Posty는 이 페이지의 정확한 신호에 맞춰 조정된 게시물을 작성합니다 — 체류 시간을 위한 훅, 댓글을 위한 구조, 틈새를 위한 톤. 첫 게시물을 무료로 생성하세요.",
        button: "더 나은 게시물 작성 시작",
      },
    },
};
