import { NextRequest, NextResponse } from "next/server";
import {
  getLinkedInConnectionAdmin,
  updateLinkedInLastUsedAdmin,
  saveLinkedInPostAdmin,
  checkUserQuotaAdmin,
} from "@/lib/firestore-admin";
import { adminDb, isAdminInitialized } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { isPlatformAllowed, PlanType, appendFreeSignature } from "@/lib/plans";
import { verifyAuth } from "@/lib/auth";

/**
 * LinkedIn publish with video
 *
 * Flow:
 * 1. Receive FormData with text content + video file
 * 2. Validate video (MIME, size)
 * 3. Register upload with feedshare-video recipe → upload binary to LinkedIn
 * 4. Create ugcPost with shareMediaCategory: "VIDEO"
 * 5. Buffer is garbage-collected — NO permanent storage
 */

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime", // .mov
  "video/webm",
]);
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB

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
    const videoFile = formData.get("video") as File | null;

    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;
    const safeVisibility = ["PUBLIC", "CONNECTIONS"].includes(visibility) ? visibility : "PUBLIC";

    if (!userId || !content) {
      return NextResponse.json(
        { error: "missing_fields", message: "Champs requis manquants : userId, content." },
        { status: 400 }
      );
    }

    if (!videoFile) {
      return NextResponse.json(
        { error: "no_video", message: "Aucune vidéo fournie." },
        { status: 400 }
      );
    }

    // ── Validate video ──────────────────────────────────────────────────
    if (!ALLOWED_VIDEO_TYPES.has(videoFile.type)) {
      return NextResponse.json(
        { error: "invalid_video_type", message: `Format non supporté : ${videoFile.type}. Utilisez MP4, MOV ou WebM.` },
        { status: 400 }
      );
    }

    if (videoFile.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: "video_too_large", message: `Vidéo trop lourde (max ${MAX_VIDEO_SIZE / 1024 / 1024} Mo).` },
        { status: 400 }
      );
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

    // Free plan cannot publish with video
    if (userPlan === "free") {
      return NextResponse.json(
        { error: "feature_locked", message: "La publication avec vidéo nécessite le plan Pro ou Max.", requiredPlan: "pro" },
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

    // ── Register video upload ──────────────────────────────────────────
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
            recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
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
      console.error("LinkedIn register video upload failed:", errText);
      return NextResponse.json(
        { error: "media_register_failed", message: "Échec de l'enregistrement de la vidéo sur LinkedIn." },
        { status: 500 }
      );
    }

    const registerData = (await registerRes.json()) as any;
    const uploadUrl =
      registerData.value.uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ].uploadUrl;
    const asset = registerData.value.asset as string;

    // ── Upload video binary (buffer released after this call) ──────────
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": videoFile.type,
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("LinkedIn video upload failed:", errText);
      return NextResponse.json(
        { error: "media_upload_failed", message: "Échec de l'upload de la vidéo vers LinkedIn." },
        { status: 500 }
      );
    }

    // ── Append Free plan signature ────────────────────────────────────
    const finalContent = appendFreeSignature(content, userPlan);

    // ── Create post with video ─────────────────────────────────────────
    const shareBody = {
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: finalContent },
          shareMediaCategory: "VIDEO",
          media: [
            {
              status: "READY",
              media: asset,
            },
          ],
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
      console.error("LinkedIn publish with video failed:", errorData);

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
      message: "Post publié sur LinkedIn avec vidéo !",
      shareId,
      shareUrl: `https://www.linkedin.com/feed/update/${shareId}`,
    });
  } catch (error) {
    console.error("LinkedIn publish-with-video error:", error);
    return NextResponse.json(
      {
        error: "unexpected_error",
        message: error instanceof Error ? `Erreur: ${error.message}` : "Une erreur inattendue s'est produite.",
      },
      { status: 500 }
    );
  }
}
