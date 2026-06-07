import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import {
  getThreadszConnectionAdmin,
  saveThreadszPostAdmin,
  updateThreadszLastUsedAdmin,
} from "@/lib/db/firestore-admin";
import { verifyAuth } from "@/lib/auth";
import { publishViaZernio, ZernioApiError } from "@/lib/integrations/zernio";

/**
 * Publish a Threads post via Zernio (the `threadsz` platform — distinct from
 * the native Meta Threads integration). Text-only: Threads accepts a plain
 * status, no title/subreddit. Optional image support can be added later via
 * Zernio `mediaItems`.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { userId: bodyUserId, content } = (await request.json()) as {
      userId?: string;
      content?: string;
    };
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId || !content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing userId or content" },
        { status: 400 },
      );
    }
    if (!isAdminInitialized()) {
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503 },
      );
    }

    const connection = await getThreadszConnectionAdmin(userId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: "Threads non connecté" },
        { status: 404 },
      );
    }

    const result = await publishViaZernio({
      platform: "threads",
      accountId: connection.zernioAccountId,
      content,
    });

    if (result.status === "failed") {
      return NextResponse.json(
        { success: false, error: "La publication sur Threads a échoué" },
        { status: 502 },
      );
    }

    const auditResults = await Promise.allSettled([
      updateThreadszLastUsedAdmin(userId),
      saveThreadszPostAdmin(userId, {
        zernioAccountId: connection.zernioAccountId,
        zernioPostId: result.postId,
        content,
        postUrl: result.platformPostUrl,
        success: true,
      }),
    ]);
    for (const r of auditResults) {
      if (r.status === "rejected") {
        console.error("Threads audit write failed (post still published):", r.reason);
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
