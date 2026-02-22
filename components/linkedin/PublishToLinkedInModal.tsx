"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "@/components/ui/Modal";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import UpgradeProModal from "@/components/ui/UpgradeProModal";
import LinkedInConnectButton, { LinkedInIcon } from "./LinkedInConnectButton";
import { LinkedInConnectionData } from "@/lib/firestore";
import { useQuota } from "@/contexts/QuotaContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import toast from "@/components/ui/Toast";
import PlatformSelector from "@/components/publish/PlatformSelector";
import { Platform } from "@/types";
import { usePlatformSelection } from "@/hooks/usePlatformSelection";
import { triggerHaptic } from "@/hooks/useHapticFeedback";
import { useFacebook } from "@/contexts/FacebookContext";
import { useThreads } from "@/contexts/ThreadsContext";

// Visibility options for LinkedIn posts
type PostVisibility = "PUBLIC" | "CONNECTIONS";

interface VisibilityOption {
  id: PostVisibility;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    id: "PUBLIC",
    label: "Public",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: "Visible par tous sur LinkedIn",
  },
  {
    id: "CONNECTIONS",
    label: "Connexions",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    description: "Visible uniquement par vos relations",
  },
];

// Publishing step messages
const PUBLISHING_MESSAGES = [
  { progress: 0, message: "Connexion à LinkedIn..." },
  { progress: 30, message: "Préparation du contenu..." },
  { progress: 60, message: "Publication en cours..." },
  { progress: 90, message: "Finalisation..." },
  { progress: 100, message: "C'est en ligne!" },
];

type PublishStep = "preview" | "confirm" | "publishing" | "success" | "error";

interface PublishToLinkedInModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  linkedInConnection: LinkedInConnectionData | null;
  onPublish: (editedContent: string, visibility: PostVisibility) => Promise<{ success: boolean; postUrl?: string; error?: string }>;
}

