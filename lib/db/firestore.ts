import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  writeBatch,
  DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/db/firebase";
import { UserProfile, Post, Session, ChatMessage } from "@/types";
import { PlanType, DAILY_MESSAGE_LIMITS, PLAN_CONFIGS, getFounderOverridePlan } from "@/lib/config/plans";

/**
 * Normalize plan name from Firestore to a valid SubscriptionPlan.
 * Handles legacy names, case mismatches, and unknown values.
 */
function normalizePlanName(raw: string | null | undefined): SubscriptionPlan | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (lower === "free") return "free";
  if (lower === "starter") return "pro";
  if (lower === "pro" || lower === "max") return lower as SubscriptionPlan;
  return null;
}

// ============== USER OPERATIONS ==============
// Collection: users
// Fields: uid, email, name, sector, role, linkedinStyle, createdAt

export async function createUserProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<void> {
  const userRef = doc(db, "users", userId);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

  await setDoc(userRef, {
    uid: userId,
    email: data.email || "",
    name: data.displayName || "",
    sector: "",
    role: "",
    linkedinStyle: "",
    onboardingComplete: false,
    subscription: {
      plan: "free",
      status: "active",
    },
    // Initialize quota tracking to prevent race condition false positives
    quota: {
      dailyMessageCount: 0,
      lastMessageDate: null,
      messageTimestamps: [],
    },
    usage: {
      conversationsThisMonth: 0,
      monthStartDate: Timestamp.fromDate(monthStart),
    },
    createdAt: serverTimestamp(),
  });
}

/**
 * Activate Free plan for a user — ensures subscription is set correctly in Firestore.
 * Idempotent: safe to call multiple times.
 */
export async function activateFreePlan(userId: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    "subscription.plan": "free",
    "subscription.status": "active",
  });
}

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      id: userSnap.id,
      email: data.email,
      displayName: data.name || data.displayName,
      photoURL: data.photoURL || null,
      bio: data.bio || "",
      onboardingComplete: data.onboardingComplete,
      profile: data.profile || {
        sector: data.sector || "",
        role: data.role || "",
        linkedinStyle: data.linkedinStyle || "",
        objective: data.objective || "",
      },
      stats: data.stats || {
        postsCount: 0,
        sessionsCount: 0,
        lastActive: null,
      },
      createdAt: data.createdAt,
    } as UserProfile;
  }
  return null;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<void> {
  const userRef = doc(db, "users", userId);
  const updateData: Record<string, unknown> = {};

  if (data.displayName) updateData.name = data.displayName;
  if (data.email) updateData.email = data.email;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;
  if (data.profile) {
    // Only write defined values to prevent Firestore from deleting fields
    if (data.profile.profileType !== undefined) updateData.profileType = data.profile.profileType;
    if (data.profile.sector !== undefined) updateData.sector = data.profile.sector;
    if (data.profile.role !== undefined) updateData.role = data.profile.role;
    if (data.profile.objective !== undefined) updateData.objective = data.profile.objective;
    if (data.profile.targetAudience !== undefined) updateData.targetAudience = data.profile.targetAudience;
    if (data.profile.communicationTone !== undefined) updateData.communicationTone = data.profile.communicationTone;
    if (data.profile.publishingFrequency !== undefined) updateData.publishingFrequency = data.profile.publishingFrequency;
    // Build clean nested profile object (no undefined values)
    const cleanProfile: Record<string, string> = {};
    for (const [key, val] of Object.entries(data.profile)) {
      if (val !== undefined) cleanProfile[key] = val;
    }
    updateData.profile = cleanProfile;
  }
  if (data.branding !== undefined) {
    updateData.branding = data.branding;
  }
  if (data.language !== undefined) {
    updateData.language = data.language;
  }

  await updateDoc(userRef, updateData);
}

export async function completeOnboarding(
  userId: string,
  profileData: UserProfile["profile"]
): Promise<void> {
  const userRef = doc(db, "users", userId);

  // Use setDoc with merge to handle cases where user document doesn't exist yet
  // This can happen if user signed up with Google and profile wasn't created
  await setDoc(
    userRef,
    {
      uid: userId,
      profileType: profileData?.profileType || "",
      sector: profileData?.sector || "",
      role: profileData?.role || "",
      objective: profileData?.objective || "",
      targetAudience: profileData?.targetAudience || "",
      communicationTone: profileData?.communicationTone || "",
      publishingFrequency: profileData?.publishingFrequency || "",
      profile: profileData,
      onboardingComplete: true,
    },
    { merge: true }
  );
}

// ============== POST OPERATIONS ==============
// Collection: posts
// Fields: userId, contentA, contentB, chosenVersion, createdAt, insights?, analysis?, responseMode?, selectedStyle?

interface SavePostOptions {
  insights?: {
    whyEffective: string;
    bestTimeToPost: string;
    expectedEngagement: string;
    keyTakeaway: string;
  };
  responseMode?: "business-only" | "single-choice" | "dual" | "conversational";
  selectedStyle?: "storytelling" | "business";
}

export async function savePost(
  userId: string,
  prompt: string,
  contentA: string,
  contentB: string,
  options?: SavePostOptions
): Promise<string> {
  const postsRef = collection(db, "posts");
  const timestamp = serverTimestamp();
  // Auto-generate title from prompt (first ~40 chars, word-boundary)
  const autoTitle = prompt.length <= 40
    ? prompt
    : prompt.slice(0, 40).replace(/\s+\S*$/, "") + "…";

  const postData: Record<string, unknown> = {
    userId,
    prompt,
    contentA,
    contentB,
    chosenVersion: null,
    title: autoTitle,
    createdAt: timestamp,
    updatedAt: timestamp, // Initialize updatedAt on creation for proper sorting
  };

  // Add optional fields if provided
  if (options?.insights) {
    postData.insights = options.insights;
  }
  if (options?.responseMode) {
    postData.responseMode = options.responseMode;
  }
  if (options?.selectedStyle) {
    postData.selectedStyle = options.selectedStyle;
  }

  const docRef = await addDoc(postsRef, postData);
  return docRef.id;
}

// Alias for savePost with different signature
export async function createPost(data: {
  userId: string;
  prompt: string;
  responseA: string;
  responseB: string;
  selectedVersion: "A" | "B" | null;
}): Promise<string> {
  return savePost(data.userId, data.prompt, data.responseA, data.responseB);
}

// Save post analysis (PRO+ feature)
export async function savePostAnalysis(
  postId: string,
  analysis: {
    hookScore: number;
    hookFeedback: string;
    structureScore: number;
    structureFeedback: string;
    ctaScore: number;
    ctaFeedback: string;
    overallScore: number;
    improvements: string[];
  }
): Promise<void> {
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    analysis,
    analyzedAt: serverTimestamp(),
  });
}

// Update post insights (if generated after save)
export async function updatePostInsights(
  postId: string,
  insights: {
    whyEffective: string;
    bestTimeToPost: string;
    expectedEngagement: string;
    keyTakeaway: string;
  }
): Promise<void> {
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, { insights });
}

export async function getUserPosts(
  userId: string,
  limitCount: number = 10
): Promise<Post[]> {
  const postsRef = collection(db, "posts");
  const q = query(
    postsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      prompt: data.prompt,
      responseA: data.contentA || data.responseA,
      responseB: data.contentB || data.responseB,
      selectedVersion: data.chosenVersion || data.selectedVersion,
      createdAt: data.createdAt as Timestamp,
      // Include conversation metadata for proper reload
      responseMode: data.responseMode,
      selectedStyle: data.selectedStyle,
      messages: data.messages || [],
    };
  }) as Post[];
}

export async function updatePostSelection(
  postId: string,
  selectedVersion: "A" | "B"
): Promise<void> {
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, { chosenVersion: selectedVersion });
}

export async function getPost(postId: string): Promise<Post | null> {
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);

  if (postSnap.exists()) {
    const data = postSnap.data();
    return {
      id: postSnap.id,
      userId: data.userId,
      prompt: data.prompt,
      responseA: data.contentA || data.responseA,
      responseB: data.contentB || data.responseB,
      selectedVersion: data.chosenVersion || data.selectedVersion,
      createdAt: data.createdAt,
      // Style metadata for toggle restoration
      responseMode: data.responseMode,
      selectedStyle: data.selectedStyle,
      // Conversation messages for multi-turn support
      messages: data.messages || [],
    } as Post;
  }
  return null;
}

