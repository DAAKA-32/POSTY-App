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
        e.stopPropagation();
        onClick(e);
      }}
      className="absolute -top-0.5 -right-0.5 z-10 rounded-full cursor-pointer p-0 border-0 appearance-none"
      style={{ backgroundColor: accentColor, boxSizing: "border-box", width: 12, height: 12, minWidth: 12, minHeight: 12, borderRadius: "50%", aspectRatio: "1 / 1" }}
      aria-label="Aide disponible"
    >
      {/* Pulsing ring */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: accentColor, borderRadius: "50%" }}
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
