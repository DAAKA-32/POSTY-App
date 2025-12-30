# Configuration Vercel pour POSTY

## Variables d'environnement requises

Pour que l'application fonctionne correctement sur Vercel, vous devez configurer les variables d'environnement Firebase suivantes :

### Étape 1 : Récupérer les informations Firebase

1. Accédez à la [Console Firebase](https://console.firebase.google.com)
2. Sélectionnez votre projet
3. Allez dans **Project Settings** (Paramètres du projet) > **General** (Général)
4. Scrollez jusqu'à la section **Your apps** (Vos applications)
5. Sélectionnez ou créez une application Web
6. Copiez les valeurs de configuration

### Étape 2 : Configurer les variables dans Vercel

1. Accédez au [Dashboard Vercel](https://vercel.com/dashboard)
2. Sélectionnez votre projet POSTY
3. Allez dans **Settings** > **Environment Variables**
4. Ajoutez les variables suivantes (pour **tous les environnements** : Production, Preview, Development) :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Clé API Firebase | `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Domaine d'authentification | `votre-projet.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID du projet | `votre-projet` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket de stockage | `votre-projet.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ID expéditeur messaging | `123456789012` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ID de l'application | `1:123456789012:web:abcdef123456` |

### Étape 3 : Redéployer

Après avoir ajouté toutes les variables d'environnement :

1. Allez dans l'onglet **Deployments**
2. Cliquez sur le dernier déploiement
3. Cliquez sur le bouton avec les trois points (...) > **Redeploy**
4. Sélectionnez **Use existing Build Cache** (Utiliser le cache de build existant) - NON
5. Cliquez sur **Redeploy**

## Vérification

Une fois le déploiement terminé, vérifiez que :

- ✅ L'application se charge sans erreur
- ✅ La page de connexion s'affiche correctement
- ✅ L'authentification Google fonctionne
- ✅ Les données sont enregistrées dans Firestore

## Dépannage

### Erreur : `auth/invalid-api-key`

**Cause** : Les variables d'environnement Firebase ne sont pas configurées ou sont incorrectes.

**Solution** :
1. Vérifiez que TOUTES les variables sont définies dans Vercel
2. Vérifiez qu'il n'y a pas d'espace ou de caractère invisible
3. Assurez-vous que les variables sont activées pour tous les environnements
4. Redéployez l'application

### Erreur de build

**Cause** : Problème avec les dépendances ou la configuration Next.js.

**Solution** :
1. Vérifiez les logs de build dans Vercel
2. Assurez-vous que `next.config.ts` est correct
3. Vérifiez que toutes les dépendances dans `package.json` sont installées

### Firebase non initialisé côté client

**Cause** : Les variables d'environnement ne sont pas accessibles côté client.

**Solution** :
1. Toutes les variables Firebase doivent commencer par `NEXT_PUBLIC_`
2. Redéployez après avoir modifié les variables

## Notes importantes

- ⚠️ **Sécurité** : Les variables `NEXT_PUBLIC_*` sont exposées côté client. C'est normal pour Firebase, mais ne mettez JAMAIS de secrets (clés privées, tokens API, etc.) dans des variables `NEXT_PUBLIC_`.
- 📝 **Build** : L'application utilise le rendu hybride Next.js. Firebase s'initialise uniquement côté client pour éviter les erreurs de build.
- 🔄 **Cache** : Après modification des variables d'environnement, redéployez SANS cache pour que les changements prennent effet.

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs de déploiement dans Vercel
2. Vérifiez la console du navigateur pour les erreurs côté client
3. Assurez-vous que Firebase est correctement configuré dans la console Firebase
