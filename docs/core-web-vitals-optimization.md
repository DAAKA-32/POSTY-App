# Guide d'Optimisation - Core Web Vitals POSTY

## 🎯 Objectif

Les **Core Web Vitals** sont des métriques essentielles pour le ranking Google et l'UX:

1. **LCP** (Largest Contentful Paint): Temps de chargement du contenu principal
2. **FID** (First Input Delay): Réactivité / interactivité
3. **CLS** (Cumulative Layout Shift): Stabilité visuelle

**Seuils Google (2025)**:
- ✅ **Bon**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- ⚠️ **Moyen**: LCP 2.5-4s, FID 100-300ms, CLS 0.1-0.25
- ❌ **Mauvais**: LCP > 4s, FID > 300ms, CLS > 0.25

## 🛠️ Audit Actuel

### Outils de mesure
```bash
# 1. Lighthouse (Chrome DevTools)
npm run build
npm start
# Ouvrir Chrome DevTools > Lighthouse > Analyze

# 2. PageSpeed Insights (Google)
https://pagespeed.web.dev/

# 3. Web Vitals extension Chrome
https://chrome.google.com/webstore/detail/web-vitals
```

### Test en local
```bash
# Mesurer performance Next.js
npm run build
npm start
# Ouvrir http://localhost:3000
```

## 📊 Optimisations Prioritaires

### 1. LCP - Largest Contentful Paint (< 2.5s)

#### ✅ Déjà fait
- ✅ Next.js avec optimisations natives
- ✅ Preconnect vers Firebase/OpenAI (voir layout.tsx:238-242)
- ✅ PWA manifest

#### 🔧 À faire

**A. Optimiser les images**
```tsx
// Utiliser next/image au lieu de <img>
import Image from "next/image";

// Avant
<img src="/macimg.png" alt="POSTY interface" />

// Après
<Image
  src="/macimg.png"
  alt="POSTY interface"
  width={1200}
  height={800}
  priority // Pour hero image
  placeholder="blur"
  blurDataURL="data:image/..."
/>
```

**B. Convertir images en WebP**
```bash
# Installer sharp pour conversion
npm install sharp

# Script de conversion
node scripts/convert-to-webp.js
```

Script `scripts/convert-to-webp.js`:
```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const images = fs.readdirSync(publicDir).filter(f => f.match(/\.(jpg|png)$/));

images.forEach(async (img) => {
  const inputPath = path.join(publicDir, img);
  const outputPath = path.join(publicDir, img.replace(/\.(jpg|png)$/, '.webp'));

  await sharp(inputPath)
    .webp({ quality: 85 })
    .toFile(outputPath);

  console.log(`✓ Converted ${img} to WebP`);
});
```

**C. Lazy loading pour images hors viewport**
```tsx
<Image
  src="/capture5.png"
  alt="POSTY features"
  width={800}
  height={600}
  loading="lazy" // Lazy load par défaut (sauf priority)
/>
```

**D. Optimiser les fonts**
```tsx
// Dans layout.tsx, utiliser font-display: swap
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap", // ← CRITICAL: Évite FOIT (Flash Of Invisible Text)
  preload: true,
  fallback: ["system-ui", "arial"],
});
```

**E. Preload critical resources**
```tsx
// Dans layout.tsx <head>
<link
  rel="preload"
  href="/macimg.webp"
  as="image"
  type="image/webp"
/>
```

### 2. FID - First Input Delay (< 100ms)

#### ✅ Déjà fait
- ✅ React 18+ avec Concurrent Features
- ✅ Code splitting automatique Next.js

#### 🔧 À faire

**A. Lazy load components non-critiques**
```tsx
// Au lieu d'import direct
import { CookieBanner } from "@/components/CookieBanner";

// Utiliser dynamic import
import dynamic from "next/dynamic";

const CookieBanner = dynamic(
  () => import("@/components/CookieBanner"),
  { ssr: false }
);
```

**B. Defer JavaScript non-critique**
```tsx
// Scripts analytics/tracking
<script
  defer
  src="https://analytics.example.com/script.js"
/>
```

**C. Réduire le bundle JavaScript**
```bash
# Analyser bundle
npm run build
# Vérifier .next/build-manifest.json

# Bundle analyzer (optionnel)
npm install @next/bundle-analyzer
```

Dans `next.config.js`:
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... config
});

// Run: ANALYZE=true npm run build
```

**D. Optimiser les providers (contexts)**
```tsx
// Éviter re-renders inutiles
import { memo, useMemo } from "react";

