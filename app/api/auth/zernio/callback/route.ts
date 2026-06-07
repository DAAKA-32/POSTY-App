import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { verifyOAuthState } from "@/lib/oauth-state";
import {
  getInstagramConnectionAdmin,
  getRedditConnectionAdmin,
  getThreadszConnectionAdmin,
  getXConnectionAdmin,
  saveInstagramConnectionAdmin,
  saveRedditConnectionAdmin,
  saveThreadszConnectionAdmin,
  saveXConnectionAdmin,
} from "@/lib/db/firestore-admin";
import { listZernioAccounts } from "@/lib/integrations/zernio";

/**
 * Zernio OAuth callback.
 *
 * Zernio redirects the user here after they complete the platform-side
 * authorization (X/Twitter or Instagram). The redirect URI is configured
 * once in the Zernio dashboard — `https://postyapp.ai/api/auth/zernio/callback`
 * — so all platforms share this single route.
 *
 * We don't trust anything in the query string. We rely on the HMAC-signed
 * `posty_zernio_oauth` cookie set by the `/start` route, which encodes
 * (userId, platform, zernioProfileId). After validation we list the
 * accounts currently attached to that profile, find the one matching the
 * platform, and persist it in `xConnections` / `instagramConnections`.
 *
 * Idempotent: if the user re-connects the same account, we overwrite the
 * existing connection doc. If they have multiple accounts on the same
 * platform we keep the most recently-added one (Zernio sorts newest first).
 */

const STATE_COOKIE = "posty_zernio_oauth";

function redirectWithStatus(
  request: NextRequest,
  platform: string,
  params: Record<string, string>,
): NextResponse {
  const url = new URL("/settings", request.url);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  url.searchParams.set("zernio_platform", platform);
  const response = NextResponse.redirect(url);
  // Clear the one-shot state cookie regardless of outcome
  response.cookies.set(STATE_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}

export async function GET(request: NextRequest) {
  // Default platform fallback if cookie can't be read (used only for error redirect)
  let platformForRedirect = "unknown";

  try {
    const cookieValue = request.cookies.get(STATE_COOKIE)?.value;
    if (!cookieValue) {
      return redirectWithStatus(request, platformForRedirect, {
        zernio_error: "missing_state",
      });
    }

    const verified = verifyOAuthState<{
      userId: string;
      platform: string;
      zernioPlatform: string;
      zernioProfileId: string;
      kind: string;
    }>(cookieValue);
    if (
      !verified ||
      verified.kind !== "zernio" ||
      !verified.userId ||
      !verified.zernioProfileId
    ) {
      return redirectWithStatus(request, platformForRedirect, {
        zernio_error: "invalid_state",
      });
    }
    platformForRedirect = verified.platform;

    // ── Surface a Zernio-side error if present ───────────────────────────
    const zernioError = request.nextUrl.searchParams.get("error");
    if (zernioError) {
      return redirectWithStatus(request, platformForRedirect, {
        zernio_error: zernioError,
      });
    }

    if (!isAdminInitialized()) {
      return redirectWithStatus(request, platformForRedirect, {
        zernio_error: "service_unavailable",
      });
    }

    // ── Resolve the freshly-connected account ────────────────────────────
    // We list accounts of the profile and pick the one matching the
    // platform we asked OAuth for. If the user already had an account on
    // that platform connected, this still picks one (Zernio returns the
    // most recent first by default).
    const accounts = await listZernioAccounts({
      profileId: verified.zernioProfileId,
    });

    const matching = accounts.find((a) => a.platform === verified.zernioPlatform);
    if (!matching) {
      return redirectWithStatus(request, platformForRedirect, {
        zernio_error: "account_not_found_after_oauth",
      });
    }

    // ── Persist per-platform connection ──────────────────────────────────
    if (verified.zernioPlatform === "twitter") {
      const existing = await getXConnectionAdmin(verified.userId);
      // Re-save: overwrite always so a re-connect refreshes username/avatar.
      await saveXConnectionAdmin(verified.userId, {
        zernioAccountId: matching._id,
        zernioProfileId: verified.zernioProfileId,
        username: matching.username,
        profilePicture: matching.profilePicture,
      });
      void existing; // touched-but-ignored marker
    } else if (verified.zernioPlatform === "instagram") {
      const existing = await getInstagramConnectionAdmin(verified.userId);
      await saveInstagramConnectionAdmin(verified.userId, {
        zernioAccountId: matching._id,
        zernioProfileId: verified.zernioProfileId,
        username: matching.username,
        profilePicture: matching.profilePicture,
      });
      void existing;
    } else if (verified.zernioPlatform === "reddit") {
      const existing = await getRedditConnectionAdmin(verified.userId);
      await saveRedditConnectionAdmin(verified.userId, {
        zernioAccountId: matching._id,
        zernioProfileId: verified.zernioProfileId,
        username: matching.username,
        profilePicture: matching.profilePicture,
      });
      void existing;
    } else if (verified.zernioPlatform === "threads") {
      // Threads via Zernio (Posty key "threadsz") — distinct from native Meta.
      const existing = await getThreadszConnectionAdmin(verified.userId);
      await saveThreadszConnectionAdmin(verified.userId, {
        zernioAccountId: matching._id,
        zernioProfileId: verified.zernioProfileId,
        username: matching.username,
        profilePicture: matching.profilePicture,
      });
      void existing;
    } else {
      return redirectWithStatus(request, platformForRedirect, {
        zernio_error: "unsupported_platform",
      });
    }

    return redirectWithStatus(request, platformForRedirect, {
      zernio_success: "true",
    });
  } catch (err) {
    console.error("Zernio OAuth callback error:", err);
    return redirectWithStatus(request, platformForRedirect, {
      zernio_error: "unexpected",
    });
  }
}
