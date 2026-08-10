"use client";

import { useState, useEffect, useRef, useMemo, useId } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useReducedMotion } from "@/hooks/ui/useReducedMotion";
import { useScrollLock } from "@/hooks/ui/useScrollLock";
import { ease, dur } from "@/lib/motion";
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
const MailIcon = ({ className = "w-[18px] h-[18px]" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = ({ className = "w-[18px] h-[18px]" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const UserIcon = ({ className = "w-[18px] h-[18px]" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EyeIcon = ({ className = "w-[18px] h-[18px]" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = ({ className = "w-[18px] h-[18px]" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
  </svg>
);

const ShieldIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 3l7 3v5.5c0 4.28-2.94 8.27-7 9.5-4.06-1.23-7-5.22-7-9.5V6l7-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.2 12.1l1.9 1.9 3.7-3.9" />
  </svg>
);

const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h13m0 0l-5-5m5 5l-5 5" />
  </svg>
);

/**
 * Auth form field — label + iconed input + inline error.
 *
 * Design contract (shared by every field on this surface):
 *  - a real <label htmlFor> above the control (never placeholder-as-label)
 *  - 52px control height → comfortable one-handed tap target on mobile
 *  - 16px text: below that, iOS Safari zooms the page on focus
 *  - focus = warm-orange border + 3px soft ring, no transform (transforms
 *    resample the text and read as jitter on the glass card)
 *  - the error lives directly under its own field and is wired via
 *    aria-describedby / aria-invalid, so screen readers announce it in place
 */
interface AuthFieldProps {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  isFocused: boolean;
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  autoComplete?: string;
  required?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  rightElement?: React.ReactNode;
  /** Right-aligned accessory rendered on the label row (e.g. "Forgot password?"). */
  labelAccessory?: React.ReactNode;
  error?: string;
  prefersReducedMotion: boolean;
}

const AuthField = ({
  id,
  label,
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
  labelAccessory,
  error,
  prefersReducedMotion,
}: AuthFieldProps) => {
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="text-[12.5px] font-medium tracking-[0.01em] text-gray-600"
        >
          {label}
        </label>
        {labelAccessory}
      </div>

      <div className="relative flex items-center">
        <span
          aria-hidden
          className={`
            pointer-events-none absolute left-3.5 z-10 flex items-center justify-center
            transition-colors duration-200
            ${error ? "text-error/80" : isFocused ? "text-warm-orange" : "text-gray-400"}
          `}
        >
          {icon}
        </span>

        <input
          id={id}
          ref={inputRef}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`
            relative h-[52px] w-full rounded-xl pl-11
            border bg-white/80 text-[16px] text-gray-900 placeholder:text-gray-400
            transition-[border-color,box-shadow,background-color] duration-200 ease-out
            focus:outline-none
            ${rightElement ? "pr-14" : "pr-4"}
            ${error
              ? "border-error/55 bg-error/[0.03] shadow-[0_0_0_3px_rgba(239,68,68,0.10)]"
              : isFocused
                ? "border-warm-orange bg-white shadow-[0_0_0_3px_rgba(248,147,93,0.16),0_1px_2px_rgba(15,17,21,0.04)]"
                : "border-gray-200/90 shadow-[0_1px_2px_rgba(15,17,21,0.03)] hover:border-gray-300 hover:bg-white"
            }
          `}
        />

        {rightElement && (
          <div className="absolute right-1 z-10 flex items-center">{rightElement}</div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={errorId}
            role="alert"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: prefersReducedMotion ? 0 : dur.fast, ease: ease.enter }}
            className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-error"
          >
            <AlertIcon className="mt-[1px] h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// Premium checkbox component - Light mode compatible
const PremiumCheckbox = ({
  checked,
  onChange,
  children,
  describedBy,
  prefersReducedMotion,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  describedBy?: string;
  prefersReducedMotion: boolean;
}) => (
  <label className="group flex cursor-pointer items-start gap-3">
    <div className="relative mt-[1px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={describedBy}
        className="peer sr-only"
      />
      <motion.div
        className={`
          flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border-2
          transition-colors duration-200
          peer-focus-visible:ring-2 peer-focus-visible:ring-warm-orange/50 peer-focus-visible:ring-offset-2
          ${checked
            ? "border-warm-orange bg-warm-orange"
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
              <CheckIcon className="h-3 w-3 text-white/100" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
    <span className="text-[12px] leading-relaxed text-gray-600 transition-colors group-hover:text-gray-800">
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
  const uid = useId();

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showConsentReminder, setShowConsentReminder] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  /** Client-side password error — rendered inline under the password field. */
  const [passwordError, setPasswordError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState(""); // Separate error state for modal
  useScrollLock(showForgotPassword);

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordCriteria = useMemo(() => getPasswordCriteria(password), [password]);

  const nameId = `${uid}-name`;
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  const consentId = `${uid}-consent`;
  const resetEmailId = `${uid}-reset-email`;
  const resetTitleId = `${uid}-reset-title`;

  // Reset form on mode change
  useEffect(() => {
    setError("");
    setPasswordError("");
    setShowSuccess(false);
  }, [mode]);

  // Focus management — desktop only. On touch devices an auto-focus pops the
  // software keyboard over the form before the user has decided to type, which
  // hides the card and reads as broken. Pointer-based nav still lands on the
  // first meaningful field.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(pointer: coarse)").matches) return;

    const timer = setTimeout(() => {
      if (mode === "signup") {
        nameRef.current?.focus();
      } else {
        emailRef.current?.focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [mode]);

  // On touch devices the login page scrolls inside its own fixed container, so
  // the browser's native "scroll focused input into view" does not always win
  // against the keyboard animation. Nudge the focused field back into view once
  // the keyboard has started opening.
  const handleFieldFocus = (field: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    setFocusedField(field);
    if (typeof window === "undefined") return;
    if (!window.matchMedia?.("(pointer: coarse)").matches) return;
    const el = e.currentTarget;
    setTimeout(() => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 280);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPasswordError("");

    if (mode === "signup") {
      if (password.length < 6) {
        setPasswordError(t.auth.passwordMinLength);
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
      setError(err instanceof Error ? err.message : t.auth.genericError);
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
    setPasswordError("");
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
      setForgotPasswordError(err instanceof Error ? err.message : t.auth.genericError);
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

  // Escape closes the reset-password dialog (expected of any modal).
  useEffect(() => {
    if (!showForgotPassword) return;
    const onKey = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") closeForgotPassword();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForgotPassword]);

  /**
   * The CTA is only disabled for states the user cannot act on (in flight,
   * already succeeded). Missing consent used to hard-disable it, which left the
   * primary action looking dead with nothing explaining why — and made the
   * `!acceptTerms` branch of handleSubmit unreachable. Now the click lands, the
   * checkbox shakes and the inline reminder appears; submission is still blocked
   * by that same guard, so nothing reaches Firebase without consent.
   */
  const submitDisabled = isLoading || showSuccess;

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-[400px]">
      {/* Logo — shown wherever the desktop split-layout branding panel is not.
          The login page switches to the two-column layout at `md`, so this must
          hide at `md` too, otherwise tablets render the logo twice. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : dur.heavy, ease: ease.enter }}
        className="mb-5 flex justify-center md:hidden"
      >
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-[0_6px_20px_-6px_rgba(248,147,93,0.55)]">
            <img src="/logo.png" alt="Posty" className="h-full w-full object-cover" />
          </div>
          <div
            aria-hidden
            className="absolute -inset-3 -z-10 rounded-3xl bg-gradient-to-br from-warm-orange/25 to-warm-rose/20 blur-xl"
          />
        </div>
      </motion.div>

      {/* Header — fixed min-height so the login/signup crossfade never reflows */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : dur.slow, ease: ease.enter, delay: 0.05 }}
        className="mb-6 min-h-[74px] text-center sm:min-h-[80px]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: prefersReducedMotion ? 0 : dur.fast, ease: ease.enter }}
          >
            <h1 className="text-silver-solid mb-1.5 text-[26px] font-bold leading-tight tracking-[-0.02em] sm:text-[30px]">
              {mode === "login" ? t.auth.welcomeBack : t.auth.createAccount}
            </h1>
            <p className="mx-auto max-w-[300px] text-[13.5px] leading-relaxed text-gray-500">
              {mode === "login" ? t.auth.loginSubtitle : t.auth.signupSubtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Mode-dependent body — one fast directional crossfade, so the fields
          never double-animate (container fade + per-field entry) the way they
          did before. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.16, ease: ease.enter }}
        >
          {/* Success message */}
          <AnimatePresence mode="wait">
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                role="status"
                className="mb-5 flex items-center gap-3 rounded-xl border border-success/25 bg-success/[0.08] p-3.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15">
                  <CheckIcon className="h-4 w-4 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-success">
                    {mode === "login" ? t.auth.loginSuccess : t.auth.accountCreated}
                  </p>
                  <p className="text-[11.5px] text-success/70">{t.auth.redirecting}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Backend / provider error — form-level, above the fields */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.15, ease: ease.enter }}
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-xl border border-error/20 bg-error/[0.07] p-3.5"
              >
                <AlertIcon className="mt-[2px] h-4 w-4 shrink-0 text-error" />
                <p className="text-[12.5px] leading-relaxed text-error">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
            {/* Name field - Signup only */}
            {mode === "signup" && (
              <AuthField
                id={nameId}
                label={t.auth.yourName}
                type="text"
                /* Label already says "Your name" — repeating it as a placeholder
                   is noise, so the field stays clean until focused. */
                placeholder=""
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setError(""); }}
                icon={<UserIcon />}
                isFocused={focusedField === "name"}
                onFocus={handleFieldFocus("name")}
                onBlur={() => setFocusedField(null)}
                autoComplete="name"
                required
                inputRef={nameRef}
                prefersReducedMotion={prefersReducedMotion}
              />
            )}

            {/* Email field */}
            <AuthField
              id={emailId}
              label={t.auth.emailAddress}
              type="email"
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              icon={<MailIcon />}
              isFocused={focusedField === "email"}
              onFocus={handleFieldFocus("email")}
              onBlur={() => setFocusedField(null)}
              autoComplete="email"
              required
              inputRef={emailRef}
              prefersReducedMotion={prefersReducedMotion}
            />

            {/* Password field */}
            <div className="space-y-3">
              <AuthField
                id={passwordId}
                label={t.auth.password}
                type={showPassword ? "text" : "password"}
                /* Language-neutral mask, not a translated "Your password" that
                   just echoes the label. */
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); setPasswordError(""); }}
                icon={<LockIcon />}
                isFocused={focusedField === "password"}
                onFocus={handleFieldFocus("password")}
                onBlur={() => setFocusedField(null)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                error={passwordError || undefined}
                prefersReducedMotion={prefersReducedMotion}
                labelAccessory={
                  mode === "login" ? (
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="rounded text-[12px] text-gray-500 transition-colors hover:text-warm-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-orange/50 focus-visible:ring-offset-2"
                    >
                      {t.auth.forgotPassword}
                    </button>
                  ) : undefined
                }
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                    aria-pressed={showPassword}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100/70 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-orange/50"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={showPassword ? "off" : "on"}
                        initial={{ opacity: 0, scale: 0.86 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.86 }}
                        transition={{ duration: prefersReducedMotion ? 0 : dur.instant, ease: ease.enter }}
                        className="flex items-center justify-center"
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </motion.span>
                    </AnimatePresence>
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
                    transition={{ duration: prefersReducedMotion ? 0 : 0.28, ease: ease.enter }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2.5 pt-1">
                      {/* Strength bar */}
                      <div className="space-y-1.5">
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200/80">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: passwordStrength.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${passwordStrength.width}%` }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] text-gray-500">{t.auth.strength}</span>
                          <span
                            className="text-[10.5px] font-medium"
                            style={{ color: passwordStrength.color }}
                          >
                            {t.auth.passwordStrength[passwordStrength.labelKey]}
                          </span>
                        </div>
                      </div>

                      {/* Criteria checklist — single column on very narrow
                          phones, where two columns force the labels to ellipsis
                          ("8 characters mini…") and lose their meaning. */}
                      <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 min-[380px]:grid-cols-2">
                        {passwordCriteria.map((criterion) => (
                          <div
                            key={criterion.labelKey}
                            className={`flex items-center gap-1.5 text-[10.5px] transition-colors duration-200 ${
                              criterion.met ? "text-emerald-600" : "text-gray-400"
                            }`}
                          >
                            <motion.span
                              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                                criterion.met ? "bg-emerald-100" : "bg-gray-200"
                              }`}
                              animate={{ scale: criterion.met && !prefersReducedMotion ? [1, 1.18, 1] : 1 }}
                              transition={{ duration: 0.22 }}
                            >
                              {criterion.met ? (
                                <CheckIcon className="h-2 w-2" />
                              ) : (
                                <span className="h-1 w-1 rounded-full bg-gray-400" />
                              )}
                            </motion.span>
                            <span className="leading-tight">{t.auth.passwordCriteria[criterion.labelKey]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Unified consent checkbox - Signup only */}
            {mode === "signup" && (
              <div className="pt-1">
                <motion.div
                  animate={showConsentReminder && !acceptTerms && !prefersReducedMotion ? {
                    x: [0, -4, 4, -3, 3, 0],
                  } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <PremiumCheckbox
                    checked={acceptTerms}
                    onChange={(checked) => { setAcceptTerms(checked); if (checked) setShowConsentReminder(false); }}
                    describedBy={consentId}
                    prefersReducedMotion={prefersReducedMotion}
                  >
                    {t.auth.acceptTermsText}{" "}
                    <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-warm-orange hover:underline">{t.common.terms}</a>
                    {" "}{t.auth.andThe}{" "}
                    <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-warm-orange hover:underline">{t.auth.privacyPolicyText}</a>
                  </PremiumCheckbox>
                </motion.div>

                <p id={consentId} className="mt-2 pl-[30px] text-[11px] leading-relaxed text-gray-400">
                  {t.consent.ageConfirm}
                </p>

                <AnimatePresence>
                  {showConsentReminder && !acceptTerms && (
                    <motion.p
                      role="alert"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: prefersReducedMotion ? 0 : dur.fast, ease: ease.enter }}
                      className="mt-2 flex items-center gap-1.5 pl-[30px] text-[11.5px] text-error"
                    >
                      <AlertIcon className="h-3 w-3 shrink-0" />
                      {t.auth.acceptTermsRequired}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Submit — the one dominant element on the card */}
            <motion.button
              type="submit"
              disabled={submitDisabled}
              aria-busy={isLoading}
              className="
                group relative mt-1 h-[52px] w-full overflow-hidden rounded-xl
                bg-gradient-to-r from-warm-orange to-warm-coral
                text-[15px] font-semibold tracking-[0.01em]
                shadow-[0_1px_2px_rgba(15,17,21,0.06),0_10px_24px_-10px_rgba(248,147,93,0.75)]
                transition-[box-shadow,opacity,filter] duration-200
                hover:shadow-[0_1px_2px_rgba(15,17,21,0.06),0_16px_32px_-12px_rgba(248,147,93,0.9)]
                hover:brightness-[1.03]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-orange/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white
                disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100
              "
              whileTap={prefersReducedMotion || submitDisabled ? {} : { scale: 0.985 }}
              transition={{ duration: 0.12 }}
            >
              {/* Top hairline + vertical gloss — the "polished surface" cue,
                  kept at a whisper so the button still reads as one flat tone. */}
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/45" />
              <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/12 to-transparent" />

              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isLoading ? "loading" : "idle"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : dur.instant }}
                  className="relative flex items-center justify-center gap-2 text-white/100"
                >
                  {isLoading ? (
                    <>
                      <motion.span
                        className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white/100"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                      />
                      {mode === "login" ? t.auth.signingIn : t.auth.creatingAccount}
                    </>
                  ) : (
                    <>
                      {mode === "login" ? t.auth.signIn : t.auth.createMyAccount}
                      <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </form>

          {/* Divider — hairlines fading into the card, not hard rules */}
          <div className="my-6 flex items-center gap-3">
            <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
            <span className="shrink-0 text-[10.5px] font-medium uppercase tracking-[0.14em] text-gray-400">
              {t.auth.orContinueWith}
            </span>
            <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
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

          {/* Toggle mode */}
          <div className="mt-6 text-center">
            <p className="text-[13px] text-gray-500">
              {mode === "login" ? t.auth.noAccount : t.auth.haveAccount}{" "}
              <button
                type="button"
                onClick={() => handleModeSwitch(mode === "login" ? "signup" : "login")}
                className="relative z-10 inline-flex min-h-[32px] cursor-pointer items-center rounded px-0.5 font-semibold text-warm-orange underline-offset-2 transition-colors hover:text-warm-coral hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-orange/50 focus-visible:ring-offset-2"
              >
                {mode === "login" ? t.auth.signUpFree : t.auth.signIn}
              </button>
            </p>
          </div>

          {/* Trust line */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldIcon className="h-3.5 w-3.5" />
            <span>{t.auth.securedSSL}</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Forgot Password Modal - Portal to escape framer-motion transform context */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showForgotPassword && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/45 p-4 backdrop-blur-sm"
              onClick={closeForgotPassword}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 14 }}
                transition={{ duration: prefersReducedMotion ? 0 : dur.base, ease: ease.enter }}
                role="dialog"
                aria-modal="true"
                aria-labelledby={resetTitleId}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_24px_64px_-16px_rgba(15,17,21,0.35)]"
                onClick={(e) => e.stopPropagation()}
              >
                {forgotPasswordSuccess ? (
                  // Success state
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                      <CheckIcon className="h-7 w-7 text-emerald-600" />
                    </div>
                    <h3 id={resetTitleId} className="mb-2 text-lg font-semibold text-gray-900">
                      {t.auth.emailSent}
                    </h3>
                    <p className="mb-3 text-sm text-gray-600">
                      {t.auth.checkInbox}
                    </p>
                    <p className="mb-6 text-xs italic text-gray-500">
                      {t.auth.checkSpam}
                    </p>
                    <button
                      onClick={closeForgotPassword}
                      className="h-12 w-full rounded-xl bg-gradient-to-r from-warm-orange to-warm-coral text-[15px] font-semibold text-white/100 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-orange/60 focus-visible:ring-offset-2"
                    >
                      {t.auth.backToLogin}
                    </button>
                  </div>
                ) : (
                  // Form state
                  <>
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <h3 id={resetTitleId} className="text-lg font-semibold text-gray-900">
                        {t.auth.resetPasswordTitle}
                      </h3>
                      <button
                        onClick={closeForgotPassword}
                        aria-label={t.common.close}
                        className="-mr-1.5 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-orange/50"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
                        </svg>
                      </button>
                    </div>

                    <p className="mb-5 text-sm leading-relaxed text-gray-600">
                      {t.auth.resetPasswordDescription}
                    </p>

                    {forgotPasswordError && (
                      <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl border border-error/20 bg-error/[0.07] p-3">
                        <AlertIcon className="mt-[2px] h-4 w-4 shrink-0 text-error" />
                        <p className="text-[12.5px] leading-relaxed text-error">{forgotPasswordError}</p>
                      </div>
                    )}

                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <label htmlFor={resetEmailId} className="mb-1.5 block text-[12.5px] font-medium text-gray-600">
                          {t.common.email}
                        </label>
                        <input
                          id={resetEmailId}
                          type="email"
                          value={forgotPasswordEmail}
                          onChange={(e) => { setForgotPasswordEmail(e.target.value); setForgotPasswordError(""); }}
                          placeholder={t.auth.emailPlaceholder}
                          className="h-[52px] w-full rounded-xl border border-gray-200 bg-white px-4 text-[16px] text-gray-900 placeholder:text-gray-400 transition-[border-color,box-shadow] duration-200 focus:border-warm-orange focus:outline-none focus:shadow-[0_0_0_3px_rgba(248,147,93,0.16)]"
                          required
                          autoComplete="email"
                          autoFocus
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={forgotPasswordLoading || !forgotPasswordEmail.trim()}
                        aria-busy={forgotPasswordLoading}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-warm-orange to-warm-coral text-[15px] font-semibold text-white/100 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-orange/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {forgotPasswordLoading ? (
                          <>
                            <motion.span
                              className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white/100"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                            />
                            {t.auth.sendingLink}
                          </>
                        ) : (
                          t.auth.sendLink
                        )}
                      </button>
                    </form>

                    <button
                      onClick={closeForgotPassword}
                      className="mt-3 w-full rounded-lg py-2.5 text-sm text-gray-600 transition-colors hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-orange/50"
                    >
                      {t.auth.backToLogin}
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
