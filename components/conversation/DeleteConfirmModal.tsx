"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Post } from "@/types";
import Button from "@/components/ui/Button";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onConfirm: (postId: string) => Promise<void>;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  post,
  onConfirm,
}: DeleteConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!post) return;

    setIsLoading(true);
    try {
      await onConfirm(post.id);
      onClose();
    } catch (error) {
      console.error("Error deleting conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // Get display title
  const displayTitle = post?.title || post?.prompt.slice(0, 50) || "cette conversation";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-sm bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Icon */}
              <div className="pt-6 pb-2 flex justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center"
                >
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </motion.div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 text-center">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Supprimer la conversation ?
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  Etes-vous sur de vouloir supprimer
                  <span className="text-text-secondary font-medium mx-1">
                    &ldquo;{displayTitle.length > 40 ? displayTitle.slice(0, 40) + "..." : displayTitle}&rdquo;
                  </span>
                  ? Cette action est irreversible.
                </p>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleConfirm}
                  isLoading={isLoading}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
