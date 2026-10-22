/**
 * POST /api/admin/outreach/send — preview or run a campaign.
 *
 * The same endpoint serves both, switched by `dryRun`. That is deliberate: the
 * preview you approve is rendered by exactly the code path that sends, so what
 * you read in the UI is byte-for-byte what the prospect receives.
 *
 * The campaign itself — guards, daily cap, audit trail — lives in
 * `lib/outreach/campaign.ts`, shared with `scripts/outreach.cjs`.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { runCampaign } from "@/lib/outreach/campaign";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

interface SendRequestBody {
  prospectIds: string[];
  dryRun?: boolean;
  /** Force one variant for the whole batch (otherwise rotated per prospect). */
  variantId?: string;
  /** Per-prospect body override, edited in the UI. Subject stays generated. */
  overrides?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => null)) as SendRequestBody | null;

  if (!body || !Array.isArray(body.prospectIds) || body.prospectIds.length === 0) {
    return NextResponse.json({ error: "Aucun prospect sélectionné." }, { status: 400 });
  }

  const outcome = await runCampaign({
    prospectIds: body.prospectIds,
    dryRun: body.dryRun !== false, // Sending is always explicit.
    variantId: body.variantId,
    overrides: body.overrides,
  });

  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: 400 });
  }

  const { ok: _ok, ...report } = outcome;
  return NextResponse.json(report);
}
