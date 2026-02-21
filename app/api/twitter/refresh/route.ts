import { NextRequest, NextResponse } from "next/server";
import {
  getTwitterConnectionAdmin,
  updateTwitterTokensAdmin,
} from "@/lib/firestore-admin";
import { isAdminInitialized } from "@/lib/firebase-admin";
import { TWITTER_CONFIG, TwitterTokenResponse } from "@/lib/twitter";
import { verifyAuth } from "@/lib/auth";

/**
 * Route de rafraîchissement du token Twitter
 *
 * Cette route permet de rafraîchir le token d'accès Twitter avant expiration.
 * Twitter tokens expirent après 2 heures mais peuvent être rafraîchis pendant 6 mois.
 *
 * Flow:
 * 1. Récupération de la connexion Twitter depuis Firestore
 * 2. Vérification de la présence d'un refresh token
 * 3. Appel à l'API Twitter pour obtenir un nouveau token
 * 4. Mise à jour des tokens dans Firestore
 * 5. Retour de la nouvelle date d'expiration
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    // 🔍 Vérification de l'initialisation Firebase Admin
    if (!isAdminInitialized()) {
      console.error("Firebase Admin not initialized");
      return NextResponse.json(
        {
          error: "firebase_not_initialized",
          message: "Service temporairement indisponible.",
        },
        { status: 503 }
      );
    }

    // 🔐 ÉTAPE 1: Récupération et validation des données
    const body = await request.json();
    const { userId: bodyUserId } = body;

    // Use authenticated uid, fall back to body userId only in dev bypass mode
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    // 🔍 ÉTAPE 2: Récupération de la connexion Twitter
    const connection = await getTwitterConnectionAdmin(userId);

    if (!connection) {
      return NextResponse.json(
        {
          error: "twitter_not_connected",
          message: "Aucune connexion Twitter trouvée.",
        },
        { status: 401 }
      );
    }

    // Vérification de la présence d'un refresh token
    if (!connection.refreshToken) {
      return NextResponse.json(
        {
          error: "no_refresh_token",
          message:
            "Impossible de rafraîchir la session. Veuillez vous reconnecter.",
        },
        { status: 400 }
      );
    }

    // 🔄 ÉTAPE 3: Appel à l'API Twitter pour rafraîchir le token
    const credentials = Buffer.from(
      `${TWITTER_CONFIG.clientId}:${process.env.TWITTER_CLIENT_SECRET}`
    ).toString("base64");

    const tokenResponse = await fetch(TWITTER_CONFIG.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: connection.refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Twitter token refresh failed:", errorData);

      // Si le refresh token est invalide, l'utilisateur doit se reconnecter
      if (tokenResponse.status === 400 || tokenResponse.status === 401) {
        return NextResponse.json(
          {
            error: "refresh_token_invalid",
            message:
              "Session expirée. Veuillez vous reconnecter à Twitter.",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          error: "refresh_failed",
          message:
            "Échec du rafraîchissement du token. Veuillez réessayer.",
        },
        { status: tokenResponse.status }
      );
    }

    const tokenData: TwitterTokenResponse = await tokenResponse.json();
    const newAccessToken = tokenData.access_token;
    const newRefreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    // 💾 ÉTAPE 4: Mise à jour des tokens dans Firestore
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await updateTwitterTokensAdmin(
      userId,
      newAccessToken,
      newRefreshToken,
      expiresAt
    );

    // ✅ ÉTAPE 5: Retour du succès
    return NextResponse.json({
      success: true,
      message: "Token Twitter rafraîchi avec succès.",
      expiresAt: expiresAt.toISOString(),
      expiresIn: expiresIn,
    });
  } catch (error) {
    console.error("Twitter token refresh error:", error);

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
