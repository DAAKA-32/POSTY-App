import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { isAdminInitialized } from "@/lib/db/firebase-admin";

interface AuthSuccess {
  uid: string;
  email?: string;
  error?: undefined;
}

interface AuthError {
  uid?: undefined;
  email?: undefined;
  error: NextResponse;
}

type AuthResult = AuthSuccess | AuthError;

/**
 * Verify Firebase Auth token from Authorization header.
 * Returns { uid, email } on success, or { error: NextResponse } on failure.
 *
 * Usage in API routes:
 * ```ts
 * const auth = await verifyAuth(request);
 * if (auth.error) return auth.error;
 * const { uid } = auth;
 * ```
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  // Check Firebase Admin is initialized
  if (!isAdminInitialized()) {
    // In development without Firebase Admin, allow requests with userId in body
    if (process.env.NODE_ENV !== "production") {
      return { uid: "__dev_bypass__" };
    }
    return {
      error: NextResponse.json(
        { error: "auth_unavailable", message: "Authentication service unavailable" },
        { status: 503 }
      ),
    };
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "unauthorized", message: "Missing or invalid authorization token" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.split("Bearer ")[1];

  if (!token) {
    return {
      error: NextResponse.json(
        { error: "unauthorized", message: "Empty authorization token" },
        { status: 401 }
      ),
    };
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch {
    return {
      error: NextResponse.json(
        { error: "unauthorized", message: "Invalid or expired token" },
        { status: 401 }
      ),
    };
  }
}

/**
 * Optional auth — returns uid if token present and valid, null if no token.
 * Only returns error if token is present but invalid.
 * Use for routes that work for both guests and authenticated users.
 */
export async function verifyAuthOptional(request: NextRequest): Promise<{
  uid: string | null;
  email?: string;
  error?: NextResponse;
}> {
  const authHeader = request.headers.get("authorization");

  // No token — guest access
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { uid: null };
  }

  // Token present — must be valid
  const result = await verifyAuth(request);
  if (result.error) {
    return { uid: null, error: result.error };
  }
  return { uid: result.uid, email: result.email };
}
