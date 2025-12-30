"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [taglineLoaded, setTaglineLoaded] = useState(false);
  const [ctaLoaded, setCtaLoaded] = useState(false);
  const [mockupLoaded, setMockupLoaded] = useState(false);

  // Redirect authenticated users to /app
  useEffect(() => {
    if (!loading && user) {
      router.push("/app");
    }
  }, [user, loading, router]);

  // Progressive reveal animations
  useEffect(() => {
    const logoTimer = setTimeout(() => setLogoLoaded(true), 200);
    const taglineTimer = setTimeout(() => setTaglineLoaded(true), 500);
    const ctaTimer = setTimeout(() => setCtaLoaded(true), 800);
    const mockupTimer = setTimeout(() => setMockupLoaded(true), 600);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(taglineTimer);
      clearTimeout(ctaTimer);
      clearTimeout(mockupTimer);
    };
  }, []);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center animate-pulse-soft">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
        </div>
      </div>
    );
  }

  // Don't show landing if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Background gradient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/5 rounded-full blur-3xl" />
        {/* Extra desktop gradients */}
        <div className="hidden xl:block absolute top-0 right-1/3 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Desktop Header */}
      <header className="hidden lg:flex relative z-10 px-8 xl:px-12 py-6 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-primary to-accent rounded-xl overflow-hidden flex items-center justify-center shadow-glow transition-transform hover:scale-105">
            <img
              src="/logo.png"
              alt="POSTY Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const sibling = e.currentTarget.nextElementSibling as HTMLElement | null; if (sibling) sibling.style.display = 'flex';
              }}
            />
            <span className="text-white font-bold text-xl lg:text-2xl hidden">P</span>
          </div>
          <span className="font-semibold text-white text-xl lg:text-2xl tracking-tight">POSTY</span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-text-secondary hover:text-white transition-colors duration-200 font-medium"
          >
            Se connecter
          </Link>
          <Link href="/signup">
            <button className="px-6 py-2.5 bg-dark-elevated hover:bg-dark-hover border border-dark-border text-white font-medium rounded-xl transition-all duration-200">
              Creer un compte
            </button>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center px-6 lg:px-12 xl:px-20 py-12 lg:py-0 relative z-10 gap-8 lg:gap-16 xl:gap-24">
        {/* Left side - Content */}
        <div className="w-full max-w-md lg:max-w-xl text-center lg:text-left">
          {/* Logo - Mobile only */}
          <div
            className={`
              lg:hidden mb-8 transition-all duration-700 ease-out
              ${logoLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
          >
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-glow mx-auto">
                <span className="text-white font-bold text-4xl">T</span>
              </div>
              <div className="absolute -inset-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-xl -z-10 animate-pulse-soft" />
            </div>
          </div>

          {/* Badge - Desktop only */}
          <div
            className={`
              hidden lg:inline-flex items-center gap-2 px-4 py-2 mb-6
              bg-primary/10 border border-primary/20 rounded-full
              transition-all duration-700 ease-out
              ${logoLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
          >
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-sm text-primary font-medium">Propulse par l&apos;IA</span>
          </div>

          {/* Tagline */}
          <div
            className={`
              mb-6 lg:mb-8 transition-all duration-700 ease-out delay-100
              ${taglineLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
          >
            <h1 className="text-2xl sm:text-3xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-4 lg:mb-6">
              Ton IA pour creer des posts LinkedIn{" "}
              <span className="text-gradient">impactants</span>.
            </h1>
            <p className="text-lg lg:text-xl xl:text-2xl text-text-secondary">
              Simplement. Rapidement.
            </p>
          </div>

          {/* Description */}
          <div
            className={`
              mb-8 lg:mb-10 transition-all duration-700 ease-out delay-200
              ${taglineLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
          >
            <p className="text-text-secondary text-base lg:text-lg xl:text-xl max-w-lg mx-auto lg:mx-0">
              Genere, choisis et optimise tes posts avant meme d&apos;etre connecte.
              <span className="hidden lg:inline"> Deux versions uniques pour chaque idee.</span>
            </p>
          </div>

          {/* CTA Buttons */}
          <div
            className={`
              space-y-4 lg:space-y-0 lg:flex lg:items-center lg:gap-4 transition-all duration-700 ease-out delay-300
              ${ctaLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
          >
            {/* Primary CTA */}
            <Link href="/chat" className="block lg:inline-block">
              <button
                className="
                  w-full lg:w-auto py-4 px-8 lg:px-10 text-lg font-semibold
                  bg-gradient-to-r from-primary to-primary-hover
                  hover:from-primary-hover hover:to-primary
                  text-white rounded-2xl
                  shadow-glow hover:shadow-lg
                  transform hover:scale-[1.02] active:scale-[0.98]
                  transition-all duration-200 ease-smooth
                  haptic-feedback
                "
              >
                Tester maintenant
              </button>
            </Link>

            {/* Secondary CTA - Desktop */}
            <Link href="/signup" className="hidden lg:inline-block">
              <button
                className="
                  py-4 px-8 text-lg font-semibold
                  bg-dark-elevated hover:bg-dark-hover
                  border border-dark-border hover:border-primary/30
                  text-white rounded-2xl
                  transform hover:scale-[1.02] active:scale-[0.98]
                  transition-all duration-200
                "
              >
                Creer un compte
              </button>
            </Link>

            {/* Secondary links - Mobile */}
            <div className="flex lg:hidden items-center justify-center gap-4 pt-2">
              <Link
                href="/login"
                className="text-text-secondary hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                Se connecter
              </Link>
              <span className="text-dark-border">|</span>
              <Link
                href="/signup"
                className="text-text-secondary hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                S&apos;inscrire
              </Link>
            </div>
          </div>

          {/* Features hints - Mobile */}
          <div
            className={`
              lg:hidden mt-12 grid grid-cols-3 gap-4 transition-all duration-700 ease-out delay-500
              ${ctaLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
          >
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-xs text-text-muted">Rapide</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-accent/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-xs text-text-muted">Intelligent</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-warning/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <p className="text-xs text-text-muted">Impactant</p>
            </div>
          </div>

          {/* Features - Desktop */}
          <div
            className={`
              hidden lg:flex items-center gap-8 mt-12 transition-all duration-700 ease-out delay-500
              ${ctaLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Generation rapide</p>
                <p className="text-sm text-text-muted">En quelques secondes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">2 versions</p>
                <p className="text-sm text-text-muted">Storytelling & Business</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Mockup (Desktop only) */}
        <div
          className={`
            hidden lg:block w-full max-w-lg xl:max-w-xl
            transition-all duration-1000 ease-out delay-300
            ${mockupLoaded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}
          `}
        >
          <div className="relative">
            {/* Glow behind mockup */}
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl" />

            {/* Chat mockup */}
            <div className="relative bg-dark-card border border-dark-border rounded-2xl shadow-elevated overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-dark-border flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="POSTY Logo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const sibling = e.currentTarget.nextElementSibling as HTMLElement | null; if (sibling) sibling.style.display = 'flex';
                    }}
                  />
                  <span className="text-white font-bold text-sm hidden">P</span>
                </div>
                <span className="font-medium text-white">POSTY</span>
                <span className="ml-auto px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">En ligne</span>
              </div>

              {/* Messages */}
              <div className="p-6 space-y-4 bg-dark-bg/50">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] px-4 py-3 bg-primary/20 border border-primary/30 rounded-2xl rounded-br-md">
                    <p className="text-white text-sm">Je veux un post sur le leadership et l&apos;importance d&apos;ecouter son equipe</p>
                  </div>
                </div>

                {/* AI typing */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs">T</span>
                  </div>
                  <div className="max-w-[85%]">
                    <div className="px-4 py-3 bg-dark-elevated border border-dark-border rounded-2xl rounded-bl-md mb-2">
                      <p className="text-xs text-accent font-medium mb-2">Version Storytelling</p>
                      <p className="text-white text-sm leading-relaxed">
                        Il y a 3 ans, j&apos;ai commis ma plus grande erreur de manager...
                        <span className="text-text-muted"> J&apos;ai impose une decision sans consulter mon equipe. Le resultat ? Un projet qui a echoue...</span>
                      </p>
                    </div>
                    <div className="px-4 py-3 bg-dark-elevated border border-dark-border rounded-2xl rounded-bl-md">
                      <p className="text-xs text-primary font-medium mb-2">Version Business</p>
                      <p className="text-white text-sm leading-relaxed">
                        Les meilleurs leaders ont un secret : ils ecoutent plus qu&apos;ils ne parlent.
                        <span className="text-text-muted"> Voici 5 techniques pour developper votre ecoute active...</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input area */}
              <div className="px-6 py-4 border-t border-dark-border">
                <div className="flex items-center gap-3 px-4 py-3 bg-dark-bg border border-dark-border rounded-xl">
                  <span className="text-text-muted text-sm flex-1">Decrivez votre post LinkedIn...</span>
                  <div className="w-8 h-8 bg-dark-border rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 px-3 py-1.5 bg-accent text-dark-bg text-xs font-semibold rounded-full shadow-lg animate-bounce-subtle">
              IA Generative
            </div>
            <div className="absolute -bottom-4 -left-4 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-full shadow-lg">
              100% Gratuit
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`
          flex-shrink-0 py-6 px-6 text-center transition-all duration-700 ease-out delay-700
          ${ctaLoaded ? "opacity-100" : "opacity-0"}
        `}
      >
        <div className="flex items-center justify-center gap-6 text-xs text-text-muted">
          <Link href="/legal/privacy" className="hover:text-text-secondary transition-colors">
            Confidentialite
          </Link>
          <Link href="/legal/terms" className="hover:text-text-secondary transition-colors">
            CGU
          </Link>
          <Link href="/legal/notices" className="hover:text-text-secondary transition-colors">
            Mentions legales
          </Link>
        </div>
      </footer>
    </div>
  );
}
