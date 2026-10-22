import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/db/firebase-admin";
import { verifyAuth } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/api/rate-limit";
import { deleteAnalyticsForUser } from "@/lib/analytics/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Erase the analytics records tied to the CALLING account (RGPD art. 17).
 *
 * The uid comes only from the verified ID token — there is no parameter that
 * selects another account, so this can never be used to delete someone
 * else's data. Called by the client during account deletion, before the Auth
 * account is removed (the token must still be valid).
 *
 * Aggregated counters (analytics_daily / analytics_dims) hold no personal
 * data and are intentionally kept.
 */
export async function POST(request: NextRequest) {
  const rl = rateLimit(getClientIp(request), {
    namespace: "analytics-delete",
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  if (!adminDb || auth.uid === "__dev_bypass__") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const result = await deleteAnalyticsForUser(adminDb, auth.uid);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[analytics/delete] failed", err);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
