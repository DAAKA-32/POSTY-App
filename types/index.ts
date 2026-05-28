import { Timestamp } from "firebase/firestore";
import { User as FirebaseUser } from "firebase/auth";

// ============== SUBSCRIPTION TYPES ==============

export type SubscriptionPlan = "free" | "pro" | "max";

// ============== RESPONSE & GENERATION TYPES ==============

// Response modes based on plan
export type ResponseMode = "business-only" | "single-choice" | "dual" | "conversational";

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

// Platform adaptation targets (Max plan)
export type AdaptationPlatform = "threads" | "facebook" | "bluesky" | "mastodon";

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
  language?: "fr" | "en" | "es" | "de" | "it" | "pt" | "nl" | "zh" | "ja" | "ko";
  onboardingComplete: boolean;
  // Personal branding settings
  branding?: PersonalBranding;
  profile?: {
    profileType?: string;
    sector: string | string[];
    role: string;
    objective: string | string[];
    targetAudience?: string | string[];
    communicationTone?: string | string[];
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
    // Free-plan trial (30 days). Distinct from the Stripe trial above:
    // every Free user gets 30 days of access starting at signup, then must
    // upgrade. Backfilled lazily from `createdAt` for existing accounts.
    freeTrialStartedAt?: Timestamp;
    freeTrialEndsAt?: Timestamp;
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
  // Conversation usage counters (fed into SubscriptionContext)
  usage?: {
    conversationsThisWeek?: number;
    conversationsThisMonth?: number;
    lastConversationDate?: Timestamp;
    weekStartDate?: Timestamp;
    monthStartDate?: Timestamp;
  };
  // AI contextual memory (Pro+)
  memory?: UserMemorySettings;
  // Lifetime aggregates of AI cost & token usage (written by lib/ai-cost/tracker).
  // Used by the admin dashboard to surface per-user spend and rentability.
  aiUsage?: AIUsageAggregate;
  // Help tooltips: pages the user has dismissed (synced across devices)
  helpReadPages?: string[];
  // Welcome modal flag (set by webhook after first payment, cleared on dismiss)
  showWelcomeModal?: boolean;
  // Gift plan popup flag (set to true after gift recipient sees the popup)
  giftPopupSeen?: boolean;
  // Premium feature tour (5-slide carousel shown on first /app visit)
  hasSeenAppTour?: boolean;
  // Strategist Phase 4 — autonomous weekly batch generation (Max only).
  // When `enabled`, a Cloud Function fires on `dayOfWeek` each week and
  // generates a fresh draft batch via the Strategist. The user reviews it
  // through the in-app banner (`pendingAutoBatchId` below).
  autonomousMode?: AutonomousStrategistConfig;
  /** Id of the latest auto-generated batch waiting for user review. Set by
   *  the cron, cleared by the UI once the user opens/dismisses the batch. */
  pendingAutoBatchId?: string;
  createdAt: Timestamp;
}

/** Per-user config for the Phase 4 autonomous Strategist. Stored inline on
 *  the user profile (not a sub-collection) — read on every Strategist page
 *  load to render the Settings UI without an extra Firestore round-trip. */
export interface AutonomousStrategistConfig {
  enabled: boolean;
  /** Day of week the cron should fire: 0=Sunday, 1=Monday, …, 6=Saturday.
   *  Default Sunday so the batch is ready when the user plans their week. */
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** How many briefs to generate per weekly batch. Clamped to [3, 10] in
   *  the UI; the API endpoint re-clamps to [1, 15] as a hard safety. */
  count: number;
  /** Optional user-overridable prompt. When empty/undefined, the cron uses
   *  a default template derived from the user's profile sector + objective. */
  customPrompt?: string;
  /** Last time the cron actually generated a batch for this user. Used by
   *  the cron itself as a dedup guard (no double-fire within 6 days). */
  lastTriggeredAt?: Timestamp;
}

/** Per-model / per-route sub-aggregate written by the AI cost tracker. */
export interface AIUsageModelBreakdown {
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  calls: number;
  /** Only present on image-generation routes. */
  imageCount?: number;
}

