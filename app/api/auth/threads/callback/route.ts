import { NextRequest, NextResponse } from "next/server";
import { saveThreadsConnectionAdmin } from "@/lib/firestore-admin";
import { isAdminInitialized } from "@/lib/firebase-admin";
import {
  THREADS_CREDENTIALS,
  THREADS_CONFIG,
  ThreadsTokenResponse,
  ThreadsLongLivedTokenResponse,
  ThreadsProfile,
} from "@/lib/meta";

// Standardized redirect: all OAuth callbacks go to the main application page
// Uses path segments to construct the URL dynamically
const OAUTH_REDIRECT_BASE = ["", "app"].join("/");

function buildRedirectUrl(request: NextRequest, params: string): URL {
  return new URL(`${OAUTH_REDIRECT_BASE}?${params}`, request.url);
}

/**
 * Route de callback OAuth 2.0 Threads
 *
 * Flow:
 * 1. Récupération du code d'autorisation et state depuis l'URL
 * 2. Échange du code contre un short-lived access token
 * 3. Échange du short-lived token contre un long-lived token (~60 jours)
 * 4. Récupération du profil utilisateur Threads
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

    // Vérification des erreurs Threads
    if (error) {
      console.error("Threads OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        buildRedirectUrl(request, `threads_error=${encodeURIComponent(errorDescription || error)}`)
      );
    }

    // Vérification du code d'autorisation
    if (!code) {
      return NextResponse.redirect(
        buildRedirectUrl(request, "threads_error=missing_code")
      );
    }

    // Récupération du userId depuis le state
    if (!state) {
      return NextResponse.redirect(
        buildRedirectUrl(request, "threads_error=missing_state")
      );
    }

    const [userId] = state.split(":");
    if (!userId) {
      return NextResponse.redirect(
        buildRedirectUrl(request, "threads_error=invalid_state")
      );
    }

    // Strip #_ from code if present (Threads appends it)
    const cleanCode = code.replace(/#_$/, "");

    // ÉTAPE 1: Échange du code contre un short-lived token
    const tokenBody = new URLSearchParams({
      client_id: THREADS_CREDENTIALS.appId,
      client_secret: THREADS_CREDENTIALS.appSecret,
      grant_type: "authorization_code",
      redirect_uri: THREADS_CONFIG.redirectUri,
      code: cleanCode,
    });

    const tokenResponse = await fetch(THREADS_CONFIG.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody,
    });

    const tokenResponseText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      console.error("Threads token exchange failed:", tokenResponse.status);
      return NextResponse.redirect(
        buildRedirectUrl(request, "threads_error=token_exchange_failed")
      );
    }

    let tokenData: ThreadsTokenResponse;
    try {
      tokenData = JSON.parse(tokenResponseText);
    } catch {
      console.error("Threads token response parse error");
      return NextResponse.redirect(
        buildRedirectUrl(request, "threads_error=token_exchange_failed")
      );
    }

    const shortLivedToken = tokenData.access_token;
    const threadsUserId = tokenData.user_id;

    if (!shortLivedToken) {
      console.error("Threads: empty token in response");
      return NextResponse.redirect(
        buildRedirectUrl(request, "threads_error=token_exchange_failed")
      );
    }

    // ÉTAPE 2: Échange du short-lived token contre un long-lived token
    const longLivedParams = new URLSearchParams({
      grant_type: "th_exchange_token",
      client_secret: THREADS_CREDENTIALS.appSecret,
      access_token: shortLivedToken,
    });

    const longLivedResponse = await fetch(
      `${THREADS_CONFIG.longLivedTokenUrl}?${longLivedParams.toString()}`
    );

    let accessToken = shortLivedToken;
    let expiresIn = 3600;

    if (longLivedResponse.ok) {
      const longLivedData: ThreadsLongLivedTokenResponse = await longLivedResponse.json();
      if (longLivedData.access_token) {
        accessToken = longLivedData.access_token;
        expiresIn = longLivedData.expires_in || 5184000;
      }
    } else {
      const llError = await longLivedResponse.text();
      console.warn("Long-lived token failed:", llError);
    }

    // ÉTAPE 3: Récupération du profil utilisateur Threads
    let profile: ThreadsProfile | null = null;

    const profileEndpoints = [
      `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`,
      `https://graph.threads.net/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`,
      `https://graph.threads.net/v1.0/${threadsUserId}?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`,
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`,
    ];

    for (const endpoint of profileEndpoints) {
      try {
        const resp = await fetch(endpoint);
        const text = await resp.text();

        if (resp.ok) {
          profile = JSON.parse(text);
          break;
        }
      } catch {
        // Try next endpoint
      }
    }

    // If all profile fetches failed, save with minimal data from token exchange
    if (!profile || !profile.id) {
      console.warn("All profile fetches failed, using token data as fallback");

      if (!threadsUserId) {
        console.error("Threads profile fetch failed: no user_id available");
        return NextResponse.redirect(
          buildRedirectUrl(request, "threads_error=profile_fetch_failed")
        );
      }

      profile = {
        id: String(threadsUserId),
        username: `threads_user_${threadsUserId}`,
      };
    }

    // Vérification de l'initialisation Firebase Admin
    if (!isAdminInitialized()) {
      console.error("Firebase Admin not initialized for Threads callback");
      return NextResponse.redirect(
        buildRedirectUrl(request, "threads_error=service_unavailable")
      );
    }

    // ÉTAPE 4: Stockage sécurisé dans Firestore
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await saveThreadsConnectionAdmin(userId, {
      threadsId: String(threadsUserId || profile.id),
      username: profile.username,
      accessToken,
      expiresAt,
      profileName: profile.name || profile.username,
      profilePicture: profile.threads_profile_picture_url,
    });

    // ÉTAPE 5: Redirection avec succès
    return NextResponse.redirect(
      buildRedirectUrl(request, "threads_success=true")
    );
  } catch (error) {
    console.error("Threads OAuth callback error:", error);

    return NextResponse.redirect(
      buildRedirectUrl(request, "threads_error=unexpected_error")
    );
  }
}
