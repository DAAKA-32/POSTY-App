import { NextRequest, NextResponse } from "next/server";
import { getThreadsConnectionAdmin, saveThreadsConnectionAdmin } from "@/lib/db/firestore-admin";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { THREADS_CONFIG } from "@/lib/platforms/meta";
import { verifyAuth } from "@/lib/auth";

/**
 * POST /api/threads/refresh
 * Refresh a Threads long-lived token before it expires.
 * Threads long-lived tokens can be refreshed if they have at least 24h remaining.
 * Returns a new token valid for 60 days.
 *
 * SECURITY: userId comes from the verified Firebase token, never from the request body.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;
    const userId = auth.uid;

    if (!isAdminInitialized()) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const connection = await getThreadsConnectionAdmin(userId);
    if (!connection) {
      return NextResponse.json({ error: "No Threads connection found" }, { status: 404 });
    }

    const currentToken = connection.accessToken;
    const currentExpiresAt = connection.expiresAt.toDate();

    // Check if token is already expired
    if (currentExpiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Token expired, reconnection required", reconnectRequired: true },
        { status: 401 }
      );
    }

    // Refresh the long-lived token
    const refreshParams = new URLSearchParams({
      grant_type: "th_refresh_token",
      access_token: currentToken,
    });

    const refreshResponse = await fetch(
      `${THREADS_CONFIG.longLivedTokenUrl}?${refreshParams.toString()}`
    );

    const refreshText = await refreshResponse.text();

    if (!refreshResponse.ok) {
      console.error("Threads token refresh failed:", refreshResponse.status, refreshText);
      return NextResponse.json(
        { error: "Refresh failed", reconnectRequired: true },
        { status: 400 }
      );
    }

    const refreshData = JSON.parse(refreshText);

    if (!refreshData.access_token) {
      console.error("Threads refresh: no access_token in response");
      return NextResponse.json(
        { error: "Invalid refresh response", reconnectRequired: true },
        { status: 400 }
      );
    }

    const newExpiresIn = refreshData.expires_in || 5184000;
    const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000);

    // Update the connection in Firestore
    await saveThreadsConnectionAdmin(userId, {
      threadsId: connection.threadsId,
      username: connection.username,
      accessToken: refreshData.access_token,
      expiresAt: newExpiresAt,
      profileName: connection.profileName,
      profilePicture: connection.profilePicture || undefined,
    });

    console.log(`Threads: Token refreshed for user ${userId}, expires in ${Math.round(newExpiresIn / 86400)} days`);

    return NextResponse.json({
      success: true,
      expiresAt: newExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Threads refresh error:", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
