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
} from "@/lib/db/firestore";
import KPICard from "@/components/dashboard/KPICard";
import ActivityChart from "@/components/dashboard/ActivityChart";
import ResponseModeChart from "@/components/dashboard/ResponseModeChart";
import FeatureUsageChart from "@/components/dashboard/FeatureUsageChart";
import InsightsSection from "@/components/dashboard/InsightsSection";
import DashboardOnboarding from "@/components/dashboard/DashboardOnboarding";
import { AnimatedLogo } from "@/components/ui/Logo";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { usePageTitle } from "@/hooks/ui/usePageTitle";

function DashboardContent() {
  const { user, userProfile, loading } = useAuth();
  // Use the EFFECTIVE plan from SubscriptionContext (gift/founder override
  // already applied) — reading userProfile?.subscription?.plan directly here
  // would show "Free" for whitelisted Max users with stale Firestore records.
  const { currentPlan } = useSubscription();
  const router = useRouter();
  const { t, language } = useLanguage();
  usePageTitle("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

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

    if (!loading && user) {
      fetchData();
    }
  }, [user, loading]);

  // Animate in — no setTimeout, trigger immediately when data is ready
  useEffect(() => {
    if (!loadingStats) {
      setIsVisible(true);
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
          <p className="text-text-muted">{t.ui.loadingDashboard}</p>
        </div>
      </div>
    );
  }

  if (!user || !stats) {
    return null;
  }

  const firstName = userProfile?.displayName?.split(" ")[0] || t.dashboard.user;

  return (
    <div
      className="bg-background-warm dark:bg-background"
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
      }}
    >
      {/* Onboarding */}
      {showOnboarding && (
        <DashboardOnboarding onComplete={handleOnboardingComplete} />
      )}


      {/* Header - Unified style with other pages */}
      <header className="sticky top-0 z-40 bg-background-warm/80 dark:bg-dark-bg/80 backdrop-blur-xl border-b border-[#F8935D]/10 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="relative flex items-center justify-between h-16">
            {/* Back button - Consistent with profile/settings */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-text-secondary hover:text-gray-900 dark:hover:text-white transition-colors group z-10"
              aria-label={t.dashboard.back}
            >
              <svg
                className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">{t.dashboard.back}</span>
            </button>

            {/* Page title - Centered */}
            <div className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900 dark:text-white">
              Dashboard
            </div>

            {/* Actions - Right side */}
            <Link
              href="/profile"
              className="px-3 py-2 bg-[#F8935D]/10 dark:bg-dark-hover hover:bg-[#F8935D]/15 dark:hover:bg-dark-active border border-[#F8935D]/15 dark:border-dark-border text-gray-700 dark:text-text-secondary hover:text-gray-900 dark:hover:text-white text-sm font-medium rounded-xl transition-all duration-200"
            >
              {t.dashboard.myProfile}
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 px-4 sm:px-6 lg:px-12 py-6 sm:py-8 max-w-7xl mx-auto">
        {/* Welcome section */}
        <div
          className={`
            mb-10 transition-all duration-400 ease-out
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          `}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-silver-shimmer dark:text-white mb-2">
                {t.dashboard.hello} {firstName} !
              </h1>
              <p className="text-text-secondary">
                {t.dashboard.welcomeSubtitle}
              </p>
            </div>

            {/* Plan badge */}
            <div className="flex flex-wrap items-center gap-3">
              <div className={`px-4 py-3 rounded-xl transition-colors duration-200 ${
                currentPlan === "max"
                  ? "bg-primary-hover/10 border border-primary-hover/20 hover:border-primary-hover/30"
                  : currentPlan === "pro"
                    ? "bg-primary/10 border border-primary/20 hover:border-primary/30"
                    : "bg-gray-100 dark:bg-dark-card border border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-border-hover"
              }`}>
                <p className="text-xs text-text-muted mb-1">{t.dashboard.currentPlan}</p>
                <p className={`text-sm font-semibold ${
                  currentPlan === "max"
                    ? "text-primary-hover"
                    : currentPlan === "pro"
                      ? "text-primary"
                      : "text-primary"
                }`}>
                  {currentPlan === "pro"
                    ? "Pro"
                    : currentPlan === "max"
                      ? "Max"
                      : t.dashboard.free}
                </p>
              </div>
              <Link
                href="/app"
                className="px-5 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              >
                {t.dashboard.createPost}
              </Link>
            </div>
          </div>
        </div>

        {/* KPI Cards — 6 métriques clés : posts, publiés, semaine, mois, programmés, sessions */}
        <div
          className={`
            grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5 mb-10
            transition-all duration-400 ease-out delay-75
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
          `}
        >
          <KPICard
            title={t.dashboard.postsGenerated}
            value={stats.totalPosts}
            subtitle={t.dashboard.sinceBeginning}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            color="primary"
            tooltip={t.dashboard.tooltipPostsGenerated}
          />
          <KPICard
            title={t.dashboard.postsPublished}
            value={stats.publishedPosts}
            subtitle={t.dashboard.onLinkedIn}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            }
            color="accent"
            tooltip={t.dashboard.tooltipPostsPublished}
          />
          <KPICard
            title={t.dashboard.thisWeek}
            value={stats.postsLast7Days}
            subtitle={t.dashboard.last7Days}
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
            tooltip={t.dashboard.tooltipThisWeek}
          />
          <KPICard
            title={t.dashboard.thisMonth}
            value={stats.postsLast30Days}
            subtitle={t.dashboard.last30Days}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            color="primary"
            tooltip={t.dashboard.tooltipThisMonth}
          />
          <KPICard
            title={t.dashboard.scheduled}
            value={stats.scheduledPostsCount}
            subtitle={t.dashboard.upcoming}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="warning"
            tooltip={t.dashboard.tooltipScheduled}
          />
          <KPICard
            title={t.dashboard.sessions}
            value={stats.totalSessions}
            subtitle={t.dashboard.conversations}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
            color="success"
            tooltip={t.dashboard.tooltipSessions}
          />
        </div>

        {/* Activity chart — full width to highlight the daily trend */}
        <div
          className={`
            mb-10 transition-all duration-400 ease-out delay-100
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
          `}
        >
          <ActivityChart
            data={stats.postsByDay}
            title={t.dashboard.generationActivity}
            subtitle={t.ui.postEvolution}
          />
        </div>

        {/* Response mode (donut) + Feature usage (bars) — complementary breakdowns */}
        <div
          className={`
            grid lg:grid-cols-2 gap-6 mb-10
            transition-all duration-400 ease-out
            ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          `}
          style={{ transitionDelay: "150ms" }}
        >
          <ResponseModeChart data={stats.responseModeDistribution} />
          <FeatureUsageChart data={stats.featureUsage} />
        </div>

        {/* Insights section */}
        <div
          className={`
            transition-all duration-400 ease-out delay-150
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
              mt-10 transition-all duration-400 ease-out delay-200
              ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
            `}
          >
            <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 sm:p-6 hover:border-gray-300 dark:hover:border-dark-border-hover transition-colors duration-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.dashboard.recentActivity}</h3>
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-dark-elevated rounded-xl hover:bg-gray-100 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border transition-colors duration-200"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-primary/20">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {activity.content}...
                      </p>
                      <p className="text-xs text-gray-500 dark:text-text-muted">
                        {new Date(activity.date).toLocaleDateString(language === "en" ? "en-US" : "fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Link
                      href="/history"
                      className="text-xs text-primary hover:text-primary-hover transition-colors duration-200 font-medium px-2.5 py-1 bg-primary/10 hover:bg-primary/15 rounded-lg"
                    >
                      {t.dashboard.view}
                    </Link>
                  </div>
                ))}
              </div>
              <Link
                href="/history"
                className="mt-4 block text-center text-sm text-primary hover:text-primary-hover transition-colors duration-200 font-medium"
              >
                {t.dashboard.viewAllHistory}
              </Link>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-4 sm:px-6 text-center border-t border-[#F8935D]/10 mt-12">
        <div className="flex items-center justify-center gap-6 text-xs text-text-subtle">
          <Link href="/legal/privacy" className="hover:text-[#F8935D] transition-colors duration-200">
            {t.dashboard.privacy}
          </Link>
          <Link href="/legal/terms" className="hover:text-[#F8935D] transition-colors duration-200">
            {t.dashboard.terms}
          </Link>
          <Link href="/profile" className="hover:text-[#F8935D] transition-colors duration-200">
            {t.dashboard.myProfile}
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute requireOnboarding minimumPlan="pro">
      <DashboardContent />
    </ProtectedRoute>
  );
}
