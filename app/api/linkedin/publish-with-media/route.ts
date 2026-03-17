import { NextRequest, NextResponse } from "next/server";
import {
  getLinkedInConnectionAdmin,
  updateLinkedInLastUsedAdmin,
  saveLinkedInPostAdmin,
  checkUserQuotaAdmin,
} from "@/lib/db/firestore-admin";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { isPlatformAllowed, PlanType, appendFreeSignature } from "@/lib/config/plans";
import { verifyAuth } from "@/lib/auth";

/**
 * LinkedIn publish with media (images)
 *
 * Flow:
 * 1. Receive FormData with text content + image files
 * 2. Validate images (MIME, size, count)
 * 3. For each image: register upload → upload binary to LinkedIn
 * 4. Create post with media URNs via ugcPosts API
 * 5. Buffers are garbage-collected — NO permanent storage
 */

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES = 9; // LinkedIn limit

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    if (!isAdminInitialized() || !adminDb) {
      return NextResponse.json(
        { error: "firebase_not_initialized", message: "Service temporairement indisponible." },
        { status: 503 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const content = formData.get("content") as string;
    const bodyUserId = formData.get("userId") as string;
    const postId = (formData.get("postId") as string) || "";
    const visibility = (formData.get("visibility") as string) || "PUBLIC";
    const imageFiles = formData.getAll("images") as File[];

    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;
    const safeVisibility = ["PUBLIC", "CONNECTIONS"].includes(visibility) ? visibility : "PUBLIC";

    if (!userId || !content) {
      return NextResponse.json(
        { error: "missing_fields", message: "Champs requis manquants : userId, content." },
        { status: 400 }
      );
    }

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: "no_images", message: "Aucune image fournie. Utilisez /api/linkedin/publish pour les posts texte." },
        { status: 400 }
      );
    }

    // ── Validate images ────────────────────────────────────────────────
    if (imageFiles.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: "too_many_images", message: `Maximum ${MAX_IMAGES} images autorisées.` },
        { status: 400 }
      );
    }

    for (const file of imageFiles) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: "invalid_image_type", message: `Format non supporté : ${file.type}. Utilisez JPG, PNG, GIF ou WebP.` },
          { status: 400 }
        );
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: "image_too_large", message: `Image trop lourde (max ${MAX_IMAGE_SIZE / 1024 / 1024} Mo).` },
          { status: 400 }
        );
      }
    }

    // ── Plan check ─────────────────────────────────────────────────────
    let userPlan: PlanType | null = null;
    try {
      const quotaCheck = await checkUserQuotaAdmin(userId, auth.email);
      userPlan = quotaCheck.plan as PlanType;
    } catch (planError) {
      console.error("Plan check error:", planError);
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "service_unavailable", message: "Service temporairement indisponible." },
          { status: 503 }
        );
      }
    }

    if (!userPlan) {
      return NextResponse.json(
        { error: "no_active_plan", message: "Abonnement requis pour publier." },
        { status: 403 }
      );
    }

    if (!isPlatformAllowed(userPlan, "linkedin")) {
      return NextResponse.json(
        { error: "platform_not_allowed", message: "LinkedIn n'est pas disponible avec votre plan actuel.", requiredPlan: "pro" },
        { status: 403 }
      );
    }

    // Free plan cannot publish with media
    if (userPlan === "free") {
      return NextResponse.json(
        { error: "feature_locked", message: "La publication avec images nécessite le plan Pro ou Max.", requiredPlan: "pro" },
        { status: 403 }
      );
    }

    // ── LinkedIn connection ────────────────────────────────────────────
    const connection = await getLinkedInConnectionAdmin(userId);

    if (!connection) {
      return NextResponse.json(
        { error: "linkedin_not_connected", message: "Aucune connexion LinkedIn trouvée." },
        { status: 401 }
      );
    }

    const now = Timestamp.now();
    if (connection.expiresAt.toMillis() <= now.toMillis()) {
      return NextResponse.json(
        { error: "token_expired", message: "Votre connexion LinkedIn a expiré. Veuillez vous reconnecter." },
        { status: 401 }
      );
    }

    const accessToken = connection.accessToken;
    const personUrn = `urn:li:person:${connection.linkedInId}`;

    // ── Upload each image to LinkedIn ──────────────────────────────────
    const mediaAssets: string[] = [];

    for (const file of imageFiles) {
      // Step 1: Register upload
      const registerRes = await fetch(
        "https://api.linkedin.com/v2/assets?action=registerUpload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
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
        console.error("LinkedIn register upload failed:", errText);
        return NextResponse.json(
          { error: "media_register_failed", message: "Échec de l'enregistrement de l'image sur LinkedIn." },
          { status: 500 }
        );
      }

      const registerData = (await registerRes.json()) as any;
      const uploadUrl =
        registerData.value.uploadMechanism[
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ].uploadUrl;
      const asset = registerData.value.asset as string;

      // Step 2: Upload binary (buffer is released after this call)
      const imageBuffer = Buffer.from(await file.arrayBuffer());

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": file.type,
        },
        body: imageBuffer,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.error("LinkedIn image upload failed:", errText);
        return NextResponse.json(
          { error: "media_upload_failed", message: "Échec de l'upload de l'image vers LinkedIn." },
          { status: 500 }
        );
      }

      mediaAssets.push(asset);
    }

    // ── Append Free plan signature ────────────────────────────────────
    const finalContent = appendFreeSignature(content, userPlan);

    // ── Create post with images ────────────────────────────────────────
    const shareBody = {
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: finalContent },
          shareMediaCategory: "IMAGE",
          media: mediaAssets.map((asset) => ({
            status: "READY",
            media: asset,
          })),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": safeVisibility,
      },
    };

    const shareRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(shareBody),
    });

    if (!shareRes.ok) {
      const errorData = await shareRes.text();
      console.error("LinkedIn publish with media failed:", errorData);

      if (shareRes.status === 401) {
        return NextResponse.json(
          { error: "unauthorized", message: "Token invalide. Veuillez vous reconnecter à LinkedIn." },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: "publish_failed", message: "Échec de la publication sur LinkedIn." },
        { status: shareRes.status }
      );
    }

    const shareData = await shareRes.json();
    const shareId = shareData.id;

    // ── Save to Firestore (non-blocking) ───────────────────────────────
    try {
      await saveLinkedInPostAdmin(userId, {
        linkedInId: shareId,
        postId,
        content,
        postUrl: `https://www.linkedin.com/feed/update/${shareId}`,
        success: true,
      });
      await updateLinkedInLastUsedAdmin(userId);
    } catch (firestoreError) {
      console.error("Failed to save LinkedIn post:", firestoreError);
    }

    return NextResponse.json({
      success: true,
      message: "Post publié sur LinkedIn avec images !",
      shareId,
      shareUrl: `https://www.linkedin.com/feed/update/${shareId}`,
    });
  } catch (error) {
    console.error("LinkedIn publish-with-media error:", error);
    return NextResponse.json(
      {
        error: "unexpected_error",
        message: error instanceof Error ? `Erreur: ${error.message}` : "Une erreur inattendue s'est produite.",
      },
      { status: 500 }
    );
  }
}
