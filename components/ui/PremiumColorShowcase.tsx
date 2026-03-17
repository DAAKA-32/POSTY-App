"use client";

import { motion } from "framer-motion";
import {
  storytellingColors,
  tipsColors,
  opinionColors,
  victoryColors,
  lessonColors,
  engagementColors,
  componentPresets,
  getColorScheme,
} from "@/lib/ui/design-system-colors";

/**
 * PremiumColorShowcase - Demonstration component showing the new color system
 *
 * This component showcases the autoscroll-inspired colors across the application.
 * Use this as a reference for implementing premium, warm colors everywhere.
 *
 * Design philosophy:
 * - Warm, engaging colors that guide users naturally
 * - Educational and professional tone
 * - Consistent with PostTemplates autoscroll
 * - Premium, modern SaaS aesthetic
 */

interface ColorCategoryProps {
  category: "storytelling" | "tips" | "opinion" | "victory" | "lesson" | "engagement";
  icon: string;
  title: string;
  description: string;
}

function ColorCategory({ category, icon, title, description }: ColorCategoryProps) {
  const colors = getColorScheme(category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative p-4 rounded-xl
        ${colors.bg}
        ${colors.border}
        border-2
        transition-all duration-300
        hover:scale-[1.02]
        group
      `}
    >
      {/* Category header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`text-2xl ${colors.icon}`}>{icon}</div>
        <div className="flex-1">
          <h3 className={`text-sm font-semibold ${colors.text}`}>{title}</h3>
          <p className="text-xs text-text-muted">{description}</p>
        </div>
      </div>

      {/* Button example */}
      <button
        className={`
          w-full px-4 py-2 rounded-lg text-sm font-medium text-white
          bg-gradient-to-r ${colors.gradient}
          ${colors.glow}
          hover:shadow-lg
          transition-all duration-200
          active:scale-95
        `}
      >
        Exemple de bouton
      </button>

      {/* Badge example */}
      <div className="mt-3 flex items-center gap-2">
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors.badge}`}>
          Badge
        </span>
        <span className={`text-xs ${colors.textMuted}`}>Couleur catégorie</span>
      </div>

      {/* Hover glow effect */}
      <div className={`absolute -inset-0.5 rounded-xl ${colors.ring} ring-0 group-hover:ring-2 transition-all duration-300 -z-10`} />
    </motion.div>
  );
}

