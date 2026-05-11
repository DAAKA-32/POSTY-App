import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { isAdminInitialized } from "@/lib/db/firebase-admin";

/**
 * Strict allowlist of accounts authorized to access the private admin
 * surface (`/admin` and `/api/admin/*`). Email comparison is case-insensitive
 * but otherwise exact — no wildcards, no domain matching.
 */
const ADMIN_EMAILS: readonly string[] = ["emilien.nepveu@gmail.com"];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

interface AdminAuthSuccess {
  uid: string;
  email: string;
  error?: undefined;
}

interface AdminAuthError {
  uid?: undefined;
  email?: undefined;
  /**
   * On any failure (missing token, invalid token, non-admin email) we return a
   * generic 404 — never a 401/403 — so unauthorized callers cannot distinguish
   * "this route exists but you can't access it" from "this route does not
   * exist". Discretion > friendliness.
   */
  error: NextResponse;
}

export type AdminAuthResult = AdminAuthSuccess | AdminAuthError;

const NOT_FOUND_RESPONSE = () =>
  NextResponse.json({ error: "not_found" }, { status: 404 });

/**
 * Server-side admin guard for API routes. Verifies the Firebase ID token,
 * confirms the decoded email is on the admin allowlist, and otherwise
 * collapses every failure mode into an indistinguishable 404.
 *
 * Usage:
 * ```ts
 * const auth = await requireAdmin(request);
 * if (auth.error) return auth.error;
 * // auth.uid + auth.email are guaranteed admin from here on
 * ```
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AdminAuthResult> {
  if (!isAdminInitialized()) {
    return { error: NOT_FOUND_RESPONSE() };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: NOT_FOUND_RESPONSE() };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { error: NOT_FOUND_RESPONSE() };
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    if (!decoded.email || !decoded.email_verified) {
      return { error: NOT_FOUND_RESPONSE() };
    }
    if (!isAdminEmail(decoded.email)) {
      return { error: NOT_FOUND_RESPONSE() };
    }
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return { error: NOT_FOUND_RESPONSE() };
  }
}
