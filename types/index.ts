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
  // Enhanced coaching fields (optional for backwards compatibility)
  strengths?: string[];       // Specific strengths identified (3-5 items)
  improvements?: string[];    // Specific actionable improvements with examples
  coachingTip?: string;       // Personalized coaching advice based on user profile
  engagementScore?: number;   // 1-100 predicted engagement score
  readabilityScore?: number;  // 1-100 readability score
  hookAnalysis?: string;      // Analysis of the opening hook
  ctaAnalysis?: string;       // Analysis of call-to-action
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
export type AdaptationPlatform = "reddit" | "threads" | "twitter" | "facebook";

// Platform adaptation result (MAX)
export interface PlatformAdaptation {
  platform: AdaptationPlatform;
  content: string;
  characterCount: number;
  hashtags: string[];
  notes: string;              // Platform-specific tips
}

// ============== USER TYPES ==============

// Personal branding configuration
export interface PersonalBranding {
  // Custom avatar (user-uploaded, not from OAuth)
  customAvatarURL?: string;
  // Cover/banner image
  coverImageURL?: string;
  // Personal accent color (hex)
  accentColor?: string;
  // Gradient preference for profile
  gradientPreset?: "brand" | "sunset" | "ocean" | "forest" | "purple" | "custom";
  customGradientStart?: string;
  customGradientEnd?: string;
  // Professional tagline (short, displayed under name)
  tagline?: string;
  // Social links
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
    instagram?: string;
    youtube?: string;
  };
  // Profile card style
  cardStyle?: "minimal" | "gradient" | "photo" | "accent";
  // Show/hide elements
  visibility?: {
    showStats?: boolean;
    showSocialLinks?: boolean;
    showBio?: boolean;
    showSector?: boolean;
  };
}

// Preset accent colors for personal branding
export const ACCENT_COLOR_PRESETS = [
  { name: "Posty Orange", hex: "#F8935D" },
  { name: "Coral", hex: "#F76B54" },
  { name: "Rose", hex: "#F13452" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Green", hex: "#10B981" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Indigo", hex: "#6366F1" },
] as const;

// Preset gradients
export const GRADIENT_PRESETS = {
  brand: { start: "#F8935D", end: "#F76B54", name: "Posty Brand" },
  sunset: { start: "#F8935D", end: "#F13452", name: "Sunset" },
  ocean: { start: "#3B82F6", end: "#06B6D4", name: "Ocean" },
  forest: { start: "#10B981", end: "#14B8A6", name: "Forest" },
  purple: { start: "#8B5CF6", end: "#EC4899", name: "Purple Haze" },
} as const;

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  bio?: string;
  onboardingComplete: boolean;
  // Personal branding settings
  branding?: PersonalBranding;
  profile?: {
    profileType?: string;
    sector: string;
    role: string;
    objective: string;
    targetAudience?: string;
    communicationTone?: string;
    publishingFrequency?: string;
    // Legacy field — kept for backward compatibility with existing users
    linkedinStyle?: string;
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
    // Trial tracking (one trial per account, ever)
    trialUsed?: boolean;           // True if user has ever used a trial
    trialStartedAt?: Timestamp;    // When trial started
    trialEndsAt?: Timestamp;       // When trial ends (for display)
    trialPlan?: SubscriptionPlan;  // Which plan was trialed (pro or max)
    // Guarantee tracking (money-back guarantee after first payment)
    firstPaymentDate?: Timestamp;  // When first payment was made (guarantee starts here)
    refundRequested?: boolean;     // True if user has requested a refund
    refundRequestedAt?: Timestamp; // When refund was requested
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
  profileType: string;
  sector: string;
  role: string;
  objective: string;
  targetAudience: string;
  communicationTone: string;
  publishingFrequency: string;
}

export const PROFILE_TYPES = [
  "Independant / Freelance",
  "Agence",
  "Entrepreneur / Founder",
  "Salarie en entreprise",
] as const;

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
  "Trouver de nouveaux clients",
  "Augmenter mon chiffre d'affaires",
  "Développer ma visibilité et crédibilité",
  "Générer des leads qualifiés",
  "Construire une audience engagée",
] as const;

export const PUBLISHING_FREQUENCIES = [
  "1 à 2 fois par semaine",
  "3 à 4 fois par semaine",
  "Tous les jours",
  "Je ne publie pas encore",
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
 * - Max: linkedin, reddit, threads, facebook
 */
export type Platform = "linkedin" | "reddit" | "threads" | "facebook";

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
  // Engagement metrics (user-provided or scraped)
  metrics?: LinkedInPostMetrics;
}

export interface LinkedInPostMetrics {
  likes: number;
  comments: number;
  shares: number;
  impressions?: number;
  clickRate?: number;
  engagementRate?: number;
  updatedAt: Timestamp;
  source: 'manual' | 'extension' | 'api'; // How metrics were collected
}

export interface LinkedInAnalyticsSummary {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagementRate: number;
  bestPerformingPost?: LinkedInPostData;
  postsThisWeek: number;
  postsThisMonth: number;
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

// ============== THREADS TYPES ==============

export interface ThreadsConnectionData {
  userId: string;
  threadsId: string;
  username: string;
  accessToken: string;
  expiresAt: Timestamp;
  profileName: string;
  profilePicture?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

export interface ThreadsPostData {
  id: string;
  userId: string;
  threadsId: string;
  threadId: string;
  content: string;
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

export type SchedulePlatform = "linkedin" | "reddit" | "threads" | "facebook";

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
