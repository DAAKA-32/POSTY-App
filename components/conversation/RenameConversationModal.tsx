"use client";

import { useState, useEffect, useRef } from "react";
import { Post } from "@/types";
import Modal from "@/components/ui/Modal";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";

interface RenameConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onRename: (postId: string, newTitle: string) => Promise<void>;
}

export default function RenameConversationModal({
  isOpen,
  onClose,
  post,
  onRename,
}: RenameConversationModalProps) {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Initialize title when post changes
  useEffect(() => {
    if (post) {
      setTitle(post.title || post.prompt.slice(0, 50));
    }
  }, [post]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !title.trim()) return;

    setIsLoading(true);
    try {
      await onRename(post.id, title.trim());
      onClose();
    } catch (error) {
      console.error("Error renaming conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header icon for mobile */}
      {isMobile && (
        <div className="flex items-center gap-3 pb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 dark:text-text-muted">Donnez un titre à cette conversation</p>
        </div>
      )}

      {/* Input */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-2">
          Titre de la conversation
        </label>
        <input
          ref={inputRef}
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entrez un titre..."
          maxLength={100}
          className="
            w-full px-4 py-3
            bg-gray-100 dark:bg-dark-elevated border border-gray-300 dark:border-dark-border
            rounded-xl text-gray-900 dark:text-text-primary placeholder-gray-400 dark:placeholder-text-muted
            focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
            transition-all duration-200
          "
        />
        <div className="flex justify-end mt-1.5">
          <span className="text-xs text-gray-500 dark:text-text-muted">
            {title.length}/100
          </span>
        </div>
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
          type="submit"
          isLoading={isLoading}
          disabled={!title.trim()}
          fullWidth
        >
          Enregistrer
        </Button>
      </div>
    </form>
  );

  // Mobile: BottomSheet, Desktop: Modal
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Renommer"
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
      title="Renommer la conversation"
      size="sm"
    >
      {content}
    </Modal>
  );
}
