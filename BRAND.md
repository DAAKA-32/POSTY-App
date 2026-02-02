# Posty Brand Guidelines

> Version 1.0 | Janvier 2026

---

## Table des Matières

1. [Introduction](#introduction)
2. [Logo](#logo)
3. [Palette de Couleurs](#palette-de-couleurs)
4. [Typographie](#typographie)
5. [Iconographie](#iconographie)
6. [Illustrations](#illustrations)
7. [Composants UI](#composants-ui)
8. [Animations](#animations)
9. [Exemples d'Application](#exemples-dapplication)
10. [Do's and Don'ts](#dos-and-donts)

---

## Introduction

### Mission de Posty
Posty est un assistant IA premium pour la création de contenu LinkedIn. Notre identité visuelle reflète :
- **Chaleur** — Palette orange/corail accueillante
- **Professionnalisme** — Design épuré et premium
- **Innovation** — Animations fluides et interactions modernes
- **Accessibilité** — Interface intuitive pour tous

### Personnalité de Marque
| Attribut | Description |
|----------|-------------|
| Ton | Professionnel mais accessible |
| Énergie | Dynamique et motivant |
| Style | Moderne, épuré, premium |
| Approche | Coach bienveillant |

---

## Logo

### Logo Principal
Le logo Posty combine une icône distinctive et le nom de marque.

```
Fichiers disponibles :
├── logo.jpg          (usage web général)
├── logo.png          (transparence supportée)
├── logo-avec-fond.jpg (sur fond coloré)
└── new_logo.jpg      (version alternative)
```

### Règles d'Utilisation

#### Espacement (Clearspace)
L'espace minimum autour du logo doit être égal à la hauteur de la lettre "O" dans POSTY.

```
┌─────────────────────────────┐
│                             │
│    ┌─────────────────┐      │
│    │                 │      │
│    │     POSTY       │      │
│    │                 │      │
│    └─────────────────┘      │
│                             │
└─────────────────────────────┘
     ← clearspace = "O" →
```

#### Tailles Minimales
| Contexte | Taille Min |
|----------|------------|
| Digital (écran) | 24px de hauteur |
| Print | 10mm de hauteur |
| Favicon | 16x16px, 32x32px, 180x180px |

#### Variantes de Taille (Code)
```tsx
// Utilisation dans le code
<Logo size="xs" />  // 24x24px - Minimal
<Logo size="sm" />  // 32x32px - Navigation
<Logo size="md" />  // 40x40px - Standard
<Logo size="lg" />  // 48x48px - Headers
<Logo size="xl" />  // 64x64px - Hero sections
```

### Versions du Logo

| Version | Usage | Fond |
|---------|-------|------|
| Couleur | Usage principal | Clair |
| Inversé | Sur fonds sombres | Foncé |
| Monochrome | Documents B&W | Tous |

---

## Palette de Couleurs

### Couleurs Primaires (Brand)

| Nom | Hex | RGB | Usage |
|-----|-----|-----|-------|
| **Primary Orange** | `#F8935D` | 248, 147, 93 | CTAs, boutons principaux, accents |
| **Coral Vif** | `#F76B54` | 247, 107, 84 | Hover states, emphasis |
| **Rose Pêche** | `#FBB9AD` | 251, 185, 173 | Backgrounds subtils, highlights |
| **Orange Profond** | `#E8834D` | 232, 131, 77 | Dark mode, contraste |
| **Corail Moyen** | `#F89E85` | 248, 158, 133 | États intermédiaires |

### Couleur Accent

| Nom | Hex | RGB | Usage |
|-----|-----|-----|-------|
| **Accent Rose** | `#F13452` | 241, 52, 82 | Notifications, badges, alertes |

### Couleurs de Texte

#### Mode Clair
| Nom | Hex | Usage |
|-----|-----|-------|
| Text Primary | `#1A1D21` | Titres, texte principal |
| Text Secondary | `#4B5563` | Sous-titres, descriptions |
| Text Muted | `#6B7280` | Légendes, texte désactivé |
| Text Subtle | `#9CA3AF` | Placeholders, hints |

#### Mode Sombre
| Nom | Hex | Usage |
|-----|-----|-------|
| Text Primary | `#F1F5F9` | Titres, texte principal |
| Text Secondary | `#CBD5E1` | Sous-titres, descriptions |
| Text Muted | `#94A3B8` | Légendes, texte désactivé |
| Text Subtle | `#64748B` | Placeholders, hints |

### Couleurs de Fond

#### Mode Clair
| Nom | Hex | Usage |
|-----|-----|-------|
| Background | `#FAFBFC` | Fond principal |
| Background Warm | `#FFF8F5` | Hero, sections accueil |
| Background Peach | `#FEF3EE` | Features sections |
| Background Cream | `#FFFCFA` | Transitions |
| Card | `#FFFFFF` | Cartes, surfaces |
| Elevated | `#F8FAFC` | Éléments surélevés |

#### Mode Sombre
| Nom | Hex | Usage |
|-----|-----|-------|
| Background | `#0F1115` | Fond principal |
| Background Warm | `#14171D` | Hero sections |
| Card | `#16191F` | Cartes, surfaces |
| Elevated | `#1C2027` | Éléments surélevés |
| Border | `#262B35` | Bordures |

### Couleurs Sémantiques

| État | Light Mode | Dark Mode | Usage |
|------|------------|-----------|-------|
| Success | `#059669` | `#10B981` | Confirmations, validations |
| Warning | `#D97706` | `#F59E0B` | Avertissements |
| Error | `#DC2626` | `#EF4444` | Erreurs, suppressions |
| Info | `#0284C7` | `#0EA5E9` | Informations |

### Couleurs Premium

| Nom | Hex | Usage |
|-----|-----|-------|
| Purple | `#8B5CF6` | Fonctionnalités premium |
| Pink | `#EC4899` | Accents spéciaux |
| Gold | `#EAB308` | Badges, récompenses |

### Dégradés Officiels

```css
/* Dégradé Brand (Principal) */
background: linear-gradient(135deg, #F8935D 0%, #F76B54 100%);

/* Dégradé Soft (Subtil) */
background: linear-gradient(135deg, #FBB9AD 0%, #F89E85 100%);

/* Dégradé Premium (Orange → Violet) */
background: linear-gradient(135deg, #F8935D 0%, #8B5CF6 100%);

/* Dégradé Sunset (Orange → Rose) */
background: linear-gradient(135deg, #F8935D 0%, #F13452 100%);
```

### Variables CSS

```css
/* Utilisation dans le code */
:root {
  --color-primary: #F8935D;
  --color-primary-hover: #F76B54;
  --color-primary-light: #FBB9AD;
  --color-primary-dark: #E8834D;
  --color-accent: #F13452;
}
```

---

## Typographie

### Police Principale

**Poppins** — Police sans-serif moderne et lisible

```css
font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Police Monospace

**JetBrains Mono** — Pour le code et données techniques

```css
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### Graisses (Weights)

| Weight | Valeur | Usage |
|--------|--------|-------|
| Light | 300 | Texte décoratif, grands titres |
| Regular | 400 | Corps de texte |
| Medium | 500 | Sous-titres, labels |
| Semibold | 600 | Titres, CTAs |
| Bold | 700 | Emphasis fort, headers |

### Échelle Typographique

#### Mobile (< 768px)
| Niveau | Taille | Line Height | Usage |
|--------|--------|-------------|-------|
| 2xs | 11px | 1.4 | Legal, RGPD |
| xs | 11px | 1.4 | Captions |
| sm | 13px | 1.5 | Small body |
| base | 14px | 1.5 | Body text |
| lg | 15px | 1.4 | CTAs, buttons |
| xl | 16px | 1.3 | H4 |
| 2xl | 18px | 1.25 | H3 |
| 3xl | 20px | 1.2 | H2 |
| 4xl | 22px | 1.15 | H1 |
| 5xl | 28px | 1.1 | Display |

#### Desktop (≥ 768px)
| Niveau | Taille | Usage |
|--------|--------|-------|
| xs | 12px | Captions |
| sm | 14px | Small body |
| base | 15px | Body text |
| lg | 16px | CTAs |
| xl | 18px | H4 |
| 2xl | 20px | H3 |
| 3xl | 22px | H2 |
| 4xl | 24px | H1 |
| 5xl | 28px | Display |
| 6xl | 32px | Hero |
| 7xl | 40px | Display large |

### Exemples de Hiérarchie

```
H1 — Poppins Bold 24px (mobile) / 32px (desktop)
Bienvenue sur Posty

H2 — Poppins Semibold 20px / 24px
Créez du contenu LinkedIn en quelques secondes

H3 — Poppins Medium 18px / 20px
Fonctionnalités principales

Body — Poppins Regular 14px / 15px
Posty utilise l'IA pour générer des posts LinkedIn
engageants adaptés à votre style.

Caption — Poppins Regular 11px / 12px
Dernière mise à jour : il y a 2 heures
```

### Espacement des Lettres

| Nom | Valeur | Usage |
|-----|--------|-------|
| Tighter | -0.03em | Display text |
| Tight | -0.02em | Headings |
| Snug | -0.01em | Subheadings |
| Normal | 0 | Body text |
| Wide | 0.01em | Buttons, labels |
| Wider | 0.02em | Small caps |
| Widest | 0.05em | All caps |

### Hauteur de Ligne

| Nom | Valeur | Usage |
|-----|--------|-------|
| Tight | 1.1 | Display, headings |
| Snug | 1.25 | Subheadings |
| Normal | 1.4 | Body text |
| Relaxed | 1.5 | Long paragraphs |
| Loose | 1.6 | Small text, captions |

---

## Iconographie

### Bibliothèque de Base
**Lucide React** — Set d'icônes open source cohérent

### Style des Icônes Posty

| Propriété | Valeur |
|-----------|--------|
| Stroke Width | 1.5px (standard) / 2px (emphasis) |
| Corner Radius | Arrondis cohérents avec le design |
| Style | Outline (non filled) |
| Taille standard | 20x20px, 24x24px |

### Icônes Custom Posty

```
PostyIcon         — Logo/mascotte
GenerateIcon      — Création de post (étincelles)
ScheduleIcon      — Programmation (calendrier + horloge)
AnalyticsIcon     — Statistiques (graphique ascendant)
CoachIcon         — Coaching IA (cerveau/cible)
LinkedInIcon      — LinkedIn personnalisé
StyleIcon         — Style de post (palette)
HistoryIcon       — Historique (horloge retour)
SettingsIcon      — Paramètres (engrenage)
ProfileIcon       — Profil utilisateur
```

### Tailles d'Icônes

| Taille | Pixels | Usage |
|--------|--------|-------|
| xs | 16x16 | Inline, badges |
| sm | 20x20 | Boutons compacts |
| md | 24x24 | Standard, navigation |
| lg | 32x32 | Headers, features |
| xl | 48x48 | Hero, illustrations |

### Couleurs des Icônes

```css
/* Standard */
.icon { color: var(--text-secondary); }

/* Interactif */
.icon:hover { color: var(--color-primary); }

/* États */
.icon-success { color: var(--color-success); }
.icon-warning { color: var(--color-warning); }
.icon-error { color: var(--color-error); }
.icon-info { color: var(--color-info); }
```

---

## Illustrations

### Style d'Illustration Posty

| Caractéristique | Description |
|-----------------|-------------|
| **Style** | Flat design avec ombres douces |
| **Couleurs** | Palette brand uniquement (orange, corail, pêche) |
| **Formes** | Géométriques arrondies |
| **Ombres** | Douces, diffuses, subtiles |
| **Personnages** | Stylisés, minimalistes (optionnel) |

### Palette Illustration

```
Primaire :     #F8935D (orange)
Secondaire :   #F76B54 (corail)
Tertiaire :    #FBB9AD (pêche)
Accent :       #F13452 (rose)
Neutre clair : #F8FAFC
Neutre foncé : #1A1D21
```

### Types d'Illustrations

#### 1. Illustrations de Fonctionnalités
- Style : Icônes agrandies avec contexte
- Taille : 200x200px minimum
- Usage : Pages features, onboarding

#### 2. Illustrations Hero
- Style : Compositions complexes
- Taille : Responsive, max 600px hauteur
- Usage : Landing page, headers

#### 3. Illustrations d'État
- Empty states
- Loading states
- Success/Error states
- Taille : 150x150px

#### 4. Illustrations Spot
- Petites illustrations d'accompagnement
- Taille : 80x80px à 120x120px
- Usage : Cards, sections

### Règles de Création

```
DO's :
✓ Utiliser uniquement les couleurs brand
✓ Maintenir des formes arrondies cohérentes
✓ Ajouter des ombres subtiles pour la profondeur
✓ Garder un style minimaliste et épuré

DON'Ts :
✗ Utiliser des dégradés complexes
✗ Ajouter trop de détails
✗ Mélanger des styles différents
✗ Utiliser des couleurs hors palette
```

---

## Composants UI

### Boutons

#### Variantes

| Variante | Usage | Style |
|----------|-------|-------|
| Primary | CTA principal | Fond orange, texte blanc |
| Secondary | Actions secondaires | Bordure, fond transparent |
| Ghost | Actions tertiaires | Texte seul |
| Danger | Suppressions | Fond rouge |
| Success | Confirmations | Fond vert |

#### Tailles

| Taille | Padding | Font Size |
|--------|---------|-----------|
| sm | 8px 16px | 13px |
| md | 10px 20px | 14px |
| lg | 12px 24px | 15px |
| xl | 14px 32px | 16px |

#### États

```css
/* Default */
background: #F8935D;
box-shadow: 0 4px 14px rgba(248, 147, 93, 0.3);

/* Hover */
background: #F76B54;
box-shadow: 0 6px 20px rgba(247, 107, 84, 0.4);
transform: translateY(-1px);

/* Active */
transform: scale(0.98);

/* Disabled */
opacity: 0.5;
cursor: not-allowed;
```

### Cards

#### Variantes

| Variante | Description |
|----------|-------------|
| Default | Card standard avec bordure subtile |
| Elevated | Ombre plus prononcée |
| Highlight | Bordure primary avec glow |
| Ghost | Fond transparent |

#### Styles

```css
/* Card Default */
background: white;
border: 1px solid #E5E7EB;
border-radius: 12px;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

/* Card Hover */
border-color: rgba(248, 147, 93, 0.3);
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
```

### Inputs

```css
/* Default */
background: white;
border: 1px solid #E5E7EB;
border-radius: 8px;
padding: 10px 14px;
font-size: 14px;

/* Focus */
border-color: #F8935D;
box-shadow: 0 0 0 3px rgba(248, 147, 93, 0.15);
outline: none;

/* Error */
border-color: #DC2626;
box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
```

### Border Radius

| Nom | Valeur | Usage |
|-----|--------|-------|
| sm | 4px | Petits éléments |
| default | 6px | Inputs |
| md | 8px | Badges, tags |
| lg | 10px | Boutons |
| xl | 12px | Cards |
| 2xl | 14px | Modals |
| 3xl | 16px | Large containers |
| full | 9999px | Pills, avatars |

---

## Animations

### Durées

| Type | Durée | Usage |
|------|-------|-------|
| Instant | 100ms | Micro-interactions |
| Fast | 200ms | Hovers, toggles |
| Normal | 300ms | Transitions standard |
| Slow | 400ms | Modals, pages |
| Premium | 600ms+ | Effets spéciaux |

### Easing

```css
/* Standard */
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);

/* Bounce */
transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Smooth */
transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
```

### Animations Clés

#### Fade In Up
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
/* Durée : 300ms */
```

#### Scale In
```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
/* Durée : 200ms */
```

#### Glow Pulse
```css
@keyframes glowPulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(248, 147, 93, 0.25);
  }
  50% {
    box-shadow: 0 0 40px rgba(248, 147, 93, 0.4);
  }
}
/* Durée : 2s infinite */
```

### Accessibilité

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Exemples d'Application

### Page d'Accueil (Landing)

```
┌─────────────────────────────────────────┐
│  [Logo]              [Nav]    [CTA]     │
├─────────────────────────────────────────┤
│                                         │
│     Créez du contenu LinkedIn           │
│     qui convertit.                      │
│                                         │
│     [   Essayer gratuitement   ]        │
│                                         │
│         [Illustration Hero]             │
│                                         │
├─────────────────────────────────────────┤
│  Fonctionnalités                        │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ Icon   │ │ Icon   │ │ Icon   │       │
│  │ Titre  │ │ Titre  │ │ Titre  │       │
│  │ Desc   │ │ Desc   │ │ Desc   │       │
│  └────────┘ └────────┘ └────────┘       │
└─────────────────────────────────────────┘

Couleurs :
- Background hero : #FFF8F5
- CTA : #F8935D → #F76B54
- Texte : #1A1D21
```

### Dashboard

```
┌─────────────────────────────────────────┐
│  [Logo]  [Search]           [Avatar]    │
├──────┬──────────────────────────────────┤
│      │                                  │
│ Nav  │  Bienvenue, [Prénom]             │
│      │                                  │
│      │  ┌─────────┐ ┌─────────┐         │
│      │  │ KPI     │ │ KPI     │         │
│      │  └─────────┘ └─────────┘         │
│      │                                  │
│      │  ┌───────────────────────┐       │
│      │  │ Graphique activité    │       │
│      │  └───────────────────────┘       │
│      │                                  │
└──────┴──────────────────────────────────┘

Couleurs :
- Background : #FAFBFC (light) / #0F1115 (dark)
- Cards : #FFFFFF / #16191F
- Accent graphiques : #F8935D
```

### Générateur de Post

```
┌─────────────────────────────────────────┐
│  [←] Nouveau post                       │
├─────────────────────────────────────────┤
│                                         │
│  Décrivez votre idée...                 │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Style : [Storytelling ▾]               │
│                                         │
│       [   Générer le post   ]           │
│                                         │
├─────────────────────────────────────────┤
│  Post généré                            │
│  ┌─────────────────────────────────┐    │
│  │ Contenu du post...              │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Copier] [Programmer] [Publier]        │
│                                         │
└─────────────────────────────────────────┘
```

---

## Do's and Don'ts

### Logo

| ✅ DO | ❌ DON'T |
|-------|----------|
| Utiliser les versions officielles | Modifier les couleurs du logo |
| Respecter le clearspace | Étirer ou déformer |
| Utiliser sur fonds compatibles | Ajouter des effets (ombres, contours) |

### Couleurs

| ✅ DO | ❌ DON'T |
|-------|----------|
| Utiliser la palette officielle | Inventer de nouvelles couleurs |
| Maintenir un contraste suffisant | Utiliser orange sur orange |
| Adapter au mode sombre | Ignorer l'accessibilité |

### Typographie

| ✅ DO | ❌ DON'T |
|-------|----------|
| Utiliser Poppins exclusivement | Mélanger plusieurs polices |
| Respecter la hiérarchie | Utiliser plus de 3 tailles par écran |
| Garder une lisibilité optimale | Texte trop petit (< 11px) |

### Icônes

| ✅ DO | ❌ DON'T |
|-------|----------|
| Utiliser Lucide React | Mélanger plusieurs sets |
| Garder stroke-width cohérent | Icônes trop détaillées |
| Adapter la taille au contexte | Icônes pixelisées |

### Illustrations

| ✅ DO | ❌ DON'T |
|-------|----------|
| Style flat avec ombres douces | Photos stock génériques |
| Couleurs de la palette brand | Illustrations trop chargées |
| Cohérence sur toutes les pages | Styles différents par page |

---

## Ressources

### Fichiers Source
```
/public/
├── logo.jpg
├── logo.png
├── logo-avec-fond.jpg
└── new_logo.jpg

/components/ui/
├── Logo.tsx
├── Button.tsx
├── Card.tsx
└── icons/
    └── PostyIcons.tsx
```

### Variables CSS
```
/app/globals.css
- Lignes 1025-1256 : Variables de thème
```

### Configuration Tailwind
```
/tailwind.config.ts
- Couleurs : lignes 59-205
- Typographie : lignes 222-263
- Ombres : lignes 284-310
- Animations : lignes 313-634
```

---

## Contact

Pour toute question sur l'identité visuelle de Posty :
- Design System : Voir `/brand` dans l'application
- Mises à jour : Ce document est versionné

---

*Dernière mise à jour : Janvier 2026*
*Version : 1.0*
