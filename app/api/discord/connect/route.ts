import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { saveDiscordConnectionAdmin } from "@/lib/db/firestore-admin";
import { verifyAuth } from "@/lib/auth";
import {
  parseDiscordWebhookUrl,
  fetchDiscordWebhookInfo,
} from "@/lib/platforms/discord";

/**
 * Register a Discord incoming webhook for the current user. No OAuth — the
 * user pastes the webhook URL they created in their server. We validate the
 * URL by fetching the webhook metadata (GET returns 200 + JSON when valid).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { userId: bodyUserId, webhookUrl } = (await request.json()) as {
      userId?: string;
      webhookUrl?: string;
    };
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "URL de webhook requise" },
        { status: 400 }
      );
    }
    if (!isAdminInitialized()) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const parsed = parseDiscordWebhookUrl(webhookUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: "URL de webhook Discord invalide" },
        { status: 400 }
      );
    }

    const info = await fetchDiscordWebhookInfo(parsed.url);

    await saveDiscordConnectionAdmin(userId, {
      webhookUrl: parsed.url,
      webhookId: parsed.id,
      guildName: undefined, // not returned by the webhook GET; server name needs a bot token to resolve
      channelId: info.channelId,
      channelName: undefined,
      webhookName: info.name,
      webhookAvatar: info.avatar,
    });

    return NextResponse.json({
      success: true,
      webhookId: parsed.id,
      webhookName: info.name,
      channelId: info.channelId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect Discord webhook";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
