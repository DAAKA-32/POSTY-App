"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/LoginForm";
import ConnectionLoader from "@/components/shared/ConnectionLoader";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      setRedirecting(true);
      router.push("/app");
    }
  }, [user, loading, router]);

  // Show loading state
  if (loading) {
    return <ConnectionLoader message="Vérification de votre session..." />;
  }

  // Show redirecting state
  if (redirecting) {
    return <ConnectionLoader message="Redirection vers votre espace..." />;
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
            absolute top-0 right-0 w-[600px] h-[600px]
            bg-primary/5 rounded-full blur-3xl
            transition-all duration-1000
            ${mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-20"}
          `}
        />
        <div
          className={`
            absolute bottom-0 left-0 w-[500px] h-[500px]
            bg-accent/5 rounded-full blur-3xl
            transition-all duration-1000 delay-300
            ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"}
          `}
        />
      </div>

      {/* Left side - Branding (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] bg-gradient-to-br from-dark-card to-dark-bg relative overflow-hidden">
        {/* Background patterns */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-3xl" />
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
              Content de te revoir sur <span className="text-gradient">POSTY</span>
            </h1>
            <p className="text-lg xl:text-xl text-text-secondary mb-8">
              Genere des posts LinkedIn impactants grace a l&apos;intelligence artificielle.
            </p>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-dark-elevated/50 rounded-xl border border-dark-border/50">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Retrouve ton historique</p>
                  <p className="text-sm text-text-muted">Accede a tous tes posts generes</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-dark-elevated/50 rounded-xl border border-dark-border/50">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Profil personnalise</p>
                  <p className="text-sm text-text-muted">IA adaptee a ton style</p>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="pt-8 border-t border-dark-border/30">
            <p className="text-text-secondary italic mb-4">
              &ldquo;POSTY a revolutionne ma facon de creer du contenu LinkedIn. Je gagne des heures chaque semaine.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">ML</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Marie L.</p>
                <p className="text-text-muted text-xs">Marketing Manager</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col lg:w-1/2 xl:w-[55%]">
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
              <h2 className="text-2xl xl:text-3xl font-bold text-white mb-2">Connexion</h2>
              <p className="text-text-secondary">
                Pas encore de compte ?{" "}
                <Link href="/signup" className="text-primary hover:text-accent transition-colors font-medium">
                  Creer un compte
                </Link>
              </p>
            </div>

            <LoginForm onSuccess={handleSuccess} />
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
    </div>
  );
}