// ============== CONVERSATION PERSISTENCE ==============
// Enables multi-turn conversations without creating new posts

export interface ConversationMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  variant?: "storytelling" | "business";
  timestamp: Date | Timestamp;
}

/**
 * Add messages to an existing conversation (multi-turn support)
 * This prevents creating new posts for follow-up messages
 */
export async function addMessagesToConversation(
  postId: string,
  newMessages: ConversationMessageData[]
): Promise<void> {
  const postRef = doc(db, "posts", postId);

  // Convert Date to Timestamp and strip undefined fields (Firestore rejects undefined values)
  const messagesForFirestore = newMessages.map(msg => {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(msg)) {
      if (value !== undefined) {
        clean[key] = key === "timestamp" && value instanceof Date
          ? Timestamp.fromDate(value)
          : value;
      }
    }
    return clean;
  });

  await updateDoc(postRef, {
    messages: arrayUnion(...messagesForFirestore),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get conversation with full message history for API context
 */
export async function getConversationHistory(postId: string): Promise<{
  prompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} | null> {
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);

  if (!postSnap.exists()) return null;

  const data = postSnap.data();
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  // Add original prompt
  messages.push({ role: "user", content: data.prompt });

  // Add original AI response (use contentA as primary)
  if (data.contentA) {
    messages.push({ role: "assistant", content: data.contentA });
  } else if (data.contentB) {
    messages.push({ role: "assistant", content: data.contentB });
  }

  // Add follow-up messages
  if (data.messages && Array.isArray(data.messages)) {
    data.messages.forEach((msg: ConversationMessageData) => {
      messages.push({ role: msg.role, content: msg.content });
    });
  }

  return { prompt: data.prompt, messages };
}

export async function deletePost(postId: string): Promise<void> {
  // Cascade: find linked records in parallel before deleting
  const [linkedInSnap, scheduledSnap] = await Promise.all([
    getDocs(query(collection(db, "linkedinPosts"), where("postId", "==", postId))),
    getDocs(query(collection(db, "scheduledPosts"), where("postId", "==", postId))),
  ]);

  const batch = writeBatch(db);

  // Delete the primary post document
  batch.delete(doc(db, "posts", postId));

  // Cascade: delete associated linkedinPosts (removes from analytics)
  linkedInSnap.docs.forEach((d) => batch.delete(d.ref));

  // Cascade: delete associated scheduledPosts (removes from schedule)
  scheduledSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();
}

/**
 * Pin or unpin a post
 */
export async function pinPost(postId: string, isPinned: boolean): Promise<void> {
  const postRef = doc(db, "posts", postId);
  if (isPinned) {
    await updateDoc(postRef, {
      isPinned: true,
      pinnedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(postRef, {
      isPinned: false,
      pinnedAt: null,
    });
  }
}

/**
 * Rename a post (set custom title)
 */
export async function renamePost(postId: string, title: string): Promise<void> {
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, { title });
}

/**
 * Get user posts with pinned posts first
 */
export async function getUserPostsWithPinned(
  userId: string,
  limitCount: number = 50
): Promise<Post[]> {
  const postsRef = collection(db, "posts");
  const q = query(
    postsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  const posts = querySnapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      prompt: data.prompt,
      responseA: data.contentA || data.responseA,
      responseB: data.contentB || data.responseB,
      selectedVersion: data.chosenVersion || data.selectedVersion,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp | undefined, // Include updatedAt for smart sorting
      title: data.title || undefined,
      isPinned: data.isPinned || false,
      pinnedAt: data.pinnedAt || undefined,
      // Include conversation metadata for proper reload
      responseMode: data.responseMode,
      selectedStyle: data.selectedStyle,
      messages: data.messages || [],
    };
  }) as Post[];

  // Sort: pinned posts first (by pinnedAt desc), then by updatedAt/createdAt desc
  return posts.sort((a, b) => {
    // Pinned posts come first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Both pinned: sort by pinnedAt
    if (a.isPinned && b.isPinned) {
      const aPinnedAt = a.pinnedAt && typeof (a.pinnedAt as { toDate?: () => Date }).toDate === "function"
        ? (a.pinnedAt as { toDate: () => Date }).toDate()
        : new Date(0);
      const bPinnedAt = b.pinnedAt && typeof (b.pinnedAt as { toDate?: () => Date }).toDate === "function"
        ? (b.pinnedAt as { toDate: () => Date }).toDate()
        : new Date(0);
      return bPinnedAt.getTime() - aPinnedAt.getTime();
    }

    // Both not pinned: sort by updatedAt (last message time) with fallback to createdAt
    // This ensures conversations with recent activity appear first
    const aTimestamp = a.updatedAt || a.createdAt;
    const bTimestamp = b.updatedAt || b.createdAt;

    const aDate = aTimestamp && typeof (aTimestamp as { toDate?: () => Date }).toDate === "function"
      ? (aTimestamp as { toDate: () => Date }).toDate()
      : aTimestamp ? new Date(aTimestamp as unknown as string) : new Date(0);
    const bDate = bTimestamp && typeof (bTimestamp as { toDate?: () => Date }).toDate === "function"
      ? (bTimestamp as { toDate: () => Date }).toDate()
      : bTimestamp ? new Date(bTimestamp as unknown as string) : new Date(0);

    return bDate.getTime() - aDate.getTime();
  });
}

// ============== SESSION OPERATIONS ==============
// Collection: sessions (historique conversationnel)
// Fields: userId, messages (array), createdAt

export async function createSession(userId: string): Promise<string> {
  const sessionsRef = collection(db, "sessions");
  const docRef = await addDoc(sessionsRef, {
    userId,
    messages: [],
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const sessionRef = doc(db, "sessions", sessionId);
  const sessionSnap = await getDoc(sessionRef);

  if (sessionSnap.exists()) {
    return { id: sessionSnap.id, ...sessionSnap.data() } as Session;
  }
  return null;
}

export async function getUserSessions(
  userId: string,
  limitCount: number = 10
): Promise<Session[]> {
  const sessionsRef = collection(db, "sessions");
  const q = query(
    sessionsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Session[];
}

export async function addMessageToSession(
  sessionId: string,
  message: ChatMessage
): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);
  await updateDoc(sessionRef, {
    messages: arrayUnion(message),
  });
}

export async function updateSessionMessages(
  sessionId: string,
  messages: ChatMessage[]
): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);
  await updateDoc(sessionRef, { messages });
}

// ============== RGPD / PRIVACY OPERATIONS ==============

// Consent management
export interface UserConsent {
  userId: string;
  privacyPolicy: boolean;
  termsOfService: boolean;
  analytics: boolean;
  marketing: boolean;
  consentDate: Timestamp;
  lastUpdated: Timestamp;
}

export async function saveUserConsent(
  userId: string,
  consent: Omit<UserConsent, "userId" | "consentDate" | "lastUpdated">
): Promise<void> {
  const consentRef = doc(db, "consents", userId);
  const existingConsent = await getDoc(consentRef);

  if (existingConsent.exists()) {
    await updateDoc(consentRef, {
      ...consent,
      lastUpdated: serverTimestamp(),
    });
  } else {
    await setDoc(consentRef, {
      userId,
      ...consent,
      consentDate: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    });
  }
}

export async function getUserConsent(userId: string): Promise<UserConsent | null> {
  const consentRef = doc(db, "consents", userId);
  const consentSnap = await getDoc(consentRef);

  if (consentSnap.exists()) {
    return consentSnap.data() as UserConsent;
  }
  return null;
}

// Export all user data (RGPD portability)
export async function exportUserData(userId: string): Promise<{
  profile: UserProfile | null;
  posts: Post[];
  sessions: Session[];
  consent: UserConsent | null;
}> {
  const [profile, posts, sessions, consent] = await Promise.all([
    getUserProfile(userId),
    getUserPosts(userId, 1000), // Get all posts
    getUserSessions(userId, 1000), // Get all sessions
    getUserConsent(userId),
  ]);

  return {
    profile,
    posts,
    sessions,
    consent,
  };
}

