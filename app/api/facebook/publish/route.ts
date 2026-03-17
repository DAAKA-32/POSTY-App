import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import {
  getFacebookConnectionAdmin,
  updateFacebookLastUsedAdmin,
  saveFacebookPostAdmin,
  checkUserQuotaAdmin,
} from "@/lib/db/firestore-admin";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { isPlatformAllowed, PlanType, appendFreeSignature } from "@/lib/config/plans";
import { FACEBOOK_CONFIG } from "@/lib/platforms/meta";

/**
 * Route de publication sur Facebook
 *
 * Publie un post sur une Page Facebook gérée par l'utilisateur.
 * Requiert le plan Max.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Firebase auth token
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    // Vérification Firebase Admin
    if (!isAdminInitialized() || !adminDb) {
      return NextResponse.json(
        {
          error: "firebase_not_initialized",
          message: "Service temporairement indisponible. Veuillez réessayer.",
        },
        { status: 503 }
      );
    }

    // Récupération et validation des données
    const body = await request.json();
    const { userId: bodyUserId, content, postId } = body;
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId || !content) {
      return NextResponse.json(
        { error: "Missing required fields: userId, content" },
        { status: 400 }
      );
    }

    // PLAN CHECK: Verify user's plan allows Facebook publishing
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
        {
          error: "no_active_plan",
          message: "Vous devez souscrire à un abonnement pour publier.",
        },
        { status: 403 }
      );
    }

    if (!isPlatformAllowed(userPlan, "facebook")) {
      return NextResponse.json(
        {
          error: "platform_not_allowed",
          message: "Facebook n'est pas disponible avec votre plan actuel. Passez au plan Max.",
          requiredPlan: "max",
        },
        { status: 403 }
      );
    }

    // Récupération de la connexion Facebook
    const connection = await getFacebookConnectionAdmin(userId);

    if (!connection) {
      return NextResponse.json(
        {
          error: "facebook_not_connected",
          message: "Aucune connexion Facebook trouvée. Veuillez vous connecter.",
        },
        { status: 401 }
      );
    }

    // Vérification de l'expiration du token
    const now = Timestamp.now();
    if (connection.expiresAt.toMillis() <= now.toMillis()) {
      return NextResponse.json(
        {
          error: "token_expired",
          message: "Votre connexion Facebook a expiré. Veuillez vous reconnecter.",
        },
        { status: 401 }
      );
    }

    // Récupération de la page sélectionnée
    const selectedPageId = connection.selectedPageId;
    const selectedPage = connection.pages?.find((p) => p.id === selectedPageId);

    if (!selectedPage) {
      return NextResponse.json(
        {
          error: "no_page_selected",
          message: "Aucune page Facebook sélectionnée. Veuillez configurer une page dans les paramètres.",
        },
        { status: 400 }
      );
    }

    // Append Free plan signature
    const finalContent = appendFreeSignature(content, userPlan);

    // Publication sur la page Facebook via Graph API
    const publishResponse = await fetch(
      `${FACEBOOK_CONFIG.apiUrl}/${selectedPage.id}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalContent,
          access_token: selectedPage.accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const errorData = await publishResponse.text();
      console.error("Facebook publish failed:", errorData);

      if (publishResponse.status === 401) {
        return NextResponse.json(
          {
            error: "unauthorized",
            message: "Token invalide. Veuillez vous reconnecter à Facebook.",
          },
          { status: 401 }
        );
      }

      console.error("Facebook publish error details:", errorData);
      return NextResponse.json(
        {
          error: "publish_failed",
          message: "Échec de la publication sur Facebook. Veuillez réessayer.",
        },
        { status: publishResponse.status }
      );
    }

    const publishData = await publishResponse.json();
    const fbPostId = publishData.id;

    // Enregistrement dans Firestore
    try {
      await saveFacebookPostAdmin(userId, {
        facebookId: connection.facebookId,
        postId: postId || "",
        pageId: selectedPage.id,
        content,
        postUrl: `https://www.facebook.com/${fbPostId}`,
        success: true,
      });

      await updateFacebookLastUsedAdmin(userId);
    } catch (firestoreError) {
      console.error("Failed to save Facebook post to Firestore:", firestoreError);
    }

    return NextResponse.json({
      success: true,
      message: "Post publié sur Facebook avec succès !",
      postId: fbPostId,
      postUrl: `https://www.facebook.com/${fbPostId}`,
    });
  } catch (error) {
    console.error("Facebook publish error:", error);

    return NextResponse.json(
      {
        error: "unexpected_error",
        message: error instanceof Error
          ? `Erreur: ${error.message}`
          : "Une erreur inattendue s'est produite.",
      },
      { status: 500 }
    );
  }
}
