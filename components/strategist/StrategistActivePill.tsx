"use client";

/**
 * StrategistActivePill — tiny status badge that reads the user's
 * `autonomousMode.enabled` flag and shows a green pulsing dot + "Actif"
 * label when the agent is on duty.
 *
 * Rendered in the drawer header so the user always sees, at a glance,
 * whether the autonomous loop is running for them. Hidden when the agent
 * is off (no badge clutter for the default state).
 *
 * Reads via a one-shot getDoc on mount — the flag doesn't change often
 * enough to justify a snapshot listener for what is essentially a header
 * decoration. If the user toggles in-session, the pill refreshes on the
 * next drawer open.
 */

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/db/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { AutonomousStrategistConfig } from "@/types";

export default function StrategistActivePill() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const cfg = snap.exists()
          ? (snap.data().autonomousMode as AutonomousStrategistConfig | undefined)
          : undefined;
        setEnabled(!!cfg?.enabled);
      } catch {
        /* silent — pill is decorative */
      }
    })();
  }, [user?.uid]);

  if (!enabled) return null;

  return (
    <span
      className="
        inline-flex items-center gap-1
        px-1.5 py-[2px] rounded
        bg-emerald-50 dark:bg-emerald-500/15
        text-emerald-700 dark:text-emerald-400
        text-[9.5px] font-semibold uppercase tracking-wider
        border border-emerald-200/60 dark:border-emerald-400/20
      "
      aria-label="Agent autonome actif"
    >
      <span className="relative inline-flex w-1.5 h-1.5">
        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
        <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
      </span>
      Actif
    </span>
  );
}
