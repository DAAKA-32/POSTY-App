/**
 * GET  /api/admin/outreach/prospects  — the base, plus config health
 * POST /api/admin/outreach/prospects  — import (CSV text or JSON rows)
 *
 * Admin-only. `requireAdmin` collapses every failure into a 404 so the route is
 * indistinguishable from one that does not exist.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getOutreachConfig, isSendableEmail, normalizeEmail } from "@/lib/outreach/send";
import { parseCsv, rowToInput } from "@/lib/outreach/csv";
import {
  listProspects,
  listSuppressedEmails,
  upsertProspects,
  type ProspectInput,
} from "@/lib/outreach/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const [prospects, suppressed] = await Promise.all([
      listProspects(1000),
      listSuppressedEmails(),
    ]);

    const config = getOutreachConfig();

    return NextResponse.json({
      prospects: prospects.map((p) => ({
        ...p,
        suppressed: suppressed.has(normalizeEmail(p.email)),
        emailValid: isSendableEmail(p.email),
      })),
      suppressedCount: suppressed.size,
      config: config.ok
        ? { ready: true, from: config.config.from, missing: [] as string[] }
        : { ready: false, from: null, missing: config.missing },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  try {
    const payload = (await request.json()) as { csv?: string; rows?: ProspectInput[] };

    let inputs: ProspectInput[] = [];
    if (typeof payload.csv === "string" && payload.csv.trim()) {
      inputs = parseCsv(payload.csv)
        .map(rowToInput)
        .filter((row): row is ProspectInput => row !== null);
    } else if (Array.isArray(payload.rows)) {
      inputs = payload.rows.filter((row) => row && typeof row.email === "string");
    }

    if (inputs.length === 0) {
      return NextResponse.json(
        { error: "Aucune ligne exploitable — vérifiez qu'une colonne Email est présente." },
        { status: 400 }
      );
    }

    const report = await upsertProspects(inputs);
    return NextResponse.json({ report, parsed: inputs.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import impossible" },
      { status: 500 }
    );
  }
}