const MyProvider = memo(({ children }) => {
  const value = useMemo(() => ({
    // ... state
  }), [deps]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
});
```

### 3. CLS - Cumulative Layout Shift (< 0.1)

#### ✅ Déjà fait
- ✅ Viewport fixed (layout.tsx:153-159)

#### 🔧 À faire

**A. Réserver l'espace pour les images**
```tsx
// TOUJOURS spécifier width/height
<Image
  src="/logo.png"
  width={200}
  height={60}
  alt="POSTY logo"
/>

// Ou utiliser aspect-ratio CSS
<div className="relative w-full aspect-video">
  <Image src="/banner.jpg" fill alt="..." />
</div>
```

**B. Éviter injections dynamiques qui décalent le layout**
```tsx
// ❌ Mauvais - Cookie banner qui pousse contenu
<div className="fixed bottom-0 w-full">
  <CookieBanner />
</div>

// ✅ Bon - Cookie banner en overlay (pas de push)
<div className="fixed bottom-0 w-full z-50">
  <CookieBanner />
</div>
```

**C. Skeleton loading pour contenu dynamique**
```tsx
// Pendant chargement
{isLoading ? (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-1/2" />
  </div>
) : (
  <PostContent />
)}
```

**D. Fonts avec font-display: swap**
*(Déjà mentionné dans LCP, mais impact aussi CLS)*

## 🚀 Optimisations Avancées

### 1. Next.js Image Optimization

`next.config.js`:
```javascript
module.exports = {
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
};
```

### 2. Code Splitting par Route
```tsx
// App router fait ça automatiquement
// Mais pour composants lourds:
const HeavyChart = dynamic(
  () => import("@/components/HeavyChart"),
  {
    loading: () => <Skeleton />,
    ssr: false
  }
);
```

### 3. Prefetch Critical Routes
```tsx
import { useRouter } from "next/navigation";

const router = useRouter();

// Prefetch au hover
<Link
  href="/subscription"
  prefetch={true} // ← Prefetch automatique Next.js
  onMouseEnter={() => router.prefetch("/subscription")}
>
  Upgrade to Pro
</Link>
```

### 4. Server Components (Next.js 13+)
```tsx
// components/ServerSideData.tsx
// Par défaut Server Component
export default async function ServerSideData() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// Client Component uniquement si interactif
"use client";
export default function InteractiveForm() {
  const [state, setState] = useState();
  // ...
}
```

### 5. Streaming SSR
```tsx
// app/page.tsx
import { Suspense } from "react";

export default function Page() {
  return (
    <div>
      <Header />
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />
      </Suspense>
    </div>
  );
}
```

## 📈 Checklist d'Optimisation

### Images
- [ ] Toutes les images utilisent `next/image`
- [ ] Images converties en WebP/AVIF
- [ ] Hero image a `priority={true}`
- [ ] Autres images en `loading="lazy"`
- [ ] Width/height spécifiés partout
- [ ] Alt text sur toutes les images

### Fonts
- [ ] `font-display: swap` activé
- [ ] Fonts preload pour critical text
- [ ] Fallback fonts définis

### JavaScript
- [ ] Bundle < 200KB (First Load JS)
- [ ] Code splitting actif
- [ ] Components lourds lazy-loaded
- [ ] Analytics/tracking en defer

### CSS
- [ ] Critical CSS inline
- [ ] Unused CSS purgé (TailwindCSS le fait auto)
- [ ] Animations optimisées (transform/opacity uniquement)

### Caching
- [ ] Service Worker (PWA)
- [ ] Static assets cachés
- [ ] API responses cachées (SWR/React Query)

## 🎯 Objectifs POSTY 2025

| Metric | Actuel | Objectif | Status |
|--------|--------|----------|--------|
| **LCP** | TBD | < 2.0s | 🔍 À mesurer |
| **FID** | TBD | < 50ms | 🔍 À mesurer |
| **CLS** | TBD | < 0.05 | 🔍 À mesurer |
| **FCP** | TBD | < 1.5s | 🔍 À mesurer |
| **TTI** | TBD | < 3.5s | 🔍 À mesurer |

## 🔄 Process de Monitoring

1. **Avant chaque release**: Lighthouse audit
2. **Hebdomadaire**: PageSpeed Insights
3. **Mensuel**: Chrome UX Report analysis
4. **Continu**: Real User Monitoring (RUM)

### Outils RUM (optionnel)
- **Vercel Analytics**: Intégré si déployé sur Vercel
- **Google Analytics 4**: Core Web Vitals reporting
- **Sentry**: Performance monitoring

## 🚨 Alertes à Configurer

Si déploiement Vercel:
```bash
# Vercel Speed Insights
npm install @vercel/speed-insights

# Dans app/layout.tsx
import { SpeedInsights } from "@vercel/speed-insights/next";

<body>
  {children}
  <SpeedInsights />
</body>
```

## 📚 Ressources

- [Web.dev Core Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

**Prochaine étape**: Lancer le premier audit avec Lighthouse et créer un baseline
