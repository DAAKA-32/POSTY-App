"use client";

/**
 * BlueskyConnectModal — premium connection flow for Bluesky.
 *
 * Visual identity:
 *   - Hero butterfly logo (official Bluesky brand mark)
 *   - Sky-blue gradient hairline + brand-blue CTA
 *   - Trust-first copy: "Posty never sees your real password"
 *
 * UX:
 *   - 3-step "How to get an app password" guide (collapsible) with a
 *     direct deep-link to bsky.app settings
 *   - Handle field with @-prefix tip + auto-suffix .bsky.social
 *   - App password field with show/hide toggle
 *   - States: idle, loading, success (toast), error (inline alert)
 *
 * Backend logic (BlueskyContext.connectBluesky) is unchanged.
 */

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";
import { useBluesky } from "@/contexts/BlueskyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { renderInlineMarkup } from "@/lib/utils/inline-markup";
import toast from "@/components/ui/Toast";
import BlueskyLogo from "./BlueskyLogo";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const BSKY_BLUE = "#0085FF";

export default function BlueskyConnectModal({ isOpen, onClose }: Props) {
  const { connectBluesky } = useBluesky();
  const { t } = useLanguage();
  const c = t.blueskyConnect;

  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

  const reset = () => {
    setHandle("");
    setPassword("");
    setError(null);
    setHowToOpen(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!handle.trim() || !password.trim()) {
      setError(c.errorMissingFields);
      return;
    }
    setIsSubmitting(true);
    const result = await connectBluesky(handle.trim(), password);
    setIsSubmitting(false);
    if (!result.success) {
      // Bluesky API returns a generic message — we map it to an actionable
      // user-facing error (most common cause: typo in handle or app password).
      const lower = (result.error || "").toLowerCase();
      const looksLikeAuth = /invalid|unauthor|fail|incorrect|wrong/.test(lower);
      setError(looksLikeAuth ? c.errorInvalidCredentials : result.error || c.errorGeneric);
      return;
    }
    toast.success(c.successToast);
    reset();
    onClose();
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
          backgroundColor: BSKY_BLUE,
          backgroundImage: `linear-gradient(135deg, ${BSKY_BLUE} 0%, #006FE0 100%)`,
        }}
      >
        {c.submit}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      footer={footer}
      // Disable the modal's built-in header bar (which would just show an
      // empty white strip with the X button) — we render our own close
      // button inside the hero so the brand strip sits flush at the top.
      showCloseButton={false}
    >
      <form onSubmit={handleSubmit} className="space-y-5 -mt-2">
        {/* ─── Hero ─── */}
        <div className="relative -mx-5 -mt-5 px-5 pt-5 pb-4 border-b border-gray-200 dark:border-dark-border">
          {/* Sky-blue hairline at the very top of the modal body */}
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${BSKY_BLUE}, transparent)` }}
          />
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#0085FF]/8 dark:bg-[#0085FF]/15 flex items-center justify-center">
              <BlueskyLogo size={28} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white tracking-tight leading-tight">
                {c.title}
              </h2>
              <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
                {c.subtitle}
              </p>
            </div>
            {/* Close button in the hero — replaces the modal's default header X */}
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
          style={{ backgroundColor: `${BSKY_BLUE}0d` }}
        >
          <svg
            className="flex-shrink-0 w-4 h-4 mt-0.5"
            style={{ color: BSKY_BLUE }}
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

        {/* ─── How-to (collapsible) ─── */}
        <div className="border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setHowToOpen((v) => !v)}
            className="
              w-full flex items-center justify-between gap-2 px-3.5 py-2.5
              text-left
              hover:bg-gray-50 dark:hover:bg-dark-hover
              transition-colors
            "
            aria-expanded={howToOpen}
          >
            <span className="text-[13px] font-medium text-gray-900 dark:text-white">
              {c.howToTitle}
            </span>
            <motion.svg
              animate={{ rotate: howToOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </motion.svg>
          </button>
          <AnimatePresence initial={false}>
            {howToOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-gray-100 dark:border-dark-border/60">
                  <ol className="space-y-2">
                    {[c.howToStep1, c.howToStep2, c.howToStep3].map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span
                          className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10.5px] font-bold text-white"
                          style={{ backgroundColor: BSKY_BLUE }}
                        >
                          {i + 1}
                        </span>
                        <span
                          className="text-[12.5px] text-gray-700 dark:text-gray-300 leading-relaxed pt-0.5"
                        >
                          {renderInlineMarkup(step)}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <a
                    href="https://bsky.app/settings/app-passwords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      inline-flex items-center gap-1
                      text-[12px] font-medium
                      hover:underline mt-1
                    "
                    style={{ color: BSKY_BLUE }}
                  >
                    {c.openBlueskySettings}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Handle field ─── */}
        <div>
          <label className="block text-[12.5px] font-medium text-gray-900 dark:text-white mb-1.5">
            {c.handleLabel}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px] pointer-events-none select-none">
              @
            </span>
            <Input
              type="text"
              placeholder={c.handlePlaceholder}
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
              disabled={isSubmitting}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              // Override the base Input's pt-5 pb-2 (floating-label preset).
              // !pl-7 makes room for the @ prefix, leading-tight keeps the
              // text vertically centered (default leading pushes baseline low).
              className="!pl-7 !py-4 !leading-tight"
            />
          </div>
          <p className="mt-1 text-[11.5px] text-gray-500 dark:text-gray-400">
            {c.handleHint}
          </p>
        </div>

        {/* ─── App password field ─── */}
        <div>
          <label className="block text-[12.5px] font-medium text-gray-900 dark:text-white mb-1.5">
            {c.appPasswordLabel}
          </label>
          {/* The base Input component already provides a built-in show/hide
              toggle when type="password" — we use it instead of stacking our
              own (avoids the double-button overlap visible at the right edge
              of the field). The built-in icon styling matches every other
              password field in the app. */}
          <Input
            type="password"
            placeholder={c.appPasswordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            autoComplete="current-password"
            spellCheck={false}
            className="!py-4 !leading-tight"
          />
          <p className="mt-1 text-[11.5px] text-gray-500 dark:text-gray-400">
            {c.appPasswordHint}
          </p>
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

        {/* Hidden submit so Enter triggers handleSubmit */}
        <button type="submit" className="hidden" aria-hidden="true" />
      </form>
    </Modal>
  );
}
