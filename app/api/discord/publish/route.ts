import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import {
  getDiscordConnectionAdmin,
  saveDiscordPostAdmin,
  updateDiscordLastUsedAdmin,
} from "@/lib/db/firestore-admin";
import { verifyAuth } from "@/lib/auth";
import {
  DISCORD_MAX_CONTENT_LENGTH,
  createDiscordMessage,
} from "@/lib/platforms/discord";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { userId: bodyUserId, content } = (await request.json()) as {
      userId?: string;
      content?: string;
    };
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId || !content) {
      return NextResponse.json(
        { success: false, error: "Missing userId or content" },
        { status: 400 }
      );
    }
    if (content.length > DISCORD_MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Discord limite les messages à ${DISCORD_MAX_CONTENT_LENGTH} caractères`,
        },
        { status: 400 }
      );
    }
    if (!isAdminInitialized()) {
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503 }
      );
    }

    const connection = await getDiscordConnectionAdmin(userId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: "No Discord webhook configured" },
        { status: 404 }
      );
    }

    const result = await createDiscordMessage({
      webhookUrl: connection.webhookUrl,
      content,
    });

    if (result.success) {
      // Audit writes use allSettled: the Discord post already shipped, so a
      // Firestore failure must NOT trigger a 500 (the client would retry and
      // double-post on Discord). Log the failure, return success.
      const auditResults = await Promise.allSettled([
        updateDiscordLastUsedAdmin(userId),
        saveDiscordPostAdmin(userId, {
          webhookId: connection.webhookId,
          messageId: result.messageId,
          content,
          postUrl: result.postUrl,
          success: true,
        }),
      ]);
      for (const r of auditResults) {
        if (r.status === "rejected") {
          console.error("Discord audit write failed (post still published):", r.reason);
        }
      }
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: result.error || "Discord post failed" },
      { status: 502 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
