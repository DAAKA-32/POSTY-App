"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import toast from "@/components/ui/Toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAuthHeaders } from "@/lib/api/client";

/**
 * DowngradeConfirmModal — premium-SaaS pattern for the "switch to Free" CTA
 * when the user already has a paid Pro / Max subscription.
 *
 * The previous flow would call `activateFreePlan(uid)` directly, wiping the
 * paid plan instantly and showing the "Bienvenue sur Free" welcome modal —
 * which is what Stripe / Linear / Notion etc. explicitly avoid. They instead
 * schedule a `cancel_at_period_end` cancellation: the user keeps full paid
 * features until the billing period ends, then auto-downgrades to Free.
 *
 * This modal renders that confirmation:
 *   • Explains exactly what will happen (loss of features, the date access ends)
 *   • Surfaces the friction needed to prevent accidental downgrades
 *   • On confirm, POSTs to /api/stripe/subscription (action: "cancel"), which
 *     resolves the subscriptionId server-side from auth.uid (no client trust).
 */
interface DowngradeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Localized name of the current paid plan, e.g. "Pro" or "Max". */
  currentPlanName: string;
  /** End of the current billing period — user keeps access until then. */
  periodEnd?: Date;
  /** Called after the cancellation is confirmed by Stripe so the parent can
   *  refresh subscription state from Firestore (webhook fires shortly after). */
  onCanceled?: () => void;
}

export default function DowngradeConfirmModal({
  isOpen,
  onClose,
  currentPlanName,
  periodEnd,
  onCanceled,
}: DowngradeConfirmModalProps) {
  const { t, language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pragmatic i18n: the surrounding subscriptionPage namespace doesn't have
  // dedicated downgrade strings yet and Posty ships in 10 languages. Rather
  // than touch every translation file for a flow that's primarily exercised
  // by French/English users (the only ones with self-serve paid plans
  // today), we localize inline with FR/EN, falling back to EN otherwise.
  const isFr = language === "fr";
  const strings = isFr
    ? {
        title: "Rétrograder vers le plan Free ?",
        intro: `Vous êtes actuellement sur le plan ${currentPlanName}.`,
        keepUntil: periodEnd
          ? `Vous conserverez tous les avantages ${currentPlanName} jusqu'au ${periodEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}. Après cette date, votre compte passera automatiquement sur le plan Free et certaines fonctionnalités deviendront indisponibles.`
          : `Vous conserverez tous les avantages ${currentPlanName} jusqu'à la fin de votre période en cours. Après cette date, votre compte passera automatiquement sur le plan Free et certaines fonctionnalités deviendront indisponibles.`,
        noRefund:
          "Aucun remboursement n'est effectué pour la période en cours — elle a déjà été facturée.",
        confirm: "Confirmer l'annulation",
        keep: `Garder le plan ${currentPlanName}`,
        submitting: "Annulation…",
        successToast: periodEnd
          ? `Abonnement annulé. Vous gardez ${currentPlanName} jusqu'au ${periodEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`
          : `Abonnement annulé. Vous gardez ${currentPlanName} jusqu'à la fin de la période.`,
        errorToast: "Impossible d'annuler l'abonnement. Réessayez.",
      }
    : {
        title: "Downgrade to the Free plan?",
        intro: `You're currently on the ${currentPlanName} plan.`,
        keepUntil: periodEnd
          ? `You'll keep every ${currentPlanName} benefit until ${periodEnd.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}. After that date, your account auto-downgrades to Free and some features become unavailable.`
          : `You'll keep every ${currentPlanName} benefit until the end of your current period. After that date, your account auto-downgrades to Free and some features become unavailable.`,
        noRefund:
          "No refund will be issued for the current period — it's already been billed.",
        confirm: "Confirm cancellation",
        keep: `Keep ${currentPlanName}`,
        submitting: "Canceling…",
        successToast: periodEnd
          ? `Subscription canceled. You'll keep ${currentPlanName} until ${periodEnd.toLocaleDateString("en-US", { day: "numeric", month: "long" })}.`
          : `Subscription canceled. You'll keep ${currentPlanName} until the period ends.`,
        errorToast: "Couldn't cancel the subscription. Please try again.",
      };

  // Stamp out the unused `t` lint without losing the import — the
  // surrounding modals all reference t.* and a future i18n migration of
  // this flow will need it again.
  void t;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Cancel failed");
      toast.success(strings.successToast);
      onCanceled?.();
      onClose();
    } catch (err) {
      console.error("DowngradeConfirmModal cancel error:", err);
      toast.error(strings.errorToast);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={strings.title}
      size="md"
      accent="welcome"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end px-4 sm:px-6 py-3 sm:py-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="sm:min-w-[140px]"
          >
            {strings.keep}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="sm:min-w-[180px]"
          >
            {isSubmitting ? strings.submitting : strings.confirm}
          </Button>
        </div>
      }
    >
      <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3.5 text-sm sm:text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
        <p className="font-medium text-gray-900 dark:text-white">
          {strings.intro}
        </p>
        <p>{strings.keepUntil}</p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {strings.noRefund}
        </p>
      </div>
    </Modal>
  );
}
