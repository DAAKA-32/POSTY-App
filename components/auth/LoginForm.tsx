"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import GoogleButton from "./GoogleButton";

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
          Bon retour !
        </h1>
        <p
          className={`
            text-text-secondary
            transition-all duration-500 delay-300
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          `}
        >
          Connectez-vous pour acceder a vos posts
        </p>
      </div>

      {/* Success state */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-xl text-accent text-sm flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Connexion reussie ! Redirection...</span>
        </div>
      )}

      {/* Google Sign In */}
      <div
        className={`
          transition-all duration-500 delay-400
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        <GoogleButton onSuccess={onSuccess} label="Continuer avec Google" />
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
        id="login-form"
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
          ref={emailRef}
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
            autoComplete="current-password"
            aria-label="Mot de passe"
          />
          <div className="mt-2 text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-text-muted hover:text-primary transition-colors duration-200"
            >
              Mot de passe oublie ?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isLoading}
          disabled={showSuccess}
        >
          Se connecter
        </Button>
      </form>

      {/* Sign up link */}
      <p
        className={`
          mt-8 text-center text-text-secondary text-sm
          transition-all duration-500 delay-700
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        Pas encore de compte ?{" "}
        <Link
          href="/signup"
          className="text-primary hover:text-primary-hover font-medium transition-colors duration-200"
        >
          Creer un compte
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Connexion securisee SSL</span>
      </div>
    </div>
  );
}
