import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import {
  getRedditConnectionAdmin,
  saveRedditPostAdmin,
  updateRedditLastUsedAdmin,
} from "@/lib/db/firestore-admin";
import { verifyAuth } from "@/lib/auth";
import {
  publishViaZernio,
  ZernioApiError,
} from "@/lib/integrations/zernio";

/**
 * Publish a Reddit post via Zernio.
 *
 * Reddit needs three things every time:
 *   - `subreddit`: the target community ("entrepreneur", "AskReddit", …
 *      with or without leading "r/" — we strip it server-side)
 *   - `title`: Reddit posts MUST have a title (≤ 300 chars)
 *   - `content`: the body (optional for link posts, required for text posts;
 *      we treat it as required for now since the publish UI is text-only)
 *
 * Subreddits enforce their own per-community posting rules (account age,
 * karma minimums, formatting). Reddit will reject the publish at the
 * subreddit level — we surface whatever error Zernio bubbles up.
 */
const REDDIT_TITLE_MAX = 300;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const {
      userId: bodyUserId,
      content,
      title,
      subreddit,
    } = (await request.json()) as {
      userId?: string;
      content?: string;
      title?: string;
      subreddit?: string;
    };
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId || !content) {
      return NextResponse.json(
        { success: false, error: "Missing userId or content" },
        { status: 400 },
      );
    }
    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Un titre est requis pour publier sur Reddit." },
        { status: 400 },
      );
    }
    if (title.length > REDDIT_TITLE_MAX) {
      return NextResponse.json(
        {
          success: false,
          error: `Reddit limite le titre à ${REDDIT_TITLE_MAX} caractères`,
        },
        { status: 400 },
      );
    }
    if (!subreddit || !subreddit.trim()) {
      return NextResponse.json(
        { success: false, error: "Choisis un subreddit cible avant de publier." },
        { status: 400 },
      );
    }
    if (!isAdminInitialized()) {
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503 },
      );
    }

    const connection = await getRedditConnectionAdmin(userId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: "Reddit non connecté" },
        { status: 404 },
      );
    }

    const cleanedSubreddit = subreddit.replace(/^r\//, "").trim();

    const result = await publishViaZernio({
      platform: "reddit",
      accountId: connection.zernioAccountId,
      content,
      reddit: {
        subreddit: cleanedSubreddit,
        title: title.trim(),
      },
    });

    if (result.status === "failed") {
      return NextResponse.json(
        { success: false, error: "La publication sur Reddit a échoué" },
        { status: 502 },
      );
    }

    const auditResults = await Promise.allSettled([
      updateRedditLastUsedAdmin(userId),
      saveRedditPostAdmin(userId, {
        zernioAccountId: connection.zernioAccountId,
        zernioPostId: result.postId,
        subreddit: cleanedSubreddit,
        title: title.trim(),
        content,
        postUrl: result.platformPostUrl,
        success: true,
      }),
    ]);
    for (const r of auditResults) {
      if (r.status === "rejected") {
        console.error("Reddit audit write failed (post still published):", r.reason);
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
