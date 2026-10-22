import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Shared-secret check for cron endpoints. Accepts the app's existing
 * `x-cron-secret` header (GitHub Actions, Cloud Functions) or
 * `Authorization: Bearer <CRON_SECRET>` (what Vercel Cron sends).
 * Returns a response to send back when the caller is NOT allowed, else null.
 */
export function rejectUnlessCron(request: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    console.error("[cron] CRON_SECRET not configured in env");
    return NextResponse.json({ error: "secret_not_configured" }, { status: 500 });
  }
  const provided =
    request.headers.get("x-cron-secret")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}
