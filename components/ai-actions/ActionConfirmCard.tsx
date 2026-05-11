"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthHeaders } from "@/lib/api/client";
import type { DetectedAIAction, AIActionType } from "@/types";

type ActionStatus = "pending" | "executing" | "success" | "error" | "cancelled";

interface ActionConfirmCardProps {
  action: DetectedAIAction;
  onSuccess?: (actionType: AIActionType, data?: unknown) => void;
  onCancel?: () => void;
}

// Actions resolved client-side (no API call needed)
const CLIENT_ONLY_ACTIONS = new Set<AIActionType>(["publish_post"]);

const ICON: Record<AIActionType, string> = {
  schedule_post: "📅",
  publish_post: "🚀",
  delete_conversation: "🗑️",
};

const CARD_STYLE: Record<AIActionType, string> = {
  schedule_post:
    "from-blue-500/8 to-blue-600/4 border-blue-200/60 dark:border-blue-700/30",
  publish_post:
    "from-primary/8 to-primary/4 border-primary/30",
  delete_conversation:
    "from-red-500/8 to-red-600/4 border-red-200/60 dark:border-red-700/30",
};

const CONFIRM_BTN: Record<AIActionType, string> = {
  schedule_post:
    "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
  publish_post:
    "bg-primary hover:bg-primary/90 active:bg-primary/80",
  delete_conversation:
    "bg-red-600 hover:bg-red-700 active:bg-red-800",
};

export default function ActionConfirmCard({
  action,
  onSuccess,
  onCancel,
}: ActionConfirmCardProps) {
  const [status, setStatus] = useState<ActionStatus>("pending");
  const [resultMsg, setResultMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const executeAction = useCallback(async () => {
    setStatus("executing");
    setErrorMsg("");

    // publish_post → delegate to parent (opens existing modal)
    if (CLIENT_ONLY_ACTIONS.has(action.type)) {
      setStatus("success");
      setResultMsg("Ouverture de la fenêtre de publication…");
      onSuccess?.(action.type);
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/ai/action", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: action.type,
          params: action.params,
        }),
      });

      const data: { success?: boolean; message?: string; error?: string; data?: unknown } =
        await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || `Erreur ${res.status}`);
      }

      setResultMsg(data.message || "Action réussie");
      setStatus("success");
      onSuccess?.(action.type, data.data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur inattendue");
      setStatus("error");
    }
  }, [action, onSuccess]);

  const handleCancel = useCallback(() => {
    setStatus("cancelled");
    onCancel?.();
  }, [onCancel]);

  const icon = ICON[action.type];
  const cardStyle = CARD_STYLE[action.type];
  const confirmBtn = CONFIRM_BTN[action.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      className={`
        w-full max-w-sm bg-gradient-to-br ${cardStyle}
        border rounded-2xl p-4 shadow-sm
      `}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3.5">
        <span className="text-xl leading-none mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary leading-tight">
            {action.displayLabel}
          </p>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
            {action.displayDetails}
          </p>
        </div>
      </div>

      {/* State content */}
      <AnimatePresence mode="wait" initial={false}>

        {status === "pending" && (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="flex gap-2"
          >
            <button
              onClick={executeAction}
              className={`
                flex-1 ${confirmBtn}
                text-white text-sm font-medium py-2 px-4 rounded-xl
                transition-all duration-150 active:scale-[0.97]
              `}
            >
              Confirmer
            </button>
            <button
              onClick={handleCancel}
              className="
                flex-1 border border-border/60 hover:bg-black/5 dark:hover:bg-white/5
                text-text-secondary text-sm font-medium py-2 px-4 rounded-xl
                transition-all duration-150 active:scale-[0.97]
              "
            >
              Annuler
            </button>
          </motion.div>
        )}

        {status === "executing" && (
          <motion.div
            key="executing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="flex items-center gap-2.5 text-text-secondary text-sm py-1"
          >
            <svg
              className="animate-spin h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>En cours…</span>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm py-1"
          >
            <span className="text-base leading-none">✓</span>
            <span className="font-medium">{resultMsg}</span>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <p className="text-red-600 dark:text-red-400 text-xs leading-relaxed">
              {errorMsg}
            </p>
            <div className="flex gap-2">
              <button
                onClick={executeAction}
                className={`
                  ${confirmBtn}
                  text-white text-xs font-medium py-1.5 px-3 rounded-lg
                  transition-all duration-150
                `}
              >
                Réessayer
              </button>
              <button
                onClick={handleCancel}
                className="text-text-muted text-xs py-1.5 px-3 rounded-lg border border-border/50 transition-all duration-150"
              >
                Annuler
              </button>
            </div>
          </motion.div>
        )}

        {status === "cancelled" && (
          <motion.div
            key="cancelled"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-text-muted text-xs py-1 italic"
          >
            Action annulée
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
