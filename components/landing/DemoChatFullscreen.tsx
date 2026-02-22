"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useScrollLock } from "@/hooks/useScrollLock";

interface DemoChatFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  userMessage: string;
}

/**
 * DemoChatFullscreen - Full-screen immersive AI demo experience
 *
 * Features:
 * - Minimal header with back arrow + Posty branding
 * - Typewriter effect for AI response
 * - SSE streaming from /api/demo
 * - CTA after response completes
 * - Body scroll lock when open
 */
export default function DemoChatFullscreen({
  isOpen,
  onClose,
  userMessage,
}: DemoChatFullscreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayedResponse, setDisplayedResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseComplete, setResponseComplete] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stream AI response
  const fetchDemoResponse = useCallback(async (message: string) => {
    setIsLoading(true);
    setError(null);
    setDisplayedResponse("");
    setResponseComplete(false);
    setIsTyping(true);

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "La demo n'est pas disponible");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Streaming not supported");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setDisplayedResponse(fullContent);
              }
              if (data.fullContent) {
                setDisplayedResponse(data.fullContent);
                setIsTyping(false);
                setResponseComplete(true);
              }
            } catch {
              // Ignore parse errors for SSE
            }
          }
          if (line.startsWith("event: done")) {
            setIsTyping(false);
            setResponseComplete(true);
          }
          if (line.startsWith("event: error")) {
            const errorLine = lines[lines.indexOf(line) + 1];
            if (errorLine?.startsWith("data: ")) {
              try {
                const errorData = JSON.parse(errorLine.slice(6));
                setError(errorData.message || "Une erreur est survenue");
              } catch {
                setError("Une erreur est survenue");
              }
            }
            setIsTyping(false);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Ignore abort errors
      }
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger API call when opening with a message
  useEffect(() => {
    if (isOpen && userMessage) {
      fetchDemoResponse(userMessage);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, userMessage, fetchDemoResponse]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setDisplayedResponse("");
      setIsLoading(false);
      setIsTyping(false);
      setError(null);
      setResponseComplete(false);
    }
  }, [isOpen]);

  // Centralized scroll lock when open
  useScrollLock(isOpen);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] bg-gradient-to-br from-gray-950 via-dark-bg to-gray-950 overflow-hidden"
        >
          {/* Ambient background effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.15, 0.25, 0.15],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
              }}
            />
            <motion.div
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
              }}
            />
          </div>

          {/* Minimal header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="absolute top-0 left-0 right-0 z-10 px-4 sm:px-6 py-4 sm:py-5"
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              {/* Back button */}
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-dark-card/80 hover:bg-dark-elevated backdrop-blur-md rounded-xl border border-dark-border/50 transition-all duration-200"
              >
                <svg
                  className="w-5 h-5 text-text-secondary group-hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span className="text-text-secondary text-sm font-medium hidden sm:inline group-hover:text-white transition-colors">
                  Retour
                </span>
              </motion.button>

              {/* Posty branding */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2.5"
              >
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-primary/20 flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="Posty"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (sibling) sibling.style.display = 'flex';
                    }}
                  />
                  <span className="text-white font-bold hidden items-center justify-center">P</span>
                </div>
                <span className="text-white font-bold text-lg hidden sm:inline">Posty</span>
              </motion.div>
            </div>
          </motion.header>

          {/* Main content - Centered conversation */}
          <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 py-20 sm:py-24 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                delay: 0.15,
              }}
              className="w-full max-w-2xl space-y-6"
            >
              {/* User message */}
              {userMessage && (
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="flex justify-end"
                >
                  <div className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 rounded-2xl rounded-br-sm px-5 py-4 max-w-[90%] sm:max-w-md backdrop-blur-sm">
                    <p className="text-white text-sm sm:text-base leading-relaxed">
                      {userMessage}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* AI Response */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="flex gap-3 sm:gap-4"
              >
                {/* Posty avatar */}
                <motion.div
                  animate={isLoading && !displayedResponse ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1.5, repeat: isLoading && !displayedResponse ? Infinity : 0 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-2xl overflow-hidden shadow-lg shadow-primary/25 flex items-center justify-center"
                >
                  <img
                    src="/logo.png"
                    alt="Posty AI"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (sibling) sibling.style.display = 'flex';
                    }}
                  />
                  <span className="text-white font-bold hidden items-center justify-center">P</span>
                </motion.div>

                {/* Response content */}
                <div className="flex-1 min-w-0">
                  <div className="bg-dark-card/80 border border-dark-border/50 rounded-2xl rounded-tl-sm px-5 py-4 backdrop-blur-sm">
                    {/* Loading state */}
                    {isLoading && !displayedResponse && (
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <motion.span
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                            className="w-2.5 h-2.5 bg-primary rounded-full"
                          />
                          <motion.span
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                            className="w-2.5 h-2.5 bg-primary rounded-full"
                          />
                          <motion.span
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                            className="w-2.5 h-2.5 bg-primary rounded-full"
                          />
                        </div>
                        <span className="text-text-muted text-sm">
                          Posty rédige votre post...
                        </span>
                      </div>
                    )}

                    {/* Response text with cursor */}
                    {displayedResponse && (
                      <p className="text-white text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                        {displayedResponse}
                        {isTyping && (
                          <motion.span
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="inline-block w-0.5 h-5 bg-primary ml-0.5 align-middle"
                          />
                        )}
                      </p>
                    )}

                    {/* Error state */}
                    {error && (
                      <div className="flex items-center gap-3 text-red-400">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">{error}</p>
                      </div>
                    )}
                  </div>

                  {/* Success CTA - appears after response completes */}
                  <AnimatePresence>
                    {responseComplete && !error && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="mt-5 p-5 rounded-2xl border backdrop-blur-sm bg-gradient-to-br from-dark-card/80 via-dark-elevated/60 to-dark-card/80 border-primary/20"
                      >
                        <div className="flex items-start gap-4">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.5 }}
                            className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30"
                          >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold text-base mb-1">
                              Post LinkedIn prêt !
                            </h4>
                            <p className="text-text-muted text-sm mb-4">
                              Créez des posts illimités et publiez directement sur LinkedIn
                            </p>
                            <Link
                              href="/login?mode=signup"
                              className="group inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
                            >
                              <span>Commencer gratuitement</span>
                              <svg
                                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </Link>
                            <p className="text-text-muted text-xs mt-3">
                              Essai gratuit 7 jours • Annulation à tout moment
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-t from-gray-950 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
