import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import {
  getInstagramConnectionAdmin,
  saveInstagramPostAdmin,
  updateInstagramLastUsedAdmin,
} from "@/lib/db/firestore-admin";
import { verifyAuth } from "@/lib/auth";
import {
  publishViaZernio,
  ZernioApiError,
} from "@/lib/integrations/zernio";

/**
 * Publish an Instagram post via Zernio.
 *
 * Hard requirement: Instagram refuses text-only posts. The payload MUST
 * include at least one publicly accessible image URL (typically a Firebase
 * Storage download URL produced by Posty's image generation pipeline).
 *
 * Caption character limit is 2200; we accept up to that and let the user
 * trim. Hashtags can either be in the caption or as a first comment — for
 * MVP we keep them in the caption and let the adapter handle structure.
 */
const INSTAGRAM_MAX_CAPTION = 2200;

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
    if (!imageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Instagram requiert une image. Génère ou ajoute une visuel avant de publier.",
        },
        { status: 400 },
      );
    }
    if (content.length > INSTAGRAM_MAX_CAPTION) {
      return NextResponse.json(
        {
          success: false,
          error: `Instagram limite la légende à ${INSTAGRAM_MAX_CAPTION} caractères`,
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

    const connection = await getInstagramConnectionAdmin(userId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: "Instagram non connecté" },
        { status: 404 },
      );
    }

    const result = await publishViaZernio({
      platform: "instagram",
      accountId: connection.zernioAccountId,
      content,
      mediaItems: [{ type: "image", url: imageUrl }],
    });

    if (result.status === "failed") {
      return NextResponse.json(
        { success: false, error: "La publication sur Instagram a échoué" },
        { status: 502 },
      );
    }

    const auditResults = await Promise.allSettled([
      updateInstagramLastUsedAdmin(userId),
      saveInstagramPostAdmin(userId, {
        zernioAccountId: connection.zernioAccountId,
        zernioPostId: result.postId,
        content,
        postUrl: result.platformPostUrl,
        success: true,
      }),
    ]);
    for (const r of auditResults) {
      if (r.status === "rejected") {
        console.error(
          "Instagram audit write failed (post still published):",
          r.reason,
        );
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
