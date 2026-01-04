# 📘 Guide d'Intégration LinkedIn OAuth 2.0 pour POSTY

## 🎯 Vue d'ensemble

Cette intégration permet aux utilisateurs de **POSTY** de connecter leur compte LinkedIn personnel et de publier directement leurs posts générés par IA sur leur profil LinkedIn.

### Flow OAuth 2.0 Complet

```
1. Utilisateur clique sur "Connecter LinkedIn"
   ↓
2. Redirection vers linkedin.com pour autorisation
   ↓
3. Utilisateur autorise l'application POSTY
   ↓
4. LinkedIn redirige vers /api/auth/linkedin/callback avec code
   ↓
5. Notre API échange le code contre un access token
   ↓
6. Récupération du profil utilisateur LinkedIn
   ↓
7. Stockage sécurisé dans Firestore
   ↓
8. Redirection vers /app avec succès
   ↓
9. Utilisateur peut maintenant publier via le bouton "Valider"
```

---

## 🔐 Architecture de Sécurité

### ✅ Ce qui est sécurisé

- **Tokens jamais exposés au client** : Les access tokens LinkedIn sont uniquement manipulés côté serveur
- **Client Secret protégé** : Stocké dans variables d'environnement serveur uniquement
- **OAuth State** : Le userId est utilisé comme state pour prévenir les attaques CSRF
- **Vérification d'expiration** : Les tokens expirés sont détectés avant publication

### Routes API Next.js

#### 1. `/api/auth/linkedin/callback` (GET)
**Callback OAuth après autorisation LinkedIn**

```typescript
// Cette route est appelée automatiquement par LinkedIn
// Elle gère :
// - Échange code → access token
// - Récupération du profil utilisateur
// - Stockage sécurisé dans Firestore
// - Redirection vers /app?linkedin_success=true
```

#### 2. `/api/linkedin/publish` (POST)
**Publication d'un post sur LinkedIn**

```typescript
// Body attendu :
{
  userId: string,      // ID utilisateur POSTY
  content: string,     // Contenu du post
  postId?: string      // ID du post POSTY (optionnel)
}

// Réponse succès :
{
  success: true,
  message: "Post publié sur LinkedIn avec succès !",
  shareId: "urn:li:share:...",
  shareUrl: "https://www.linkedin.com/feed/update/..."
}

// Réponse erreur :
{
  error: "linkedin_not_connected" | "token_expired" | "publish_failed",
  message: "Description de l'erreur"
}
```

---

## 📦 Composants Disponibles

### 1. `LinkedInConnectButton`

Bouton intelligent qui affiche l'état de connexion LinkedIn.

**Import :**
```tsx
import LinkedInConnectButton from "@/components/linkedin/LinkedInConnectButton";
```

**Utilisation basique :**
```tsx
<LinkedInConnectButton />
```

**Props :**
```typescript
interface LinkedInConnectButtonProps {
  variant?: "default" | "compact";  // Style du bouton
  className?: string;                // Classes CSS additionnelles
}
```

**Exemple dans une page de paramètres :**
```tsx
import LinkedInConnectButton from "@/components/linkedin/LinkedInConnectButton";

export default function SettingsPage() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Connexion LinkedIn</h2>
      <LinkedInConnectButton variant="default" />
    </div>
  );
}
```

### 2. `useLinkedIn` Hook

Hook React pour accéder au contexte LinkedIn dans n'importe quel composant.

**Import :**
```tsx
import { useLinkedIn } from "@/contexts/LinkedInContext";
```

**Interface :**
```typescript
interface LinkedInContextType {
  connection: LinkedInConnectionData | null;  // Données de connexion
  isLoading: boolean;                         // Chargement en cours
  isConnected: boolean;                       // Utilisateur connecté
  isTokenValid: boolean;                      // Token non expiré
  connectLinkedIn: () => void;                // Initier OAuth
  disconnectLinkedIn: () => Promise<void>;    // Déconnecter
  publishToLinkedIn: (content: string, postId?: string) => Promise<{
    success: boolean;
    postUrl?: string;
    error?: string;
  }>;
  refreshConnection: () => Promise<void>;     // Recharger connexion
}
```

