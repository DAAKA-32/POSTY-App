import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { saveBlueskyConnectionAdmin } from "@/lib/db/firestore-admin";
import { verifyAuth } from "@/lib/auth";
import {
  createBlueskySession,
  fetchBlueskyProfile,
  normalizeHandle,
  BLUESKY_DEFAULT_SERVICE,
} from "@/lib/platforms/bluesky";

/**
 * Connect a user's Bluesky account using handle + app password.
 *
 * Bluesky has no OAuth flow: the user generates an app password at
 * https://bsky.app/settings/app-passwords and hands it to us. We exchange it
 * for an accessJwt/refreshJwt pair and only persist the tokens — the app
 * password itself is discarded.
 */
export async function POST(request: NextRequest) {
  try {
    // The userId is derived from the verified Firebase token; the body only
    // carries the credentials. Without this, an attacker who knew a victim's
    // uid could overwrite the victim's Bluesky session with their own.
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { handle, password, service, userId: bodyUserId } = body as {
      userId?: string;
      handle?: string;
      password?: string;
      service?: string;
    };

    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (!handle || !password) {
      return NextResponse.json(
        { error: "Handle and app password are required" },
        { status: 400 }
      );
    }
    if (!isAdminInitialized()) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const normalizedHandle = normalizeHandle(handle);
    const pds = service || BLUESKY_DEFAULT_SERVICE;

    const session = await createBlueskySession({
      identifier: normalizedHandle,
      password,
      service: pds,
    });

    let profileName: string | undefined;
    let profilePicture: string | undefined;
    try {
      const profile = await fetchBlueskyProfile({
        accessJwt: session.accessJwt,
        handle: session.handle,
        service: pds,
      });
      profileName = profile.displayName;
      profilePicture = profile.avatar;
    } catch {
      // Profile fetch is non-blocking — we have the session either way.
    }

    await saveBlueskyConnectionAdmin(userId, {
      handle: session.handle,
      did: session.did,
      service: pds,
      accessJwt: session.accessJwt,
      refreshJwt: session.refreshJwt,
      profileName,
      profilePicture,
    });

    return NextResponse.json({
      success: true,
      handle: session.handle,
      did: session.did,
      profileName,
      profilePicture,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect to Bluesky";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
