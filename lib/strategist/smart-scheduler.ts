/**
 * Smart scheduling — turn a list of materialized briefs into concrete
 * publish times (UTC) ready to write into `scheduledPosts`.
 *
 * Phase 3 deliverable. The LLM in P1 already proposed `suggestedDate` and
 * `suggestedTime` for every brief, and those slots are meant to land in
 * LinkedIn peak windows for B2B audiences. This module's job is to:
 *
 *   1. Convert the brief's local `YYYY-MM-DD HH:MM` (in the user's TZ) into
 *      a real UTC Date the cron can compare against.
 *   2. Reject (or push forward) slots that are in the past — generation can
 *      take seconds; a brief proposed for 09:00 may be late when the user
 *      finally clicks "Schedule" at 09:10.
 *   3. De-conflict slots inside a single batch — never two posts within 60
 *      min of each other (LinkedIn penalises back-to-back posts on the
 *      same author).
 *   4. Snap a stray slot back into the nearest peak window if the user
 *      hand-edited it into a dead zone (3am etc.).
 *
 * Pure functions, no I/O. Tested by feeding briefs in, asserting on slots
 * out — no Firestore mocks needed.
 */

/** Peak windows for LinkedIn B2B audiences in user-local time. Same source
 *  as the P1 batch-plan prompt — keep these in sync. */
const PEAK_WINDOWS: Array<{ startMin: number; endMin: number }> = [
  // 07:30 – 09:30 — commute / coffee
  { startMin: 7 * 60 + 30, endMin: 9 * 60 + 30 },
  // 11:30 – 13:30 — lunch
  { startMin: 11 * 60 + 30, endMin: 13 * 60 + 30 },
  // 17:00 – 18:30 — after work
  { startMin: 17 * 60, endMin: 18 * 60 + 30 },
];

/** Min gap between two slots in the same batch. LinkedIn observed
 *  penalty for posting from the same author too close together. */
const MIN_GAP_MIN = 60;

export interface ScheduleInputBrief {
  id: string;
  suggestedDate: string;          // YYYY-MM-DD (user TZ)
  suggestedTime: string;          // HH:MM (user TZ)
}

export interface ResolvedSlot {
  briefId: string;
  /** UTC Date ready for Firestore `scheduledAt`. */
  fireAt: Date;
  /** Same instant as `fireAt`, expressed as milliseconds — convenient for
   *  the client side which doesn't deal in Date objects. */
  fireAtMs: number;
  /** True if smart-scheduler had to move this brief from its LLM-proposed
   *  slot (past slot, conflict with neighbour, dead zone). The UI can
   *  surface "moved" so the user knows their preview isn't 100% honored. */
  adjusted: boolean;
  /** When `adjusted`, a short reason for tooltip display. */
  adjustmentReason?: "past" | "conflict" | "snapped-to-peak";
}

/**
 * Compute a Date for a `YYYY-MM-DD HH:MM` pair interpreted in the user's
 * timezone. We do it without a 3rd-party tz library by formatting the same
 * UTC instant in the target tz and measuring the offset that aligns it.
 *
 * Why not just `new Date('2026-05-26T09:00')`? That gets parsed in the
 * SERVER's timezone, which is UTC on Vercel — so a 09:00 Europe/Paris ask
 * would land in scheduledPosts as 09:00 UTC (= 11:00 Paris). The cron then
 * publishes 2h late. This function fixes that.
 */
export function localToUtc(dateIso: string, timeHM: string, timezone: string): Date {
  const [y, mo, d] = dateIso.split("-").map(Number);
  const [h, mi] = timeHM.split(":").map(Number);
  if (!y || !mo || !d || h === undefined || mi === undefined) {
    return new Date(NaN);
  }
  // Start from a guess: treat the local components as if they were UTC.
  const guessUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
  // Then ask: what does that UTC instant look like in the target TZ?
  // The diff between what it "looks like" and what we wanted gives the
  // offset to subtract.
  const guessDate = new Date(guessUtc);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(guessDate);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? NaN);
  const seenY = get("year"),
    seenMo = get("month"),
    seenD = get("day"),
    seenH = get("hour") === 24 ? 0 : get("hour"),
    seenMi = get("minute");
  const seenUtcMs = Date.UTC(seenY, seenMo - 1, seenD, seenH, seenMi, 0);
  // Offset (ms) between "what tz shows" and "what we wanted":
  const offset = seenUtcMs - guessUtc;
  return new Date(guessUtc - offset);
}

/** Inverse of localToUtc — given a UTC instant and a tz, returns minutes-of-day
 *  (0-1439) in that tz. Used to check if a slot lands in a peak window. */
function minutesOfDayInTz(date: Date, timezone: string): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? NaN);
  const h = get("hour") === 24 ? 0 : get("hour");
  const m = get("minute");
  return h * 60 + m;
}

function isInPeak(minOfDay: number): boolean {
  return PEAK_WINDOWS.some((w) => minOfDay >= w.startMin && minOfDay <= w.endMin);
}

