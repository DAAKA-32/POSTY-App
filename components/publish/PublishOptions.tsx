"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export interface PublishMode {
  publishToFeed: boolean;
  sendToConnections: boolean;
}

interface PublishOptionsProps {
  mode: PublishMode;
  onChange: (mode: PublishMode) => void;
  connectionsCount?: number;
  estimatedReach?: number;
}

export default function PublishOptions({
  mode,
  onChange,
  connectionsCount = 0,
  estimatedReach = 2500,
}: PublishOptionsProps) {
  const { t } = useLanguage();
  const { publishToFeed, sendToConnections } = mode;

  const togglePublishToFeed = () => {
    onChange({ ...mode, publishToFeed: !publishToFeed });
  };

  const toggleSendToConnections = () => {
    onChange({ ...mode, sendToConnections: !sendToConnections });
  };

  // Validation: at least one must be selected
  const hasSelection = publishToFeed || sendToConnections;

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t.publish.chooseBroadcastMode}
        </label>
        {!hasSelection && (
          <span className="text-xs text-error">{t.publish.selectAtLeastOne}</span>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3">
        {/* Option 1: Post LinkedIn */}
        <motion.div
          onClick={togglePublishToFeed}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
            ${publishToFeed
              ? 'bg-primary/10 border-primary shadow-glow'
              : 'bg-dark-card border-dark-border hover:border-primary/30'
            }
          `}
        >
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <div className={`
              w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200
              ${publishToFeed
                ? 'bg-primary border-primary'
                : 'bg-dark-bg border-dark-border'
              }
            `}>
              {publishToFeed && (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </motion.svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
                <h4 className={`font-semibold ${publishToFeed ? 'text-white' : 'text-text-secondary'}`}>
                  {t.publish.publishAsLinkedInPost}
                </h4>
              </div>
              <p className="text-sm text-text-muted mb-2">
                {t.publish.visiblePublicly}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 px-2 py-1 bg-dark-bg rounded-md text-text-muted">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <span>{t.publish.estimatedReach.replace("{count}", estimatedReach.toLocaleString())}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Glow effect when selected */}
          {publishToFeed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl blur-sm -z-10"
            />
          )}
        </motion.div>

        {/* Option 2: Messages Privés */}
        <motion.div
          onClick={toggleSendToConnections}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
            ${sendToConnections
              ? 'bg-accent/10 border-accent shadow-glow'
              : 'bg-dark-card border-dark-border hover:border-accent/30'
            }
          `}
        >
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <div className={`
              w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200
              ${sendToConnections
                ? 'bg-accent border-accent'
                : 'bg-dark-bg border-dark-border'
              }
            `}>
              {sendToConnections && (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </motion.svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h4 className={`font-semibold ${sendToConnections ? 'text-white' : 'text-text-secondary'}`}>
                  {t.publish.sendAsPrivateMessages}
                </h4>
              </div>
              <p className="text-sm text-text-muted mb-2">
                {t.publish.sentDirectlyToConnections}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 px-2 py-1 bg-dark-bg rounded-md text-text-muted">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                  <span>
                    {connectionsCount > 0
                      ? `${connectionsCount.toLocaleString()} ${t.publish.recipients}`
                      : t.common.loading}
                  </span>
                </div>
              </div>

              {/* Warning for mass messaging */}
              {sendToConnections && connectionsCount > 100 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 flex items-start gap-2 p-2 bg-warning/10 border border-warning/30 rounded-lg text-warning text-xs"
                >
                  <svg className="w-3 h-3 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{t.publish.massMessageWarning}</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Glow effect when selected */}
          {sendToConnections && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 to-accent/10 rounded-xl blur-sm -z-10"
            />
          )}
        </motion.div>
      </div>

      {/* Summary when both selected */}
      {publishToFeed && sendToConnections && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm"
        >
          <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span className="text-text-secondary">
            {t.publish.publishedPubliclyAndSent}{' '}
            <span className="text-white font-medium">{t.publish.publishedPublicly}</span>{' '}
            <span className="text-white font-medium">{t.publish.andSentTo.replace("{count}", String(connectionsCount))}</span>
          </span>
        </motion.div>
      )}
    </div>
  );
}
