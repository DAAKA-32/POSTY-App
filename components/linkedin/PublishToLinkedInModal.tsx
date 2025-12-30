"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import LinkedInConnectButton, { LinkedInIcon } from "./LinkedInConnectButton";
import { LinkedInConnectionData } from "@/lib/firestore";

type PublishStep = "preview" | "confirm" | "publishing" | "success" | "error";

interface PublishToLinkedInModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  linkedInConnection: LinkedInConnectionData | null;
  onPublish: () => Promise<{ success: boolean; postUrl?: string; error?: string }>;
}

export default function PublishToLinkedInModal({
  isOpen,
  onClose,
  content,
  linkedInConnection,
  onPublish,
}: PublishToLinkedInModalProps) {
  const [step, setStep] = useState<PublishStep>("preview");
  const [postUrl, setPostUrl] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("preview");
      setPostUrl(undefined);
      setError(undefined);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (step !== "publishing") {
      onClose();
    }
  };

  const handleConfirm = () => {
    setStep("confirm");
  };

  const handlePublish = async () => {
    setStep("publishing");
    setError(undefined);

    try {
      const result = await onPublish();
      if (result.success) {
        setPostUrl(result.postUrl);
        setStep("success");
      } else {
        setError(result.error || "Une erreur est survenue");
        setStep("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setStep("error");
    }
  };

  const handleRetry = () => {
    setStep("preview");
    setError(undefined);
  };

  const isConnected = !!linkedInConnection;

  // If not connected, show connect prompt
  if (isOpen && !isConnected) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Connexion LinkedIn requise" size="md">
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#0A66C2]/20 flex items-center justify-center">
            <LinkedInIcon className="w-8 h-8 text-[#0A66C2]" />
          </div>
          <p className="text-white mb-2">
            Connectez votre compte LinkedIn pour publier
          </p>
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
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === "success" ? "" : step === "error" ? "Erreur" : "Publier sur LinkedIn"}
      size="md"
    >
      {/* Preview Step */}
      {step === "preview" && (
        <div className="space-y-5">
          {/* LinkedIn Profile */}
          <div className="flex items-center gap-3 p-3 bg-dark-bg rounded-xl">
            {linkedInConnection?.profilePicture ? (
              <img
                src={linkedInConnection.profilePicture}
                alt={linkedInConnection.profileName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#0A66C2]/20 flex items-center justify-center">
                <LinkedInIcon className="w-5 h-5 text-[#0A66C2]" />
              </div>
            )}
            <div>
              <p className="text-white font-medium">{linkedInConnection?.profileName}</p>
              <p className="text-xs text-text-muted">Sera publie sur votre profil</p>
            </div>
          </div>

          {/* Post Preview */}
          <div className="p-4 bg-dark-card border border-dark-border rounded-xl">
            <p className="text-xs text-text-muted mb-2">Apercu du post :</p>
            <div className="max-h-60 overflow-y-auto">
              <p className="text-white text-sm whitespace-pre-wrap">{content}</p>
            </div>
          </div>

          {/* Character count */}
          <div className="flex justify-between text-xs text-text-muted">
            <span>Caracteres</span>
            <span className={content.length > 3000 ? "text-error" : ""}>
              {content.length} / 3000
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleClose}>
              Annuler
            </Button>
            <Button
              fullWidth
              onClick={handleConfirm}
              disabled={content.length > 3000}
              className="bg-[#0A66C2] hover:bg-[#004182] border-none"
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
            <h3 className="text-lg font-semibold text-white mb-2">
              Etes-vous sur ?
            </h3>
            <p className="text-text-secondary text-sm">
              Votre post sera publie publiquement sur LinkedIn et visible par votre reseau.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setStep("preview")}>
              Annuler
            </Button>
            <Button
              fullWidth
              onClick={handlePublish}
              className="bg-[#0A66C2] hover:bg-[#004182] border-none"
            >
              Oui, publier
            </Button>
          </div>
        </div>
      )}

      {/* Publishing Step */}
      {step === "publishing" && (
        <div className="text-center py-8">
          <div className="relative w-20 h-20 mx-auto mb-6">
            {/* Animated ring */}
            <div className="absolute inset-0 rounded-full border-4 border-[#0A66C2]/20" />
            <div className="absolute inset-0 rounded-full border-4 border-[#0A66C2] border-t-transparent animate-spin" />
            {/* LinkedIn icon in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <LinkedInIcon className="w-8 h-8 text-[#0A66C2]" />
            </div>
          </div>
          <p className="text-white font-medium mb-2">Envoi en cours...</p>
          <p className="text-text-secondary text-sm">
            Publication sur votre LinkedIn...
          </p>
        </div>
      )}

      {/* Success Step */}
      {step === "success" && (
        <div className="text-center py-6">
          {/* Success animation */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
            <div className="success-check w-10 h-5 border-l-4 border-b-4 border-accent" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Post publie !
          </h3>
          <p className="text-text-secondary text-sm mb-6">
            Votre post a ete publie avec succes sur LinkedIn.
          </p>
          {postUrl && (
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#0A66C2] hover:text-[#004182] transition-colors mb-6"
            >
              Voir sur LinkedIn
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          <Button fullWidth onClick={handleClose}>
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
            <h3 className="text-lg font-semibold text-white mb-2">
              Echec de la publication
            </h3>
            <p className="text-error text-sm">
              {error}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleClose}>
              Fermer
            </Button>
            <Button fullWidth onClick={handleRetry}>
              Reessayer
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