export default function PremiumColorShowcase() {
  const categories: ColorCategoryProps[] = [
    {
      category: "storytelling",
      icon: "📖",
      title: "Storytelling",
      description: "Créativité & narration",
    },
    {
      category: "tips",
      icon: "💡",
      title: "Conseils Pratiques",
      description: "Astuces & productivité",
    },
    {
      category: "opinion",
      icon: "🎯",
      title: "Opinion Forte",
      description: "Affirmations & audace",
    },
    {
      category: "victory",
      icon: "🏆",
      title: "Victoire & Résultats",
      description: "Succès & achievements",
    },
    {
      category: "lesson",
      icon: "🎓",
      title: "Leçon Apprise",
      description: "Éducation & insights",
    },
    {
      category: "engagement",
      icon: "❓",
      title: "Engagement",
      description: "Interaction & communauté",
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Header with premium shimmer */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-shimmer-premium">
          Système de Couleurs Premium
        </h1>
        <p className="text-text-secondary max-w-2xl mx-auto">
          Couleurs chaleureuses, dynamiques et engageantes inspirées de l'autoscroll PostTemplates
        </p>
      </div>

      {/* Color categories grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category, index) => (
          <ColorCategory key={category.category} {...category} />
        ))}
      </div>

      {/* Text effects showcase */}
      <div className="mt-12 space-y-6 p-6 rounded-2xl bg-dark-card border border-dark-border">
        <h2 className="text-2xl font-bold text-white mb-4">Effets de Texte Premium</h2>

        <div className="space-y-4">
          {/* Gradient warm */}
          <div>
            <h3 className="text-2xl font-bold text-gradient-warm">
              Gradient Chaud - Orange & Rose
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Utilisez <code className="px-1.5 py-0.5 bg-dark-elevated rounded text-xs">text-gradient-warm</code> pour les titres chaleureux
            </p>
          </div>

          {/* Gradient cool */}
          <div>
            <h3 className="text-2xl font-bold text-gradient-cool">
              Gradient Froid - Bleu & Cyan
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Utilisez <code className="px-1.5 py-0.5 bg-dark-elevated rounded text-xs">text-gradient-cool</code> pour les sections éducatives
            </p>
          </div>

          {/* Gradient premium */}
          <div>
            <h3 className="text-2xl font-bold text-gradient-premium">
              Gradient Premium - Violet & Rose
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Utilisez <code className="px-1.5 py-0.5 bg-dark-elevated rounded text-xs">text-gradient-premium</code> pour les badges premium
            </p>
          </div>

          {/* Shimmer text */}
          <div>
            <h3 className="text-3xl font-bold text-shimmer-premium">
              Texte Scintillant Animé
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Utilisez <code className="px-1.5 py-0.5 bg-dark-elevated rounded text-xs">text-shimmer-premium</code> pour les éléments héros
            </p>
          </div>
        </div>
      </div>

      {/* Interactive buttons with hover glows */}
      <div className="mt-12 space-y-6 p-6 rounded-2xl bg-dark-card border border-dark-border">
        <h2 className="text-2xl font-bold text-white mb-4">Effets de Survol Premium</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button className="px-4 py-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 font-medium hover-glow-storytelling transition-all">
            Hover Storytelling
          </button>
          <button className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium hover-glow-tips transition-all">
            Hover Tips
          </button>
          <button className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-medium hover-glow-opinion transition-all">
            Hover Opinion
          </button>
          <button className="px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium hover-glow-victory transition-all">
            Hover Victory
          </button>
          <button className="px-4 py-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-medium hover-glow-lesson transition-all">
            Hover Lesson
          </button>
          <button className="px-4 py-3 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 font-medium hover-glow-engagement transition-all">
            Hover Engagement
          </button>
        </div>
      </div>

      {/* Animated glow cards */}
      <div className="mt-12 space-y-6 p-6 rounded-2xl bg-dark-card border border-dark-border">
        <h2 className="text-2xl font-bold text-white mb-4">Effets Glow Animés</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30 glow-storytelling">
            <div className="text-2xl mb-2">📖</div>
            <div className="text-sm font-medium text-purple-300">Storytelling Glow</div>
          </div>
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 glow-tips">
            <div className="text-2xl mb-2">💡</div>
            <div className="text-sm font-medium text-amber-300">Tips Glow</div>
          </div>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 glow-opinion">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-sm font-medium text-red-300">Opinion Glow</div>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 glow-victory">
            <div className="text-2xl mb-2">🏆</div>
            <div className="text-sm font-medium text-emerald-300">Victory Glow</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 glow-lesson">
            <div className="text-2xl mb-2">🎓</div>
            <div className="text-sm font-medium text-blue-300">Lesson Glow</div>
          </div>
          <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30 glow-engagement">
            <div className="text-2xl mb-2">❓</div>
            <div className="text-sm font-medium text-violet-300">Engagement Glow</div>
          </div>
        </div>
      </div>

      {/* Usage guide */}
      <div className="mt-12 p-6 rounded-2xl bg-dark-elevated border border-dark-border">
        <h2 className="text-xl font-bold text-white mb-4">🎨 Guide d'Utilisation</h2>
        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            <strong className="text-white">1. Import du système:</strong>{" "}
            <code className="px-1.5 py-0.5 bg-dark-card rounded text-xs">
              import &#123; storytellingColors, getColorScheme &#125; from "@/lib/ui/design-system-colors"
            </code>
          </p>
          <p>
            <strong className="text-white">2. Utiliser les couleurs:</strong>{" "}
            Appliquez les classes Tailwind directement avec les schémas de couleurs
          </p>
          <p>
            <strong className="text-white">3. Effets scintillants:</strong>{" "}
            Utilisez les classes CSS globales: <code className="px-1.5 py-0.5 bg-dark-card rounded text-xs">text-shimmer-premium</code>,{" "}
            <code className="px-1.5 py-0.5 bg-dark-card rounded text-xs">glow-storytelling</code>, etc.
          </p>
          <p>
            <strong className="text-white">4. Responsive & Accessible:</strong>{" "}
            Toutes les animations respectent <code className="px-1.5 py-0.5 bg-dark-card rounded text-xs">prefers-reduced-motion</code>
          </p>
        </div>
      </div>
    </div>
  );
}
