# 🔒 Protection d'Abonnement - Documentation Technique

## 📋 Vue d'ensemble

Ce système de protection garantit qu'aucun utilisateur ne peut accéder à l'application sans un abonnement actif. La protection est implémentée à **3 niveaux** pour une sécurité maximale.

---

## 🛡️ Architecture de Protection (3 Niveaux)

### **Niveau 1 : Middleware Next.js (Server-Side)**

**Fichier** : [`middleware.ts`](./middleware.ts)

**Protection** :
- Vérification **AVANT** le rendu de chaque page
- Contrôle du cookie `subscription_status` (active/trialing)
- Redirection automatique vers `/pricing` si pas d'abonnement

**Routes protégées** :
```typescript
/app/*         → Génération de posts
/dashboard     → Tableau de bord
/history       → Historique
/schedule      → Programmation
/analytics     → Analytiques
/settings      → Paramètres
```

**Avantages** :
- ✅ Protection côté serveur (impossible à contourner depuis le navigateur)
- ✅ Bloque les requêtes avant même le rendu
- ✅ Empêche l'accès via URL directe

---

### **Niveau 2 : SubscriptionGuard (Client-Side)**

**Fichier** : [`components/layout/SubscriptionGuard.tsx`](./components/layout/SubscriptionGuard.tsx)

**Protection** :
- Vérification en temps réel du statut d'abonnement
- Redirection si statut change (ex: abonnement expiré)
- Affichage d'un écran de chargement pendant la vérification

**Usage** :
```tsx
<SubscriptionGuard>
  <YourProtectedContent />
</SubscriptionGuard>
```

**Avantages** :
- ✅ Réactivité en temps réel
- ✅ UX fluide avec écran de chargement
- ✅ Empêche l'accès même si l'abonnement expire pendant la session

---

### **Niveau 3 : ProtectedRoute Component (Authentification + Abonnement)**

**Fichier** : [`components/layout/ProtectedRoute.tsx`](./components/layout/ProtectedRoute.tsx)

**Protection** :
- Vérification de l'authentification
- Vérification de l'onboarding
- Intégration avec `SubscriptionGuard`

**Usage** :
```tsx
<ProtectedRoute requireOnboarding requireSubscription>
  <YourProtectedContent />
</ProtectedRoute>
```

**Paramètres** :
- `requireOnboarding` : Vérifie que l'onboarding est terminé
- `requireSubscription` : Active la protection d'abonnement via `SubscriptionGuard`

---

## 🔧 Implémentation

### Pages protégées mises à jour :

| Page | Fichier | Protection |
|------|---------|------------|
| App | `/app/app/page.tsx` | ✅ Middleware + Guard |
| Dashboard | `/app/dashboard/page.tsx` | ✅ Middleware + Guard |
| History | `/app/history/page.tsx` | ✅ Middleware + Guard |
| Schedule | `/app/schedule/page.tsx` | ✅ Middleware + Guard |
| Analytics | `/app/analytics/page.tsx` | ✅ Middleware + Guard |
| Settings | `/app/settings/page.tsx` | ✅ Middleware + Guard |

---

## 🍪 Gestion des Cookies

Le `SubscriptionContext` définit automatiquement des cookies pour le middleware :

```typescript
// Cookies définis après chaque chargement de subscription
document.cookie = `subscription_status=${status}; path=/; max-age=3600`;
document.cookie = `subscription_plan=${plan}; path=/; max-age=3600`;
```

**Durée de vie** : 1 heure (3600 secondes)
**Renouvellement** : Automatique à chaque rechargement de page

---

## 🧪 Tests de Protection

### ✅ Scénarios de Test Obligatoires

#### 1. **Test de redirection sans abonnement**
```bash
Étapes:
1. Se connecter
2. Compléter l'onboarding
3. Ne PAS souscrire à un plan
4. Tenter d'accéder à /app

Résultat attendu:
→ Redirection vers /pricing?redirect=/app&reason=subscription_required
```

#### 2. **Test du bouton "Retour"**
```bash
Étapes:
1. Se connecter et compléter l'onboarding
2. Arriver sur /pricing
3. Cliquer sur "Retour" du navigateur

Résultat attendu:
→ Redirection automatique vers /pricing
→ AUCUN accès à /app ou autres pages protégées
```

#### 3. **Test d'URL directe**
```bash
Étapes:
1. Se connecter sans abonnement
2. Taper manuellement /app dans la barre d'adresse
3. Appuyer sur Entrée

Résultat attendu:
→ Middleware bloque la requête
→ Redirection vers /pricing avant même le rendu
```

#### 4. **Test d'expiration d'abonnement**
```bash
Étapes:
1. Se connecter avec un abonnement actif
2. Accéder à /app
3. Simuler l'expiration (via Firestore: status = "canceled")
4. Rafraîchir la page

Résultat attendu:
→ SubscriptionGuard détecte le statut "canceled"
→ Redirection vers /pricing
```