// Delete all user data (RGPD right to erasure)
export async function deleteAllUserData(userId: string): Promise<void> {
  const BATCH_SIZE = 500;

  // Delete user profile and consent record (single docs)
  const initialBatch = writeBatch(db);
  initialBatch.delete(doc(db, "users", userId));
  initialBatch.delete(doc(db, "consents", userId));
  await initialBatch.commit();

  // Delete all user posts in batches
  const postsRef = collection(db, "posts");
  const postsQuery = query(postsRef, where("userId", "==", userId));
  const postsSnapshot = await getDocs(postsQuery);

  for (let i = 0; i < postsSnapshot.docs.length; i += BATCH_SIZE) {
    const batchOp = writeBatch(db);
    const chunk = postsSnapshot.docs.slice(i, i + BATCH_SIZE);
    chunk.forEach((docSnap) => batchOp.delete(doc(db, "posts", docSnap.id)));
    await batchOp.commit();
  }

  // Delete all user sessions in batches
  const sessionsRef = collection(db, "sessions");
  const sessionsQuery = query(sessionsRef, where("userId", "==", userId));
  const sessionsSnapshot = await getDocs(sessionsQuery);

  for (let i = 0; i < sessionsSnapshot.docs.length; i += BATCH_SIZE) {
    const batchOp = writeBatch(db);
    const chunk = sessionsSnapshot.docs.slice(i, i + BATCH_SIZE);
    chunk.forEach((docSnap) => batchOp.delete(doc(db, "sessions", docSnap.id)));
    await batchOp.commit();
  }
}

// Withdraw consent (keeps account but removes consent-based data processing)
export async function withdrawConsent(userId: string): Promise<void> {
  const consentRef = doc(db, "consents", userId);
  await updateDoc(consentRef, {
    analytics: false,
    marketing: false,
    lastUpdated: serverTimestamp(),
  });
}

// Update a single consent preference (analytics or marketing)
export async function updateConsentPreference(
  userId: string,
  field: "analytics" | "marketing",
  value: boolean
): Promise<void> {
  const consentRef = doc(db, "consents", userId);
  const existingConsent = await getDoc(consentRef);

  if (existingConsent.exists()) {
    // Update existing document
    await updateDoc(consentRef, {
      [field]: value,
      lastUpdated: serverTimestamp(),
    });
  } else {
    // Create new document with default values
    await setDoc(consentRef, {
      userId,
      privacyPolicy: true,
      termsOfService: true,
      analytics: field === "analytics" ? value : false,
      marketing: field === "marketing" ? value : false,
      consentDate: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    });
  }
}

// ============== LINKEDIN INTEGRATION ==============
// Collection: linkedinConnections
// Fields: userId, linkedInId, accessToken, expiresAt, profileName, profilePicture, email, connectedAt, lastUsedAt

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

export async function saveLinkedInConnection(
  userId: string,
  data: {
    linkedInId: string;
    accessToken: string;
    expiresAt: Date;
    profileName: string;
    profilePicture?: string;
    email?: string;
  }
): Promise<void> {
  const connectionRef = doc(db, "linkedinConnections", userId);
  await setDoc(connectionRef, {
    userId,
    linkedInId: data.linkedInId,
    accessToken: data.accessToken,
    expiresAt: Timestamp.fromDate(data.expiresAt),
    profileName: data.profileName,
    profilePicture: data.profilePicture || null,
    email: data.email || null,
    connectedAt: serverTimestamp(),
    lastUsedAt: null,
  });
}

export async function getLinkedInConnection(
  userId: string
): Promise<LinkedInConnectionData | null> {
  const connectionRef = doc(db, "linkedinConnections", userId);
  const connectionSnap = await getDoc(connectionRef);

  if (connectionSnap.exists()) {
    return connectionSnap.data() as LinkedInConnectionData;
  }
  return null;
}

export async function updateLinkedInLastUsed(userId: string): Promise<void> {
  const connectionRef = doc(db, "linkedinConnections", userId);
  await updateDoc(connectionRef, {
    lastUsedAt: serverTimestamp(),
  });
}

export async function deleteLinkedInConnection(userId: string): Promise<void> {
  const connectionRef = doc(db, "linkedinConnections", userId);
  await deleteDoc(connectionRef);
}

// ============== LINKEDIN POSTS HISTORY ==============
// Collection: linkedinPosts
// Fields: userId, linkedInId, postId, content, publishedAt, postUrl, success, error

export interface LinkedInPostMetrics {
  likes: number;
  comments: number;
  shares: number;
  impressions?: number;
  clickRate?: number;
  engagementRate?: number;
  updatedAt: Timestamp;
  source: 'manual' | 'extension' | 'api';
}

