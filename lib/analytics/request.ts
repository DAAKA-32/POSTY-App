/**
 * Request-level helpers shared by the analytics ingestion routes.
 */

import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";

const BOT_RE =
  /bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|python-requests|curl\/|wget\/|go-http-client/i;

/** Drop obvious automation. The UA is inspected, never stored. */
export function isLikelyBot(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent") || "";
  return !ua || BOT_RE.test(ua);
}

/**
 * Country from the hosting platform's edge header (coarse, no IP stored).
 * Returns undefined when absent or malformed.
 */
export function countryOf(request: NextRequest): string | undefined {
  const cc = (
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    ""
  ).toUpperCase();
  return /^[A-Z]{2}$/.test(cc) && cc !== "XX" && cc !== "T1" ? cc : undefined;
}

/** Server-verified uid from an optional Bearer ID token. Never trusts the body. */
export async function optionalUid(request: NextRequest): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid || null;
  } catch {
    return null;
  }
}

/** Reject request bodies above `maxBytes` before parsing. */
export async function readJsonLimited(
  request: NextRequest,
  maxBytes = 4096
): Promise<unknown | null> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) return null;
  try {
    const text = await request.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
