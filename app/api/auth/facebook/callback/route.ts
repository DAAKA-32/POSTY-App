import { NextRequest, NextResponse } from "next/server";
import { saveFacebookConnectionAdmin } from "@/lib/firestore-admin";
import { isAdminInitialized } from "@/lib/firebase-admin";
import {
  META_CONFIG,
  FACEBOOK_CONFIG,
  FacebookTokenResponse,
  FacebookProfile,
  FacebookPagesResponse,
} from "@/lib/meta";

/**
 * Route de callback OAuth 2.0 Facebook
 *
 * Flow:
 * 1. Récupération du code d'autorisation et state depuis l'URL
 * 2. Échange du code contre un short-lived access token
 * 3. Échange du short-lived token contre un long-lived token (~60 jours)
 * 4. Récupération du profil utilisateur Facebook
 * 5. Récupération des pages gérées (avec leurs page access tokens)
 * 6. Stockage sécurisé de la connexion dans Firestore
 * 7. Redirection vers l'application avec succès
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Vérification des erreurs Facebook
    if (error) {
      console.error("Facebook OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/app?facebook_error=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    // Vérification du code d'autorisation
    if (!code) {
      return NextResponse.redirect(
        new URL("/app?facebook_error=missing_code", request.url)
      );
    }

    // Récupération du userId depuis le state
    if (!state) {
      return NextResponse.redirect(
        new URL("/app?facebook_error=missing_state", request.url)
      );
    }

    const [userId] = state.split(":");
    if (!userId) {
      return NextResponse.redirect(
        new URL("/app?facebook_error=invalid_state", request.url)
      );
    }

    // ÉTAPE 1: Échange du code contre un short-lived token
    const tokenParams = new URLSearchParams({
      client_id: META_CONFIG.appId,
      client_secret: META_CONFIG.appSecret,
      redirect_uri: FACEBOOK_CONFIG.redirectUri,
      code,
    });

    const tokenResponse = await fetch(
      `${FACEBOOK_CONFIG.tokenUrl}?${tokenParams.toString()}`
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Facebook token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL("/app?facebook_error=token_exchange_failed", request.url)
      );
    }

    const tokenData: FacebookTokenResponse = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token;

    // ÉTAPE 2: Échange du short-lived token contre un long-lived token
    const longLivedParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: META_CONFIG.appId,
      client_secret: META_CONFIG.appSecret,
      fb_exchange_token: shortLivedToken,
    });

    const longLivedResponse = await fetch(
      `${FACEBOOK_CONFIG.tokenUrl}?${longLivedParams.toString()}`
    );

    let accessToken = shortLivedToken;
    let expiresIn = tokenData.expires_in || 3600;

    if (longLivedResponse.ok) {
      const longLivedData: FacebookTokenResponse = await longLivedResponse.json();
      accessToken = longLivedData.access_token;
      expiresIn = longLivedData.expires_in || 5184000; // ~60 days
    }

    // ÉTAPE 3: Récupération du profil utilisateur
    const profileResponse = await fetch(
      `${FACEBOOK_CONFIG.apiUrl}/me?fields=id,name,email,picture&access_token=${accessToken}`
    );

    if (!profileResponse.ok) {
      const errorData = await profileResponse.text();
      console.error("Facebook profile fetch failed:", errorData);
      return NextResponse.redirect(
        new URL("/app?facebook_error=profile_fetch_failed", request.url)
      );
    }

    const profile: FacebookProfile = await profileResponse.json();

    // ÉTAPE 4: Récupération des pages gérées
    const pagesResponse = await fetch(
      `${FACEBOOK_CONFIG.apiUrl}/me/accounts?access_token=${accessToken}`
    );

    let pages: Array<{ id: string; name: string; accessToken: string }> = [];

    if (pagesResponse.ok) {
      const pagesData: FacebookPagesResponse = await pagesResponse.json();
      pages = pagesData.data.map((page) => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
      }));
    }

    // Vérification de l'initialisation Firebase Admin
    if (!isAdminInitialized()) {
      console.error("Firebase Admin not initialized for Facebook callback");
      return NextResponse.redirect(
        new URL("/app?facebook_error=service_unavailable", request.url)
      );
    }

    // ÉTAPE 5: Stockage sécurisé dans Firestore
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await saveFacebookConnectionAdmin(userId, {
      facebookId: profile.id,
      accessToken,
      expiresAt,
      profileName: profile.name,
      profilePicture: profile.picture?.data?.url,
      email: profile.email,
      pages,
      selectedPageId: pages.length > 0 ? pages[0].id : undefined,
    });

    // ÉTAPE 6: Redirection avec succès
    return NextResponse.redirect(
      new URL("/app?facebook_success=true", request.url)
    );
  } catch (error) {
    console.error("Facebook OAuth callback error:", error);

    return NextResponse.redirect(
      new URL("/app?facebook_error=unexpected_error", request.url)
    );
  }
}
