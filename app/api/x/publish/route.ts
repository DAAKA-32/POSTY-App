import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import {
  getXConnectionAdmin,
  saveXPostAdmin,
  updateXLastUsedAdmin,
} from "@/lib/db/firestore-admin";
import { verifyAuth } from "@/lib/auth";
import {
  publishViaZernio,
  ZernioApiError,
} from "@/lib/integrations/zernio";

/**
 * Publish a tweet via Zernio.
 *
 * X/Twitter content limit is 280 characters. Posty enforces it client-side
 * via the content adapter, but we re-check server-side to refuse malformed
 * payloads cleanly (zernio's error would be opaque).
 *
 * Optional `imageUrl` attaches an image — Zernio fetches it server-side, so
 * it must be a publicly accessible HTTPS URL (typically a Firebase Storage
 * download URL produced by Posty's image generation pipeline).
 */
const TWITTER_MAX_CHARS = 280;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const {
      userId: bodyUserId,
      content,
      imageUrl,
    } = (await request.json()) as {
      userId?: string;
      content?: string;
      imageUrl?: string;
    };
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId || !content) {
      return NextResponse.json(
        { success: false, error: "Missing userId or content" },
        { status: 400 },
      );
    }
    if (content.length > TWITTER_MAX_CHARS) {
      return NextResponse.json(
        {
          success: false,
          error: `X limite les posts à ${TWITTER_MAX_CHARS} caractères`,
        },
        { status: 400 },
      );
    }
    if (!isAdminInitialized()) {
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503 },
      );
    }

    const connection = await getXConnectionAdmin(userId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: "X non connecté" },
        { status: 404 },
      );
    }

    const result = await publishViaZernio({
      platform: "twitter",
      accountId: connection.zernioAccountId,
      content,
      mediaItems: imageUrl ? [{ type: "image", url: imageUrl }] : undefined,
    });

    if (result.status === "failed") {
      return NextResponse.json(
        { success: false, error: "La publication sur X a échoué" },
        { status: 502 },
      );
    }

    // Decouple audit writes from the publish result — see comment in
    // discord/publish/route.ts for rationale.
    const auditResults = await Promise.allSettled([
      updateXLastUsedAdmin(userId),
      saveXPostAdmin(userId, {
        zernioAccountId: connection.zernioAccountId,
        zernioPostId: result.postId,
        content,
        postUrl: result.platformPostUrl,
        success: true,
      }),
    ]);
    for (const r of auditResults) {
      if (r.status === "rejected") {
        console.error("X audit write failed (post still published):", r.reason);
      }
    }

    return NextResponse.json({
      success: true,
      postId: result.postId,
      postUrl: result.platformPostUrl,
    });
  } catch (error) {
    const message =
      error instanceof ZernioApiError
        ? `Zernio: ${error.message}`
        : error instanceof Error
          ? error.message
          : "Unexpected error";
    const status = error instanceof ZernioApiError ? 502 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
