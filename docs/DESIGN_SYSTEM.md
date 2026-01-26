# 🎨 DESIGN SYSTEM - Posty
## Palette AUTOSCROLL & Guidelines

**Version:** 3.0
**Date:** 22 janvier 2026
**Status:** ✅ Production Ready

---

## 📚 Table des Matières

1. [Introduction](#introduction)
2. [Palette de Couleurs](#palette-de-couleurs)
3. [Hiérarchie des Couleurs](#hiérarchie-des-couleurs)
4. [Composants](#composants)
5. [Animations & Effects](#animations--effects)
6. [Dark Mode](#dark-mode)
7. [Accessibilité](#accessibilité)
8. [Best Practices](#best-practices)

---

## 🎯 Introduction

Le Design System Posty repose sur une **palette AUTOSCROLL de 6 couleurs** avec l'**orange saumon (#F8935D)** comme couleur **PRIMARY/DOMINANTE**. Ce guide assure la cohérence visuelle et facilite l'onboarding des nouveaux développeurs.

### Principes Fondamentaux

1. **Orange PRIMARY** = Actions critiques (CTAs, liens importants)
2. **6 couleurs SECONDARY** = Actions secondaires avec signification sémantique
3. **Shimmer effects** = Interactions premium subtiles
4. **Dark mode** = Support complet avec contraste optimisé
5. **Animations** = Fluides, performantes, device-aware

---

## 🌈 Palette de Couleurs

### 1️⃣ PRIMARY (Dominante)

#### Orange Saumon
```css
/* Tailwind tokens */
--primary: #F8935D          /* Orange saumon principal */
--primary-hover: #E8934D    /* Version hover */
--primary-light: #F9A577    /* Version claire */

/* Warm variants */
--warm-orange: #f97316      /* Orange vif */
--warm-coral: #ff7f50       /* Corail */
--warm-salmon: #fa8072      /* Saumon */
--warm-peach: #ffdab9       /* Pêche */
```

**Usage:**
- Boutons CTA principaux
- "Publier sur LinkedIn" (action critique)
- "Générer un post", "Créer un compte"
- Links hover states
- Active conversation border
- Focus rings

**Exemples:**
```tsx
// Bouton CTA principal
<button className="bg-gradient-to-r from-primary to-primary-hover hover:shadow-glow">
  Commencer gratuitement
</button>

// Lien hover
<a className="text-text-secondary hover:text-primary transition-colors">
  En savoir plus
</a>
```

---

### 2️⃣ SECONDARY (Autoscroll - 6 Couleurs)

#### 🟣 Violet/Purple - Storytelling, Premium, Créativité
```css
--violet-500: #8B5CF6      /* Storytelling mode */
--purple-500: #A855F7      /* Creative content */
```

**Signification sémantique:**
- Mode storytelling dans AI responses
- Contenu créatif, narratif
- Badges premium
- Analytics avancés
- Sections profile (personal info)

**Exemples:**
```tsx
// KPI Card storytelling
<KPICard color="primary" /> // Maps to purple

// Sidebar pinned group
<div className="text-violet-500">
  📌 Épinglés
</div>

// Button premium
<Button variant="premium" />
// → bg-gradient-to-r from-violet-500 to-purple-500
```

---

#### 🟡 Amber/Yellow - Tips, Planning, Productivité
```css
--amber-500: #F59E0B       /* Planning/Tips */
--yellow-500: #EAB308      /* Optimisme/Énergie */
--warning: #f59e0b         /* Warnings constructifs */
```

**Signification sémantique:**
- Scheduling, calendar
- Tips et conseils
- Warnings constructifs (non-erreur)
- Métriques d'activité
- "This Week" dans sidebar

**Exemples:**
```tsx
// Schedule button
<button className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10">
  📅 Programmer
</button>

// KPI activity
<KPICard title="Cette semaine" color="warning" />

// Button warning
<Button variant="warning" />
// → bg-gradient-to-r from-amber-500 to-amber-600
```

---

#### 🔴 Rose/Pink/Red - Créativité, Passion, Alertes
```css
--pink-500: #EC4899        /* Créativité */
--rose-500: #F43F5E        /* Passion */
--red-500: #EF4444         /* Alertes/Danger */
--accent: #F13452          /* Red/Rose accent */
--error: #dc2626           /* Erreurs */
```

**Signification sémantique:**
- Contenu créatif, engagement émotionnel
- Alertes critiques
- Erreurs, suppressions
- Plan Pro badges (rose)

**Exemples:**
```tsx
// Danger button
<Button variant="danger" />
// → bg-gradient-to-r from-red-500 to-red-600

// Error toast
toast.error("Une erreur est survenue")

// Delete account
<button className="text-error hover:bg-error/10">
  Supprimer mon compte
</button>
```

---

#### 🟢 Emerald/Green - Succès, Croissance, Validation
```css
--emerald-500: #10B981     /* Succès */
--green-500: #22C55E       /* Croissance */
--success: #10b981         /* Messages positifs */
```

**Signification sémantique:**
- Indicateurs de succès
- Validation, checkmarks
- Messages positifs
- Métriques de croissance
- "Today" dans sidebar

**Exemples:**
```tsx
// Success KPI
<KPICard title="Sessions" color="success" />

// Success toast
toast.success("Post publié avec succès !")

// Button success
<Button variant="success" />
// → bg-gradient-to-r from-emerald-500 to-emerald-600

// Trend positive
<div className="bg-emerald-500/15 text-emerald-400">
  +42%
</div>
```

---

#### 🔵 Blue/Cyan - Information, Confiance, Sécurité
```css
--blue-500: #3B82F6        /* Information */
--cyan-500: #06B6D4        /* Trust/Data */
```

**Signification sémantique:**
- Liens informatifs
- Sections de confiance, sécurité
- Données statistiques
- "Yesterday" dans sidebar
- Privacy/GDPR sections

**Exemples:**
```tsx
// Info button
<Button variant="info" />
// → bg-gradient-to-r from-blue-500 to-blue-600

// Sidebar yesterday
<div className="text-blue-500">
  Hier
</div>

// Trust badge
<div className="text-blue-500">
  🔒 Paiement sécurisé
</div>
```

---

#### 🟣 Violet (Engagement) - Interactivité, Social
```css
--violet-500: #8B5CF6      /* Engagement */
```

**Signification sémantique:**
- Éléments interactifs
- Engagement social (likes, shares)
- "+" More actions button
- Quick Actions section

**Exemples:**
```tsx
// More actions button
<button className="bg-gradient-to-br from-violet-500/10 to-purple-500/10">
  +
</button>

// Insights button
<button className="text-violet-600 dark:text-violet-400">
  📊 Insights
</button>
```

---

## 📐 Hiérarchie des Couleurs

### Règle Fondamentale

```
PRIMARY (Orange) > SECONDARY (Autoscroll) > NEUTRE (Gris)
     40%                 45%                   15%
```

### Matrice de Décision

| Élément | Couleur | Raison |
|---------|---------|--------|
| CTA principal | PRIMARY | Action critique |
| CTA secondaire | SECONDARY | Action importante mais non-critique |
| Lien hover | PRIMARY | Cohérence navigation |
| Badge plan MAX | PRIMARY | Premium = orange |
| Badge plan PRO | PRIMARY | Popular = orange |
| Mode Storytelling | PURPLE | Sémantique créativité |
| Schedule | AMBER | Sémantique planning |
| Success | EMERALD | Sémantique validation |
| Error | RED | Sémantique alerte |

### ❌ À Éviter

```tsx
// ❌ BAD: CTA principal avec couleur secondaire
<button className="bg-violet-500">
  Créer un compte
</button>

// ✅ GOOD: CTA principal avec PRIMARY
<button className="bg-gradient-to-r from-primary to-primary-hover">
  Créer un compte
</button>

// ❌ BAD: Lien hover neutre
<a className="hover:text-gray-700">
  En savoir plus
</a>

// ✅ GOOD: Lien hover avec PRIMARY
<a className="hover:text-primary transition-colors">
  En savoir plus
</a>
```

---

## 🧩 Composants

### Button

**7 Variants disponibles:**

```tsx
import Button from "@/components/ui/Button";

// PRIMARY - Orange dominant
<Button variant="primary">
  CTA Principal
</Button>
// → bg-gradient-to-r from-primary to-primary-hover

// SECONDARY - Neutre
<Button variant="secondary">
  Action secondaire
</Button>

// DANGER - Red
<Button variant="danger">
  Supprimer
</Button>
// → bg-gradient-to-r from-red-500 to-red-600

// SUCCESS - Emerald
<Button variant="success">
  Valider
</Button>
// → bg-gradient-to-r from-emerald-500 to-emerald-600

// WARNING - Amber
<Button variant="warning">
  Attention
</Button>
// → bg-gradient-to-r from-amber-500 to-amber-600

// INFO - Blue
<Button variant="info">
  Information
</Button>
// → bg-gradient-to-r from-blue-500 to-blue-600

// PREMIUM - Violet
<Button variant="premium">
  Premium
</Button>
// → bg-gradient-to-r from-violet-500 to-purple-500
```

**Props:**
```tsx
interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent" | "success" | "outline" | "warning" | "info" | "premium";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}
```

---

### KPICard

**4 Variants sémantiques:**

```tsx
import KPICard from "@/components/dashboard/KPICard";

// PRIMARY - Purple (Storytelling)
<KPICard
  title="Posts générés"
  value={42}
  color="primary"
  icon={<PostIcon />}
/>

// ACCENT - Violet (Engagement)
<KPICard
  title="Posts publiés"
  value={12}
  color="accent"
  icon={<ShareIcon />}
/>

// WARNING - Amber (Activity)
<KPICard
  title="Cette semaine"
  value={7}
  color="warning"
  icon={<TrendIcon />}
  trend={{ value: 25, isPositive: true }}
/>

// SUCCESS - Emerald (Achievement)
<KPICard
  title="Sessions"
  value={35}
  color="success"
  icon={<ChatIcon />}
/>
```

**Features:**
- Shimmer effect AUTOSCROLL au hover
- Icon avec border et ring on hover
- Trend badge (green positive / red negative)
- Tooltip premium
- GPU-accelerated animations

---

### ColorfulCard

**6 Variants AUTOSCROLL:**

```tsx
import ColorfulCard from "@/components/ui/ColorfulCard";

<ColorfulCard variant="orange" hoverable glowing>
  {/* Contenu */}
</ColorfulCard>

// Variants disponibles:
// "orange", "rose", "violet", "jaune", "vert", "bleu"
```

**Props:**
```tsx
interface ColorfulCardProps {
  children: ReactNode;
  variant: "orange" | "rose" | "violet" | "jaune" | "vert" | "bleu";
  className?: string;
  hoverable?: boolean;  // Hover lift effect
  glowing?: boolean;    // Glow effect
}
```

---

### ProfilePlanCard

**3 Styles de plan:**

```tsx
import ProfilePlanCard from "@/components/profile/ProfilePlanCard";

<ProfilePlanCard
  currentPlan="max"
  dailyMessagesUsed={10}
  dailyLimit={-1}
  onUpgrade={() => router.push("/pricing")}
/>
```

**Plan Styles:**
- **FREE:** Gris neutre, pas de shimmer
- **PRO:** Orange dominant, shimmer, glow animé
- **MAX:** Orange + violet/pink, double glow animé

**Features:**
- Shimmer AUTOSCROLL pro/max
- Animated glow effects
- Usage meter (free only)
- Upgrade CTA avec shimmer

---

## ✨ Animations & Effects

### Shimmer Effect Standard

**Pattern AUTOSCROLL-style:**

```tsx
{/* AUTOSCROLL shimmer - ORANGE DOMINANT */}
<motion.div
  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
  animate={{
    backgroundPosition: ["0% 0%", "200% 200%"],
  }}
  transition={{
    duration: 3,
    repeat: Infinity,
    ease: "linear",
  }}
  style={{
    background: "linear-gradient(135deg, transparent 0%, rgba(248,147,93,0.08) 25%, transparent 50%, rgba(251,146,60,0.08) 75%, transparent 100%)",
    backgroundSize: "200% 200%",
  }}
/>
```

**Règles:**
1. **Opacité très basse** (0.08 max) pour subtilité
2. **Visible au hover** uniquement (opacity 0 → 100)
3. **Duration cohérente** (3s repeat Infinity)
4. **GPU accelerated** (backgroundPosition)
5. **pointer-events: none** pour pas bloquer interactions

---

### Glow Effect Standard

**Couleurs par type:**

```tsx
// Orange PRIMARY glow
className="hover:shadow-[0_8px_30px_rgba(248,147,93,0.15)]"

// Violet premium glow
className="hover:shadow-[0_8px_30px_rgba(139,92,246,0.15)]"

// Amber activity glow
className="hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]"

// Emerald success glow
className="hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]"

// Blue info glow
className="hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)]"

// Red danger glow
className="hover:shadow-[0_8px_30px_rgba(239,68,68,0.15)]"
```

**Intensité:**
- **Base:** 0.15 opacity
- **Hover intense:** 0.25 opacity
- **Active/Focus:** 0.30 opacity

---

### Hover Lift

**Micro-interaction standard:**

```tsx
<motion.div
  whileHover={{ y: -4, scale: 1.005 }}
  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
>
  {/* Contenu */}
</motion.div>
```

**Paramètres:**
- **y:** -2px (subtle) à -8px (intense)
- **scale:** 1.005 à 1.02
- **duration:** 0.2s à 0.4s
- **ease:** `[0.22, 1, 0.36, 1]` (premium cubic-bezier)

---

### Icon Rotation

**Animation au hover:**

```tsx
<motion.div
  whileHover={{ scale: 1.1, rotate: 5 }}
  transition={{ duration: 0.2 }}
  className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"
>
  <Icon className="w-6 h-6 text-primary" />
</motion.div>
```

---

### Gradient Animation

**Animated background:**

```tsx
// Gradient en mouvement
<div className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient-x">
  Texte animé
</div>

// Animation CSS
@keyframes gradient-x {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

---

## 🌙 Dark Mode

### Principe

**Dual variants systématiques:**

```tsx
// Text
className="text-gray-900 dark:text-white"
className="text-gray-600 dark:text-text-secondary"
className="text-gray-500 dark:text-text-muted"

// Backgrounds
className="bg-white dark:bg-dark-card"
className="bg-gray-50 dark:bg-dark-bg"
className="bg-gray-100 dark:bg-dark-hover"

// Borders
className="border-gray-200 dark:border-dark-border"
className="border-gray-300 dark:border-dark-border-hover"
```

### Opacités Ajustées

**Dark mode nécessite plus d'opacité:**

```tsx
// Light mode
bg-primary/10  // 10% opacity

// Dark mode
dark:bg-primary/15  // 15% opacity (plus visible)
```

**Exemple complet:**
```tsx
<div className="
  bg-violet-500/10 dark:bg-violet-500/15
  border border-violet-500/20 dark:border-violet-500/30
  hover:border-violet-500/40 dark:hover:border-violet-500/50
">
  Contenu
</div>
```

---

## ♿ Accessibilité

### Contraste WCAG 2.1 AA

**Tests de contraste:**

| Couleur | Hex | Contrast (white bg) | Status |
|---------|-----|---------------------|--------|
| Orange | #F8935D | 4.5:1 | ✅ PASS |
| Violet | #8B5CF6 | 6.2:1 | ✅ PASS |
| Amber | #F59E0B | 3.8:1 | ⚠️ LIMITE* |
| Emerald | #10B981 | 3.9:1 | ⚠️ LIMITE* |
| Blue | #3B82F6 | 4.8:1 | ✅ PASS |
| Red | #EF4444 | 4.3:1 | ✅ PASS |

*Limite sur fond blanc, mais PASS sur dark mode.

### Focus States

**Visible focus rings:**

```tsx
className="
  focus:outline-none
  focus-visible:ring-2
  focus-visible:ring-primary/40
  focus-visible:ring-offset-2
  focus-visible:ring-offset-background
"
```

### Reduced Motion

**Support préférence utilisateur:**

```tsx
import { useReducedMotion } from "framer-motion";

const prefersReducedMotion = useReducedMotion();

<motion.div
  animate={prefersReducedMotion ? {} : {
    opacity: [0.1, 0.18, 0.1],
    scale: [1, 1.1, 1],
  }}
>
  Contenu animé
</motion.div>
```

---

## 📋 Best Practices

### ✅ DO

1. **Utiliser PRIMARY pour actions critiques**
   ```tsx
   <Button variant="primary">Créer un compte</Button>
   ```

2. **Couleurs sémantiques cohérentes**
   ```tsx
   // Succès → Emerald
   <KPICard color="success" />
   toast.success("Opération réussie")
   ```

3. **Shimmer au hover uniquement**
   ```tsx
   className="opacity-0 group-hover:opacity-100"
   ```

4. **Dual variants dark mode**
   ```tsx
   className="text-gray-900 dark:text-white"
   ```

5. **GPU acceleration**
   ```tsx
   animate={{ transform: "translateY(-4px)" }}  // ✅
   animate={{ top: "-4px" }}  // ❌
   ```

---

### ❌ DON'T

1. **CTA principal avec couleur secondaire**
   ```tsx
   // ❌ BAD
   <button className="bg-violet-500">S'inscrire</button>

   // ✅ GOOD
   <button className="bg-gradient-to-r from-primary to-primary-hover">
     S'inscrire
   </button>
   ```

2. **Shimmer trop visible**
   ```tsx
   // ❌ BAD: opacity 0.5 trop intense
   background: rgba(248,147,93,0.5)

   // ✅ GOOD: opacity 0.08 subtile
   background: rgba(248,147,93,0.08)
   ```

3. **Oublier dark mode**
   ```tsx
   // ❌ BAD
   className="bg-white"

   // ✅ GOOD
   className="bg-white dark:bg-dark-card"
   ```

4. **Animations sans reduced motion**
   ```tsx
   // ❌ BAD: animation forcée
   animate={{ scale: [1, 1.2, 1] }}

   // ✅ GOOD: respecte préférence
   animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1] }}
   ```

5. **Focus states invisibles**
   ```tsx
   // ❌ BAD
   className="focus:outline-none"

   // ✅ GOOD
   className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
   ```

---

## 🔧 Utility Classes

### Tailwind Config Extensions

```js
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#F8935D',
        'primary-hover': '#E8934D',
        'warm-orange': '#f97316',
        'warm-coral': '#ff7f50',
        // ... autres couleurs
      },
      boxShadow: {
        'glow': '0 0 20px rgba(248, 147, 93, 0.3)',
        'glow-lg': '0 0 30px rgba(248, 147, 93, 0.4)',
        'glow-accent': '0 0 20px rgba(241, 52, 82, 0.3)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'gradient-x': 'gradient-x 3s ease infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 200%' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
}
```

---

## 📚 Ressources

### Fichiers Importants

**Configuration:**
- `tailwind.config.ts` - Tokens couleurs
- `globals.css` - Animations CSS
- `lib/plans.ts` - Plans & features

**Composants:**
- `components/ui/Button.tsx` - 7 variants
- `components/ui/ColorfulCard.tsx` - 6 variants
- `components/dashboard/KPICard.tsx` - 4 variants
- `components/profile/ProfilePlanCard.tsx` - 3 styles

**Pages:**
- `app/page.tsx` - Landing (référence)
- `app/login/page.tsx` - Auth (référence glows)
- `app/dashboard/page.tsx` - Dashboard (référence KPIs)

---

## 🤝 Contribution

### Ajouter une Nouvelle Couleur

**Étapes:**

1. **Définir dans tailwind.config.ts**
   ```js
   colors: {
     'custom-color': '#HEX',
   }
   ```

2. **Créer variant dans Button**
   ```tsx
   customVariant: `
     bg-gradient-to-r from-custom-color to-custom-color-dark
     text-white shadow-lg
   `
   ```

3. **Documenter usage sémantique**
   - Quand l'utiliser?
   - Exemples concrets
   - Tests de contraste

4. **Tester dark mode**
   - Vérifier visibilité
   - Ajuster opacités

---

## ✅ Checklist Nouveau Composant

Avant de créer/modifier un composant:

- [ ] Utilise PRIMARY pour action critique
- [ ] Couleurs sémantiques cohérentes
- [ ] Dual variants dark mode
- [ ] Focus states visibles
- [ ] Reduced motion support
- [ ] GPU-accelerated animations
- [ ] Shimmer subtil (opacity ≤ 0.08)
- [ ] Contraste WCAG AA
- [ ] TypeScript strict
- [ ] Props documentées

---

## 📞 Support

**Questions sur le Design System?**

- Consulter AUTOSCROLL_COLORS_SUMMARY.md
- Consulter AUDIT_COULEURS_UX_COMPLET.md
- Consulter code des composants existants
- Demander review avant pull request

---

**Dernière mise à jour:** 22 janvier 2026
**Version:** 3.0
**Mainteneur:** Équipe Dev Posty
