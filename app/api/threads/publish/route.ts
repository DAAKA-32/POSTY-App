import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import {
  getThreadsConnectionAdmin,
  updateThreadsLastUsedAdmin,
  saveThreadsPostAdmin,
  checkUserQuotaAdmin,
} from "@/lib/db/firestore-admin";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { isPlatformAllowed, PlanType, appendFreeSignature } from "@/lib/config/plans";
import { THREADS_CONFIG } from "@/lib/platforms/meta";

/**
 * Route de publication sur Threads
 *
 * Publication en 2 étapes via l'API Threads:
 * 1. Création d'un media container (type TEXT)
 * 2. Publication du container
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

    if (content.length > 500) {
      return NextResponse.json(
        {
          error: "content_too_long",
          message: "Le contenu dépasse la limite de 500 caractères pour Threads.",
        },
        { status: 400 }
      );
    }

    // PLAN CHECK: Verify user's plan allows Threads publishing
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

    if (!isPlatformAllowed(userPlan, "threads")) {
      return NextResponse.json(
        {
          error: "platform_not_allowed",
          message: "Threads n'est pas disponible avec votre plan actuel. Passez au plan Max.",
          requiredPlan: "max",
        },
        { status: 403 }
      );
    }

    // Récupération de la connexion Threads
    const connection = await getThreadsConnectionAdmin(userId);

    if (!connection) {
      return NextResponse.json(
        {
          error: "threads_not_connected",
          message: "Aucune connexion Threads trouvée. Veuillez vous connecter.",
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
          message: "Votre connexion Threads a expiré. Veuillez vous reconnecter.",
        },
        { status: 401 }
      );
    }

    // Append Free plan signature
    const finalContent = appendFreeSignature(content, userPlan);

    // ÉTAPE 1: Création du media container (TEXT post)
    const containerParams = new URLSearchParams({
      media_type: "TEXT",
      text: finalContent,
      access_token: connection.accessToken,
    });
    const containerResponse = await fetch(
      `${THREADS_CONFIG.apiUrl}/me/threads?${containerParams.toString()}`,
      { method: "POST" }
    );

    if (!containerResponse.ok) {
      const errorData = await containerResponse.text();
      console.error("Threads container creation failed:", errorData);

      if (containerResponse.status === 401) {
        return NextResponse.json(
          {
            error: "unauthorized",
            message: "Token invalide. Veuillez vous reconnecter à Threads.",
          },
          { status: 401 }
        );
      }

      console.error("Threads container creation error details:", errorData);
      let threadsError = "";
      try {
        const parsed = JSON.parse(errorData);
        threadsError = parsed?.error?.message || errorData;
      } catch {
        threadsError = errorData;
      }
      return NextResponse.json(
        {
          error: "container_creation_failed",
          message: `Échec de la création du post Threads: ${threadsError}`,
        },
        { status: containerResponse.status }
      );
    }

    const containerData = await containerResponse.json();
    const creationId = containerData.id;

    // Attendre que le container soit prêt
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // ÉTAPE 2: Publication du container
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: connection.accessToken,
    });
    const publishResponse = await fetch(
      `${THREADS_CONFIG.apiUrl}/me/threads_publish?${publishParams.toString()}`,
      { method: "POST" }
    );

    if (!publishResponse.ok) {
      const errorData = await publishResponse.text();
      console.error("Threads publish failed:", errorData);
      let publishError = "";
      try {
        const parsed = JSON.parse(errorData);
        publishError = parsed?.error?.message || errorData;
      } catch {
        publishError = errorData;
      }

      return NextResponse.json(
        {
          error: "publish_failed",
          message: `Échec de la publication sur Threads: ${publishError}`,
        },
        { status: publishResponse.status }
      );
    }

    const publishData = await publishResponse.json();
    const threadId = publishData.id;

    // Récupération du permalink
    let permalink: string | undefined;
    try {
      const threadInfoResponse = await fetch(
        `${THREADS_CONFIG.apiUrl}/${threadId}?fields=permalink&access_token=${connection.accessToken}`
      );
      if (threadInfoResponse.ok) {
        const threadInfo = await threadInfoResponse.json();
        if (threadInfo.permalink && !threadInfo.permalink.includes("error=")) {
          permalink = threadInfo.permalink;
        }
      }
    } catch {
      // Non-critical, continue without permalink
    }
    // Fallback: lien vers le profil Threads
    if (!permalink) {
      permalink = `https://www.threads.net/@${connection.username}`;
    }

    // Enregistrement dans Firestore
    try {
      await saveThreadsPostAdmin(userId, {
        threadsId: connection.threadsId,
        threadId,
        content,
        permalink,
        success: true,
      });

      await updateThreadsLastUsedAdmin(userId);
    } catch (firestoreError) {
      console.error("Failed to save Threads post to Firestore:", firestoreError);
    }

    return NextResponse.json({
      success: true,
      message: "Post publié sur Threads avec succès !",
      threadId,
      permalink,
    });
  } catch (error) {
    console.error("Threads publish error:", error);

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
