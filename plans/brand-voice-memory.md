# Plan — Brand Voice Memory

**Objectif** : L'IA apprend progressivement la voix de marque de l'utilisateur (ton, audience, topics, formulations) et l'injecte dans les prompts de génération. Feature gated Pro+Max. Effet d'accumulation = rétention.

**Estimation totale** : 9-12 jours dev (~2 semaines)

---

## Phase 0 — Documentation Discovery (FAIT, résumé)

### Stack confirmée
- **LLM provider** : OpenAI uniquement (pas d'Anthropic SDK). Models : GPT-4 (gen prod), GPT-4o-mini (intent/extraction), GPT-3.5-turbo (memory/insights).
- **Pas de prompt caching** OpenAI utilisé actuellement.
- **Mémoire utilisateur existante** : `users/{uid}/memory` (système de FAITS, pas de voix). Injectée via `buildMemoryContext()` ligne 434 puis assemblée ligne 858-869 de `app/api/generate/route.ts`.

### Points d'ancrage critiques (fichiers:lignes)

| Sujet | Fichier | Lignes |
|---|---|---|
| Plans config (PlanLimits) | `lib/config/plans.ts` | 356–409 (interface), 435–564 (PLAN_CONFIGS) |
| Permissions helper pattern | `lib/config/permissions.ts` | 314–317 (`hasMarketingStrategist`) |
| SubscriptionContext value | `contexts/SubscriptionContext.tsx` | 98–143 |
| UserProfile interface | `types/index.ts` | 112–196 |
| Firestore rules user subcoll | `firestore.rules` | 42, 61–107 (pattern `isResourceOwner()`) |
| Admin SDK access | `lib/firebase-admin.ts` | 136–151 (`adminDb`) |
| Prompt assemblé | `app/api/generate/route.ts` | 858–869 |
| Prompt base templates | `lib/services/prompt-builder.ts` | 208–606 |
| Posts collection | `lib/db/firestore.ts` | 248–272 (types), 263–301 (savePost) |
| Publish hook | `app/api/linkedin/publish/route.ts` | 31–150 |
| Schedule hook | `app/api/ai/action/route.ts` | 65–110 |
| i18n structure | `lib/i18n/translations/fr.ts` `en.ts` | objet nested par sections |
| Settings page pattern | `app/settings/page.tsx` | 356–606 (sections theme/notif/memory) |
| Composants UI réutilisables | `components/ui/{Button,Input,Toggle,Card}.tsx` | — |
| Mobile header whitelist | `components/layout/PersistentMobileHeader.tsx` | 11–17 (APP_ROUTE_PREFIXES) |

### Anti-patterns à éviter
- ❌ Ne PAS introduire Anthropic SDK / Haiku — utiliser GPT-4o-mini (déjà en place).
- ❌ Ne PAS créer une collection top-level `brandVoices/` — utiliser sous-collection `users/{uid}/brandVoice/` (cohérent avec les rules existantes).
- ❌ Ne PAS bloquer l'UX de génération en attendant l'extraction LLM — fire-and-forget comme la mémoire existante (`app/api/generate/route.ts:723-746`).
- ❌ Ne PAS dupliquer la mémoire FAITS existante — ce sont deux systèmes complémentaires (faits = QUI, voix = COMMENT).

---

## Phase 1 — MVP : Schema + Éditeur manuel + Injection prompt (3-4 jours)

**But** : Livrer de la valeur immédiate avec un profil éditable manuellement par l'utilisateur, injecté dans tous les prompts de génération. Pas d'auto-apprentissage.

### 1.1 Schema & Types
**Fichier** : `types/index.ts` — copier le pattern `UserMemorySettings` existant
```ts
export interface BrandVoiceProfile {
  version: number;             // monotonic counter for rollback
  updatedAt: Timestamp;
  source: "manual" | "learned" | "hybrid";
  // Voice attributes
  toneDescriptors: string[];   // ex: ["direct", "ironique", "pédagogue"]
  targetAudience?: string;     // ex: "CTO de scale-ups B2B SaaS"
  recurringTopics: string[];   // ex: ["agentic engineering", "DX", "hiring"]
  signaturePhrases?: string;   // multi-ligne, exemples de formulations
  avoidPhrases?: string;       // formulations à ne JAMAIS utiliser
  preferredLengthHint?: "short" | "medium" | "long";
  emojiPolicy?: "none" | "sparse" | "frequent";
  // Meta
  samplesAnalyzed: number;     // 0 en mode manuel, incrémenté en Phase 2
}
```

### 1.2 Plans / Permissions / Context
**`lib/config/plans.ts`** — ajouter à `PlanLimits` (lignes 356-409) :
```ts
hasBrandVoiceMemory: boolean;
```
Puis dans PLAN_CONFIGS (lignes 445-558) : `free: false`, `pro: true`, `max: true`.

**`lib/config/permissions.ts`** — copier le pattern de `hasMarketingStrategist` (lignes 314-317) :
```ts
export function hasBrandVoiceMemory(subscription: UserSubscription): boolean {
  if (!subscription.plan) return false;
  return planHasFeature(subscription.plan, "hasBrandVoiceMemory");
}
```

**`contexts/SubscriptionContext.tsx`** — ajouter `hasBrandVoiceMemory: boolean` au context value (ligne 98-143) et à l'objet retourné.

### 1.3 Persistance Firestore

**Path** : `users/{uid}/brandVoice/profile` (document unique au début, pas array de versions — versioning ajouté en Phase 3).

**`firestore.rules`** — ajouter après les rules existantes user subcoll :
```
match /users/{userId}/brandVoice/{document=**} {
  allow read, write: if isOwner(userId);
}
```

**Nouveau fichier** : `lib/db/brand-voice.ts`
- `getBrandVoiceProfile(uid: string): Promise<BrandVoiceProfile | null>`
- `updateBrandVoiceProfile(uid: string, patch: Partial<BrandVoiceProfile>): Promise<void>` — increment `version`, set `updatedAt`, set `source: "manual"` si touché par l'utilisateur.

### 1.4 Route API
**Nouveau** : `app/api/brand-voice/profile/route.ts`
- `GET` : retourne le profil de l'utilisateur authentifié (404 si vide).
- `PATCH` : valide le body avec Zod, écrit via Admin SDK, return le profil mis à jour.
- Auth check standard (cf. autres routes `app/api/`).
- Permission check : `hasBrandVoiceMemory(subscription)` → 403 si free.

### 1.5 Injection dans le prompt
**Fichier critique** : `app/api/generate/route.ts:858-869`

Après l'injection profil + mémoire existantes, ajouter :
```ts
const brandVoice = await getBrandVoiceProfile(userId);  // peut être null
const voiceBlock = brandVoice ? buildBrandVoiceBlock(brandVoice, language) : "";
```

Puis concaténer `voiceBlock` au system prompt — **APRÈS** profil/mémoire mais **AVANT** les rules LinkedIn (lignes 179-200 de `lib/services/prompt-builder.ts`). Format proposé :
```
=== VOIX DE MARQUE ===
Ton : direct, ironique, pédagogue
Audience cible : CTO de scale-ups B2B SaaS
Topics récurrents : agentic engineering, DX, hiring
Formulations signature : [exemples]
À éviter : [exemples]
Longueur préférée : medium | Politique emoji : sparse
======================
```

**Nouveau helper** : `lib/services/brand-voice-prompt.ts` exportant `buildBrandVoiceBlock(profile, language)`.

### 1.6 UI — Section "Ma voix de marque" dans /settings
**Fichier** : `app/settings/page.tsx` — ajouter une nouvelle `motion.section` entre Theme et Notifications (cf. structure lignes 356-606).

**Nouveau composant** : `components/settings/BrandVoiceSection.tsx`
- Pattern : copier la section "AI Memory" (lignes 531-606 de settings/page.tsx) car structure très proche.
- Champs :
  - `Input` array (chips) pour `toneDescriptors` et `recurringTopics`
  - `Input` simple pour `targetAudience`
  - `Textarea` (composant à vérifier dans `components/ui/`) pour `signaturePhrases` et `avoidPhrases`
  - `ToggleField` ou radio pour `preferredLengthHint` et `emojiPolicy`
- Composants : `Button`, `Input`, `Toggle` depuis `components/ui/`
- Sauvegarde : appel à `/api/brand-voice/profile` PATCH, toast success (pattern existant settings ligne 202).
- Si `!hasBrandVoiceMemory` → afficher upsell card (pattern `UpgradeProCTA` de `components/ui/PremiumCTA.tsx`).

### 1.7 i18n
**`lib/i18n/translations/fr.ts` et `en.ts`** — ajouter section :
```ts
brandVoice: {
  title: "Ma voix de marque",  // EN: "My brand voice"
  description: "Apprenez à l'IA à écrire comme vous.",
  toneLabel: "Ton",
  audienceLabel: "Audience cible",
  topicsLabel: "Sujets récurrents",
  signatureLabel: "Formulations signature",
  avoidLabel: "À éviter",
  lengthLabel: "Longueur préférée",
  emojiLabel: "Politique emoji",
  saveSuccess: "Voix de marque mise à jour",
  upsellTitle: "Disponible sur Pro et Max",
}
```

### Checklist de vérification — Phase 1
- [ ] `npx tsc --noEmit` passe sans erreur
- [ ] Un user Pro peut éditer son profil dans /settings et le voir persister après refresh
- [ ] Un user Free voit l'upsell et ne peut pas PATCH (403)
- [ ] Un `GET /api/brand-voice/profile` avec un cookie d'un autre user retourne 403/null (test isolation)
- [ ] Après remplissage, le prompt envoyé à OpenAI dans `/api/generate` contient le bloc `=== VOIX DE MARQUE ===` (vérifier via log temporaire)
- [ ] Génération vide-de-voix (user sans profil) continue à fonctionner sans erreur
- [ ] Intent classifier (project_intent_classifier_2026_05) non-régressé
- [ ] Mobile : section settings rendue correctement sur iPhone 15 / Pixel 7

### Anti-pattern guards Phase 1
- ❌ Ne PAS modifier `buildOptimizedPrompt()` si tu peux injecter en pré-concaténation après son retour (préserve la signature et minimise le diff).
- ❌ Ne PAS écrire directement à Firestore depuis le composant React — passer par `/api/brand-voice/profile` (cohérent avec auth checks).

---

## Phase 2 — Auto-apprentissage depuis les actions utilisateur (3-4 jours)

**But** : Le profil de voix se peuple automatiquement à partir des actions utilisateur, sans qu'il ait à remplir manuellement.

### 2.1 Définir les signaux et leur poids
| Action | Source code | Poids | Rationale |
|---|---|---|---|
| `chosenVersion: "A" ou "B"` picked | `lib/db/firestore.ts` (savePost / updatePost) | 1 | choix entre 2 variantes = préférence |
| Post `isPinned: true` | pin action existante | 3 | signal explicite fort |
| Edit dans `messages[]` array (diff > 30 char) | `addMessagesToConversation` ligne 588 | 2 | correction = forme désirée |
| LinkedIn publish réussi | `app/api/linkedin/publish/route.ts:31-150` | 5 | ultime validation |
| Schedule confirmé | `app/api/ai/action/route.ts:65-110` | 4 | proche du publish |
| Delete (cascade) | `lib/db/firestore.ts:648-679` | -2 | signal négatif |

### 2.2 Extracteur LLM
**Nouveau** : `lib/services/brand-voice-extractor.ts`

Fonction `extractVoiceSignals(post, action): Promise<VoiceSignals>` :
- Input : le texte du post final + action + poids
- LLM : **GPT-4o-mini** (cf. pattern `classifyContentIntent` dans `lib/ai/content-intent.ts:59-150`, JSON mode)
- Output structuré (Zod-validated) :
  ```ts
  {
    toneDescriptors: string[];  // 1-3 max
    detectedTopics: string[];   // 1-3 max
    lengthBucket: "short" | "medium" | "long";
    emojiDensity: "none" | "sparse" | "frequent";
    notableHooks?: string[];    // openers récurrents
    notableCTAs?: string[];     // CTAs récurrents
  }
  ```
- Prompt système : strict + exemples (anti-overfitting sur un post isolé).

### 2.3 Pipeline de merge incrémental
**Nouveau** : `lib/services/brand-voice-merger.ts`

Fonction `mergeVoiceSignals(profile, signals, weight): BrandVoiceProfile` :
- Frequency-weighted : un attribut doit apparaître dans ≥ 3 samples pondérés pour entrer dans le profil.
- Decay : signaux > 90 jours pondérés × 0.5.
- Limite stricte : max 5 toneDescriptors, max 8 recurringTopics.
- Source devient `"learned"` si `samplesAnalyzed > 5`, `"hybrid"` si l'utilisateur a édité après auto-learning.

### 2.4 Route API d'apprentissage
**Nouveau** : `app/api/brand-voice/learn/route.ts`
- `POST` body : `{ postId: string, action: "chose" | "pin" | "edit" | "publish" | "schedule" | "discard" }`
- Charge le post depuis Firestore (vérifier `userId` match)
- Appelle `extractVoiceSignals()` puis `mergeVoiceSignals()`
- Persiste via `updateBrandVoiceProfile()` (incrément `samplesAnalyzed`)
- **Fire-and-forget côté caller** : `void fetch(...)` (cf. pattern memory extraction `app/api/generate/route.ts:723-746`)

### 2.5 Hooks dans le code existant (callers)
Insertions minimales **après** l'action réussie :

1. **Génération** (`app/api/generate/route.ts` après save initial) : trigger uniquement si `chosenVersion` est explicitement choisi côté UI (action "chose").
2. **Publish** (`app/api/linkedin/publish/route.ts` ligne ~200 après `saveLinkedInPostAdmin`) : `void triggerBrandVoiceLearn(postId, "publish")`.
3. **Schedule** (`app/api/ai/action/route.ts` ligne 105-109 après `scheduledPosts.add`) : `void triggerBrandVoiceLearn(postId, "schedule")`.
4. **Pin** : trouver le handler de pin (probablement client-side, route ou direct Firestore mutation) — ajouter le trigger.
5. **Delete** : `lib/db/firestore.ts:648-679` (deletePost) — `void triggerBrandVoiceLearn(postId, "discard")`.

**Helper centralisé** : `lib/services/brand-voice-trigger.ts` qui expose `triggerBrandVoiceLearn(postId, action)` (POST vers `/api/brand-voice/learn` ou appel direct si server-side).

### 2.6 Garde-fous coût LLM
- Throttle par user : max 1 extraction toutes les 60 secondes (Firestore atomic counter dans `users/{uid}/brandVoice/profile.lastExtractionAt`).
- Skip si plan ≠ pro/max.
- Skip si action = `chose` ET le post a < 50 char (probablement trivial).
- Log dans `analytics_daily` (pattern existant `lib/analytics/tracker.ts`) le nombre d'extractions/jour pour monitoring.

### Checklist de vérification — Phase 2
- [ ] Publier un post via le pipeline LinkedIn → vérifier dans Firestore que `samplesAnalyzed` a incrémenté
- [ ] Après 3 publish avec posts au ton similaire, le profil contient des `toneDescriptors` cohérents
- [ ] Le profil édité manuellement n'est pas écrasé : flag `source: "hybrid"` apparaît, attributs édités préservés
- [ ] Throttle : 2 actions en < 60s → une seule extraction
- [ ] Coût : monitoring sur 1 journée test confirme < 0,01€/user/jour
- [ ] Pas de régression sur le pipeline /api/generate (latence p95 inchangée)

### Anti-pattern guards Phase 2
- ❌ Ne PAS extraire à chaque follow-up de conversation (trop de bruit + coût).
- ❌ Ne PAS écraser un attribut édité manuellement par un signal automatique (respecter `source: "manual"`).
- ❌ Ne PAS faire l'extraction synchrone — fire-and-forget impératif.

---

## Phase 3 — UI avancée : Confidence, historique, rollback (2-3 jours)

### 3.1 Confidence indicator
- Composant `BrandVoiceConfidenceBadge` affichant : "Voix apprise sur N posts publiés" (N = `samplesAnalyzed`).
- 3 paliers : faible (0-5), bonne (6-20), forte (21+) avec icon/color.

### 3.2 Historique versionné
- Nouveau path : `users/{uid}/brandVoice/versions/{versionId}` — snapshot à chaque update majeur (delta significatif détecté par `mergeVoiceSignals`).
- UI : liste timeline réduite (10 dernières versions), bouton "Restaurer cette version" qui crée une nouvelle version (pas de mutation in-place).
- Endpoint `GET /api/brand-voice/profile?history=true` retourne versions.

### 3.3 Signaux récents (transparence)
- Section "Signaux détectés récemment" dans `BrandVoiceSection.tsx` : liste des 5 derniers signaux extraits avec source (quel post) et possibilité de "ignorer ce signal" (downvote → exclu du merge futur).

### 3.4 Toggle "pause auto-learning"
- Champ `BrandVoiceProfile.autoLearningEnabled: boolean` (default true).
- Toggle dans la section settings.
- Si false → `/api/brand-voice/learn` skip (return 204).

### Checklist de vérification — Phase 3
- [ ] Confidence badge affiche le bon palier
- [ ] Restaurer une version ancienne crée une nouvelle version (history préservée)
- [ ] Ignorer un signal → ne réapparaît pas dans les extractions suivantes du même type
- [ ] Toggle pause → aucun nouvel échantillon

### Anti-pattern guards Phase 3
- ❌ Ne PAS muter les versions historiques (immutables).
- ❌ Ne PAS faire de migration destructive du schéma sans backup.

---

## Phase 4 — Verification & Polish (1 jour)

### 4.1 Tests E2E (Playwright, cf. project_e2e_testing)
- `e2e/brand-voice.spec.ts` (mobile-first : iPhone 15 + Pixel 7) :
  - Free user voit upsell
  - Pro user peut éditer profil, persiste après refresh
  - Edit profil → génération suivante contient le bloc voix (assert via mock OpenAI ou check log)
  - Cross-user isolation : userA ne peut pas accéder à `/api/brand-voice/profile` de userB

### 4.2 Security
- Vérifier rules Firestore (emulator) : `npx firebase emulators:exec`
- Vérifier que `BrandVoiceProfile` n'est JAMAIS retourné dans une route publique
- Pas de log du contenu de voix en production (anonymiser dans `analytics_daily`)

### 4.3 Non-régression
- `npx tsc --noEmit`
- Intent classifier (cf. `tests/` ou mémoire project_intent_classifier_2026_05) : suite passe
- Pipeline /api/generate : latence p95 mesurée avant/après

### 4.4 Migration data
- Script `scripts/seed-brand-voice.mjs` (optionnel) : pour les users existants Pro+Max, créer un doc vide `users/{uid}/brandVoice/profile` initial. Pas obligatoire — création paresseuse côté GET fonctionne.

### 4.5 Documentation
- Ajouter section dans CLAUDE.md (pas un nouveau .md) : pointer vers ce plan.
- Mettre à jour la mémoire claude-mem avec les fichiers ajoutés.

### Checklist finale
- [ ] Tests E2E verts sur iPhone 15 + Pixel 7
- [ ] tsc clean
- [ ] Pas de régression intent classifier
- [ ] Pas de régression pipeline generate (latence)
- [ ] Firestore rules emulator : isolation prouvée
- [ ] i18n complet FR + EN
- [ ] Coût LLM < 0,01€/user/jour confirmé sur sample test

---

## Risques techniques majeurs

| Risque | Mitigation |
|---|---|
| Coût LLM explose si extraction trop fréquente | Throttle 60s + skip free + skip posts triviaux + monitoring quotidien |
| Drift du profil (signaux contradictoires) | Frequency-weighted merge + seuil min 3 occurrences + decay 90j |
| Privacy : leak entre users | Firestore rules strictes `isOwner` + tests E2E cross-user explicites |
| Régression intent classifier (gated par mémoire récente cf. project_intent_classifier_2026_05) | Injection APRÈS classifier + non-modification du flow existant + tests dédiés |
| Cold start (user sans posts) | MVP Phase 1 = édition manuelle → couvre le cold start ; auto-learning n'est qu'un boost |
| Profil édité manuellement écrasé par auto-learning | Flag `source: "manual" / "hybrid"` + merge respecte les attributs touchés |
| Latence ajoutée à `/api/generate` par le GET du profil | Cache in-memory côté serveur (TTL 60s) ou inclure dans le bundle du payload SSR initial |

---

## Fichiers à créer / modifier — récap

**Phase 1** :
- ✏️ `types/index.ts` — interface `BrandVoiceProfile`
- ✏️ `lib/config/plans.ts` — `hasBrandVoiceMemory` dans PlanLimits + PLAN_CONFIGS
- ✏️ `lib/config/permissions.ts` — `hasBrandVoiceMemory()` helper
- ✏️ `contexts/SubscriptionContext.tsx` — expose dans value
- ✏️ `firestore.rules` — rules sous-collection
- ✏️ `app/api/generate/route.ts` — injection prompt (lignes 858-869)
- ✏️ `app/settings/page.tsx` — nouvelle section
- ✏️ `lib/i18n/translations/fr.ts` + `en.ts` — section brandVoice
- 🆕 `lib/db/brand-voice.ts`
- 🆕 `app/api/brand-voice/profile/route.ts`
- 🆕 `lib/services/brand-voice-prompt.ts` — `buildBrandVoiceBlock()`
- 🆕 `components/settings/BrandVoiceSection.tsx`

**Phase 2** :
- ✏️ `app/api/linkedin/publish/route.ts` — hook publish
- ✏️ `app/api/ai/action/route.ts` — hook schedule
- ✏️ `lib/db/firestore.ts` — hook deletePost + savePost
- 🆕 `app/api/brand-voice/learn/route.ts`
- 🆕 `lib/services/brand-voice-extractor.ts` — LLM extraction GPT-4o-mini
- 🆕 `lib/services/brand-voice-merger.ts` — merge logic
- 🆕 `lib/services/brand-voice-trigger.ts` — helper fire-and-forget

**Phase 3** :
- ✏️ `components/settings/BrandVoiceSection.tsx` — confidence + history + signaux
- ✏️ `app/api/brand-voice/profile/route.ts` — `?history=true`
- ✏️ `lib/db/brand-voice.ts` — versionning

**Phase 4** :
- 🆕 `e2e/brand-voice.spec.ts`
- ✏️ `CLAUDE.md` — pointer vers ce plan
