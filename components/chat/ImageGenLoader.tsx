"use client";

/**
 * ImageGenLoader — placeholder card shown WHILE the visual is being generated.
 *
 * It sits in the chat stream at the exact spot the final GeneratedImageCard
 * will occupy, so the conversation never visibly "jumps" when the image
 * arrives. The card mimics the aspect-square + footer layout of the final
 * card to keep the same vertical rhythm.
 *
 * The animation reads as "code is drawing your visual" rather than a generic
 * spinner: a slow diagonal shimmer over a tinted gradient + three creative
 * status chips that cycle every ~1.3s ("Étude du brief", "Mise en page",
 * "Rendu PNG"). The total pipeline takes 2–4 s; the user sees motion the
 * whole way through.
 */

import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const STAGES = [
  { label: "Lecture du brief", hint: "j'écoute ce que tu veux raconter" },
  { label: "Direction artistique", hint: "je choisis la palette et la mise en page" },
  { label: "Rendu du visuel", hint: "je dessine au pixel près" },
] as const;

interface Props {
  prompt: string;
}

export default function ImageGenLoader({ prompt }: Props) {
  const [stage, setStage] = useState(0);

  // Cycle through stages so the user feels real progress even though the
  // backend doesn't stream phase events for image gen. Total cycle ≈ 4s,
  // which covers the median render time of the Satori + resvg pipeline.
  useEffect(() => {
    const id = setInterval(() => {
      setStage((s) => (s + 1) % STAGES.length);
    }, 1300);
    return () => clearInterval(id);
  }, []);

  const current = STAGES[stage];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="
        w-full max-w-[320px] sm:max-w-sm
        rounded-2xl overflow-hidden
        bg-white dark:bg-dark-card
        border border-gray-200 dark:border-dark-border
        shadow-sm
      "
    >
      {/* Image placeholder — square 1:1, matches the final card */}
      <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-iris-50 via-amber-50 to-coral-50 dark:from-[#1A1F2E] dark:via-[#1F1B2E] dark:to-[#2E1F26]">
        {/* Slow diagonal shimmer — uses translateX over a wide gradient strip
            so it reads as "scanning" rather than a flashing pulse. */}
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
            backgroundSize: "240% 100%",
          }}
          animate={{ backgroundPositionX: ["0%", "200%"] }}
          transition={{ duration: 2.2, ease: "linear", repeat: Infinity }}
        />

        {/* Centered crest — soft pulsing emblem so there's a clear focal
            point. The icon swaps between Sparkles and Loader for variety
            without being distracting. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="
              flex items-center justify-center
              w-14 h-14 rounded-xl
              bg-white/70 dark:bg-white/10 backdrop-blur-sm
              shadow-[0_8px_24px_-8px_rgba(90,79,207,0.35)]
            "
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
          >
            <motion.div
              key={stage}
              initial={{ opacity: 0, rotate: -8 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ duration: 0.4 }}
            >
              {stage === 2 ? (
                <Loader2 className="w-6 h-6 text-iris-500 animate-spin [animation-duration:1.8s]" />
              ) : (
                <Sparkles className="w-6 h-6 text-iris-500" />
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Stage label — bottom-centered chip */}
        <div className="absolute inset-x-0 bottom-6 flex justify-center px-6">
          <motion.div
            key={current.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="
              max-w-full
              px-3.5 py-2 rounded-full
              bg-black/65 backdrop-blur-md
              text-white text-[12px] font-medium
              flex items-center gap-2
              shadow-lg
            "
          >
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-iris-300 animate-ping opacity-80" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-iris-400" />
            </span>
            <span className="truncate">{current.label}</span>
          </motion.div>
        </div>
      </div>

      {/* Footer — keeps layout parity with the final GeneratedImageCard */}
      <div className="px-4 py-3 flex items-center gap-3 border-t border-gray-100 dark:border-dark-border">
        <Loader2 className="w-3.5 h-3.5 text-iris-500 animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-text-secondary truncate">{prompt}</p>
          <p className="text-[11px] text-text-muted truncate">{current.hint}</p>
        </div>
      </div>
    </motion.div>
  );
}
