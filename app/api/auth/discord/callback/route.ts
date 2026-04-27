import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { saveDiscordConnectionAdmin } from "@/lib/db/firestore-admin";
import { exchangeDiscordCode, parseDiscordWebhookUrl } from "@/lib/platforms/discord";
import { verifyOAuthState } from "@/lib/oauth-state";

/**
 * Callback for the Discord OAuth2 flow with `webhook.incoming` scope.
 * Exchanges the auth code for a token response whose `webhook` object
 * contains everything we need: url, id, token, channel_id, guild_id.
 *
 * Trust model: this endpoint can NOT verify a Firebase Bearer token because
 * the request is a redirect from Discord — browser redirects strip custom
 * headers. Instead we trust the `state` parameter, which we HMAC-signed at
 * connect time using `signOAuthState({ userId, ... })`. Any tampering or
 * forging by an attacker fails verification and we reject the request.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?discord_error=${encodeURIComponent(error)}`, request.url)
      );
    }
    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?discord_error=missing_code", request.url)
      );
    }

    const verified = verifyOAuthState<{ userId: string; kind: string }>(state);
    if (!verified || verified.kind !== "discord" || !verified.userId) {
      return NextResponse.redirect(
        new URL("/settings?discord_error=invalid_state", request.url)
      );
    }
    const userId = verified.userId;

    if (!isAdminInitialized()) {
      return NextResponse.redirect(
        new URL("/settings?discord_error=service_unavailable", request.url)
      );
    }

    const tokenData = await exchangeDiscordCode(code);
    const webhook = tokenData.webhook;
    if (!webhook?.url) {
      return NextResponse.redirect(
        new URL("/settings?discord_error=no_webhook", request.url)
      );
    }

    const parsed = parseDiscordWebhookUrl(webhook.url);
    const avatarUrl = webhook.avatar
      ? `https://cdn.discordapp.com/avatars/${webhook.id}/${webhook.avatar}.png`
      : undefined;

    await saveDiscordConnectionAdmin(userId, {
      webhookUrl: webhook.url,
      webhookId: parsed?.id || webhook.id,
      guildName: undefined,
      channelId: webhook.channel_id,
      channelName: undefined,
      webhookName: webhook.name || undefined,
      webhookAvatar: avatarUrl,
    });

    return NextResponse.redirect(
      new URL("/settings?discord_success=true", request.url)
    );
  } catch (err) {
    console.error("Discord OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/settings?discord_error=unexpected", request.url)
    );
  }
}
