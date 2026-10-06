"use client";

/**
 * StrategistActivePill — "Active" badge in the drawer header when the weekly
 * autonomous mode is on. Reads the session's autonomous config, so it updates
 * as soon as the mode is toggled in Settings (it used to go stale until the
 * drawer was reopened). Static dot — no infinite animation.
 */

import { useStrategistCopy } from "@/lib/strategist/copy";
import { useStrategistSession } from "./StrategistSession";

export default function StrategistActivePill() {
  const { autonomous } = useStrategistSession();
  const { c } = useStrategistCopy();
  if (!autonomous?.enabled) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[12px] font-medium"
      title={c.activeAria}
    >
      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
      <span className="sr-only">{c.activeAria}</span>
      <span aria-hidden>{c.active}</span>
    </span>
  );
}
