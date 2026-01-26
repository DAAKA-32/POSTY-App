# 📘 EXEMPLES D'UTILISATION - Composants AUTOSCROLL
## Posty Design System v4.0

**Date:** 22 janvier 2026
**Version:** 4.0 (Nouveaux composants)

---

## 🎨 ColorfulLoader

### Import

```tsx
import ColorfulLoader, {
  DotsLoader,
  PulseLoader,
  InlineLoader,
} from "@/components/shared/ColorfulLoader";
```

### Variants Disponibles

**7 variants sémantiques:**
- `primary` - Orange (génération en cours)
- `success` - Emerald (opération réussie)
- `warning` - Amber (traitement long)
- `error` - Red (retry en cours)
- `info` - Blue (chargement données)
- `premium` - Violet (actions premium)
- `neutral` - Gris (général)

---

### 1. Spinner Standard

```tsx
// PRIMARY - Orange (génération de post)
<ColorfulLoader
  variant="primary"
  size="lg"
  text="Génération en cours..."
  showPulse={true}
/>

// SUCCESS - Emerald (sauvegarde en cours)
<ColorfulLoader
  variant="success"
  size="md"
  text="Sauvegarde..."
/>

// WARNING - Amber (traitement long)
<ColorfulLoader
  variant="warning"
  size="md"
  text="Optimisation en cours..."
/>

// INFO - Blue (chargement dashboard)
<ColorfulLoader
  variant="info"
  size="lg"
  text="Chargement des statistiques..."
/>
```

**Rendu:**
- Spinner rotatif avec glow pulsant
- Texte optionnel en dessous
- Animation GPU-accelerated

---

### 2. Dots Loader

```tsx
// PRIMARY - Orange (génération)
<DotsLoader
  variant="primary"
  size="md"
  text="L'IA rédige votre post..."
/>

// PREMIUM - Violet (insights)
<DotsLoader
  variant="premium"
  size="lg"
  text="Analyse des insights..."
/>
```

**Rendu:**
- 3 points animés en cascade
- Couleurs dégradées
- Animation bounce subtile

---

### 3. Pulse Loader

```tsx
// PRIMARY - Orange
<PulseLoader
  variant="primary"
  size="xl"
/>

// SUCCESS - Emerald
<PulseLoader
  variant="success"
  size="lg"
/>
```

**Rendu:**
- Cercles concentriques pulsants
- Effet de propagation
- Idéal pour splash screens

---

### 4. Inline Loader (dans boutons)

```tsx
import { InlineLoader } from "@/components/shared/ColorfulLoader";

// Dans un bouton
<button className="flex items-center gap-2">
  <InlineLoader variant="primary" />
  Chargement...
</button>

// Avec Button component
<Button variant="primary" isLoading loadingText="Génération...">
  Générer un post
</Button>
```

---

### Use Cases Recommandés

#### 1. Génération de Post (PRIMARY)
```tsx
{isGenerating && (
  <div className="flex items-center justify-center py-20">
    <ColorfulLoader
      variant="primary"
      size="lg"
      text="L'IA rédige votre post..."
      showPulse={true}
    />
  </div>
)}
```

#### 2. Chargement Dashboard (INFO)
```tsx
{loadingStats && (
  <div className="min-h-screen flex items-center justify-center">
    <DotsLoader
      variant="info"
      size="xl"
      text="Chargement de vos statistiques..."
    />
  </div>
)}
```

#### 3. Upload Image (WARNING)
```tsx
{uploading && (
  <div className="absolute inset-0 bg-white/90 dark:bg-dark-bg/90 flex items-center justify-center">
    <ColorfulLoader
      variant="warning"
      size="lg"
      text="Upload en cours..."
    />
  </div>
)}
```

#### 4. Analyse Premium (PREMIUM)
```tsx
{analyzingInsights && (
  <PulseLoader
    variant="premium"
    size="lg"
  />
)}
```

---

## ✨ GradientText

### Import

```tsx
import GradientText, {
  HeroGradient,
  PremiumGradient,
  SuccessGradient,
  AutoscrollGradient,
} from "@/components/ui/GradientText";
```

### Variants Disponibles

**8 variants:**
- `primary` - Orange dominant
- `orange-warm` - Orange → Coral → Salmon
- `premium` - Violet → Purple
- `success` - Emerald → Green
- `multicolor` - Orange → Amber → Purple (full autoscroll)
- `sunset` - Orange → Pink → Purple
- `ocean` - Blue → Cyan → Teal
- `forest` - Green → Emerald → Teal

---

### Animations Disponibles

**4 animations:**
- `none` - Pas d'animation (défaut)
- `shimmer` - Shimmer gauche-droite
- `wave` - Vague continue
- `pulse` - Pulse subtil

