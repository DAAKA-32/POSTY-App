import { NextRequest, NextResponse } from "next/server";
import {
  getThreadsConnectionAdmin,
  updateThreadsLastUsedAdmin,
  saveThreadsPostAdmin,
  checkUserQuotaAdmin,
} from "@/lib/firestore-admin";
import { adminDb, isAdminInitialized } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { isPlatformAllowed, PlanType } from "@/lib/plans";
import { THREADS_CONFIG } from "@/lib/meta";

/**
 * Route de publication sur Threads
 *
 * Publication en 2 étapes via l'API Threads:
 * 1. Création d'un media container (type TEXT)
 * 2. Publication du container
 */
export async function POST(request: NextRequest) {
  try {
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
    const { userId, content, postId } = body;

    if (!userId || !content) {
      return NextResponse.json(
        { error: "Missing required fields: userId, content" },
        { status: 400 }
      );
    }

    // PLAN CHECK: Verify user's plan allows Threads publishing
    let userPlan: PlanType = "free";
    try {
      const quotaCheck = await checkUserQuotaAdmin(userId);
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

    // ÉTAPE 1: Création du media container (TEXT post)
    const containerResponse = await fetch(
      `${THREADS_CONFIG.apiUrl}/me/threads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${connection.accessToken}`,
        },
        body: JSON.stringify({
          media_type: "TEXT",
          text: content,
        }),
      }
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

      return NextResponse.json(
        {
          error: "container_creation_failed",
          message: "Échec de la création du post Threads. Veuillez réessayer.",
          details: errorData,
        },
        { status: containerResponse.status }
      );
    }

    const containerData = await containerResponse.json();
    const creationId = containerData.id;

    // ÉTAPE 2: Publication du container
    const publishResponse = await fetch(
      `${THREADS_CONFIG.apiUrl}/me/threads_publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${connection.accessToken}`,
        },
        body: JSON.stringify({
          creation_id: creationId,
        }),
      }
    );

    if (!publishResponse.ok) {
      const errorData = await publishResponse.text();
      console.error("Threads publish failed:", errorData);

      return NextResponse.json(
        {
          error: "publish_failed",
          message: "Échec de la publication sur Threads. Veuillez réessayer.",
          details: errorData,
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
        permalink = threadInfo.permalink;
      }
    } catch {
      // Non-critical, continue without permalink
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
      permalink: permalink || `https://www.threads.net/@${connection.username}`,
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
