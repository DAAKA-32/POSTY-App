"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDashboardStats,
  DashboardStats,
  hasDashboardBeenVisited,
  markDashboardVisited,
} from "@/lib/firestore";
import KPICard from "@/components/dashboard/KPICard";
import ActivityChart from "@/components/dashboard/ActivityChart";
import StyleDistributionChart from "@/components/dashboard/StyleDistributionChart";
import InsightsSection from "@/components/dashboard/InsightsSection";
import DashboardOnboarding from "@/components/dashboard/DashboardOnboarding";
import { AnimatedLogo } from "@/components/ui/Logo";

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch stats and check onboarding
  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        const [statsData, hasVisited] = await Promise.all([
          getDashboardStats(user.uid),
          hasDashboardBeenVisited(user.uid),
        ]);
        setStats(statsData);
        setShowOnboarding(!hasVisited);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoadingStats(false);
      }
    }

    if (user) {
      fetchData();
    }
  }, [user]);

  // Animate in
  useEffect(() => {
    if (!loadingStats) {
      setTimeout(() => setIsVisible(true), 100);
    }
  }, [loadingStats]);

  // Enable full scrolling on Dashboard page (mouse wheel, trackpad, touch, keyboard)
  useEffect(() => {
    document.documentElement.classList.add("dashboard-scroll-enabled");
    document.body.classList.add("dashboard-scroll-enabled");
    // Remove any classes that might block scroll
    document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked", "modal-open");

    return () => {
      document.documentElement.classList.remove("dashboard-scroll-enabled");
      document.body.classList.remove("dashboard-scroll-enabled");
    };
  }, []);

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    if (user) {
      await markDashboardVisited(user.uid);
    }
  };

  // Loading state
  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-background-warm dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4">
            <AnimatedLogo size="xl" />
          </div>
          <p className="text-text-muted">Chargement de votre dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !stats) {
    return null;
  }

  const firstName = userProfile?.displayName?.split(" ")[0] || "utilisateur";

  return (
    <div
      className="min-h-screen bg-background-warm dark:bg-background"
      style={{
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: "100vh",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
      }}
    >
      {/* Onboarding */}
      {showOnboarding && (
        <DashboardOnboarding onComplete={handleOnboardingComplete} />
      )}

      {/* Background effects - Harmonized with landing page Features palette */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-violet-500/[0.06] to-purple-600/[0.04] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-500/[0.05] to-green-600/[0.04] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#F8935D]/[0.04] to-[#F76B54]/[0.03] rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
      </div>

      {/* Header - Unified style with other pages */}
      <header className="sticky top-0 z-40 bg-background-warm/80 dark:bg-dark-bg/80 backdrop-blur-xl border-b border-[#F8935D]/10 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="relative flex items-center justify-between h-16">
            {/* Back button - Consistent with profile/settings */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-text-secondary hover:text-gray-900 dark:hover:text-white transition-colors group z-10"
              aria-label="Retour"
            >
              <svg
                className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Retour</span>
            </button>

            {/* Page title - Centered */}
            <div className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900 dark:text-white">
              Dashboard
            </div>

            {/* Actions - Right side */}
            <div className="flex items-center gap-3">
              <Link
                href="/app"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-text-muted hover:text-primary transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Créer
              </Link>
              <Link
                href="/profile"
                className="px-3 py-2 bg-[#F8935D]/10 dark:bg-dark-hover hover:bg-[#F8935D]/15 dark:hover:bg-dark-active border border-[#F8935D]/15 dark:border-dark-border text-gray-700 dark:text-text-secondary hover:text-gray-900 dark:hover:text-white text-sm font-medium rounded-xl transition-all duration-200"
              >
                Mon profil
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 px-6 lg:px-12 py-8 max-w-7xl mx-auto">
        {/* Welcome section */}
        <div
          className={`
            mb-10 transition-all duration-700 ease-out
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          `}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-2">
                Bonjour {firstName} !
              </h1>
              <p className="text-text-secondary">
                Voici un apercu de votre activite et de votre progression sur LinkedIn.
              </p>
            </div>

            {/* Plan badge */}
            <div className="flex items-center gap-3">
              <div className={`px-4 py-3 rounded-xl transition-all duration-200 ${
                userProfile?.subscription?.plan === "max"
                  ? "bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/25 hover:border-violet-500/40"
                  : userProfile?.subscription?.plan === "pro"
                    ? "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/25 hover:border-blue-500/40"
                    : "bg-dashboard-card border border-dashboard-card-border hover:border-amber-500/30"
              }`}>
                <p className="text-xs text-text-muted mb-1">Plan actuel</p>
                <p className={`text-sm font-semibold ${
                  userProfile?.subscription?.plan === "max"
                    ? "bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent"
                    : userProfile?.subscription?.plan === "pro"
                      ? "bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent"
                      : "text-amber-500"
                }`}>
                  {userProfile?.subscription?.plan === "pro"
                    ? "Pro"
                    : userProfile?.subscription?.plan === "max"
                      ? "Max"
                      : "Gratuit"}
                </p>
              </div>
              <Link
                href="/app"
                className="group relative px-5 py-3 bg-gradient-to-r from-[#F8935D] via-[#F76B54] to-[#F8935D] hover:from-[#e8854d] hover:via-[#e75b44] hover:to-[#e8854d] text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#F8935D]/25 hover:shadow-xl hover:shadow-[#F8935D]/30 transition-all duration-300"
              >
                <span className="relative z-10">Creer un post</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div
          className={`
            grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10
            transition-all duration-700 ease-out delay-100
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          `}
        >
          <KPICard
            title="Posts generes"
            value={stats.totalPosts}
            subtitle="Depuis le debut"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            color="primary"
            tooltip="Nombre total de posts que vous avez generes avec Posty"
          />
          <KPICard
            title="Posts publies"
            value={stats.publishedPosts}
            subtitle="Sur LinkedIn"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            }
            color="accent"
            tooltip="Posts que vous avez publies directement sur LinkedIn via Posty"
          />
          <KPICard
            title="Cette semaine"
            value={stats.postsLast7Days}
            subtitle="7 derniers jours"
            trend={
              stats.postsLast7Days > 0
                ? { value: Math.round((stats.postsLast7Days / 7) * 100), isPositive: true }
                : undefined
            }
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            color="warning"
            tooltip="Nombre de posts generes ces 7 derniers jours"
          />
          <KPICard
            title="Sessions"
            value={stats.totalSessions}
            subtitle="Conversations"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
            color="success"
            tooltip="Nombre de sessions de generation que vous avez lancees"
          />
        </div>

        {/* Charts section */}
        <div
          className={`
            grid lg:grid-cols-2 gap-6 mb-10
            transition-all duration-700 ease-out delay-200
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          `}
        >
          <ActivityChart
            data={stats.postsByDay}
            title="Activite de generation"
            subtitle="Evolution de vos posts dans le temps"
          />
          <StyleDistributionChart data={stats.styleDistribution} />
        </div>

        {/* Insights section */}
        <div
          className={`
            transition-all duration-700 ease-out delay-300
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          `}
        >
          <InsightsSection
            stats={stats}
            userStyle={userProfile?.profile?.linkedinStyle}
            userProfile={userProfile}
          />
        </div>

        {/* Recent activity */}
        {stats.recentActivity.length > 0 && (
          <div
            className={`
              mt-10 transition-all duration-700 ease-out delay-400
              ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
            `}
          >
            <div className="bg-dashboard-card border border-violet-500/15 rounded-2xl p-6 hover:border-violet-500/25 transition-colors duration-300">
              <h3 className="text-lg font-semibold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent mb-4">Activite recente</h3>
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 bg-gradient-to-r from-violet-500/5 to-purple-500/5 rounded-xl hover:from-violet-500/10 hover:to-purple-500/10 border border-violet-500/10 hover:border-violet-500/20 transition-all duration-200"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500/15 to-purple-500/15 rounded-lg flex items-center justify-center flex-shrink-0 border border-violet-500/25">
                      <svg className="w-5 h-5 text-violet-500 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">
                        {activity.content}...
                      </p>
                      <p className="text-xs text-violet-500/70 dark:text-violet-400/70">
                        {new Date(activity.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Link
                      href="/history"
                      className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors duration-200 font-medium px-2.5 py-1 bg-violet-500/10 hover:bg-violet-500/15 rounded-lg"
                    >
                      Voir
                    </Link>
                  </div>
                ))}
              </div>
              <Link
                href="/history"
                className="mt-4 block text-center text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors duration-200 font-medium"
              >
                Voir tout l&apos;historique
              </Link>
            </div>
          </div>
        )}

        {/* CTA section - Brand colors harmonized with landing page */}
        <div
          className={`
            mt-10 text-center transition-all duration-700 ease-out delay-500
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          `}
        >
          <div className="relative overflow-hidden bg-gradient-to-r from-[#F8935D]/[0.08] via-[#F76B54]/[0.05] to-[#F8935D]/[0.08] border border-[#F8935D]/25 rounded-2xl p-8">
            {/* Animated glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F8935D]/10 via-transparent to-[#F76B54]/10 pointer-events-none animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="relative z-10">
              <h3 className="text-xl font-bold bg-gradient-to-r from-[#F8935D] via-[#F76B54] to-[#F8935D] bg-clip-text text-transparent mb-2">
                Pret a creer votre prochain post ?
              </h3>
              <p className="text-text-secondary mb-6">
                Continuez a developper votre presence LinkedIn avec Posty.
              </p>
              <Link
                href="/app"
                className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F8935D] via-[#F76B54] to-[#F8935D] hover:from-[#e8854d] hover:via-[#e75b44] hover:to-[#e8854d] text-white font-semibold rounded-xl shadow-lg shadow-[#F8935D]/25 hover:shadow-xl hover:shadow-[#F8935D]/35 transition-all duration-300"
              >
                <span className="relative z-10">Generer un post</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 text-center border-t border-[#F8935D]/10 mt-12">
        <div className="flex items-center justify-center gap-6 text-xs text-text-subtle">
          <Link href="/legal/privacy" className="hover:text-[#F8935D] transition-colors duration-200">
            Confidentialite
          </Link>
          <Link href="/legal/terms" className="hover:text-[#F8935D] transition-colors duration-200">
            CGU
          </Link>
          <Link href="/profile" className="hover:text-[#F8935D] transition-colors duration-200">
            Mon profil
          </Link>
        </div>
      </footer>
    </div>
  );
}