/** Round minutes-of-day to the nearest peak window CENTER. Used when the
 *  user hand-edited a brief into a dead slot (3am etc.). */
function snapToNearestPeakCenter(minOfDay: number): number {
  let best = PEAK_WINDOWS[0];
  let bestDist = Infinity;
  for (const w of PEAK_WINDOWS) {
    const center = (w.startMin + w.endMin) / 2;
    const dist = Math.abs(center - minOfDay);
    if (dist < bestDist) {
      best = w;
      bestDist = dist;
    }
  }
  return Math.round((best.startMin + best.endMin) / 2);
}

/** Adjust a UTC Date by `deltaMin` minutes, returning a new Date. */
function addMinutes(d: Date, deltaMin: number): Date {
  return new Date(d.getTime() + deltaMin * 60_000);
}

/**
 * Main entry point — takes briefs in chronological order (already sorted by
 * the table the user reviewed) and returns one ResolvedSlot per brief.
 *
 * Rules applied in order:
 *   1. Compute UTC fire time from local date/time.
 *   2. If in the past (with 5-min buffer), push to the next peak slot today
 *      or the first peak tomorrow.
 *   3. Snap to nearest peak center if outside any peak window.
 *   4. Resolve conflicts with previous slot in the batch (≥ MIN_GAP_MIN).
 */
export function computeScheduleSlots(opts: {
  briefs: ScheduleInputBrief[];
  timezone: string;
  /** Server "now" — passed in so callers can mock or use admin clock. */
  now?: Date;
}): ResolvedSlot[] {
  const { briefs, timezone } = opts;
  const now = opts.now ?? new Date();
  // 5-min buffer: never schedule for a slot less than 5 min in the future.
  // ScheduleModal uses the same buffer (5_MINUTES_AHEAD_BUFFER).
  const earliest = new Date(now.getTime() + 5 * 60_000);

  const sorted = [...briefs].sort((a, b) => {
    const ka = `${a.suggestedDate}T${a.suggestedTime}`;
    const kb = `${b.suggestedDate}T${b.suggestedTime}`;
    return ka.localeCompare(kb);
  });

  const out: ResolvedSlot[] = [];
  for (const brief of sorted) {
    let fireAt = localToUtc(brief.suggestedDate, brief.suggestedTime, timezone);
    let adjusted = false;
    let reason: ResolvedSlot["adjustmentReason"];

    if (isNaN(fireAt.getTime())) continue;

    // (1) Past-slot rescue: push to next peak.
    if (fireAt < earliest) {
      adjusted = true;
      reason = "past";
      fireAt = nextPeakAfter(earliest, timezone);
    }

    // (2) Snap-to-peak: if user-edited into a dead slot, move to closest peak.
    const minOfDay = minutesOfDayInTz(fireAt, timezone);
    if (!isInPeak(minOfDay) && !adjusted) {
      const snapped = snapToNearestPeakCenter(minOfDay);
      const deltaMin = snapped - minOfDay;
      fireAt = addMinutes(fireAt, deltaMin);
      adjusted = true;
      reason = "snapped-to-peak";
    }

    // (3) Conflict resolution with the previous slot.
    const prev = out[out.length - 1]?.fireAt;
    if (prev) {
      const gapMin = (fireAt.getTime() - prev.getTime()) / 60_000;
      if (gapMin < MIN_GAP_MIN) {
        // Push to MIN_GAP_MIN after the previous one. If that lands outside
        // a peak, push to the next peak window after that.
        let candidate = addMinutes(prev, MIN_GAP_MIN);
        const candMin = minutesOfDayInTz(candidate, timezone);
        if (!isInPeak(candMin)) {
          candidate = nextPeakAfter(candidate, timezone);
        }
        fireAt = candidate;
        adjusted = true;
        reason = "conflict";
      }
    }

    out.push({
      briefId: brief.id,
      fireAt,
      fireAtMs: fireAt.getTime(),
      adjusted,
      adjustmentReason: reason,
    });
  }

  return out;
}

/** Return the next UTC instant >= `from` that lands inside a peak window
 *  (in the given user timezone). Walks day-by-day if needed. */
export function nextPeakAfter(from: Date, timezone: string): Date {
  // Try today's remaining peaks, then walk forward up to 7 days.
  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const base = new Date(from.getTime() + dayOffset * 24 * 60 * 60_000);
    // Get YYYY-MM-DD of `base` in user TZ.
    const dateIso = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(base);
    for (const w of PEAK_WINDOWS) {
      // Use the window's CENTER as the candidate to avoid clustering at the
      // very edge of the window.
      const minOfDay = Math.round((w.startMin + w.endMin) / 2);
      const h = Math.floor(minOfDay / 60);
      const m = minOfDay % 60;
      const candidate = localToUtc(
        dateIso,
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        timezone
      );
      if (candidate >= from) return candidate;
    }
  }
  // Total fallback: 1h from now.
  return new Date(from.getTime() + 60 * 60_000);
}
