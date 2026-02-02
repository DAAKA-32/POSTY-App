"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback, useEffect } from "react";

// Template data structure - exported for type usage
export interface PostTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  template: string;
  examples: string[];
}

// Post template categories with visual styles
// Exported for use in TemplateFillerModal
export const TEMPLATES: PostTemplate[] = [
  {
    id: "storytelling",
    name: "Storytelling",
    description: "Racontez une histoire captivante",
    icon: "📖",
    color: "from-purple-500 to-indigo-500",
    bgColor: "bg-purple-50 dark:bg-purple-500/10",
    borderColor: "border-purple-200 dark:border-purple-500/30",
    template: "Il y a [durée], j'ai pris une décision qui a changé [domaine]. Voici ce qui s'est passé : [décrivez le contexte]. Le moment clé ? [décrivez le tournant]. Aujourd'hui, [résultat obtenu].",
    examples: [
      "Il y a 6 mois, j'ai pris une décision qui a changé ma carrière...",
      "On m'a dit que c'était impossible. Voici ce qui s'est passé...",
      "Cette erreur m'a coûté cher. Voici ce que j'en ai appris...",
    ],
  },
  {
    id: "tips",
    name: "Conseils Pratiques",
    description: "Partagez vos meilleures astuces",
    icon: "💡",
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
    borderColor: "border-amber-200 dark:border-amber-500/30",
    template: "[X] astuces pour [objectif] :\n\n1. [Astuce 1] : [explication courte]\n2. [Astuce 2] : [explication courte]\n3. [Astuce 3] : [explication courte]\n\nCelle qui a le plus d'impact ? [précisez].",
    examples: [
      "5 astuces pour doubler votre productivité...",
      "La méthode que j'utilise pour [objectif]...",
      "Voici comment j'ai automatisé [tâche]...",
    ],
  },
  {
    id: "controversial",
    name: "Opinion Forte",
    description: "Prenez position sur un sujet",
    icon: "🎯",
    color: "from-red-500 to-pink-500",
    bgColor: "bg-red-50 dark:bg-red-500/10",
    borderColor: "border-red-200 dark:border-red-500/30",
    template: "Opinion impopulaire : [votre opinion forte].\n\nPourquoi ? Parce que [argument 1]. Et aussi parce que [argument 2].\n\nLe problème avec [pratique courante], c'est que [conséquence]. Il est temps de [appel à l'action].",
    examples: [
      "Opinion impopulaire : [votre opinion]...",
      "Arrêtez de [pratique commune]. Voici pourquoi...",
      "Le problème avec [tendance] que personne n'ose dire...",
    ],
  },
  {
    id: "success",
    name: "Victoire & Résultats",
    description: "Célébrez vos succès",
    icon: "🏆",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    borderColor: "border-emerald-200 dark:border-emerald-500/30",
    template: "Résultat : [métrique chiffrée] en [durée].\n\nLe contexte ? [situation de départ].\n\nCe qui a fonctionné :\n• [Action 1]\n• [Action 2]\n• [Action 3]\n\nLa leçon clé ? [insight principal].",
    examples: [
      "Résultat : +X% de [métrique] en X mois...",
      "Comment j'ai atteint [objectif] en [temps]...",
      "Le moment où j'ai réalisé que [réalisation]...",
    ],
  },
  {
    id: "lesson",
    name: "Leçon Apprise",
    description: "Partagez vos apprentissages",
    icon: "🎓",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
    borderColor: "border-blue-200 dark:border-blue-500/30",
    template: "Ce que j'aurais aimé savoir avant de [action/décision] :\n\n1. [Leçon 1] — [pourquoi c'est important]\n2. [Leçon 2] — [conséquence si ignoré]\n3. [Leçon 3] — [bénéfice si appliqué]\n\nSi je devais recommencer ? [ce que vous feriez différemment].",
    examples: [
      "Ce que j'aurais aimé savoir avant de [action]...",
      "3 erreurs qui m'ont coûté [conséquence]...",
      "Si je devais recommencer, voici ce que je ferais différemment...",
    ],
  },
  {
    id: "question",
    name: "Engagement",
    description: "Générez des interactions",
    icon: "❓",
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-50 dark:bg-violet-500/10",
    borderColor: "border-violet-200 dark:border-violet-500/30",
    template: "Question à la communauté : [votre question précise] ?\n\nContexte : [expliquez pourquoi vous posez cette question].\n\nMon point de vue ? [partagez votre perspective].\n\nEt vous, [reformulez la question pour encourager la réponse] ?",
    examples: [
      "Question à la communauté : [votre question]...",
      "Quel est votre avis sur [sujet] ?",
      "Sondage : [Option A] ou [Option B] ?",
    ],
  },
];

