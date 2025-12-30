"use client";

import { useState, useRef, ReactNode } from "react";

interface SwipeableCardProps {
  children: ReactNode;
  onDelete: () => void;
  className?: string;
}

export default function SwipeableCard({
  children,
  onDelete,
  className = "",
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const deleteThreshold = -80;
  const maxSwipe = -100;

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;

    const diff = e.touches[0].clientX - startXRef.current;
    let newTranslate = currentXRef.current + diff;

    // Limit swipe range
    if (newTranslate > 0) newTranslate = 0;
    if (newTranslate < maxSwipe) newTranslate = maxSwipe;

    setTranslateX(newTranslate);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;

    if (translateX < deleteThreshold) {
      // Keep showing delete button
      setTranslateX(maxSwipe);
    } else {
      // Snap back
      setTranslateX(0);
    }
  };

  const handleDelete = () => {
    setIsDeleting(true);
    // Animate out
    setTimeout(() => {
      onDelete();
    }, 200);
  };

  const handleCancel = () => {
    setTranslateX(0);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${isDeleting ? "animate-fade-out" : ""}`}
    >
      {/* Delete button background */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button
          onClick={handleDelete}
          className="h-full px-6 bg-red-500 text-white flex items-center justify-center transition-smooth"
          style={{ width: Math.abs(translateX) || 0 }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div
        className={`
          relative bg-dark-card border border-dark-border
          transition-transform duration-200 ease-out
          ${className}
        `}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDraggingRef.current ? "none" : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={translateX < 0 ? handleCancel : undefined}
      >
        {children}
      </div>

      <style jsx>{`
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-100%);
          }
        }
        .animate-fade-out {
          animation: fadeOut 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
