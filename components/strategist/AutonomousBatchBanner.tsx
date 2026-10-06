"use client";

/**
 * AutonomousBatchBanner — surfaces a pending auto-generated plan.
 *
 * The weekly Cloud Function sets `users/{uid}.pendingAutoBatchId`; a snapshot
 * listener shows this banner while the app is open. "View the plan" calls
 * openBatch(id): the drawer opens AND the plan is queued in the drawer context,
 * where the conversation picks it up once mounted. (It used to fire a window
 * event before the panel existed, so the plan was lost and the drawer opened
 * empty.) The pending field is cleared on open or dismiss.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { onSnapshot, doc, updateDoc, deleteField } from "firebase/firestore";
import { X } from "lucide-react";
import StrategistMark from "./StrategistMark";
import { db } from "@/lib/db/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useStrategistDrawer } from "@/contexts/StrategistDrawerContext";
import { isStrategistEnabled } from "@/lib/config/feature-flags";
import { useStrategistCopy } from "@/lib/strategist/copy";
import { focusRing } from "./ui";

export default function AutonomousBatchBanner() {
  const { user } = useAuth();
  const { openBatch } = useStrategistDrawer();
  const { c } = useStrategistCopy();
  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!user?.uid || !isStrategistEnabled()) return;
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const id = snap.exists() ? (snap.data().pendingAutoBatchId as string | undefined) : undefined;
        setPendingBatchId(id ?? null);
        if (id) setHidden(false);
      },
      (err) => console.warn("[AutonomousBatchBanner] snapshot error:", err)
    );
    return () => unsub();
  }, [user?.uid]);

  const clearPending = async () => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { pendingAutoBatchId: deleteField() });
    } catch (err) {
      console.warn("[AutonomousBatchBanner] clear failed:", err);
    }
  };

  const open = () => {
    if (!pendingBatchId) return;
    openBatch(pendingBatchId);
    setHidden(true);
    void clearPending();
  };

  const dismiss = () => {
    setHidden(true);
    void clearPending();
  };

  const visible = !!pendingBatchId && !hidden;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label={c.banner.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed left-1/2 -translate-x-1/2 z-50 bottom-[max(1rem,env(safe-area-inset-bottom))] w-[min(560px,calc(100vw-2rem))] rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-lg"
        >
          <div className="flex items-center gap-3 pl-4 pr-2 py-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-400/15 text-amber-700 dark:text-amber-400 flex-shrink-0">
              <StrategistMark className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{c.banner.title}</p>
              <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-snug">{c.banner.desc}</p>
            </div>
            <button
              type="button"
              onClick={open}
              className={`h-10 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-900 text-[14px] font-semibold flex-shrink-0 ${focusRing}`}
            >
              {c.banner.open}
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label={c.banner.dismiss}
              className={`w-10 h-10 inline-flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover flex-shrink-0 ${focusRing}`}
            >
              <X aria-hidden className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
