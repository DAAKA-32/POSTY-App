# POSTY - Generateur de Posts LinkedIn

Application web moderne pour creer des posts LinkedIn percutants en quelques clics.

## Features

- Generation de posts LinkedIn avec IA
- Interface moderne et responsive (mobile-first)
- Connexion OAuth LinkedIn
- Historique des publications
- Gestion de profil utilisateur
- Chat conversationnel avec IA
- Conformite RGPD

## Technologies

- **Next.js 15.1.3** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Firebase** - Backend (Auth + Firestore)
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Anthropic Claude API** - Generation de contenu IA
- **LinkedIn OAuth** - Publication directe

## Installation

```bash
# Installer les dependances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Editer .env.local avec vos cles API

# Lancer en developpement
npm run dev

# Build production
npm run build
```

## Structure du projet

```
tink/
├── app/              # Pages Next.js (App Router)
├── components/       # Composants React
├── contexts/         # Context providers
├── hooks/            # Custom React hooks
├── lib/              # Utilitaires et config
├── public/           # Assets statiques
└── types/            # Types TypeScript
```

## Configuration Firebase

1. Creer un projet Firebase
2. Activer Authentication (Email/Password + Google)
3. Activer Firestore Database
4. Deployer les regles Firestore:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Configuration LinkedIn OAuth

1. Creer une application LinkedIn
2. Ajouter les URLs de redirection
3. Obtenir Client ID et Client Secret
4. Configurer dans `.env.local`

## Licence

Proprietary - POSTY 2024
