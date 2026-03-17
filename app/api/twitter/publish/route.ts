import { NextRequest, NextResponse } from "next/server";
import {
  getTwitterConnectionAdmin,
  updateTwitterLastUsedAdmin,
  saveTwitterPostAdmin,
} from "@/lib/db/firestore-admin";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { TWITTER_CONFIG, TWITTER_CHAR_LIMIT, getTweetUrl } from "@/lib/platforms/twitter";
import { verifyAuth } from "@/lib/auth";

/**
 * Route de publication sur Twitter
 *
 * Cette route permet de publier un tweet pour l'utilisateur.
 *
 * Flow:
 * 1. Vérification de l'authentification utilisateur
 * 2. Récupération de la connexion Twitter depuis Firestore
 * 3. Vérification de la validité du token (refresh si nécessaire)
 * 4. Publication du tweet via l'API Twitter v2
 * 5. Enregistrement de la publication dans l'historique
 *
 * Sécurité: Le token Twitter n'est JAMAIS exposé au client.
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
    const { userId: bodyUserId, content, postId } = body;

    // Use authenticated uid, fall back to body userId only in dev bypass mode
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId || !content) {
      return NextResponse.json(
        { error: "Missing required fields: userId, content" },
        { status: 400 }
      );
    }

    // Vérification de la longueur du tweet
    if (content.length > TWITTER_CHAR_LIMIT) {
      return NextResponse.json(
        {
          error: "content_too_long",
          message: `Le tweet est trop long (${content.length}/${TWITTER_CHAR_LIMIT} caractères).`,
        },
        { status: 400 }
      );
    }

    // 🔍 ÉTAPE 2: Récupération de la connexion Twitter
    const connection = await getTwitterConnectionAdmin(userId);

    if (!connection) {
      return NextResponse.json(
        {
          error: "twitter_not_connected",
          message: "Aucune connexion Twitter trouvée. Veuillez vous connecter.",
        },
        { status: 401 }
      );
    }

    // ⏰ ÉTAPE 3: Vérification de l'expiration du token
    const now = Timestamp.now();
    if (connection.expiresAt.toMillis() <= now.toMillis()) {
      // Token expiré - tenter un refresh automatique
      if (connection.refreshToken) {
        const refreshResult = await refreshAccessToken(
          userId,
          connection.refreshToken
        );
        if (!refreshResult.success) {
          return NextResponse.json(
            {
              error: "token_expired",
              message:
                "Votre session Twitter a expiré. Veuillez vous reconnecter.",
            },
            { status: 401 }
          );
        }
        // Utiliser le nouveau token
        connection.accessToken = refreshResult.accessToken!;
      } else {
        return NextResponse.json(
          {
            error: "token_expired",
            message:
              "Votre session Twitter a expiré. Veuillez vous reconnecter.",
          },
          { status: 401 }
        );
      }
    }

    // 📝 ÉTAPE 4: Publication sur Twitter via API v2
    const tweetResponse = await fetch(`${TWITTER_CONFIG.apiUrl}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: content,
      }),
    });

    if (!tweetResponse.ok) {
      const errorData = await tweetResponse.text();
      console.error("Twitter publish failed:", errorData);

      // Gestion des erreurs spécifiques Twitter
      if (tweetResponse.status === 401) {
        return NextResponse.json(
          {
            error: "unauthorized",
            message: "Token invalide. Veuillez vous reconnecter à Twitter.",
          },
          { status: 401 }
        );
      }

      if (tweetResponse.status === 429) {
        return NextResponse.json(
          {
            error: "rate_limited",
            message:
              "Trop de publications. Veuillez réessayer dans quelques minutes.",
          },
          { status: 429 }
        );
      }

      console.error("Twitter publish error details:", errorData);
      return NextResponse.json(
        {
          error: "publish_failed",
          message: "Échec de la publication sur Twitter. Veuillez réessayer.",
        },
        { status: tweetResponse.status }
      );
    }

    const tweetData = await tweetResponse.json();
    const tweetId = tweetData.data.id;
    const tweetUrl = getTweetUrl(connection.username, tweetId);

    // 💾 ÉTAPE 5: Enregistrement de la publication dans Firestore
    try {
      await saveTwitterPostAdmin(userId, {
        twitterId: connection.twitterId,
        tweetId: tweetId,
        content: content,
        tweetUrl: tweetUrl,
        success: true,
      });

      // Mise à jour de la date de dernière utilisation
      await updateTwitterLastUsedAdmin(userId);
    } catch (firestoreError) {
      console.error("Failed to save Twitter post to Firestore:", firestoreError);
      // On ne fait pas échouer la requête car le tweet a été publié
    }

    // ✅ ÉTAPE 6: Retour du succès
    return NextResponse.json({
      success: true,
      message: "Tweet publié avec succès !",
      tweetId: tweetId,
      tweetUrl: tweetUrl,
    });
  } catch (error) {
    console.error("Twitter publish error:", error);

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

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(
  userId: string,
  refreshToken: string
): Promise<{
  success: boolean;
  accessToken?: string;
  error?: string;
}> {
  try {
    const credentials = Buffer.from(
      `${TWITTER_CONFIG.clientId}:${process.env.TWITTER_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(TWITTER_CONFIG.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Token refresh failed:", errorData);
      return { success: false, error: "refresh_failed" };
    }

    const tokenData = await response.json();

    // Update tokens in Firestore
    const { updateTwitterTokensAdmin } = await import("@/lib/db/firestore-admin");
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await updateTwitterTokensAdmin(
      userId,
      tokenData.access_token,
      tokenData.refresh_token,
      expiresAt
    );

    return { success: true, accessToken: tokenData.access_token };
  } catch (error) {
    console.error("Token refresh error:", error);
    return { success: false, error: "refresh_error" };
  }
}
