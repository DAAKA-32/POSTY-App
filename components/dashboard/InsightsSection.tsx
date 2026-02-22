"use client";

import { DashboardStats } from "@/lib/firestore";
import { UserProfile } from "@/types";

interface InsightsSectionProps {
  stats: DashboardStats;
  userStyle?: string;
  userProfile?: UserProfile | null;
}

interface Insight {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: string; // Actionable recommendation
  type: "success" | "info" | "tip" | "coaching";
  priority?: number; // Higher = more important
}

export default function InsightsSection({ stats, userStyle, userProfile }: InsightsSectionProps) {
  // Get user context for personalized insights
  const userObjective = userProfile?.profile?.objective;
  const userSector = userProfile?.profile?.sector;
  const userTargetAudience = userProfile?.profile?.targetAudience;

  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];

    // Style preference insight with actionable advice
    const storytellingCount = stats.styleDistribution.find((s) => s.style === "Storytelling")?.count || 0;
    const businessCount = stats.styleDistribution.find((s) => s.style === "Business")?.count || 0;
    const totalStylePosts = storytellingCount + businessCount;

    if (storytellingCount > businessCount && storytellingCount > 0) {
      const percentage = totalStylePosts > 0 ? Math.round((storytellingCount / totalStylePosts) * 100) : 0;
      insights.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        ),
        title: "Votre force : le Storytelling",
        description: `${percentage}% de vos posts utilisent le Storytelling (${storytellingCount} posts). Ce format génère en moyenne 2x plus d'engagement car il crée une connexion émotionnelle.`,
        action: "Continuez ainsi ! Ajoutez une question en fin de post pour amplifier les commentaires.",
        type: "success",
        priority: 3,
      });
    } else if (businessCount > storytellingCount && businessCount > 0) {
      const percentage = totalStylePosts > 0 ? Math.round((businessCount / totalStylePosts) * 100) : 0;
      insights.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        title: "Expert du format Business",
        description: `${percentage}% de vos posts sont en format Business (${businessCount} posts). Idéal pour affirmer votre expertise et attirer des prospects qualifiés.`,
        action: "Pour maximiser : ajoutez des données chiffrées dans vos posts (stats, résultats, pourcentages).",
        type: "success",
        priority: 3,
      });
    }

    // Personalized coaching based on objective
    if (userObjective) {
      const objectiveInsights: Record<string, Insight> = {
        "Trouver de nouveaux clients": {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
          title: "Conseil acquisition clients",
          description: "Pour attirer des clients sur LinkedIn : terminez chaque post par une question ouverte liée à leurs problèmes. Cela génère des commentaires = visibilité = opportunités.",
          action: "Exemple : \"Quel est votre plus gros défi sur [sujet] ? Je réponds à chaque commentaire.\"",
          type: "coaching",
          priority: 5,
        },
        "Augmenter mon chiffre d'affaires": {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: "Stratégie conversion",
          description: "Pour convertir : montrez votre expertise en action, pas juste en théorie. Partagez des cas concrets, des résultats clients, des avant/après.",
          action: "Format gagnant : Problème client -> Votre approche -> Résultat mesurable -> CTA",
          type: "coaching",
          priority: 5,
        },
        "Développer ma visibilité et crédibilité": {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ),
          title: "Booster votre visibilité",
          description: "Pour la visibilité : publiez à heures fixes (l'algorithme aime la régularité) et répondez à TOUS les commentaires dans l'heure qui suit.",
          action: "Pro tip : les 30 premières minutes après publication sont cruciales pour l'algorithme.",
          type: "coaching",
          priority: 5,
        },
        "Générer des leads qualifiés": {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
          title: "Génération de leads",
          description: "Pour générer des leads : offrez une valeur concrète (checklist, template, conseil actionnable) qui donne envie d'en savoir plus sur vos services.",
          action: "Incluez un CTA clair : \"Commentez [mot] pour recevoir [ressource gratuite]\"",
          type: "coaching",
          priority: 5,
        },
        "Construire une audience engagée": {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          ),
          title: "Engagement maximise",
          description: "Pour l'engagement : posez des questions qui divisent (opinion A vs B). Les debats constructifs generent 3x plus de commentaires que les posts classiques.",
          action: "Exemple : \"Je pense que [opinion tranchee]. D'accord ou pas d'accord ?\"",
          type: "coaching",
          priority: 5,
        },
      };

      const objectiveInsight = objectiveInsights[userObjective];
      if (objectiveInsight) {
        insights.push(objectiveInsight);
      }
    }

    // Activity-based insights with specific recommendations
    if (stats.postsLast7Days > 0) {
      const avgPerDay = stats.postsLast7Days / 7;
      if (avgPerDay >= 1) {
        insights.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
          title: "Excellente régularité !",
          description: `${stats.postsLast7Days} posts cette semaine (${avgPerDay.toFixed(1)}/jour). Vous êtes dans les 10% des utilisateurs les plus actifs. La régularité est le facteur #1 de croissance sur LinkedIn.`,
          action: "Maintenez ce rythme et variez les formats (texte, carrousel, vidéo) pour maximiser la portée.",
          type: "success",
          priority: 4,
        });
      } else if (avgPerDay >= 0.4) {
        insights.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: "Bonne dynamique",
          description: `${stats.postsLast7Days} posts cette semaine. Vous êtes sur la bonne voie ! Pour accélérer votre croissance, visez 4-5 posts/semaine.`,
          action: "Astuce : préparez vos posts en batch le dimanche pour toute la semaine.",
          type: "info",
          priority: 3,
        });
      } else {
        insights.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          title: "Passez a la vitesse superieure",
          description: `Seulement ${stats.postsLast7Days} post(s) cette semaine. L'algorithme LinkedIn favorise les createurs reguliers (3-5 posts/semaine minimum).`,
          action: "Commencez petit : 1 post tous les 2 jours pendant 2 semaines. Vous verrez la difference !",
          type: "tip",
          priority: 4,
        });
      }
    } else if (stats.totalPosts > 0) {
      insights.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        title: "Reprenez le rythme",
        description: "Aucun post cette semaine. L'algorithme LinkedIn pénalise les longues pauses. Reprenez dès maintenant pour ne pas perdre votre momentum.",
        action: "Créez un post aujourd'hui ! Même court, il réactivera votre présence.",
        type: "tip",
        priority: 5,
      });
    }

    // Publication rate insight
    if (stats.publishedPosts > 0 && stats.totalPosts > 0) {
      const publishRate = Math.round((stats.publishedPosts / stats.totalPosts) * 100);
      if (publishRate >= 80) {
        insights.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: "Taux de publication exemplaire",
          description: `${publishRate}% de vos posts sont publies sur LinkedIn (${stats.publishedPosts}/${stats.totalPosts}). Vous mettez en pratique ce que vous creez !`,
          type: "success",
          priority: 2,
        });
      } else if (publishRate >= 50) {
        insights.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          ),
          title: "Publiez plus !",
          description: `${publishRate}% de taux de publication. Vous avez ${stats.totalPosts - stats.publishedPosts} posts non publiés. Chaque post non publié = une opportunité manquée.`,
          action: "Parcourez votre historique et programmez 2-3 posts cette semaine.",
          type: "tip",
          priority: 3,
        });
      } else {
        insights.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          ),
          title: "Passez à l'action",
          description: `Seulement ${publishRate}% de publication. Vous avez ${stats.totalPosts - stats.publishedPosts} posts prêts mais non partagés. C'est du potentiel inexploité !`,
          action: "Connectez LinkedIn et publiez en un clic. Ou utilisez la programmation pour planifier.",
          type: "tip",
          priority: 4,
        });
      }
    } else if (stats.totalPosts > 0 && stats.publishedPosts === 0) {
      insights.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        ),
        title: "Vos posts attendent d'être partagés",
        description: `Vous avez ${stats.totalPosts} posts créés mais aucun publié. Connectez votre compte LinkedIn pour les partager en un clic !`,
        action: "Allez dans votre profil pour connecter LinkedIn.",
        type: "tip",
        priority: 5,
      });
    }

    // Diversity tip based on usage patterns
    if (totalStylePosts >= 5) {
      if (storytellingCount > 0 && businessCount === 0) {
        insights.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          ),
          title: "Testez le format Business",
          description: "100% Storytelling c'est bien, mais diversifier renforce votre crédibilité. Les posts Business avec des données chiffrées attirent une audience différente.",
          action: "Essayez : partagez un résultat concret ou une méthode en format Business.",
          type: "tip",
          priority: 2,
        });
      } else if (businessCount > 0 && storytellingCount === 0) {
        insights.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          ),
          title: "Ajoutez de l'émotion",
          description: "100% Business c'est efficace, mais le Storytelling crée une connexion émotionnelle unique. Les histoires personnelles humanisent votre expertise.",
          action: "Essayez : racontez un échec et ce que vous en avez appris. L'authenticité résonne.",
          type: "tip",
          priority: 2,
        });
      }
    }

    // Sector-specific advice
    if (userSector) {
      if (userSector.includes("Tech") && stats.totalPosts >= 3) {
        insights.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          ),
          title: "Conseil pour la Tech",
          description: "Dans votre secteur, les posts educatifs (tutoriels, explications de concepts) performent 2x mieux que les annonces produit.",
          action: "Partagez un \"TIL\" (Today I Learned) ou expliquez un concept complexe simplement.",
          type: "coaching",
          priority: 3,
        });
      } else if (userSector.includes("Marketing") && stats.totalPosts >= 3) {
        insights.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
          title: "Conseil Marketing",
          description: "En Marketing, la preuve sociale est clé. Montrez vos résultats avec des captures d'écran et des métriques réelles.",
          action: "Partagez un cas avec des chiffres : \"+47% de conversion grâce à [technique]\".",
          type: "coaching",
          priority: 3,
        });
      }
    }

    // Sort by priority and return top 4
    return insights
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 4);
  };

  const insights = generateInsights();

  // Theme-aware premium styles
  const typeStyles = {
    success: {
      bg: "bg-emerald-50 dark:bg-emerald-500/[0.08]",
      border: "border-emerald-200 dark:border-emerald-500/20",
      borderHover: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
      icon: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-100 dark:bg-emerald-500/15",
      actionBg: "bg-emerald-100/50 dark:bg-emerald-500/10",
    },
    info: {
      bg: "bg-blue-50 dark:bg-accent/[0.08]",
      border: "border-blue-200 dark:border-accent/20",
      borderHover: "hover:border-blue-300 dark:hover:border-accent/40",
      icon: "text-blue-600 dark:text-accent",
      iconBg: "bg-blue-100 dark:bg-accent/15",
      actionBg: "bg-blue-100/50 dark:bg-accent/10",
    },
    tip: {
      bg: "bg-amber-50 dark:bg-amber-500/[0.08]",
      border: "border-amber-200 dark:border-amber-500/20",
      borderHover: "hover:border-amber-300 dark:hover:border-amber-500/40",
      icon: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-100 dark:bg-amber-500/15",
      actionBg: "bg-amber-100/50 dark:bg-amber-500/10",
    },
    coaching: {
      bg: "bg-violet-50 dark:bg-violet-500/[0.08]",
      border: "border-violet-200 dark:border-violet-500/20",
      borderHover: "hover:border-violet-300 dark:hover:border-violet-500/40",
      icon: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-100 dark:bg-violet-500/15",
      actionBg: "bg-violet-100/50 dark:bg-violet-500/10",
    },
  };

  if (insights.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 sm:p-6 hover:border-gray-300 dark:hover:border-dark-border-hover transition-colors duration-200">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Coach IA</h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-dark-elevated rounded-full flex items-center justify-center border border-gray-200 dark:border-dark-border">
            <svg className="w-8 h-8 text-gray-400 dark:text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-text-secondary">Générez quelques posts pour recevoir vos premiers conseils personnalisés</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 sm:p-6 hover:border-gray-300 dark:hover:border-dark-border-hover transition-colors duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Coach IA</h3>
          <p className="text-gray-500 dark:text-text-muted text-sm">Conseils personnalises pour votre croissance</p>
        </div>
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
          <span className="text-lg">🎯</span>
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`
              p-4 rounded-xl border
              ${typeStyles[insight.type].bg}
              ${typeStyles[insight.type].border}
              ${typeStyles[insight.type].borderHover}
              transition-colors duration-200
            `}
          >
            <div className="flex gap-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${typeStyles[insight.type].iconBg} flex items-center justify-center`}>
                <span className={typeStyles[insight.type].icon}>{insight.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-text-primary mb-1">{insight.title}</h4>
                <p className="text-xs text-gray-600 dark:text-text-secondary leading-relaxed mb-2">{insight.description}</p>
                {insight.action && (
                  <div className={`text-xs ${typeStyles[insight.type].actionBg} rounded-lg px-3 py-2 ${typeStyles[insight.type].icon} font-medium leading-relaxed`}>
                    {insight.action}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
