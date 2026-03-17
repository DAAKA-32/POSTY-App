import { NextRequest, NextResponse } from "next/server";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";

/**
 * Refreshes the LinkedIn profile photo URL by re-fetching from LinkedIn API.
 * LinkedIn CDN URLs expire, so this endpoint fetches a fresh URL using the stored access token.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!isAdminInitialized() || !adminDb) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    // Get stored LinkedIn connection
    const connectionRef = adminDb.collection("linkedinConnections").doc(userId);
    const connectionSnap = await connectionRef.get();

    if (!connectionSnap.exists) {
      return NextResponse.json({ error: "No LinkedIn connection found" }, { status: 404 });
    }

    const connectionData = connectionSnap.data();
    if (!connectionData?.accessToken) {
      return NextResponse.json({ error: "No access token" }, { status: 401 });
    }

    // Check token expiration
    const expiresAt = connectionData.expiresAt?.toDate();
    if (expiresAt && expiresAt < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    // Fetch fresh profile data from LinkedIn
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

    // Update photo in both collections
    const updates: Promise<FirebaseFirestore.WriteResult>[] = [];

    if (newPhotoUrl) {
      updates.push(connectionRef.update({ profilePicture: newPhotoUrl }));
      updates.push(
        adminDb.collection("users").doc(userId).update({ photoURL: newPhotoUrl })
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ photoUrl: newPhotoUrl });
  } catch (error) {
    console.error("LinkedIn photo refresh error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
