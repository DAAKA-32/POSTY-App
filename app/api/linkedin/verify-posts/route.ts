import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { getLinkedInConnectionAdmin } from "@/lib/db/firestore-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/linkedin/verify-posts
 *
 * Verifies which LinkedIn posts still exist on the platform.
 * Posts that return 404 are marked as deletedFromPlatform in Firestore.
 *
 * Body: { postIds?: string[] }
 *   - If postIds provided, only checks those posts
 *   - If omitted, checks all user's published posts
 *
 * Returns: { verified: number, deleted: string[], kept: number }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    if (!isAdminInitialized() || !adminDb) {
      return NextResponse.json(
        { error: "Service temporairement indisponible." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const userId = auth.uid === "__dev_bypass__" ? body.userId : auth.uid;

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    // Get LinkedIn connection (need access token)
    const connection = await getLinkedInConnectionAdmin(userId);
    if (!connection) {
      return NextResponse.json(
        { error: "no_connection", message: "Aucune connexion LinkedIn trouvee." },
        { status: 404 }
      );
    }

    // Check token expiry
    const expiresAt = connection.expiresAt?.toDate?.();
    if (expiresAt && expiresAt < new Date()) {
      return NextResponse.json(
        { error: "token_expired", message: "LinkedIn session expired. Reconnect to continue." },
        { status: 401 }
      );
    }

    // Fetch posts to verify
    const postsRef = adminDb.collection("linkedinPosts");
    let postsQuery = postsRef
      .where("userId", "==", userId)
      .where("success", "==", true);

    // Only check posts that are not already marked as deleted
    // Firestore doesn't support != on missing fields, so we'll filter in memory

    const snapshot = await postsQuery.get();

    // Filter: only posts not already marked, and optionally only specific IDs
    const requestedIds: string[] | undefined = body.postIds;
    const postsToVerify = snapshot.docs.filter((doc) => {
      const data = doc.data();
      if (data.deletedFromPlatform) return false;
      if (!data.linkedInId) return false;
      if (requestedIds && !requestedIds.includes(doc.id)) return false;
      return true;
    });

    if (postsToVerify.length === 0) {
      return NextResponse.json({ verified: 0, deleted: [], kept: 0 });
    }

    // Verify each post on LinkedIn (batch, max 20 at a time to avoid rate limits)
    const maxToCheck = Math.min(postsToVerify.length, 20);
    const deletedIds: string[] = [];
    const batch = adminDb.batch();

    for (let i = 0; i < maxToCheck; i++) {
      const postDoc = postsToVerify[i];
      const linkedInShareId = postDoc.data().linkedInId;

      const exists = await checkPostExistsOnLinkedIn(
        linkedInShareId,
        connection.accessToken
      );

      if (!exists) {
        deletedIds.push(postDoc.id);
        batch.update(postDoc.ref, {
          deletedFromPlatform: true,
          deletedFromPlatformAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // Commit all deletions in one batch
    if (deletedIds.length > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      verified: maxToCheck,
      deleted: deletedIds,
      kept: maxToCheck - deletedIds.length,
    });
  } catch (error) {
    console.error("Verify posts error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la verification." },
      { status: 500 }
    );
  }
}

/**
 * Check if a LinkedIn post still exists by fetching it via the API.
 * Returns true if the post exists, false if it was deleted (404/403).
 */
async function checkPostExistsOnLinkedIn(
  shareId: string,
  accessToken: string
): Promise<boolean> {
  try {
    // LinkedIn UGC API: GET a specific post by its URN
    // shareId is typically like "urn:li:share:123456" or just the raw ID
    const urn = shareId.startsWith("urn:") ? shareId : shareId;

    const response = await fetch(
      `https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(urn)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    // 200 = exists, 404 = deleted, 403 = deleted or no access
    if (response.ok) return true;
    if (response.status === 404 || response.status === 403) return false;

    // Other errors (rate limit, server error) — assume exists to be safe
    return true;
  } catch {
    // Network error — assume exists to be safe
    return true;
  }
}
