"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import GoogleButton from "./GoogleButton";

interface LoginFormProps {
  onSuccess?: () => void;
}

// Animated gradient orbs component (Linear/Vercel style)
const GradientOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
    <div
      className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-15 animate-float"
      style={{
        background: "radial-gradient(circle, rgba(232, 147, 77, 0.5) 0%, transparent 70%)",
        top: "-15%",
        left: "-5%",
      }}
    />
    <div
      className="absolute w-[300px] h-[300px] rounded-full blur-[80px] opacity-10 animate-float"
      style={{
        background: "radial-gradient(circle, rgba(248, 87, 81, 0.4) 0%, transparent 70%)",
        bottom: "-10%",
        right: "0%",
        animationDelay: "-3s",
      }}
    />
  </div>
);

// Icons components
const MailIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const LoaderIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
      await signInWithEmail(email, password);
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 500);
    } catch {
      setError("Email ou mot de passe incorrect");
      // Shake animation on error
      const form = document.getElementById("login-form");
      form?.classList.add("animate-shake");
      setTimeout(() => form?.classList.remove("animate-shake"), 500);
    } finally {
      setIsLoading(false);
    }
  };

  // Input wrapper with micro-interactions
  const getInputWrapperClass = (fieldName: string) => `
    relative group
    ${focusedField === fieldName ? "scale-[1.01]" : ""}
    transition-transform duration-200
  `;

  // Input base styles with enhanced focus
  const inputBaseClass = `
    w-full pl-10 pr-4 py-3.5
    bg-white/[0.03] border border-white/[0.08]
    rounded-lg text-sm text-white
    placeholder:text-text-muted
    focus:outline-none focus:bg-white/[0.05] focus:border-primary/50
    transition-all duration-300
    disabled:opacity-50
  `;

  // Icon class based on focus state
  const getIconClass = (fieldName: string) => `
    absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4
    transition-all duration-300
    ${focusedField === fieldName ? "text-primary scale-110" : "text-text-muted"}
  `;

  return (
    <div
      className={`
        relative w-full max-w-sm mx-auto
        transition-all duration-700 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
      `}
    >
      {/* Animated gradient orbs */}
      <GradientOrbs />

      {/* Header with animation */}
      <div className="text-center mb-10">
        <div
          className={`
            inline-flex items-center justify-center w-16 h-16 mb-6
            shadow-glow animate-logo-float
            transition-all duration-500 delay-100
            ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"}
          `}
        >
          <img
            src="/logo.png"
            alt="Posty Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <h1
          className={`
            text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight
            transition-all duration-500 delay-200
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          `}
        >
          Bon retour !
        </h1>
        <p
          className={`
            text-text-secondary text-sm
            transition-all duration-500 delay-300
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          `}
        >
          Connectez-vous pour accéder à vos posts
        </p>
      </div>

      {/* Success state */}
      {showSuccess && (
        <div className="mb-6 p-3 bg-accent/10 border border-accent/30 rounded-lg text-accent text-sm flex items-center gap-2 animate-fade-in" role="status">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Connexion réussie ! Redirection...</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 px-3 py-2.5 bg-error/10 border border-error/20 rounded-lg text-error text-xs flex items-center gap-2 animate-fade-in" role="alert">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Email Form */}
      <form
        id="login-form"
        onSubmit={handleSubmit}
        className={`
          space-y-6
          transition-all duration-500 delay-600
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        {/* Email field */}
        <div className={getInputWrapperClass("email")}>
          <MailIcon className={getIconClass("email")} />
          <input
            ref={emailRef}
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
            required
            autoComplete="email"
            className={inputBaseClass}
          />
          {focusedField === "email" && (
            <div className="absolute inset-0 rounded-lg bg-primary/5 pointer-events-none animate-fade-in" />
          )}
        </div>

        {/* Password field */}
        <div>
          <div className={getInputWrapperClass("password")}>
            <LockIcon className={getIconClass("password")} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              required
              autoComplete="current-password"
              className={`${inputBaseClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-white transition-colors z-10"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
            {focusedField === "password" && (
              <div className="absolute inset-0 rounded-lg bg-primary/5 pointer-events-none animate-fade-in" />
            )}
          </div>

          {/* Forgot password link */}
          <div className="mt-3 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-text-muted hover:text-primary transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </div>

        {/* CTA Button */}
        <button
          type="submit"
          disabled={isLoading || showSuccess}
          className="
            relative w-full py-3.5 rounded-lg font-semibold text-sm text-white
            bg-gradient-to-r from-primary to-primary-light
            shadow-lg shadow-primary/25
            hover:shadow-xl hover:shadow-primary/40
            active:scale-[0.98]
            transition-all duration-300
            disabled:opacity-50 disabled:cursor-not-allowed
            overflow-hidden
            group
          "
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />

          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <LoaderIcon className="w-4 h-4" />
              Chargement...
            </span>
          ) : (
            <span className="relative">Se connecter</span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div
        className={`
          relative my-6
          transition-all duration-500 delay-500
          ${isVisible ? "opacity-100" : "opacity-0"}
        `}
      >
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.08]"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-background text-text-muted">ou continuer avec</span>
        </div>
      </div>

      {/* Google Sign In */}
      <div
        className={`
          transition-all duration-500 delay-600
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        <GoogleButton onSuccess={onSuccess} label="Se connecter avec Google" />
      </div>

      {/* Sign up link */}
      <p
        className={`
          mt-6 text-center text-text-secondary text-sm
          transition-all duration-500 delay-700
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        Pas encore de compte ?{" "}
        <Link
          href="/signup"
          className="text-primary hover:text-primary-light font-medium transition-colors"
        >
          Créer un compte
        </Link>
      </p>

      {/* Security badge */}
      <div
        className={`
          mt-6 flex items-center justify-center gap-1.5 text-xs text-text-muted
          transition-all duration-500 delay-800
          ${isVisible ? "opacity-100" : "opacity-0"}
        `}
      >
        <LockIcon className="w-3.5 h-3.5" />
        <span>Connexion sécurisée SSL</span>
      </div>
    </div>
  );
}
