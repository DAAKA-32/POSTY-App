import { NextRequest, NextResponse } from "next/server";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { verifyAuth } from "@/lib/auth";
import { syncSingleLinkedInPostMetrics } from "@/lib/linkedin/metrics";
import { decryptToken } from "@/lib/crypto/token-cipher";

/**
 * Manual trigger: sync engagement metrics for the current user's LinkedIn
 * organization posts.
 *
 * Why a manual endpoint in addition to the Firebase Functions cron?
 *  - UX: users press "Refresh" on the analytics page and expect fresh numbers
 *        — they shouldn't have to wait up to 3 hours for the next cron tick.
 *  - Rate-limit friendly: limited to the requesting user's own posts, capped.
 *
 * Personal-profile posts are skipped: LinkedIn exposes no metrics endpoint
 * for `urn:li:person:*`, so there is nothing to refresh.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    if (!isAdminInitialized() || !adminDb) {
      return NextResponse.json(
        { error: "firebase_not_initialized", message: "Service temporairement indisponible." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const bodyUserId = body?.userId;
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;
    if (!userId) {
      return NextResponse.json(
        { error: "missing_user", message: "Utilisateur requis." },
        { status: 400 }
      );
    }

    // Load connection + token
    const connectionSnap = await adminDb.collection("linkedinConnections").doc(userId).get();
    if (!connectionSnap.exists) {
      return NextResponse.json(
        { error: "linkedin_not_connected", message: "Connexion LinkedIn introuvable." },
        { status: 401 }
      );
    }
    const connection = connectionSnap.data();
    if (!connection?.accessToken) {
      return NextResponse.json(
        { error: "linkedin_not_connected", message: "Token LinkedIn manquant." },
        { status: 401 }
      );
    }
    const decryptedAccessToken = decryptToken(connection.accessToken);
    if (connection.expiresAt?.toMillis?.() <= Date.now()) {
      return NextResponse.json(
        { error: "token_expired", message: "LinkedIn session expired. Reconnect to continue." },
        { status: 401 }
      );
    }

    // Fetch the user's organization posts (capped to avoid hammering the API)
    // then refresh each one. Personal posts are excluded at query time.
    const postsSnap = await adminDb
      .collection("linkedinPosts")
      .where("userId", "==", userId)
      .where("authorType", "==", "organization")
      .limit(50)
      .get();

    if (postsSnap.empty) {
      return NextResponse.json({
        success: true,
        scanned: 0,
        synced: 0,
        failed: 0,
        deleted: 0,
        message: "Aucun post d'entreprise à synchroniser.",
      });
    }

    let synced = 0;
    let failed = 0;
    let deleted = 0;

    await Promise.all(
      postsSnap.docs.map(async (doc) => {
        const data = doc.data();
        try {
          const outcome = await syncSingleLinkedInPostMetrics({
            adminDb: adminDb!,
            accessToken: decryptedAccessToken,
            post: {
              id: doc.id,
              userId: data.userId,
              linkedInId: data.linkedInId,
              organizationUrn: data.organizationUrn,
            },
          });
          if (outcome === "deleted") deleted++;
          else if (outcome === "synced") synced++;
          else failed++;
        } catch {
          failed++;
        }
      })
    );

    return NextResponse.json({
      success: true,
      scanned: postsSnap.size,
      synced,
      failed,
      deleted,
    });
  } catch (error) {
    console.error("LinkedIn sync-metrics error:", error);
    return NextResponse.json(
      {
        error: "unexpected_error",
        message: error instanceof Error ? error.message : "Erreur inattendue",
      },
      { status: 500 }
    );
  }
}
