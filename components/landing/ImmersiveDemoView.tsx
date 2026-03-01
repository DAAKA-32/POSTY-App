"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useScrollLock } from "@/hooks/useScrollLock";

interface ImmersiveDemoViewProps {
  isOpen: boolean;
  onClose: () => void;
  userInput: string;
  aiResponse: string;
  isLoading: boolean;
  error?: string;
  isDarkMode?: boolean;
}

/**
 * ImmersiveDemoView - Full-screen immersive AI demo experience
 *
 * Features:
 * - Premium full-screen overlay with smooth transitions
 * - Centered AI response with typewriter effect
 * - Back navigation with scroll restoration
 * - Mobile-first responsive design
 * - No distractions - pure conversation experience
 */
export default function ImmersiveDemoView({
  isOpen,
  onClose,
  userInput,
  aiResponse,
  isLoading,
  error,
  isDarkMode = true,
}: ImmersiveDemoViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayedResponse, setDisplayedResponse] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const previousResponseRef = useRef("");

  // Theme classes
  const theme = {
    bg: isDarkMode
      ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
      : "bg-gradient-to-br from-orange-50/95 via-white to-amber-50/80",
    textPrimary: isDarkMode ? "text-white" : "text-gray-900",
    textSecondary: isDarkMode ? "text-gray-300" : "text-gray-600",
    textMuted: isDarkMode ? "text-gray-500" : "text-gray-400",
    cardBg: isDarkMode
      ? "bg-gray-900/80 border-gray-800/50"
      : "bg-white/90 border-orange-100/50",
    userBubble: isDarkMode
      ? "bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500/30"
      : "bg-gradient-to-r from-orange-100 to-amber-100 border-orange-200",
    aiBubble: isDarkMode
      ? "bg-gray-800/80 border-gray-700/50"
      : "bg-white border-orange-100 shadow-sm",
  };

  // Smooth typewriter effect for AI response
  useEffect(() => {
    if (!aiResponse || aiResponse === previousResponseRef.current) return;

    // If response grew, animate the new characters
    if (aiResponse.startsWith(previousResponseRef.current)) {
      const newContent = aiResponse.slice(previousResponseRef.current.length);
      if (newContent.length > 0) {
        setIsTyping(true);
        let currentIndex = previousResponseRef.current.length;

        const interval = setInterval(() => {
          if (currentIndex < aiResponse.length) {
            setDisplayedResponse(aiResponse.slice(0, currentIndex + 1));
            currentIndex++;
          } else {
            clearInterval(interval);
            setIsTyping(false);
          }
        }, 30); // ~33fps — smooth without excessive state updates

        previousResponseRef.current = aiResponse;
        return () => clearInterval(interval);
      }
    } else {
      // Response replaced entirely
      setDisplayedResponse(aiResponse);
      previousResponseRef.current = aiResponse;
    }
  }, [aiResponse]);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setDisplayedResponse("");
      previousResponseRef.current = "";
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
          className={`fixed inset-0 z-[100] ${theme.bg} overflow-hidden`}
        >
          {/* Ambient background effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Gradient orbs */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full"
              style={{
                background: isDarkMode
                  ? "radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)",
              }}
            />
            <motion.div
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full"
              style={{
                background: isDarkMode
                  ? "radial-gradient(circle, rgba(251,146,60,0.1) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(251,146,60,0.05) 0%, transparent 70%)",
              }}
            />
          </div>

          {/* Header with back button */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="absolute top-0 left-0 right-0 z-10 px-4 sm:px-6 py-4 sm:py-6"
          >
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              {/* Back button */}
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  group flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5
                  ${isDarkMode ? "bg-gray-800/60 hover:bg-gray-800" : "bg-white/80 hover:bg-white shadow-sm"}
                  backdrop-blur-md rounded-xl border
                  ${isDarkMode ? "border-gray-700/50" : "border-gray-200/80"}
                  transition-all duration-200
                `}
              >
                <svg
                  className={`w-5 h-5 ${theme.textSecondary} group-hover:${isDarkMode ? "text-white" : "text-gray-900"} transition-colors`}
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
                <span className={`${theme.textSecondary} text-sm font-medium hidden sm:inline`}>
                  Retour
                </span>
              </motion.button>

              {/* Posty branding */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden shadow-lg shadow-orange-500/20">
                  <img
                    src="/logo.png"
                    alt="Posty"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className={`${theme.textPrimary} font-bold text-lg hidden sm:inline`}>
                  Posty
                </span>
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
              {userInput && (
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="flex justify-end"
                >
                  <div
                    className={`
                      ${theme.userBubble}
                      border rounded-2xl rounded-br-sm
                      px-5 py-4 max-w-[90%] sm:max-w-md
                      backdrop-blur-sm
                    `}
                  >
                    <p className={`${theme.textPrimary} text-sm sm:text-base leading-relaxed`}>
                      {userInput}
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
                  animate={isLoading ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1.5, repeat: isLoading ? Infinity : 0 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-2xl overflow-hidden shadow-lg shadow-orange-500/25"
                >
                  <img
                    src="/logo.png"
                    alt="Posty AI"
                    className="w-full h-full object-contain"
                  />
                </motion.div>

                {/* Response content */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`
                      ${theme.aiBubble}
                      border rounded-2xl rounded-tl-sm
                      px-5 py-4 backdrop-blur-sm
                    `}
                  >
                    {/* Loading state */}
                    {isLoading && !displayedResponse && (
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          <motion.span
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                            className="w-2.5 h-2.5 bg-orange-500 rounded-full"
                          />
                          <motion.span
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                            className="w-2.5 h-2.5 bg-orange-500 rounded-full"
                          />
                          <motion.span
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                            className="w-2.5 h-2.5 bg-orange-500 rounded-full"
                          />
                        </div>
                        <span className={`${theme.textMuted} text-sm`}>
                          Posty rédige votre post...
                        </span>
                      </div>
                    )}

                    {/* Response text with cursor */}
                    {displayedResponse && (
                      <p className={`${theme.textPrimary} text-sm sm:text-base leading-relaxed whitespace-pre-wrap`}>
                        {displayedResponse}
                        {isTyping && (
                          <motion.span
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="inline-block w-0.5 h-5 bg-orange-500 ml-0.5 align-middle"
                          />
                        )}
                      </p>
                    )}

                    {/* Error state */}
                    {error && (
                      <div className="flex items-center gap-3 text-red-500">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">{error}</p>
                      </div>
                    )}
                  </div>

                  {/* Success CTA - appears after response completes */}
                  <AnimatePresence>
                    {displayedResponse && !isLoading && !isTyping && !error && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className={`
                          mt-5 p-5 rounded-2xl border backdrop-blur-sm
                          ${isDarkMode
                            ? "bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 border-orange-500/20"
                            : "bg-gradient-to-br from-white via-orange-50/50 to-amber-50/50 border-orange-200/50 shadow-lg shadow-orange-500/5"
                          }
                        `}
                      >
                        <div className="flex items-start gap-4">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.5 }}
                            className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/30"
                          >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`${theme.textPrimary} font-semibold text-base mb-1`}>
                              Post LinkedIn prêt !
                            </h4>
                            <p className={`${theme.textMuted} text-sm mb-4`}>
                              Créez des posts illimités et publiez directement sur LinkedIn
                            </p>
                            <Link
                              href="/login?mode=signup"
                              className="group inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-300"
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
                            <p className={`${theme.textMuted} text-xs mt-3`}>
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
          <div
            className={`absolute bottom-0 left-0 right-0 h-24 pointer-events-none ${
              isDarkMode
                ? "bg-gradient-to-t from-gray-950 to-transparent"
                : "bg-gradient-to-t from-orange-50/80 to-transparent"
            }`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
