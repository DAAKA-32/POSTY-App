import { NextRequest, NextResponse } from "next/server";
import { guardAdmin, badRequest, auditAdmin, noStore } from "@/lib/analytics/admin-route";
import { loadJourney } from "@/lib/analytics/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One session's ordered events. Masked references only; the view is audited. */
export async function GET(request: NextRequest) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const sid = request.nextUrl.searchParams.get("sid") || "";
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(sid)) return badRequest();

  try {
    const journey = await loadJourney(guard.db, sid);
    await auditAdmin(guard.db, {
      action: "journey_view",
      uid: guard.uid,
      detail: { sid },
    });
    return NextResponse.json(journey, { headers: noStore });
  } catch (err) {
    console.error("[admin/analytics/journey] failed", err);
    return NextResponse.json({ error: "journey_failed" }, { status: 500, headers: noStore });
  }
}
