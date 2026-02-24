import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// ============================================================
// Platform API configurations
// ============================================================

const LINKEDIN_CONFIG = {
  clientId: functions.config().linkedin?.client_id || "",
  clientSecret: functions.config().linkedin?.client_secret || "",
  tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
  apiBaseUrl: "https://api.linkedin.com/v2",
};

const FACEBOOK_API_URL = "https://graph.facebook.com/v21.0";

const THREADS_API_URL = "https://graph.threads.net/v1.0";

const MAX_ATTEMPTS = 3;

// ============================================================
// Types
// ============================================================

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface LinkedInProfile {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  email?: string;
}

interface PublishResult {
  success: boolean;
  publishedUrl?: string;
  error?: string;
}

// ============================================================
// LinkedIn helpers (existing)
// ============================================================

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<LinkedInTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: LINKEDIN_CONFIG.clientId,
    client_secret: LINKEDIN_CONFIG.clientSecret,
  });

  const response = await fetch(LINKEDIN_CONFIG.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return response.json();
}

async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get profile: ${error}`);
  }

  return response.json();
}

async function postToLinkedIn(
  accessToken: string,
  linkedInId: string,
  content: string
): Promise<{ success: boolean; id?: string; postUrl?: string; error?: string }> {
  const requestBody = {
    author: `urn:li:person:${linkedInId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: content },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const response = await fetch(`${LINKEDIN_CONFIG.apiBaseUrl}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("LinkedIn post error:", error);
    return { success: false, error: `LinkedIn API error: ${response.status}` };
  }

  const data = await response.json();
  const postId = data.id || response.headers.get("x-restli-id");
  const postUrl = postId ? `https://www.linkedin.com/feed/update/${postId}/` : undefined;

  return { success: true, id: postId || undefined, postUrl };
}

// ============================================================
// Platform publish functions for scheduled posts
// ============================================================

