import { Timestamp } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";

// ============== SUBSCRIPTION TYPES ==============

export type SubscriptionPlan = "free" | "pro" | "max";

export interface SubscriptionFeature {
  id: string;
  label: string;
  description?: string;
  included: boolean;
  highlight?: boolean;
}

export interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  tagline: string;
  price: number; // Prix mensuel en euros
  priceYearly: number; // Prix annuel en euros (total)
  dailyMessageLimit: number; // -1 = illimite
  features: SubscriptionFeature[];
  popular?: boolean;
  ctaLabel: string;
}

// Limites quotidiennes de messages IA
export const DAILY_MESSAGE_LIMITS: Record<SubscriptionPlan, number> = {
  free: 3,
  pro: -1, // Illimite
  max: -1, // Illimite
};

// Configuration complete des plans
export const SUBSCRIPTION_PLANS: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Pour decouvrir Posty",
    price: 0,
    priceYearly: 0,
    dailyMessageLimit: 3,
    ctaLabel: "Plan actuel",
    features: [
      { id: "messages", label: "3 messages IA par jour", included: true },
      { id: "basic-gen", label: "Generation de posts basique", included: true },
      { id: "history", label: "Historique limite (7 jours)", included: true },
      { id: "templates", label: "Templates premium", included: false },
      { id: "priority", label: "Acces prioritaire", included: false },
      { id: "memory", label: "IA avec memoire", included: false },
      { id: "coaching", label: "Coaching personnalise", included: false },
      { id: "support", label: "Support prioritaire", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Pour les createurs reguliers",
    price: 9.99,
    priceYearly: 99,
    dailyMessageLimit: -1,
    popular: true,
    ctaLabel: "Passer a Pro",
    features: [
      { id: "messages", label: "Messages IA illimites", included: true, highlight: true },
      { id: "basic-gen", label: "Generation optimisee", included: true, highlight: true },
      { id: "history", label: "Historique illimite", included: true },
      { id: "templates", label: "Templates premium", included: true, highlight: true },
      { id: "priority", label: "Acces prioritaire", included: true },
      { id: "memory", label: "IA avec memoire", included: false },
      { id: "coaching", label: "Coaching personnalise", included: false },
      { id: "support", label: "Support prioritaire", included: true },
    ],
  },
  {
    id: "max",
    name: "Max+",
    tagline: "L'experience ultime",
    price: 19.99,
    priceYearly: 199,
    dailyMessageLimit: -1,
    ctaLabel: "Passer a Max+",
    features: [
      { id: "messages", label: "Messages IA illimites", included: true },
      { id: "basic-gen", label: "Generation IA avancee", included: true, highlight: true },
      { id: "history", label: "Historique illimite", included: true },
      { id: "templates", label: "Templates premium", included: true },
      { id: "priority", label: "Acces prioritaire", included: true },
      { id: "memory", label: "IA avec memoire contextuelle", included: true, highlight: true },
      { id: "coaching", label: "Coaching personnalise", included: true, highlight: true },
      { id: "support", label: "Support VIP 24/7", included: true, highlight: true },
    ],
  },
];

// Helper pour obtenir un plan par ID
export function getPlanById(planId: SubscriptionPlan): PlanConfig {
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[0];
}

// ============== USER TYPES ==============

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  bio?: string;
  onboardingComplete: boolean;
  profile?: {
    sector: string;
    role: string;
    linkedinStyle: string;
    objective: string;
  };
  stats?: {
    postsCount: number;
    sessionsCount: number;
    lastActive: Timestamp | null;
  };
  // Subscription & Quotas
  subscription?: {
    plan: SubscriptionPlan;
    expiresAt?: Timestamp;
    subscribedAt?: Timestamp;
    // Stripe fields
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    status?: "active" | "canceled" | "past_due" | "unpaid" | "trialing";
  };
  quota?: {
    dailyMessageCount: number;
    lastMessageDate: Timestamp;
    // Legacy weekly fields (kept for migration)
    weeklyPublishCount?: number;
    weekStartDate?: Timestamp;
  };
  createdAt: Timestamp;
}

// Legacy quota constants (kept for compatibility)
export const WEEKLY_PUBLISH_LIMIT_FREE = 3;
export const WEEKLY_PUBLISH_LIMIT_PRO = -1;

// ============== POST TYPES ==============

export interface Post {
  id: string;
  userId: string;
  prompt: string;
  responseA: string;
  responseB: string;
  selectedVersion: "A" | "B" | null;
  createdAt: Timestamp;
}

export interface MockResponse {
  title?: string;
  content: string;
  type: "storytelling" | "business";
}

// ============== SESSION TYPES ==============

export interface Session {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: Timestamp;
}

// ============== CHAT TYPES ==============

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  responses?: {
    versionA: string;
    versionB: string;
  };
}

export interface PromptSuggestion {
  id: string;
  label: string;
  prompt: string;
  category: string;
}

// ============== ONBOARDING TYPES ==============

export interface OnboardingData {
  sector: string;
  role: string;
  linkedinStyle: string;
  objective: string;
}

export const SECTORS = [
  "Tech / IT",
  "Marketing / Communication",
  "Finance / Banque",
  "Santé",
  "Éducation",
  "Commerce / Vente",
  "Industrie",
  "Conseil",
  "RH / Recrutement",
  "Autre",
] as const;

export const LINKEDIN_STYLES = [
  "Storytelling personnel",
  "Expert / Éducatif",
  "Inspirationnel",
  "Business / Corporate",
  "Humoristique",
] as const;

export const OBJECTIVES = [
  "Augmenter ma visibilité",
  "Recruter des talents",
  "Générer des leads",
  "Développer ma marque personnelle",
  "Partager mon expertise",
] as const;

// ============== AUTH CONTEXT TYPES ==============

export interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  deleteUserAccount: (password: string) => Promise<void>;
}