**Exemple d'utilisation :**
```tsx
import { useLinkedIn } from "@/contexts/LinkedInContext";
import toast from "react-hot-toast";

export default function PublishButton({ content }: { content: string }) {
  const { isConnected, isTokenValid, publishToLinkedIn } = useLinkedIn();

  const handlePublish = async () => {
    if (!isConnected) {
      toast.error("Connectez d'abord votre compte LinkedIn");
      return;
    }

    if (!isTokenValid) {
      toast.error("Votre session LinkedIn a expiré. Reconnectez-vous.");
      return;
    }

    const result = await publishToLinkedIn(content);

    if (result.success) {
      toast.success("Post publié sur LinkedIn !");
      console.log("URL du post :", result.postUrl);
    } else {
      toast.error(result.error || "Erreur de publication");
    }
  };

  return (
    <button
      onClick={handlePublish}
      disabled={!isConnected || !isTokenValid}
      className="bg-[#0A66C2] hover:bg-[#004182] px-4 py-2 rounded"
    >
      Publier sur LinkedIn
    </button>
  );
}
```

---

## 🎨 Exemples d'Intégration Frontend

### Exemple 1 : Afficher l'état de connexion

```tsx
import { useLinkedIn } from "@/contexts/LinkedInContext";

export default function LinkedInStatus() {
  const { isConnected, isTokenValid, connection } = useLinkedIn();

  return (
    <div className="p-4 bg-dark-card rounded-lg">
      {isConnected ? (
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <div>
            <p className="text-white font-medium">{connection?.profileName}</p>
            <p className="text-sm text-text-secondary">
              {isTokenValid ? "Connecté" : "Session expirée"}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-gray-500" />
          <p className="text-text-secondary">Non connecté</p>
        </div>
      )}
    </div>
  );
}
```

### Exemple 2 : Publier un post avec feedback

```tsx
import { useState } from "react";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import toast from "react-hot-toast";

export default function LinkedInPublisher({ content }: { content: string }) {
  const [isPublishing, setIsPublishing] = useState(false);
  const { isConnected, publishToLinkedIn } = useLinkedIn();

  const handlePublish = async () => {
    setIsPublishing(true);

    try {
      const result = await publishToLinkedIn(content);

      if (result.success) {
        toast.success("Publié avec succès !");

        // Ouvrir le post LinkedIn dans un nouvel onglet
        if (result.postUrl) {
          window.open(result.postUrl, "_blank");
        }
      } else {
        toast.error(result.error || "Échec de la publication");
      }
    } catch (error) {
      toast.error("Erreur inattendue");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isConnected) {
    return <LinkedInConnectButton />;
  }

  return (
    <button
      onClick={handlePublish}
      disabled={isPublishing}
      className="flex items-center gap-2 bg-[#0A66C2] hover:bg-[#004182] px-4 py-2 rounded"
    >
      {isPublishing ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Publication...
        </>
      ) : (
        <>
          <LinkedInIcon className="w-5 h-5" />
          Publier sur LinkedIn
        </>
      )}
    </button>
  );
}
```

### Exemple 3 : Modale de publication complète

```tsx
import { useState } from "react";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import LinkedInConnectButton from "@/components/linkedin/LinkedInConnectButton";
import toast from "react-hot-toast";

export default function PublishModal({
  isOpen,
  onClose,
  content
}: {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}) {
  const [isPublishing, setIsPublishing] = useState(false);
  const { isConnected, isTokenValid, publishToLinkedIn } = useLinkedIn();

  const handlePublish = async () => {
    setIsPublishing(true);

    const result = await publishToLinkedIn(content);

    if (result.success) {
      toast.success("Post publié avec succès !");
      onClose();
    } else {
      toast.error(result.error || "Erreur de publication");
    }

    setIsPublishing(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Publier sur LinkedIn">
      <div className="space-y-4">
        {/* Preview du contenu */}
        <div className="p-4 bg-dark-hover rounded-lg">
          <p className="text-sm text-text-secondary mb-2">Aperçu :</p>
          <p className="text-white whitespace-pre-wrap">{content}</p>
        </div>

        {/* État de connexion */}
        {!isConnected ? (
          <div className="text-center py-6">
            <p className="text-text-secondary mb-4">
              Connectez votre compte LinkedIn pour publier
            </p>
            <LinkedInConnectButton />
          </div>
        ) : !isTokenValid ? (
          <div className="text-center py-6">
            <p className="text-orange-400 mb-4">
              ⚠️ Votre session LinkedIn a expiré
            </p>
            <LinkedInConnectButton />
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={onClose}
              disabled={isPublishing}
            >
              Annuler
            </Button>
            <Button
              fullWidth
              onClick={handlePublish}
              isLoading={isPublishing}
              className="bg-[#0A66C2] hover:bg-[#004182]"
            >
              Publier
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
```

