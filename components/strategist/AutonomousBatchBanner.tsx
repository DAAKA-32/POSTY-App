"use client";

/**
 * AutonomousBatchBanner — surfaces a pending auto-generated batch to the user.
 *
 * The Phase 4 Cloud Function sets `users/{uid}.pendingAutoBatchId` after it
 * generates the weekly batch. This banner watches that field via a snapshot
 * listener and slides in from the bottom when a batch is waiting for review.
 *
 * Click → opens the Strategist drawer AND emits a window event
 * `strategist:open-batch` with the batchId so the chat panel can scroll to
 * (or fetch) the batch. The field is cleared from Firestore on click so the
 * banner doesn't keep re-appearing across reloads.
 *
 * Why a snapshot listener (not a one-shot getDoc)? The batch arrives while
 * the app is open (cron fires at 08:00, user is browsing) — we want the
 * banner to materialize without a page reload.
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

export default function AutonomousBatchBanner() {
  const { user } = useAuth();
  const strategist = useStrategistDrawer();
  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  // Watch the user doc for changes to pendingAutoBatchId.
  useEffect(() => {
    if (!user?.uid || !isStrategistEnabled()) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const id = snap.exists() ? (snap.data().pendingAutoBatchId as string | undefined) : undefined;
        setPendingBatchId(id ?? null);
        // Reset the local hide flag if a NEW batch arrives (so dismissing
        // batch A doesn't permanently hide the banner for batch B).
        if (id) setHidden(false);
      },
      (err) => {
        console.warn("[AutonomousBatchBanner] snapshot error:", err);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const clearPending = async () => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        pendingAutoBatchId: deleteField(),
      });
    } catch (err) {
      console.warn("[AutonomousBatchBanner] clear failed:", err);
    }
  };

  const open = () => {
    if (!pendingBatchId) return;
    // Stash the batch id where the Strategist chat panel can pick it up.
    // Using a window event keeps the two components decoupled — no need
    // to thread state through React context.
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("strategist:open-batch", { detail: { batchId: pendingBatchId } })
      );
    }
    strategist.open();
    void clearPending();
    setHidden(true);
  };

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHidden(true);
    void clearPending();
  };

  const visible = !!pendingBatchId && !hidden;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="
            fixed bottom-4 left-1/2 -translate-x-1/2 z-50
            w-[min(560px,calc(100vw-2rem))]
            rounded-2xl
            bg-white dark:bg-dark-card
            border border-amber-300/60 dark:border-amber-400/40
            shadow-[0_12px_40px_-8px_rgba(245,158,11,0.35)]
            cursor-pointer
            overflow-hidden
          "
          onClick={open}
          role="button"
          aria-label="Voir le plan généré automatiquement"
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 flex-shrink-0">
              <StrategistMark className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 dark:text-white">
                Ton plan de la semaine est prêt ✨
              </p>
              <p className="text-[11.5px] text-text-muted leading-snug">
                Le Stratège a préparé un nouveau batch. Clique pour le revoir.
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Ignorer"
              className="
                p-1.5 rounded-md flex-shrink-0
                text-text-muted hover:text-gray-900 dark:hover:text-white
                hover:bg-gray-100 dark:hover:bg-dark-hover
                transition-colors
              "
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