export interface LinkedInPostData {
  id: string;
  userId: string;
  linkedInId: string;
  postId: string;
  content: string;
  publishedAt: Timestamp;
  postUrl?: string;
  success: boolean;
  error?: string;
  metrics?: LinkedInPostMetrics;
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

export async function saveLinkedInPost(
  userId: string,
  data: {
    linkedInId: string;
    postId: string;
    content: string;
    postUrl?: string;
    success: boolean;
    error?: string;
  }
): Promise<string> {
  const postsRef = collection(db, "linkedinPosts");
  const docRef = await addDoc(postsRef, {
    userId,
    linkedInId: data.linkedInId,
    postId: data.postId,
    content: data.content,
    postUrl: data.postUrl || null,
    success: data.success,
    error: data.error || null,
    publishedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getLinkedInPosts(
  userId: string,
  limitCount: number = 20
): Promise<LinkedInPostData[]> {
  const postsRef = collection(db, "linkedinPosts");
  const q = query(
    postsRef,
    where("userId", "==", userId),
    orderBy("publishedAt", "desc"),
    limit(limitCount + 50) // Over-fetch to compensate for filtered-out deleted posts
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }) as LinkedInPostData)
    .filter((post) => !(post as LinkedInPostData & { deletedFromPlatform?: boolean }).deletedFromPlatform)
    .slice(0, limitCount);
}

/**
 * Update engagement metrics for a LinkedIn post
 */
export async function updateLinkedInPostMetrics(
  postId: string,
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    impressions?: number;
    source?: 'manual' | 'extension' | 'api';
  }
): Promise<void> {
  const postRef = doc(db, "linkedinPosts", postId);

  // Calculate engagement rate if we have impressions
  let engagementRate: number | undefined;
  if (metrics.impressions && metrics.impressions > 0) {
    const totalEngagements = metrics.likes + metrics.comments + metrics.shares;
    engagementRate = (totalEngagements / metrics.impressions) * 100;
  }

  await updateDoc(postRef, {
    metrics: {
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      impressions: metrics.impressions || null,
      engagementRate: engagementRate || null,
      updatedAt: serverTimestamp(),
      source: metrics.source || 'manual',
    },
  });
}

/**
 * Get LinkedIn analytics summary for a user
 */
export async function getLinkedInAnalytics(
  userId: string
): Promise<LinkedInAnalyticsSummary> {
  const postsRef = collection(db, "linkedinPosts");
  const q = query(
    postsRef,
    where("userId", "==", userId),
    where("success", "==", true),
    orderBy("publishedAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  const posts = querySnapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }) as LinkedInPostData)
    .filter((post) => !(post as LinkedInPostData & { deletedFromPlatform?: boolean }).deletedFromPlatform);

  // Calculate date boundaries
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Aggregate metrics
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalEngagementRate = 0;
  let postsWithMetrics = 0;
  let bestPerformingPost: LinkedInPostData | undefined;
  let bestEngagement = 0;
  let postsThisWeek = 0;
  let postsThisMonth = 0;

  posts.forEach((post) => {
    // Count posts by time period
    const publishedAt = post.publishedAt?.toDate?.() || new Date(0);
    if (publishedAt >= weekAgo) postsThisWeek++;
    if (publishedAt >= monthAgo) postsThisMonth++;

    // Aggregate metrics
    if (post.metrics) {
      totalLikes += post.metrics.likes || 0;
      totalComments += post.metrics.comments || 0;
      totalShares += post.metrics.shares || 0;

      if (post.metrics.engagementRate) {
        totalEngagementRate += post.metrics.engagementRate;
        postsWithMetrics++;
      }

      // Find best performing post
      const engagement = (post.metrics.likes || 0) + (post.metrics.comments || 0) * 2 + (post.metrics.shares || 0) * 3;
      if (engagement > bestEngagement) {
        bestEngagement = engagement;
        bestPerformingPost = post;
      }
    }
  });

  return {
    totalPosts: posts.length,
    totalLikes,
    totalComments,
    totalShares,
    avgEngagementRate: postsWithMetrics > 0 ? totalEngagementRate / postsWithMetrics : 0,
    bestPerformingPost,
    postsThisWeek,
    postsThisMonth,
  };
}

/**
 * Get LinkedIn post by ID
 */
export async function getLinkedInPostById(
  postId: string
): Promise<LinkedInPostData | null> {
  const postRef = doc(db, "linkedinPosts", postId);
  const postSnap = await getDoc(postRef);

  if (!postSnap.exists()) return null;

  return {
    id: postSnap.id,
    ...postSnap.data(),
  } as LinkedInPostData;
}

/**
 * Mark a LinkedIn post as deleted from the platform.
 * The post stays in Firestore for record-keeping but is excluded from analytics.
 */
export async function markLinkedInPostDeleted(postId: string): Promise<void> {
  const postRef = doc(db, "linkedinPosts", postId);
  await updateDoc(postRef, {
    deletedFromPlatform: true,
    deletedFromPlatformAt: serverTimestamp(),
  });
}

// ============== QUOTA MANAGEMENT ==============

import { SubscriptionPlan } from "@/types";

export interface QuotaInfo {
  plan: SubscriptionPlan | null;
  dailyLimit: number;
  usedToday: number;
  remaining: number;
  canSendMessage: boolean;
  resetsAt: Date;
  // Monthly quota (Free plan)
  monthlyLimit: number;       // 3 for free, -1 for paid
  usedThisMonth: number;      // usage.conversationsThisMonth
  monthlyRemaining: number;   // monthlyLimit - usedThisMonth
  hasMonthlyLimit: boolean;   // true when plan uses monthly enforcement
  // Weekly publish quota (Free plan)
  weeklyPublishLimit: number;     // 3 for free, -1 for paid
  weeklyPublishUsed: number;      // publications this week
  weeklyPublishRemaining: number; // weeklyPublishLimit - weeklyPublishUsed
  hasWeeklyPublishLimit: boolean; // true when plan uses weekly publish enforcement
  weeklyPublishResetsAt: Date;    // start of next week (Monday 00:00 UTC)
  canPublishThisWeek: boolean;    // shorthand: used < limit
  // Legacy fields for backwards compatibility
  weeklyLimit?: number;
  usedThisWeek?: number;
  canPublish?: boolean;
}

/**
 * Get the start of today (00:00:00 UTC)
 * Aligned with server-side isTodayUTC() for consistent quota tracking
 */
function getTodayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Get the end of today (00:00:00 UTC tomorrow)
 * Aligned with server-side for consistent quota reset
 */
function getTodayEnd(): Date {
  const today = getTodayStart();
  today.setUTCDate(today.getUTCDate() + 1);
  return today;
}

/**
 * Check if a date is today (UTC)
 */
function isToday(date: Date): boolean {
  const today = getTodayStart();
  const tomorrow = getTodayEnd();
  return date >= today && date < tomorrow;
}

/**
 * Check if a date is in the same UTC month as now
 */
function isSameMonthUTC(date: Date): boolean {
  const now = new Date();
  return date.getUTCMonth() === now.getUTCMonth() &&
         date.getUTCFullYear() === now.getUTCFullYear();
}

/**
 * Get the start of next month (UTC) for reset display
 */
function getNextMonthStartUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

/**
 * Get quota information for a user (daily message limits)
 *
 * IMPORTANT: Respects test mode - if test mode is active, uses the test plan
 * for quota calculations instead of the actual Stripe subscription.
 */
export async function getUserQuota(userId: string, authEmail?: string | null): Promise<QuotaInfo> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  const todayEnd = getTodayEnd();

  // If user document doesn't exist yet (race condition during signup),
  // treat as a new Free plan user with full quota available.
  // The server-side check is the real authority — this prevents false "quota exceeded" UI.
  if (!userSnap.exists()) {
    const monthlyLimit = PLAN_CONFIGS.free.limits.conversationsPerMonth;
    const wpLimit = PLAN_CONFIGS.free.limits.weeklyPublishLimit;
    return {
      plan: "free",
      dailyLimit: monthlyLimit,
      usedToday: 0,
      remaining: monthlyLimit,
      canSendMessage: true,
      resetsAt: getNextMonthStartUTC(),
      monthlyLimit,
      usedThisMonth: 0,
      monthlyRemaining: monthlyLimit,
      hasMonthlyLimit: true,
      weeklyPublishLimit: wpLimit,
      weeklyPublishUsed: 0,
      weeklyPublishRemaining: wpLimit,
      hasWeeklyPublishLimit: true,
      weeklyPublishResetsAt: getNextWeekStartUTC(),
      canPublishThisWeek: true,
      weeklyLimit: monthlyLimit,
      usedThisWeek: 0,
      canPublish: true,
    };
  }

  const data = userSnap.data();

  // Determine effective plan (normalize to handle casing/legacy names)
  let effectivePlan = normalizePlanName(data.subscription?.plan);

  // Founder override: use Firestore email, fallback to Firebase Auth email
  const founderPlan = getFounderOverridePlan(data.email || authEmail);
  if (founderPlan) {
    effectivePlan = founderPlan;
  }

  // No subscription found — default to Free for recently created users (< 5 min ago),
  // otherwise treat as no plan. This handles the race condition where the document
  // exists but subscription fields haven't been written yet.
  if (!effectivePlan) {
    const createdAt = data.createdAt?.toDate?.();
    const isRecentlyCreated = createdAt && (Date.now() - createdAt.getTime()) < 5 * 60 * 1000;

    if (isRecentlyCreated) {
      // Likely a new user whose subscription field hasn't been set yet
      const monthlyLimit = PLAN_CONFIGS.free.limits.conversationsPerMonth;
      const wpLimit = PLAN_CONFIGS.free.limits.weeklyPublishLimit;
      return {
        plan: "free",
        dailyLimit: monthlyLimit,
        usedToday: 0,
        remaining: monthlyLimit,
        canSendMessage: true,
        resetsAt: getNextMonthStartUTC(),
        monthlyLimit,
        usedThisMonth: 0,
        monthlyRemaining: monthlyLimit,
        hasMonthlyLimit: true,
        weeklyPublishLimit: wpLimit,
        weeklyPublishUsed: 0,
        weeklyPublishRemaining: wpLimit,
        hasWeeklyPublishLimit: true,
        weeklyPublishResetsAt: getNextWeekStartUTC(),
        canPublishThisWeek: true,
        weeklyLimit: monthlyLimit,
        usedThisWeek: 0,
        canPublish: true,
      };
    }

    return {
      plan: null,
      dailyLimit: 0,
      usedToday: 0,
      remaining: 0,
      canSendMessage: false,
      resetsAt: todayEnd,
      monthlyLimit: 0,
      usedThisMonth: 0,
      monthlyRemaining: 0,
      hasMonthlyLimit: false,
      weeklyPublishLimit: 0,
      weeklyPublishUsed: 0,
      weeklyPublishRemaining: 0,
      hasWeeklyPublishLimit: false,
      weeklyPublishResetsAt: getNextWeekStartUTC(),
      canPublishThisWeek: false,
      weeklyLimit: 0,
      usedThisWeek: 0,
      canPublish: false,
    };
  }

  // ========== FREE PLAN: MONTHLY QUOTA ENFORCEMENT ==========
  if (effectivePlan === "free") {
    const monthlyLimit = PLAN_CONFIGS.free.limits.conversationsPerMonth; // 3
    const usageData = data.usage || {};
    let usedThisMonth = usageData.conversationsThisMonth || 0;

    // Reset if different month
    const monthStartDate = usageData.monthStartDate?.toDate?.();
    if (monthStartDate && !isSameMonthUTC(monthStartDate)) {
      usedThisMonth = 0;
    }

    const monthlyRemaining = Math.max(0, monthlyLimit - usedThisMonth);
    const canSendMessage = usedThisMonth < monthlyLimit;

    // Weekly publish quota
    const wpLimit = PLAN_CONFIGS.free.limits.weeklyPublishLimit; // 3
    const weekStart = getWeekStartUTC();
    const lastPublishWeekStart = data?.quota?.publishWeekStart?.toDate?.();
    let weeklyPublishUsed = 0;
    if (lastPublishWeekStart && lastPublishWeekStart.getTime() >= weekStart.getTime()) {
      weeklyPublishUsed = data?.quota?.weeklyPublishCount || 0;
    }
    const weeklyPublishRemaining = Math.max(0, wpLimit - weeklyPublishUsed);

    return {
      plan: effectivePlan,
      dailyLimit: monthlyLimit, // Backwards compat: treat as "daily" limit for UI
      usedToday: usedThisMonth, // Backwards compat
      remaining: monthlyRemaining,
      canSendMessage,
      resetsAt: getNextMonthStartUTC(),
      // Monthly-specific
      monthlyLimit,
      usedThisMonth,
      monthlyRemaining,
      hasMonthlyLimit: true,
      // Weekly publish quota
      weeklyPublishLimit: wpLimit,
      weeklyPublishUsed,
      weeklyPublishRemaining,
      hasWeeklyPublishLimit: true,
      weeklyPublishResetsAt: getNextWeekStartUTC(),
      canPublishThisWeek: weeklyPublishUsed < wpLimit,
      // Legacy
      weeklyLimit: monthlyLimit,
      usedThisWeek: usedThisMonth,
      canPublish: canSendMessage,
    };
  }

  const dailyLimit = DAILY_MESSAGE_LIMITS[effectivePlan];

  // Check if we need to reset the quota (new day)
  let usedToday = 0;
  const lastMessageDate = data.quota?.lastMessageDate?.toDate?.();

  if (lastMessageDate && isToday(lastMessageDate)) {
    // Same day, use existing count
    usedToday = data.quota?.dailyMessageCount || 0;
  }
  // Otherwise, it's a new day, usedToday stays 0

  const remaining = dailyLimit === -1 ? -1 : Math.max(0, dailyLimit - usedToday);
  const canSendMessage = dailyLimit === -1 || usedToday < dailyLimit;

  return {
    plan: effectivePlan,
    dailyLimit,
    usedToday,
    remaining,
    canSendMessage,
    resetsAt: todayEnd,
    // Monthly (not applicable for Pro/Max)
    monthlyLimit: -1,
    usedThisMonth: 0,
    monthlyRemaining: -1,
    hasMonthlyLimit: false,
    // Weekly publish quota (unlimited for Pro/Max)
    weeklyPublishLimit: -1,
    weeklyPublishUsed: 0,
    weeklyPublishRemaining: -1,
    hasWeeklyPublishLimit: false,
    weeklyPublishResetsAt: getNextWeekStartUTC(),
    canPublishThisWeek: true,
    // Legacy compatibility
    weeklyLimit: dailyLimit,
    usedThisWeek: usedToday,
    canPublish: canSendMessage,
  };
}

/**
 * Check if user can send a message (quota not exceeded)
 */
export async function canUserSendMessage(userId: string): Promise<boolean> {
  const quota = await getUserQuota(userId);
  return quota.canSendMessage;
}

/**
 * Legacy alias for backwards compatibility
 */
export async function canUserPublish(userId: string): Promise<boolean> {
  return canUserSendMessage(userId);
}

/**
 * Increment the user's message count for today
 */
export async function incrementMessageCount(userId: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("User not found");
  }

  const data = userSnap.data();
  const today = getTodayStart();
  const lastMessageDate = data.quota?.lastMessageDate?.toDate?.();

  let newCount = 1;

  if (lastMessageDate && isToday(lastMessageDate)) {
    // Same day, increment existing count
    newCount = (data.quota?.dailyMessageCount || 0) + 1;
  }
  // Otherwise, it's a new day, start fresh at 1

  await updateDoc(userRef, {
    "quota.dailyMessageCount": newCount,
    "quota.lastMessageDate": Timestamp.fromDate(today),
  });
}

/**
 * Legacy alias for backwards compatibility
 */
export async function incrementPublishCount(userId: string): Promise<void> {
  return incrementMessageCount(userId);
}

// ============== DUAL MODE WEEKLY QUOTA ==============

/**
 * Get dual-mode usage count for the current week (client-side)
 */
export async function getDualModeUsageThisWeek(userId: string): Promise<number> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return 0;

