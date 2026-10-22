import { NextRequest, NextResponse } from "next/server";
import { guardAdmin, badRequest, noStore } from "@/lib/analytics/admin-route";
import { rangeFromParams } from "@/lib/analytics/range";
import { loadFeed } from "@/lib/analytics/load";
import { PLAN_IDS } from "@/lib/analytics/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await guardAdmin(request);
  if (!guard.ok) return guard.response;

  const p = request.nextUrl.searchParams;
  const range = rangeFromParams(p);
  if (!range) return badRequest("invalid_range");

  const plan = p.get("plan");
  if (plan && !(PLAN_IDS as readonly string[]).includes(plan)) return badRequest();
  const registered = p.get("registered");
  if (registered && registered !== "yes" && registered !== "no") return badRequest();
  const status = p.get("status");
  if (status && status !== "ok" && status !== "failed") return badRequest();
  const source = p.get("source");
  if (source && !/^[a-z0-9._/-]{1,80}$/i.test(source)) return badRequest();
  const cursor = p.get("cursor");
  if (cursor && !/^\d{10,16}_[A-Za-z0-9_-]{1,64}$/.test(cursor)) return badRequest();

  try {
    const result = await loadFeed(guard.db, {
      range,
      name: p.get("name") || undefined,
      source: source || undefined,
      plan: plan || undefined,
      registered: (registered as "yes" | "no" | null) || undefined,
      status: (status as "ok" | "failed" | null) || undefined,
      cursor: cursor || undefined,
      limit: Number(p.get("limit")) || 50,
    });
    return NextResponse.json(result, { headers: noStore });
  } catch (err) {
    console.error("[admin/analytics/feed] failed", err);
    return NextResponse.json({ error: "feed_failed" }, { status: 500, headers: noStore });
  }
}
