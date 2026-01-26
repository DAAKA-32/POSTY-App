"use client";

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useSubscription } from "@/contexts/SubscriptionContext";
import toast from "@/components/ui/Toast";
import LinkedInPreview from "./LinkedInPreview";
import { CompactRefineSlider } from "./RefineSlider";

interface ResponseCardProps {
  title?: string;
  content: string;
  type: "storytelling" | "business";
  onSelect?: () => void;
  isSelected?: boolean;
  onCopy?: () => void;
  onPublishToLinkedIn?: () => void;
  onSchedule?: () => void;
  showLinkedInButton?: boolean;
  showScheduleButton?: boolean;
  onRefine?: (tone: number, content: string) => void;
  authorName?: string;
  authorTitle?: string;
  authorAvatar?: string;
}

const ResponseCard = memo(function ResponseCard({
  title,
  content,
  type,
  onSelect,
  isSelected = false,
  onCopy,
  onPublishToLinkedIn,
  onSchedule,
  showLinkedInButton = false,
  showScheduleButton = false,
  onRefine,
  authorName = "Vous",
  authorTitle = "Votre titre professionnel",
  authorAvatar,
}: ResponseCardProps) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [toneValue, setToneValue] = useState(50);
  const { trigger: triggerHaptic } = useHapticFeedback();
  const { canSchedulePosts } = useSubscription();

  // Check if scheduling is available for the user's plan
  const canSchedule = canSchedulePosts().allowed;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      triggerHaptic("success");
      toast.success("Copié !");
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch {
      triggerHaptic("error");
      toast.error("Erreur lors de la copie");
    }
  };

  const handleRefine = () => {
    if (onRefine) {
      onRefine(toneValue, content);
      setShowRefine(false);
      toast.success("Raffinement en cours...");
    }
  };

  const typeStyles = {
    storytelling: {
      badge: "bg-gradient-to-r from-accent/20 to-purple-500/20 text-accent border-accent/30",
      border: isSelected ? "border-accent/60" : "border-gray-200/80 dark:border-dark-border/80",
      glow: "from-accent/20 to-purple-500/20",
      iconBg: "from-accent/10 to-purple-500/10",
    },
    business: {
      badge: "bg-gradient-to-r from-primary/20 to-blue-500/20 text-primary border-primary/30",
      border: isSelected ? "border-primary/60" : "border-gray-200/80 dark:border-dark-border/80",
      glow: "from-primary/20 to-blue-500/20",
      iconBg: "from-primary/10 to-blue-500/10",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      {/* Subtle glow effect on hover */}
      <div className={`absolute -inset-1 bg-gradient-to-br ${typeStyles[type].glow} rounded-2xl opacity-0 hover:opacity-100 blur-xl transition-opacity duration-500 -z-10`} />

      <Card
        className={`
          relative h-full flex flex-col
          border ${typeStyles[type].border}
          ${isSelected ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-dark-bg shadow-lg" : "shadow-md hover:shadow-lg"}
          ${type === "storytelling" ? (isSelected ? "ring-accent/50" : "") : ""}
          ${type === "business" ? (isSelected ? "ring-primary/50" : "") : ""}
          rounded-2xl overflow-hidden
          transition-all duration-300
          bg-white dark:bg-dark-card
        `}
        padding="none"
      >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-dark-border bg-gradient-to-r from-gray-50/50 to-transparent dark:from-dark-elevated/30 dark:to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Type icon with gradient background */}
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${typeStyles[type].iconBg} flex items-center justify-center`}>
              {type === "storytelling" ? (
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div>
              <span
                className={`
                  px-2.5 py-1 text-xs font-semibold rounded-lg border
                  ${typeStyles[type].badge}
                `}
              >
                {type === "storytelling" ? "Storytelling" : "Business"}
              </span>
              {title && <h3 className="font-medium text-text-primary mt-1">{title}</h3>}
            </div>
          </div>

          {/* Toggle buttons for Preview & Refine */}
          <div className="flex items-center gap-1.5">
            {/* LinkedIn Preview Toggle */}
            <motion.button
              onClick={() => {
                setShowPreview(!showPreview);
                setShowRefine(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                p-2 rounded-xl transition-all duration-200
                ${showPreview
                  ? "bg-[#0A66C2]/15 text-[#0A66C2] shadow-sm"
                  : "text-text-muted hover:text-[#0A66C2] hover:bg-[#0A66C2]/10"
                }
              `}
              title="Aperçu LinkedIn"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </motion.button>

            {/* Refine Toggle */}
            {onRefine && (
              <motion.button
                onClick={() => {
                  setShowRefine(!showRefine);
                  setShowPreview(false);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  p-2 rounded-xl transition-all duration-200
                  ${showRefine
                    ? "bg-violet-500/15 text-violet-500 shadow-sm"
                    : "text-text-muted hover:text-violet-500 hover:bg-violet-500/10"
                  }
                `}
                title="Ajuster le ton"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* LinkedIn Preview Panel */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-b border-gray-100 dark:border-dark-border"
          >
            <div className="p-4">
              <LinkedInPreview
                content={content}
                authorName={authorName}
                authorTitle={authorTitle}
                authorAvatar={authorAvatar}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refine Panel */}
      <AnimatePresence>
        {showRefine && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-b border-gray-100 dark:border-dark-border"
          >
            <div className="p-4 bg-gray-50/50 dark:bg-dark-elevated/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-text-secondary">
                  Ajuster le ton
                </span>
                <Button
                  size="sm"
                  onClick={handleRefine}
                  className="bg-violet-500 hover:bg-violet-600 text-white text-xs px-3 py-1.5"
                >
                  Appliquer
                </Button>
              </div>
              <CompactRefineSlider
                value={toneValue}
                onChange={setToneValue}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto max-h-[400px] bg-white dark:bg-dark-card">
        <div className="text-text-primary whitespace-pre-wrap break-words overflow-wrap-anywhere text-sm leading-relaxed">
          {content}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-dark-border flex gap-2 bg-gray-50/50 dark:bg-dark-elevated/30">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="flex-1"
        >
          {copied ? (
            <>
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copié !
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copier
            </>
          )}
        </Button>
        {showLinkedInButton && onPublishToLinkedIn && (
          <Button
            size="sm"
            onClick={onPublishToLinkedIn}
            className="flex-1 bg-[#0A66C2] hover:bg-[#004182] border-none"
          >
            <LinkedInIcon className="w-4 h-4 mr-1" />
            Publier
          </Button>
        )}
        {showScheduleButton && onSchedule && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSchedule}
            className={`flex-1 relative ${!canSchedule ? "pr-12" : ""}`}
            title={canSchedule ? "Programmer ce post" : "Programmer ce post (Pro)"}
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Programmer
            {!canSchedule && (
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-primary to-accent text-white rounded-md">
                PRO
              </span>
            )}
          </Button>
        )}
        {onSelect && (
          <Button
            variant={isSelected ? "primary" : "ghost"}
            size="sm"
            onClick={onSelect}
            className="flex-1"
          >
            {isSelected ? "Sélectionné" : "Choisir"}
          </Button>
        )}
      </div>
      </Card>
    </motion.div>
  );
});

export default ResponseCard;