---

### 1. Usage de Base

```tsx
// Titre avec gradient orange
<GradientText variant="primary">
  Générez du contenu LinkedIn
</GradientText>

// Titre avec gradient violet animé
<GradientText variant="premium" animation="wave">
  Fonctionnalités Premium
</GradientText>

// Sous-titre success
<GradientText variant="success" as="h3" className="text-2xl font-bold">
  +340% d'opportunités
</GradientText>
```

---

### 2. Presets (Usage Simplifié)

```tsx
// Hero section
<h1 className="text-5xl font-bold">
  <HeroGradient>
    Transformez LinkedIn en Machine à Clients
  </HeroGradient>
</h1>

// Features premium
<h2 className="text-3xl font-semibold">
  <PremiumGradient>
    Analytics Avancés
  </PremiumGradient>
</h2>

// Success stories
<h3 className="text-2xl font-bold">
  <SuccessGradient>
    +2000 entrepreneurs satisfaits
  </SuccessGradient>
</h3>

// Titre très important
<h1 className="text-6xl font-black">
  <AutoscrollGradient>
    Boostez Votre Visibilité
  </AutoscrollGradient>
</h1>
```

---

### 3. Exemples Concrets

#### Hero Section Landing Page
```tsx
<section className="hero">
  <h1 className="text-5xl lg:text-7xl font-bold mb-6">
    Faites de{" "}
    <HeroGradient>LinkedIn</HeroGradient>
    {" "}votre{" "}
    <GradientText variant="sunset" animation="shimmer">
      meilleur commercial
    </GradientText>
  </h1>

  <p className="text-xl text-gray-600">
    Générez du contenu qui{" "}
    <GradientText variant="success">
      convertit
    </GradientText>
    {" "}en quelques secondes
  </p>
</section>
```

#### Dashboard Welcome
```tsx
<div className="dashboard-header">
  <h1 className="text-3xl font-bold">
    Bonjour{" "}
    <GradientText variant="primary" animation="wave">
      {firstName}
    </GradientText>
    {" "}!
  </h1>

  <p className="text-gray-600">
    Voici vos{" "}
    <GradientText variant="premium">
      statistiques
    </GradientText>
    {" "}de la semaine
  </p>
</div>
```

#### Pricing Section
```tsx
<div className="pricing-header">
  <h2 className="text-4xl font-bold">
    <AutoscrollGradient>
      Un client signé
    </AutoscrollGradient>
    {" "}={" "}
    <GradientText variant="success" animation="pulse">
      abonnement rentabilisé
    </GradientText>
  </h2>
</div>
```

#### Profile Stats
```tsx
<div className="stat-card">
  <GradientText variant="primary" as="h3" className="text-5xl font-bold">
    {postsCount}
  </GradientText>
  <p className="text-sm text-gray-600">Posts générés</p>
</div>
```

---

### Use Cases Recommandés

| Context | Variant | Animation | Exemple |
|---------|---------|-----------|---------|
| **Hero titles** | `primary` ou `multicolor` | `shimmer` ou `wave` | Titres principaux landing |
| **Premium features** | `premium` | `wave` | Analytics, Insights |
| **Success metrics** | `success` | `pulse` ou `none` | +340% ROI, Témoignages |
| **Call-to-actions** | `primary` | `shimmer` | "Commencer maintenant" |
| **Warnings** | `warning` | `none` | Messages d'alerte |
| **Creative content** | `sunset` | `shimmer` | Storytelling mode |
| **Trust sections** | `ocean` | `none` | Sécurité, Confidentialité |
| **Growth metrics** | `forest` ou `success` | `pulse` | Croissance, Progression |

---

## 🎯 Best Practices

### ✅ DO

1. **Utiliser loaders colorés pour contexte**
   ```tsx
   // Génération → PRIMARY orange
   <ColorfulLoader variant="primary" text="Génération..." />

   // Sauvegarde → SUCCESS emerald
   <ColorfulLoader variant="success" text="Sauvegarde..." />
   ```

2. **Gradient text sur titres importants uniquement**
   ```tsx
   // Hero title → Gradient
   <h1><HeroGradient>Titre Principal</HeroGradient></h1>

   // Paragraphe normal → Pas de gradient
   <p>Texte explicatif...</p>
   ```

3. **Animation subtile**
   ```tsx
   // Shimmer lent pour élégance
   <GradientText animation="shimmer">Title</GradientText>

   // Wave pour mouvement continu
   <GradientText animation="wave">Premium</GradientText>
   ```

4. **Combiner variants**
   ```tsx
   <h1 className="text-5xl font-bold">
     Votre <HeroGradient>expertise</HeroGradient> mérite d'être{" "}
     <SuccessGradient>mieux rémunérée</SuccessGradient>
   </h1>
   ```

