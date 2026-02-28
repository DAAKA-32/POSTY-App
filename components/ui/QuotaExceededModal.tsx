"use client";

import Link from "next/link";
import { useQuota } from "@/contexts/QuotaContext";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

/**
 * Modal displayed when a user attempts an action with an exhausted quota.
 * Adapts copy based on plan type (monthly for Free, daily for Pro).
 */
export default function QuotaExceededModal() {
  const {
    showQuotaModal,
    closeQuotaModal,
    isFreePlan,
    monthlyLimit,
    dailyLimit,
    quotaResetLabel,
  } = useQuota();

  const limitText = isFreePlan
    ? `${monthlyLimit} créations ce mois`
    : `${dailyLimit} créations aujourd'hui`;
  const upgradePlan = isFreePlan ? "Pro" : "Max";
  const upgradeHref = isFreePlan
    ? "/subscription?plan=pro"
    : "/subscription?plan=max";

  return (
    <Modal
      isOpen={showQuotaModal}
      onClose={closeQuotaModal}
      title="Quota atteint"
      size="sm"
    >
      <div className="text-center py-2">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-error/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Body */}
        <p className="text-text-secondary mb-2">
          Vous avez utilisé vos{" "}
          <span className="font-semibold text-white">{limitText}</span>.
        </p>
        {quotaResetLabel && (
          <p className="text-text-muted text-sm mb-6">
            Prochain reset : <span className="font-medium text-text-secondary">{quotaResetLabel}</span>
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link href={upgradeHref}>
            <Button variant="primary" fullWidth>
              Passer au plan {upgradePlan}
            </Button>
          </Link>
          <Button variant="ghost" onClick={closeQuotaModal} fullWidth>
            OK, j&apos;ai compris
          </Button>
        </div>
      </div>
    </Modal>
  );
}
