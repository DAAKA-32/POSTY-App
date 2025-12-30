"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import SignupForm from "@/components/auth/SignupForm";
import ConnectionLoader from "@/components/shared/ConnectionLoader";

export default function SignupPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      setRedirecting(true);
      // New users go to onboarding
      if (!userProfile?.onboardingComplete) {
        router.push("/onboarding");
      } else {
        router.push("/app");
      }
    }
  }, [user, userProfile, loading, router]);

  // Show loading state
  if (loading) {
    return <ConnectionLoader message="Vérification de votre session..." />;
  }

  // Show redirecting state
  if (redirecting) {
    const message = userProfile?.onboardingComplete
      ? "Redirection vers votre espace..."
      : "Préparation de votre profil...";
    return <ConnectionLoader message={message} />;
  }

  const handleSuccess = () => {
    // Router will handle redirect via useEffect
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-hidden">
      {/* Background gradient effects - Mobile only */}
      <div className="lg:hidden fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className={`
            absolute top-0 left-0 w-[600px] h-[600px]
            bg-accent/5 rounded-full blur-3xl
            transition-all duration-1000
            ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-20"}
          `}
        />
        <div
          className={`
            absolute bottom-0 right-0 w-[500px] h-[500px]
            bg-primary/5 rounded-full blur-3xl
            transition-all duration-1000 delay-300
            ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"}
          `}
        />
      </div>

      {/* Left side - Form */}
      <div className="flex-1 flex flex-col lg:w-1/2 xl:w-[55%] lg:order-2">
        {/* Header - Mobile */}
        <header className="lg:hidden relative z-10 p-4">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl overflow-hidden flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <img
                src="/logo.png"
                alt="POSTY Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const sibling = e.currentTarget.nextElementSibling as HTMLElement | null; if (sibling) sibling.style.display = 'flex';
                }}
              />
              <span className="text-white font-bold text-lg hidden">P</span>
            </div>
            <span className="font-semibold text-white text-lg transition-colors duration-200 group-hover:text-text-secondary">
              POSTY
            </span>
          </Link>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8 lg:px-12 xl:px-20 relative z-10">
          <div className="w-full max-w-md lg:max-w-lg">
            {/* Desktop welcome */}
            <div className="hidden lg:block mb-8">
              <h2 className="text-2xl xl:text-3xl font-bold text-white mb-2">Creer un compte</h2>
              <p className="text-text-secondary">
                Deja inscrit ?{" "}
                <Link href="/login" className="text-primary hover:text-accent transition-colors font-medium">
                  Se connecter
                </Link>
              </p>
            </div>

            <SignupForm onSuccess={handleSuccess} />
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 p-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-6 text-xs text-text-muted">
            <Link
              href="/"
              className="hover:text-white transition-colors duration-200 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Accueil
            </Link>
            <span className="text-dark-border hidden lg:inline">|</span>
            <Link href="/legal/privacy" className="hover:text-white transition-colors duration-200">
              Confidentialite
            </Link>
            <Link href="/legal/terms" className="hover:text-white transition-colors duration-200">
              CGU
            </Link>
            <Link href="/legal/notices" className="hover:text-white transition-colors duration-200">
              Mentions legales
            </Link>
          </div>
        </footer>
      </div>

      {/* Right side - Branding (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] lg:order-1 bg-gradient-to-bl from-dark-card to-dark-bg relative overflow-hidden">
        {/* Background patterns */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-accent/5 to-primary/5 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-3 group w-fit">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-primary to-accent rounded-xl overflow-hidden flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-glow">
              <img
                src="/logo.png"
                alt="POSTY Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const sibling = e.currentTarget.nextElementSibling as HTMLElement | null; if (sibling) sibling.style.display = 'flex';
                }}
              />
              <span className="text-white font-bold text-2xl lg:text-3xl hidden">P</span>
            </div>
            <span className="font-semibold text-white text-2xl lg:text-3xl transition-colors duration-200 group-hover:text-text-secondary">
              POSTY
            </span>
          </Link>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Rejoins la communaute <span className="text-gradient">POSTY</span>
            </h1>
            <p className="text-lg xl:text-xl text-text-secondary mb-8">
              Cree des posts LinkedIn percutants en quelques secondes avec l&apos;aide de l&apos;IA.
            </p>

            {/* Benefits */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">100% Gratuit</p>
                  <p className="text-sm text-text-muted">Aucune carte bancaire requise</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">2 versions par post</p>
                  <p className="text-sm text-text-muted">Storytelling et Business</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Historique illimite</p>
                  <p className="text-sm text-text-muted">Retrouve tous tes posts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-dark-border/30">
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1">10K+</p>
              <p className="text-sm text-text-muted">Utilisateurs</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-accent mb-1">50K+</p>
              <p className="text-sm text-text-muted">Posts generes</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary mb-1">4.9</p>
              <p className="text-sm text-text-muted">Note moyenne</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
