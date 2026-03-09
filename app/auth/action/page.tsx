"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useLanguage } from "@/contexts/LanguageContext";

type ActionMode = "resetPassword" | "verifyEmail" | "recoverEmail" | null;
type PageState = "loading" | "form" | "success" | "error";

function AuthActionContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") as ActionMode;
  const oobCode = searchParams.get("oobCode") || "";
  const { t } = useLanguage();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Verify the action code on mount
  useEffect(() => {
    if (!oobCode || !mode) {
      setErrorMessage("Lien invalide ou expiré. Veuillez refaire la demande.");
      setPageState("error");
      return;
    }

    if (mode === "resetPassword") {
      verifyPasswordResetCode(auth, oobCode)
        .then((userEmail) => {
          setEmail(userEmail);
          setPageState("form");
          setTimeout(() => passwordRef.current?.focus(), 300);
        })
        .catch(() => {
          setErrorMessage(
            "Ce lien a expiré ou a déjà été utilisé. Veuillez refaire une demande de réinitialisation."
          );
          setPageState("error");
        });
    } else if (mode === "verifyEmail") {
      applyActionCode(auth, oobCode)
        .then(() => {
          setPageState("success");
        })
        .catch(() => {
          setErrorMessage(
            "Ce lien a expiré ou a déjà été utilisé. Veuillez refaire une demande de vérification."
          );
          setPageState("error");
        });
    } else {
      setErrorMessage("Action non reconnue.");
      setPageState("error");
    }
  }, [mode, oobCode]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (newPassword.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setPageState("success");
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === "auth/expired-action-code") {
        setErrorMessage(
          "Ce lien a expiré. Veuillez refaire une demande de réinitialisation."
        );
      } else if (firebaseError.code === "auth/weak-password") {
        setErrorMessage(
          t.ui.weakPassword
        );
      } else {
        setErrorMessage(
          "Une erreur est survenue. Veuillez réessayer ou refaire la demande."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (pageState === "loading") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">{t.common.loading}</p>
      </div>
    );
  }

  // Error state
  if (pageState === "error") {
    return (
      <div
        className={`
          w-full max-w-sm mx-auto transition-all duration-400 ease-out
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
        `}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-error/20 rounded-2xl">
            <svg
              className="w-8 h-8 text-error"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Lien invalide
          </h1>
          <p className="text-text-secondary">{errorMessage}</p>
        </div>
        <div className="space-y-3">
          <Link href="/forgot-password" className="block">
            <Button fullWidth size="lg">
              Nouvelle demande
            </Button>
          </Link>
          <Link
            href="/login"
            className="block text-center text-text-secondary hover:text-foreground transition-colors text-sm py-2"
          >
            {t.ui.backToLogin}
          </Link>
        </div>
      </div>
    );
  }

  // Success state — password reset done OR email verified
  if (pageState === "success") {
    const isReset = mode === "resetPassword";
    return (
      <div
        className={`
          w-full max-w-sm mx-auto transition-all duration-400 ease-out
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
        `}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-accent/20 rounded-2xl">
            <svg
              className="w-8 h-8 text-accent"
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
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {isReset ? t.ui.passwordChanged : t.ui.emailVerified}
          </h1>
          <p className="text-text-secondary">
            {isReset
              ? "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter."
              : "Votre adresse email a été vérifiée avec succès."}
          </p>
        </div>
        <Link href="/login" className="block">
          <Button fullWidth size="lg">
            Se connecter
          </Button>
        </Link>
      </div>
    );
  }

  // Form state — reset password form
  return (
    <div
      className={`
        w-full max-w-sm mx-auto transition-all duration-400 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
      `}
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-glow">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          {t.ui.newPassword}
        </h1>
        <p className="text-text-secondary">
          Choisissez un nouveau mot de passe pour{" "}
          <span className="text-foreground font-medium">{email}</span>
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-5">
        {errorMessage && (
          <div className="p-4 bg-error/10 border border-error/30 rounded-xl text-error text-sm flex items-center gap-3">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <Input
          ref={passwordRef}
          type="password"
          label={t.ui.newPassword}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          helperText="6 caractères minimum"
        />

        <Input
          type="password"
          label={t.ui.confirmPasswordLabel}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isSubmitting}
        >
          Réinitialiser le mot de passe
        </Button>
      </form>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-text-muted">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span>{t.ui.sslSecure}</span>
      </div>
    </div>
  );
}

function LoadingFallback() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-text-secondary text-sm">{t.common.loading}</p>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background gradient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-foreground transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Retour</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <Suspense fallback={<LoadingFallback />}>
          <AuthActionContent />
        </Suspense>
      </main>
    </div>
  );
}
