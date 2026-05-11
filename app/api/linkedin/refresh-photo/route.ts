import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { verifyAuth } from "@/lib/auth";

/**
 * Refreshes the LinkedIn profile photo URL by re-fetching from LinkedIn API.
 * LinkedIn CDN URLs expire, so this endpoint fetches a fresh URL using the stored access token.
 *
 * SECURITY: the target userId is derived from the verified Firebase token — never trust
 * a userId passed in the request body. Previously this route accepted any userId, allowing
 * an unauthenticated attacker to trigger token use on behalf of arbitrary users.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;
    const userId = auth.uid;

    if (!isAdminInitialized() || !adminDb) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const connectionRef = adminDb.collection("linkedinConnections").doc(userId);
    const connectionSnap = await connectionRef.get();

    if (!connectionSnap.exists) {
      return NextResponse.json({ error: "No LinkedIn connection found" }, { status: 404 });
    }

    const connectionData = connectionSnap.data();
    if (!connectionData?.accessToken) {
      return NextResponse.json({ error: "No access token" }, { status: 401 });
    }

    const expiresAt = connectionData.expiresAt?.toDate();
    if (expiresAt && expiresAt < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${connectionData.accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch LinkedIn profile" }, { status: 502 });
    }

    const profileData = await profileResponse.json();
    const newPhotoUrl = profileData.picture || null;
    const newProfileName: string | null =
      typeof profileData.name === "string" && profileData.name.length > 0
        ? profileData.name
        : null;

    const updates: Promise<FirebaseFirestore.WriteResult>[] = [];

    if (newPhotoUrl) {
      const connectionPatch: Record<string, unknown> = {
        profilePicture: newPhotoUrl,
        photoUpdatedAt: FieldValue.serverTimestamp(),
      };
      if (newProfileName) connectionPatch.profileName = newProfileName;
      updates.push(connectionRef.update(connectionPatch));
      updates.push(
        adminDb.collection("users").doc(userId).update({ photoURL: newPhotoUrl })
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ photoUrl: newPhotoUrl, profileName: newProfileName });
  } catch (error) {
    console.error("LinkedIn photo refresh error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
