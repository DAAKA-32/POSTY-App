import { NextRequest, NextResponse } from "next/server";
import { META_CONFIG } from "@/lib/meta";
import { adminDb, isAdminInitialized } from "@/lib/firebase-admin";
import crypto from "crypto";

/**
 * Facebook Data Deletion Request Callback
 *
 * Called by Meta when a user requests deletion of their data via Facebook.
 * Must return a JSON with confirmation_code and a status check URL.
 * We delete all Facebook-related data for this user.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const signedRequest = formData.get("signed_request") as string;

    if (!signedRequest) {
      return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
    }

    const data = parseSignedRequest(signedRequest, META_CONFIG.appSecret);
    if (!data) {
      return NextResponse.json({ error: "Invalid signed_request" }, { status: 400 });
    }

    const facebookUserId = data.user_id;
    if (!facebookUserId) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    if (!isAdminInitialized() || !adminDb) {
      console.error("Firebase Admin not initialized for Facebook data deletion");
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    // Generate a confirmation code
    const confirmationCode = crypto.randomUUID();

    // Delete Facebook connection
    const connectionsRef = adminDb.collection("facebookConnections");
    const connectionSnapshot = await connectionsRef
      .where("facebookId", "==", facebookUserId)
      .limit(1)
      .get();

    if (!connectionSnapshot.empty) {
      await connectionSnapshot.docs[0].ref.delete();
    }

    // Delete Facebook posts
    const postsRef = adminDb.collection("facebookPosts");
    const postsSnapshot = await postsRef
      .where("facebookId", "==", facebookUserId)
      .get();

    const batch = adminDb.batch();
    postsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    if (!postsSnapshot.empty) {
      await batch.commit();
    }

    console.log(`Facebook data deleted for FB user ${facebookUserId}, code: ${confirmationCode}`);

    // Meta requires this exact response format
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai";
    return NextResponse.json({
      url: `${baseUrl}/legal/privacy`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error("Facebook data deletion error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Parse and verify a Meta signed_request
 */
function parseSignedRequest(
  signedRequest: string,
  appSecret: string
): { user_id: string; algorithm: string; issued_at: number } | null {
  const [encodedSig, encodedPayload] = signedRequest.split(".");
  if (!encodedSig || !encodedPayload) return null;

  const sig = base64UrlDecode(encodedSig);
  const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf-8"));

  if (payload.algorithm?.toUpperCase() !== "HMAC-SHA256") {
    console.error("Unexpected signed_request algorithm:", payload.algorithm);
    return null;
  }

  const expectedSig = crypto
    .createHmac("sha256", appSecret)
    .update(encodedPayload)
    .digest();

  if (!crypto.timingSafeEqual(sig, expectedSig)) {
    console.error("Invalid signed_request signature");
    return null;
  }

  return payload;
}

function base64UrlDecode(str: string): Buffer {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  return Buffer.from(base64 + "=".repeat(padding), "base64");
}