  const data = userSnap.data();

  // Calculate current week start (Monday 00:00 UTC)
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));

  const lastDualWeekStart = data?.quota?.dualModeWeekStart?.toDate?.();

  if (!lastDualWeekStart || lastDualWeekStart.getTime() < weekStart.getTime()) {
    return 0;
  }

  return data?.quota?.dualModeCountThisWeek || 0;
}

// ============== WEEKLY PUBLISH QUOTA (Free plan) ==============

/**
 * Get the start of the current week (Monday 00:00 UTC)
 */
function getWeekStartUTC(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff, 0, 0, 0, 0));
}

/**
 * Get the start of next week (Monday 00:00 UTC) for reset display
 */
function getNextWeekStartUTC(): Date {
  const weekStart = getWeekStartUTC();
  weekStart.setUTCDate(weekStart.getUTCDate() + 7);
  return weekStart;
}

/**
 * Get the number of posts published this week by a Free plan user (client-side)
 */
export async function getWeeklyPublishCount(userId: string): Promise<number> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return 0;

  const data = userSnap.data();
  const weekStart = getWeekStartUTC();

  const lastWeekStart = data?.quota?.publishWeekStart?.toDate?.();

  // If no week start recorded, or it's from a previous week, count is 0
  if (!lastWeekStart || lastWeekStart.getTime() < weekStart.getTime()) {
    return 0;
  }

  return data?.quota?.weeklyPublishCount || 0;
}

/**
 * Increment the weekly publish count for a user (client-side)
 * Called after a successful publish.
 */
export async function incrementWeeklyPublishCount(userId: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return;

  const data = userSnap.data();
  const weekStart = getWeekStartUTC();
  const lastWeekStart = data?.quota?.publishWeekStart?.toDate?.();

  let newCount = 1;

  // If same week, increment; otherwise start fresh
  if (lastWeekStart && lastWeekStart.getTime() >= weekStart.getTime()) {
    newCount = (data?.quota?.weeklyPublishCount || 0) + 1;
  }

  await updateDoc(userRef, {
    "quota.weeklyPublishCount": newCount,
    "quota.publishWeekStart": Timestamp.fromDate(weekStart),
  });
}

/**
 * Check if a Free user can publish (weekly quota not exceeded)
 */
export async function canUserPublishThisWeek(userId: string, authEmail?: string | null): Promise<{
  canPublish: boolean;
  used: number;
  limit: number;
  resetsAt: Date;
}> {
  const quota = await getUserQuota(userId, authEmail);
  const plan = quota.plan;

  // Pro/Max: always allowed
  if (plan && plan !== "free") {
    return { canPublish: true, used: 0, limit: -1, resetsAt: new Date() };
  }

  const { getWeeklyPublishLimit } = await import("@/lib/config/plans");
  const limit = getWeeklyPublishLimit(plan);

  // Unlimited
  if (limit === -1) {
    return { canPublish: true, used: 0, limit: -1, resetsAt: new Date() };
  }

  const used = await getWeeklyPublishCount(userId);
  return {
    canPublish: used < limit,
    used,
    limit,
    resetsAt: getNextWeekStartUTC(),
  };
}

/**
 * Update user subscription plan
 */
export async function updateUserSubscription(
  userId: string,
  plan: SubscriptionPlan,
  expiresAt?: Date
): Promise<void> {
  const userRef = doc(db, "users", userId);

  const subscriptionData: Record<string, unknown> = {
    "subscription.plan": plan,
    "subscription.subscribedAt": serverTimestamp(),
  };

  if (expiresAt) {
    subscriptionData["subscription.expiresAt"] = Timestamp.fromDate(expiresAt);
  }

  await updateDoc(userRef, subscriptionData);
}

