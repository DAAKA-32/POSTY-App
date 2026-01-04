"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import GoogleButton from "./GoogleButton";

type AuthMode = "login" | "signup";

interface AuthPanelProps {
  initialMode?: AuthMode;
  onSuccess?: () => void;
}

// Password strength calculation
function getPasswordStrength(password: string): {
  width: number;
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

  if (score <= 1) return { width: 20, color: "#EF4444", label: "Tres faible", score };
  if (score === 2) return { width: 40, color: "#EF4444", label: "Faible", score };
  if (score === 3) return { width: 60, color: "#F59E0B", label: "Moyen", score };
  if (score === 4) return { width: 80, color: "#00D1C1", label: "Bon", score };
  return { width: 100, color: "#00D1C1", label: "Excellent", score };
}

// Password criteria check
function getPasswordCriteria(password: string) {
  return [
    { met: password.length >= 8, label: "8 caracteres minimum" },
    { met: /[A-Z]/.test(password), label: "Une majuscule" },
    { met: /[0-9]/.test(password), label: "Un chiffre" },
    { met: /[^A-Za-z0-9]/.test(password), label: "Un caractere special" },
  ];
}

// Icons
const MailIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const UserIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EyeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

const SparklesIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

// Premium animated background
const PremiumBackground = ({ prefersReducedMotion }: { prefersReducedMotion: boolean }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
    {/* Primary gradient orb */}
    <motion.div
      className="absolute w-[600px] h-[600px] rounded-full blur-[150px] opacity-20"
      style={{
        background: "radial-gradient(circle, rgba(47, 128, 237, 0.7) 0%, transparent 70%)",
        top: "-30%",
        left: "-20%",
      }}
      animate={prefersReducedMotion ? {} : {
        scale: [1, 1.1, 1],
        opacity: [0.15, 0.25, 0.15],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
    {/* Accent gradient orb */}
    <motion.div
      className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-15"
      style={{
        background: "radial-gradient(circle, rgba(0, 209, 193, 0.6) 0%, transparent 70%)",
        bottom: "-25%",
        right: "-15%",
      }}
      animate={prefersReducedMotion ? {} : {
        scale: [1, 1.15, 1],
        opacity: [0.12, 0.22, 0.12],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 2,
      }}
    />
    {/* Subtle grid pattern */}
    <div
      className="absolute inset-0 opacity-[0.015]"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: "64px 64px",
      }}
    />
  </div>
);

// Social proof component
const SocialProof = ({ prefersReducedMotion }: { prefersReducedMotion: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: 0.2 }}
    className="flex items-center justify-center gap-3 mb-6"
  >
    <div className="flex -space-x-2">
      {[
        "from-blue-500 to-blue-600",
        "from-purple-500 to-purple-600",
        "from-emerald-500 to-emerald-600",
        "from-orange-500 to-orange-600",
      ].map((gradient, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.3,
            delay: prefersReducedMotion ? 0 : 0.3 + i * 0.1,
            type: "spring",
            stiffness: 200,
          }}
          className={`w-7 h-7 rounded-full bg-gradient-to-br ${gradient} border-2 border-dark-bg flex items-center justify-center shadow-lg`}
        >
          <span className="text-[9px] text-white font-semibold">
            {String.fromCharCode(65 + i)}
          </span>
        </motion.div>
      ))}
    </div>
    <div className="flex flex-col">
      <span className="text-xs font-medium text-white">
        <span className="text-accent">2,847+</span> utilisateurs
      </span>
      <span className="text-[10px] text-text-muted">cette semaine</span>
    </div>
  </motion.div>
);

// Premium input component
interface PremiumInputProps {
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  autoComplete?: string;
  required?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  rightElement?: React.ReactNode;
  prefersReducedMotion: boolean;
}

