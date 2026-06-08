import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { verifyAuth } from "@/lib/auth";
import { signOAuthState } from "@/lib/oauth-state";
import {
  getInstagramConnectionAdmin,
  getRedditConnectionAdmin,
  getThreadszConnectionAdmin,
  getXConnectionAdmin,
  getZernioProfileIdAdmin,
  saveZernioProfileAdmin,
} from "@/lib/db/firestore-admin";
import {
  createZernioProfile,
  getZernioConnectUrl,
  ZernioApiError,
} from "@/lib/integrations/zernio";
import { POSTY_TO_ZERNIO_PLATFORM } from "@/lib/config/zernio-constants";

/**
 * Start Zernio-managed OAuth for connecting an X or Instagram account.
 *
 * Flow:
 *   1. Verify the Firebase user
 *   2. Resolve (or lazily create) this user's Zernio profile
 *   3. Ask Zernio for the OAuth `authUrl` for the requested platform
 *   4. HMAC-sign a state describing (userId, platform, profileId) and stash
 *      it in an HttpOnly cookie — the callback reads it back to know who
 *      authorized what. We use a cookie (not the OAuth `state` query) because
 *      Zernio sits between Posty and the real OAuth provider and we cannot
 *      assume our `state` round-trips intact.
 *   5. Return the `authUrl` to the client, which performs the redirect
 *
 * Mirrors the LinkedIn/Mastodon start pattern so the front-end can call this
 * identically. `[platform]` is "x" or "instagram" (Posty's internal naming).
 */
const STATE_COOKIE = "posty_zernio_oauth";
const STATE_TTL_SECONDS = 10 * 60;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ platform: string }> },
) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { platform: rawPlatform } = await context.params;
    const zernioPlatform = POSTY_TO_ZERNIO_PLATFORM[rawPlatform];
    if (!zernioPlatform) {
      return NextResponse.json(
        { error: `Unsupported platform: ${rawPlatform}` },
        { status: 400 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      userId?: string;
    };
    const userId = auth.uid === "__dev_bypass__" ? body.userId : auth.uid;
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 },
      );
    }

    if (!isAdminInitialized()) {
      return NextResponse.json(
        { error: "Service unavailable" },
        { status: 503 },
      );
    }

    // ── Refuse a second account on the same platform via Zernio ─────────
    // Zernio's free tier covers 2 connected accounts per profile; we map
    // 1 Posty user = 1 Zernio profile, and gate users to X + Instagram.
    // Allowing a second X (or second IG) for the same user would push them
    // to the 3rd account that's billed $6/month. Refuse cleanly with a
    // message that nudges to disconnect first.
    const existing =
      zernioPlatform === "twitter"
        ? await getXConnectionAdmin(userId)
        : zernioPlatform === "instagram"
          ? await getInstagramConnectionAdmin(userId)
          : zernioPlatform === "threads"
            ? await getThreadszConnectionAdmin(userId)
            : await getRedditConnectionAdmin(userId);
    if (existing?.zernioAccountId) {
      return NextResponse.json(
        {
          error:
            "Un compte est déjà connecté pour ce réseau. Déconnecte-le avant d'en relier un autre.",
          alreadyConnected: true,
        },
        { status: 409 },
      );
    }

    // ── Get or create Zernio profile for this Posty user ─────────────────
    // Lazy creation: most users will never use Zernio (they only need the
    // native networks). We only spin up a Zernio profile the first time a
    // user connects a Zernio-backed network.
    const createAndSaveProfile = async (): Promise<string | null> => {
      const profile = await createZernioProfile({
        name: `posty-user-${userId}`,
        description: "Auto-created by Posty for this user",
      });
      if (!profile?._id) return null;
      // .set() overwrites any stale zernioProfiles doc.
      await saveZernioProfileAdmin(userId, profile._id);
      return profile._id;
    };

    let zernioProfileId = await getZernioProfileIdAdmin(userId);
    if (!zernioProfileId) {
      zernioProfileId = await createAndSaveProfile();
      if (!zernioProfileId) {
        return NextResponse.json(
          { error: "Zernio refused to create profile" },
          { status: 502 },
        );
      }
    }

    // ── Ask Zernio for the authUrl (self-healing on a stale profile) ─────
    // A profileId minted under a PREVIOUS ZERNIO_API_KEY (a different Zernio
    // org) 404s under the current key — Zernio replies "Profile not found".
    // When that happens, recreate the profile (overwriting the stale
    // zernioProfiles doc) and retry once, so a key rotation self-heals
    // instead of permanently breaking every connect.
    let authUrl: string | undefined;
    try {
      ({ authUrl } = await getZernioConnectUrl({
        platform: zernioPlatform,
        profileId: zernioProfileId,
      }));
    } catch (err) {
      const staleProfile =
        err instanceof ZernioApiError &&
        (err.status === 404 || /profile not found/i.test(err.message));
      if (!staleProfile) throw err;
      const fresh = await createAndSaveProfile();
      if (!fresh) {
        return NextResponse.json(
          { error: "Zernio refused to create profile" },
          { status: 502 },
        );
      }
      zernioProfileId = fresh;
      ({ authUrl } = await getZernioConnectUrl({
        platform: zernioPlatform,
        profileId: zernioProfileId,
      }));
    }
    if (!authUrl) {
      return NextResponse.json(
        { error: "Zernio did not return an authUrl" },
        { status: 502 },
      );
    }

    // ── Sign state into a cookie ─────────────────────────────────────────
    // The cookie binds the OAuth round-trip to (userId, platform, profileId).
    // The callback validates HMAC + TTL before trusting any of those values.
    const state = signOAuthState({
      userId,
      platform: rawPlatform,
      zernioPlatform,
      zernioProfileId,
      kind: "zernio",
    });

    const response = NextResponse.json({ success: true, authUrl });
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: STATE_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    const message =
      error instanceof ZernioApiError
        ? `Zernio API error: ${error.message}`
        : error instanceof Error
          ? error.message
          : "Zernio OAuth start failed";
    const status = error instanceof ZernioApiError ? 502 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}
