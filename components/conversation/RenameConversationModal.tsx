"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Post } from "@/types";
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

  // Initialize title when post changes
  useEffect(() => {
    if (post) {
      // Use custom title if set, otherwise use first 50 chars of prompt
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
            <div className="w-full max-w-md bg-dark-card border border-dark-border rounded-2xl shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Renommer</h2>
                    <p className="text-sm text-text-muted">Donnez un titre a cette conversation</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="min-w-[44px] min-h-[44px] p-2 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-dark-hover transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-5">
                <div className="mb-5">
                  <label htmlFor="title" className="block text-sm font-medium text-text-secondary mb-2">
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
                      bg-dark-elevated border border-dark-border
                      rounded-xl text-white placeholder-text-muted
                      focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
                      transition-all duration-200
                    "
                  />
                  <div className="flex justify-end mt-1.5">
                    <span className="text-xs text-text-muted">
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
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    disabled={!title.trim()}
                    className="flex-1"
                  >
                    Enregistrer
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