const PremiumInput = ({
  type,
  placeholder,
  value,
  onChange,
  icon,
  isFocused,
  onFocus,
  onBlur,
  autoComplete,
  required,
  inputRef,
  rightElement,
  prefersReducedMotion,
}: PremiumInputProps) => (
  <motion.div
    className="relative"
    animate={{
      scale: prefersReducedMotion ? 1 : isFocused ? 1.01 : 1,
    }}
    transition={{ duration: 0.2 }}
  >
    {/* Focus ring */}
    <AnimatePresence>
      {isFocused && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-xl blur-sm"
        />
      )}
    </AnimatePresence>

    <div className="relative flex items-center">
      {/* Icon */}
      <motion.div
        className="absolute left-3.5 flex items-center justify-center w-5 h-5 z-10"
        animate={{
          color: isFocused ? "rgb(47, 128, 237)" : "rgb(107, 114, 128)",
          scale: prefersReducedMotion ? 1 : isFocused ? 1.1 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.div>

      {/* Input */}
      <input
        ref={inputRef}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        autoComplete={autoComplete}
        required={required}
        className={`
          relative w-full pl-11 py-3.5
          bg-white/[0.03] border rounded-xl
          text-sm text-white placeholder:text-text-muted/70
          focus:outline-none focus:bg-white/[0.05]
          transition-colors duration-300
          ${rightElement ? "pr-12" : "pr-4"}
          ${isFocused ? "border-primary/50" : "border-white/[0.08] hover:border-white/[0.15]"}
        `}
      />

      {/* Right element (e.g., show/hide password) */}
      {rightElement && (
        <div className="absolute right-3 flex items-center justify-center z-10">
          {rightElement}
        </div>
      )}
    </div>
  </motion.div>
);

// Premium checkbox component
const PremiumCheckbox = ({
  checked,
  onChange,
  children,
  prefersReducedMotion,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  prefersReducedMotion: boolean;
}) => (
  <label className="flex items-start gap-3 cursor-pointer group">
    <div className="relative mt-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <motion.div
        className={`
          w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center
          transition-colors duration-200
          ${checked
            ? "bg-primary border-primary"
            : "border-white/20 group-hover:border-white/40"
          }
        `}
        whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
      >
        <AnimatePresence>
          {checked && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
            >
              <CheckIcon className="w-3 h-3 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
    <span className="text-xs text-text-muted leading-relaxed group-hover:text-text-secondary transition-colors">
      {children}
    </span>
  </label>
);

// Main AuthPanel component
export default function AuthPanel({ initialMode = "login", onSuccess }: AuthPanelProps) {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordCriteria = useMemo(() => getPasswordCriteria(password), [password]);

  // Reset form on mode change
  useEffect(() => {
    setError("");
    setShowSuccess(false);
  }, [mode]);

  // Focus management
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mode === "signup") {
        nameRef.current?.focus();
      } else {
        emailRef.current?.focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Le mot de passe doit contenir au moins 6 caracteres");
        return;
      }
      if (!acceptTerms) {
        setError("Veuillez accepter les conditions d'utilisation");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName);
      }
      setShowSuccess(true);
      setTimeout(() => onSuccess?.(), 500);
    } catch {
      // Error is handled by AuthContext toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setDisplayName("");
    setEmail("");
    setPassword("");
    setAcceptTerms(false);
    setShowPassword(false);
    setError("");
  };

  return (
    <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-[380px] mx-auto px-4 sm:px-6 lg:px-0 py-8 lg:py-0">
      {/* Premium background - Desktop only */}
      <div className="hidden lg:block">
        <PremiumBackground prefersReducedMotion={prefersReducedMotion} />
      </div>

      {/* Logo - Mobile only */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
        className="flex justify-center mb-8 lg:hidden"
      >
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/25 overflow-hidden">
            <img
              src="/logo.png"
              alt="POSTY"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (sibling) sibling.style.display = "flex";
              }}
            />
            <span className="text-white font-bold text-2xl hidden items-center justify-center">P</span>
          </div>
          <motion.div
            className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-2xl -z-10"
            animate={prefersReducedMotion ? {} : {
              opacity: [0.3, 0.5, 0.3],
              scale: [0.95, 1.05, 0.95],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: 0.1 }}
        className="text-center mb-6"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
          {mode === "login" ? "Bon retour" : "Creer un compte"}
        </h1>
        <p className="text-text-secondary text-sm">
          {mode === "login"
            ? "Connectez-vous pour acceder a votre espace"
            : "Rejoignez POSTY et boostez votre LinkedIn"}
        </p>
      </motion.div>

      {/* Social proof - Signup only */}
      {mode === "signup" && <SocialProof prefersReducedMotion={prefersReducedMotion} />}

      {/* Form */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
        >
          {/* Success message */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-4 p-4 bg-accent/10 border border-accent/30 rounded-xl flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <CheckIcon className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-accent text-sm font-medium">
                    {mode === "login" ? "Connexion reussie !" : "Compte cree avec succes !"}
                  </p>
                  <p className="text-accent/70 text-xs">Redirection en cours...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-error/20 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-error text-xs">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field - Signup only */}
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
              >
                <PremiumInput
                  type="text"
                  placeholder="Votre nom"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  icon={<UserIcon className="w-4 h-4" />}
                  isFocused={focusedField === "name"}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="name"
                  required
                  inputRef={nameRef}
                  prefersReducedMotion={prefersReducedMotion}
                />
              </motion.div>
            )}

            {/* Email field */}
            <PremiumInput
              type="email"
              placeholder="Adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<MailIcon className="w-4 h-4" />}
              isFocused={focusedField === "email"}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              autoComplete="email"
              required
              inputRef={emailRef}
              prefersReducedMotion={prefersReducedMotion}
            />

            {/* Password field */}
            <div className="space-y-3">
              <PremiumInput
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<LockIcon className="w-4 h-4" />}
                isFocused={focusedField === "password"}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                prefersReducedMotion={prefersReducedMotion}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
              />

              {/* Password strength - Signup only */}
              <AnimatePresence>
                {mode === "signup" && password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                    className="space-y-3 pt-1"
                  >
                    {/* Strength bar */}
                    <div className="space-y-1.5">
                      <div className="h-1.5 rounded-full bg-dark-border overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: passwordStrength.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${passwordStrength.width}%` }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-muted">Force:</span>
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: passwordStrength.color }}
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                    </div>

                    {/* Criteria checklist */}
                    <div className="grid grid-cols-2 gap-2">
                      {passwordCriteria.map((criterion, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: prefersReducedMotion ? 0 : index * 0.05 }}
                          className={`flex items-center gap-2 text-[10px] ${
                            criterion.met ? "text-accent" : "text-text-muted"
                          }`}
                        >
                          <motion.div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                              criterion.met ? "bg-accent/20" : "bg-dark-border"
                            }`}
                            animate={{ scale: criterion.met ? [1, 1.2, 1] : 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            {criterion.met ? (
                              <CheckIcon className="w-2 h-2" />
                            ) : (
                              <div className="w-1 h-1 rounded-full bg-text-muted" />
                            )}
                          </motion.div>
                          <span>{criterion.label}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Remember me / Forgot password - Login only */}
              {mode === "login" && (
                <div className="flex items-center justify-between pt-1">
                  <PremiumCheckbox
                    checked={rememberMe}
                    onChange={setRememberMe}
                    prefersReducedMotion={prefersReducedMotion}
                  >
                    Se souvenir de moi
                  </PremiumCheckbox>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-text-muted hover:text-primary transition-colors"
                  >
                    Mot de passe oublie ?
                  </Link>
                </div>
              )}
            </div>

            {/* Terms checkbox - Signup only */}
            {mode === "signup" && (
              <PremiumCheckbox
                checked={acceptTerms}
                onChange={setAcceptTerms}
                prefersReducedMotion={prefersReducedMotion}
              >
                J&apos;accepte les{" "}
                <Link href="/legal/terms" className="text-primary hover:underline">CGU</Link>
                {" "}et la{" "}
                <Link href="/legal/privacy" className="text-primary hover:underline">politique de confidentialite</Link>
              </PremiumCheckbox>
            )}

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={isLoading || showSuccess || (mode === "signup" && !acceptTerms)}
              className="
                relative w-full py-4 rounded-xl font-semibold text-sm text-white
                bg-gradient-to-r from-primary via-primary-light to-primary
                bg-[length:200%_100%]
                shadow-lg shadow-primary/30
                disabled:opacity-50 disabled:cursor-not-allowed
                overflow-hidden group
              "
              whileHover={prefersReducedMotion ? {} : {
                scale: 1.02,
                backgroundPosition: "100% 0",
              }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "easeInOut",
                }}
              />

              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                  Chargement...
                </span>
              ) : (
                <span className="relative flex items-center justify-center gap-2">
                  {mode === "signup" && <SparklesIcon className="w-4 h-4" />}
                  {mode === "login" ? "Se connecter" : "Creer mon compte"}
                </span>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-dark-bg text-text-muted text-xs">ou continuer avec</span>
            </div>
          </div>

          {/* Google Button */}
          <GoogleButton
            onSuccess={onSuccess}
            label={mode === "login" ? "Se connecter avec Google" : "S'inscrire avec Google"}
          />

          {/* Toggle mode */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-text-secondary text-sm"
          >
            {mode === "login" ? "Pas encore de compte ? " : "Deja un compte ? "}
            <button
              type="button"
              onClick={() => handleModeSwitch(mode === "login" ? "signup" : "login")}
              className="text-primary hover:text-primary-light font-semibold transition-colors"
            >
              {mode === "login" ? "S'inscrire gratuitement" : "Se connecter"}
            </button>
          </motion.p>

          {/* Security badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 flex items-center justify-center gap-2 text-text-muted"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.02] rounded-full border border-white/[0.05]">
              <LockIcon className="w-3 h-3" />
              <span className="text-[10px]">Connexion securisee SSL</span>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