/**
 * Update user subscription with Stripe data
 */
export async function updateUserStripeSubscription(
  userId: string,
  data: {
    plan: SubscriptionPlan;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    status?: "active" | "canceled" | "past_due" | "unpaid" | "trialing";
    expiresAt?: Date;
  }
): Promise<void> {
  const userRef = doc(db, "users", userId);

  const subscriptionData: Record<string, unknown> = {
    "subscription.plan": data.plan,
    "subscription.subscribedAt": serverTimestamp(),
  };

  if (data.stripeCustomerId) {
    subscriptionData["subscription.stripeCustomerId"] = data.stripeCustomerId;
  }
  if (data.stripeSubscriptionId) {
    subscriptionData["subscription.stripeSubscriptionId"] = data.stripeSubscriptionId;
  }
  if (data.status) {
    subscriptionData["subscription.status"] = data.status;
  }
  if (data.expiresAt) {
    subscriptionData["subscription.expiresAt"] = Timestamp.fromDate(data.expiresAt);
  }

  await updateDoc(userRef, subscriptionData);
}

/**
 * Get user's Stripe customer ID
 */
export async function getUserStripeCustomerId(userId: string): Promise<string | null> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data()?.subscription?.stripeCustomerId || null;
  }
  return null;
}

// ============== PAYMENT HISTORY ==============

export interface PaymentRecord {
  id: string;
  userId: string;
  stripePaymentId: string;
  amount: number;
  currency: string;
  status: "succeeded" | "failed" | "pending";
  description?: string;
  invoiceUrl?: string;
  createdAt: Timestamp;
}

/**
 * Save a payment record
 */