export default function PublishToLinkedInModal({
  isOpen,
  onClose,
  content: initialContent,
  linkedInConnection,
  onPublish,
}: PublishToLinkedInModalProps) {
  const { quota, canPublish, recordPublish, isMaxPlan: quotaIsMax, currentPlan: quotaPlan } = useQuota();
  const { isMaxPlan: subIsMax, currentPlan: subPlan } = useSubscription();
  // Use either context to detect Max — SubscriptionContext is more reliable (normalizes plan names)
  const isMaxPlan = subIsMax || quotaIsMax;
  const currentPlan = subPlan || quotaPlan;
  const { isConnected: facebookConnected, publishToFacebook } = useFacebook();
  const { isConnected: threadsConnected, publishToThreads } = useThreads();
  const [step, setStep] = useState<PublishStep>("preview");
  const [editedContent, setEditedContent] = useState(initialContent);
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
  const [postUrl, setPostUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [progress, setProgress] = useState(0);
  const [publishMessage, setPublishMessage] = useState(PUBLISHING_MESSAGES[0].message);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Initialize mobile state with SSR-safe check
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Connected platforms
  const connectedPlatforms: Platform[] = [
    ...(linkedInConnection ? ["linkedin" as Platform] : []),
    ...(facebookConnected ? ["facebook" as Platform] : []),
    ...(threadsConnected ? ["threads" as Platform] : []),
  ];

  // Smart platform selection with persistence
  const {
    selectedPlatforms,
    togglePlatform,
    saveSelection,
  } = usePlatformSelection({
    connectedPlatforms,
    defaultPlatforms: ["linkedin"],
  });

  const handlePlatformToggle = (platform: Platform) => {
    if (platform === "linkedin" || platform === "facebook" || platform === "threads") {
      togglePlatform(platform);
    }
  };

  // Detect mobile - check on mount and when modal opens
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); // Immediate check
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Force re-check when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
    }
  }, [isOpen]);

  // Reset state when modal opens (platform selection persists via hook)
  useEffect(() => {
    if (isOpen) {
      setStep("preview");
      setEditedContent(initialContent);
      setVisibility("PUBLIC");
      setPostUrl(undefined);
      setError(undefined);
      setProgress(0);
      setPublishMessage(PUBLISHING_MESSAGES[0].message);
    }
  }, [isOpen, initialContent]);

  // Cleanup progress interval
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Update message based on progress
  useEffect(() => {
    const currentMessage = [...PUBLISHING_MESSAGES]
      .reverse()
      .find((m) => progress >= m.progress);
    if (currentMessage) {
      setPublishMessage(currentMessage.message);
    }
  }, [progress]);

  const handleClose = () => {
    if (step !== "publishing") {
      onClose();
    }
  };

  const handleConfirm = () => {
    // Safety check: prevent publish without platform
    if (selectedPlatforms.length === 0) {
      triggerHaptic("error");
      return;
    }
    // Max plan = unlimited, never block. Pro = check daily quota.
    if (!isMaxPlan && !canPublish) {
      triggerHaptic("warning");
      setShowUpgradeModal(true);
      return;
    }
    // Haptic feedback for proceeding to confirmation
    triggerHaptic("medium");
    setStep("confirm");
  };

  const handlePublish = async () => {
    // Safety check: prevent publish without platform
    if (selectedPlatforms.length === 0) {
      triggerHaptic("error");
      setError("Aucune plateforme sélectionnée");
      setStep("error");
      return;
    }

    // Haptic feedback for starting publication
    triggerHaptic("impact");
    setStep("publishing");
    setError(undefined);
    setProgress(0);

    // Start progress animation
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const increment = prev < 30 ? 6 : prev < 60 ? 4 : 2;
        return Math.min(prev + increment, 90);
      });
    }, 150);

    try {
      const results: { platform: string; success: boolean; url?: string; error?: string }[] = [];

      // Publish to LinkedIn if selected
      if (selectedPlatforms.includes("linkedin")) {
        const result = await onPublish(editedContent, visibility);
        results.push({
          platform: "LinkedIn",
          success: result.success,
          url: result.postUrl,
          error: result.error,
        });
      }

      // Publish to Facebook if selected
      if (selectedPlatforms.includes("facebook")) {
        const result = await publishToFacebook(editedContent);
        results.push({
          platform: "Facebook",
          success: result.success,
          url: result.postUrl,
          error: result.error,
        });
      }

      // Publish to Threads if selected
      if (selectedPlatforms.includes("threads")) {
        const result = await publishToThreads(editedContent);
        results.push({
          platform: "Threads",
          success: result.success,
          url: result.permalink,
          error: result.error,
        });
      }

      const successResults = results.filter((r) => r.success);
      const failedResults = results.filter((r) => !r.success);

      if (successResults.length > 0) {
        // Record publish in quota
        await recordPublish();
        // Save platform selection for future sessions
        saveSelection();
        // Animate to 100%
        setProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 600));
        // Success haptic feedback - celebratory pattern
        triggerHaptic("success");
        // Use the first successful URL
        setPostUrl(successResults[0].url);
        setStep("success");

        const platformNames = successResults.map((r) => r.platform).join(", ");
        toast.success(`Post publié sur ${platformNames}`);

        if (failedResults.length > 0) {
          const failedNames = failedResults.map((r) => r.platform).join(", ");
          toast.error(`Échec sur ${failedNames}: ${failedResults[0].error}`);
        }
      } else {
        // All failed
        triggerHaptic("error");
        setError(failedResults.map((r) => `${r.platform}: ${r.error}`).join("\n") || "Une erreur est survenue");
        setStep("error");
      }
    } catch (err) {
      // Error haptic feedback
      triggerHaptic("error");
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setStep("error");
    } finally {
      // Always cleanup the interval, regardless of success or error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  const handleRetry = () => {
    setStep("preview");
    setError(undefined);
    setProgress(0);
  };

  const isConnected = !!linkedInConnection;
  const characterCount = editedContent.length;
  const isOverLimit = characterCount > 3000;
  const noPlatformSelected = selectedPlatforms.length === 0;
  const cannotPublish = isOverLimit || !editedContent.trim() || noPlatformSelected;

  // Content to render inside modal/bottom sheet
  const renderContent = () => {
    // If not connected, show enhanced connect prompt
    if (!isConnected) {
      return (
        <div className="py-2">
          {/* Visual header with LinkedIn branding */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A66C2]/20 to-[#004182]/10 rounded-2xl blur-xl" />
            <div className="relative bg-gradient-to-br from-[#0A66C2]/10 to-[#004182]/5 rounded-2xl p-6 border border-[#0A66C2]/20">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-[#0A66C2] to-[#004182] flex items-center justify-center shadow-lg shadow-[#0A66C2]/30">
                  <LinkedInIcon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Connectez LinkedIn
                </h3>
                <p className="text-text-secondary text-sm max-w-xs">
                  Publiez vos posts directement sur LinkedIn en un clic, sans quitter Posty.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits list */}
          <div className="space-y-3 mb-6">
            {[
              { icon: "⚡", text: "Publication en un clic" },
              { icon: "🔒", text: "Connexion sécurisée OAuth 2.0" },
              { icon: "📊", text: "Suivi de vos publications" },
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-elevated/50 rounded-xl border border-gray-200 dark:border-dark-border/50">
                <span className="text-lg">{benefit.icon}</span>
                <span className="text-sm text-text-secondary">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Action buttons with improved sizing */}
          <div className="space-y-3">
            <LinkedInConnectButton className="w-full" variant="default" />
            <Button
              variant="ghost"
              fullWidth
              onClick={handleClose}
              className="min-h-[48px] text-text-muted hover:text-gray-900 dark:hover:text-white"
            >
              Annuler
            </Button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Preview Step */}
        {step === "preview" && (
          <div className="space-y-5">
            {/* LinkedIn Profile */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
              {linkedInConnection?.profilePicture ? (
                <img
                  src={linkedInConnection.profilePicture}
                  alt={linkedInConnection.profileName}
                  className="w-10 h-10 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#0A66C2]/20 flex items-center justify-center">
                  <LinkedInIcon className="w-5 h-5 text-[#0A66C2]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 dark:text-white font-medium truncate">{linkedInConnection?.profileName}</p>
                <p className="text-xs text-text-muted">Sera publié sur votre profil</p>
              </div>
            </div>

            {/* Platform Selector */}
            <PlatformSelector
              selectedPlatforms={selectedPlatforms}
              connectedPlatforms={connectedPlatforms}
              onToggle={handlePlatformToggle}
              showAllPlatforms={true}
            />

            {/* Quota Info — only for Pro users with a daily limit */}
            {quota && quota.plan === "pro" && (
              <div
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  canPublish
                    ? "bg-gray-50 dark:bg-dark-bg border-gray-200 dark:border-dark-border"
                    : "bg-error/10 border-error/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{canPublish ? "\uD83D\uDCCA" : "\u26A0\uFE0F"}</span>
                  <span className="text-sm text-text-secondary">
                    {canPublish ? (
                      <>
                        <span className="text-gray-900 dark:text-white font-medium">{quota.remaining}</span> publication
                        {quota.remaining > 1 ? "s" : ""} restante{quota.remaining > 1 ? "s" : ""} aujourd&apos;hui
                      </>
                    ) : (
                      <span className="text-error">Limite quotidienne atteinte</span>
                    )}
                  </span>
                </div>
                {!canPublish && (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="text-xs text-accent hover:text-accent/80 font-medium min-h-[44px] px-2 flex items-center"
                  >
                    Passer Max
                  </button>
                )}
              </div>
            )}

            {/* Visibility Selector */}
            <div>
              <p className="text-xs text-text-muted mb-2 font-medium uppercase tracking-wide">
                Visibilité
              </p>
              <div className="grid grid-cols-2 gap-2">
                {VISIBILITY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      triggerHaptic("selection");
                      setVisibility(option.id);
                    }}
                    className={`
                      min-h-[44px] p-3 rounded-lg border transition-all duration-200
                      flex items-center gap-3
                      ${
                        visibility === option.id
                          ? "bg-[#0A66C2]/20 border-[#0A66C2] text-[#0A66C2]"
                          : "bg-gray-50 dark:bg-dark-bg border-gray-200 dark:border-dark-border text-text-secondary hover:border-gray-300 dark:hover:border-dark-hover hover:text-gray-900 dark:hover:text-white"
                      }
                    `}
                  >
                    {option.icon}
                    <div className="text-left">
                      <span className="text-sm font-medium block">{option.label}</span>
                      <span className="text-xs opacity-70">{option.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
                  Contenu du post
                </p>
                <button
                  onClick={() => setEditedContent(initialContent)}
                  className="text-xs text-accent hover:text-accent/80 transition-colors min-h-[44px] px-2 flex items-center"
                >
                  Réinitialiser
                </button>
              </div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className={`
                  w-full p-4 bg-gray-50 dark:bg-dark-bg border rounded-lg text-gray-900 dark:text-white text-sm
                  resize-none focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/50
                  transition-all duration-200 min-h-[160px] max-h-[300px]
                  ${isOverLimit ? "border-error" : "border-gray-200 dark:border-dark-border"}
                `}
                placeholder="Rédigez votre post LinkedIn..."
              />
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-text-muted">
                  {editedContent !== initialContent && (
                    <span className="text-warning">Modifié</span>
                  )}
                </span>
                <span className={isOverLimit ? "text-error font-medium" : "text-text-muted"}>
                  {characterCount} / 3000
                </span>
              </div>
            </div>

            {/* No platform selected warning */}
            {noPlatformSelected && (
              <div className="flex items-start gap-3 p-3 bg-error/10 border border-error/30 rounded-lg">
                <svg className="w-5 h-5 text-error shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-error">
                  Aucune plateforme sélectionnée. Veuillez sélectionner au moins un réseau pour publier.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={handleClose}
                className="min-h-[48px]"
              >
                Annuler
              </Button>
              <Button
                fullWidth
                onClick={handleConfirm}
                disabled={cannotPublish}
                className={`min-h-[48px] ${
                  cannotPublish
                    ? "bg-gray-100 dark:bg-dark-hover border-gray-200 dark:border-dark-border cursor-not-allowed opacity-50"
                    : "bg-[#0A66C2] hover:bg-[#004182] border-none"
                }`}
              >
                <LinkedInIcon className="w-4 h-4 mr-2" />
                Publier
              </Button>
            </div>
          </div>
        )}

        {/* Confirm Step */}
        {step === "confirm" && (
          <div className="space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-warning/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Êtes-vous sûr ?</h3>
              <p className="text-text-secondary text-sm">
                {visibility === "PUBLIC"
                  ? "Votre post sera publié publiquement sur LinkedIn et visible par tous."
                  : "Votre post sera visible uniquement par vos connexions LinkedIn."}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setStep("preview")}
                className="min-h-[48px]"
              >
                Retour
              </Button>
              <Button
                fullWidth
                onClick={handlePublish}
                className="bg-[#0A66C2] hover:bg-[#004182] border-none min-h-[48px]"
              >
                Oui, publier
              </Button>
            </div>
          </div>
        )}

        {/* Publishing Step */}
        {step === "publishing" && (
          <div className="text-center py-8">
            {/* Circular Progress */}
            <div className="relative w-28 h-28 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(10, 102, 194, 0.2)"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#0A66C2"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - progress / 100) }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <LinkedInIcon className="w-6 h-6 text-[#0A66C2] mb-1" />
                <span className="text-lg font-bold text-gray-900 dark:text-white">{progress}%</span>
              </div>
            </div>

            {/* Dynamic message */}
            <AnimatePresence mode="wait">
              <motion.div
                key={publishMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-gray-900 dark:text-white font-semibold text-lg mb-2">
                  {progress === 100 ? (
                    <span className="flex items-center justify-center gap-2">
                      C'est en ligne! <span className="text-xl">\uD83D\uDE80</span>
                    </span>
                  ) : (
                    publishMessage
                  )}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress bar */}
            <div className="mt-6 mx-auto max-w-xs">
              <div className="h-1.5 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#0A66C2] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === "success" && (
          <div className="text-center py-6">
            <motion.div
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
            >
              <motion.svg
                className="w-10 h-10 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </motion.svg>
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Post publié !</h3>
            <p className="text-text-secondary text-sm mb-6">
              Votre post a été publié avec succès{selectedPlatforms.length > 1 ? " sur les plateformes sélectionnées" : ""}.
            </p>
            {postUrl && (
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#0A66C2] hover:text-[#004182] transition-colors mb-6 min-h-[44px] px-4"
              >
                Voir le post
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            <Button fullWidth onClick={handleClose} className="min-h-[48px]">
              Fermer
            </Button>
          </div>
        )}

        {/* Error Step */}
        {step === "error" && (
          <div className="space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-error/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Échec de la publication</h3>
              <p className="text-error text-sm">{error}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={handleClose} className="min-h-[48px]">
                Fermer
              </Button>
              <Button fullWidth onClick={handleRetry} className="min-h-[48px]">
                Réessayer
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  // Render mobile (BottomSheet) or desktop (Modal)
  return (
    <>
      {isMobile ? (
        <BottomSheet
          isOpen={isOpen}
          onClose={handleClose}
          title={step === "success" ? "" : step === "error" ? "Erreur" : "Publier sur LinkedIn"}
          swipeToDismiss={step !== "publishing"}
        >
          {renderContent()}
        </BottomSheet>
      ) : (
        <Modal
          isOpen={isOpen}
          onClose={handleClose}
          title={step === "success" ? "" : step === "error" ? "Erreur" : "Publier sur LinkedIn"}
          size="md"
        >
          {renderContent()}
        </Modal>
      )}

      {/* Upgrade Modal */}
      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        remaining={quota?.remaining}
        resetsAt={quota?.resetsAt}
        currentPlan={currentPlan}
      />
    </>
  );
}
