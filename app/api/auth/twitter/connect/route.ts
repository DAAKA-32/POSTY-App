import { NextRequest, NextResponse } from "next/server";
import {
  TWITTER_CONFIG,
  generateCodeVerifier,
  generateCodeChallenge,
} from "@/lib/platforms/twitter";

/**
 * Route d'initialisation OAuth 2.0 Twitter avec PKCE
 *
 * Cette route génère les paramètres PKCE et redirige vers Twitter pour autorisation.
 * Le code_verifier est stocké dans un cookie HTTP-only pour être récupéré au callback.
 *
 * Flow:
 * 1. Génération du code_verifier (secret)
 * 2. Génération du code_challenge (SHA-256 hash)
 * 3. Stockage du code_verifier dans un cookie sécurisé
 * 4. Redirection vers Twitter OAuth
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // Vérification de la configuration Twitter
    if (!TWITTER_CONFIG.clientId || !TWITTER_CONFIG.redirectUri) {
      console.error("Twitter OAuth not configured");
      return NextResponse.json(
        {
          error: "twitter_not_configured",
          message: "Configuration Twitter manquante.",
        },
        { status: 500 }
      );
    }

    // 🔐 ÉTAPE 1: Génération des paramètres PKCE
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // 🔐 ÉTAPE 2: Construction du state (userId + random pour sécurité CSRF)
    const randomState = generateRandomState();
    const state = `${userId}:${randomState}`;

    // 🔐 ÉTAPE 3: Construction de l'URL d'autorisation Twitter
    const authParams = new URLSearchParams({
      response_type: "code",
      client_id: TWITTER_CONFIG.clientId,
      redirect_uri: TWITTER_CONFIG.redirectUri,
      scope: TWITTER_CONFIG.scope,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `${TWITTER_CONFIG.authorizationUrl}?${authParams.toString()}`;

    // 🔐 ÉTAPE 4: Création de la réponse avec cookie sécurisé
    const response = NextResponse.redirect(authUrl);

    // Stocker le code_verifier dans un cookie HTTP-only
    // Ce cookie sera lu par le callback pour échanger le code
    response.cookies.set("twitter_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10, // 10 minutes (largement suffisant pour le flow OAuth)
    });

    return response;
  } catch (error) {
    console.error("Twitter OAuth init error:", error);

    return NextResponse.json(
      {
        error: "unexpected_error",
        message: "Erreur lors de l'initialisation de la connexion Twitter.",
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a random state string for CSRF protection
 */
function generateRandomState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
