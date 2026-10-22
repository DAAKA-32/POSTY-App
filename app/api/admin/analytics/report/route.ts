import { NextRequest, NextResponse } from "next/server";
import { guardAdmin, badRequest, noStore } from "@/lib/analytics/admin-route";
import { rangeFromParams } from "@/lib/analytics/range";
import { loadReport } from "@/lib/analytics/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const range = rangeFromParams(request.nextUrl.searchParams);
  if (!range) return badRequest("invalid_range");

  try {
    const report = await loadReport(guard.db, range);
    return NextResponse.json(report, { headers: noStore });
  } catch (err) {
    console.error("[admin/analytics/report] failed", err);
    return NextResponse.json({ error: "report_failed" }, { status: 500, headers: noStore });
  }
}
