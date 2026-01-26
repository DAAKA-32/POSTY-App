import { Timestamp } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";

// ============== SUBSCRIPTION TYPES ==============

export type SubscriptionPlan = "free" | "pro" | "max";

// ============== RESPONSE & GENERATION TYPES ==============

// Response modes based on plan
export type ResponseMode = "business-only" | "single-choice" | "dual";

// AI-generated insights (all plans)
export interface PostInsights {
  whyEffective: string;       // Why this approach works
  bestTimeToPost: string;     // Optimal posting time
  expectedEngagement: string; // Engagement prediction
  keyTakeaway: string;        // Main value proposition
}

// Post analysis (PRO+)
export interface PostAnalysis {
  hookScore: number;          // 1-10
  hookFeedback: string;
  structureScore: number;     // 1-10
  structureFeedback: string;
  ctaScore: number;           // 1-10
  ctaFeedback: string;
  overallScore: number;       // 1-10
  improvements: string[];
}

// Platform adaptation targets (Pro+ for reddit, Max for others)
export type AdaptationPlatform = "reddit" | "instagram" | "twitter" | "facebook";

// Platform adaptation result (MAX)
export interface PlatformAdaptation {
  platform: AdaptationPlatform;
  content: string;
  characterCount: number;
  hashtags: string[];
  notes: string;              // Platform-specific tips
}

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
// Prix annuels calcules avec 20% d'economie
export const SUBSCRIPTION_PLANS: PlanConfig[] = [
  {
    id: "free",
    name: "Gratuit",
    tagline: "Pour decouvrir Posty",
    price: 0,
    priceYearly: 0,
    dailyMessageLimit: 3,
    ctaLabel: "Commencer gratuitement",
    features: [
      { id: "messages", label: "3 messages IA par jour", included: true },
      { id: "response-mode", label: "Version Business uniquement", included: true },
      { id: "insights", label: "Insights IA sur chaque post", included: true, highlight: true },
      { id: "history", label: "Historique limite (7 jours)", included: true },
      { id: "style-choice", label: "Choix du style (Storytelling/Business)", included: false },
      { id: "analysis", label: "Analyse de post", included: false },
      { id: "improve", label: "Ameliorer un post existant", included: false },
      { id: "multiplatform", label: "Adaptation multi-plateforme", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Pour les createurs serieux",
    price: 9.90,
    priceYearly: 95, // 9,90 x 12 x 0,80 = 95,04€ (20% economie)
    dailyMessageLimit: -1,
    popular: true,
    ctaLabel: "Choisir Pro",
    features: [
      { id: "messages", label: "Messages IA illimites", included: true, highlight: true },
      { id: "response-mode", label: "Choix Storytelling OU Business", included: true, highlight: true },
      { id: "insights", label: "Insights IA sur chaque post", included: true },
      { id: "history", label: "Historique illimite", included: true },
      { id: "style-choice", label: "Ton adaptatif personnalise", included: true, highlight: true },
      { id: "analysis", label: "Analyse de post (hook, structure, CTA)", included: true, highlight: true },
      { id: "improve", label: "Ameliorer un post existant", included: true, highlight: true },
      { id: "multiplatform", label: "Adaptation multi-plateforme", included: false },
      { id: "support", label: "Support email prioritaire", included: true },
    ],
  },
  {
    id: "max",
    name: "Max",
    tagline: "L'assistant LinkedIn complet",
    price: 19.90,
    priceYearly: 191, // 19,90 x 12 x 0,80 = 191,04€ (20% economie)
    dailyMessageLimit: -1,
    ctaLabel: "Choisir Max",
    features: [
      { id: "messages", label: "Messages IA illimites", included: true, highlight: true },
      { id: "response-mode", label: "Double generation (Storytelling + Business)", included: true, highlight: true },
      { id: "insights", label: "Insights IA avances", included: true },
      { id: "history", label: "Historique illimite", included: true },
      { id: "style-choice", label: "Personnalisation avancee", included: true },
      { id: "analysis", label: "Analyse de post complete", included: true },
      { id: "improve", label: "Ameliorer un post existant", included: true },
      { id: "multiplatform", label: "Adaptation Instagram, Twitter, Facebook", included: true, highlight: true },
      { id: "support", label: "Support prioritaire 24/7", included: true, highlight: true },
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
    // Extended profile fields (Pro/Max only)
    targetAudience?: string;
    communicationTone?: string;
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
  // Conversation management fields
  title?: string; // Custom title (defaults to prompt if not set)
  isPinned?: boolean; // Whether the conversation is pinned
  pinnedAt?: Timestamp; // When it was pinned (for sorting)
  // New transformation fields (optional for backwards compatibility)
  insights?: PostInsights; // AI-generated insights
  analysis?: PostAnalysis; // Detailed post analysis (PRO+)
  responseMode?: ResponseMode; // Mode used for generation
  selectedStyle?: "storytelling" | "business"; // Style choice for single-mode
  // Multi-turn conversation support
  messages?: ConversationTurn[]; // Follow-up messages after initial exchange
  updatedAt?: Timestamp; // Last message timestamp
}

// Message in a multi-turn conversation
export interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  variant?: "storytelling" | "business";
  timestamp: Date | Timestamp;
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

// Extended profile options (Pro/Max only)
export const TARGET_AUDIENCES = [
  "Entrepreneurs / Fondateurs",
  "Dirigeants / C-Level",
  "Managers / Team Leaders",
  "Freelances / Indépendants",
  "Développeurs / Tech",
  "Marketeurs / Growth",
  "RH / Recruteurs",
  "Étudiants / Jeunes diplômés",
  "Grand public",
] as const;

export const COMMUNICATION_TONES = [
  "Professionnel et formel",
  "Accessible et conversationnel",
  "Inspirant et motivant",
  "Direct et percutant",
  "Éducatif et pédagogue",
  "Authentique et personnel",
] as const;

// ============== AUTH CONTEXT TYPES ==============

export interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  /** True ONLY when user just signed up (not on login) - used to trigger onboarding */
  isNewUser: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  deleteUserAccount: (password: string) => Promise<void>;
  /** @deprecated Use clearOnboardingFlag instead */
  clearNewUserFlag: () => void;
  /** Send password reset email */
  resetPassword: (email: string) => Promise<void>;
  /** Check if user needs to see onboarding (combines memory + localStorage for robustness) */
  needsOnboarding: () => boolean;
  /** Clear all onboarding flags (memory + localStorage) - call after onboarding is complete */
  clearOnboardingFlag: () => void;
}

// ============== MULTI-PLATFORM PUBLISHING TYPES ==============

/**
 * Core platforms supported by Posty plans
 * - Free: linkedin only
 * - Pro: linkedin, reddit
 * - Max: linkedin, reddit, instagram, facebook
 */
export type Platform = "linkedin" | "reddit" | "instagram" | "facebook";

/**
 * Extended platform type including legacy/additional platforms
 * Used for broader compatibility with existing features
 */
export type ExtendedPlatform = Platform | "twitter" | "medium";

export interface PublishResult {
  platform: Platform | ExtendedPlatform;
  success: boolean;
  postUrl?: string;
  error?: string;
}

export interface PlatformConnection {
  platform: Platform | ExtendedPlatform;
  isConnected: boolean;
  profileName?: string;
  profilePicture?: string;
  username?: string;
  expiresAt?: Date;
  /** Minimum plan required for this platform */
  minPlan?: "free" | "pro" | "max";
}

// ============== TWITTER TYPES ==============

export interface TwitterConnectionData {
  userId: string;
  twitterId: string;
  username: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Timestamp;
  profileName: string;
  profilePicture?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

export interface TwitterPostData {
  id: string;
  userId: string;
  twitterId: string;
  tweetId: string;
  content: string;
  tweetUrl?: string;
  publishedAt: Timestamp;
  success: boolean;
  error?: string;
}

// ============== MEDIUM TYPES ==============

export type MediumPublishStatus = "draft" | "public" | "unlisted";

export interface MediumConnectionData {
  userId: string;
  mediumId: string;
  username: string;
  integrationToken: string;
  profileName: string;
  profilePicture?: string;
  profileUrl?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

export interface MediumPostData {
  id: string;
  userId: string;
  mediumId: string;
  articleId: string;
  title: string;
  content: string;
  articleUrl?: string;
  publishStatus: MediumPublishStatus;
  publishedAt: Timestamp;
  success: boolean;
  error?: string;
}

// ============== LINKEDIN TYPES (re-exported for consistency) ==============

export interface LinkedInConnectionData {
  userId: string;
  linkedInId: string;
  accessToken: string;
  expiresAt: Timestamp;
  profileName: string;
  profilePicture?: string;
  email?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

export interface LinkedInPostData {
  id: string;
  userId: string;
  linkedInId: string;
  postId: string;
  content: string;
  postUrl?: string;
  publishedAt: Timestamp;
  success: boolean;
  error?: string;
}

// ============== REDDIT TYPES ==============

export interface RedditConnectionData {
  userId: string;
  redditId: string;
  username: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Timestamp;
  profileName: string;
  profilePicture?: string;
  karma?: number;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

export interface RedditPostData {
  id: string;
  userId: string;
  redditId: string;
  postId: string;
  subreddit: string;
  title: string;
  content: string;
  postUrl?: string;
  publishedAt: Timestamp;
  success: boolean;
  error?: string;
}

// ============== INSTAGRAM TYPES ==============

export interface InstagramConnectionData {
  userId: string;
  instagramId: string;
  username: string;
  accessToken: string;
  expiresAt: Timestamp;
  profileName: string;
  profilePicture?: string;
  followersCount?: number;
  /** Instagram Business/Creator account ID */
  businessAccountId?: string;
  /** Connected Facebook Page ID (required for Instagram API) */
  facebookPageId?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

export interface InstagramPostData {
  id: string;
  userId: string;
  instagramId: string;
  mediaId: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL" | "REELS";
  caption: string;
  mediaUrl?: string;
  permalink?: string;
  publishedAt: Timestamp;
  success: boolean;
  error?: string;
}

// ============== FACEBOOK TYPES ==============

export interface FacebookConnectionData {
  userId: string;
  facebookId: string;
  accessToken: string;
  expiresAt: Timestamp;
  profileName: string;
  profilePicture?: string;
  email?: string;
  /** Facebook Page IDs the user can manage */
  pageIds?: string[];
  /** Selected page for publishing */
  selectedPageId?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

export interface FacebookPostData {
  id: string;
  userId: string;
  facebookId: string;
  postId: string;
  pageId?: string;
  content: string;
  postUrl?: string;
  publishedAt: Timestamp;
  success: boolean;
  error?: string;
}

// ============== SCHEDULING TYPES ==============

export type ScheduleStatus = "pending" | "published" | "failed" | "cancelled";

export type SchedulePlatform = "linkedin" | "reddit" | "instagram" | "facebook";

export type LinkedInPostType = "feed" | "article";

export interface ScheduledPost {
  id: string;
  userId: string;
  // Content
  content: string;
  postId?: string; // Reference to original Post if from history
  title?: string; // Optional title for identification
  // Scheduling
  scheduledAt: Timestamp; // When to publish
  timezone: string; // User's timezone (e.g., "Europe/Paris")
  status: ScheduleStatus;
  // Platform config
  platform: SchedulePlatform;
  postType?: LinkedInPostType; // For LinkedIn: feed or article
  // Tracking
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Publishing results
  publishedAt?: Timestamp;
  publishedUrl?: string;
  // Error handling
  attemptCount: number;
  lastAttemptAt?: Timestamp;
  failureReason?: string;
}

// For creating a new scheduled post
export interface CreateScheduledPostData {
  content: string;
  postId?: string;
  title?: string;
  scheduledAt: Date;
  timezone: string;
  platform: SchedulePlatform;
  postType?: LinkedInPostType;
}

// Scheduling context type
export interface SchedulingContextType {
  scheduledPosts: ScheduledPost[];
  isLoading: boolean;
  // Actions
  schedulePost: (data: CreateScheduledPostData) => Promise<{ success: boolean; scheduledPostId?: string; error?: string }>;
  cancelSchedule: (scheduledPostId: string) => Promise<{ success: boolean; error?: string }>;
  reschedulePost: (scheduledPostId: string, newDate: Date) => Promise<{ success: boolean; error?: string }>;
  refreshScheduledPosts: () => Promise<void>;
  // Helpers
  getPendingPosts: () => ScheduledPost[];
  getPublishedPosts: () => ScheduledPost[];
  getPostsForDate: (date: Date) => ScheduledPost[];
}

// Time slot for scheduling picker
export interface TimeSlot {
  hour: number;
  minute: number;
  label: string; // e.g., "09:00", "14:30"
}

// Optimal time suggestion from AI
export interface OptimalTimeSlot {
  day: string; // e.g., "Lundi", "Mardi"
  time: string; // e.g., "09:00"
  reason: string; // e.g., "Meilleur engagement pour votre audience"
  engagementScore: number; // 1-100
}

// ============== WEB SPEECH API TYPES ==============

// Extend Window interface with Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    abort(): void;
    start(): void;
    stop(): void;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly confidence: number;
    readonly transcript: string;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: SpeechRecognitionErrorCode;
    readonly message: string;
  }

  type SpeechRecognitionErrorCode =
    | "aborted"
    | "audio-capture"
    | "bad-grammar"
    | "language-not-supported"
    | "network"
    | "no-speech"
    | "not-allowed"
    | "service-not-allowed";

  // Constructor
  const SpeechRecognition: {
    new (): SpeechRecognition;
    prototype: SpeechRecognition;
  };
}
