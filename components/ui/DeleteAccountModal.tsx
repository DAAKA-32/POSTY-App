"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import Button from "./Button";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  isGoogleUser?: boolean;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  isGoogleUser = false,
}: DeleteAccountModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasShake, setHasShake] = useState(false);
  const [step, setStep] = useState<"confirm" | "success">("confirm");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setShowPassword(false);
      setError(null);
      setHasShake(false);
      setStep("confirm");
      setIsDeleting(false);
    }
  }, [isOpen]);

  // Focus password input when modal opens
  useEffect(() => {
    if (isOpen && !isGoogleUser && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isGoogleUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isGoogleUser && !password.trim()) {
      setError("Veuillez entrer votre mot de passe");
      triggerShake();
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm(password);
      setStep("success");
      // Redirect will be handled by the parent component
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMessage);
      triggerShake();
      setIsDeleting(false);
    }
  };

  const triggerShake = () => {
    setHasShake(true);
    setTimeout(() => setHasShake(false), 500);
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  if (step === "success") {
    return (
      <Modal isOpen={isOpen} onClose={() => {}} size="md">
        <div className="text-center py-6">
          {/* Success checkmark animation */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
            <div className="success-check w-10 h-5 border-l-4 border-b-4 border-accent" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Compte supprime
          </h3>
          <p className="text-text-secondary text-sm">
            Votre compte et toutes vos donnees ont ete supprimes.
          </p>
          <p className="text-text-muted text-xs mt-4">
            Redirection en cours...
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Supprimer votre compte"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Warning section */}
        <div className="p-4 bg-error/10 border border-error/30 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-error font-medium text-sm">
                Cette action est irreversible
              </p>
              <p className="text-error/80 text-xs mt-1">
                Toutes vos donnees seront definitivement supprimees :
              </p>
              <ul className="list-disc list-inside text-error/70 text-xs mt-2 space-y-0.5">
                <li>Profil et informations personnelles</li>
                <li>Historique de posts generes</li>
                <li>Sessions et conversations</li>
                <li>Preferences et consentements</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Password input for email users */}
        {!isGoogleUser && (
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Confirmez votre mot de passe pour continuer
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className={`
                  w-full px-4 py-3 pr-12 bg-dark-bg border rounded-xl text-white
                  placeholder-text-muted focus:outline-none focus:ring-2 transition-all
                  ${error
                    ? "border-error focus:ring-error/50 focus:border-error"
                    : "border-dark-border focus:ring-primary/50 focus:border-primary"
                  }
                  ${hasShake ? "error-shake" : ""}
                `}
                placeholder="Votre mot de passe"
                disabled={isDeleting}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-white transition-colors rounded-lg hover:bg-dark-hover"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <p className="mt-2 text-error text-sm flex items-center gap-2 animate-fade-in-up">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}
          </div>
        )}

        {/* Google user message */}
        {isGoogleUser && (
          <div className="p-4 bg-dark-bg border border-dark-border rounded-xl">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-text-secondary" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <div>
                <p className="text-white text-sm font-medium">
                  Connexion Google requise
                </p>
                <p className="text-text-muted text-xs mt-0.5">
                  Vous devrez confirmer votre identite via Google
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={handleClose}
            disabled={isDeleting}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="danger"
            fullWidth
            isLoading={isDeleting}
            disabled={isDeleting || (!isGoogleUser && !password.trim())}
          >
            {isDeleting ? "Suppression..." : "Supprimer mon compte"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
