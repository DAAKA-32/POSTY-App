import { NextRequest, NextResponse } from "next/server";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { rejectUnlessCron } from "@/lib/scheduler/cron-auth";
import { strategistAccessFromUserDoc } from "@/lib/strategist/access";

/**
 * Daily autonomous Strategist: for every Pro / Max user whose autonomous mode
 * runs today (Europe/Paris), asks /api/strategist/auto-batch to prepare the week's
 * plan. Triggered once a day by Vercel Cron (vercel.json — daily crons are
 * free on Hobby). Replaces the `weeklyAutonomousStrategist` Cloud Function,
 * which needs the paid Blaze plan and never had POSTY_APP_URL / CRON_SECRET
 * configured in production.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parisDayOfWeek(date = new Date()): number {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day);
}

async function handle(request: NextRequest) {
  const denied = rejectUnlessCron(request);
  if (denied) return denied;
  if (!isAdminInitialized() || !adminDb) {
    return NextResponse.json({ error: "admin_not_ready" }, { status: 500 });
  }

  const todayDow = parisDayOfWeek();
  const snap = await adminDb
    .collection("users")
    .where("autonomousMode.enabled", "==", true)
    .where("autonomousMode.dayOfWeek", "==", todayDow)
    .limit(500)
    .get();

  // The SAME rule as the interactive routes and auto-batch's re-check
  // (strategistAccessFromUserDoc): the EFFECTIVE plan includes the Strategist
  // (Pro, Max; founder / gift accounts are Max through the email override while
  // their stored plan stays null/"free") or the email is allowlisted. The users
  // doc email is server-trusted since d568ced (clients cannot rewrite it).
  const targets = snap.docs
    .filter((d) => strategistAccessFromUserDoc(d.data()))
    .map((d) => d.id);
  const skipped = snap.size - targets.length;
  const origin = request.nextUrl.origin;
  const secret = process.env.CRON_SECRET!.trim();

  // Each auto-batch call is its own function invocation (AI generation, up to
  // its own maxDuration): fire them staggered by 250 ms instead of awaiting
  // them one by one, which would overrun this function's 60 s.
  const calls = targets.map(
    (userId, i) =>
      new Promise<boolean>((resolve) => {
        setTimeout(async () => {
          try {
            const res = await fetch(`${origin}/api/strategist/auto-batch`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-cron-secret": secret },
              body: JSON.stringify({ userId }),
            });
            if (!res.ok) console.warn(`[cron/autonomous-strategist] user=${userId} → HTTP ${res.status}`);
            resolve(res.ok);
          } catch (err) {
            console.error(`[cron/autonomous-strategist] user=${userId} fetch failed:`, err);
            resolve(false);
          }
        }, i * 250);
      })
  );
  const results = await Promise.all(calls);
  const success = results.filter(Boolean).length;
  const summary = { dayOfWeek: todayDow, success, failed: results.length - success, skipped };
  console.log("[cron/autonomous-strategist]", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary });
}

export const GET = handle;
export const POST = handle;
