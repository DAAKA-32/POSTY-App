import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

import { syncDueLinkedInMetrics } from "./linkedin-metrics";
import { decryptToken } from "./crypto/token-cipher";
import { publishViaZernio } from "./zernio";

// ============================================================
// Platform API configurations
// ============================================================

const LINKEDIN_CONFIG = {
  clientId: functions.config().linkedin?.client_id || "",
  clientSecret: functions.config().linkedin?.client_secret || "",
  tokenUrl: functions.config().linkedin?.token_url || "https://www.linkedin.com/oauth/v2/accessToken",
  apiBaseUrl: functions.config().linkedin?.api_base_url || "https://api.linkedin.com/v2",
};

const FACEBOOK_API_URL = functions.config().facebook?.api_url || "https://graph.facebook.com/v21.0";

const THREADS_API_URL = functions.config().threads?.api_url || "https://graph.threads.net/v1.0";

const MAX_ATTEMPTS = 3;

// ============================================================
// Algorithm-friendly publishing knobs
// ============================================================

/**
 * Consistent User-Agent for every LinkedIn API call from this Cloud Function.
 * Goals:
 *  1. Stop sending the raw Node/undici default UA which screams "datacenter bot"
 *  2. Identify Posty as a registered LinkedIn integration (we have an OAuth app)
 *  3. Match a stable, app-identifying string LinkedIn can recognize across calls
 * We deliberately do NOT impersonate a browser — LinkedIn's REST API is meant
 * for server clients, and a Chrome UA on /v2/ugcPosts from a datacenter IP is
 * MORE suspicious than an honest app UA, not less.
 */
const POSTY_LINKEDIN_UA = "Posty/1.0 (+https://posty.app; scheduled-publisher)";

/** Shared headers for every authenticated LinkedIn JSON call. */
function linkedInJsonHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "User-Agent": POSTY_LINKEDIN_UA,
    Accept: "application/json",
  };
}

/** Sleep helper for intra-batch spreading. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  /** LinkedIn URN of the published post (e.g., "urn:li:share:7XXXXXXXXX"). */
  urn?: string;
  /** LinkedIn author URN of the publishing user (e.g., "urn:li:person:XXX"). */
  actorUrn?: string;
  error?: string;
}

/** Master switch for posting seed comments on LinkedIn.
 *  We always *enqueue* the comment after publish (so we can review/audit
 *  via Firestore) but we only *fire the API call* when this is true.
 *  Toggle with: firebase functions:config:set posty.seed_comment_autopost=true
 */
