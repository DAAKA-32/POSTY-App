"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface LinkedInPreviewProps {
  content: string;
  mode: "post" | "message" | "both";
}

export default function LinkedInPreview({ content, mode }: LinkedInPreviewProps) {
  const { userProfile } = useAuth();
  const { t } = useLanguage();

  // Format content: preserve line breaks, limit preview length
  const formatContent = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (mode === "both") {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <LinkedInPostPreview content={content} userProfile={userProfile} t={t} />
        <LinkedInMessagePreview content={content} t={t} />
      </div>
    );
  }

  if (mode === "post") {
    return <LinkedInPostPreview content={content} userProfile={userProfile} t={t} />;
  }

  return <LinkedInMessagePreview content={content} t={t} />;
}

// Post LinkedIn Preview
function LinkedInPostPreview({ content, userProfile, t }: { content: string; userProfile: any; t: any }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
        <span>{t.ui.linkedInPostPreview}</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg overflow-hidden shadow-elevated"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent overflow-hidden flex items-center justify-center shrink-0">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-lg">
                  {userProfile?.displayName?.[0]?.toUpperCase() || "U"}
                </span>
              )}
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm">
                {userProfile?.displayName || t.ui.yourName}
              </h4>
              <p className="text-xs text-gray-600 truncate">
                {userProfile?.headline || t.ui.yourProfessionalTitle}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                <span>{t.ui.justNow}</span>
                <span>•</span>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 13A6 6 0 118 2a6 6 0 010 12z" />
                  <path d="M8 4a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              </div>
            </div>

            {/* More menu */}
            <button className="text-gray-600 hover:text-gray-900">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="text-gray-900 text-sm whitespace-pre-wrap leading-relaxed">
            {content.split('\n').map((line, i) => (
              <p key={i} className={i > 0 ? 'mt-2' : ''}>
                {line || '\u00A0'}
              </p>
            ))}
          </div>
        </div>

        {/* Engagement bar */}
        <div className="px-4 py-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                <div className="w-4 h-4 rounded-full bg-blue-500 border border-white flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                </div>
              </div>
              <span>0</span>
            </div>
            <span>0 {t.ui.comments}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-2 border-t border-gray-200">
          <div className="flex items-center justify-around">
            {[
              { icon: "👍", label: t.ui.linkedInLike },
              { icon: "💬", label: t.ui.linkedInComment },
              { icon: "↻", label: t.ui.linkedInShare },
              { icon: "📤", label: t.ui.linkedInSend },
            ].map((action, i) => (
              <button
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-xs font-medium transition-colors"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Message LinkedIn Preview
function LinkedInMessagePreview({ content, t }: { content: string; t: any }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>{t.ui.linkedInMessagePreview}</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg overflow-hidden shadow-elevated"
      >
        {/* Message thread header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">{t.ui.firstName} {t.ui.lastName}</h4>
              <p className="text-xs text-gray-600">{t.ui.firstDegreeConnection}</p>
            </div>
          </div>
        </div>

        {/* Message bubble */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="bg-primary text-white rounded-2xl rounded-tl-sm px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed">
                {content.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-2' : ''}>
                    {line || '\u00A0'}
                  </p>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-1 px-1">
                <span className="text-xs text-gray-500">{t.ui.justNow}</span>
              </div>
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-text-primary leading-relaxed">
              {t.ui.messagePreviewInfo}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
