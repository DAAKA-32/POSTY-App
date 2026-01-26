"use client";

import { DashboardStats } from "@/lib/firestore";

interface InsightsSectionProps {
  stats: DashboardStats;
  userStyle?: string;
}

interface Insight {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: "success" | "info" | "tip";
}

export default function InsightsSection({ stats, userStyle }: InsightsSectionProps) {
  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];

    // Style preference insight
    const storytellingCount = stats.styleDistribution.find((s) => s.style === "Storytelling")?.count || 0;
    const businessCount = stats.styleDistribution.find((s) => s.style === "Business")?.count || 0;

    if (storytellingCount > businessCount && storytellingCount > 0) {
      insights.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        ),
        title: "Style Storytelling prefere",
        description: `Vous privilegiez le style Storytelling (${storytellingCount} posts). Ce format emotionnel genere souvent plus d'engagement.`,
        type: "success",
      });
    } else if (businessCount > storytellingCount && businessCount > 0) {
      insights.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        title: "Style Business prefere",
        description: `Vous privilegiez le style Business (${businessCount} posts). Parfait pour une communication directe et professionnelle.`,
        type: "success",
      });
    }

    // Activity insight
    if (stats.postsLast7Days > 0) {
      const avgPerDay = (stats.postsLast7Days / 7).toFixed(1);
      if (parseFloat(avgPerDay) >= 1) {
        insights.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
          title: "Excellente regularite",
          description: `Vous publiez en moyenne ${avgPerDay} post(s) par jour. La regularite est cle pour developper votre audience.`,
          type: "success",
        });
      } else {
        insights.push({
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: "Conseil regularite",
          description: `Avec ${stats.postsLast7Days} posts cette semaine, essayez de publier plus regulierement pour maximiser votre visibilite.`,
          type: "tip",
        });
      }
    }

    // Publication insight
    if (stats.publishedPosts > 0) {
      const publishRate = Math.round((stats.publishedPosts / stats.totalPosts) * 100);
      insights.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        ),
        title: "Taux de publication",
        description: `${publishRate}% de vos posts ont ete publies sur LinkedIn. Continuez a partager votre expertise !`,
        type: "info",
      });
    } else if (stats.totalPosts > 0) {
      insights.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        ),
        title: "Passez a l'action",
        description: "Vous avez des posts prets a etre publies. Connectez LinkedIn pour les partager en un clic !",
        type: "tip",
      });
    }

    // Diversity tip
    if (storytellingCount > 0 && businessCount === 0) {
      insights.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ),
        title: "Testez le style Business",
        description: "Diversifiez votre contenu en testant le format Business pour toucher une audience differente.",
        type: "tip",
      });
    } else if (businessCount > 0 && storytellingCount === 0) {
      insights.push({
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ),
        title: "Testez le Storytelling",
        description: "Le format Storytelling cree une connexion emotionnelle forte avec votre audience.",
        type: "tip",
      });
    }

    return insights.slice(0, 4); // Max 4 insights
  };

  const insights = generateInsights();

  // Dark mode premium - Couleurs distinctes et lisibles
  const typeStyles = {
    success: {
      bg: "bg-emerald-500/[0.08]",
      border: "border-emerald-500/20",
      borderHover: "hover:border-emerald-500/40",
      icon: "text-emerald-400",
      iconBg: "bg-emerald-500/15",
    },
    info: {
      bg: "bg-accent/[0.08]",
      border: "border-accent/20",
      borderHover: "hover:border-accent/40",
      icon: "text-accent",
      iconBg: "bg-accent/15",
    },
    tip: {
      bg: "bg-amber-500/[0.08]",
      border: "border-amber-500/20",
      borderHover: "hover:border-amber-500/40",
      icon: "text-amber-400",
      iconBg: "bg-amber-500/15",
    },
  };

  if (insights.length === 0) {
    return (
      <div className="bg-dashboard-card border border-dashboard-card-border rounded-2xl p-6 hover:border-primary/10 transition-colors duration-300">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Insights intelligents</h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-dashboard-surface-1 rounded-full flex items-center justify-center border border-dashboard-card-border">
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-text-secondary">Generez quelques posts pour recevoir des insights personnalises</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dashboard-card border border-dashboard-card-border rounded-2xl p-6 hover:border-primary/10 transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Insights intelligents</h3>
          <p className="text-text-muted text-sm">Conseils personnalises pour progresser</p>
        </div>
        <div className="w-10 h-10 bg-accent/[0.12] rounded-xl flex items-center justify-center border border-accent/20">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
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
              transition-all duration-300 hover:translate-x-1
            `}
          >
            <div className="flex gap-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${typeStyles[insight.type].iconBg} flex items-center justify-center`}>
                <span className={typeStyles[insight.type].icon}>{insight.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-text-primary mb-1">{insight.title}</h4>
                <p className="text-xs text-text-secondary leading-relaxed">{insight.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
