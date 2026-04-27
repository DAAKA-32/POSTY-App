import { NextRequest, NextResponse } from "next/server";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { saveMastodonConnectionAdmin } from "@/lib/db/firestore-admin";
import { verifyAuth } from "@/lib/auth";
import {
  normalizeInstance,
  verifyMastodonCredentials,
} from "@/lib/platforms/mastodon";

/**
 * Connect a user's Mastodon account using their instance URL + a personal
 * access token they generated in that instance's settings (scope:
 * write:statuses read:accounts). No OAuth dance needed — we just validate the
 * token by hitting verify_credentials on the instance.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const { userId: bodyUserId, instance, accessToken } = (await request.json()) as {
      userId?: string;
      instance?: string;
      accessToken?: string;
    };
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (!instance || !accessToken) {
      return NextResponse.json(
        { error: "Instance et token d'accès requis" },
        { status: 400 }
      );
    }
    if (!isAdminInitialized()) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const normalized = normalizeInstance(instance);
    if (!normalized) {
      return NextResponse.json(
        { error: "URL d'instance invalide" },
        { status: 400 }
      );
    }

    const account = await verifyMastodonCredentials({
      instance: normalized,
      accessToken,
    });

    await saveMastodonConnectionAdmin(userId, {
      instance: normalized,
      accountId: account.id,
      username: account.username,
      acct: account.acct,
      accessToken,
      profileName: account.display_name || undefined,
      profilePicture: account.avatar || undefined,
    });

    return NextResponse.json({
      success: true,
      instance: normalized,
      username: account.username,
      acct: account.acct,
      profileName: account.display_name,
      profilePicture: account.avatar,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect to Mastodon";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
