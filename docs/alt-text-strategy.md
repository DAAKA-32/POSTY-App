# Stratégie Alt Text - POSTY

## 🎯 Objectifs

Les balises `alt` (texte alternatif) servent deux objectifs cruciaux:

1. **Accessibilité (A11Y)**: Permettre aux lecteurs d'écran de décrire les images pour les utilisateurs malvoyants
2. **SEO**: Aider les moteurs de recherche à comprendre le contenu des images et indexer correctement

## 📋 Règles Générales

### ✅ Bons Alt Texts

- **Descriptif et concis**: 125 caractères maximum (limite lecteurs d'écran)
- **Contextuel**: Décrit ce que l'image apporte au contenu
- **Pas de "image de" ou "photo de"**: Redondant, lecteurs d'écran l'annoncent déjà
- **Mots-clés naturels**: Intégrer SEO sans keyword stuffing
- **Langue appropriée**: FR pour pages FR, EN pour pages EN

### ❌ Mauvais Alt Texts

- ❌ `alt="image"` - Trop générique
- ❌ `alt="DSC_12345.jpg"` - Nom de fichier technique
- ❌ `alt=""` sur images importantes - Ignoré par SEO
- ❌ `alt="Cliquez ici"` - Ne décrit pas l'image
- ❌ `alt="Image montrant une capture d'écran de l'interface utilisateur de POSTY avec un exemple de post LinkedIn généré par l'intelligence artificielle dans le style storytelling avec des émojis et une structure narrative"` - Trop long (>125 caractères)

## 🏷️ Templates par Type d'Image

### 1. Logo POSTY
```tsx
<img
  src="/logo.png"
  alt="POSTY - Générateur de posts LinkedIn IA"
/>
```
**Rationale**: Nom de marque + fonction = contexte + SEO

### 2. Screenshots de l'Interface
```tsx
// Homepage hero
<img
  src="/macimg.png"
  alt="Interface POSTY générant un post LinkedIn storytelling"
/>

// Feature showcase
<img
  src="/capture1.png"
  alt="Dual mode POSTY - versions storytelling et business"
/>

<img
  src="/capture2.png"
  alt="Éditeur de posts LinkedIn POSTY avec suggestions IA"
/>
```

### 3. Images Décoratives
Si l'image est purement décorative (fond, séparateur, ornement):
```tsx
<img
  src="/background-landing.jpg"
  alt=""
  role="presentation"
/>
```
**Note**: `alt=""` indique aux lecteurs d'écran de l'ignorer

### 4. Photos d'Équipe / Profils
```tsx
<img
  src="/ceo.png"
  alt="Emilien Nepveu, Fondateur de POSTY"
/>

<img
  src="/cmo.jpg"
  alt="Sarah Martin, CMO POSTY"
/>
```

### 5. Illustrations / Concepts
```tsx
<img
  src="/img-ia.jpg"
  alt="Intelligence artificielle générant du contenu LinkedIn"
/>

<img
  src="/analytics.jpg"
  alt="Dashboard analytics LinkedIn avec métriques d'engagement"
/>
```

### 6. Icons / Boutons
```tsx
// Icon avec texte visible à côté
<img src="/linkedin-icon.svg" alt="" /> Publier sur LinkedIn

// Icon seul (bouton)
<button>
  <img src="/copy-icon.svg" alt="Copier le post" />
</button>
```

### 7. Graphiques / Charts
```tsx
<img
  src="/engagement-graph.png"
  alt="Graphique montrant +150% d'engagement avec posts POSTY vs posts manuels"
/>
```

## 📱 Responsive Images

Pour les images responsive (différentes tailles):
```tsx
<picture>
  <source
    media="(min-width: 768px)"
    srcSet="/macimg.png"
  />
  <img
    src="/iphoneimg.png"
    alt="POSTY sur mobile - Générer des posts en déplacement"
  />
</picture>
```

## 🌐 Internationalisation

### Français (FR)
```tsx
alt="Générateur de posts LinkedIn POSTY - Interface utilisateur"
```

### Anglais (EN)
```tsx
alt="POSTY LinkedIn post generator - User interface"
```

**Implémentation avec i18n**:
```tsx
import { useLanguage } from "@/contexts/LanguageContext";

const { t } = useLanguage();

<img
  src="/macimg.png"
  alt={t("images.alt.macInterface")}
/>
```

## 🔍 Alt Text pour SEO

### Mots-clés Prioritaires
Intégrer naturellement ces keywords dans les alt texts:

**Primaire**:
- "générateur posts LinkedIn"
- "LinkedIn IA"
- "POSTY"

**Secondaire**:
- "storytelling LinkedIn"
- "post professionnel"
- "content creator LinkedIn"

### Exemples Optimisés SEO
```tsx
// Hero image
alt="POSTY générateur de posts LinkedIn IA - Créer du contenu professionnel"

// Feature images
alt="Dual mode LinkedIn - Posts storytelling et business générés par IA"
alt="Analyse de posts LinkedIn avec suggestions IA POSTY"
alt="Programmation de posts LinkedIn automatisée"
```

## ✅ Checklist Avant Publication

- [ ] Toutes les images importantes ont un alt text
- [ ] Alt texts < 125 caractères
- [ ] Pas de "image de" ou "photo de"
- [ ] Mots-clés intégrés naturellement
- [ ] Images décoratives ont `alt=""` et `role="presentation"`
- [ ] Alt texts descriptifs et contextuels
- [ ] Langue appropriée (FR/EN)
- [ ] Testé avec lecteur d'écran (NVDA, JAWS, VoiceOver)

## 🛠️ Outils de Test

### Automatisés
- **Lighthouse** (Chrome DevTools): Audit accessibilité
- **axe DevTools**: Extension Chrome pour a11y
- **WAVE**: Extension Chrome analyse accessibilité

### Manuels
- **NVDA** (Windows): Lecteur d'écran gratuit
- **JAWS** (Windows): Lecteur d'écran professionnel
- **VoiceOver** (Mac/iOS): Lecteur d'écran intégré

### Commandes Lecteurs d'Écran
- **NVDA**: `Insert + Down Arrow` pour lire suivant
- **VoiceOver**: `VO + Right Arrow` pour naviguer
- **JAWS**: `Insert + F5` pour liste images

## 📚 Ressources

- [WebAIM: Alt Text Guide](https://webaim.org/techniques/alttext/)
- [W3C: Alternative Text](https://www.w3.org/WAI/tutorials/images/)
- [Google Image SEO](https://developers.google.com/search/docs/appearance/google-images)

## 🔄 Maintenance

**Fréquence de révision**: À chaque ajout de nouvelle image

**Responsable**: Équipe Dev + Marketing

**Process**:
1. Designer exporte image avec nom descriptif
2. Dev ajoute alt text selon ce guide
3. Review a11y dans PR
4. Test avec Lighthouse avant merge
