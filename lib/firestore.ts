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
} from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile, Post, Session, ChatMessage } from "@/types";

// ============== USER OPERATIONS ==============
// Collection: users
// Fields: uid, email, name, sector, role, linkedinStyle, createdAt

export async function createUserProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<void> {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, {
    uid: userId,
    email: data.email || "",
    name: data.displayName || "",
    sector: "",
    role: "",
    linkedinStyle: "",
    onboardingComplete: false,
    createdAt: serverTimestamp(),
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
    updateData.sector = data.profile.sector;
    updateData.role = data.profile.role;
    updateData.linkedinStyle = data.profile.linkedinStyle;
    updateData.objective = data.profile.objective;
    updateData.profile = data.profile;
  }

  await updateDoc(userRef, updateData);
}

export async function completeOnboarding(
  userId: string,
  profileData: UserProfile["profile"]
): Promise<void> {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    sector: profileData?.sector || "",
    role: profileData?.role || "",
    linkedinStyle: profileData?.linkedinStyle || "",
    objective: profileData?.objective || "",
    profile: profileData,
    onboardingComplete: true,
  });
}

// ============== POST OPERATIONS ==============
// Collection: posts
// Fields: userId, contentA, contentB, chosenVersion, createdAt

export async function savePost(
  userId: string,
  prompt: string,
  contentA: string,
  contentB: string
): Promise<string> {
  const postsRef = collection(db, "posts");
  const docRef = await addDoc(postsRef, {
    userId,
    prompt,
    contentA,
    contentB,
    chosenVersion: null,
    createdAt: serverTimestamp(),
  });
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
    } as Post;
  }
  return null;
}

export async function deletePost(postId: string): Promise<void> {
  const postRef = doc(db, "posts", postId);
  await deleteDoc(postRef);
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
  // Delete user profile
  const userRef = doc(db, "users", userId);
  await deleteDoc(userRef);

  // Delete consent record
  const consentRef = doc(db, "consents", userId);
  await deleteDoc(consentRef);

  // Delete all user posts
  const postsRef = collection(db, "posts");
  const postsQuery = query(postsRef, where("userId", "==", userId));
  const postsSnapshot = await getDocs(postsQuery);
  const deletePostPromises = postsSnapshot.docs.map((docSnap) =>
    deleteDoc(doc(db, "posts", docSnap.id))
  );
  await Promise.all(deletePostPromises);

  // Delete all user sessions
  const sessionsRef = collection(db, "sessions");
  const sessionsQuery = query(sessionsRef, where("userId", "==", userId));
  const sessionsSnapshot = await getDocs(sessionsQuery);
  const deleteSessionPromises = sessionsSnapshot.docs.map((docSnap) =>
    deleteDoc(doc(db, "sessions", docSnap.id))
  );
  await Promise.all(deleteSessionPromises);
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
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as LinkedInPostData[];
}
