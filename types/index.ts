import { Timestamp } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";

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
  createdAt: Timestamp;
}

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
