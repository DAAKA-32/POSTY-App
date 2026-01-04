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
import toast from "react-hot-toast";

// Post type options
type PostType = "feed" | "message" | "article";

interface PostTypeOption {
  id: PostType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const POST_TYPES: PostTypeOption[] = [
  {
    id: "feed",
    label: "Feed",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
      </svg>
    ),
    description: "Post classique visible dans le fil",
  },
  {
    id: "message",
    label: "Message",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    description: "Message direct",
  },
  {
    id: "article",
    label: "Article",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    description: "Article long format",
  },
];

// Publishing step messages
const PUBLISHING_MESSAGES = [
  { progress: 0, message: "Connexion a LinkedIn..." },
  { progress: 30, message: "Preparation du contenu..." },
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
  onPublish: (editedContent: string, postType: PostType) => Promise<{ success: boolean; postUrl?: string; error?: string }>;
}

export default function PublishToLinkedInModal({
  isOpen,
  onClose,
  content: initialContent,
  linkedInConnection,
  onPublish,
}: PublishToLinkedInModalProps) {
  const { quota, canPublish, recordPublish } = useQuota();
  const [step, setStep] = useState<PublishStep>("preview");
  const [editedContent, setEditedContent] = useState(initialContent);
  const [postType, setPostType] = useState<PostType>("feed");
  const [postUrl, setPostUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [progress, setProgress] = useState(0);
  const [publishMessage, setPublishMessage] = useState(PUBLISHING_MESSAGES[0].message);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
      setPostType("feed");
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
    // Check quota before confirming
    if (!canPublish) {
      setShowUpgradeModal(true);
      return;
    }
    setStep("confirm");
  };

  const handlePublish = async () => {
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
      const result = await onPublish(editedContent, postType);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      if (result.success) {
        // Record publish in quota
        await recordPublish();
        // Animate to 100%
        setProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 600));
        setPostUrl(result.postUrl);
        setStep("success");
        toast.success("Post publie sur LinkedIn !", {
          duration: 4000,
          icon: "\uD83C\uDF89",
        });
      } else {
        setError(result.error || "Une erreur est survenue");
        setStep("error");
      }
    } catch (err) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setStep("error");
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

  // Content to render inside modal/bottom sheet
  const renderContent = () => {
    // If not connected, show connect prompt
    if (!isConnected) {
      return (
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#0A66C2]/20 flex items-center justify-center">
            <LinkedInIcon className="w-8 h-8 text-[#0A66C2]" />
          </div>
          <p className="text-white mb-2">Connectez votre compte LinkedIn pour publier</p>
          <p className="text-text-secondary text-sm mb-6">
            Vous devez connecter votre compte LinkedIn avant de pouvoir publier vos posts.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleClose}>
              Annuler
            </Button>
            <LinkedInConnectButton className="flex-1" />
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
            <div className="flex items-center gap-3 p-3 bg-dark-bg rounded-lg">
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
                <p className="text-white font-medium truncate">{linkedInConnection?.profileName}</p>
                <p className="text-xs text-text-muted">Sera publie sur votre profil</p>
              </div>
            </div>

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
                        {quota.remaining > 1 ? "s" : ""} restante{quota.remaining > 1 ? "s" : ""} cette semaine
                      </>
                    ) : (
                      <span className="text-error">Limite hebdomadaire atteinte</span>
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

            {/* Post Type Selector */}
            <div>
              <p className="text-xs text-text-muted mb-2 font-medium uppercase tracking-wide">
                Type de publication
              </p>
              <div className="grid grid-cols-3 gap-2">
                {POST_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setPostType(type.id)}
                    className={`
                      min-h-[44px] p-3 rounded-lg border transition-all duration-200
                      flex flex-col items-center gap-1.5
                      ${
                        postType === type.id
                          ? "bg-[#0A66C2]/20 border-[#0A66C2] text-[#0A66C2]"
                          : "bg-dark-bg border-dark-border text-text-secondary hover:border-dark-hover hover:text-white"
                      }
                    `}
                  >
                    {type.icon}
                    <span className="text-xs font-medium">{type.label}</span>
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
                  Reinitialiser
                </button>
              </div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className={`
                  w-full p-4 bg-dark-bg border rounded-lg text-white text-sm
                  resize-none focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/50
                  transition-all duration-200 min-h-[160px] max-h-[300px]
                  ${isOverLimit ? "border-error" : "border-dark-border"}
                `}
                placeholder="Redigez votre post LinkedIn..."
              />
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-text-muted">
                  {editedContent !== initialContent && (
                    <span className="text-warning">Modifie</span>
                  )}
                </span>
                <span className={isOverLimit ? "text-error font-medium" : "text-text-muted"}>
                  {characterCount} / 3000
                </span>
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
                disabled={isOverLimit || !editedContent.trim()}
                className="bg-[#0A66C2] hover:bg-[#004182] border-none min-h-[48px]"
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
              <h3 className="text-lg font-semibold text-white mb-2">Etes-vous sur ?</h3>
              <p className="text-text-secondary text-sm">
                Votre post sera publie publiquement sur LinkedIn et visible par votre reseau.
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
                <span className="text-lg font-bold text-white">{progress}%</span>
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
                <p className="text-white font-semibold text-lg mb-2">
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
              <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
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
            <h3 className="text-xl font-bold text-white mb-2">Post publie !</h3>
            <p className="text-text-secondary text-sm mb-6">
              Votre post a ete publie avec succes sur LinkedIn.
            </p>
            {postUrl && (
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#0A66C2] hover:text-[#004182] transition-colors mb-6 min-h-[44px] px-4"
              >
                Voir sur LinkedIn
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Echec de la publication</h3>
              <p className="text-error text-sm">{error}</p>
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

      {/* Upgrade Pro Modal */}
      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        remaining={quota?.remaining}
        resetsAt={quota?.resetsAt}
      />
    </>
  );
}
