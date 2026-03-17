"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface LinkedInPreviewProps {
  content: string;
  authorName?: string;
  authorTitle?: string;
  authorAvatar?: string;
  isGenerating?: boolean;
  className?: string;
}

/**
 * LinkedInPreview - Real-time LinkedIn post preview
 *
 * Shows how the post will look on LinkedIn with:
 * - Author avatar and info
 * - Post content with formatting
 * - Engagement preview (likes, comments)
 * - Character count and warnings
 */
export default function LinkedInPreview({
  content,
  authorName,
  authorTitle,
  authorAvatar,
  isGenerating = false,
  className = "",
}: LinkedInPreviewProps) {
  const { t } = useLanguage();
  const resolvedAuthorName = authorName || t.ui.you;
  const resolvedAuthorTitle = authorTitle || t.ui.yourProfessionalTitle;
  const [charCount, setCharCount] = useState(0);
  const [showFullContent, setShowFullContent] = useState(false);

  // LinkedIn character limits
  const LINKEDIN_MAX_CHARS = 3000;
  const LINKEDIN_TRUNCATE_AT = 210; // LinkedIn truncates at ~210 chars before "...voir plus"

  useEffect(() => {
    setCharCount(content.length);
  }, [content]);

  // Format content for LinkedIn display (handle line breaks, hashtags, etc.)
  const formatContent = (text: string) => {
    if (!text) return null;

    // Split into paragraphs
    const paragraphs = text.split("\n\n").filter(Boolean);

    return paragraphs.map((paragraph, index) => {
      // Process hashtags and mentions
      const formattedText = paragraph
        .split(/(#\w+|@\w+)/g)
        .map((part, i) => {
          if (part.startsWith("#")) {
            return (
              <span key={i} className="text-[#0A66C2] hover:underline cursor-pointer">
                {part}
              </span>
            );
          }
          if (part.startsWith("@")) {
            return (
              <span key={i} className="text-[#0A66C2] font-semibold hover:underline cursor-pointer">
                {part}
              </span>
            );
          }
          return part;
        });

      return (
        <p key={index} className="mb-2 last:mb-0">
          {formattedText}
        </p>
      );
    });
  };

  // Truncate content for preview
  const shouldTruncate = content.length > LINKEDIN_TRUNCATE_AT && !showFullContent;
  const displayContent = shouldTruncate
    ? content.slice(0, LINKEDIN_TRUNCATE_AT) + "..."
    : content;

  // Character count color
  const getCharCountColor = () => {
    if (charCount > LINKEDIN_MAX_CHARS) return "text-red-500";
    if (charCount > LINKEDIN_MAX_CHARS * 0.9) return "text-amber-500";
    return "text-gray-400";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          <span className="text-sm font-medium text-gray-700">{t.ui.linkedInPreview}</span>
        </div>
        <div className={`text-xs font-medium ${getCharCountColor()}`}>
          {charCount.toLocaleString()} / {LINKEDIN_MAX_CHARS.toLocaleString()}
        </div>
      </div>

      {/* Post Preview */}
      <div className="p-4">
        {/* Author Info */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {authorAvatar ? (
              <Image src={authorAvatar} alt={resolvedAuthorName} width={48} height={48} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-semibold text-gray-500">
                {resolvedAuthorName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Author Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-900 text-sm hover:text-[#0A66C2] hover:underline cursor-pointer">
                {resolvedAuthorName}
              </span>
              <span className="text-gray-400 text-xs">• 1st</span>
            </div>
            <p className="text-xs text-gray-500 truncate">{resolvedAuthorTitle}</p>
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <span>{t.ui.justNow}</span>
              <span>•</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM7 3.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1H8v1.5a.5.5 0 0 1-1 0V3.5z"/>
              </svg>
            </div>
          </div>

          {/* More Options */}
          <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        {/* Post Content */}
        <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
          <AnimatePresence mode="wait">
            {isGenerating && !content ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-gray-400"
              >
                <div className="flex gap-1">
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-1.5 h-1.5 bg-[#0A66C2] rounded-full"
                  />
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-1.5 h-1.5 bg-[#0A66C2] rounded-full"
                  />
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    className="w-1.5 h-1.5 bg-[#0A66C2] rounded-full"
                  />
                </div>
                <span className="text-xs">{t.ui.generating}</span>
              </motion.div>
            ) : content ? (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {formatContent(displayContent)}
                {shouldTruncate && (
                  <button
                    onClick={() => setShowFullContent(true)}
                    className="text-gray-500 hover:text-[#0A66C2] hover:underline text-sm mt-1"
                  >
                    ...{t.ui.expand}
                  </button>
                )}
                {showFullContent && content.length > LINKEDIN_TRUNCATE_AT && (
                  <button
                    onClick={() => setShowFullContent(false)}
                    className="text-gray-500 hover:text-[#0A66C2] hover:underline text-sm block mt-1"
                  >
                    {t.ui.collapse}
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.p
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-400 italic"
              >
                {t.ui.postWillAppearHere}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Engagement Stats Preview */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px]">👍</span>
                <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[8px]">❤️</span>
                <span className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-white text-[8px]">💡</span>
              </div>
              <span className="ml-1 hover:text-[#0A66C2] hover:underline cursor-pointer">
                {t.ui.previewLabel}
              </span>
            </div>
            <span className="hover:text-[#0A66C2] hover:underline cursor-pointer">
              0 {t.ui.comments}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-around mt-3 pt-3 border-t border-gray-100">
            {[
              { icon: "👍", label: t.ui.linkedInLike },
              { icon: "💬", label: t.ui.linkedInComment },
              { icon: "🔄", label: t.ui.linkedInRepost },
              { icon: "📤", label: t.ui.linkedInSend },
            ].map((action) => (
              <button
                key={action.label}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 text-xs font-medium"
              >
                <span>{action.icon}</span>
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Character Warning */}
      {charCount > LINKEDIN_MAX_CHARS && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {t.ui.postExceedsLimit.replace("{max}", LINKEDIN_MAX_CHARS.toLocaleString())}
        </motion.div>
      )}
    </motion.div>
  );
}
