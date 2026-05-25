"use client";

/**
 * MastodonConnectModal — premium connection flow for Mastodon (federated).
 *
 * Visual identity:
 *   - Hero mammoth-M logo (official Mastodon brand mark)
 *   - Indigo gradient hairline + brand-purple CTA
 *   - Trust-first: "your password never leaves your instance"
 *
 * UX:
 *   - Popular instances pre-selected as chips (mastodon.social, hachyderm.io,
 *     mamot.fr, piaille.fr, fosstodon.org). One click → field populates.
 *   - Custom instance toggle for everything else
 *   - Helper hint that explains how to find your instance from your handle
 *   - Redirect note clarifies the OAuth round-trip
 *
 * Backend logic (MastodonContext.connectMastodon → OAuth redirect) unchanged.
 */

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";
import { useMastodon } from "@/contexts/MastodonContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { renderInlineMarkup } from "@/lib/utils/inline-markup";
import MastodonLogo from "./MastodonLogo";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const MASTO_PURPLE = "#6364FF";

const POPULAR_INSTANCES = [
  "mastodon.social",
  "hachyderm.io",
  "mamot.fr",
  "piaille.fr",
  "fosstodon.org",
];

export default function MastodonConnectModal({ isOpen, onClose }: Props) {
  const { connectMastodon } = useMastodon();
  const { t } = useLanguage();
  const c = t.mastodonConnect;

  const [instance, setInstance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useCustom, setUseCustom] = useState(false);

  // Same guard as BlueskyConnectModal — skip the JSX construction when closed
  // (perf) and bail safely if the translation chunk for `mastodonConnect`
  // hasn't landed yet (defensive — protects against future i18n regressions).
  if (!isOpen || !c) return null;

  const reset = () => {
    setInstance("");
    setError(null);
    setUseCustom(false);
  };

  const handleSelectPopular = (host: string) => {
    setInstance(host);
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!instance.trim()) {
      setError(c.errorMissingInstance);
      return;
    }
    setIsSubmitting(true);
    const result = await connectMastodon(instance.trim());
    if (!result.success) {
      setIsSubmitting(false);
      const lower = (result.error || "").toLowerCase();
      const looksLikeUnreachable = /not found|unreachable|fail|invalid|404|dns/.test(lower);
      setError(looksLikeUnreachable ? c.errorInvalidInstance : result.error || c.errorGeneric);
      return;
    }
    // Success → redirect to instance for OAuth — the modal will unmount on
    // navigation, no need to manage further state here.
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const footer = (
    <div className="flex gap-3">
      <Button
        variant="secondary"
        fullWidth
        onClick={handleClose}
        disabled={isSubmitting}
        className="min-h-[48px]"
      >
        {c.cancel}
      </Button>
      <Button
        fullWidth
        onClick={() => handleSubmit()}
        isLoading={isSubmitting}
        className="min-h-[48px] border-none text-white"
        style={{
          backgroundColor: MASTO_PURPLE,
          backgroundImage: `linear-gradient(135deg, ${MASTO_PURPLE} 0%, #4F50E0 100%)`,
        }}
      >
        {isSubmitting ? c.submitting : c.submit}
      </Button>
    </div>
  );

  const isPopularSelected =
    !useCustom && POPULAR_INSTANCES.includes(instance);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      footer={footer}
      // Disable the modal's built-in header bar — we render our own close
      // button inside the hero so the brand strip sits flush at the top.
      showCloseButton={false}
    >
      <form onSubmit={handleSubmit} className="space-y-5 -mt-2">
        {/* ─── Hero ─── */}
        <div className="relative -mx-5 -mt-5 px-5 pt-5 pb-4 border-b border-gray-200 dark:border-dark-border">
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${MASTO_PURPLE}, transparent)` }}
          />
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#6364FF]/8 dark:bg-[#6364FF]/15 flex items-center justify-center">
              <MastodonLogo size={28} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white tracking-tight leading-tight">
                {c.title}
              </h2>
              <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
                {c.subtitle}
              </p>
            </div>
            {/* Close button in the hero */}
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              aria-label={c.cancel}
              className="
                flex-shrink-0 -mt-1 -mr-1
                w-8 h-8 rounded-lg
                text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
                hover:bg-gray-100 dark:hover:bg-dark-hover
                disabled:opacity-40
                flex items-center justify-center
                transition-colors
              "
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ─── Trust strip ─── */}
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
          style={{ backgroundColor: `${MASTO_PURPLE}0d` }}
        >
          <svg
            className="flex-shrink-0 w-4 h-4 mt-0.5"
            style={{ color: MASTO_PURPLE }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <p className="text-[12.5px] text-gray-700 dark:text-gray-300 leading-relaxed">
            {c.trustNote}
          </p>
        </div>

        {/* ─── Popular instances picker ─── */}
        {!useCustom && (
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 mb-2">
              {c.popularInstancesTitle}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_INSTANCES.map((host) => {
                const selected = instance === host;
                return (
                  <button
                    key={host}
                    type="button"
                    onClick={() => handleSelectPopular(host)}
                    disabled={isSubmitting}
                    className={`
                      px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium
                      border transition-all duration-150
                      ${selected
                        ? "text-white border-transparent shadow-sm"
                        : "bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-dark-hover"
                      }
                    `}
                    style={selected ? { backgroundColor: MASTO_PURPLE } : undefined}
                  >
                    {host}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setUseCustom(true);
                  setInstance("");
                }}
                disabled={isSubmitting}
                className="
                  px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium
                  border border-dashed border-gray-300 dark:border-gray-600
                  text-gray-500 dark:text-gray-400
                  hover:border-gray-400 dark:hover:border-gray-500
                  hover:text-gray-700 dark:hover:text-gray-200
                  hover:bg-gray-50 dark:hover:bg-dark-hover
                  transition-colors
                "
              >
                {c.customInstance}
              </button>
            </div>
          </div>
        )}

        {/* ─── Custom instance field ─── */}
        {(useCustom || isPopularSelected) && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[12.5px] font-medium text-gray-900 dark:text-white">
                {c.instanceLabel}
              </label>
              {useCustom && (
                <button
                  type="button"
                  onClick={() => {
                    setUseCustom(false);
                    setInstance("");
                  }}
                  className="text-[11.5px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  disabled={isSubmitting}
                >
                  ← {c.popularInstancesTitle}
                </button>
              )}
            </div>
            <Input
              type="text"
              placeholder={c.instancePlaceholder}
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
              disabled={isSubmitting}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              // Override the base Input's pt-5 pb-2 (designed for a floating
              // label that we don't use here). leading-tight keeps the text
              // line-box compact so the baseline doesn't push perceived center
              // toward the bottom of the field.
              className="!py-4 !leading-tight"
            />
            <p
              className="mt-1 text-[11.5px] text-gray-500 dark:text-gray-400 leading-relaxed"
            >
              {renderInlineMarkup(c.instanceHint)}
            </p>
          </div>
        )}

        {/* ─── Redirect note ─── */}
        <div className="flex items-start gap-2 text-[11.5px] text-gray-500 dark:text-gray-400 leading-relaxed">
          <svg
            className="flex-shrink-0 w-3.5 h-3.5 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{c.redirectNote}</span>
        </div>

        {/* ─── Error alert ─── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg"
            >
              <svg
                className="flex-shrink-0 w-4 h-4 text-red-500 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="flex-1 text-[12.5px] text-red-700 dark:text-red-300 leading-relaxed">
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <button type="submit" className="hidden" aria-hidden="true" />
      </form>
    </Modal>
  );
}
