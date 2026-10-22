/**
 * POST /api/outreach/unsubscribe — public opt-out endpoint.
 *
 * Public by necessity: an unsubscribe link that requires a login is not an
 * unsubscribe link. What protects it is the HMAC in the URL, so a caller can
 * only opt out an address they were actually mailed at, never a third party's.
 */

import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail, verifyEmailToken } from "@/lib/outreach/send";
import { suppressEmail } from "@/lib/outreach/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, token } = (await request.json()) as {
      email?: string;
      token?: string;
    };

    const normalized = normalizeEmail(email || "");
    if (!normalized || !token) {
      return NextResponse.json({ error: "Lien incomplet." }, { status: 400 });
    }

    if (!(await verifyEmailToken(normalized, token))) {
      return NextResponse.json({ error: "Lien invalide ou expire." }, { status: 400 });
    }

    await suppressEmail(normalized, "unsubscribed");
    return NextResponse.json({ ok: true });
  } catch {
    // Deliberately vague: this endpoint is unauthenticated.
    return NextResponse.json({ error: "Traitement impossible." }, { status: 500 });
  }
}
