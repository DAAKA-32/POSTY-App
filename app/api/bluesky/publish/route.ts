import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import {
  getBlueskyConnectionAdmin,
  saveBlueskyPostAdmin,
  updateBlueskyLastUsedAdmin,
  updateBlueskySessionAdmin,
} from "@/lib/db/firestore-admin";
import { verifyAuth } from "@/lib/auth";
import {
  BLUESKY_MAX_POST_LENGTH,
  createBlueskyPost,
  refreshBlueskySession,
} from "@/lib/platforms/bluesky";

/**
 * Publish a text post to Bluesky. Handles access token refresh transparently
 * when the stored accessJwt has expired.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { userId: bodyUserId, content } = body as { userId?: string; content?: string };
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId || !content) {
      return NextResponse.json(
        { success: false, error: "Missing userId or content" },
        { status: 400 }
      );
    }
    if (content.length > BLUESKY_MAX_POST_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Bluesky posts are limited to ${BLUESKY_MAX_POST_LENGTH} characters`,
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

    const connection = await getBlueskyConnectionAdmin(userId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: "No Bluesky connection" },
        { status: 404 }
      );
    }

    let accessJwt = connection.accessJwt;
    let refreshJwt = connection.refreshJwt;

    // Try publishing; on 401/auth error, refresh the session and retry once.
    let result = await createBlueskyPost({
      accessJwt,
      did: connection.did,
      text: content,
      service: connection.service,
      handle: connection.handle,
    });

    if (!result.success && isAuthError(result.error)) {
      try {
        const refreshed = await refreshBlueskySession({
          refreshJwt,
          service: connection.service,
        });
        accessJwt = refreshed.accessJwt;
        refreshJwt = refreshed.refreshJwt;
        await updateBlueskySessionAdmin(userId, {
          accessJwt: refreshed.accessJwt,
          refreshJwt: refreshed.refreshJwt,
          handle: refreshed.handle,
          did: refreshed.did,
        });
        result = await createBlueskyPost({
          accessJwt,
          did: refreshed.did,
          text: content,
          service: connection.service,
          handle: refreshed.handle,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Session refresh failed";
        return NextResponse.json(
          { success: false, error: message },
          { status: 401 }
        );
      }
    }

    if (result.success && result.uri && result.cid) {
      // Audit writes use allSettled: the Bluesky post already shipped, so a
      // Firestore failure must NOT trigger a 500 (the client would retry and
      // double-post on Bluesky). Log the failure, return success.
      const auditResults = await Promise.allSettled([
        updateBlueskyLastUsedAdmin(userId),
        saveBlueskyPostAdmin(userId, {
          did: connection.did,
          uri: result.uri,
          cid: result.cid,
          content,
          postUrl: result.postUrl,
          success: true,
        }),
      ]);
      for (const r of auditResults) {
        if (r.status === "rejected") {
          console.error("Bluesky audit write failed (post still published):", r.reason);
        }
      }
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: result.error || "Bluesky post failed" },
      { status: 502 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function isAuthError(message?: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("expiredtoken") ||
    m.includes("invalidtoken") ||
    m.includes("unauthorized") ||
    m.includes("auth")
  );
}
