import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import {
  getMastodonAppCredentialsAdmin,
  saveMastodonConnectionAdmin,
} from "@/lib/db/firestore-admin";
import { verifyOAuthState } from "@/lib/oauth-state";
import {
  exchangeMastodonCode,
  instanceToDocId,
  verifyMastodonCredentials,
} from "@/lib/platforms/mastodon";

/**
 * Mastodon OAuth2 callback. Decodes state to recover (userId, instance),
 * exchanges the code for an access token using cached app credentials, and
 * saves the connection.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?mastodon_error=${encodeURIComponent(error)}`, request.url)
      );
    }
    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?mastodon_error=missing_code", request.url)
      );
    }

    // Verify the HMAC-signed state. Any tampering, expired state, or wrong
    // `kind` is a hard fail — without this check an attacker could pass a
    // forged state with any victim's uid.
    const verified = verifyOAuthState<{
      userId: string;
      instance: string;
      kind: string;
    }>(state);
    if (
      !verified ||
      verified.kind !== "mastodon" ||
      !verified.userId ||
      !verified.instance
    ) {
      return NextResponse.redirect(
        new URL("/settings?mastodon_error=invalid_state", request.url)
      );
    }
    const userId = verified.userId;
    const instance = verified.instance;
    if (!isAdminInitialized()) {
      return NextResponse.redirect(
        new URL("/settings?mastodon_error=service_unavailable", request.url)
      );
    }

    const creds = await getMastodonAppCredentialsAdmin(instanceToDocId(instance));
    if (!creds) {
      return NextResponse.redirect(
        new URL("/settings?mastodon_error=app_not_registered", request.url)
      );
    }

    const tokenResponse = await exchangeMastodonCode({
      instance,
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      redirectUri: creds.redirectUri,
      code,
    });

    const account = await verifyMastodonCredentials({
      instance,
      accessToken: tokenResponse.access_token,
    });

    await saveMastodonConnectionAdmin(userId, {
      instance,
      accountId: account.id,
      username: account.username,
      acct: account.acct,
      accessToken: tokenResponse.access_token,
      profileName: account.display_name || undefined,
      profilePicture: account.avatar || undefined,
    });

    return NextResponse.redirect(
      new URL("/settings?mastodon_success=true", request.url)
    );
  } catch (err) {
    console.error("Mastodon OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/settings?mastodon_error=unexpected", request.url)
    );
  }
}
