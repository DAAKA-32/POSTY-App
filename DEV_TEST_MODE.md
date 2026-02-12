# 🚀 Mode Test Dev - Guide Rapide

## ✅ Activation (Déjà fait !)

Le test mode est maintenant activé dans `.env.local` :
```bash
NEXT_PUBLIC_ENABLE_TEST_MODE=true
```

**Redémarre le serveur dev** pour activer :
```bash
npm run dev
# ou
yarn dev
```

---

## 🎯 Utilisation Rapide

### 1. **Bouton Flottant** (Plus rapide ⚡)

Un bouton flottant orange apparaît en **bas à droite** de l'écran.

**Actions :**
- Clic sur le bouton → Ouvre le menu
- **Activer Plan Max** → 1 clic, accès à tout
- **Activer Plan Pro** → 1 clic
- **Désactiver Test Mode** → Retour à l'abonnement réel

**Raccourcis Clavier :**
- <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd> → Active Plan Max instantanément
- <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd> → Désactive le test mode

---

### 2. **Panel Complet** (Sur /subscription)

Va sur `/subscription` → Un panel "Mode Test" apparaît en bas.

**Features :**
- Choix entre Free / Pro / Max
- Voir les limites de chaque plan
- Toggle on/off
- Indicateur visuel quand actif

---

## 🔥 Workflow Recommandé

### Tester une feature Premium

```bash
1. Ctrl+Shift+M  → Active Max instantanément
2. Teste ta feature
3. Ctrl+Shift+D  → Désactive si besoin
```

### Tester le flow d'upgrade

```bash
1. Désactive test mode
2. Va sur /app sans abonnement
3. Vois le flow complet (redirect, messages, etc.)
4. Sur /subscription, active Max via le panel
```

---

## 🎨 Indicateurs Visuels

- **Bouton flottant orange** = Test mode OFF
- **Bouton flottant violet pulsant** = Test mode ON
- Badge **"PRO"** ou **"MAX"** sur le bouton
- Toast notification à chaque changement

---

## 🛠️ Fichiers Modifiés

- `.env.local` → Flag `NEXT_PUBLIC_ENABLE_TEST_MODE=true`
- `components/dev/DevQuickActions.tsx` → Bouton flottant
- `app/layout.tsx` → Intégration du bouton
- `components/subscription/TestModePanel.tsx` → Panel complet (existant)

---

## ⚠️ Important

- **Aucun impact Stripe** : Les données Stripe réelles ne sont jamais touchées
- **Seulement en dev** : Automatiquement désactivé en production
- **Cookies locaux** : Le test mode est stocké en localStorage + cookies
- **Refresh requis** : Parfois nécessaire pour voir les changements UI

---

## 🔧 Désactivation

Pour désactiver complètement le test mode :

1. **Option 1** : Commentez dans `.env.local`
   ```bash
   # NEXT_PUBLIC_ENABLE_TEST_MODE=true
   ```

2. **Option 2** : Supprimez la ligne

3. Redémarrez le serveur

---

## 💡 Tips

- **Test rapide** : Ctrl+Shift+M est le plus rapide
- **Test complet** : Utilise le panel sur /subscription pour voir toutes les options
- **Debug** : Check la console pour voir les logs de changement de plan
- **État réel** : L'abonnement Stripe réel est toujours visible dans le panel

---

## 🐛 Troubleshooting

### Le bouton n'apparaît pas
- ✅ Vérifie que `NEXT_PUBLIC_ENABLE_TEST_MODE=true` est dans `.env.local`
- ✅ Redémarre le serveur (`npm run dev`)
- ✅ Check la console pour des erreurs

### Le plan ne change pas
- ✅ Refresh la page après activation
- ✅ Check que tu es bien connecté
- ✅ Regarde les cookies dans DevTools

### Conflit avec Stripe réel
- ❌ **Impossible** : Le test mode utilise une source différente
- ✅ L'abonnement Stripe n'est jamais modifié
- ✅ Désactive le test mode pour voir l'état réel

---

## 🎉 Enjoy !

Le test mode est maintenant ultra-rapide et toujours accessible. Plus besoin de passer par Stripe pour tester les features premium !

**Happy Coding! 🚀**
