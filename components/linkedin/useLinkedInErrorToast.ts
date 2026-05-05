"use client";

/**
 * useLinkedInErrorToast — fires a friendly, actionable toast for any LinkedIn
 * error response. The toast shows the rassurant copy + a recovery button
 * ("Reconnect", "Try again", etc.) wired to the right context action.
 *
 *   const showLinkedInError = useLinkedInErrorToast();
 *   showLinkedInError({ code: "token_expired" });
 *   // or
 *   showLinkedInError(err);
 *
 * Centralizes the wiring between:
 *   - i18n keys (lib/i18n/translations/*.ts → linkedinErrors)
 *   - Code/message → friendly mapping (lib/utils/linkedin-errors.ts)
 *   - LinkedInContext.connectLinkedIn() (the actual reconnect flow)
 *   - toast UI (components/ui/Toast)
 */

import { useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { getLinkedInError } from "@/lib/utils/linkedin-errors";
import toast from "@/components/ui/Toast";

export function useLinkedInErrorToast() {
  const { t } = useLanguage();
  const { connectLinkedIn } = useLinkedIn();

  return useCallback(
    (input: { code?: string; raw?: string } | string | unknown) => {
      const friendly = getLinkedInError(input, t);

      // No actionable button → plain error toast
      if (!friendly.actionLabel || !friendly.actionType) {
        toast.error(friendly.message);
        return;
      }

      // With action → toast with a CTA button
      const action =
        friendly.actionType === "reconnect" || friendly.actionType === "connect"
          ? { label: friendly.actionLabel, onClick: () => connectLinkedIn() }
          : friendly.actionType === "retry"
            ? { label: friendly.actionLabel, onClick: () => window.location.reload() }
            : undefined;

      toast.error(friendly.message, action ? { action } : undefined);
    },
    [t, connectLinkedIn]
  );
}
