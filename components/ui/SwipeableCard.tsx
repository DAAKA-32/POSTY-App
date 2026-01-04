"use client";

import { useState, useRef, ReactNode } from "react";

interface SwipeableCardProps {
  children: ReactNode;
  onDelete?: () => void;
  onPin?: () => void;
  isPinned?: boolean;
  className?: string;
}

export default function SwipeableCard({
  children,
  onDelete,
  onPin,
  isPinned = false,
  className = "",
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const actionThreshold = 60;
  const maxSwipeLeft = -80;
  const maxSwipeRight = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || isAnimating) return;

    const diff = e.touches[0].clientX - startXRef.current;
    let newTranslate = currentXRef.current + diff;

    // Limit swipe range
    if (onPin && newTranslate > maxSwipeRight) newTranslate = maxSwipeRight;
    if (!onPin && newTranslate > 0) newTranslate = 0;
    if (onDelete && newTranslate < maxSwipeLeft) newTranslate = maxSwipeLeft;
    if (!onDelete && newTranslate < 0) newTranslate = 0;

    setTranslateX(newTranslate);
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current || isAnimating) return;
    isDraggingRef.current = false;

    // Swipe left for delete
    if (translateX < -actionThreshold && onDelete) {
      setTranslateX(maxSwipeLeft);
    }
    // Swipe right for pin
    else if (translateX > actionThreshold && onPin) {
      setIsAnimating(true);
      setTranslateX(0);
      onPin();
      setTimeout(() => setIsAnimating(false), 300);
    }
    // Snap back
    else {
      setTranslateX(0);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    setIsAnimating(true);
    setTranslateX(-200);
    setTimeout(() => {
      onDelete();
      setIsAnimating(false);
    }, 200);
  };

  const handleCancel = () => {
    setTranslateX(0);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${isAnimating ? "pointer-events-none" : ""}`}
    >
      {/* Pin action background (left side, appears on swipe right) */}
      {onPin && (
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-start overflow-hidden"
          style={{ width: translateX > 0 ? translateX : 0 }}
        >
          <div className={`
            h-full px-4 flex items-center justify-center
            ${isPinned ? "bg-text-muted" : "bg-accent"}
            transition-colors duration-200
          `}>
            <div className="flex flex-col items-center gap-1">
              <svg
                className="w-5 h-5 text-white"
                fill={isPinned ? "none" : "currentColor"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <span className="text-white text-xs font-medium">
                {isPinned ? "Retirer" : "Epingler"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Delete action background (right side, appears on swipe left) */}
      {onDelete && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end overflow-hidden"
          style={{ width: translateX < 0 ? Math.abs(translateX) : 0 }}
        >
          <button
            onClick={handleDelete}
            className="h-full px-4 bg-error text-white flex items-center justify-center transition-colors hover:bg-error/80"
          >
            <div className="flex flex-col items-center gap-1">
              <svg
                className="w-5 h-5"
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
              <span className="text-xs font-medium">Supprimer</span>
            </div>
          </button>
        </div>
      )}

      {/* Main content */}
      <div
        className={`
          relative bg-dark-card border border-dark-border
          transition-transform duration-200 ease-out rounded-xl
          ${className}
        `}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDraggingRef.current ? "none" : "transform 0.2s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={translateX !== 0 ? handleCancel : undefined}
      >
        {children}
      </div>
    </div>
  );
}
