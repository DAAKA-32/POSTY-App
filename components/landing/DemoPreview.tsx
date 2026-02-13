"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";

interface DemoPreviewProps {
  onSubmit: (message: string) => void;
}

const DEMO_SUGGESTIONS = [
  "Post sur le leadership",
  "Annonce de promotion",
  "Lecon apprise en startup",
  "Conseil carriere tech",
];

/**
 * DemoPreview - Visual mockup preview of the chat interface
 *
 * Shows a non-functional visual representation of the AI chat,
 * with real input that triggers full-screen demo on submit.
 */
export default function DemoPreview({ onSubmit }: DemoPreviewProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSubmit(inputValue.trim());
      setInputValue("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSubmit(suggestion);
  };

  return (
    <section className="relative py-16 md:py-24 px-4 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl"
        />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 md:mb-14"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full mb-4"
          >
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-accent rounded-full"
            />
            <span className="text-sm text-accent font-medium">Essayez maintenant</span>
          </motion.span>
          <h2 className="text-2xl md:text-4xl font-bold mb-3">
            <span className="text-silver-shimmer">Testez Posty en</span> <span className="text-gradient">direct</span>
          </h2>
          <p className="text-text-secondary max-w-md mx-auto">
            Entrez votre idée et découvrez la magie de l'IA
          </p>
        </motion.div>

        {/* Demo card mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative"
        >
          {/* Glow effect behind card */}
          <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-3xl blur-2xl opacity-50" />

          {/* Main demo card */}
          <div className="relative bg-dark-card/90 backdrop-blur-xl border border-dark-border rounded-2xl overflow-hidden shadow-elevated">
            {/* Card header - mimics chat interface */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-dark-border/50">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <img
                  src="/logo.jpg"
                  alt="Posty"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (sibling) sibling.style.display = 'flex';
                  }}
                />
                <span className="text-white font-bold text-lg hidden items-center justify-center">P</span>
              </div>
              <div>
                <p className="text-white font-semibold">Posty</p>
                <p className="text-xs text-accent">IA disponible</p>
              </div>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="ml-auto flex items-center gap-1.5"
              >
                <span className="w-2 h-2 bg-accent rounded-full" />
                <span className="text-xs text-text-muted">En ligne</span>
              </motion.div>
            </div>

            {/* Mockup conversation - visual only */}
            <div className="p-5 space-y-4 min-h-[200px] bg-dark-bg/30">
              {/* Example user message (faded/mockup style) */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 0.6, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="flex justify-end"
              >
                <div className="max-w-[70%] px-4 py-2.5 bg-primary/20 border border-primary/30 rounded-xl rounded-br-sm">
                  <p className="text-white/70 text-sm">Ecris un post sur le leadership...</p>
                </div>
              </motion.div>

              {/* Example AI response (faded/mockup style) */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 0.6, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">P</span>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="px-4 py-2.5 bg-dark-elevated/80 border border-dark-border/50 rounded-xl rounded-tl-sm max-w-[85%]">
                    <p className="text-xs text-accent font-medium mb-1">Storytelling</p>
                    <p className="text-white/60 text-sm">Il y a 3 ans, j'ai commis ma plus grande erreur de manager...</p>
                  </div>
                  <div className="px-4 py-2.5 bg-dark-elevated/80 border border-dark-border/50 rounded-xl rounded-tl-sm max-w-[85%]">
                    <p className="text-xs text-primary font-medium mb-1">Business</p>
                    <p className="text-white/60 text-sm">Les meilleurs leaders ne donnent pas d'ordres...</p>
                  </div>
                </div>
              </motion.div>

              {/* Overlay gradient to fade mockup */}
              <div className="absolute inset-x-0 bottom-[120px] h-20 bg-gradient-to-t from-dark-bg/90 to-transparent pointer-events-none" />
            </div>

            {/* Real input section */}
            <div className="relative px-5 pb-5 pt-3 bg-dark-bg/50 border-t border-dark-border/30">
              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {DEMO_SUGGESTIONS.map((suggestion, idx) => (
                  <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * idx }}
                    whileHover={{ scale: 1.03, borderColor: "rgba(99, 102, 241, 0.5)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 text-xs text-text-secondary bg-dark-card border border-dark-border rounded-full hover:text-white hover:bg-dark-elevated transition-all duration-200"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>

              {/* Input form */}
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Décrivez votre idée de post..."
                  className="flex-1 px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!inputValue.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <span className="hidden sm:inline">Générer</span>
                  <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </motion.button>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Trust indicator */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6 text-xs text-text-muted"
        >
          Gratuit et sans inscription pour tester
        </motion.p>
      </div>
    </section>
  );
}