/** Lifetime aggregate of AI spend for a single user. */
export interface AIUsageAggregate {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  totalImagesGenerated?: number;
  callsCount: number;
  lastCallAt?: Timestamp;
  byModel?: Record<string, AIUsageModelBreakdown>;
  byRoute?: Record<string, AIUsageModelBreakdown>;
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
  // Image-mode entries — populated when the conversation contains visuals
  // generated via the Posty image pipeline. Stored alongside `messages` so a
  // single conversation can mix posts and visuals.
  generatedImages?: GeneratedImageRecord[];
}

/** One rendered variant of a visual. Multiple variants share the same parent
 *  GeneratedImageRecord and represent different art-direction takes on the
 *  same brief (different accent / template / composition). */
export interface GeneratedImageVariant {
  url: string;                // Firebase Storage download URL
  imageId: string;            // storage path basename
}

/** Persisted shape of a visual produced by /api/image/generate. Kept narrow
 *  on purpose — the rendering DSL is intentionally not stored, only the
 *  inputs/outputs the user actually needs to reload the conversation.
 *
 *  Legacy `url`/`imageId` at the top level are kept for back-compat with
 *  conversations written before multi-variant generation existed; they
 *  always mirror `variants[0]` when both shapes are present. */
export interface GeneratedImageRecord {
  id: string;                 // local entry id (UUID) — stable across reloads
  prompt: string;
  url: string;                // mirrors variants[0].url
  imageId: string;            // mirrors variants[0].imageId
  generatedAt: number;        // ms epoch
  /** All rendered variants, in render order. Length ≥ 1. */
  variants?: GeneratedImageVariant[];
  /** @deprecated Use `selectedVariantIndices` instead. Kept for back-compat
   *  with records written before multi-select existed; on read, falls back
   *  to `[selectedVariantIndex]` when the new field is absent. */
  selectedVariantIndex?: number;
  /** Indices of the variants the user picked for publishing, in click order.
   *  Empty array = no visual will ship with the post. When omitted, the UI
   *  layer hydrates with `[selectedVariantIndex ?? 0]` for back-compat. */
  selectedVariantIndices?: number[];
  /** Optional chat message id this image is paired with (so re-loading a
   *  conversation can re-thread the visual inside the post bubble). */
  messageId?: string;
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
  /**
   * Auto-generated first comment to drop on this post 2–7 minutes after
   * publishing — boosts the LinkedIn algorithm via early author engagement.
   * `loading` is true while the seed-comment API is in-flight; `error`
   * holds the localised message if generation failed.
   */
  seedComment?: {
    text?: string;
    loading?: boolean;
    error?: string;
  };
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

// ============== FILE ATTACHMENT TYPES ==============

/** Supported MIME types for file attachments (Max plan only) */
export type AttachmentMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "application/pdf";

/** File attachment data sent alongside a message */
export interface FileAttachment {
  /** Original filename */
  name: string;
  /** MIME type */
  type: AttachmentMimeType;
  /** File size in bytes */
  size: number;
  /** Base64-encoded file content (without data URI prefix) */
  base64: string;
}

/** Validation constants for file attachments */
export const FILE_ATTACHMENT_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES_PER_MESSAGE: 1,
  ALLOWED_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ] as AttachmentMimeType[],
} as const;

// ============== AI MEMORY TYPES ==============

/** Category of a memory item — determines how it's used in prompts */
export type MemoryCategory = "topic" | "event" | "preference" | "fact";

/** A single extracted piece of contextual memory */
export interface MemoryItem {
  id: string;
  /** Human-readable fact (e.g. "Has an art exhibition in Lyon in March 2025") */
  content: string;
  /** Classification for filtering and relevance */
  category: MemoryCategory;
  /** Keywords for fast relevance matching against new prompts */
  keywords: string[];
  /** When this memory was extracted */
  createdAt: Timestamp;
  /** Post/conversation that produced this memory */
  sourcePostId?: string;
}

/** User-level memory settings stored on the user document */
export interface UserMemorySettings {
  /** Whether contextual memory is active (default: true for Pro+) */
  enabled: boolean;
  /** Extracted memory items (capped at 30) */
  items: MemoryItem[];
  /** Last time memory was updated */
  lastUpdated?: Timestamp;
}

/** Max memory items stored per user (keeps token usage bounded) */
export const MEMORY_MAX_ITEMS = 30;

// ============== ONBOARDING TYPES ==============

