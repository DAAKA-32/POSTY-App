import { NextRequest, NextResponse } from "next/server";
import { getDiscordAuthUrl, isDiscordOAuthConfigured } from "@/lib/platforms/discord";
import { verifyAuth } from "@/lib/auth";
import { signOAuthState } from "@/lib/oauth-state";

/**
 * Kick off the Discord OAuth2 flow with the `webhook.incoming` scope.
 *
 * POST instead of GET because Firebase ID tokens travel in the Authorization
 * header — browser redirects (which a `<a href>` to a GET would be) strip
 * custom headers, leaving us no way to authenticate the caller. The frontend
 * calls this with `authFetch`, receives `{ authUrl }`, and does
 * `window.location = authUrl` itself.
 *
 * The returned authUrl carries a state string that we HMAC-sign with the
 * authenticated uid baked in. The callback verifies that signature before
 * trusting the uid — without it, an attacker could call the callback with
 * any uid in the state and link their Discord webhook to a victim's account.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  if (!isDiscordOAuthConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Discord OAuth is not configured on this server." },
      { status: 503 }
    );
  }

  const userId = auth.uid;
  const nonce = crypto.randomUUID();
  const state = signOAuthState({ userId, nonce, kind: "discord" });
  const authUrl = getDiscordAuthUrl(state);

  return NextResponse.json({ success: true, authUrl });
}