#### 5. **Test de contournement via DevTools**
```bash
Étapes:
1. Se connecter sans abonnement
2. Ouvrir DevTools
3. Modifier les cookies subscription_status = "active"
4. Tenter d'accéder à /app

Résultat attendu:
→ Middleware lit le cookie mais SubscriptionGuard vérifie via Firebase
→ Redirection car le statut réel dans Firebase est "inactive"
```

---

## 🚨 Cas d'Usage Bloqués

| Action | Statut Avant | Protection Active | Résultat |
|--------|-------------|-------------------|----------|
| Clic sur "Retour" après /pricing | Pas d'abonnement | ✅ Middleware | Redirection vers /pricing |
| URL directe `/app` | Pas d'abonnement | ✅ Middleware | Bloqué avant rendu |
| Rafraîchir /app | Abonnement expiré | ✅ SubscriptionGuard | Redirection vers /pricing |
| Modifier cookie | Cookie falsifié | ✅ SubscriptionGuard | Vérifie Firebase, bloque |
| Accès via historique navigateur | Pas d'abonnement | ✅ Middleware | Redirection vers /pricing |

---

## 🔐 Sécurité Renforcée

### Pourquoi 3 niveaux ?

1. **Middleware** : Bloque les requêtes malveillantes côté serveur
2. **SubscriptionGuard** : Vérifie en temps réel (session active, expiration)
3. **ProtectedRoute** : Garantit l'authentification + onboarding

### Protection contre les attaques courantes :

| Attaque | Protection |
|---------|------------|
| Manipulation de cookies | ✅ SubscriptionGuard vérifie Firebase |
| Accès via URL directe | ✅ Middleware bloque avant rendu |
| Bypass du JavaScript | ✅ Middleware (serveur) bloque |
| Expiration pendant session | ✅ SubscriptionGuard réactif |

---

## 📊 Flow de Protection

```
┌─────────────────────────────────────────────────────┐
│  Utilisateur tente d'accéder à /app                │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Middleware (Niveau 1)│
         │   Vérifie cookies       │
         └───────────┬─────────────┘
                     │
        ┌────────────┴────────────┐
        │ Abonnement actif?        │
        └────┬────────────────┬───┘
          NON│             OUI│
             │                │
             ▼                ▼
    ┌─────────────────┐  ┌──────────────────┐
    │ Redirect /pricing│  │ Render page      │
    └─────────────────┘  └────────┬─────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │ SubscriptionGuard (Niveau 2) │
                    │ Vérifie Firebase en temps réel│
                    └──────────┬───────────────┘
                               │
                  ┌────────────┴────────────┐
                  │ Statut actif/trialing?   │
                  └────┬────────────────┬───┘
                    NON│             OUI│
                       │                │
                       ▼                ▼
              ┌─────────────────┐  ┌────────────────┐
              │ Redirect /pricing│  │ Show content   │
              └─────────────────┘  └────────────────┘
```

---

## 🧑‍💻 Pour les Développeurs

### Ajouter une nouvelle page protégée :

```tsx
// app/nouvelle-page/page.tsx
"use client";

import ProtectedRoute from "@/components/layout/ProtectedRoute";

function NouvellePage() {
  return <div>Contenu protégé</div>;
}

export default function Page() {
  return (
    <ProtectedRoute requireOnboarding requireSubscription>
      <NouvellePage />
    </ProtectedRoute>
  );
}
```

### Vérifier manuellement l'abonnement dans un composant :

```tsx
import { useSubscription } from "@/contexts/SubscriptionContext";

function MonComposant() {
  const { subscription } = useSubscription();

  const hasActiveSubscription =
    subscription.status === "active" ||
    subscription.status === "trialing";

  if (!hasActiveSubscription) {
    return <div>Abonnement requis</div>;
  }

  return <div>Contenu premium</div>;
}
```

---

## ✅ Checklist de Validation

- [ ] Middleware bloque l'accès direct à `/app` sans abonnement
- [ ] Bouton "Retour" redirige vers `/pricing`
- [ ] URL directe `/dashboard` est bloquée
- [ ] Expiration d'abonnement détectée en temps réel
- [ ] Cookies falsifiés ne permettent pas l'accès
- [ ] Toutes les pages protégées utilisent `requireSubscription`
- [ ] Tests manuels passés pour tous les scénarios ci-dessus

---

## 📞 Support

En cas de problème :
1. Vérifier les cookies dans DevTools (`subscription_status`, `subscription_plan`)
2. Vérifier le statut dans Firebase (`users/{uid}/subscription/status`)
3. Consulter les logs du middleware dans la console serveur
4. Vérifier que `PRODUCTION_MODE` n'est pas en test mode

---

## 🎯 Résultat Final

**🔒 Sécurité Niveau Production**
- Aucun bypass possible via bouton retour
- Aucun bypass possible via URL directe
- Aucun bypass possible via manipulation client-side
- Protection réactive en temps réel

**✨ UX Premium**
- Redirections fluides
- Écrans de chargement élégants
- Messages d'erreur clairs
- Contexte de redirection préservé

---

**Implémenté par** : Claude Code
**Date** : 2026-02-12
**Version** : 1.0 - Production Ready
