import { NextRequest, NextResponse } from "next/server";
import { saveTwitterConnectionAdmin } from "@/lib/db/firestore-admin";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { TWITTER_CONFIG, TwitterTokenResponse, TwitterUserResponse } from "@/lib/platforms/twitter";

/**
 * Route de callback OAuth 2.0 Twitter avec PKCE
 *
 * Cette route est appelée par Twitter après que l'utilisateur ait autorisé l'application.
 * Elle échange le code d'autorisation contre un access token via PKCE.
 *
 * Flow:
 * 1. Récupération du code d'autorisation et state depuis l'URL
 * 2. Récupération du code_verifier depuis le cookie
 * 3. Échange du code contre un access token (PKCE)
 * 4. Récupération des informations du profil Twitter
 * 5. Stockage sécurisé de la connexion dans Firestore
 * 6. Redirection vers l'application avec succès
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Vérification des erreurs Twitter
    if (error) {
      console.error("Twitter OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/app?twitter_error=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    // Vérification de la présence du code d'autorisation
    if (!code) {
      return NextResponse.redirect(
        new URL("/app?twitter_error=missing_code", request.url)
      );
    }

    // Récupération du userId depuis le state (format: userId:randomState)
    if (!state) {
      return NextResponse.redirect(
        new URL("/app?twitter_error=missing_state", request.url)
      );
    }

    const [userId] = state.split(":");
    if (!userId) {
      return NextResponse.redirect(
        new URL("/app?twitter_error=invalid_state", request.url)
      );
    }

    // 🔐 Récupération du code_verifier depuis le cookie
    const codeVerifier = request.cookies.get("twitter_code_verifier")?.value;
    if (!codeVerifier) {
      console.error("Missing code_verifier cookie");
      return NextResponse.redirect(
        new URL("/app?twitter_error=missing_verifier", request.url)
      );
    }

    // 🔐 ÉTAPE 1: Échange du code contre un access token (PKCE)
    // Twitter OAuth 2.0 with PKCE requires Basic auth with client_id:client_secret
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
        grant_type: "authorization_code",
        code: code,
        redirect_uri: TWITTER_CONFIG.redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Twitter token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL("/app?twitter_error=token_exchange_failed", request.url)
      );
    }

    const tokenData: TwitterTokenResponse = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in; // Généralement 7200 secondes (2 heures)

    // 👤 ÉTAPE 2: Récupération du profil utilisateur Twitter
    const profileResponse = await fetch(`${TWITTER_CONFIG.apiUrl}/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      const errorData = await profileResponse.text();
      console.error("Twitter profile fetch failed:", errorData);
      return NextResponse.redirect(
        new URL("/app?twitter_error=profile_fetch_failed", request.url)
      );
    }

    const profileData: TwitterUserResponse = await profileResponse.json();
    const profile = profileData.data;

    // 🔍 Vérification de l'initialisation Firebase Admin
    if (!isAdminInitialized()) {
      console.error("Firebase Admin not initialized for Twitter callback");
      return NextResponse.redirect(
        new URL("/app?twitter_error=service_unavailable", request.url)
      );
    }

    // 💾 ÉTAPE 3: Stockage sécurisé dans Firestore (via Admin SDK)
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await saveTwitterConnectionAdmin(userId, {
      twitterId: profile.id,
      username: profile.username,
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresAt: expiresAt,
      profileName: profile.name,
      profilePicture: profile.profile_image_url,
    });

    // ✅ ÉTAPE 4: Redirection avec succès (et suppression du cookie)
    const response = NextResponse.redirect(
      new URL("/app?twitter_success=true", request.url)
    );

    // Supprimer le cookie code_verifier
    response.cookies.delete("twitter_code_verifier");

    return response;
  } catch (error) {
    console.error("Twitter OAuth callback error:", error);
    console.error(
      "Error details:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );

    const errorMessage =
      error instanceof Error ? error.message : "unexpected_error";
    return NextResponse.redirect(
      new URL(
        `/app?twitter_error=${encodeURIComponent(errorMessage)}`,
        request.url
      )
    );
  }
}
