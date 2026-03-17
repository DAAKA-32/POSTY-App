"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { usePageTitle } from "@/hooks/ui/usePageTitle";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { t } = useLanguage();
  usePageTitle("forgotPassword");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Auto-focus email field and trigger animations
  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      emailRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await resetPassword(email);
      setEmailSent(true);
    } catch {
      // Don't reveal if the email exists or not (security)
      setEmailSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background gradient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <Link href="/login" className="inline-flex items-center gap-2 text-text-secondary hover:text-foreground transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>{t.common.back}</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div
          className={`
            w-full max-w-sm mx-auto
            transition-all duration-400 ease-out
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          `}
        >
          {/* Header with animation */}
          <div className="text-center mb-8">
            <div
              className={`
                inline-flex items-center justify-center w-16 h-16 mb-6
                bg-gradient-to-br from-primary to-accent rounded-2xl
                shadow-glow
                transition-all duration-500 delay-100
                ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"}
              `}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1
              className={`
                text-2xl lg:text-3xl font-bold text-foreground mb-3
                transition-all duration-500 delay-200
                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
              `}
            >
              {t.auth.forgotPasswordTitle}
            </h1>
            <p
              className={`
                text-text-secondary
                transition-all duration-500 delay-300
                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
              `}
            >
              {t.auth.forgotPasswordSubtitle}
            </p>
          </div>

          {/* Success state - Email sent */}
          {emailSent ? (
            <div
              className={`
                transition-all duration-500
                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
              `}
            >
              {/* Success icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-accent/10 border border-accent/30 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              {/* Success message */}
              <div className="bg-accent/10 border border-accent/30 rounded-2xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-3 text-center">
                  {t.auth.forgotPasswordEmailSentTitle}
                </h2>
                <p className="text-text-secondary text-sm text-center mb-4">
                  {t.auth.forgotPasswordEmailSentDesc.replace("{email}", email)}
                </p>
                <p className="text-text-muted text-xs text-center italic">
                  ({t.auth.forgotPasswordCheckSpam})
                </p>
              </div>

              {/* Additional help */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">
                      {t.auth.forgotPasswordEmailDelay.replace("{minutes}", "5")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Link href="/login" className="block">
                  <Button fullWidth size="lg">
                    {t.auth.forgotPasswordReturnToLogin}
                  </Button>
                </Link>
                <button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                  className="w-full py-3 text-text-secondary hover:text-foreground transition-colors text-sm"
                >
                  {t.auth.forgotPasswordTryAnother}
                </button>
              </div>
            </div>
          ) : (
            /* Form state */
            <form
              onSubmit={handleSubmit}
              className={`
                space-y-5
                transition-all duration-500 delay-400
                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
              `}
            >
              {/* Error message */}
              {error && (
                <div className="p-4 bg-error/10 border border-error/30 rounded-xl text-error text-sm flex items-center gap-3 animate-fade-in">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Instructions */}
              <p className="text-text-secondary text-sm">
                {t.auth.forgotPasswordInstructions}
              </p>

              <Input
                ref={emailRef}
                type="email"
                label={t.auth.forgotPasswordEmailLabel}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-label={t.auth.forgotPasswordEmailLabel}
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={isLoading}
              >
                {t.auth.forgotPasswordSendResetLink}
              </Button>
            </form>
          )}

          {/* Back to login link */}
          {!emailSent && (
            <p
              className={`
                mt-8 text-center text-text-secondary text-sm
                transition-all duration-500 delay-500
                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
              `}
            >
              {t.auth.forgotPasswordRemember}{" "}
              <Link
                href="/login"
                className="text-primary hover:text-primary-hover font-medium transition-colors duration-200"
              >
                {t.auth.forgotPasswordSignIn}
              </Link>
            </p>
          )}

          {/* Security badge */}
          <div
            className={`
              mt-8 flex items-center justify-center gap-2 text-xs text-text-muted
              transition-all duration-500 delay-600
              ${isVisible ? "opacity-100" : "opacity-0"}
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>{t.ui.sslSecure}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