const SEED_COMMENT_AUTOPOST_ENABLED =
  (functions.config().posty?.seed_comment_autopost ?? "false") === "true";

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
  content: string,
  visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC",
  authorUrnOverride?: string
): Promise<{ success: boolean; id?: string; postUrl?: string; error?: string }> {
  const requestBody = {
    author: authorUrnOverride || `urn:li:person:${linkedInId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: content },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": visibility,
    },
  };

  const response = await fetch(`${LINKEDIN_CONFIG.apiBaseUrl}/ugcPosts`, {
    method: "POST",
    headers: linkedInJsonHeaders(accessToken),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("LinkedIn post error:", response.status, error);
    return { success: false, error: "La publication sur LinkedIn n'a pas pu aboutir. Veuillez réessayer." };
  }

  const data = await response.json();
  const postId = data.id || response.headers.get("x-restli-id");
  const postUrl = postId ? `https://www.linkedin.com/feed/update/${postId}/` : undefined;

  return { success: true, id: postId || undefined, postUrl };
}

// ============================================================
// LinkedIn post with images (for scheduled posts)
// ============================================================

interface ScheduledPostImage {
  storagePath: string;
  downloadURL: string;
  fileName: string;
  contentType: string;
  size: number;
}

async function postToLinkedInWithImages(
  accessToken: string,
  linkedInId: string,
  content: string,
  images: ScheduledPostImage[],
  visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC",
  authorUrnOverride?: string
): Promise<{ success: boolean; id?: string; postUrl?: string; error?: string }> {
  const personUrn = authorUrnOverride || `urn:li:person:${linkedInId}`;
  const mediaAssets: string[] = [];

  console.log(`[LinkedIn+Images] Starting upload for ${images.length} image(s), linkedInId=${linkedInId}`);

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    console.log(`[LinkedIn+Images] Processing image ${i + 1}/${images.length}: ${image.storagePath} (${image.contentType})`);

    // Step 1: Register upload with LinkedIn
    const registerRes = await fetch(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "User-Agent": POSTY_LINKEDIN_UA,
          Accept: "application/json",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: personUrn,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
              },
            ],
          },
        }),
      }
    );

    if (!registerRes.ok) {
      const errText = await registerRes.text();
      console.error(`[LinkedIn+Images] Register upload failed for image ${i + 1}:`, registerRes.status, errText);
      return { success: false, error: "Échec de l'enregistrement de l'image sur LinkedIn." };
    }

    const registerData = (await registerRes.json()) as any;
    const uploadUrl =
      registerData.value.uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ].uploadUrl;
    const asset = registerData.value.asset as string;
    console.log(`[LinkedIn+Images] Got upload URL and asset URN for image ${i + 1}: ${asset}`);

    // Step 2: Download image from Firebase Storage using Admin SDK
    // (bypasses public URL access issues — Uniform Bucket-Level Access, expired URLs, etc.)
    let imageBuffer: Buffer;
    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file(image.storagePath);

      // Verify file exists before downloading
      const [exists] = await file.exists();
      if (!exists) {
        console.error(`[LinkedIn+Images] File not found in Storage: ${image.storagePath}`);
        return { success: false, error: "Image introuvable dans le stockage." };
      }

      const [fileBuffer] = await file.download();
      imageBuffer = fileBuffer;
      console.log(`[LinkedIn+Images] Downloaded image ${i + 1} from Storage: ${imageBuffer.length} bytes`);
    } catch (downloadError) {
      console.error(`[LinkedIn+Images] Failed to download from Storage: ${image.storagePath}`, downloadError);
      return { success: false, error: "Impossible de télécharger l'image depuis le stockage." };
    }

    // Step 3: Upload binary to LinkedIn
    // Convert Buffer to Uint8Array for Node 20 fetch() compatibility
    const uploadBody = new Uint8Array(imageBuffer);
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": image.contentType,
        "Content-Length": String(imageBuffer.length),
        "User-Agent": POSTY_LINKEDIN_UA,
      },
      body: uploadBody,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error(`[LinkedIn+Images] Binary upload to LinkedIn failed for image ${i + 1}:`, uploadRes.status, errText);
      return { success: false, error: "Échec de l'upload de l'image vers LinkedIn." };
    }

    console.log(`[LinkedIn+Images] Image ${i + 1} uploaded to LinkedIn successfully`);
    mediaAssets.push(asset);
  }

  // Step 4: Create post with media
  console.log(`[LinkedIn+Images] Creating post with ${mediaAssets.length} media asset(s)`);

  const shareBody = {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: content },
        shareMediaCategory: "IMAGE",
        media: mediaAssets.map((asset) => ({
          status: "READY",
          media: asset,
        })),
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": visibility,
    },
  };

  const shareRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: linkedInJsonHeaders(accessToken),
    body: JSON.stringify(shareBody),
  });

  if (!shareRes.ok) {
    const errorData = await shareRes.text();
    console.error("[LinkedIn+Images] Publish with media failed:", shareRes.status, errorData);
    return { success: false, error: "La publication sur LinkedIn n'a pas pu aboutir. Veuillez réessayer." };
  }

  const shareData = await shareRes.json();
  const postId = shareData.id;
  const postUrl = postId ? `https://www.linkedin.com/feed/update/${postId}/` : undefined;

  console.log(`[LinkedIn+Images] Post published successfully: ${postUrl}`);
  return { success: true, id: postId || undefined, postUrl };
}

// ============================================================
// Self-warmup helper — simulates author-side session activity right after
// a scheduled publish, to compensate for the fact that the author is not
// physically on LinkedIn at the moment a scheduled post goes live.
// Both calls are GETs (read-only, idempotent, no audit trail visible to
// the author or anyone else) and are issued with the user's own token.
// ============================================================

async function runSelfWarmupPings(accessToken: string, shareId: string): Promise<void> {
  const baseHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": POSTY_LINKEDIN_UA,
    Accept: "application/json",
  } as const;

  // Tiny natural delay before the warmup — humans never refresh in the same
  // millisecond they hit "post". 1.5-4s is a realistic "see-it-published" lag.
  await sleep(1500 + Math.floor(Math.random() * 2500));

  // 1) /v2/me — cheapest authenticated GET, ubiquitous signal of an active
  //    LinkedIn session. Anyone browsing the LinkedIn web app hits this often.
  await fetch(`${LINKEDIN_CONFIG.apiBaseUrl}/me`, { headers: baseHeaders }).catch(() => {});

  // 2) GET the share itself — equivalent to the author re-opening their post.
  //    LinkedIn requires URL-encoding the URN here.
  const encoded = encodeURIComponent(shareId);
  await fetch(`${LINKEDIN_CONFIG.apiBaseUrl}/ugcPosts/${encoded}`, { headers: baseHeaders }).catch(() => {});
}

// ============================================================
// Platform publish functions for scheduled posts
// ============================================================

