"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  Sparkles,
  Calendar,
  BarChart3,
  Target,
  MessageSquare,
  Settings,
  User,
  Clock,
  Palette,
  Copy,
  Check
} from "lucide-react";
import { usePageTitle } from "@/hooks/ui/usePageTitle";

// Color palette data
const brandColors = {
  primary: [
    { name: "Primary Orange", hex: "#F8935D", rgb: "248, 147, 93", usage: "CTAs, boutons principaux" },
    { name: "Coral Vif", hex: "#F76B54", rgb: "247, 107, 84", usage: "Hover states" },
    { name: "Rose Pêche", hex: "#FBB9AD", rgb: "251, 185, 173", usage: "Backgrounds subtils" },
    { name: "Orange Profond", hex: "#E8834D", rgb: "232, 131, 77", usage: "Dark mode" },
    { name: "Corail Moyen", hex: "#F89E85", rgb: "248, 158, 133", usage: "États intermédiaires" },
  ],
  accent: [
    { name: "Accent Rose", hex: "#F13452", rgb: "241, 52, 82", usage: "Notifications, badges" },
  ],
  semantic: [
    { name: "Success", hex: "#10B981", rgb: "16, 185, 129", usage: "Confirmations" },
    { name: "Warning", hex: "#F59E0B", rgb: "245, 158, 11", usage: "Avertissements" },
    { name: "Error", hex: "#EF4444", rgb: "239, 68, 68", usage: "Erreurs" },
    { name: "Info", hex: "#0EA5E9", rgb: "14, 165, 233", usage: "Informations" },
  ],
  premium: [
    { name: "Purple", hex: "#8B5CF6", rgb: "139, 92, 246", usage: "Features premium" },
    { name: "Pink", hex: "#EC4899", rgb: "236, 72, 153", usage: "Accents speciaux" },
    { name: "Gold", hex: "#EAB308", rgb: "234, 179, 8", usage: "Badges, recompenses" },
  ],
};

const typography = [
  { level: "Display", size: "32px", weight: "700", sample: "Posty" },
  { level: "H1", size: "24px", weight: "700", sample: "Créez du contenu LinkedIn" },
  { level: "H2", size: "20px", weight: "600", sample: "Fonctionnalités principales" },
  { level: "H3", size: "18px", weight: "600", sample: "Génération IA" },
  { level: "Body", size: "15px", weight: "400", sample: "Posty utilise l'IA pour générer des posts LinkedIn engageants." },
  { level: "Small", size: "13px", weight: "400", sample: "Dernière mise à jour : il y a 2 heures" },
  { level: "Caption", size: "11px", weight: "400", sample: "Version 1.0.0" },
];

const iconShowcase = [
  { icon: Sparkles, name: "Generate", description: "Création de post" },
  { icon: Calendar, name: "Schedule", description: "Programmation" },
  { icon: BarChart3, name: "Analytics", description: "Statistiques" },
  { icon: Target, name: "Coach", description: "Coaching IA" },
  { icon: MessageSquare, name: "Post", description: "Posts LinkedIn" },
  { icon: Settings, name: "Settings", description: "Paramètres" },
  { icon: User, name: "Profile", description: "Profil utilisateur" },
  { icon: Clock, name: "History", description: "Historique" },
  { icon: Palette, name: "Style", description: "Style de post" },
];

