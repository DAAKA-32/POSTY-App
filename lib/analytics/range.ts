/**
 * Reporting date ranges. All analytics days are UTC calendar days
 * ("YYYY-MM-DD"); both bounds are inclusive.
 */

import { DAY_RE, utcDayKey } from "./events";

export const RANGE_PRESETS = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "this_month",
  "previous_month",
  "custom",
] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const MAX_RANGE_DAYS = 366;

export interface DayRange {
  start: string;
  end: string;
  days: number;
}

function parseDay(day: string): Date | null {
  if (!DAY_RE.test(day)) return null;
  const d = new Date(`${day}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || utcDayKey(d) !== day ? null : d;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

export function dayCount(start: string, end: string): number {
  const s = parseDay(start);
  const e = parseDay(end);
  if (!s || !e) return 0;
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

export function enumerateDays(start: string, end: string): string[] {
  const s = parseDay(start);
  const n = dayCount(start, end);
  if (!s || n <= 0) return [];
  return Array.from({ length: n }, (_, i) => utcDayKey(addDays(s, i)));
}

/** Returns null for an invalid / inverted / oversized custom range. */
export function resolveRange(
  preset: RangePreset,
  now: Date = new Date(),
  custom?: { start?: string; end?: string }
): DayRange | null {
  const today = parseDay(utcDayKey(now))!;
  let start: Date;
  let end: Date = today;

  switch (preset) {
    case "today":
      start = today;
      break;
    case "yesterday":
      start = end = addDays(today, -1);
      break;
    case "last_7_days":
      start = addDays(today, -6);
      break;
    case "last_30_days":
      start = addDays(today, -29);
      break;
    case "last_90_days":
      start = addDays(today, -89);
      break;
    case "this_month":
      start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      break;
    case "previous_month":
      start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
      break;
    case "custom": {
      const s = custom?.start ? parseDay(custom.start) : null;
      const e = custom?.end ? parseDay(custom.end) : null;
      if (!s || !e) return null;
      start = s;
      end = e;
      break;
    }
    default:
      return null;
  }

  if (start.getTime() > end.getTime()) return null;
  const range = {
    start: utcDayKey(start),
    end: utcDayKey(end),
    days: dayCount(utcDayKey(start), utcDayKey(end)),
  };
  return range.days > MAX_RANGE_DAYS ? null : range;
}

/** Parse `?preset=&start=&end=` query params. */
export function rangeFromParams(params: URLSearchParams, now = new Date()): DayRange | null {
  const preset = (params.get("preset") || "last_30_days") as RangePreset;
  if (!RANGE_PRESETS.includes(preset)) return null;
  return resolveRange(preset, now, {
    start: params.get("start") ?? undefined,
    end: params.get("end") ?? undefined,
  });
}
