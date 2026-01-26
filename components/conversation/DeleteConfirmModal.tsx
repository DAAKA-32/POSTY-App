"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Post } from "@/types";
import Modal from "@/components/ui/Modal";
import BottomSheet from "@/components/ui/BottomSheet";
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

  // SSR-safe mobile detection
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Force re-check when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
    }
  }, [isOpen]);

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

  const content = (
    <div className="text-center">
      {/* Icon */}
      <div className="pb-4 flex justify-center">
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
      <div className="pb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary mb-2">
          Supprimer la conversation ?
        </h2>
        <p className="text-sm text-gray-600 dark:text-text-muted leading-relaxed">
          Êtes-vous sûr de vouloir supprimer
          <span className="text-gray-800 dark:text-text-secondary font-medium mx-1">
            &ldquo;{displayTitle.length > 40 ? displayTitle.slice(0, 40) + "..." : displayTitle}&rdquo;
          </span>
          ? Cette action est irréversible.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handleClose}
          disabled={isLoading}
          fullWidth
        >
          Annuler
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleConfirm}
          isLoading={isLoading}
          fullWidth
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Supprimer
        </Button>
      </div>
    </div>
  );

  // Mobile: BottomSheet, Desktop: Modal
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        showCloseButton={false}
        swipeToDismiss={!isLoading}
      >
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="sm"
    >
      {content}
    </Modal>
  );
}
