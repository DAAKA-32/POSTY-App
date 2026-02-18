"use client";

import { motion } from "framer-motion";

interface HelpNotificationDotProps {
  accentColor: string;
  onClick: (e: React.MouseEvent) => void;
}

export default function HelpNotificationDot({
  accentColor,
  onClick,
}: HelpNotificationDotProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      className="absolute -top-0.5 -right-0.5 z-10 w-3 h-3 rounded-full cursor-pointer"
      style={{ backgroundColor: accentColor }}
      aria-label="Aide disponible"
    >
      {/* Pulsing ring */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: accentColor }}
        animate={{
          scale: [1, 1.8, 1],
          opacity: [0.6, 0, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.button>
  );
}
