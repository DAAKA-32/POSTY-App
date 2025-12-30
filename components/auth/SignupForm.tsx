"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import GoogleButton from "./GoogleButton";

interface SignupFormProps {
  onSuccess?: () => void;
}

// Password strength calculation
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Faible", color: "bg-error" };
  if (score <= 2) return { score: 2, label: "Moyen", color: "bg-warning" };
  if (score <= 3) return { score: 3, label: "Bon", color: "bg-primary" };
  return { score: 4, label: "Excellent", color: "bg-accent" };
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const { signUpWithEmail } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  // Auto-focus name field and trigger animations
  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      nameRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caracteres");
      return;
    }

    if (!acceptTerms) {
      setError("Veuillez accepter les conditions d'utilisation");
      return;
    }

    setIsLoading(true);

    try {
      await signUpWithEmail(email, password, displayName);
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 500);
    } catch {
      setError("Erreur lors de la creation du compte. Cet email est peut-etre deja utilise.");
      // Shake animation on error
      const form = document.getElementById("signup-form");
      form?.classList.add("animate-shake");
      setTimeout(() => form?.classList.remove("animate-shake"), 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`
        w-full max-w-sm mx-auto
        transition-all duration-700 ease-out
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
          <span className="text-white font-bold text-2xl">T</span>
        </div>
        <h1
          className={`
            text-2xl lg:text-3xl font-bold text-white mb-3
            transition-all duration-500 delay-200
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          `}
        >
          Creer un compte
        </h1>
        <p
          className={`
            text-text-secondary
            transition-all duration-500 delay-300
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          `}
        >
          Rejoignez POSTY et creez des posts percutants
        </p>
      </div>

      {/* Success state */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-xl text-accent text-sm flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Compte cree ! Redirection...</span>
        </div>
      )}

      {/* Google Sign Up */}
      <div
        className={`
          transition-all duration-500 delay-400
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        <GoogleButton onSuccess={onSuccess} label="S'inscrire avec Google" />
      </div>

      {/* Divider */}
      <div
        className={`
          relative my-8
          transition-all duration-500 delay-500
          ${isVisible ? "opacity-100" : "opacity-0"}
        `}
      >
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-dark-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-background text-text-muted">ou par email</span>
        </div>
      </div>

      {/* Email Form */}
      <form
        id="signup-form"
        onSubmit={handleSubmit}
        className={`
          space-y-5
          transition-all duration-500 delay-600
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        {/* Error message with animation */}
        {error && (
          <div className="p-4 bg-error/10 border border-error/30 rounded-xl text-error text-sm flex items-center gap-3 animate-fade-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <Input
          ref={nameRef}
          type="text"
          label="Votre nom"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          autoComplete="name"
          aria-label="Votre nom"
        />

        <Input
          type="email"
          label="Adresse email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          aria-label="Adresse email"
        />

        <div>
          <Input
            type="password"
            label="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            aria-label="Mot de passe"
          />

          {/* Password strength indicator */}
          {password.length > 0 && (
            <div className="mt-3 space-y-2 animate-fade-in">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`
                      h-1.5 flex-1 rounded-full transition-all duration-300
                      ${level <= passwordStrength.score ? passwordStrength.color : "bg-dark-border"}
                    `}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Force du mot de passe:</span>
                <span
                  className={`
                    font-medium
                    ${passwordStrength.score <= 1 ? "text-error" : ""}
                    ${passwordStrength.score === 2 ? "text-warning" : ""}
                    ${passwordStrength.score === 3 ? "text-primary" : ""}
                    ${passwordStrength.score === 4 ? "text-accent" : ""}
                  `}
                >
                  {passwordStrength.label}
                </span>
              </div>
              <ul className="text-xs text-text-muted space-y-1">
                <li className={`flex items-center gap-1.5 ${password.length >= 6 ? "text-accent" : ""}`}>
                  {password.length >= 6 ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                  Au moins 6 caracteres
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* GDPR Consent Checkbox */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={`
                  w-5 h-5 rounded border-2 transition-all duration-200
                  ${acceptTerms
                    ? "bg-primary border-primary"
                    : "bg-transparent border-dark-border group-hover:border-primary/50"
                  }
                  peer-focus:ring-2 peer-focus:ring-primary/30 peer-focus:ring-offset-2 peer-focus:ring-offset-background
                `}
              >
                {acceptTerms && (
                  <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-text-secondary leading-relaxed">
              J&apos;accepte les{" "}
              <Link href="/legal/terms" className="text-primary hover:text-primary-hover underline">
                conditions d&apos;utilisation
              </Link>{" "}
              et la{" "}
              <Link href="/legal/privacy" className="text-primary hover:text-primary-hover underline">
                politique de confidentialite
              </Link>
            </span>
          </label>
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isLoading}
          disabled={showSuccess || !acceptTerms}
        >
          Creer mon compte
        </Button>

        {/* RGPD notice */}
        <p className="text-xs text-text-muted text-center leading-relaxed">
          Vos donnees sont traitees conformement au RGPD.{" "}
          <Link href="/legal/privacy" className="text-primary hover:underline">
            En savoir plus
          </Link>
        </p>
      </form>

      {/* Login link */}
      <p
        className={`
          mt-8 text-center text-text-secondary text-sm
          transition-all duration-500 delay-700
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        Deja un compte ?{" "}
        <Link
          href="/login"
          className="text-primary hover:text-primary-hover font-medium transition-colors duration-200"
        >
          Se connecter
        </Link>
      </p>

      {/* Security badge */}
      <div
        className={`
          mt-8 flex items-center justify-center gap-2 text-xs text-text-muted
          transition-all duration-500 delay-800
          ${isVisible ? "opacity-100" : "opacity-0"}
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>Donnees chiffrees & securisees</span>
      </div>
    </div>
  );
}