function ColorSwatch({ color, onCopy }: { color: { name: string; hex: string; rgb: string; usage: string }; onCopy: (hex: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(color.hex);
    setCopied(true);
    onCopy(color.hex);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="group cursor-pointer"
      onClick={handleCopy}
    >
      <div
        className="h-20 rounded-t-xl flex items-center justify-center transition-shadow group-hover:shadow-lg"
        style={{ backgroundColor: color.hex }}
      >
        {copied ? (
          <Check className="w-6 h-6 text-white" />
        ) : (
          <Copy className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <div className="bg-white dark:bg-dark-card border border-t-0 border-gray-200 dark:border-dark-border rounded-b-xl p-3">
        <p className="font-semibold text-sm text-gray-900 dark:text-white">{color.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{color.hex}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{color.usage}</p>
      </div>
    </motion.div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function BrandPage() {
  usePageTitle("brand");
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <header className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="md" />
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">Brand Guidelines</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Version 1.0</p>
            </div>
          </div>
          <a
            href="/BRAND.md"
            target="_blank"
            className="text-sm text-[#F8935D] hover:text-[#F76B54] font-medium"
          >
            Télécharger BRAND.md
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block"
          >
            <Logo size="xl" showText className="mx-auto mb-6" />
          </motion.div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Posty Brand Guidelines
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Guide complet de l'identite visuelle Posty. Retrouvez ici toutes les couleurs,
            typographies, icones et composants officiels.
          </p>
        </div>

        {/* Logo Section */}
        <Section title="Logo" subtitle="Versions et regles d'utilisation">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Logo on light */}
            <Card className="p-8 flex flex-col items-center justify-center bg-white">
              <Logo size="xl" />
              <p className="mt-4 text-sm text-gray-500">Sur fond clair</p>
            </Card>

            {/* Logo on dark */}
            <Card className="p-8 flex flex-col items-center justify-center bg-gray-900">
              <Logo size="xl" />
              <p className="mt-4 text-sm text-gray-400">Sur fond sombre</p>
            </Card>

            {/* Logo on brand */}
            <Card className="p-8 flex flex-col items-center justify-center bg-gradient-to-br from-[#F8935D] to-[#F76B54]">
              <Logo size="xl" />
              <p className="mt-4 text-sm text-white/80">Sur fond brand</p>
            </Card>
          </div>

          {/* Logo sizes */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tailles</h3>
            <div className="flex items-end gap-8 flex-wrap">
              {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
                <div key={size} className="text-center">
                  <Logo size={size} />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-mono">{size}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Colors Section */}
        <Section title="Palette de Couleurs" subtitle="Couleurs officielles de la marque">
          {/* Primary colors */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Couleurs Primaires</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {brandColors.primary.map((color) => (
                <ColorSwatch key={color.hex} color={color} onCopy={setCopiedColor} />
              ))}
            </div>
          </div>

          {/* Accent */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Accent</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {brandColors.accent.map((color) => (
                <ColorSwatch key={color.hex} color={color} onCopy={setCopiedColor} />
              ))}
            </div>
          </div>

          {/* Semantic */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Semantiques</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {brandColors.semantic.map((color) => (
                <ColorSwatch key={color.hex} color={color} onCopy={setCopiedColor} />
              ))}
            </div>
          </div>

          {/* Premium */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Premium</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {brandColors.premium.map((color) => (
                <ColorSwatch key={color.hex} color={color} onCopy={setCopiedColor} />
              ))}
            </div>
          </div>

          {/* Gradients */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Degrades</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="h-24 rounded-xl bg-gradient-to-r from-[#F8935D] to-[#F76B54] flex items-end p-3">
                <span className="text-white text-sm font-medium">Brand</span>
              </div>
              <div className="h-24 rounded-xl bg-gradient-to-r from-[#FBB9AD] to-[#F89E85] flex items-end p-3">
                <span className="text-gray-700 text-sm font-medium">Soft</span>
              </div>
              <div className="h-24 rounded-xl bg-gradient-to-r from-[#F8935D] to-[#8B5CF6] flex items-end p-3">
                <span className="text-white text-sm font-medium">Premium</span>
              </div>
              <div className="h-24 rounded-xl bg-gradient-to-r from-[#F8935D] to-[#F13452] flex items-end p-3">
                <span className="text-white text-sm font-medium">Sunset</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Typography Section */}
        <Section title="Typographie" subtitle="Police Inter - Echelle typographique">
          <Card className="p-6">
            <div className="space-y-6">
              {typography.map((item) => (
                <div key={item.level} className="flex items-baseline gap-4 pb-4 border-b border-gray-100 dark:border-dark-border last:border-0 last:pb-0">
                  <div className="w-20 flex-shrink-0">
                    <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{item.level}</span>
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-gray-900 dark:text-white font-sans"
                      style={{
                        fontSize: item.size,
                        fontWeight: parseInt(item.weight),
                      }}
                    >
                      {item.sample}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 font-mono hidden sm:block">
                    {item.size} / {item.weight}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* Icons Section */}
        <Section title="Iconographie" subtitle="Icones Lucide React - Style Posty">
          <Card className="p-6">
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-6">
              {iconShowcase.map(({ icon: Icon, name, description }) => (
                <div key={name} className="flex flex-col items-center text-center group">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-dark-hover flex items-center justify-center mb-2 group-hover:bg-[#F8935D]/10 group-hover:text-[#F8935D] transition-colors">
                    <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-[#F8935D]" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{name}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{description}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-dark-border">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Style d'icone</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gray-100 dark:bg-dark-hover flex items-center justify-center">
                    <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">Stroke: 1.5px</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gray-100 dark:bg-dark-hover flex items-center justify-center">
                    <Sparkles className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">Emphasis: 2px</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-gray-100 dark:bg-dark-hover flex items-center justify-center">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">Small: 20px</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gray-100 dark:bg-dark-hover flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">Standard: 24px</span>
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* Buttons Section */}
        <Section title="Boutons" subtitle="Variantes et etats">
          <Card className="p-6">
            <div className="space-y-8">
              {/* Primary buttons */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Variantes</h4>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="success">Success</Button>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Tailles</h4>
                <div className="flex flex-wrap items-center gap-4">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>

              {/* With icons */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Avec icônes</h4>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Générer
                  </Button>
                  <Button variant="secondary">
                    <Calendar className="w-4 h-4 mr-2" />
                    Programmer
                  </Button>
                  <Button variant="outline">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Statistiques
                  </Button>
                </div>
              </div>

              {/* States */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">États</h4>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Default</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                  <Button variant="primary" isLoading>Loading</Button>
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* Cards Section */}
        <Section title="Cards" subtitle="Composants de conteneur">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="default" className="p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Default</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Card standard avec bordure subtile</p>
            </Card>
            <Card variant="elevated" className="p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Elevated</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ombre plus prononcee</p>
            </Card>
            <Card variant="highlight" className="p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Highlight</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bordure primary avec glow</p>
            </Card>
            <Card variant="ghost" className="p-4 bg-gray-100 dark:bg-dark-hover">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Ghost</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fond transparent</p>
            </Card>
          </div>
        </Section>

        {/* Shadows Section */}
        <Section title="Ombres" subtitle="Systeme d'elevation">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">shadow-sm</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">shadow</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-md">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">shadow-md</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">shadow-lg</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-xl">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">shadow-xl</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-glow">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">shadow-glow</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-card">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">shadow-card</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-elevated">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">shadow-elevated</p>
            </div>
          </div>
        </Section>

        {/* Border Radius Section */}
        <Section title="Border Radius" subtitle="Rayons de bordure">
          <div className="flex flex-wrap gap-6">
            {[
              { name: "sm", value: "4px" },
              { name: "default", value: "6px" },
              { name: "md", value: "8px" },
              { name: "lg", value: "10px" },
              { name: "xl", value: "12px" },
              { name: "2xl", value: "14px" },
              { name: "3xl", value: "16px" },
              { name: "full", value: "9999px" },
            ].map((radius) => (
              <div key={radius.name} className="text-center">
                <div
                  className="w-16 h-16 bg-[#F8935D] mb-2"
                  style={{ borderRadius: radius.value }}
                />
                <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{radius.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{radius.value}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Animations Section */}
        <Section title="Animations" subtitle="Effets et transitions">
          <Card className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <motion.div
                className="h-20 bg-[#F8935D] rounded-xl flex items-center justify-center text-white font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Hover & Tap
              </motion.div>
              <motion.div
                className="h-20 bg-[#F76B54] rounded-xl flex items-center justify-center text-white font-medium"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Bounce
              </motion.div>
              <motion.div
                className="h-20 bg-gradient-to-r from-[#F8935D] to-[#F76B54] rounded-xl flex items-center justify-center text-white font-medium shadow-glow"
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(248, 147, 93, 0.25)",
                    "0 0 40px rgba(248, 147, 93, 0.4)",
                    "0 0 20px rgba(248, 147, 93, 0.25)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Glow Pulse
              </motion.div>
              <motion.div
                className="h-20 bg-[#8B5CF6] rounded-xl flex items-center justify-center text-white font-medium"
                animate={{ rotate: [0, 2, -2, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                Wiggle
              </motion.div>
            </div>
          </Card>
        </Section>

        {/* Illustration Style */}
        <Section title="Style d'Illustration" subtitle="Guidelines pour les visuels">
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Caractéristiques</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#F8935D]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#F8935D]" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Style flat design avec ombres douces</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#F8935D]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#F8935D]" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Palette limitee aux couleurs brand</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#F8935D]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#F8935D]" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Formes geometriques arrondies</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#F8935D]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#F8935D]" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Personnages stylises minimalistes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#F8935D]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[#F8935D]" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Coherence sur toutes les pages</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Palette Illustration</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-12 rounded-lg bg-[#F8935D]" title="Primaire" />
                  <div className="h-12 rounded-lg bg-[#F76B54]" title="Secondaire" />
                  <div className="h-12 rounded-lg bg-[#FBB9AD]" title="Tertiaire" />
                  <div className="h-12 rounded-lg bg-[#F13452]" title="Accent" />
                  <div className="h-12 rounded-lg bg-[#F8FAFC] border border-gray-200" title="Neutre clair" />
                  <div className="h-12 rounded-lg bg-[#1A1D21]" title="Neutre fonce" />
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 dark:border-dark-border text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Posty Brand Guidelines v1.0 - Janvier 2026
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Pour toute question, consultez le fichier BRAND.md
          </p>
        </footer>
      </main>

      {/* Toast for color copy */}
      {copiedColor && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 right-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">{copiedColor} copie !</span>
        </motion.div>
      )}
    </div>
  );
}