async function publishToLinkedIn(
  userId: string,
  content: string,
  images?: ScheduledPostImage[],
  visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC",
  organizationUrn?: string
): Promise<PublishResult> {
  const connectionSnap = await db.collection("linkedinConnections").doc(userId).get();
  if (!connectionSnap.exists) {
    return { success: false, error: "Aucune connexion LinkedIn trouvée" };
  }

  const connection = connectionSnap.data()!;
  const accessToken = decryptToken(connection.accessToken);
  const now = admin.firestore.Timestamp.now();

  if (connection.expiresAt.toMillis() <= now.toMillis()) {
    return { success: false, error: "Token LinkedIn expiré. Reconnexion nécessaire." };
  }

  // ── Resolve author (personal profile or Company Page) ─────────────────────
  // Org membership is re-validated at publish time against the live
  // connection doc — a stale `organizationUrn` stored on `scheduledPosts`
  // cannot publish to a page the user has since lost admin access to.
  const personUrn = `urn:li:person:${connection.linkedInId}`;
  let authorUrn = personUrn;
  let authorType: "person" | "organization" = "person";
  let resolvedOrgName: string | undefined;
  if (organizationUrn) {
    const matchingOrg = (connection.organizations || []).find(
      (o: { urn?: string; name?: string }) => o.urn === organizationUrn,
    );
    if (matchingOrg && typeof matchingOrg.urn === "string") {
      authorUrn = matchingOrg.urn;
      authorType = "organization";
      resolvedOrgName = matchingOrg.name;
    } else {
      console.warn(
        `[publishToLinkedIn] organizationUrn=${organizationUrn} not in connection.organizations for userId=${userId} — falling back to personal profile`,
      );
    }
  }

  // Use image upload flow if images are present
  let result;
  if (images && images.length > 0) {
    console.log(`[publishToLinkedIn] Attempting publish with ${images.length} image(s) for userId=${userId} visibility=${visibility} authorType=${authorType}`);
    result = await postToLinkedInWithImages(accessToken, connection.linkedInId, content, images, visibility, authorUrn);

    // Fallback: if image upload failed, publish text-only so the post isn't lost
    if (!result.success) {
      console.warn(`[publishToLinkedIn] Image flow failed (${result.error}), falling back to text-only for userId=${userId}`);
      result = await postToLinkedIn(accessToken, connection.linkedInId, content, visibility, authorUrn);
      if (result.success) {
        console.log(`[publishToLinkedIn] Text-only fallback succeeded for userId=${userId}`);
      }
    }
  } else {
    result = await postToLinkedIn(accessToken, connection.linkedInId, content, visibility, authorUrn);
  }

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // ── Self-warmup pings (fire-and-forget) ─────────────────────────────────
  // After a successful publish, immediately make two lightweight authenticated
  // GETs using the SAME access token: /v2/me and the share URN itself.
  // Rationale: when a user publishes directly from the app they're typically
  // active on LinkedIn at that moment (their session pings /v2/me as they
  // browse, and they often view their own post). Scheduled publishes have
  // zero such signal — the author looks "absent" to the algorithm in the
  // critical first seconds, which is widely believed to suppress reach.
  // These two calls re-create that minimal "author present" footprint with
  // negligible overhead and no risk of duplicate/visible action.
  if (result.id) {
    void runSelfWarmupPings(accessToken, result.id).catch((err) => {
      console.warn("[publishToLinkedIn] Self-warmup ping failed (non-blocking):", err);
    });
  }

  // Save to linkedinPosts collection.
  // Org posts have metrics available via the LinkedIn API; personal posts
  // do not. `syncStatus` reflects that asymmetry so the analytics worker
  // knows which rows to attempt syncing against /organizationalEntity stats.
  try {
    await db.collection("linkedinPosts").add({
      userId,
      linkedInId: result.id || "",
      postId: "",
      content,
      postUrl: result.postUrl,
      success: true,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      authorType,
      authorUrn,
      organizationUrn: authorType === "organization" ? authorUrn : null,
      organizationName: resolvedOrgName || null,
      status: "published",
      syncStatus: authorType === "organization" ? "pending" : "not_available",
      lastMetricsSyncAt: null,
    });
    await db.collection("linkedinConnections").doc(userId).update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to save LinkedIn post record:", e);
  }

  return {
    success: true,
    publishedUrl: result.postUrl,
    urn: result.id,
    // For org posts, seed comments must still be authored by the human
    // (Company Pages can't comment on their own posts via the API), so we
    // intentionally pick the personal URN here regardless of author type.
    actorUrn: `urn:li:person:${connection.linkedInId}`,
  };
}

/**
 * Post a seed comment on a LinkedIn UGC post the user just authored.
 * Uses the same `w_member_social` scope already granted for publishing.
 *
 * IMPORTANT: this function performs the real API call. It is gated upstream
 * by `SEED_COMMENT_AUTOPOST_ENABLED` so the worker can run in shadow mode
 * (logging only) until you flip the flag.
 */
