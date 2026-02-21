"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import GoogleButton from "./GoogleButton";

type AuthMode = "login" | "signup";

interface AuthPanelProps {
  initialMode?: AuthMode;
  onSuccess?: () => void;
}

// Password strength calculation
type PasswordStrengthKey = "veryWeak" | "weak" | "medium" | "good" | "excellent";

function getPasswordStrength(password: string): {
  width: number;
  color: string;
  labelKey: PasswordStrengthKey;
  score: number;
} {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Warm color palette: Red -> Orange -> Salmon -> Coral (good/excellent)
  if (score <= 1) return { width: 20, color: "#EF4444", labelKey: "veryWeak", score };
  if (score === 2) return { width: 40, color: "#EF4444", labelKey: "weak", score };
  if (score === 3) return { width: 60, color: "#F8A35D", labelKey: "medium", score }; // warm-orange logo
  if (score === 4) return { width: 80, color: "#10B981", labelKey: "good", score }; // green for good
  return { width: 100, color: "#10B981", labelKey: "excellent", score }; // green for excellent
}

// Password criteria check
type PasswordCriteriaKey = "minChars" | "uppercase" | "number" | "special";

function getPasswordCriteria(password: string): { met: boolean; labelKey: PasswordCriteriaKey }[] {
  return [
    { met: password.length >= 8, labelKey: "minChars" },
    { met: /[A-Z]/.test(password), labelKey: "uppercase" },
    { met: /[0-9]/.test(password), labelKey: "number" },
    { met: /[^A-Za-z0-9]/.test(password), labelKey: "special" },
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

// Premium animated background removed - using page's global background for seamless integration

// Social proof component - Premium light mode styling
const SocialProof = ({ prefersReducedMotion, usersText, thisWeekText }: { prefersReducedMotion: boolean; usersText: string; thisWeekText: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: 0.2 }}
    className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-warm-orange/5 via-transparent to-warm-coral/5 rounded-xl sm:rounded-2xl border border-warm-orange/10"
  >
    {/* Real user avatars — social proof */}
    <div className="flex -space-x-2 sm:-space-x-2.5">
      {[
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
      ].map((src, i) => (
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
          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-md overflow-hidden"
        >
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </motion.div>
      ))}
    </div>
    <div className="flex flex-col">
      <span className="text-[11px] sm:text-sm font-semibold text-gray-800">
        <span className="text-warm-orange">2,847+</span> {usersText}
      </span>
      <span className="text-[9px] sm:text-xs text-gray-500">{thisWeekText}</span>
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
    {/* Focus ring - Warm Orange/Coral gradient */}
    <AnimatePresence>
      {isFocused && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          className="absolute -inset-0.5 bg-gradient-to-r from-warm-orange/20 to-warm-coral/20 rounded-xl blur-sm"
        />
      )}
    </AnimatePresence>

    <div className="relative flex items-center">
      {/* Icon - Warm orange when focused */}
      <motion.div
        className="absolute left-3 sm:left-3.5 flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 z-10"
        animate={{
          color: isFocused ? "rgb(249, 115, 22)" : "rgb(156, 163, 175)",
          scale: prefersReducedMotion ? 1 : isFocused ? 1.1 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.div>

      {/* Input - Light mode styling */}
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
          relative w-full pl-10 sm:pl-11 py-3.5 sm:py-4
          bg-white border rounded-lg sm:rounded-xl
          text-sm text-gray-900 placeholder:text-gray-400
          focus:outline-none focus:bg-white
          transition-all duration-300
          shadow-sm
          ${rightElement ? "pr-11 sm:pr-12" : "pr-4"}
          ${isFocused ? "border-warm-orange ring-2 ring-warm-orange/20" : "border-gray-200 hover:border-gray-300"}
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

// Premium checkbox component - Light mode compatible
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
            ? "bg-warm-orange border-warm-orange"
            : "border-gray-300 group-hover:border-warm-orange/50"
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
    <span className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">
      {children}
    </span>
  </label>
);

// Main AuthPanel component
export default function AuthPanel({ initialMode = "login", onSuccess }: AuthPanelProps) {
  const { signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showConsentReminder, setShowConsentReminder] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState(""); // Separate error state for modal

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

  // Block scroll when input is focused on mobile/tablet
  // This prevents accidental scrolling while typing
  const touchStartY = useRef<number | null>(null);

  const preventScrollOnFocus = useCallback((e: TouchEvent) => {
    // Only block when an input field is focused
    if (!focusedField) return;

    // Allow scrolling inside scrollable containers
    const target = e.target as HTMLElement;
    if (target.closest('.overflow-y-auto, .overflow-auto, [data-allow-scroll]')) {
      return;
    }

    // Prevent scroll
    e.preventDefault();
  }, [focusedField]);

  const handleTouchStartForScroll = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  useEffect(() => {
    // Only add listeners when a field is focused AND on mobile/touch devices
    // Desktop with mouse/trackpad should NOT have scroll blocked during input focus
    const isDesktopWithMouse = window.matchMedia("(pointer: fine) and (hover: hover)").matches;

    if (!focusedField || isDesktopWithMouse) {
      // Cleanup styles when no field is focused or on desktop
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.touchAction = "";
      // Note: Don't manipulate body.style.overflow - let CSS handle it
      return;
    }

    // Mobile/touch only: Block scroll when input is focused (prevents iOS keyboard issues)
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.touchAction = "none";

    // Add touch listeners to prevent scroll gestures
    document.addEventListener("touchstart", handleTouchStartForScroll, { passive: true });
    document.addEventListener("touchmove", preventScrollOnFocus, { passive: false });

    return () => {
      document.removeEventListener("touchstart", handleTouchStartForScroll);
      document.removeEventListener("touchmove", preventScrollOnFocus);
      // Restore on cleanup
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.touchAction = "";
      touchStartY.current = null;
    };
  }, [focusedField, preventScrollOnFocus, handleTouchStartForScroll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (password.length < 6) {
        setError(t.auth.passwordMinLength);
        return;
      }
      if (!acceptTerms) {
        setShowConsentReminder(true);
        setTimeout(() => setShowConsentReminder(false), 3000);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "La connexion n'a pas abouti. Veuillez réessayer.");
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
    setShowConsentReminder(false);
    setShowPassword(false);
    setError("");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail.trim()) return;

    setForgotPasswordError(""); // Clear previous error
    setForgotPasswordLoading(true);
    try {
      await resetPassword(forgotPasswordEmail.trim());
      setForgotPasswordSuccess(true);
    } catch (err) {
      setForgotPasswordError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail("");
    setForgotPasswordSuccess(false);
    setForgotPasswordError(""); // Clear modal error, not main form error
  };

  return (
    <div className="relative w-full max-w-md sm:max-w-md lg:max-w-[400px] mx-auto px-4 sm:px-6 lg:px-0 py-2 sm:py-4 lg:py-0">
      {/* Logo - Mobile only */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
        className="flex justify-center mb-3 sm:mb-6 lg:hidden"
      >
        <div className="relative">
          <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl overflow-hidden shadow-lg">
            <img
              src="/logo.png"
              alt="Posty Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <motion.div
            className="absolute -inset-3 bg-gradient-to-br from-warm-orange/15 to-warm-coral/15 rounded-xl blur-xl -z-10"
            animate={prefersReducedMotion ? {} : {
              opacity: [0.2, 0.35, 0.2],
              scale: [0.95, 1.05, 0.95],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* Header - Premium light mode styling */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: 0.1 }}
        className="text-center mb-4 sm:mb-6"
      >
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-silver-vertical mb-1.5 sm:mb-2 tracking-tight">
          {mode === "login" ? t.auth.welcomeBack : t.auth.createAccount}
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm max-w-[280px] mx-auto leading-relaxed">
          {mode === "login"
            ? t.auth.loginSubtitle
            : t.auth.signupSubtitle}
        </p>
      </motion.div>

      {/* Social proof - Signup only */}
      {mode === "signup" && <SocialProof prefersReducedMotion={prefersReducedMotion} usersText={t.auth.users} thisWeekText={t.auth.thisWeek} />}

      {/* Form */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
        >
          {/* Success message - Instant display, no progressive expansion */}
          <AnimatePresence mode="wait">
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mb-4 p-4 bg-success/10 border border-success/30 rounded-xl flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckIcon className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-success text-sm font-medium">
                    {mode === "login" ? t.auth.loginSuccess : t.auth.accountCreated}
                  </p>
                  <p className="text-success/70 text-xs">{t.auth.redirecting}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message - Instant display, no progressive expansion */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-error/20 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
                  </svg>
                </div>
                <p className="text-error text-xs">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {/* Name field - Signup only */}
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
              >
                <PremiumInput
                  type="text"
                  placeholder={t.auth.yourName}
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); setError(""); }}
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
              placeholder={t.auth.emailAddress}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
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
                placeholder={t.auth.password}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
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
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
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
                      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: passwordStrength.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${passwordStrength.width}%` }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">{t.auth.strength}:</span>
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: passwordStrength.color }}
                        >
                          {t.auth.passwordStrength[passwordStrength.labelKey]}
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
                            criterion.met ? "text-emerald-600" : "text-gray-500"
                          }`}
                        >
                          <motion.div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                              criterion.met ? "bg-emerald-100" : "bg-gray-200"
                            }`}
                            animate={{ scale: criterion.met ? [1, 1.2, 1] : 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            {criterion.met ? (
                              <CheckIcon className="w-2 h-2" />
                            ) : (
                              <div className="w-1 h-1 rounded-full bg-gray-400" />
                            )}
                          </motion.div>
                          <span>{t.auth.passwordCriteria[criterion.labelKey]}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Forgot password - Login only */}
              {mode === "login" && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-gray-500 hover:text-warm-orange transition-colors"
                  >
                    {t.auth.forgotPassword}
                  </button>
                </div>
              )}
            </div>

            {/* Unified consent checkbox - Signup only */}
            {mode === "signup" && (
              <div>
                <motion.div
                  animate={showConsentReminder && !acceptTerms ? {
                    x: [0, -4, 4, -3, 3, 0],
                  } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <PremiumCheckbox
                    checked={acceptTerms}
                    onChange={(checked) => { setAcceptTerms(checked); if (checked) setShowConsentReminder(false); }}
                    prefersReducedMotion={prefersReducedMotion}
                  >
                    {t.auth.acceptTermsText}{" "}
                    <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-warm-orange hover:underline">{t.common.terms}</a>
                    {" "}{t.auth.andThe}{" "}
                    <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-warm-orange hover:underline">{t.auth.privacyPolicyText}</a>
                    {" "}et je confirme avoir au moins 18 ans
                  </PremiumCheckbox>
                </motion.div>
                <AnimatePresence>
                  {showConsentReminder && !acceptTerms && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="mt-1.5 ml-[30px] text-[11px] text-warm-coral"
                    >
                      Veuillez accepter pour continuer
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Submit button - Premium Warm Orange/Coral Gradient */}
            <motion.button
              type="submit"
              disabled={isLoading || showSuccess || (mode === "signup" && !acceptTerms)}
              className="
                relative w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base text-white
                bg-gradient-to-r from-warm-orange via-warm-coral to-warm-orange
                bg-[length:200%_100%]
                shadow-lg shadow-warm-orange/25
                hover:shadow-xl hover:shadow-warm-orange/30
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg
                overflow-hidden group
                transition-shadow duration-300
              "
              whileHover={prefersReducedMotion ? {} : {
                scale: 1.01,
                backgroundPosition: "100% 0",
              }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
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
                    className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                  <span className="text-white/90">{t.common.loading}</span>
                </span>
              ) : (
                <span className="relative flex items-center justify-center gap-2">
                  {mode === "signup" && <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                  {mode === "login" ? t.auth.signIn : t.auth.createMyAccount}
                </span>
              )}
            </motion.button>
          </form>

          {/* Divider - Premium seamless styling without background */}
          <div className="flex items-center gap-3 sm:gap-4 my-5 sm:my-7">
            <div className="flex-1 h-px bg-gray-200/80" />
            <span className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider shrink-0">
              {t.auth.orContinueWith}
            </span>
            <div className="flex-1 h-px bg-gray-200/80" />
          </div>

          {/* Google Button */}
          <GoogleButton
            onSuccess={onSuccess}
            onError={(msg) => setError(msg)}
            onStartAuth={() => setError("")}
            label={mode === "login" ? t.auth.signInWithGoogle : t.auth.signUpWithGoogle}
            consentGiven={mode === "signup" ? acceptTerms : undefined}
            onConsentMissing={() => { setShowConsentReminder(true); setTimeout(() => setShowConsentReminder(false), 3000); }}
          />

          {/* Toggle mode - Enhanced visibility for signup */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-5 sm:mt-7"
          >
            {mode === "login" ? (
              <p className="text-center text-gray-500 text-xs sm:text-sm">
                {t.auth.noAccount}{" "}
                <button
                  type="button"
                  onClick={() => handleModeSwitch("signup")}
                  className="text-warm-orange hover:text-warm-coral font-semibold transition-colors underline-offset-2 hover:underline"
                >
                  {t.auth.signUpFree}
                </button>
              </p>
            ) : (
              <p className="text-center text-gray-500 text-xs sm:text-sm">
                {t.auth.haveAccount}{" "}
                <button
                  type="button"
                  onClick={() => handleModeSwitch("login")}
                  className="text-warm-orange hover:text-warm-coral font-semibold transition-colors underline-offset-2 hover:underline"
                >
                  {t.auth.signIn}
                </button>
              </p>
            )}
          </motion.div>

        </motion.div>
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={closeForgotPassword}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {forgotPasswordSuccess ? (
                // Success state
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Email envoyé !
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Vérifiez votre boîte mail pour réinitialiser votre mot de passe.
                  </p>
                  <p className="text-xs text-gray-500 italic mb-6">
                    Pensez à vérifier votre dossier spam ou courrier indésirable si vous ne voyez pas l&apos;email.
                  </p>
                  <button
                    onClick={closeForgotPassword}
                    className="w-full py-3 bg-gradient-to-r from-warm-orange to-warm-coral text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Retour à la connexion
                  </button>
                </div>
              ) : (
                // Form state
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Réinitialiser le mot de passe
                    </h3>
                    <button
                      onClick={closeForgotPassword}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 mb-6">
                    Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                  </p>

                  {forgotPasswordError && (
                    <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-error/20 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
                        </svg>
                      </div>
                      <p className="text-error text-xs">{forgotPasswordError}</p>
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => { setForgotPasswordEmail(e.target.value); setForgotPasswordError(""); }}
                        placeholder="votre@email.com"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-warm-orange focus:ring-2 focus:ring-warm-orange/20 transition-all"
                        required
                        autoFocus
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={forgotPasswordLoading || !forgotPasswordEmail.trim()}
                      className="w-full py-3 bg-gradient-to-r from-warm-orange to-warm-coral text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {forgotPasswordLoading ? (
                        <>
                          <motion.div
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          />
                          Envoi en cours...
                        </>
                      ) : (
                        "Envoyer le lien"
                      )}
                    </button>
                  </form>

                  <button
                    onClick={closeForgotPassword}
                    className="w-full mt-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Retour à la connexion
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
