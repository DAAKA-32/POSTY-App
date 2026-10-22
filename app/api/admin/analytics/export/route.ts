import { NextRequest, NextResponse } from "next/server";
import { guardAdmin, badRequest, auditAdmin } from "@/lib/analytics/admin-route";
import { rangeFromParams } from "@/lib/analytics/range";
import { loadReport } from "@/lib/analytics/load";
import { EXPORT_KINDS, exportCsv, type ExportKind } from "@/lib/analytics/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CSV export of AGGREGATE reports only (sources, campaigns, funnel, plans,
 * daily). No visitor- or account-level rows are exportable. Same admin guard
 * and same date range as the dashboard; each export is audited.
 */
export async function GET(request: NextRequest) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const p = request.nextUrl.searchParams;
  const kind = p.get("kind") as ExportKind | null;
  if (!kind || !EXPORT_KINDS.includes(kind)) return badRequest();
  const range = rangeFromParams(p);
  if (!range) return badRequest("invalid_range");

  try {
    const report = await loadReport(guard.db, range);
    await auditAdmin(guard.db, {
      action: "export",
      uid: guard.uid,
      detail: { kind, start: range.start, end: range.end },
    });
    return new NextResponse(exportCsv(kind, report), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="posty-${kind}-${range.start}_${range.end}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[admin/analytics/export] failed", err);
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
}
