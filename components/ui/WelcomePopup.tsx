"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "./Button";

interface WelcomePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomePopup({ isOpen, onClose }: WelcomePopupProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  }, [onClose]);

  // Auto-close after 5 seconds
  useEffect(() => {
    if (isOpen && !isClosing) {
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isClosing, handleClose]);

  // Start progress bar animation
  const [progressStarted, setProgressStarted] = useState(false);
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setProgressStarted(true), 100);
      return () => clearTimeout(timer);
    } else {
      setProgressStarted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`
        fixed inset-0 z-[100] flex items-center justify-center p-4
        popup-overlay
        transition-opacity duration-300
        ${isClosing ? "opacity-0" : "opacity-100"}
      `}
      onClick={handleClose}
    >
      <div
        className={`
          w-full max-w-sm
          bg-dark-card border border-dark-border
          rounded-2xl p-6
          card-shadow
          transform transition-all duration-300
          ${isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <span className="text-white text-3xl font-bold">T</span>
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            Bienvenue sur POSTY
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Cree ton prochain post LinkedIn en quelques secondes. Essayez-le maintenant !
          </p>

          <Button onClick={handleClose} fullWidth>
            Commencer
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1 bg-dark-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all ease-linear"
            style={{
              width: progressStarted ? "100%" : "0%",
              transitionDuration: "5000ms",
            }}
          />
        </div>
      </div>
    </div>
  );
}
