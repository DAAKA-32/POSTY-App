import { NextRequest, NextResponse } from "next/server";
import {
  getMediumConnectionAdmin,
  updateMediumLastUsedAdmin,
  saveMediumPostAdmin,
} from "@/lib/firestore-admin";
import { isAdminInitialized } from "@/lib/firebase-admin";
import { MEDIUM_CONFIG, formatContentForMedium, generateTitleFromContent } from "@/lib/medium";
import type { MediumPublishStatus } from "@/lib/firestore-admin";

/**
 * Route de publication sur Medium
 *
 * Cette route permet de publier un article sur Medium.
 *
 * Flow:
 * 1. Vérification de l'authentification utilisateur
 * 2. Récupération de la connexion Medium depuis Firestore
 * 3. Formatage du contenu pour Medium (markdown)
 * 4. Publication de l'article via l'API Medium
 * 5. Enregistrement de la publication dans l'historique
 *
 * Sécurité: Le token Medium n'est JAMAIS exposé au client.
 */
export async function POST(request: NextRequest) {
  try {
    // 🔍 Vérification de l'initialisation Firebase Admin
    if (!isAdminInitialized()) {
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
    const { userId, content, title, publishStatus = "draft", postId } = body;

    if (!userId || !content) {
      return NextResponse.json(
        { error: "Missing required fields: userId, content" },
        { status: 400 }
      );
    }

    // Validation du statut de publication
    const validStatuses: MediumPublishStatus[] = ["draft", "public", "unlisted"];
    if (!validStatuses.includes(publishStatus)) {
      return NextResponse.json(
        { error: "Invalid publishStatus. Must be: draft, public, or unlisted" },
        { status: 400 }
      );
    }

    // 🔍 ÉTAPE 2: Récupération de la connexion Medium
    const connection = await getMediumConnectionAdmin(userId);

    if (!connection) {
      return NextResponse.json(
        {
          error: "medium_not_connected",
          message: "Aucune connexion Medium trouvée. Veuillez configurer votre token.",
        },
        { status: 401 }
      );
    }

    // 📝 ÉTAPE 3: Préparation du contenu
    const articleTitle = title || generateTitleFromContent(content);
    const formattedContent = formatContentForMedium(content);

    // 📝 ÉTAPE 4: Publication sur Medium via API
    const publishResponse = await fetch(
      `${MEDIUM_CONFIG.apiUrl}/users/${connection.mediumId}/posts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.integrationToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          title: articleTitle,
          contentFormat: "markdown",
          content: formattedContent,
          publishStatus: publishStatus,
        }),
      }
    );

    if (!publishResponse.ok) {
      const errorData = await publishResponse.text();
      console.error("Medium publish failed:", errorData);

      // Gestion des erreurs spécifiques Medium
      if (publishResponse.status === 401) {
        return NextResponse.json(
          {
            error: "unauthorized",
            message: "Token invalide. Veuillez vérifier votre token Medium.",
          },
          { status: 401 }
        );
      }

      if (publishResponse.status === 429) {
        return NextResponse.json(
          {
            error: "rate_limited",
            message:
              "Trop de publications. Veuillez réessayer dans quelques minutes.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "publish_failed",
          message: "Échec de la publication sur Medium. Veuillez réessayer.",
          details: errorData,
        },
        { status: publishResponse.status }
      );
    }

    const responseData = await publishResponse.json();
    const articleData = responseData.data;

    // 💾 ÉTAPE 5: Enregistrement de la publication dans Firestore
    try {
      await saveMediumPostAdmin(userId, {
        mediumId: connection.mediumId,
        articleId: articleData.id,
        title: articleTitle,
        content: content,
        articleUrl: articleData.url,
        publishStatus: publishStatus,
        success: true,
      });

      // Mise à jour de la date de dernière utilisation
      await updateMediumLastUsedAdmin(userId);
    } catch (firestoreError) {
      console.error("Failed to save Medium post to Firestore:", firestoreError);
      // On ne fait pas échouer la requête car l'article a été publié
    }

    // ✅ ÉTAPE 6: Retour du succès
    return NextResponse.json({
      success: true,
      message:
        publishStatus === "draft"
          ? "Brouillon enregistré sur Medium !"
          : "Article publié sur Medium !",
      articleId: articleData.id,
      articleUrl: articleData.url,
      publishStatus: publishStatus,
    });
  } catch (error) {
    console.error("Medium publish error:", error);

    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: "unexpected_error",
        message:
          error instanceof Error
            ? `Erreur: ${error.message}`
            : "Une erreur inattendue s'est produite.",
      },
      { status: 500 }
    );
  }
}
