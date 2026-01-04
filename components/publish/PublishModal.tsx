"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "@/components/ui/Modal";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import UpgradeProModal from "@/components/ui/UpgradeProModal";
import PlatformSelector from "./PlatformSelector";
import CharacterCounter from "./CharacterCounter";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useQuota } from "@/contexts/QuotaContext";
import { Platform, PublishResult } from "@/types";
import toast from "react-hot-toast";

type PublishStep = "preview" | "confirm" | "publishing" | "success" | "error";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  postId?: string;
}

export default function PublishModal({
  isOpen,
  onClose,
  content: initialContent,
  postId,
}: PublishModalProps) {
  // Contexts
  const { isConnected: linkedInConnected, publishToLinkedIn } = useLinkedIn();
  const { quota, canPublish, recordPublish } = useQuota();

  // State
  const [step, setStep] = useState<PublishStep>("preview");
  const [editedContent, setEditedContent] = useState(initialContent);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [results, setResults] = useState<PublishResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Connected platforms
  const connectedPlatforms: Platform[] = [
    ...(linkedInConnected ? ["linkedin" as Platform] : []),
  ];

  // Auto-select first connected platform
  useEffect(() => {
    if (isOpen && connectedPlatforms.length > 0 && selectedPlatforms.length === 0) {
      // Auto-select LinkedIn if connected, otherwise first connected platform
      if (linkedInConnected) {
        setSelectedPlatforms(["linkedin"]);
      } else {
        setSelectedPlatforms([connectedPlatforms[0]]);
      }
    }
  }, [isOpen, connectedPlatforms, linkedInConnected]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("preview");
      setEditedContent(initialContent);
      setResults([]);
      setProgress(0);
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

  const handleClose = () => {
    if (step !== "publishing") {
      onClose();
    }
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleConfirm = () => {
    if (!canPublish) {
      setShowUpgradeModal(true);
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Selectionnez au moins une plateforme");
      return;
    }
    setStep("confirm");
  };

  const handlePublish = async () => {
    setStep("publishing");
    setProgress(0);
    setResults([]);

    // Start progress animation
    const totalSteps = selectedPlatforms.length;
    let completedSteps = 0;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const target = ((completedSteps + 0.5) / totalSteps) * 100;
        if (prev >= target) return prev;
        return Math.min(prev + 2, target);
      });
    }, 100);

    const publishResults: PublishResult[] = [];

    // Publish to each platform
    for (const platform of selectedPlatforms) {
      try {
        let result: PublishResult;

        if (platform === "linkedin") {
          const linkedInResult = await publishToLinkedIn(editedContent);
          result = {
            platform: "linkedin",
            success: linkedInResult.success,
            postUrl: linkedInResult.postUrl,
            error: linkedInResult.error,
          };
        } else {
          result = { platform, success: false, error: "Plateforme non supportee" };
        }

        publishResults.push(result);
        completedSteps++;
      } catch (error) {
        publishResults.push({
          platform,
          success: false,
          error: error instanceof Error ? error.message : "Erreur inattendue",
        });
        completedSteps++;
      }
    }

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    setProgress(100);
    setResults(publishResults);

    // Record publish in quota if at least one succeeded
    const successCount = publishResults.filter((r) => r.success).length;
    if (successCount > 0) {
      await recordPublish();
    }

    // Wait a bit then show results
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (successCount === publishResults.length) {
      setStep("success");
      toast.success(
        successCount === 1
          ? "Publication reussie !"
          : `${successCount} publications reussies !`,
        { icon: "\uD83C\uDF89" }
      );
    } else if (successCount > 0) {
      setStep("success"); // Partial success still shows success screen with details
      toast.success(`${successCount}/${publishResults.length} publications reussies`);
    } else {
      setStep("error");
    }
  };

  const handleRetry = () => {
    setStep("preview");
    setResults([]);
    setProgress(0);
  };

  // Validation
  const characterCount = editedContent.length;
  const isLinkedInOverLimit = characterCount > 3000;
  const canPublishNow = selectedPlatforms.length > 0 && editedContent.trim() && !isLinkedInOverLimit;

  // Get platform name for display
  const getPlatformName = (platform: Platform): string => {
    switch (platform) {
      case "linkedin": return "LinkedIn";
      default: return platform;
    }
  };

  // Render content
  const renderContent = () => {
    // No connected platforms
    if (connectedPlatforms.length === 0) {
      return (
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-warning/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-white font-medium mb-2">Aucun compte connecte</p>
          <p className="text-text-secondary text-sm mb-6">
            Connectez au moins un compte dans les parametres pour publier.
          </p>
          <Button variant="secondary" fullWidth onClick={handleClose}>
            Fermer
          </Button>
        </div>
      );
    }

    return (
      <>
        {/* Preview Step */}
        {step === "preview" && (
          <div className="space-y-5">
            {/* Platform Selector */}
            <PlatformSelector
              selectedPlatforms={selectedPlatforms}
              connectedPlatforms={connectedPlatforms}
              onToggle={togglePlatform}
            />

            {/* Quota Info */}
            {quota && quota.plan === "free" && (
              <div
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  canPublish
                    ? "bg-dark-bg border-dark-border"
                    : "bg-error/10 border-error/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{canPublish ? "\uD83D\uDCCA" : "\u26A0\uFE0F"}</span>
                  <span className="text-sm text-text-secondary">
                    {canPublish ? (
                      <>
                        <span className="text-white font-medium">{quota.remaining}</span> publication
                        {quota.remaining > 1 ? "s" : ""} restante{quota.remaining > 1 ? "s" : ""}
                      </>
                    ) : (
                      <span className="text-error">Limite atteinte</span>
                    )}
                  </span>
                </div>
                {!canPublish && (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="text-xs text-accent hover:text-accent/80 font-medium min-h-[44px] px-2 flex items-center"
                  >
                    Passer Pro
                  </button>
                )}
              </div>
            )}

            {/* Editable Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
                  Contenu
                </p>
                <button
                  onClick={() => setEditedContent(initialContent)}
                  className="text-xs text-accent hover:text-accent/80 transition-colors min-h-[44px] px-2 flex items-center"
                >
                  Reinitialiser
                </button>
              </div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className={`
                  w-full p-4 bg-dark-bg border rounded-lg text-white text-sm
                  resize-none focus:outline-none focus:ring-2 focus:ring-primary/50
                  transition-all duration-200 min-h-[160px] max-h-[300px]
                  ${isLinkedInOverLimit ? "border-error" : "border-dark-border"}
                `}
                placeholder="Redigez votre contenu..."
              />

              {/* Character Counter */}
              <div className="mt-2">
                <CharacterCounter
                  content={editedContent}
                  selectedPlatforms={selectedPlatforms}
                />
              </div>

            </div>

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
                disabled={!canPublishNow}
                className="min-h-[48px]"
              >
                Publier ({selectedPlatforms.length})
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
              <h3 className="text-lg font-semibold text-white mb-2">Confirmer la publication</h3>
              <p className="text-text-secondary text-sm">
                Votre contenu sera publie sur {selectedPlatforms.length} plateforme{selectedPlatforms.length > 1 ? "s" : ""}:
              </p>
              <p className="text-white text-sm mt-2 font-medium">
                {selectedPlatforms.map(getPlatformName).join(", ")}
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
                className="min-h-[48px]"
              >
                Oui, publier
              </Button>
            </div>
          </div>
        )}

        {/* Publishing Step */}
        {step === "publishing" && (
          <div className="text-center py-8">
            <div className="relative w-28 h-28 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(59, 130, 246, 0.2)"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - progress / 100) }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{Math.round(progress)}%</span>
              </div>
            </div>
            <p className="text-white font-semibold text-lg">Publication en cours...</p>
            <p className="text-text-secondary text-sm mt-2">
              {selectedPlatforms.map(getPlatformName).join(", ")}
            </p>
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
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </motion.svg>
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-4">
              {results.filter(r => r.success).length === results.length
                ? "Publication reussie !"
                : "Publication partielle"}
            </h3>

            {/* Results list */}
            <div className="space-y-2 mb-6 text-left">
              {results.map((result) => (
                <div
                  key={result.platform}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success ? "bg-accent/10" : "bg-error/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="text-white font-medium">{getPlatformName(result.platform)}</span>
                  </div>
                  {result.success && result.postUrl && (
                    <a
                      href={result.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      Voir
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  {!result.success && result.error && (
                    <span className="text-xs text-error">{result.error}</span>
                  )}
                </div>
              ))}
            </div>

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Echec de la publication</h3>
              <div className="space-y-1">
                {results.map((result) => (
                  <p key={result.platform} className="text-error text-sm">
                    {getPlatformName(result.platform)}: {result.error}
                  </p>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={handleClose} className="min-h-[48px]">
                Fermer
              </Button>
              <Button fullWidth onClick={handleRetry} className="min-h-[48px]">
                Reessayer
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  const modalTitle =
    step === "success"
      ? ""
      : step === "error"
      ? "Erreur"
      : step === "publishing"
      ? "Publication..."
      : "Publier";

  return (
    <>
      {isMobile ? (
        <BottomSheet
          isOpen={isOpen}
          onClose={handleClose}
          title={modalTitle}
          swipeToDismiss={step !== "publishing"}
        >
          {renderContent()}
        </BottomSheet>
      ) : (
        <Modal
          isOpen={isOpen}
          onClose={handleClose}
          title={modalTitle}
          size="md"
        >
          {renderContent()}
        </Modal>
      )}

      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        remaining={quota?.remaining}
        resetsAt={quota?.resetsAt}
      />
    </>
  );
}
