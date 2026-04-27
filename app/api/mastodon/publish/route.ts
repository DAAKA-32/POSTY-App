import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import {
  getMastodonConnectionAdmin,
  saveMastodonPostAdmin,
  updateMastodonLastUsedAdmin,
} from "@/lib/db/firestore-admin";
import { verifyAuth } from "@/lib/auth";
import {
  MASTODON_DEFAULT_MAX_LENGTH,
  createMastodonStatus,
} from "@/lib/platforms/mastodon";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { userId: bodyUserId, content, visibility } = (await request.json()) as {
      userId?: string;
      content?: string;
      visibility?: "public" | "unlisted" | "private" | "direct";
    };
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId || !content) {
      return NextResponse.json(
        { success: false, error: "Missing userId or content" },
        { status: 400 }
      );
    }
    // Vanilla-instance baseline. Instances with higher limits will accept
    // longer content — we keep the guard lenient.
    if (content.length > MASTODON_DEFAULT_MAX_LENGTH * 2) {
      return NextResponse.json(
        {
          success: false,
          error: `Mastodon status trop long (${content.length} caractères)`,
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

    const connection = await getMastodonConnectionAdmin(userId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: "No Mastodon connection" },
        { status: 404 }
      );
    }

    const result = await createMastodonStatus({
      instance: connection.instance,
      accessToken: connection.accessToken,
      text: content,
      visibility,
    });

    if (result.success && result.statusId) {
      await Promise.all([
        updateMastodonLastUsedAdmin(userId),
        saveMastodonPostAdmin(userId, {
          instance: connection.instance,
          accountId: connection.accountId,
          statusId: result.statusId,
          content,
          postUrl: result.postUrl,
          success: true,
        }),
      ]);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: result.error || "Mastodon post failed" },
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