interface PostTemplatesProps {
  onSelect: (template: string) => void;
  /** Callback when template object is selected (for modal-based flow) */
  onTemplateSelect?: (template: PostTemplate) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * PostTemplates - Visual clickable templates for post creation
 *
 * Features:
 * - Visual template cards with icons and colors
 * - Category descriptions
 * - Example prompts for each category
 * - Hover and click animations
 */
export default function PostTemplates({ onSelect, className = "" }: PostTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const handleTemplateClick = (templateId: string) => {
    if (selectedTemplate === templateId) {
      setSelectedTemplate(null);
    } else {
      setSelectedTemplate(templateId);
    }
  };

  const handleExampleClick = (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      onSelect(template.template);
    }
    setSelectedTemplate(null);
  };

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Templates de Posts
          </h3>
          <p className="text-xs text-gray-500 dark:text-text-muted">
            Choisissez un format pour commencer
          </p>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TEMPLATES.map((template) => (
          <div key={template.id} className="relative">
            <motion.button
              onClick={() => handleTemplateClick(template.id)}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                w-full p-4 rounded-xl border-2 text-left
                transition-all duration-200
                ${selectedTemplate === template.id
                  ? `${template.bgColor} ${template.borderColor} shadow-lg`
                  : `bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border hover:${template.borderColor}`
                }
              `}
            >
              {/* Icon & Name */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{template.icon}</span>
                <span className={`
                  text-sm font-semibold
                  ${selectedTemplate === template.id
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-700 dark:text-text-secondary"
                  }
                `}>
                  {template.name}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-500 dark:text-text-muted line-clamp-2">
                {template.description}
              </p>

              {/* Gradient indicator */}
              <div className={`
                absolute bottom-0 left-0 right-0 h-1 rounded-b-xl
                bg-gradient-to-r ${template.color}
                transition-opacity duration-200
                ${selectedTemplate === template.id || hoveredTemplate === template.id ? "opacity-100" : "opacity-0"}
              `} />
            </motion.button>

            {/* Template Preview Dropdown */}
            <AnimatePresence>
              {selectedTemplate === template.id && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-20 left-0 right-0 mt-2"
                >
                  <div className={`
                    p-3 rounded-xl ${template.bgColor} border ${template.borderColor}
                    shadow-xl backdrop-blur-sm
                  `}>
                    <p className="text-xs font-medium text-gray-700 dark:text-text-secondary mb-2">
                      Template structuré :
                    </p>
                    <div className="mb-3 p-2.5 bg-white dark:bg-dark-card rounded-lg text-xs text-gray-600 dark:text-text-secondary border border-gray-100 dark:border-dark-border">
                      {template.template}
                    </div>
                    <motion.button
                      onClick={() => handleExampleClick(template.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full p-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-lg text-xs font-medium hover:shadow-md transition-all"
                    >
                      Utiliser ce template
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * CompactPostTemplates - Interactive infinite horizontal scrolling
 *
 * Features:
 * - Smooth, continuous auto-scroll animation
 * - Touch/swipe interaction on mobile
 * - Click+drag interaction on desktop
 * - Pauses on interaction, resumes after release
 * - Momentum scrolling feel
 * - No visible scrollbar
 * - GPU-accelerated for performance
 * - Respects prefers-reduced-motion
 */
export function CompactPostTemplates({ onSelect, onTemplateSelect, className = "", disabled = false }: PostTemplatesProps) {
  // UI state (for re-renders)
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [scrollX, setScrollX] = useState(0);
  const [hoveredChip, setHoveredChip] = useState<string | null>(null);

  // Animation state as REFS (to avoid closure issues in RAF loop)
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const startXRef = useRef<number>(0);
  const scrollStartRef = useRef<number>(0);
  const scrollXRef = useRef<number>(0); // Mirror of scrollX for RAF access
  const velocityRef = useRef<number>(0);
  const lastMoveTimeRef = useRef<number>(0);
  const lastMoveXRef = useRef<number>(0);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const momentumRef = useRef<number | null>(null);
  const clickStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const trackWidthRef = useRef<number>(0);

  // Duplicate templates for seamless infinite loop
  const duplicatedTemplates = [...TEMPLATES, ...TEMPLATES, ...TEMPLATES];

  // Get track width for loop calculation (cached in ref)
  const updateTrackWidth = useCallback(() => {
    if (trackRef.current) {
      trackWidthRef.current = trackRef.current.scrollWidth / 3;
    }
  }, []);

  // Normalize position for infinite loop
  const normalizePosition = useCallback((pos: number) => {
    const trackWidth = trackWidthRef.current;
    if (trackWidth === 0) return pos;
    let normalized = pos % trackWidth;
    if (normalized < 0) normalized += trackWidth;
    return normalized;
  }, []);

  // Update scroll position (both ref and state)
  const updateScrollX = useCallback((newX: number) => {
    const normalized = normalizePosition(newX);
    scrollXRef.current = normalized;
    setScrollX(normalized);
  }, [normalizePosition]);

  // Auto-scroll animation - uses REFS to avoid stale closure issues
  const animate = useCallback((timestamp: number) => {
    // Always schedule next frame first
    animationRef.current = requestAnimationFrame(animate);

    // Read from refs (always current values) - pause only on drag or explicit pause
    if (isPausedRef.current || isDraggingRef.current) {
      lastTimeRef.current = timestamp;
      return;
    }

    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
      return;
    }

    const deltaTime = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    // Cap deltaTime for tab switches, but use smaller cap for ultra-smooth animation
    const cappedDelta = Math.min(deltaTime, 0.02);

    // Premium smooth scroll: 60px per second for fluid motion
    const movement = 60 * cappedDelta;
    const newX = normalizePosition(scrollXRef.current + movement);
    scrollXRef.current = newX;
    setScrollX(newX);
  }, [normalizePosition]);

  // Start animation on mount (only once)
  useEffect(() => {
    // Update track width on mount and resize
    updateTrackWidth();
    window.addEventListener("resize", updateTrackWidth);

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReducedMotion) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener("resize", updateTrackWidth);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      if (momentumRef.current) cancelAnimationFrame(momentumRef.current);
    };
  }, [animate, updateTrackWidth]);

  // Apply scroll position with GPU acceleration
  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(-${scrollX}px, 0, 0)`;
    }
  }, [scrollX]);

  // Interaction handlers - use REFS for animation state
  const handleInteractionStart = useCallback((clientX: number, clientY: number) => {
    // Clear any pending resume timeout
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    // Stop momentum animation
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }

    // Update refs immediately (for animation loop)
    isDraggingRef.current = true;
    isPausedRef.current = true;

    // Update state for UI
    setIsDraggingState(true);

    startXRef.current = clientX;
    scrollStartRef.current = scrollXRef.current;
    lastMoveTimeRef.current = performance.now();
    lastMoveXRef.current = clientX;
    velocityRef.current = 0;
    clickStartRef.current = { x: clientX, y: clientY, time: performance.now() };
  }, []);

  const handleInteractionMove = useCallback((clientX: number) => {
    if (!isDraggingRef.current) return;

    const now = performance.now();
    const deltaTime = now - lastMoveTimeRef.current;
    const deltaX = clientX - lastMoveXRef.current;

    if (deltaTime > 0) {
      velocityRef.current = deltaX / deltaTime;
    }

    lastMoveTimeRef.current = now;
    lastMoveXRef.current = clientX;

    const diff = startXRef.current - clientX;
    const newX = normalizePosition(scrollStartRef.current + diff);
    scrollXRef.current = newX;
    setScrollX(newX);
  }, [normalizePosition]);

  const applyMomentum = useCallback(() => {
    const friction = 0.95;
    const minVelocity = 0.05;

    const animateMomentum = () => {
      velocityRef.current *= friction;

      if (Math.abs(velocityRef.current) < minVelocity) {
        velocityRef.current = 0;
        momentumRef.current = null;

        // Resume auto-scroll instantly for seamless transition
        resumeTimeoutRef.current = setTimeout(() => {
          isPausedRef.current = false;
        }, 100);
        return;
      }

      const newX = normalizePosition(scrollXRef.current - velocityRef.current * 16);
      scrollXRef.current = newX;
      setScrollX(newX);
      momentumRef.current = requestAnimationFrame(animateMomentum);
    };

    if (Math.abs(velocityRef.current) > minVelocity) {
      momentumRef.current = requestAnimationFrame(animateMomentum);
    } else {
      // No momentum, resume instantly
      resumeTimeoutRef.current = setTimeout(() => {
        isPausedRef.current = false;
      }, 100);
    }
  }, [normalizePosition]);

  const handleInteractionEnd = useCallback(() => {
    if (!isDraggingRef.current) return;

    // Update refs immediately
    isDraggingRef.current = false;

    // Update state for UI
    setIsDraggingState(false);

    // Apply momentum and schedule resume
    applyMomentum();
  }, [applyMomentum]);

  // Check if click was a tap (not a drag)
  const isClick = useCallback((clientX: number, clientY: number) => {
    if (!clickStartRef.current) return false;
    const dx = Math.abs(clientX - clickStartRef.current.x);
    const dy = Math.abs(clientY - clickStartRef.current.y);
    const dt = performance.now() - clickStartRef.current.time;
    return dx < 10 && dy < 10 && dt < 300;
  }, []);

  const handleExampleSelect = useCallback((template: PostTemplate, clientX: number, clientY: number) => {
    // Don't allow selection if disabled
    if (disabled) {
      clickStartRef.current = null;
      return;
    }

    if (isClick(clientX, clientY)) {
      // If onTemplateSelect is provided, use modal-based flow
      if (onTemplateSelect) {
        onTemplateSelect(template);
      } else {
        // Fallback: inject structured template with placeholders directly
        onSelect(template.template);
      }
    }
    clickStartRef.current = null;
  }, [isClick, onSelect, onTemplateSelect, disabled]);

  // Hover handlers for individual chips (no pause for seamless animation)
  const handleChipMouseEnter = useCallback((templateId: string) => {
    if (!isDraggingRef.current) {
      setHoveredChip(templateId);
    }
  }, []);

  const handleChipMouseLeave = useCallback(() => {
    setHoveredChip(null);
  }, []);

  // Mouse handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleInteractionStart(e.clientX, e.clientY);
  }, [handleInteractionStart]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    handleInteractionMove(e.clientX);
  }, [handleInteractionMove]);

  const onMouseUp = useCallback(() => {
    handleInteractionEnd();
  }, [handleInteractionEnd]);

  const onMouseLeave = useCallback(() => {
    if (isDraggingRef.current) {
      handleInteractionEnd();
    }
    // Clear hover state when mouse leaves container
    setHoveredChip(null);
  }, [handleInteractionEnd]);

  // Container hover handlers (no pause for seamless animation)
  const onContainerMouseEnter = useCallback(() => {
    // Do nothing - let animation continue
  }, []);

  const onContainerMouseLeave = useCallback(() => {
    setHoveredChip(null);
  }, []);

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleInteractionStart(touch.clientX, touch.clientY);
  }, [handleInteractionStart]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleInteractionMove(touch.clientX);
  }, [handleInteractionMove]);

  const onTouchEnd = useCallback(() => {
    handleInteractionEnd();
  }, [handleInteractionEnd]);

  return (
    <div className={`infinite-scroll-stable ${className}`}>
      <div
        ref={containerRef}
        className="interactive-scroll-container"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseEnter={onContainerMouseEnter}
        onMouseLeave={onContainerMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ cursor: isDraggingState ? "grabbing" : "grab" }}
      >
        <div
          ref={trackRef}
          className="interactive-scroll-track"
          style={{ transform: `translate3d(-${scrollX}px, 0, 0)` }}
        >
          {duplicatedTemplates.map((template, index) => {
            const chipId = `${template.id}-${index}`;
            const isHovered = hoveredChip === chipId;

            return (
              <button
                key={chipId}
                onClick={(e) => handleExampleSelect(template, e.clientX, e.clientY)}
                onMouseEnter={() => !disabled && handleChipMouseEnter(chipId)}
                onMouseLeave={handleChipMouseLeave}
                disabled={disabled}
                className={`
                  template-chip-interactive
                  flex-shrink-0 px-4 py-2.5 rounded-xl border-2
                  ${template.bgColor} ${template.borderColor}
                  flex items-center gap-2
                  select-none
                  transition-all duration-200
                  ${disabled
                    ? 'cursor-not-allowed opacity-90'
                    : isHovered
                      ? 'scale-105 shadow-lg ring-2 ring-primary/30'
                      : 'scale-100'
                  }
                  ${!disabled && 'hover:shadow-md'}
                `}
                draggable={false}
              >
                <span className="text-lg pointer-events-none">{template.icon}</span>
                <span className={`
                  text-xs font-medium whitespace-nowrap pointer-events-none
                  transition-colors duration-200
                  ${isHovered && !disabled
                    ? 'text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-700 dark:text-text-secondary'
                  }
                `}>
                  {template.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