---

### ❌ DON'T

1. **Loader neutre pour action critique**
   ```tsx
   // ❌ BAD: Génération avec loader neutre
   <ColorfulLoader variant="neutral" />

   // ✅ GOOD: Génération avec loader orange
   <ColorfulLoader variant="primary" />
   ```

2. **Trop de gradient text**
   ```tsx
   // ❌ BAD: Tout en gradient
   <p>
     <GradientText>Ceci est</GradientText>{" "}
     <GradientText>trop</GradientText>{" "}
     <GradientText>coloré</GradientText>
   </p>

   // ✅ GOOD: Accent sur mots clés
   <p>
     Ceci est <GradientText variant="primary">important</GradientText>
   </p>
   ```

3. **Animation trop rapide/intense**
   ```tsx
   // ❌ BAD: Animation trop visible
   // (n'existe pas, mais pour exemple)

   // ✅ GOOD: Animations prédéfinies
   <GradientText animation="shimmer" /> // 2s
   ```

4. **Loader sans contexte**
   ```tsx
   // ❌ BAD: Pas de texte explicatif
   <ColorfulLoader variant="primary" />

   // ✅ GOOD: Avec contexte
   <ColorfulLoader variant="primary" text="Génération de votre post..." />
   ```

---

## 🔧 Personnalisation Avancée

### Créer un Loader Custom

```tsx
import ColorfulLoader from "@/components/shared/ColorfulLoader";

function CustomLoader() {
  return (
    <div className="relative">
      {/* Background blur */}
      <div className="absolute inset-0 bg-white/90 dark:bg-dark-bg/90 backdrop-blur-sm" />

      {/* Loader centré */}
      <div className="relative flex flex-col items-center justify-center gap-6 py-20">
        <ColorfulLoader
          variant="primary"
          size="xl"
          showPulse={true}
        />

        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Génération en cours
          </p>
          <p className="text-sm text-gray-600 dark:text-text-secondary">
            L'IA analyse votre demande et rédige un post optimisé
          </p>
        </div>

        {/* Progress bar optional */}
        <div className="w-64 h-1 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-orange-500"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
}
```

### Créer un Gradient Custom

```tsx
function CustomGradient() {
  return (
    <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-violet-500 bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent">
      Texte avec gradient personnalisé
    </span>
  );
}
```

---

## 📊 Récapitulatif Sémantique

### Loaders

| Variant | Couleurs | Usage | Exemple Context |
|---------|----------|-------|-----------------|
| `primary` | Orange → Amber | Génération, actions principales | "Génération de post..." |
| `success` | Emerald → Green → Teal | Sauvegarde, validation | "Sauvegarde réussie" |
| `warning` | Amber → Yellow → Orange | Traitements longs | "Optimisation..." |
| `error` | Red → Rose → Pink | Retry, erreur temporaire | "Nouvelle tentative..." |
| `info` | Blue → Sky → Cyan | Chargement données | "Chargement stats..." |
| `premium` | Violet → Purple → Fuchsia | Features premium | "Analyse insights..." |
| `neutral` | Gris | Chargement général | "Chargement..." |

### Gradient Text

| Variant | Gradient | Usage | Exemple |
|---------|----------|-------|---------|
| `primary` | Orange → Orange → Orange | Titres principaux | "Générez du contenu" |
| `orange-warm` | Orange → Coral → Salmon | Titres chauds | "Bienvenue chez Posty" |
| `premium` | Violet → Purple → Fuchsia | Features premium | "Analytics Avancés" |
| `success` | Emerald → Green → Teal | Success stories | "+340% de ROI" |
| `multicolor` | Orange → Amber → Purple | Hero titles | "Transformez LinkedIn" |
| `sunset` | Orange → Pink → Purple | Créatif | "Storytelling Mode" |
| `ocean` | Blue → Cyan → Teal | Trust, info | "Paiement Sécurisé" |
| `forest` | Green → Emerald → Teal | Croissance | "Développez votre business" |

---

## 📚 Ressources

**Fichiers sources:**
- `components/shared/ColorfulLoader.tsx`
- `components/ui/GradientText.tsx`

**Documentation:**
- `docs/DESIGN_SYSTEM.md` - Guidelines complètes
- `AUTOSCROLL_COLORS_SUMMARY.md` - Palette de couleurs
- `AUDIT_COULEURS_UX_COMPLET.md` - Audit complet

**Tailwind config:**
- `tailwind.config.ts` - Animations shimmer, gradient-x
- `globals.css` - Keyframes animations

---

**Dernière mise à jour:** 22 janvier 2026
**Version:** 4.0
**Composants:** ColorfulLoader, GradientText