async function publishToLinkedIn(userId: string, content: string): Promise<PublishResult> {
  const connectionSnap = await db.collection("linkedinConnections").doc(userId).get();
  if (!connectionSnap.exists) {
    return { success: false, error: "Aucune connexion LinkedIn trouvée" };
  }

  const connection = connectionSnap.data()!;
  const now = admin.firestore.Timestamp.now();

  if (connection.expiresAt.toMillis() <= now.toMillis()) {
    return { success: false, error: "Token LinkedIn expiré. Reconnexion nécessaire." };
  }

  const result = await postToLinkedIn(connection.accessToken, connection.linkedInId, content);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Save to linkedinPosts collection
  try {
    await db.collection("linkedinPosts").add({
      userId,
      linkedInId: connection.linkedInId,
      postId: result.id || "",
      content,
      postUrl: result.postUrl,
      success: true,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("linkedinConnections").doc(userId).update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to save LinkedIn post record:", e);
  }

  return { success: true, publishedUrl: result.postUrl };
}

async function publishToFacebook(userId: string, content: string): Promise<PublishResult> {
  const connectionSnap = await db.collection("facebookConnections").doc(userId).get();
  if (!connectionSnap.exists) {
    return { success: false, error: "Aucune connexion Facebook trouvée" };
  }

  const connection = connectionSnap.data()!;
  const now = admin.firestore.Timestamp.now();

  if (connection.expiresAt.toMillis() <= now.toMillis()) {
    return { success: false, error: "Token Facebook expiré. Reconnexion nécessaire." };
  }

  const selectedPageId = connection.selectedPageId;
  const selectedPage = connection.pages?.find((p: { id: string }) => p.id === selectedPageId);

  if (!selectedPage) {
    return { success: false, error: "Aucune page Facebook sélectionnée" };
  }

  const publishResponse = await fetch(`${FACEBOOK_API_URL}/${selectedPage.id}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: content,
      access_token: selectedPage.accessToken,
    }),
  });

  if (!publishResponse.ok) {
    const errText = await publishResponse.text();
    console.error("Facebook publish failed:", errText);
    return { success: false, error: `Erreur Facebook: ${publishResponse.status}` };
  }

  const publishData = await publishResponse.json();
  const fbPostId = publishData.id;
  const postUrl = `https://www.facebook.com/${fbPostId}`;

  // Save record
  try {
    await db.collection("facebookPosts").add({
      userId,
      facebookId: connection.facebookId,
      postId: fbPostId || "",
      pageId: selectedPage.id,
      content,
      postUrl,
      success: true,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("facebookConnections").doc(userId).update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to save Facebook post record:", e);
  }

  return { success: true, publishedUrl: postUrl };
}

async function publishToThreads(userId: string, content: string): Promise<PublishResult> {
  const connectionSnap = await db.collection("threadsConnections").doc(userId).get();
  if (!connectionSnap.exists) {
    return { success: false, error: "Aucune connexion Threads trouvée" };
  }

  const connection = connectionSnap.data()!;
  const now = admin.firestore.Timestamp.now();

  if (connection.expiresAt.toMillis() <= now.toMillis()) {
    return { success: false, error: "Token Threads expiré. Reconnexion nécessaire." };
  }

  // Step 1: Create media container
  const containerResponse = await fetch(`${THREADS_API_URL}/me/threads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${connection.accessToken}`,
    },
    body: JSON.stringify({ media_type: "TEXT", text: content }),
  });

  if (!containerResponse.ok) {
    const errText = await containerResponse.text();
    console.error("Threads container creation failed:", errText);
    return { success: false, error: `Erreur Threads (container): ${containerResponse.status}` };
  }

  const containerData = await containerResponse.json();
  const creationId = containerData.id;

  // Step 2: Publish the container
  const publishResponse = await fetch(`${THREADS_API_URL}/me/threads_publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${connection.accessToken}`,
    },
    body: JSON.stringify({ creation_id: creationId }),
  });

  if (!publishResponse.ok) {
    const errText = await publishResponse.text();
    console.error("Threads publish failed:", errText);
    return { success: false, error: `Erreur Threads (publish): ${publishResponse.status}` };
  }

  const publishData = await publishResponse.json();
  const threadId = publishData.id;

  // Get permalink
  let permalink: string | undefined;
  try {
    const infoResponse = await fetch(
      `${THREADS_API_URL}/${threadId}?fields=permalink&access_token=${connection.accessToken}`
    );
    if (infoResponse.ok) {
      const infoData = await infoResponse.json();
      permalink = infoData.permalink;
    }
  } catch (e) {
    console.error("Failed to get Threads permalink:", e);
  }

  // Save record
  try {
    await db.collection("threadsPosts").add({
      userId,
      threadsId: connection.threadsId,
      threadId,
      content,
      permalink,
      success: true,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("threadsConnections").doc(userId).update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to save Threads post record:", e);
  }

  return { success: true, publishedUrl: permalink };
}

// ============================================================
// Main dispatcher: route to correct platform
// ============================================================

async function publishScheduledPost(
  platform: string,
  userId: string,
  content: string
): Promise<PublishResult> {
  switch (platform) {
    case "linkedin":
      return publishToLinkedIn(userId, content);
    case "facebook":
      return publishToFacebook(userId, content);
    case "threads":
      return publishToThreads(userId, content);
    case "reddit":
      return { success: false, error: "Reddit n'est pas encore disponible pour la publication programmée." };
    default:
      return { success: false, error: `Plateforme non supportée: ${platform}` };
  }
}

// ============================================================
// SCHEDULED CLOUD FUNCTION — runs every minute
// ============================================================

export const executeScheduledPosts = functions
  .runWith({ timeoutSeconds: 120, memory: "256MB" })
  .pubsub.schedule("every 1 minutes")
  .timeZone("Europe/Paris")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    console.log(`[Scheduler] Running at ${now.toDate().toISOString()}`);

    // Query all pending posts whose scheduledAt has passed
    // Requires composite index: status ASC + scheduledAt ASC
    let pendingSnapshot;
    try {
      pendingSnapshot = await db
        .collection("scheduledPosts")
        .where("status", "==", "pending")
        .where("scheduledAt", "<=", now)
        .limit(50)
        .get();
    } catch (queryError) {
      console.error("[Scheduler] Firestore query failed (missing index?):", queryError);
      return null;
    }

    if (pendingSnapshot.empty) {
      console.log("[Scheduler] No pending posts to publish");
      return null;
    }

    console.log(`[Scheduler] Found ${pendingSnapshot.size} scheduled post(s) to publish`);

    let publishedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    await Promise.allSettled(
      pendingSnapshot.docs.map(async (doc) => {
        const post = doc.data();
        const postRef = db.collection("scheduledPosts").doc(doc.id);
        const currentAttempts = (post.attemptCount || 0);

        console.log(`[Scheduler] Processing post ${doc.id} | platform=${post.platform} | userId=${post.userId} | attempt=${currentAttempts + 1}/${MAX_ATTEMPTS} | scheduledAt=${post.scheduledAt?.toDate?.().toISOString()}`);

        // Skip posts that exceeded max attempts
        if (currentAttempts >= MAX_ATTEMPTS) {
          await postRef.update({
            status: "failed",
            failureReason: `Échec après ${MAX_ATTEMPTS} tentatives`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`[Scheduler] Post ${doc.id} exceeded max attempts, marked as failed`);
          skippedCount++;
          return;
        }

        // Increment attempt counter
        await postRef.update({
          attemptCount: admin.firestore.FieldValue.increment(1),
          lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        try {
          const result = await publishScheduledPost(
            post.platform,
            post.userId,
            post.content
          );

          if (result.success) {
            await postRef.update({
              status: "published",
              publishedAt: admin.firestore.FieldValue.serverTimestamp(),
              publishedUrl: result.publishedUrl || null,
              failureReason: null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`[Scheduler] Post ${doc.id} published on ${post.platform} | url=${result.publishedUrl}`);
            publishedCount++;
          } else {
            const nextAttempts = currentAttempts + 1;
            if (nextAttempts >= MAX_ATTEMPTS) {
              await postRef.update({
                status: "failed",
                failureReason: result.error || "Erreur inconnue",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              console.error(`[Scheduler] Post ${doc.id} failed permanently: ${result.error}`);
              failedCount++;
            } else {
              await postRef.update({
                failureReason: result.error || "Erreur inconnue",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              console.warn(`[Scheduler] Post ${doc.id} attempt ${nextAttempts}/${MAX_ATTEMPTS} failed: ${result.error}`);
              failedCount++;
            }
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : "Erreur inattendue";
          const nextAttempts = currentAttempts + 1;
          console.error(`[Scheduler] Post ${doc.id} exception on attempt ${nextAttempts}/${MAX_ATTEMPTS}: ${errMsg}`);

          if (nextAttempts >= MAX_ATTEMPTS) {
            await postRef.update({
              status: "failed",
              failureReason: errMsg,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            await postRef.update({
              failureReason: errMsg,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          failedCount++;
        }
      })
    );

    console.log(`[Scheduler] Done: ${publishedCount} published, ${failedCount} failed, ${skippedCount} skipped`);

    return null;
  });

// ============================================================
// EXISTING FUNCTIONS — LinkedIn OAuth & manual post
// ============================================================

export const linkedinCallback = functions.https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { code, redirectUri } = req.body;

    if (!code || !redirectUri) {
      res.status(400).json({ error: "Missing code or redirectUri" });
      return;
    }

    const tokenData = await exchangeCodeForToken(code, redirectUri);
    const profile = await getLinkedInProfile(tokenData.access_token);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    res.status(200).json({
      success: true,
      accessToken: tokenData.access_token,
      expiresAt: expiresAt.toISOString(),
      linkedInId: profile.sub,
      profileName: profile.name,
      profilePicture: profile.picture,
      email: profile.email,
    });
  } catch (error) {
    console.error("LinkedIn callback error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export const linkedinPost = functions.https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { accessToken, linkedInId, content, expiresAt } = req.body;

    if (!accessToken || !linkedInId || !content) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (expiresAt && new Date(expiresAt) < new Date()) {
      res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
      return;
    }

    const result = await postToLinkedIn(accessToken, linkedInId, content);

    if (!result.success) {
      res.status(400).json({ error: result.error, success: false });
      return;
    }

    res.status(200).json({
      success: true,
      postId: result.id,
      postUrl: result.postUrl,
    });
  } catch (error) {
    console.error("LinkedIn post error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to post to LinkedIn",
    });
  }
});
