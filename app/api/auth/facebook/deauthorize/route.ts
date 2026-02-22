import { NextRequest, NextResponse } from "next/server";
import { META_CONFIG } from "@/lib/meta";
import { adminDb, isAdminInitialized } from "@/lib/firebase-admin";
import crypto from "crypto";

/**
 * Facebook Deauthorization Callback
 *
 * Called by Meta when a user removes the app from their Facebook settings.
 * Receives a signed_request containing the user's Facebook ID.
 * We delete their Facebook connection from Firestore.
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
      console.error("Firebase Admin not initialized for Facebook deauthorize");
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    // Find and delete the Facebook connection by facebookId
    const connectionsRef = adminDb.collection("facebookConnections");
    const snapshot = await connectionsRef
      .where("facebookId", "==", facebookUserId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.delete();
      console.log(`Facebook connection removed for FB user ${facebookUserId}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Facebook deauthorize error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Parse and verify a Meta signed_request
 * Format: {base64url_signature}.{base64url_payload}
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
  // Replace URL-safe chars and add padding
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  return Buffer.from(base64 + "=".repeat(padding), "base64");
}
