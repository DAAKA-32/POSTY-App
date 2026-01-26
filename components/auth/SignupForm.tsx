"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import GoogleButton from "./GoogleButton";

interface SignupFormProps {
  onSuccess?: () => void;
}

// Password strength calculation with detailed criteria
function getPasswordStrength(password: string): {
  width: string;
  color: string;
  label: string;
  score: number;
} {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { width: "w-1/5", color: "bg-error", label: "Très faible", score };
  if (score === 2) return { width: "w-2/5", color: "bg-error", label: "Faible", score };
  if (score === 3) return { width: "w-3/5", color: "bg-warning", label: "Moyen", score };
  if (score === 4) return { width: "w-4/5", color: "bg-accent", label: "Bon", score };
  return { width: "w-full", color: "bg-accent", label: "Excellent", score };
}

// Password criteria check
function getPasswordCriteria(password: string) {
  return [
    { met: password.length >= 8, label: "8 caractères minimum" },
    { met: /[A-Z]/.test(password), label: "Une majuscule" },
    { met: /[0-9]/.test(password), label: "Un chiffre" },
    { met: /[^A-Za-z0-9]/.test(password), label: "Un caractere special" },
  ];
}

// Animated gradient orbs component
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

// Social proof badge component
const SocialProofBadge = () => (
  <div className="flex items-center justify-center gap-2 mb-4 animate-fade-in">
    <div className="flex -space-x-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 border-2 border-background flex items-center justify-center"
        >
          <span className="text-[8px] text-white font-medium">
            {String.fromCharCode(64 + i)}
          </span>
        </div>
      ))}
    </div>
    <span className="text-xs text-text-muted">
      <span className="text-accent font-medium">2,847+</span> utilisateurs cette semaine
    </span>
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

const UserIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const { signUpWithEmail } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordCriteria = useMemo(() => getPasswordCriteria(password), [password]);

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
      setError("Le mot de passe doit contenir au moins 6 caractères");
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
      setError("Erreur lors de la création du compte. Cet email est peut-être déjà utilisé.");
      // Shake animation on error
      const form = document.getElementById("signup-form");
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
        transition-all duration-500 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
      `}
    >
      {/* Animated gradient orbs */}
      <GradientOrbs />

      {/* Header with animation */}
      <div className="text-center mb-8">
        <div
          className={`
            inline-flex items-center justify-center w-16 h-16 mb-6
            rounded-xl overflow-hidden
            shadow-glow animate-logo-float
            transition-all duration-500 delay-100
            ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"}
          `}
        >
          <img
            src="/logo.jpg"
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
          Créer un compte
        </h1>
        <p
          className={`
            text-text-secondary text-sm
            transition-all duration-500 delay-300
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          `}
        >
          Rejoignez POSTY et créez des posts percutants
        </p>
      </div>

      {/* Social proof badge */}
      <SocialProofBadge />

      {/* Success state */}
      {showSuccess && (
        <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-lg text-accent text-sm flex items-center gap-2 animate-fade-in" role="status">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Compte créé ! Redirection...</span>
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

      {/* Signup Form */}
      <form
        id="signup-form"
        onSubmit={handleSubmit}
        className={`
          space-y-5
          transition-all duration-500 delay-300
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        {/* Name field */}
        <div className={getInputWrapperClass("name")}>
          <UserIcon className={getIconClass("name")} />
          <input
            ref={nameRef}
            type="text"
            placeholder="Votre nom"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onFocus={() => setFocusedField("name")}
            onBlur={() => setFocusedField(null)}
            required
            autoComplete="name"
            className={inputBaseClass}
          />
          {focusedField === "name" && (
            <div className="absolute inset-0 rounded-lg bg-primary/5 pointer-events-none animate-fade-in" />
          )}
        </div>

        {/* Email field */}
        <div className={getInputWrapperClass("email")}>
          <MailIcon className={getIconClass("email")} />
          <input
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
              autoComplete="new-password"
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

          {/* Enhanced password strength indicator */}
          {password.length > 0 && (
            <div className="mt-3.5 space-y-2 animate-fade-in">
              {/* Strength bar with gradient */}
              <div className="h-1.5 rounded-full bg-dark-border overflow-hidden">
                <div
                  className={`h-full ${passwordStrength.width} ${passwordStrength.color} transition-all duration-500 ease-out`}
                  style={{
                    boxShadow: passwordStrength.score >= 4 ? "0 0 8px rgba(248, 87, 81, 0.5)" : "none"
                  }}
                />
              </div>

              {/* Strength label */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted">Force du mot de passe:</span>
                <span className={`text-[10px] font-medium ${
                  passwordStrength.color === "bg-error" ? "text-error" :
                  passwordStrength.color === "bg-warning" ? "text-warning" : "text-accent"
                }`}>
                  {passwordStrength.label}
                </span>
              </div>

              {/* Detailed criteria checklist */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
                {passwordCriteria.map((criterion, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-1.5 text-[10px] transition-all duration-300 ${
                      criterion.met ? "text-accent" : "text-text-muted"
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full flex items-center justify-center transition-all duration-300 ${
                      criterion.met ? "bg-accent/20" : "bg-dark-border"
                    }`}>
                      {criterion.met ? (
                        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className="w-1 h-1 rounded-full bg-text-muted" />
                      )}
                    </div>
                    <span>{criterion.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RGPD Consent Checkbox */}
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="sr-only peer"
            />
            <div
              className={`
                w-4 h-4 rounded border transition-all duration-200
                ${acceptTerms
                  ? "bg-primary border-primary"
                  : "border-white/20 group-hover:border-white/40"
                }
              `}
            >
              {acceptTerms && (
                <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-[11px] text-text-muted leading-relaxed">
            J&apos;accepte les{" "}
            <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              conditions d&apos;utilisation
            </a>{" "}
            et la{" "}
            <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              politique de confidentialite
            </a>
          </span>
        </label>

        {/* CTA Button */}
        <button
          type="submit"
          disabled={isLoading || showSuccess || !acceptTerms}
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
            <span className="relative">Créer mon compte</span>
          )}
        </button>

        {/* RGPD notice */}
        <p className="text-[10px] text-text-muted text-center leading-relaxed">
          Vos données sont traitées conformément au RGPD.{" "}
          <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            En savoir plus
          </a>
        </p>
      </form>

      {/* Divider */}
      <div
        className={`
          relative my-6
          transition-all duration-500 delay-200
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

      {/* Google Sign Up */}
      <div
        className={`
          transition-all duration-500 delay-300
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        <GoogleButton onSuccess={onSuccess} label="S'inscrire avec Google" />
      </div>

      {/* Login link */}
      <p
        className={`
          mt-6 text-center text-text-secondary text-sm
          transition-all duration-500 delay-300
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        Déjà un compte ?{" "}
        <Link
          href="/login"
          className="text-primary hover:text-primary-light font-medium transition-colors"
        >
          Se connecter
        </Link>
      </p>

      {/* Security badge */}
      <div
        className={`
          mt-6 flex items-center justify-center gap-1.5 text-xs text-text-muted
          transition-all duration-500 delay-300
          ${isVisible ? "opacity-100" : "opacity-0"}
        `}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>Données chiffrées & sécurisées</span>
      </div>
    </div>
  );
}
