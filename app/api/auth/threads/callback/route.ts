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
        new URL(
          `/settings?threads_error=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    // Vérification du code d'autorisation
    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?threads_error=missing_code", request.url)
      );
    }

    // Récupération du userId depuis le state
    if (!state) {
      return NextResponse.redirect(
        new URL("/settings?threads_error=missing_state", request.url)
      );
    }

    const [userId] = state.split(":");
    if (!userId) {
      return NextResponse.redirect(
        new URL("/settings?threads_error=invalid_state", request.url)
      );
    }

    // Strip #_ from code if present (Threads appends it)
    const cleanCode = code.replace(/#_$/, "");

    // ÉTAPE 1: Échange du code contre un short-lived token
    const tokenResponse = await fetch(THREADS_CONFIG.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: THREADS_CREDENTIALS.appId,
        client_secret: THREADS_CREDENTIALS.appSecret,
        grant_type: "authorization_code",
        redirect_uri: THREADS_CONFIG.redirectUri,
        code: cleanCode,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Threads token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL("/settings?threads_error=token_exchange_failed", request.url)
      );
    }

    const tokenData: ThreadsTokenResponse = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token;
    const threadsUserId = tokenData.user_id;

    console.log("Threads token exchange success:", {
      hasToken: !!shortLivedToken,
      userId: threadsUserId,
      tokenLength: shortLivedToken?.length
    });

    // Verify we got a valid token
    if (!shortLivedToken) {
      console.error("Threads token exchange returned empty token:", JSON.stringify(tokenData));
      return NextResponse.redirect(
        new URL("/settings?threads_error=token_exchange_failed&details=empty_token", request.url)
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
    let expiresIn = 3600; // 1 hour default for short-lived

    if (longLivedResponse.ok) {
      const longLivedData: ThreadsLongLivedTokenResponse = await longLivedResponse.json();
      if (longLivedData.access_token) {
        accessToken = longLivedData.access_token;
        expiresIn = longLivedData.expires_in || 5184000; // ~60 days
        console.log("Threads long-lived token obtained");
      }
    } else {
      console.warn("Threads long-lived token exchange failed, using short-lived token");
    }

    // ÉTAPE 3: Récupération du profil utilisateur Threads
    // Try with user_id first, then /me as fallback
    const profileFields = "id,username,threads_profile_picture_url";
    let profileUrl = threadsUserId
      ? `${THREADS_CONFIG.apiUrl}/${threadsUserId}?fields=${profileFields}&access_token=${accessToken}`
      : `${THREADS_CONFIG.apiUrl}/me?fields=${profileFields}&access_token=${accessToken}`;

    console.log("Fetching Threads profile:", {
      useUserId: !!threadsUserId,
      url: profileUrl.replace(accessToken, "***")
    });

    let profileResponse = await fetch(profileUrl);

    // Fallback to /me if user_id fetch failed
    if (!profileResponse.ok && threadsUserId) {
      console.warn("Profile fetch with user_id failed, trying /me");
      profileResponse = await fetch(
        `${THREADS_CONFIG.apiUrl}/me?fields=${profileFields}&access_token=${accessToken}`
      );
    }

    // Final fallback: minimal fields
    if (!profileResponse.ok) {
      console.warn("Profile fetch failed, trying minimal fields");
      profileResponse = await fetch(
        `${THREADS_CONFIG.apiUrl}/me?fields=id,username&access_token=${accessToken}`
      );
    }

    if (!profileResponse.ok) {
      const errorData = await profileResponse.text();
      console.error("Threads profile fetch failed:", profileResponse.status, errorData);
      return NextResponse.redirect(
        new URL(`/settings?threads_error=profile_fetch_failed&details=${encodeURIComponent(errorData.substring(0, 200))}`, request.url)
      );
    }

    const profile: ThreadsProfile = await profileResponse.json();
    console.log("Threads profile fetched:", { id: profile.id, username: profile.username });

    // Vérification de l'initialisation Firebase Admin
    if (!isAdminInitialized()) {
      console.error("Firebase Admin not initialized for Threads callback");
      return NextResponse.redirect(
        new URL("/settings?threads_error=service_unavailable", request.url)
      );
    }

    // ÉTAPE 4: Stockage sécurisé dans Firestore
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await saveThreadsConnectionAdmin(userId, {
      threadsId: threadsUserId || profile.id,
      username: profile.username,
      accessToken,
      expiresAt,
      profileName: profile.name || profile.username,
      profilePicture: profile.threads_profile_picture_url,
    });

    // ÉTAPE 5: Redirection avec succès
    return NextResponse.redirect(
      new URL("/settings?threads_success=true", request.url)
    );
  } catch (error) {
    console.error("Threads OAuth callback error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "unexpected_error";
    return NextResponse.redirect(
      new URL(
        `/settings?threads_error=${encodeURIComponent(errorMessage)}`,
        request.url
      )
    );
  }
}