export async function savePaymentRecord(
  userId: string,
  payment: Omit<PaymentRecord, "id" | "userId" | "createdAt">
): Promise<string> {
  const paymentsRef = collection(db, "payments");
  const docRef = await addDoc(paymentsRef, {
    userId,
    ...payment,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get user's payment history
 */
export async function getUserPayments(
  userId: string,
  limitCount: number = 20
): Promise<PaymentRecord[]> {
  const paymentsRef = collection(db, "payments");
  const q = query(
    paymentsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as PaymentRecord[];
}

// ============== BATCH OPERATIONS ==============

export interface BatchUpdate {
  ref: DocumentReference;
  data: Record<string, unknown>;
}

/**
 * Perform multiple updates in a single batch transaction
 * More efficient than multiple individual updates
 */
export async function batchUpdateDocs(updates: BatchUpdate[]): Promise<void> {
  if (updates.length === 0) return;

  const batch = writeBatch(db);

  updates.forEach(({ ref, data }) => {
    batch.update(ref, data);
  });

  await batch.commit();
}

/**
 * Batch delete multiple documents
 */
export async function batchDeleteDocs(refs: DocumentReference[]): Promise<void> {
  if (refs.length === 0) return;

  const batch = writeBatch(db);

  refs.forEach((ref) => {
    batch.delete(ref);
  });

  await batch.commit();
}

/**
 * Batch pin/unpin multiple posts
 */
export async function batchPinPosts(
  postIds: string[],
  isPinned: boolean
): Promise<void> {
  const updates: BatchUpdate[] = postIds.map((postId) => ({
    ref: doc(db, "posts", postId),
    data: isPinned
      ? { isPinned: true, pinnedAt: serverTimestamp() }
      : { isPinned: false, pinnedAt: null },
  }));

  await batchUpdateDocs(updates);
}

/**
 * Batch delete multiple posts
 */
export async function batchDeletePosts(postIds: string[]): Promise<void> {
  const refs = postIds.map((postId) => doc(db, "posts", postId));
  await batchDeleteDocs(refs);
}

/**
 * Delete all user conversations (posts and sessions)
 * Used for "Delete all my conversations" feature in Settings
 * Returns the count of deleted items for feedback
 */
export async function deleteAllUserConversations(userId: string): Promise<{
  postsDeleted: number;
  sessionsDeleted: number;
  linkedInPostsDeleted: number;
  scheduledPostsDeleted: number;
}> {
  let postsDeleted = 0;
  let sessionsDeleted = 0;
  let linkedInPostsDeleted = 0;
  let scheduledPostsDeleted = 0;
  const BATCH_SIZE = 500;

  // Delete all user posts (conversations)
  const postsRef = collection(db, "posts");
  const postsQuery = query(postsRef, where("userId", "==", userId));
  const postsSnapshot = await getDocs(postsQuery);

  if (postsSnapshot.docs.length > 0) {
    const postDocs = postsSnapshot.docs;

    for (let i = 0; i < postDocs.length; i += BATCH_SIZE) {
      const batchOp = writeBatch(db);
      const chunk = postDocs.slice(i, i + BATCH_SIZE);

      chunk.forEach((docSnap) => {
        batchOp.delete(doc(db, "posts", docSnap.id));
      });

      await batchOp.commit();
      postsDeleted += chunk.length;
    }
  }

  // Delete all user sessions
  const sessionsRef = collection(db, "sessions");
  const sessionsQuery = query(sessionsRef, where("userId", "==", userId));
  const sessionsSnapshot = await getDocs(sessionsQuery);

  if (sessionsSnapshot.docs.length > 0) {
    const sessionDocs = sessionsSnapshot.docs;

    for (let i = 0; i < sessionDocs.length; i += BATCH_SIZE) {
      const batchOp = writeBatch(db);
      const chunk = sessionDocs.slice(i, i + BATCH_SIZE);

      chunk.forEach((docSnap) => {
        batchOp.delete(doc(db, "sessions", docSnap.id));
      });

      await batchOp.commit();
      sessionsDeleted += chunk.length;
    }
  }

  // Cascade: delete all linkedinPosts for the user (analytics records)
  const linkedInSnap = await getDocs(
    query(collection(db, "linkedinPosts"), where("userId", "==", userId))
  );
  if (linkedInSnap.docs.length > 0) {
    for (let i = 0; i < linkedInSnap.docs.length; i += BATCH_SIZE) {
      const batchOp = writeBatch(db);
      linkedInSnap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batchOp.delete(d.ref));
      await batchOp.commit();
      linkedInPostsDeleted += Math.min(BATCH_SIZE, linkedInSnap.docs.length - i);
    }
  }

  // Cascade: delete all scheduledPosts for the user
  const scheduledSnap = await getDocs(
    query(collection(db, "scheduledPosts"), where("userId", "==", userId))
  );
  if (scheduledSnap.docs.length > 0) {
    for (let i = 0; i < scheduledSnap.docs.length; i += BATCH_SIZE) {
      const batchOp = writeBatch(db);
      scheduledSnap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batchOp.delete(d.ref));
      await batchOp.commit();
      scheduledPostsDeleted += Math.min(BATCH_SIZE, scheduledSnap.docs.length - i);
    }
  }

  return { postsDeleted, sessionsDeleted, linkedInPostsDeleted, scheduledPostsDeleted };
}

/**
 * Search posts by prompt content
 */
export async function searchPosts(
  userId: string,
  searchQuery: string,
  limitCount: number = 20
): Promise<Post[]> {
  // Firestore doesn't support full-text search natively
  // For now, we fetch posts and filter client-side
  // For production, consider Algolia or Elasticsearch
  const posts = await getUserPostsWithPinned(userId, 100);

  const normalizedQuery = searchQuery.toLowerCase().trim();

  return posts
    .filter((post) => {
      const prompt = post.prompt.toLowerCase();
      const title = (post.title || "").toLowerCase();
      return prompt.includes(normalizedQuery) || title.includes(normalizedQuery);
    })
    .slice(0, limitCount);
}

// ============== TWITTER CONNECTION MANAGEMENT ==============
// Collection: twitterConnections
// Document ID: userId

import { TwitterConnectionData, TwitterPostData } from "@/types";

export async function saveTwitterConnection(
  userId: string,
  data: {
    twitterId: string;
    username: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
    profileName: string;
    profilePicture?: string;
  }
): Promise<void> {
  const connectionRef = doc(db, "twitterConnections", userId);
  await setDoc(connectionRef, {
    userId,
    twitterId: data.twitterId,
    username: data.username,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || null,
    expiresAt: Timestamp.fromDate(data.expiresAt),
    profileName: data.profileName,
    profilePicture: data.profilePicture || null,
    connectedAt: serverTimestamp(),
    lastUsedAt: null,
  });
}

export async function getTwitterConnection(
  userId: string
): Promise<TwitterConnectionData | null> {
  const connectionRef = doc(db, "twitterConnections", userId);
  const connectionSnap = await getDoc(connectionRef);

  if (connectionSnap.exists()) {
    return connectionSnap.data() as TwitterConnectionData;
  }
  return null;
}

export async function updateTwitterTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | undefined,
  expiresAt: Date
): Promise<void> {
  const connectionRef = doc(db, "twitterConnections", userId);
  await updateDoc(connectionRef, {
    accessToken,
    refreshToken: refreshToken || null,
    expiresAt: Timestamp.fromDate(expiresAt),
  });
}

export async function updateTwitterLastUsed(userId: string): Promise<void> {
  const connectionRef = doc(db, "twitterConnections", userId);
  await updateDoc(connectionRef, {
    lastUsedAt: serverTimestamp(),
  });
}

export async function deleteTwitterConnection(userId: string): Promise<void> {
  const connectionRef = doc(db, "twitterConnections", userId);
  await deleteDoc(connectionRef);
}

// ============== TWITTER POSTS HISTORY ==============
// Collection: twitterPosts

export async function saveTwitterPost(
  userId: string,
  data: {
    twitterId: string;
    tweetId: string;
    content: string;
    tweetUrl?: string;
    success: boolean;
    error?: string;
  }
): Promise<string> {
  const postsRef = collection(db, "twitterPosts");
  const docRef = await addDoc(postsRef, {
    userId,
    twitterId: data.twitterId,
    tweetId: data.tweetId,
    content: data.content,
    tweetUrl: data.tweetUrl || null,
    success: data.success,
    error: data.error || null,
    publishedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getTwitterPosts(
  userId: string,
  limitCount: number = 20
): Promise<TwitterPostData[]> {
  const postsRef = collection(db, "twitterPosts");
  const q = query(
    postsRef,
    where("userId", "==", userId),
    orderBy("publishedAt", "desc"),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as TwitterPostData[];
}

// ============== FACEBOOK CONNECTION MANAGEMENT ==============
// Collection: facebookConnections
// Document ID: userId

import { FacebookConnectionData, ThreadsConnectionData } from "@/types";

export async function getFacebookConnection(
  userId: string
): Promise<FacebookConnectionData | null> {
  const connectionRef = doc(db, "facebookConnections", userId);
  const connectionSnap = await getDoc(connectionRef);

  if (connectionSnap.exists()) {
    return connectionSnap.data() as FacebookConnectionData;
  }
  return null;
}

export async function deleteFacebookConnection(userId: string): Promise<void> {
  const connectionRef = doc(db, "facebookConnections", userId);
  await deleteDoc(connectionRef);
}

// ============== THREADS CONNECTION MANAGEMENT ==============
// Collection: threadsConnections
// Document ID: userId

export async function getThreadsConnection(
  userId: string
): Promise<ThreadsConnectionData | null> {
  const connectionRef = doc(db, "threadsConnections", userId);
  const connectionSnap = await getDoc(connectionRef);

  if (connectionSnap.exists()) {
    return connectionSnap.data() as ThreadsConnectionData;
  }
  return null;
}

export async function deleteThreadsConnection(userId: string): Promise<void> {
  const connectionRef = doc(db, "threadsConnections", userId);
  await deleteDoc(connectionRef);
}

// ============== DASHBOARD STATISTICS ==============

export interface DashboardStats {
  totalPosts: number;
  publishedPosts: number;
  totalSessions: number;
  postsLast7Days: number;
  postsLast30Days: number;
  postsByDay: { date: string; count: number }[];
  styleDistribution: { style: string; count: number }[];
  responseModeDistribution: { mode: string; count: number }[];
  recentActivity: { date: string; type: string; content: string }[];
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all posts for the user
  const postsRef = collection(db, "posts");
  const postsQuery = query(
    postsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const postsSnapshot = await getDocs(postsQuery);
  const posts = postsSnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  // Get LinkedIn published posts
  const linkedInPostsRef = collection(db, "linkedinPosts");
  const linkedInQuery = query(
    linkedInPostsRef,
    where("userId", "==", userId),
    where("success", "==", true)
  );
  const linkedInSnapshot = await getDocs(linkedInQuery);
  const publishedPosts = linkedInSnapshot.size;

  // Get sessions count
  const sessionsRef = collection(db, "sessions");
  const sessionsQuery = query(sessionsRef, where("userId", "==", userId));
  const sessionsSnapshot = await getDocs(sessionsQuery);
  const totalSessions = sessionsSnapshot.size;

  // Calculate posts in last 7 and 30 days
  let postsLast7Days = 0;
  let postsLast30Days = 0;
  const postsByDayMap: Record<string, number> = {};
  const styleCount: Record<string, number> = {
    "Storytelling": 0,
    "Business": 0,
  };
  const responseModeCount: Record<string, number> = {
    "Storytelling seul": 0,
    "Business seul": 0,
    "Double Réponse": 0,
  };

  posts.forEach((post) => {
    const postData = post as {
      createdAt?: Timestamp;
      chosenVersion?: string;
      contentB?: string;
      responseMode?: string;
      selectedStyle?: string;
    };
    if (postData.createdAt) {
      const postDate = postData.createdAt.toDate();
      const dateKey = postDate.toISOString().split("T")[0];

      // Count by day
      postsByDayMap[dateKey] = (postsByDayMap[dateKey] || 0) + 1;

      // Count last 7/30 days
      if (postDate >= sevenDaysAgo) postsLast7Days++;
      if (postDate >= thirtyDaysAgo) postsLast30Days++;
    }

    // Count style distribution
    if (postData.chosenVersion === "A") {
      styleCount["Storytelling"]++;
    } else if (postData.chosenVersion === "B") {
      styleCount["Business"]++;
    }

    // Count response mode distribution
    const hasContentB = postData.contentB && postData.contentB.trim().length > 0;
    if (postData.responseMode === "dual" || hasContentB) {
      responseModeCount["Double Réponse"]++;
    } else if (postData.selectedStyle === "storytelling") {
      responseModeCount["Storytelling seul"]++;
    } else {
      responseModeCount["Business seul"]++;
    }
  });

  // Convert postsByDay to sorted array (last 30 days)
  const postsByDay: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split("T")[0];
    postsByDay.push({
      date: dateKey,
      count: postsByDayMap[dateKey] || 0,
    });
  }

  // Style distribution
  const styleDistribution = Object.entries(styleCount).map(([style, count]) => ({
    style,
    count,
  }));

  // Response mode distribution
  const responseModeDistribution = Object.entries(responseModeCount).map(([mode, count]) => ({
    mode,
    count,
  }));

  // Recent activity (last 5 posts)
  const recentActivity = posts.slice(0, 5).map((post) => {
    const postData = post as { createdAt?: Timestamp; prompt?: string };
    return {
      date: postData.createdAt?.toDate().toISOString() || new Date().toISOString(),
      type: "post",
      content: postData.prompt?.substring(0, 50) || "Post généré",
    };
  });

  return {
    totalPosts: posts.length,
    publishedPosts,
    totalSessions,
    postsLast7Days,
    postsLast30Days,
    postsByDay,
    styleDistribution,
    responseModeDistribution,
    recentActivity,
  };
}

// Update dashboard visited flag
export async function markDashboardVisited(userId: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    dashboardVisited: true,
  });
}

export async function hasDashboardBeenVisited(userId: string): Promise<boolean> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data().dashboardVisited === true;
  }
  return false;
}

// ============== SCHEDULED POSTS MANAGEMENT ==============
// Collection: scheduledPosts
// Document ID: auto-generated

import {
  ScheduledPost,
  ScheduledPostImage,
  CreateScheduledPostData,
  ScheduleStatus,
  SchedulePlatform,
} from "@/types";

/**
 * Generate a Firestore document ID for a scheduled post BEFORE upload.
 * This allows images to be uploaded to Storage under this ID,
 * then the document is created with the image metadata.
 */
export function generateScheduledPostId(): string {
  const scheduledPostsRef = collection(db, "scheduledPosts");
  return doc(scheduledPostsRef).id;
}

/**
 * Create a new scheduled post (with optional image metadata)
 * Permission check is handled upstream by SchedulingContext.
 */
export async function createScheduledPost(
  userId: string,
  data: CreateScheduledPostData,
  images?: ScheduledPostImage[],
  preGeneratedId?: string
): Promise<string> {
  const scheduledPostsRef = collection(db, "scheduledPosts");

  const postData: Record<string, unknown> = {
    userId,
    content: data.content,
    postId: data.postId || null,
    title: data.title || null,
    scheduledAt: Timestamp.fromDate(data.scheduledAt),
    timezone: data.timezone,
    status: "pending" as ScheduleStatus,
    platform: data.platform,
    postType: data.postType || "feed",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    attemptCount: 0,
    publishedAt: null,
    publishedUrl: null,
    lastAttemptAt: null,
    failureReason: null,
  };

  // Add images array if provided
  if (images && images.length > 0) {
    postData.images = images;
  }

  if (preGeneratedId) {
    // Use the pre-generated ID (images were uploaded under this ID)
    const docRef = doc(scheduledPostsRef, preGeneratedId);
    await setDoc(docRef, postData);
    return preGeneratedId;
  } else {
    const docRef = await addDoc(scheduledPostsRef, postData);
    return docRef.id;
  }
}

/**
 * Get all scheduled posts for a user
 */
export async function getScheduledPosts(
  userId: string,
  status?: ScheduleStatus
): Promise<ScheduledPost[]> {
  const scheduledPostsRef = collection(db, "scheduledPosts");

  let q;
  if (status) {
    q = query(
      scheduledPostsRef,
      where("userId", "==", userId),
      where("status", "==", status),
      orderBy("scheduledAt", "asc")
    );
  } else {
    q = query(
      scheduledPostsRef,
      where("userId", "==", userId),
      orderBy("scheduledAt", "desc")
    );
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ScheduledPost[];
}

/**
 * Get pending scheduled posts (for publishing worker)
 */
export async function getPendingScheduledPosts(
  userId?: string
): Promise<ScheduledPost[]> {
  const scheduledPostsRef = collection(db, "scheduledPosts");
  const now = new Date();

  let q;
  if (userId) {
    q = query(
      scheduledPostsRef,
      where("userId", "==", userId),
      where("status", "==", "pending"),
      where("scheduledAt", "<=", Timestamp.fromDate(now)),
      orderBy("scheduledAt", "asc")
    );
  } else {
    // For admin/worker: get all pending posts that should be published
    q = query(
      scheduledPostsRef,
      where("status", "==", "pending"),
      where("scheduledAt", "<=", Timestamp.fromDate(now)),
      orderBy("scheduledAt", "asc"),
      limit(50) // Process in batches
    );
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ScheduledPost[];
}

/**
 * Get a single scheduled post by ID
 */
export async function getScheduledPost(
  scheduledPostId: string
): Promise<ScheduledPost | null> {
  const postRef = doc(db, "scheduledPosts", scheduledPostId);
  const postSnap = await getDoc(postRef);

  if (postSnap.exists()) {
    return {
      id: postSnap.id,
      ...postSnap.data(),
    } as ScheduledPost;
  }
  return null;
}

/**
 * Update scheduled post status
 */
export async function updateScheduledPostStatus(
  scheduledPostId: string,
  status: ScheduleStatus,
  additionalData?: {
    publishedAt?: Date;
    publishedUrl?: string;
    failureReason?: string;
  }
): Promise<void> {
  const postRef = doc(db, "scheduledPosts", scheduledPostId);
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (additionalData?.publishedAt) {
    updateData.publishedAt = Timestamp.fromDate(additionalData.publishedAt);
  }
  if (additionalData?.publishedUrl) {
    updateData.publishedUrl = additionalData.publishedUrl;
  }
  if (additionalData?.failureReason) {
    updateData.failureReason = additionalData.failureReason;
  }

  await updateDoc(postRef, updateData);
}

/**
 * Reschedule a post to a new date/time
 */
export async function reschedulePost(
  scheduledPostId: string,
  newScheduledAt: Date
): Promise<void> {
  const postRef = doc(db, "scheduledPosts", scheduledPostId);

  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) {
    throw new Error("Post programmé non trouvé");
  }
  if (postSnap.data().status === "published") {
    throw new Error("Un post publié ne peut pas être reprogrammé.");
  }

  await updateDoc(postRef, {
    scheduledAt: Timestamp.fromDate(newScheduledAt),
    status: "pending" as ScheduleStatus,
    updatedAt: serverTimestamp(),
    failureReason: null,
    attemptCount: 0,
  });
}

/**
 * Cancel a scheduled post (only pending posts can be cancelled)
 */
export async function cancelScheduledPost(
  scheduledPostId: string
): Promise<void> {
  const postRef = doc(db, "scheduledPosts", scheduledPostId);
  const postSnap = await getDoc(postRef);
  if (postSnap.exists() && postSnap.data().status === "published") {
    throw new Error("Un post publié ne peut pas être annulé.");
  }
  await updateDoc(postRef, {
    status: "cancelled" as ScheduleStatus,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a scheduled post permanently (published posts cannot be deleted)
 */
export async function deleteScheduledPost(
  scheduledPostId: string
): Promise<void> {
  const postRef = doc(db, "scheduledPosts", scheduledPostId);
  const postSnap = await getDoc(postRef);
  if (postSnap.exists() && postSnap.data().status === "published") {
    throw new Error("Un post publié ne peut pas être supprimé.");
  }
  await deleteDoc(postRef);
}

/**
 * Increment attempt count for a scheduled post (for retry logic)
 */
export async function incrementScheduledPostAttempt(
  scheduledPostId: string
): Promise<void> {
  const postRef = doc(db, "scheduledPosts", scheduledPostId);
  const postSnap = await getDoc(postRef);

  if (postSnap.exists()) {
    const currentAttempts = postSnap.data().attemptCount || 0;
    await updateDoc(postRef, {
      attemptCount: currentAttempts + 1,
      lastAttemptAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Get count of pending scheduled posts (for badge display)
 */
export async function getPendingScheduledPostsCount(
  userId: string
): Promise<number> {
  const scheduledPostsRef = collection(db, "scheduledPosts");
  const q = query(
    scheduledPostsRef,
    where("userId", "==", userId),
    where("status", "==", "pending")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.size;
}

/**
 * Get scheduled posts for a specific date
 */
export async function getScheduledPostsForDate(
  userId: string,
  date: Date
): Promise<ScheduledPost[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const scheduledPostsRef = collection(db, "scheduledPosts");
  const q = query(
    scheduledPostsRef,
    where("userId", "==", userId),
    where("scheduledAt", ">=", Timestamp.fromDate(startOfDay)),
    where("scheduledAt", "<=", Timestamp.fromDate(endOfDay)),
    orderBy("scheduledAt", "asc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ScheduledPost[];
}

/**
 * Get upcoming scheduled posts (next 7 days)
 */
export async function getUpcomingScheduledPosts(
  userId: string,
  days: number = 7
): Promise<ScheduledPost[]> {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const scheduledPostsRef = collection(db, "scheduledPosts");
  const q = query(
    scheduledPostsRef,
    where("userId", "==", userId),
    where("status", "==", "pending"),
    where("scheduledAt", ">=", Timestamp.fromDate(now)),
    where("scheduledAt", "<=", Timestamp.fromDate(future)),
    orderBy("scheduledAt", "asc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ScheduledPost[];
}

/**
 * Update scheduled post content
 */
export async function updateScheduledPostContent(
  scheduledPostId: string,
  content: string,
  title?: string
): Promise<void> {
  const postRef = doc(db, "scheduledPosts", scheduledPostId);
  const updateData: Record<string, unknown> = {
    content,
    updatedAt: serverTimestamp(),
  };

  if (title !== undefined) {
    updateData.title = title;
  }

  await updateDoc(postRef, updateData);
}