async function postCommentOnLinkedIn(
  accessToken: string,
  parentUrn: string,
  actorUrn: string,
  text: string,
): Promise<PublishResult> {
  // LinkedIn's socialActions endpoint requires the parent URN to be URL-encoded.
  const encoded = encodeURIComponent(parentUrn);
  const res = await fetch(
    `${LINKEDIN_CONFIG.apiBaseUrl}/socialActions/${encoded}/comments`,
    {
      method: "POST",
      headers: linkedInJsonHeaders(accessToken),
      body: JSON.stringify({
        actor: actorUrn,
        object: parentUrn,
        message: { text },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[SeedComment] LinkedIn comment API failed:", res.status, detail);
    return {
      success: false,
      error: `LinkedIn comment API ${res.status}`,
    };
  }
  const data = await res.json().catch(() => ({}));
  return { success: true, urn: data?.$URN || data?.id };
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
      access_token: decryptToken(selectedPage.accessToken),
    }),
  });

  if (!publishResponse.ok) {
    const errText = await publishResponse.text();
    console.error("Facebook publish failed:", errText);
    return { success: false, error: "La publication sur Facebook n'a pas pu aboutir. Veuillez réessayer." };
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
  const accessToken = decryptToken(connection.accessToken);
  const now = admin.firestore.Timestamp.now();

  if (connection.expiresAt.toMillis() <= now.toMillis()) {
    return { success: false, error: "Token Threads expiré. Reconnexion nécessaire." };
  }

  // Step 1: Create media container
  const containerParams = new URLSearchParams({
    media_type: "TEXT",
    text: content,
    access_token: accessToken,
  });
  const containerResponse = await fetch(
    `${THREADS_API_URL}/me/threads?${containerParams.toString()}`,
    { method: "POST" }
  );

  if (!containerResponse.ok) {
    const errText = await containerResponse.text();
    console.error("Threads container creation failed:", errText);
    return { success: false, error: "La publication sur Threads n'a pas pu aboutir. Veuillez réessayer." };
  }

  const containerData = await containerResponse.json();
  const creationId = containerData.id;

  // Wait for container to be ready
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Step 2: Publish the container
  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });
  const publishResponse = await fetch(
    `${THREADS_API_URL}/me/threads_publish?${publishParams.toString()}`,
    { method: "POST" }
  );

  if (!publishResponse.ok) {
    const errText = await publishResponse.text();
    console.error("Threads publish failed:", errText);
    return { success: false, error: "La publication sur Threads n'a pas pu aboutir. Veuillez réessayer." };
  }

  const publishData = await publishResponse.json();
  const threadId = publishData.id;

  // Get permalink
  let permalink: string | undefined;
  try {
    const infoResponse = await fetch(
      `${THREADS_API_URL}/${threadId}?fields=permalink&access_token=${accessToken}`
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

async function publishToX(userId: string, content: string, images?: ScheduledPostImage[]): Promise<PublishResult> {
  const connectionSnap = await db.collection("xConnections").doc(userId).get();
  if (!connectionSnap.exists) {
    return { success: false, error: "Aucune connexion X trouvée" };
  }
  const connection = connectionSnap.data()!;
  const result = await publishViaZernio({
    platform: "twitter",
    accountId: connection.zernioAccountId,
    content,
    mediaItems: images?.map((img) => ({ type: "image", url: img.downloadURL })),
  });
  if (!result.success) {
    return { success: false, error: result.error };
  }
  try {
    await db.collection("xPosts").add({
      userId,
      zernioAccountId: connection.zernioAccountId,
      zernioPostId: result.postId || "",
      content,
      postUrl: result.publishedUrl || null,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      success: true,
    });
    await db.collection("xConnections").doc(userId).update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to save X post record:", e);
  }
  return { success: true, publishedUrl: result.publishedUrl };
}

async function publishToReddit(
  userId: string,
  content: string,
  subreddit?: string,
  title?: string,
): Promise<PublishResult> {
  if (!subreddit || !title) {
    return { success: false, error: "Reddit requiert un subreddit et un titre — manquants sur le post programmé." };
  }
  const connectionSnap = await db.collection("redditConnections").doc(userId).get();
  if (!connectionSnap.exists) {
    return { success: false, error: "Aucune connexion Reddit trouvée" };
  }
  const connection = connectionSnap.data()!;
  const result = await publishViaZernio({
    platform: "reddit",
    accountId: connection.zernioAccountId,
    content,
    reddit: { subreddit, title },
  });
  if (!result.success) {
    return { success: false, error: result.error };
  }
  try {
    await db.collection("redditPosts").add({
      userId,
      zernioAccountId: connection.zernioAccountId,
      zernioPostId: result.postId || "",
      subreddit: subreddit.replace(/^r\//, "").trim(),
      title,
      content,
      postUrl: result.publishedUrl || null,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      success: true,
    });
    await db.collection("redditConnections").doc(userId).update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to save Reddit post record:", e);
  }
  return { success: true, publishedUrl: result.publishedUrl };
}

async function publishToInstagram(userId: string, content: string, images?: ScheduledPostImage[]): Promise<PublishResult> {
  // Instagram has no text-only posts; reject early with a clear message.
  if (!images || images.length === 0) {
    return { success: false, error: "Instagram requiert une image — visuel manquant sur le post programmé." };
  }
  const connectionSnap = await db.collection("instagramConnections").doc(userId).get();
  if (!connectionSnap.exists) {
    return { success: false, error: "Aucune connexion Instagram trouvée" };
  }
  const connection = connectionSnap.data()!;
  const result = await publishViaZernio({
    platform: "instagram",
    accountId: connection.zernioAccountId,
    content,
    mediaItems: images.map((img) => ({ type: "image", url: img.downloadURL })),
  });
  if (!result.success) {
    return { success: false, error: result.error };
  }
  try {
    await db.collection("instagramPosts").add({
      userId,
      zernioAccountId: connection.zernioAccountId,
      zernioPostId: result.postId || "",
      content,
      postUrl: result.publishedUrl || null,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      success: true,
    });
    await db.collection("instagramConnections").doc(userId).update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to save Instagram post record:", e);
  }
  return { success: true, publishedUrl: result.publishedUrl };
}

async function publishToThreadsz(userId: string, content: string): Promise<PublishResult> {
  // Threads via Zernio (platform key "threadsz") — text-only status post.
  const connectionSnap = await db.collection("threadszConnections").doc(userId).get();
  if (!connectionSnap.exists) {
    return { success: false, error: "Aucune connexion Threads trouvée" };
  }
  const connection = connectionSnap.data()!;
  const result = await publishViaZernio({
    platform: "threads",
    accountId: connection.zernioAccountId,
    content,
  });
  if (!result.success) {
    return { success: false, error: result.error };
  }
  try {
    await db.collection("threadszPosts").add({
      userId,
      zernioAccountId: connection.zernioAccountId,
      zernioPostId: result.postId || "",
      content,
      postUrl: result.publishedUrl || null,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      success: true,
    });
    await db.collection("threadszConnections").doc(userId).update({
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to save Threads (Zernio) post record:", e);
  }
  return { success: true, publishedUrl: result.publishedUrl };
}

// ============================================================
// Main dispatcher: route to correct platform
// ============================================================

async function publishScheduledPost(
  platform: string,
  userId: string,
  content: string,
  images?: ScheduledPostImage[],
  visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC",
  organizationUrn?: string,
  redditSubreddit?: string,
  redditTitle?: string,
): Promise<PublishResult> {
  switch (platform) {
    case "linkedin":
      return publishToLinkedIn(userId, content, images, visibility, organizationUrn);
    case "facebook":
      return publishToFacebook(userId, content);
    case "threads":
      return publishToThreads(userId, content);
    case "x":
    case "twitter":
      return publishToX(userId, content, images);
    case "instagram":
      return publishToInstagram(userId, content, images);
    case "reddit":
      // Reddit needs subreddit + title — those are carried on the
      // scheduledPosts doc and passed in by the caller.
      return publishToReddit(userId, content, redditSubreddit, redditTitle);
    case "threadsz":
      // Threads via Zernio (distinct from native Meta "threads").
      return publishToThreadsz(userId, content);
    default:
      console.error(`Unsupported platform: ${platform}`);
      return { success: false, error: "Cette plateforme n'est pas encore disponible." };
  }
}

// ============================================================
// SCHEDULED CLOUD FUNCTION — runs every minute
// ============================================================

export const executeScheduledPosts = functions
  .runWith({ timeoutSeconds: 240, memory: "512MB" })
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

    // ── Intra-batch spread plan ────────────────────────────────────────────
    // When the cron fires at HH:MM:00 with N due posts, the previous code
    // hammered LinkedIn with all of them in a near-simultaneous Promise.all.
    // For LinkedIn's anti-spam pipeline that's a textbook "datacenter burst"
    // signature. We pre-assign each post a per-doc start offset in the
    // 0–45s window so they trickle out instead of arriving in lockstep,
    // and the order is shuffled so two posts from the same user never go
    // back-to-back if we can help it.
    const docs = [...pendingSnapshot.docs].sort(() => Math.random() - 0.5);
    const SPREAD_WINDOW_MS = 45_000;
    const offsets = new Map<string, number>();
    if (docs.length === 1) {
      // Single post: tiny natural delay (1-6s) so we never publish at exactly HH:MM:00.000
      offsets.set(docs[0].id, 1000 + Math.floor(Math.random() * 5000));
    } else {
      // Multiple posts: spread across the window with per-slot jitter so two
      // posts never share the same start instant.
      const slot = SPREAD_WINDOW_MS / docs.length;
      docs.forEach((d, i) => {
        const base = i * slot;
        const jitter = Math.floor((Math.random() - 0.5) * slot * 0.8);
        offsets.set(d.id, Math.max(0, Math.floor(base + jitter)));
      });
    }

    await Promise.allSettled(
      docs.map(async (doc) => {
        const post = doc.data();
        const postRef = db.collection("scheduledPosts").doc(doc.id);
        const currentAttempts = (post.attemptCount || 0);
        const offsetMs = offsets.get(doc.id) ?? 0;

        // Wait our assigned slice of the window before doing anything user-
        // visible on LinkedIn (we still log immediately so logs reflect order).
        if (offsetMs > 0) {
          console.log(`[Scheduler] Post ${doc.id} waiting ${offsetMs}ms before publish (spread)`);
          await sleep(offsetMs);
        }

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
          // Parse images array if present
          const rawImages = post.images;
          const postImages: ScheduledPostImage[] | undefined =
            rawImages && Array.isArray(rawImages) && rawImages.length > 0
              ? rawImages
              : undefined;

          // Read user-chosen visibility — defaults to PUBLIC for legacy docs
          // and for non-LinkedIn platforms (where the field is ignored).
          const docVisibility: "PUBLIC" | "CONNECTIONS" =
            post.visibility === "CONNECTIONS" ? "CONNECTIONS" : "PUBLIC";

          // Optional org target. Re-validated in `publishToLinkedIn` against
          // the live connection doc so a stale value cannot publish to a page
          // the user has since lost admin access to.
          const docOrgUrn: string | undefined =
            typeof post.organizationUrn === "string" && post.organizationUrn.startsWith("urn:li:organization:")
              ? post.organizationUrn
              : undefined;

          // Debug: log image detection
          console.log(`[Scheduler] Post ${doc.id} image detection: raw=${typeof rawImages} isArray=${Array.isArray(rawImages)} length=${Array.isArray(rawImages) ? rawImages.length : 'N/A'} hasImages=${!!postImages} visibility=${docVisibility} orgUrn=${docOrgUrn || "(personal)"}`);
          if (postImages) {
            console.log(`[Scheduler] Post ${doc.id} images:`, JSON.stringify(postImages.map(img => ({
              storagePath: img.storagePath,
              contentType: img.contentType,
              hasDownloadURL: !!img.downloadURL,
            }))));
          }

          const result = await publishScheduledPost(
            post.platform,
            post.userId,
            post.content,
            postImages,
            docVisibility,
            docOrgUrn,
            // Reddit-only fields — read from the scheduled doc when present.
            (post as { redditSubreddit?: string }).redditSubreddit,
            (post as { redditTitle?: string }).redditTitle,
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

            // Enqueue the seed comment (algo boost) if the user opted in and
            // we got back a LinkedIn URN. The actual API call happens later
            // in `executePendingSeedComments` once `fireAt <= now` AND the
            // autopost flag is on. We always enqueue (auditable in Firestore)
            // but the worker is the one that decides whether to fire.
            const seed = post.seedComment;
            if (
              post.platform === "linkedin" &&
              seed?.enabled &&
              typeof seed?.text === "string" &&
              seed.text.trim().length >= 10 &&
              result.urn &&
              result.actorUrn
            ) {
              try {
                // Base delay defaults to 5min (was 3min) so the comment lands
                // AFTER the post has accumulated initial impressions — landing
                // a self-reply at +30s reads as "scripted" to LinkedIn's NLP.
                // Range clamp 1-15min still respected.
                const baseDelayMin = Math.max(1, Math.min(15, Number(seed.delayMinutes) || 5));
                // Wider organic jitter (was 0-3 → now 0-4 min) so two posts
                // with the same configured delay don't fire at near-identical
                // offsets and create a detectable seed-comment cadence.
                const jitterMin = Math.random() * 4;
                const fireAtMs = Date.now() + (baseDelayMin + jitterMin) * 60_000;
                await db.collection("pendingSeedComments").add({
                  userId: post.userId,
                  parentScheduledPostId: doc.id,
                  parentPostUrn: result.urn,
                  parentPostUrl: result.publishedUrl || null,
                  actorUrn: result.actorUrn,
                  text: seed.text.trim(),
                  fireAt: admin.firestore.Timestamp.fromMillis(fireAtMs),
                  status: "pending",
                  attemptCount: 0,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(
                  `[Scheduler] Enqueued seed comment for post ${doc.id} | fireAt=${new Date(fireAtMs).toISOString()} | autopost=${SEED_COMMENT_AUTOPOST_ENABLED}`,
                );
                // EXPLICIT warning when we enqueue but the autopost flag is
                // off — this is the silent "scheduled posts have no algo
                // boost" failure mode we want to make impossible to miss.
                if (!SEED_COMMENT_AUTOPOST_ENABLED) {
                  console.warn(
                    `[Scheduler] ⚠️ Seed comment enqueued but SEED_COMMENT_AUTOPOST_ENABLED=false — algo-boost will NOT fire. Set with: firebase functions:config:set posty.seed_comment_autopost=true && firebase deploy --only functions`,
                  );
                }
              } catch (enqueueErr) {
                console.warn(
                  `[Scheduler] Failed to enqueue seed comment for ${doc.id}:`,
                  enqueueErr instanceof Error ? enqueueErr.message : enqueueErr,
                );
              }
            }

            // Clean up images from Firebase Storage after successful publish
            if (postImages && postImages.length > 0) {
              try {
                const bucket = admin.storage().bucket();
                await Promise.all(
                  postImages.map((img) =>
                    bucket.file(img.storagePath).delete().catch((e: Error) => {
                      console.warn(`[Scheduler] Failed to delete ${img.storagePath}:`, e.message);
                    })
                  )
                );
                console.log(`[Scheduler] Cleaned up ${postImages.length} image(s) from Storage`);
              } catch (cleanupError) {
                console.warn("[Scheduler] Image cleanup failed (non-blocking):", cleanupError);
              }
            }

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

          const userFriendlyMsg = "Une erreur est survenue lors de la publication. Veuillez réessayer.";
          if (nextAttempts >= MAX_ATTEMPTS) {
            await postRef.update({
              status: "failed",
              failureReason: userFriendlyMsg,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            await postRef.update({
              failureReason: userFriendlyMsg,
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
// SEED COMMENT WORKER — fires queued first-comments on LinkedIn
// Runs every minute. Each pending doc has a `fireAt` timestamp; we pick
// docs where fireAt has passed and either fire the comment (autopost ON)
// or mark them `skipped_flag_off` (autopost OFF). The flag is read at
// COLD START so flipping it requires a function redeploy or a config
// reload — this is intentional: it forces an explicit ramp-up moment.
// ============================================================

export const executePendingSeedComments = functions
  .runWith({ timeoutSeconds: 180, memory: "256MB" })
  .pubsub.schedule("every 1 minutes")
  .timeZone("Europe/Paris")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    console.log(
      `[SeedComment] Tick ${now.toDate().toISOString()} | autopost=${SEED_COMMENT_AUTOPOST_ENABLED}`,
    );

    let due;
    try {
      due = await db
        .collection("pendingSeedComments")
        .where("status", "==", "pending")
        .where("fireAt", "<=", now)
        .limit(25)
        .get();
    } catch (err) {
      console.error(
        "[SeedComment] Firestore query failed (composite index pendingSeedComments(status,fireAt) missing?):",
        err,
      );
      return null;
    }

    if (due.empty) {
      return null;
    }

    console.log(`[SeedComment] ${due.size} due`);

    const SEED_MAX_ATTEMPTS = 3;
    let posted = 0;
    let skipped = 0;
    let failed = 0;

    await Promise.allSettled(
      due.docs.map(async (doc) => {
        const item = doc.data();
        const ref = doc.ref;
        const attempt = (item.attemptCount || 0) + 1;

        // Always increment attempt counter to avoid hot-loop on a poisoned doc.
        await ref.update({
          attemptCount: admin.firestore.FieldValue.increment(1),
        });

        // ── DRY-RUN MODE — flag off: don't call LinkedIn, mark skipped. ──
        if (!SEED_COMMENT_AUTOPOST_ENABLED) {
          await ref.update({
            status: "skipped_flag_off",
            failureReason: "Auto-post disabled (SEED_COMMENT_AUTOPOST_ENABLED=false)",
          });
          skipped++;
          console.log(
            `[SeedComment] DRY-RUN ${doc.id} | parent=${item.parentPostUrn} | text="${(item.text || "").slice(0, 80)}…"`,
          );
          return;
        }

        // ── Real path — fetch the user's LinkedIn token and fire ──
        try {
          const connSnap = await db
            .collection("linkedinConnections")
            .doc(item.userId)
            .get();
          if (!connSnap.exists) {
            await ref.update({
              status: "failed",
              failureReason: "LinkedIn connection missing",
            });
            failed++;
            return;
          }
          const conn = connSnap.data()!;
          if (
            conn.expiresAt &&
            typeof conn.expiresAt.toMillis === "function" &&
            conn.expiresAt.toMillis() <= Date.now()
          ) {
            await ref.update({
              status: "failed",
              failureReason: "LinkedIn token expired",
            });
            failed++;
            return;
          }

          // (Optional safety) verify the parent post still exists. We skip
          // for now to save an API call; LinkedIn returns a clean error if
          // the parent was deleted, which we surface as failureReason.

          const result = await postCommentOnLinkedIn(
            decryptToken(conn.accessToken),
            item.parentPostUrn,
            item.actorUrn,
            item.text,
          );

          if (result.success) {
            await ref.update({
              status: "posted",
              postedAt: admin.firestore.FieldValue.serverTimestamp(),
              failureReason: null,
            });
            posted++;
            console.log(`[SeedComment] Posted ${doc.id} | parent=${item.parentPostUrn}`);
          } else {
            const finalize = attempt >= SEED_MAX_ATTEMPTS;
            await ref.update({
              status: finalize ? "failed" : "pending",
              failureReason: result.error || "Unknown failure",
              // re-arm fireAt with backoff if not finalized (5 min)
              ...(finalize
                ? {}
                : {
                    fireAt: admin.firestore.Timestamp.fromMillis(
                      Date.now() + 5 * 60_000,
                    ),
                  }),
            });
            failed++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          const finalize = attempt >= SEED_MAX_ATTEMPTS;
          await ref.update({
            status: finalize ? "failed" : "pending",
            failureReason: msg,
            ...(finalize
              ? {}
              : {
                  fireAt: admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 60_000),
                }),
          });
          failed++;
          console.error(`[SeedComment] Exception on ${doc.id}:`, msg);
        }
      }),
    );

    console.log(
      `[SeedComment] Done | posted=${posted} skipped=${skipped} failed=${failed}`,
    );
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

// ============================================================
// SCHEDULED CLOUD FUNCTION — LinkedIn metrics sync
// Runs every 3 hours. For each organization-published post:
//   - refreshes likes/comments/shares/impressions/engagement from LinkedIn API
//   - detects posts the user deleted on LinkedIn (→ status='deleted')
// Personal-profile posts are skipped: LinkedIn does not expose any metrics
// endpoint for them, MDP-approved app or not.
// ============================================================

export const syncLinkedInMetrics = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("every 3 hours")
  .timeZone("Europe/Paris")
  .onRun(async () => {
    const startedAt = Date.now();
    console.log("[metrics-sync] Starting LinkedIn metrics sync");
    try {
      const result = await syncDueLinkedInMetrics(db, 200);
      console.log(
        `[metrics-sync] Done in ${Date.now() - startedAt}ms: scanned=${result.scanned} synced=${result.synced} failed=${result.failed} deleted=${result.deleted} skipped=${result.skipped}`
      );
    } catch (error) {
      console.error("[metrics-sync] Fatal error:", error);
    }
    return null;
  });

// ============================================================
// AUTONOMOUS STRATEGIST — Phase 4
// ------------------------------------------------------------
// Runs daily at 08:00 Europe/Paris. For each user who has
// `autonomousMode.enabled === true` AND `autonomousMode.dayOfWeek` matching
// today, fires one HTTP POST to /api/strategist/auto-batch which:
//   - generates a fresh draft batch via the shared `generateBatchPlan` core
//   - sets `pendingAutoBatchId` on the user doc (UI banner picks it up)
//   - bumps `autonomousMode.lastTriggeredAt` (dedup guard inside the endpoint)
//
// Why HTTP from the cron instead of importing the lib directly?
//   The lib lives under Next.js (path aliases `@/lib/...`, depends on
//   `lib/db/firebase-admin`). Pulling it into the Functions bundle would
//   require building two TS configs in lock-step. One HTTP hop is the
//   cheap, boring solution — and the endpoint is already isolated behind
//   a CRON_SECRET so it's safe to expose.
//
// Required config:
//   firebase functions:config:set posty.app_url="https://<your-app>"
//   firebase functions:config:set posty.cron_secret="<long random string>"
// ============================================================

const APP_URL: string = functions.config().posty?.app_url || "";
const CRON_SECRET: string = functions.config().posty?.cron_secret || "";

export const weeklyAutonomousStrategist = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 8 * * *") // every day at 08:00
  .timeZone("Europe/Paris")
  .onRun(async () => {
    if (!APP_URL || !CRON_SECRET) {
      console.error(
        "[autonomous-strategist] Skipping run — posty.app_url and posty.cron_secret must be configured"
      );
      return null;
    }

    // dayOfWeek matches JavaScript Date semantics (0=Sun..6=Sat). We use the
    // function's executing date in Europe/Paris (set by .timeZone above), so
    // a Sunday-EU run won't misfire as Monday for Pacific-time servers.
    const todayDow = new Date().getDay();
    const startedAt = Date.now();

    let snap;
    try {
      snap = await db
        .collection("users")
        .where("autonomousMode.enabled", "==", true)
        .where("autonomousMode.dayOfWeek", "==", todayDow)
        .limit(500) // generous cap; we don't have >500 max users yet
        .get();
    } catch (err) {
      console.error("[autonomous-strategist] Firestore query failed (missing index?):", err);
      return null;
    }

    if (snap.empty) {
      console.log(`[autonomous-strategist] No opted-in users for dayOfWeek=${todayDow}`);
      return null;
    }

    console.log(`[autonomous-strategist] Found ${snap.size} user(s) to trigger`);

    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const userDoc of snap.docs) {
      const uid = userDoc.id;
      // Inline plan check — saves a wasted HTTP hop for downgraded users.
      const plan = userDoc.get("subscription.plan");
      if (plan !== "max") {
        skipped++;
        continue;
      }
      try {
        const res = await fetch(`${APP_URL}/api/strategist/auto-batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cron-secret": CRON_SECRET,
          },
          body: JSON.stringify({ userId: uid }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.warn(`[autonomous-strategist] user=${uid} → HTTP ${res.status}: ${text.slice(0, 200)}`);
          failed++;
        } else {
          success++;
        }
      } catch (err) {
        console.error(`[autonomous-strategist] user=${uid} fetch failed:`, err);
        failed++;
      }
      // Tiny spread (250ms) between calls so we don't fan-out 500 OpenAI
      // requests in the same second. The endpoint itself is idempotent.
      await new Promise((r) => setTimeout(r, 250));
    }

    console.log(
      `[autonomous-strategist] Done in ${Date.now() - startedAt}ms: success=${success} skipped=${skipped} failed=${failed}`
    );
    return null;
  });
