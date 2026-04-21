import { NextRequest, NextResponse } from "next/server";
import { saveLinkedInConnectionAdmin, LinkedInOrganizationAdmin } from "@/lib/db/firestore-admin";
import { isAdminInitialized, adminDb } from "@/lib/db/firebase-admin";
import { LINKEDIN_CONFIG } from "@/lib/platforms/linkedin";
import { fetchAdminOrganizations } from "@/lib/linkedin/organizations";

/**
 * Route de callback OAuth 2.0 LinkedIn
 *
 * Cette route est appelée par LinkedIn après que l'utilisateur ait autorisé l'application.
 * Elle échange le code d'autorisation contre un access token et récupère le profil utilisateur.
 *
 * Flow:
 * 1. Récupération du code d'autorisation depuis l'URL
 * 2. Échange du code contre un access token (appel à LinkedIn Token API)
 * 3. Récupération des informations du profil LinkedIn (appel à LinkedIn Profile API)
 * 4. Stockage sécurisé de la connexion dans Firestore
 * 5. Redirection vers l'application avec succès
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Vérification des erreurs LinkedIn
    if (error) {
      console.error("LinkedIn OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/app?linkedin_error=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    // Vérification de la présence du code d'autorisation
    if (!code) {
      return NextResponse.redirect(
        new URL("/app?linkedin_error=missing_code", request.url)
      );
    }

    // Récupération du userId depuis le state (format: userId:randomState)
    if (!state) {
      return NextResponse.redirect(
        new URL("/app?linkedin_error=missing_state", request.url)
      );
    }

    const [userId] = state.split(":");
    if (!userId) {
      return NextResponse.redirect(
        new URL("/app?linkedin_error=invalid_state", request.url)
      );
    }

    // 🔐 ÉTAPE 1: Échange du code contre un access token
    const tokenResponse = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          client_id: process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
          redirect_uri: LINKEDIN_CONFIG.redirectUri,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL("/app?linkedin_error=token_exchange_failed", request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in; // Secondes jusqu'à expiration (généralement 60 jours)
    // LinkedIn returns the actually granted scopes (may differ from requested
    // ones if MDP products aren't enabled on the app or the user denied).
    const grantedScopes: string[] = typeof tokenData.scope === "string"
      ? tokenData.scope.split(/[\s,]+/).filter(Boolean)
      : [];

    // 👤 ÉTAPE 2: Récupération du profil utilisateur LinkedIn
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      const errorData = await profileResponse.text();
      console.error("Profile fetch failed:", errorData);
      return NextResponse.redirect(
        new URL("/app?linkedin_error=profile_fetch_failed", request.url)
      );
    }

    const profileData = await profileResponse.json();

    // 🏢 ÉTAPE 2b: Récupération des Company Pages que l'user administre
    // Non-bloquant : si la MDP n'est pas encore approuvée sur l'app LinkedIn,
    // l'appel renverra 403 et on continue sans organisations (fallback perso).
    let organizations: LinkedInOrganizationAdmin[] = [];
    try {
      organizations = await fetchAdminOrganizations(accessToken, grantedScopes);
      if (organizations.length > 0) {
        console.log(
          `[LinkedIn OAuth] Fetched ${organizations.length} admin organization(s) for user ${userId}`
        );
      }
    } catch (orgError) {
      console.warn(
        "[LinkedIn OAuth] Could not fetch organizations (scope missing or MDP not approved):",
        orgError instanceof Error ? orgError.message : orgError
      );
    }

    // 🔍 Vérification de l'initialisation Firebase Admin
    if (!isAdminInitialized()) {
      console.error("Firebase Admin not initialized for LinkedIn callback");
      return NextResponse.redirect(
        new URL("/app?linkedin_error=service_unavailable", request.url)
      );
    }

    // 💾 ÉTAPE 3: Stockage sécurisé dans Firestore (via Admin SDK)
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await saveLinkedInConnectionAdmin(userId, {
      linkedInId: profileData.sub, // ID unique LinkedIn
      accessToken: accessToken,
      expiresAt: expiresAt,
      profileName: profileData.name || "",
      profilePicture: profileData.picture || undefined,
      email: profileData.email || undefined,
      organizations,
      grantedScopes,
    });

    // 🖼️ ÉTAPE 3b: Synchronisation de la photo LinkedIn vers le profil utilisateur
    // Assure que la photo LinkedIn est disponible sur TOUS les appareils dès que
    // l'utilisateur charge son profil, même avant que LinkedInContext n'ait fini
    // de lire linkedinConnections.
    if (profileData.picture && adminDb) {
      try {
        const userRef = adminDb.collection("users").doc(userId);
        await userRef.update({ photoURL: profileData.picture });
      } catch (photoSyncError) {
        // Non-bloquant : la photo LinkedIn reste disponible via LinkedInContext
        console.warn("Failed to sync LinkedIn photo to user profile:", photoSyncError);
      }
    }

    // ✅ ÉTAPE 4: Redirection avec succès
    return NextResponse.redirect(
      new URL("/app?linkedin_success=true", request.url)
    );
  } catch (error) {
    console.error("LinkedIn OAuth callback error:", error);

    return NextResponse.redirect(
      new URL("/app?linkedin_error=unexpected_error", request.url)
    );
  }
}
