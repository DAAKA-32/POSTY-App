import { NextRequest, NextResponse } from "next/server";
import {
  getLinkedInConnectionAdmin,
  updateLinkedInLastUsedAdmin,
  saveLinkedInPostAdmin,
  checkUserQuotaAdmin,
  checkWeeklyPublishQuotaAdmin,
  incrementWeeklyPublishCountAdmin,
} from "@/lib/db/firestore-admin";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { isPlatformAllowed, PlanType, appendFreeSignature } from "@/lib/config/plans";
import { verifyAuth } from "@/lib/auth";

/**
 * Route de publication sur LinkedIn
 *
 * Cette route permet de publier un post validé par l'utilisateur sur son profil LinkedIn.
 *
 * Flow:
 * 1. Vérification de l'authentification utilisateur
 * 2. Récupération de la connexion LinkedIn depuis Firestore
 * 3. Vérification de la validité du token
 * 4. Publication du post via l'API LinkedIn Share
 * 5. Enregistrement de la publication dans l'historique
 *
 * Sécurité: Le token LinkedIn n'est JAMAIS exposé au client.
 * Utilise Firebase Admin SDK pour bypasser les règles de sécurité côté serveur.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    // 🔍 Vérification de l'initialisation Firebase Admin
    if (!isAdminInitialized() || !adminDb) {
      console.error("Firebase Admin not initialized");
      return NextResponse.json(
        {
          error: "firebase_not_initialized",
          message: "Service temporairement indisponible. Veuillez réessayer.",
        },
        { status: 503 }
      );
    }

    // 🔐 ÉTAPE 1: Récupération et validation des données
    const body = await request.json();
    const {
      userId: bodyUserId,
      content,
      postId,
      platforms,
      visibility = "PUBLIC",
      // Optional: publish as a Company Page the user administers.
      // If omitted, falls back to personal-profile publishing (no API metrics).
      organizationUrn,
    } = body;

    // Use authenticated uid, fall back to body userId only in dev bypass mode
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    // Validate visibility value
    const validVisibilities = ["PUBLIC", "CONNECTIONS"];
    const safeVisibility = validVisibilities.includes(visibility) ? visibility : "PUBLIC";

    if (!userId || !content) {
      return NextResponse.json(
        { error: "Missing required fields: userId, content" },
        { status: 400 }
      );
    }

    // 🛡️ Validation: au moins une plateforme doit être sélectionnée
    if (platforms && Array.isArray(platforms) && platforms.length === 0) {
      return NextResponse.json(
        {
          error: "no_platform_selected",
          message: "Aucune plateforme sélectionnée. Veuillez sélectionner au moins un réseau pour publier.",
        },
        { status: 400 }
      );
    }

    // 🛡️ Validation: LinkedIn doit être dans les plateformes sélectionnées pour cette route
    if (platforms && Array.isArray(platforms) && !platforms.includes("linkedin")) {
      return NextResponse.json(
        {
          error: "linkedin_not_selected",
          message: "Cette route est réservée à la publication LinkedIn.",
        },
        { status: 400 }
      );
    }

    // PLAN CHECK: Verify user's plan allows LinkedIn publishing
    let userPlan: PlanType | null = null;
    try {
      const quotaCheck = await checkUserQuotaAdmin(userId, auth.email);
      userPlan = quotaCheck.plan as PlanType;
    } catch (planError) {
      console.error("Plan check error:", planError);
      // In production, fail if plan cannot be verified
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          {
            error: "service_unavailable",
            message: "Service temporairement indisponible. Veuillez réessayer.",
          },
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

    if (!isPlatformAllowed(userPlan, "linkedin")) {
      return NextResponse.json(
        {
          error: "platform_not_allowed",
          message: "LinkedIn n'est pas disponible avec votre plan actuel.",
          requiredPlan: "pro",
        },
        { status: 403 }
      );
    }

    // 🛡️ WEEKLY PUBLISH QUOTA CHECK (Free plan: 3/week)
    try {
      const weeklyQuota = await checkWeeklyPublishQuotaAdmin(userId, auth.email);
      if (!weeklyQuota.canPublish) {
        return NextResponse.json(
          {
            error: "weekly_publish_limit_reached",
            message: weeklyQuota.reason || "Limite hebdomadaire de publications atteinte.",
            weeklyPublishUsed: weeklyQuota.weeklyPublishUsed,
            weeklyPublishLimit: weeklyQuota.weeklyPublishLimit,
            requiredPlan: "pro",
          },
          { status: 429 }
        );
      }
    } catch (quotaError) {
      console.error("Weekly publish quota check error:", quotaError);
      // In production, fail-closed if we can't verify the quota
      if (process.env.NODE_ENV === "production" && userPlan === "free") {
        return NextResponse.json(
          {
            error: "service_unavailable",
            message: "Service temporairement indisponible. Veuillez réessayer.",
          },
          { status: 503 }
        );
      }
    }

    // 🔍 ÉTAPE 2: Récupération de la connexion LinkedIn
    const connection = await getLinkedInConnectionAdmin(userId);

    if (!connection) {
      return NextResponse.json(
        {
          error: "linkedin_not_connected",
          message: "Aucune connexion LinkedIn trouvée. Veuillez vous connecter.",
        },
        { status: 401 }
      );
    }

    // ⏰ ÉTAPE 3: Vérification de l'expiration du token
    // The client maps `error: "token_expired"` to a friendly i18n message
    // via `lib/utils/linkedin-errors.ts`. The `message` here is a neutral
    // EN fallback for non-i18n consumers (logs, server-side scripts).
    const now = Timestamp.now();
    if (connection.expiresAt.toMillis() <= now.toMillis()) {
      return NextResponse.json(
        {
          error: "token_expired",
          message: "LinkedIn session expired. Reconnect to continue.",
        },
        { status: 401 }
      );
    }

    // 🏷️ ÉTAPE 4a: Append Free plan signature (Lead Growth Operator)
    const finalContent = appendFreeSignature(content, userPlan);

    // 🏢 ÉTAPE 4a-bis: Resolve author URN (personal profile OR Company Page).
    // If the client requested an organization, verify the user actually
    // administers it (stored on the connection at OAuth time).
    let authorUrn = `urn:li:person:${connection.linkedInId}`;
    let authorType: "person" | "organization" = "person";
    let resolvedOrgName: string | undefined;

    if (organizationUrn && typeof organizationUrn === "string") {
      const matchingOrg = (connection.organizations || []).find(
        (o) => o.urn === organizationUrn
      );
      if (!matchingOrg) {
        return NextResponse.json(
          {
            error: "organization_not_authorized",
            message:
              "Vous n'êtes pas administrateur de cette page LinkedIn. Reconnectez votre compte pour rafraîchir la liste.",
          },
          { status: 403 }
        );
      }
      authorUrn = matchingOrg.urn;
      authorType = "organization";
      resolvedOrgName = matchingOrg.name;
    }

    // 📝 ÉTAPE 4: Publication sur LinkedIn via Share API
    // Documentation: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
    // Visibility options: PUBLIC (visible by everyone) or CONNECTIONS (only connections)
    const shareResponse = await fetch(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: authorUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: finalContent,
              },
              shareMediaCategory: "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": safeVisibility,
          },
        }),
      }
    );

    if (!shareResponse.ok) {
      const errorData = await shareResponse.text();
      console.error("LinkedIn publish failed:", errorData);

      // Gestion des erreurs spécifiques LinkedIn
      if (shareResponse.status === 401) {
        return NextResponse.json(
          {
            error: "unauthorized",
            message:
              "Token invalide. Veuillez vous reconnecter à LinkedIn.",
          },
          { status: 401 }
        );
      }

      console.error("LinkedIn publish error details:", errorData);
      return NextResponse.json(
        {
          error: "publish_failed",
          message: "Could not publish to LinkedIn.",
        },
        { status: shareResponse.status }
      );
    }

    const shareData = await shareResponse.json();
    const shareId = shareData.id;

    // 💾 ÉTAPE 5: Enregistrement de la publication dans Firestore
    try {
      await saveLinkedInPostAdmin(userId, {
        linkedInId: shareId,
        postId: postId || "",
        content: content,
        postUrl: `https://www.linkedin.com/feed/update/${shareId}`,
        success: true,
        authorType,
        authorUrn,
        organizationUrn: authorType === "organization" ? authorUrn : undefined,
        organizationName: resolvedOrgName,
      });

      // Mise à jour de la date de dernière utilisation
      await updateLinkedInLastUsedAdmin(userId);

      // 📊 Increment weekly publish count server-side (ensures accurate quota tracking)
      await incrementWeeklyPublishCountAdmin(userId);
    } catch (firestoreError) {
      console.error("Failed to save LinkedIn post to Firestore:", firestoreError);
      // On ne fait pas échouer la requête car le post a été publié sur LinkedIn
    }

    // ✅ ÉTAPE 6: Retour du succès
    return NextResponse.json({
      success: true,
      message: "Post publié sur LinkedIn avec succès !",
      shareId: shareId,
      shareUrl: `https://www.linkedin.com/feed/update/${shareId}`,
    });
  } catch (error) {
    console.error("LinkedIn publish error:", error);

    // Log more details for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

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