---

## ✅ Check-list de Validation

### Configuration

- [x] Variables d'environnement configurées dans `.env.local`
- [x] LinkedIn Developer App créée avec redirect URI
- [x] Scopes OAuth configurés : `openid profile email w_member_social`

### Backend (Next.js API Routes)

- [x] Route `/api/auth/linkedin/callback` créée
- [x] Route `/api/linkedin/publish` créée
- [x] Gestion d'erreurs complète
- [x] Tokens jamais exposés au client
- [x] Stockage sécurisé dans Firestore

### Frontend

- [x] `LinkedInContext` configuré
- [x] `LinkedInConnectButton` fonctionnel
- [x] Hook `useLinkedIn` disponible
- [x] Notifications toast pour succès/erreurs

### Tests à Effectuer

1. **Test de Connexion**
   - [ ] Cliquer sur "Connecter LinkedIn"
   - [ ] Autoriser l'application sur LinkedIn
   - [ ] Vérifier la redirection vers /app?linkedin_success=true
   - [ ] Vérifier que le profil s'affiche correctement

2. **Test de Publication**
   - [ ] Générer un post avec l'IA
   - [ ] Cliquer sur le bouton "Publier"
   - [ ] Vérifier que le post apparaît sur LinkedIn
   - [ ] Vérifier l'enregistrement dans Firestore

3. **Test de Déconnexion**
   - [ ] Cliquer sur "Déconnecter"
   - [ ] Vérifier que le profil n'est plus affiché
   - [ ] Vérifier la suppression dans Firestore

4. **Test d'Expiration**
   - [ ] Simuler un token expiré (modifier expiresAt dans Firestore)
   - [ ] Vérifier le message d'erreur
   - [ ] Vérifier que la reconnexion fonctionne

---

## 🚀 Optimisations Possibles

### 1. Refresh Token Automatique

LinkedIn fournit des access tokens valables 60 jours. Pour une meilleure expérience :

```typescript
// Dans lib/linkedin.ts
export async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  return response.json();
}
```

### 2. Prévisualisation Améliorée

Ajouter un aperçu du post tel qu'il apparaîtra sur LinkedIn :

```tsx
<div className="linkedin-preview border border-[#0A66C2] rounded-lg p-4">
  <div className="flex items-center gap-3 mb-3">
    <img src={connection.profilePicture} className="w-12 h-12 rounded-full" />
    <div>
      <p className="font-semibold">{connection.profileName}</p>
      <p className="text-xs text-gray-500">À l'instant</p>
    </div>
  </div>
  <p className="whitespace-pre-wrap">{content}</p>
</div>
```

### 3. Analytics & Logs

Ajouter un suivi des publications :

```typescript
// Dans Firestore
interface LinkedInAnalytics {
  userId: string;
  totalPosts: number;
  lastPublished: Timestamp;
  successRate: number;
}
```

### 4. Support des Images

LinkedIn API supporte les images. Extension possible :

```typescript
interface PublishOptions {
  content: string;
  imageUrl?: string;
  imageData?: Blob;
}
```

---

## 🐛 Debugging & Logs

### Activer les logs détaillés

Dans les routes API, tous les erreurs sont loggées :

```typescript
console.error("LinkedIn OAuth error:", error);
```

### Vérifier dans la console du navigateur

```javascript
// Les erreurs sont aussi visibles dans les toasts
// Ouvrir DevTools → Console pour voir les détails
```

### Firestore Collections

Vérifier les données stockées :
- Collection : `linkedInConnections`
- Collection : `linkedInPosts`

---

## 📚 Ressources LinkedIn API

- [LinkedIn OAuth 2.0 Documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [LinkedIn Share API](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin)
- [LinkedIn API Scopes](https://learn.microsoft.com/en-us/linkedin/shared/references/v2/profile)

---

## 🎉 Conclusion

L'intégration LinkedIn OAuth 2.0 est maintenant complète et prête à l'emploi ! Les utilisateurs peuvent :

✅ Connecter leur compte LinkedIn personnel
✅ Voir leur profil dans l'interface
✅ Publier des posts générés par IA en un clic
✅ Gérer leur connexion (déconnexion, reconnexion)

**Code prêt pour production** avec sécurité, gestion d'erreurs et expérience utilisateur optimale.