export interface OnboardingData {
  profileType: string;
  sector: string[];
  role: string;
  objective: string[];
  targetAudience: string[];
  communicationTone: string[];
  publishingFrequency: string;
}

/** Normalize a value that may be a legacy string or a new array */
export function normalizeMultiSelect(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

/** Convert multi-select array to a comma-separated string (for prompt building) */
export function multiSelectToString(value: string | string[] | undefined): string {
  const arr = normalizeMultiSelect(value);
  return arr.join(", ");
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
  "Autre",
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
  "Autre",
] as const;

export const COMMUNICATION_TONES = [
  "Professionnel et formel",
  "Accessible et conversationnel",
  "Inspirant et motivant",
  "Direct et percutant",
  "Éducatif et pédagogue",
  "Authentique et personnel",
  "Autre",
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
 * Core platforms supported by Posty plans.
 * - Free / Pro: linkedin + bluesky + mastodon + discord
 * - Max: same + threads + facebook
 */
export type Platform = "linkedin" | "threads" | "facebook" | "bluesky" | "mastodon" | "discord";

/**
 * Extended platform type for any legacy/transient values surfaced in dynamic
 * data. Currently identical to {@link Platform}.
 */
export type ExtendedPlatform = Platform;

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
  minPlan?: SubscriptionPlan;
}

// ============== LINKEDIN TYPES (re-exported for consistency) ==============

/**
 * A LinkedIn organization (Company Page) that a user administers.
 * Populated from GET /v2/organizationAcls?q=roleAssignee during OAuth.
 * Posts published as an organization are the only ones for which LinkedIn
 * exposes engagement metrics via the Marketing Developer Platform.
 */
export interface LinkedInOrganization {
  urn: string; // "urn:li:organization:12345"
  organizationId: string; // "12345"
  name: string;
  vanityName?: string;
  logoUrl?: string;
  role?: "ADMINISTRATOR" | "DIRECT_SPONSORED_CONTENT_POSTER" | string;
}

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
  // Organizations the user administers (for publishing as page + metrics API)
  organizations?: LinkedInOrganization[];
  organizationsUpdatedAt?: Timestamp;
  // Scopes granted by the user at OAuth (tracks whether org features are available)
  grantedScopes?: string[];
}

/** Where a post was published from (affects metrics availability) */
export type LinkedInAuthorType = "person" | "organization";

/** Lifecycle state of a post relative to LinkedIn's platform */
export type LinkedInPostStatus = "published" | "deleted" | "unknown";

/**
 * Sync status of engagement metrics:
 * - 'synced'        : metrics pulled from LinkedIn API, up to date
 * - 'pending'       : not yet synced (new post or never reached by cron)
 * - 'failed'        : last sync attempt errored (see syncError)
 * - 'not_available' : metrics cannot be fetched — post is on a personal profile.
 *                     LinkedIn does not expose any metrics endpoint for
 *                     `urn:li:person:*` posts, with or without MDP access.
 */
export type LinkedInMetricsSyncStatus = "synced" | "pending" | "failed" | "not_available";

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
  // ===== Author tracking (for metrics availability) =====
  authorType?: LinkedInAuthorType; // 'person' (no API metrics) | 'organization' (API metrics available)
  authorUrn?: string; // "urn:li:person:xxx" | "urn:li:organization:123"
  organizationUrn?: string; // same as authorUrn when authorType === 'organization'
  organizationName?: string; // cached for display
  // ===== Lifecycle + sync =====
  status?: LinkedInPostStatus;
  deletedFromPlatform?: boolean; // legacy flag, kept for back-compat with existing docs
  deletedFromPlatformAt?: Timestamp;
  syncStatus?: LinkedInMetricsSyncStatus;
  syncError?: string;
  lastMetricsSyncAt?: Timestamp;
}

