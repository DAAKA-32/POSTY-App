import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import {
  getBlueskyConnectionAdmin,
  updateBlueskySessionAdmin,
} from "@/lib/db/firestore-admin";
import { verifyAuth } from "@/lib/auth";
import { refreshBlueskySession } from "@/lib/platforms/bluesky";

/**
 * Force-refresh the Bluesky session JWTs using the stored refreshJwt.
 * Called opportunistically from the client when the connection is stale.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { userId: bodyUserId } = (await request.json()) as { userId?: string };
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (!isAdminInitialized()) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const connection = await getBlueskyConnectionAdmin(userId);
    if (!connection) {
      return NextResponse.json({ error: "No Bluesky connection" }, { status: 404 });
    }

    const refreshed = await refreshBlueskySession({
      refreshJwt: connection.refreshJwt,
      service: connection.service,
    });

    await updateBlueskySessionAdmin(userId, {
      accessJwt: refreshed.accessJwt,
      refreshJwt: refreshed.refreshJwt,
      handle: refreshed.handle,
      did: refreshed.did,
    });

    return NextResponse.json({
      success: true,
      handle: refreshed.handle,
      did: refreshed.did,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed";
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
}
