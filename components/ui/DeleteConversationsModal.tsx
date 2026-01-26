"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Modal from "./Modal";
import Button from "./Button";

interface DeleteConversationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<{ postsDeleted: number; sessionsDeleted: number }>;
}

export default function DeleteConversationsModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteConversationsModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [step, setStep] = useState<"confirm" | "success">("confirm");
  const [deletedCount, setDeletedCount] = useState({ posts: 0, sessions: 0 });

  // Stable close handler with useCallback
  const handleClose = useCallback(() => {
    // Allow closing when not actively deleting OR when on success screen
    if (!isDeleting || step === "success") {
      // Reset all states before closing for clean next open
      setStep("confirm");
      setIsDeleting(false);
      setDeletedCount({ posts: 0, sessions: 0 });
      onClose();
    }
  }, [isDeleting, step, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("confirm");
      setIsDeleting(false);
      setDeletedCount({ posts: 0, sessions: 0 });
    }
  }, [isOpen]);

  // Auto-close after success with delay for better UX
  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => {
        handleClose();
      }, 2500); // 2.5 seconds to see success message
      return () => clearTimeout(timer);
    }
  }, [step, handleClose]);

  const handleConfirm = async () => {
    setIsDeleting(true);

    try {
      const result = await onConfirm();
      setDeletedCount({ posts: result.postsDeleted, sessions: result.sessionsDeleted });
      setStep("success");
      // Reset isDeleting after success to allow closing
      setIsDeleting(false);
    } catch (error) {
      console.error("Error deleting conversations:", error);
      setIsDeleting(false);
    }
  };

  // Success step
  if (step === "success") {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} size="md">
        <div className="text-center py-6">
          {/* Success checkmark animation */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center"
          >
            <motion.svg
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-10 h-10 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </motion.svg>
          </motion.div>
          <h3 className="text-xl font-bold text-white mb-2">
            Conversations supprimées
          </h3>
          <p className="text-text-secondary text-sm mb-4">
            Toutes vos conversations ont été supprimées avec succès.
          </p>
          {(deletedCount.posts > 0 || deletedCount.sessions > 0) && (
            <div className="flex justify-center gap-4 text-xs text-text-muted mb-4">
              {deletedCount.posts > 0 && (
                <span>{deletedCount.posts} conversation{deletedCount.posts > 1 ? 's' : ''}</span>
              )}
              {deletedCount.sessions > 0 && (
                <span>{deletedCount.sessions} session{deletedCount.sessions > 1 ? 's' : ''}</span>
              )}
            </div>
          )}
          {/* Auto-close indicator */}
          <p className="text-text-muted text-xs mb-4">
            Fermeture automatique dans quelques secondes...
          </p>
          <Button
            variant="secondary"
            onClick={handleClose}
            className="mt-2"
          >
            Fermer maintenant
          </Button>
        </div>
      </Modal>
    );
  }

  // Confirmation step
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Supprimer toutes mes conversations"
      size="md"
    >
      <div className="space-y-5">
        {/* Warning section */}
        <div className="p-4 bg-error/10 border border-error/30 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <p className="text-error font-medium text-sm">
                Cette action est irréversible
              </p>
              <p className="text-error/80 text-xs mt-1">
                Toutes vos conversations seront définitivement supprimées :
              </p>
              <ul className="list-disc list-inside text-error/70 text-xs mt-2 space-y-0.5">
                <li>Historique de posts générés</li>
                <li>Prompts et réponses IA</li>
                <li>Sessions de conversation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="p-4 bg-dark-bg border border-dark-border rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                Votre compte reste actif
              </p>
              <p className="text-text-muted text-xs mt-0.5">
                Seules les conversations sont supprimées, votre profil et vos paramètres sont conservés.
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation message */}
        <p className="text-text-secondary text-sm text-center">
          Êtes-vous sûr de vouloir supprimer toutes vos conversations ?
        </p>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={handleClose}
            disabled={isDeleting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="danger"
            fullWidth
            onClick={handleConfirm}
            isLoading={isDeleting}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Suppression...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Confirmer la suppression
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