export interface LinkedInPostMetrics {
  likes: number;
  comments: number;
  shares: number;
  impressions?: number;
  uniqueImpressions?: number;
  clicks?: number;
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
  /** Facebook Pages the user can manage (saved by OAuth callback) */
  pages?: Array<{ id: string; name: string; accessToken: string }>;
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

// ============== BLUESKY TYPES ==============

// Bluesky auth is session-based (app password → JWT pair). Access JWT is
// short-lived (~2h) and rotated via refreshJwt, which itself lasts weeks.
export interface BlueskyConnectionData {
  userId: string;
  /** Full handle, e.g. "alice.bsky.social" */
  handle: string;
  /** DID (decentralized identifier) — the stable account ID */
  did: string;
  /** PDS base URL (defaults to https://bsky.social) */
  service: string;
  accessJwt: string;
  refreshJwt: string;
  profileName?: string;
  profilePicture?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
  /** Tracks last time we refreshed the session */
  sessionRefreshedAt?: Timestamp;
}

export interface BlueskyPostData {
  id: string;
  userId: string;
  did: string;
  /** AT Protocol record URI, e.g. at://did:plc:xyz/app.bsky.feed.post/abc */
  uri: string;
  /** CID of the record */
  cid: string;
  content: string;
  /** User-facing URL (https://bsky.app/profile/handle/post/rkey) */
  postUrl?: string;
  publishedAt: Timestamp;
  success: boolean;
  error?: string;
}

// ============== MASTODON TYPES ==============

// Mastodon is federated: each user is hosted on a different instance (server).
// Instead of OAuth-per-instance (complex: dynamic app registration), we accept
// a Personal Access Token generated by the user in their instance's
// Settings → Development → New application. Scopes needed: write:statuses.
export interface MastodonConnectionData {
  userId: string;
  /** Instance URL without trailing slash, e.g. "https://mastodon.social" */
  instance: string;
  /** Account ID on the instance */
  accountId: string;
  /** Username on the instance (e.g. "alice") */
  username: string;
  /** Full handle: @alice@mastodon.social */
  acct: string;
  accessToken: string;
  profileName?: string;
  profilePicture?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

export interface MastodonPostData {
  id: string;
  userId: string;
  instance: string;
  accountId: string;
  /** Mastodon status (toot) ID */
  statusId: string;
  content: string;
  /** User-facing URL (https://instance/@user/statusId) */
  postUrl?: string;
  publishedAt: Timestamp;
  success: boolean;
  error?: string;
}

// ============== DISCORD TYPES ==============

// Discord integration uses incoming webhooks — no OAuth at all. The user
// creates a webhook in their server's channel settings and pastes the URL.
// Posty validates the URL by a GET (webhooks return 200 with their metadata)
// then POSTs JSON payloads to publish.
export interface DiscordConnectionData {
  userId: string;
  /** Full webhook URL: https://discord.com/api/webhooks/{id}/{token} */
  webhookUrl: string;
  /** Webhook ID (parsed from URL) — for deduping */
  webhookId: string;
  /** Display-only hints returned by Discord when validating the webhook */
  guildName?: string;
  channelId?: string;
  channelName?: string;
  /** Webhook's own display name (user-chosen when creating it) */
  webhookName?: string;
  webhookAvatar?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

export interface DiscordPostData {
  id: string;
  userId: string;
  webhookId: string;
  /** Discord message ID returned when posting with ?wait=true */
  messageId?: string;
  content: string;
  postUrl?: string;
  publishedAt: Timestamp;
  success: boolean;
  error?: string;
}

// ============== AI ACTION TYPES ==============

export type AIActionType =
  | "schedule_post"
  | "publish_post"
  | "delete_conversation";

export interface AIActionParams {
  content?: string;
  postId?: string;
  scheduledAt?: string;
  platform?: string;
  timezone?: string;
  title?: string;
}

export interface DetectedAIAction {
  type: AIActionType;
  confidence: "high" | "medium";
  params: AIActionParams;
  displayLabel: string;
  displayDetails: string;
  userMessage: string;
}

// ============== SCHEDULING TYPES ==============

export type ScheduleStatus = "pending" | "published" | "failed" | "cancelled";

export type SchedulePlatform = "linkedin" | "threads" | "facebook" | "bluesky" | "mastodon" | "discord";

export type LinkedInPostType = "feed" | "article";

// Image attached to a scheduled post (stored in Firebase Storage)
export interface ScheduledPostImage {
  storagePath: string;   // Firebase Storage path (e.g., "scheduled-posts/{postId}/{filename}")
  downloadURL: string;   // Public download URL for preview & Cloud Function
  fileName: string;      // Original filename
  contentType: string;   // MIME type (image/jpeg, image/png, etc.)
  size: number;          // File size in bytes
}

/**
 * Seed comment configuration attached to a scheduled post — the post-author's
 * own first reply, designed to drop 2-7 minutes after publishing to boost the
 * LinkedIn algorithm via early author engagement.
 */
export interface SeedCommentConfig {
  enabled: boolean;
  text: string;
  /** Base delay in minutes after publish; the worker adds extra organic jitter on top. */
  delayMinutes: number;
}

/**
 * LinkedIn audience visibility for the published post.
 * Mirrors the values accepted by /api/linkedin/publish so scheduled posts
 * have full parity with the direct flow (previously hardcoded to PUBLIC).
 */
export type LinkedInVisibility = "PUBLIC" | "CONNECTIONS";

export interface ScheduledPost {
  id: string;
  userId: string;
  // Content
  content: string;
  postId?: string; // Reference to original Post if from history
  title?: string; // Optional title for identification
  // Images (optional, LinkedIn only for now)
  images?: ScheduledPostImage[];
  // Scheduling
  scheduledAt: Timestamp; // When to publish
  timezone: string; // User's timezone (e.g., "Europe/Paris")
  status: ScheduleStatus;
  // Platform config
  platform: SchedulePlatform;
  postType?: LinkedInPostType; // For LinkedIn: feed or article
  /** LinkedIn audience — defaults to PUBLIC server-side when unset (legacy rows). */
  visibility?: LinkedInVisibility;
  /** LinkedIn Company Page URN to publish as. Absent → personal profile (default).
   *  Validated at publish time against the user's `linkedinConnections.organizations`
   *  membership, never trusted blindly. */
  organizationUrn?: string;
  /** Optional algo-boost seed comment (LinkedIn only, dropped a few min after) */
  seedComment?: SeedCommentConfig;
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
  /** LinkedIn audience for the published post — parity with direct flow. */
  visibility?: LinkedInVisibility;
  /** LinkedIn Company Page URN — parity with direct flow. Absent → personal. */
  organizationUrn?: string;
  // Images to upload (File objects from the picker, client-side only)
  imageFiles?: File[];
  /** Optional algo-boost seed comment dropped X minutes after publish */
  seedComment?: SeedCommentConfig;
}

/**
 * Pending seed comment in Firestore — created by the scheduler after a
 * successful LinkedIn publish, picked up by `executePendingSeedComments`
 * once `fireAt <= now` and the autopost flag is on.
 */
export type PendingSeedCommentStatus =
  | "pending"
  | "posted"
  | "failed"
  | "skipped_flag_off"
  | "skipped_post_missing";

export interface PendingSeedComment {
  id: string;
  userId: string;
  /** Optional link back to the parent scheduledPost (null for instant publish). */
  parentScheduledPostId?: string;
  /** LinkedIn URN of the published post (e.g., "urn:li:share:7XXXXXXXXX"). */
  parentPostUrn: string;
  /** Public LinkedIn URL of the parent post (for support / debugging). */
  parentPostUrl?: string;
  /** Author URN posting the comment (e.g., "urn:li:person:XXX"). */
  actorUrn: string;
  text: string;
  /** When the worker should fire this comment (server-side jitter applied). */
  fireAt: Timestamp;
  status: PendingSeedCommentStatus;
  attemptCount: number;
  createdAt: Timestamp;
  postedAt?: Timestamp;
  failureReason?: string;
}

// Scheduling context type
export interface SchedulingContextType {
  scheduledPosts: ScheduledPost[];
  isLoading: boolean;
  isUploading: boolean; // True while images are being uploaded to Storage
  pendingCount: number; // Count of pending scheduled posts (for badge display)
  // Actions
  schedulePost: (data: CreateScheduledPostData) => Promise<{ success: boolean; scheduledPostId?: string; error?: string }>;
  cancelSchedule: (scheduledPostId: string) => Promise<{ success: boolean; error?: string }>;
  deleteSchedule: (scheduledPostId: string) => Promise<{ success: boolean; error?: string }>;
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

// ============== STRATEGIST BATCH PLANNING (Phase 1) ==============

/** One row in a Strategist-generated batch plan. At this stage we only have
 *  the editorial brief — the full post text and visual are materialized in
 *  Phase 2 (`/api/generate` per brief). Keep this narrow on purpose: anything
 *  the LLM produces here must be cheap to regenerate per-row. */
export interface PostBrief {
  /** Stable id within the batch, used for table keys + per-row regen. */
  id: string;
  /** First line / opening sentence of the post — the scroll-stop hook. */
  hook: string;
  /** Editorial angle — what the post will argue / show / teach in 1-2 lines. */
  angle: string;
  /** Post format the angle is best delivered in. Free text on purpose
   *  ("storytelling", "lesson-learned", "how-to", "opinion", "carrousel",
   *  "data drop", …) — the LLM picks the wording, the UI just renders it. */
  format: string;
  /** ISO date string YYYY-MM-DD for the day the post should ship. */
  suggestedDate: string;
  /** 24h HH:MM in the user's timezone (captured client-side via
   *  Intl.DateTimeFormat — the batch plan is generated in user-local time). */
  suggestedTime: string;
  /** Why the LLM picked this slot — surfaced as a small tooltip in the
   *  table so the user can sanity-check the strategy without re-asking. */
  rationale: string;
  /** Optional one-line note attached during user review (manual edit). */
  userNote?: string;
  /** Phase 2 — the finished post copy materialized from this brief. When
   *  present, the row swaps from "brief preview" to "post preview" UI and
   *  the row offers regen/edit/copy actions instead of brief-level edits. */
  materialized?: MaterializedPost;
  /** Phase 3 — the id of the `scheduledPosts` doc once this brief has been
   *  handed off to the publishing cron. Lets the UI link the row to the
   *  schedule page and surface cancellation. Empty until scheduling. */
  scheduledPostId?: string;
  /** Phase 3 — UTC millis of the resolved publish slot (after smart-scheduler
   *  conflict resolution). Mirrors `scheduledPosts.scheduledAt.toMillis()`
   *  so the row can render the actual fire time without a second read. */
  scheduledAt?: number;
}

/** A finished post produced by Phase 2 from a PostBrief. Kept inline on the
 *  brief (rather than a separate Firestore doc) so the whole batch reads /
 *  writes as a single document — atomic patches, no fan-out. */
export interface MaterializedPost {
  /** The body the user will publish. Plain text with line breaks, ready for
   *  LinkedIn (no markdown — the publisher doesn't render it). */
  content: string;
  /** Generated-at millis (server time). Used in the UI to show "il y a 2 min"
   *  on regen and to invalidate stale visual pairings if any. */
  generatedAt: number;
  /** Model that produced this — useful for debugging regressions when we
   *  swap models (gpt-4o → gpt-4o-mini for cost, etc.). */
  model?: string;
  /** Phase 2.5 — optional visual generated alongside the post. Mirrors the
   *  shape used by the regular image pipeline (variants from
   *  /api/image/generate) so the same preview component can render both. */
  visual?: {
    variants: Array<{ url: string; imageId: string }>;
    generatedAt: number;
  };
}

/** A full batch generated by the Strategist (Phase 1 deliverable). Stored in
 *  Firestore collection `strategyBatches` so the user can come back to it,
 *  edit rows, and (Phase 2/3) materialize + schedule the approved subset. */
export interface StrategyBatch {
  id: string;
  userId: string;
  /** The user prompt that triggered the batch ("prépare-moi 5 posts cette
   *  semaine"). Stored verbatim — useful for regeneration with same intent. */
  sourcePrompt: string;
  /** Editorial theme the LLM extracted/proposed for the batch. Lets the
   *  table header read "Cette semaine : <theme>" instead of just "5 posts". */
  theme: string;
  /** Briefs in chronological order. */
  posts: PostBrief[];
  /** Lifecycle:
   *   - "draft"      : just generated, user hasn't reviewed yet
   *   - "approved"   : user clicked "Approve" — ready for Phase 2 materialization
   *   - "materialized": Phase 2 turned briefs into full posts (later)
   *   - "scheduled"  : Phase 3 wrote them to `scheduledPosts` (later)
   *   - "discarded"  : user dismissed the plan without using it
   */
  status: "draft" | "approved" | "materialized" | "scheduled" | "discarded";
  /** User timezone at generation time — captured so Phase 3 scheduling
   *  honors the slots the user saw in the UI, not the server TZ. */
  timezone: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
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
