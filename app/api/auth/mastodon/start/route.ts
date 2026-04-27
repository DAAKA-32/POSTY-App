import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import {
  getMastodonAppCredentialsAdmin,
  saveMastodonAppCredentialsAdmin,
} from "@/lib/db/firestore-admin";
import { verifyAuth } from "@/lib/auth";
import { signOAuthState } from "@/lib/oauth-state";
import {
  getMastodonAuthUrl,
  instanceToDocId,
  normalizeInstance,
  registerMastodonApp,
} from "@/lib/platforms/mastodon";

/**
 * Start Mastodon OAuth for a given user + instance. On first contact with a
 * new instance, Posty registers itself as an app via POST /api/v1/apps; the
 * returned client_id + client_secret are cached in Firestore so later users
 * on the same instance re-use them. Returns the authorize URL the client
 * should redirect to.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { userId: bodyUserId, instance } = (await request.json()) as {
      userId?: string;
      instance?: string;
    };
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId || !instance) {
      return NextResponse.json(
        { error: "Missing userId or instance" },
        { status: 400 }
      );
    }
    const normalized = normalizeInstance(instance);
    if (!normalized) {
      return NextResponse.json(
        { error: "URL d'instance invalide" },
        { status: 400 }
      );
    }
    if (!isAdminInitialized()) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai").trim();
    const redirectUri = `${baseUrl}/api/auth/mastodon/callback`;
    const docId = instanceToDocId(normalized);

    // Reuse cached app credentials if we've already registered on this instance.
    let creds = await getMastodonAppCredentialsAdmin(docId);
    if (!creds || creds.redirectUri !== redirectUri) {
      const registered = await registerMastodonApp({
        instance: normalized,
        redirectUri,
      });
      await saveMastodonAppCredentialsAdmin(docId, {
        instance: normalized,
        clientId: registered.clientId,
        clientSecret: registered.clientSecret,
        redirectUri,
      });
      creds = {
        instance: normalized,
        clientId: registered.clientId,
        clientSecret: registered.clientSecret,
        redirectUri,
        // Timestamp shape is only read by the callback for anything non-urgent;
        // `as any` avoids importing firebase-admin Timestamp here.
        registeredAt: null as any,
      };
    }

    // HMAC-signed state — the callback will reject anything not produced
    // by this server. Without the signature, an attacker could craft a
    // state with any victim uid and link tokens to that account.
    const nonce = crypto.randomUUID();
    const state = signOAuthState({
      userId,
      instance: normalized,
      nonce,
      kind: "mastodon",
    });

    const authUrl = getMastodonAuthUrl({
      instance: normalized,
      clientId: creds.clientId,
      redirectUri,
      state,
    });

    return NextResponse.json({ success: true, authUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mastodon OAuth start failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
