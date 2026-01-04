/**
 * Server-side Firestore operations using Firebase Admin SDK
 * These functions bypass security rules and should only be used in API routes
 */

import { adminDb } from "./firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// LinkedIn Connection Data type (matching the client-side type)
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

/**
 * Get LinkedIn connection for a user (server-side)
 */
export async function getLinkedInConnectionAdmin(
  userId: string
): Promise<LinkedInConnectionData | null> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("linkedinConnections").doc(userId);
  const connectionSnap = await connectionRef.get();

  if (connectionSnap.exists) {
    return connectionSnap.data() as LinkedInConnectionData;
  }
  return null;
}

/**
 * Update LinkedIn last used timestamp (server-side)
 */
export async function updateLinkedInLastUsedAdmin(userId: string): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("linkedinConnections").doc(userId);
  await connectionRef.update({
    lastUsedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Save LinkedIn post record (server-side)
 */
export async function saveLinkedInPostAdmin(
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
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const postsRef = adminDb.collection("linkedinPosts");
  const docRef = await postsRef.add({
    userId,
    linkedInId: data.linkedInId,
    postId: data.postId,
    content: data.content,
    postUrl: data.postUrl || null,
    success: data.success,
    error: data.error || null,
    publishedAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Save LinkedIn connection (server-side)
 * Used by the OAuth callback route
 */
export async function saveLinkedInConnectionAdmin(
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
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("linkedinConnections").doc(userId);
  await connectionRef.set({
    userId,
    linkedInId: data.linkedInId,
    accessToken: data.accessToken,
    expiresAt: Timestamp.fromDate(data.expiresAt),
    profileName: data.profileName,
    profilePicture: data.profilePicture || null,
    email: data.email || null,
    connectedAt: FieldValue.serverTimestamp(),
    lastUsedAt: null,
  });
}

// ============== TWITTER ADMIN FUNCTIONS ==============

// Twitter Connection Data type
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

/**
 * Get Twitter connection for a user (server-side)
 */
export async function getTwitterConnectionAdmin(
  userId: string
): Promise<TwitterConnectionData | null> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("twitterConnections").doc(userId);
  const connectionSnap = await connectionRef.get();

  if (connectionSnap.exists) {
    return connectionSnap.data() as TwitterConnectionData;
  }
  return null;
}

/**
 * Save Twitter connection (server-side)
 * Used by the OAuth callback route
 */
export async function saveTwitterConnectionAdmin(
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
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("twitterConnections").doc(userId);
  await connectionRef.set({
    userId,
    twitterId: data.twitterId,
    username: data.username,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || null,
    expiresAt: Timestamp.fromDate(data.expiresAt),
    profileName: data.profileName,
    profilePicture: data.profilePicture || null,
    connectedAt: FieldValue.serverTimestamp(),
    lastUsedAt: null,
  });
}

/**
 * Update Twitter tokens after refresh (server-side)
 */
export async function updateTwitterTokensAdmin(
  userId: string,
  accessToken: string,
  refreshToken: string | undefined,
  expiresAt: Date
): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("twitterConnections").doc(userId);
  await connectionRef.update({
    accessToken,
    refreshToken: refreshToken || null,
    expiresAt: Timestamp.fromDate(expiresAt),
  });
}

/**
 * Update Twitter last used timestamp (server-side)
 */
export async function updateTwitterLastUsedAdmin(userId: string): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("twitterConnections").doc(userId);
  await connectionRef.update({
    lastUsedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Save Twitter post record (server-side)
 */
export async function saveTwitterPostAdmin(
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
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const postsRef = adminDb.collection("twitterPosts");
  const docRef = await postsRef.add({
    userId,
    twitterId: data.twitterId,
    tweetId: data.tweetId,
    content: data.content,
    tweetUrl: data.tweetUrl || null,
    success: data.success,
    error: data.error || null,
    publishedAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

// ============== MEDIUM ADMIN FUNCTIONS ==============

// Medium Connection Data type
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

export type MediumPublishStatus = "draft" | "public" | "unlisted";

/**
 * Get Medium connection for a user (server-side)
 */
export async function getMediumConnectionAdmin(
  userId: string
): Promise<MediumConnectionData | null> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("mediumConnections").doc(userId);
  const connectionSnap = await connectionRef.get();

  if (connectionSnap.exists) {
    return connectionSnap.data() as MediumConnectionData;
  }
  return null;
}

/**
 * Update Medium last used timestamp (server-side)
 */
export async function updateMediumLastUsedAdmin(userId: string): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("mediumConnections").doc(userId);
  await connectionRef.update({
    lastUsedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Save Medium post record (server-side)
 */
export async function saveMediumPostAdmin(
  userId: string,
  data: {
    mediumId: string;
    articleId: string;
    title: string;
    content: string;
    articleUrl?: string;
    publishStatus: MediumPublishStatus;
    success: boolean;
    error?: string;
  }
): Promise<string> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const postsRef = adminDb.collection("mediumPosts");
  const docRef = await postsRef.add({
    userId,
    mediumId: data.mediumId,
    articleId: data.articleId,
    title: data.title,
    content: data.content,
    articleUrl: data.articleUrl || null,
    publishStatus: data.publishStatus,
    success: data.success,
    error: data.error || null,
    publishedAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}
