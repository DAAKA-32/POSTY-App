# Checklist : Configuration des variables d'environnement Vercel

## 📋 Variables à copier de .env.local vers Vercel

### ✅ Variables Firebase (OBLIGATOIRES pour le déploiement)

Accède à : https://vercel.com/dashboard → Ton projet → Settings → Environment Variables

Copie ces 6 variables **exactement** comme elles sont dans ton `.env.local` :

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAVt2lokhbmooM-qBX-UzzyTFdjcDxoMuY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tink-dc3d4.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tink-dc3d4
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tink-dc3d4.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=42281241000
NEXT_PUBLIC_FIREBASE_APP_ID=1:42281241000:web:b2b78d19a073e4ff16759d
```

**Important** :
- Coche les 3 environnements : ✅ Production ✅ Preview ✅ Development
- Clique sur "Save" pour chaque variable

### ⚠️ Variables LinkedIn (OPTIONNELLES pour le moment)

Si tu veux activer l'intégration LinkedIn sur Vercel, ajoute aussi :

```
NEXT_PUBLIC_LINKEDIN_CLIENT_ID=your_linkedin_client_id
NEXT_PUBLIC_LINKEDIN_REDIRECT_URI=https://your-app.com/settings
NEXT_PUBLIC_LINKEDIN_CALLBACK_FUNCTION_URL=https://us-central1-your-project.cloudfunctions.net/linkedinCallback
NEXT_PUBLIC_LINKEDIN_POST_FUNCTION_URL=https://us-central1-your-project.cloudfunctions.net/linkedinPost
```

**Note** : Tu devras mettre à jour les URLs avec ton vrai domaine Vercel après le premier déploiement.

## 🚀 Procédure de déploiement

### Étape 1 : Ajouter les variables dans Vercel

1. Va sur https://vercel.com/dashboard
2. Sélectionne ton projet POSTY
3. Settings → Environment Variables
4. Pour chaque variable Firebase ci-dessus :
   - Clique "Add New"
   - Name : `NEXT_PUBLIC_FIREBASE_API_KEY`
   - Value : `AIzaSyAVt2lokhbmooM-qBX-UzzyTFdjcDxoMuY`
   - Environnements : ✅ Tous les 3
   - Save
5. Répète pour les 5 autres variables Firebase

### Étape 2 : Pousser le code corrigé

```bash
git add .
git commit -m "Fix: Initialisation Firebase côté client uniquement pour Vercel"
git push origin main
```

### Étape 3 : Vérifier le déploiement

1. Vercel va automatiquement redéployer
2. Regarde les logs de build → Ça devrait passer maintenant ✅
3. Ouvre l'URL de production → Teste la connexion Firebase

## ❌ Erreurs à éviter

- ❌ Ne pas mettre les variables dans Vercel → Même erreur `auth/invalid-api-key`
- ❌ Oublier de cocher "Production, Preview, Development" → Erreur sur certains environnements
- ❌ Copier avec des espaces ou quotes → Firebase ne s'initialisera pas
- ❌ Redéployer sans avoir ajouté les variables → Même erreur

## ✅ Vérification post-déploiement

Une fois déployé, vérifie :

1. **Build réussi** : Logs Vercel montrent "✓ Generating static pages"
2. **App accessible** : L'URL Vercel charge sans erreur 500
3. **Firebase fonctionne** : Console navigateur ne montre pas "Firebase not initialized"
4. **Connexion marche** : Bouton "Se connecter avec Google" fonctionne

## 🆘 Dépannage rapide

### "auth/invalid-api-key" persiste
→ Vérifie que TOUTES les 6 variables Firebase sont dans Vercel
→ Clique sur "Redeploy" (sans cache) après avoir ajouté les variables

### "Firebase is not defined"
→ Les variables ne commencent pas par `NEXT_PUBLIC_`
→ Renomme-les correctement et redéploie

### Build passe mais app ne charge pas
→ Vérifie la console du navigateur
→ Probablement un problème de configuration Firebase dans la console Firebase

---

**Prochaine étape** : Copie les 6 variables Firebase dans Vercel, puis pousse ton code ! 🚀
