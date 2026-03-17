import { MockResponse, PromptSuggestion } from "@/types";

// Mock responses for LinkedIn post generation
// These will be replaced by OpenAI API responses later

export const mockResponses: Record<string, MockResponse[]> = {
  default: [
    {
      title: "Version Storytelling",
      content: `Quand j'ai lancé ma startup, tout le monde m'a dit que c'était impossible.

3 ans plus tard, nous avons :
→ 50 clients satisfaits
→ Une équipe de 12 personnes passionnées
→ Une croissance de 200% par an

Le secret ? Ne jamais écouter les "c'est impossible".

Chaque obstacle était une opportunité déguisée.
Chaque échec, une leçon précieuse.

Si vous hésitez à vous lancer, rappelez-vous :
Les seuls échecs sont ceux qu'on n'essaie jamais.

Quelle est votre plus belle leçon d'entrepreneur ?

#Entrepreneuriat #Startup #Motivation`,
      type: "storytelling",
    },
    {
      title: "Version Business",
      content: `🚀 Aujourd'hui, parlons efficacité.

Voici 5 stratégies qui ont transformé notre productivité :

1️⃣ La règle des 2 minutes
Si une tâche prend moins de 2 min, faites-la immédiatement.

2️⃣ Le time-blocking
Bloquez des créneaux dédiés, sans interruption.

3️⃣ La méthode Eisenhower
Urgent ≠ Important. Priorisez intelligemment.

4️⃣ Les réunions debout
15 min max, objectif clair, action à la fin.

5️⃣ Le "Deep Work"
2h de concentration > 8h de multitâche.

Résultat : +40% de productivité en 3 mois.

Laquelle allez-vous tester cette semaine ?

#Productivité #Management #Leadership`,
      type: "business",
    },
  ],
  recrutement: [
    {
      title: "Version Storytelling",
      content: `J'ai recruté 200+ personnes en 5 ans.

La plus belle leçon ?
Le CV ne dit que 20% de l'histoire.

La candidate la plus impressionnante que j'ai rencontrée avait un parcours atypique :
- Reconversion à 35 ans
- Aucun diplôme dans notre domaine
- Zéro expérience "officielle"

Mais elle avait :
- Une curiosité insatiable
- Des side projects passionnants
- Une capacité d'apprentissage hors norme

Aujourd'hui, elle dirige notre équipe produit.

Moralité : Cherchez le potentiel, pas le pedigree.

Qui est votre "recrutement atypique" préféré ?

#Recrutement #RH #TalentAcquisition`,
      type: "storytelling",
    },
    {
      title: "Version Business",
      content: `📊 L'état du recrutement en 2024 :

Les chiffres qui doivent vous alerter :

→ 67% des candidats abandonnent un process trop long
→ 4.2 jours : temps de réponse moyen attendu
→ 89% recherchent la transparence salariale
→ 73% valorisent le télétravail

Ce que les meilleurs font différemment :

✅ Process en moins de 2 semaines
✅ Feedback à chaque étape
✅ Salaire affiché dès l'annonce
✅ Flexibilité assumée

Le marché a changé.
Votre stratégie doit suivre.

Quel est votre plus grand défi recrutement actuellement ?

#Recrutement #RH #Hiring`,
      type: "business",
    },
  ],
  marketing: [
    {
      title: "Version Storytelling",
      content: `Notre première campagne marketing était un désastre.

Budget : 10 000€
Résultat : 3 leads.

J'étais dévasté.

Mais cette expérience m'a appris plus que n'importe quelle formation :

1. Connaître son audience > Suivre les tendances
2. Un message simple > Un design complexe
3. Tester petit > Miser gros

6 mois plus tard, même budget :
3 leads → 300 leads

La différence ? L'écoute.

On a arrêté de parler de nous.
On a commencé à parler de LEURS problèmes.

Quelle a été votre leçon marketing la plus coûteuse ?

#Marketing #Growth #ContentMarketing`,
      type: "storytelling",
    },
    {
      title: "Version Business",
      content: `📈 5 métriques marketing que vous ignorez (à tort) :

1️⃣ CAC Payback Period
Combien de temps pour récupérer votre coût d'acquisition ?
Objectif : < 12 mois

2️⃣ Marketing Qualified Lead (MQL) to SQL
Quel % de vos MQL deviennent Sales Qualified ?
Benchmark : 13%

3️⃣ Content Engagement Rate
Au-delà des likes : temps passé, scrolls, clics
Objectif : > 2 min / article

4️⃣ Customer Lifetime Value / CAC
Le ratio d'or
Objectif : > 3:1

5️⃣ Net Revenue Retention
La croissance dans votre base existante
Objectif : > 100%

Quelle métrique suivez-vous de près ?

#Marketing #KPIs #DataDriven`,
      type: "business",
    },
  ],
};

// Get mock responses based on prompt keywords
export function getMockResponses(prompt: string): MockResponse[] {
  const promptLower = prompt.toLowerCase();

  if (
    promptLower.includes("recrut") ||
    promptLower.includes("embauche") ||
    promptLower.includes("candidat")
  ) {
    return mockResponses.recrutement;
  }

  if (
    promptLower.includes("market") ||
    promptLower.includes("campagne") ||
    promptLower.includes("contenu")
  ) {
    return mockResponses.marketing;
  }

  return mockResponses.default;
}

// Suggested prompts for the chat interface
export const promptSuggestions: PromptSuggestion[] = [
  {
    id: "1",
    label: "Partager une réussite",
    prompt: "Aide-moi à écrire un post sur une réussite professionnelle récente",
    category: "Personnel",
  },
  {
    id: "2",
    label: "Conseil d'expert",
    prompt: "Je veux partager un conseil dans mon domaine d'expertise",
    category: "Expertise",
  },
  {
    id: "3",
    label: "Retour d'expérience",
    prompt: "J'aimerais raconter une leçon apprise d'un échec",
    category: "Storytelling",
  },
  {
    id: "4",
    label: "Tendance du secteur",
    prompt: "Je veux commenter une tendance de mon industrie",
    category: "Business",
  },
  {
    id: "5",
    label: "Annonce recrutement",
    prompt: "J'ai besoin d'un post pour recruter dans mon équipe",
    category: "RH",
  },
  {
    id: "6",
    label: "Événement / Actualité",
    prompt: "Je souhaite partager mon retour sur un événement professionnel",
    category: "Actualité",
  },
];
