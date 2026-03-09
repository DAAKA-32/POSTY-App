"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserConsent,
  exportUserData,
  withdrawConsent,
  updateConsentPreference,
  deleteAllUserConversations,
  updateUserProfile,
  UserConsent,
} from "@/lib/firestore";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Button from "@/components/ui/Button";
import { ToggleField } from "@/components/ui/Toggle";
import DeleteAccountModal from "@/components/ui/DeleteAccountModal";
import DeleteConversationsModal from "@/components/ui/DeleteConversationsModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import toast from "@/components/ui/Toast";
import { SubscriptionManagement, PlatformConnectionsSection } from "@/components/settings";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { usePageTitle } from "@/hooks/usePageTitle";

// Animation variants for staggered sections
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};


function SettingsContent() {
  const { user, deleteUserAccount, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  useSubscription();
  usePageTitle("settings");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<UserConsent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteConversationsModal, setShowDeleteConversationsModal] = useState(false);

  // Enable full scrolling on Settings page (mouse wheel, trackpad, touch, keyboard)
  useEffect(() => {
    document.documentElement.classList.add("settings-scroll-enabled");
    document.body.classList.add("settings-scroll-enabled");
    // Remove any classes that might block scroll
    document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked", "modal-open");

    return () => {
      document.documentElement.classList.remove("settings-scroll-enabled");
      document.body.classList.remove("settings-scroll-enabled");
    };
  }, []);

  // Track safe back URL through OAuth redirects via sessionStorage + from param
  useEffect(() => {
    const from = searchParams.get("from");
    if (from) {
      sessionStorage.setItem("settings_back_url", from);
      // Clean the URL bar without navigation (avoids re-triggering on re-render)
      const url = new URL(window.location.href);
      url.searchParams.delete("from");
      window.history.replaceState({}, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBack = useCallback(() => {
    const backUrl = sessionStorage.getItem("settings_back_url") || "/app";
    sessionStorage.removeItem("settings_back_url");
    router.push(backUrl);
  }, [router]);

  // Check if user signed in with Google
  const isGoogleUser = user?.providerData.some(
    (provider) => provider.providerId === "google.com"
  ) ?? false;

  // Load consent data
  useEffect(() => {
    const loadConsent = async () => {
      if (user) {
        const userConsent = await getUserConsent(user.uid);
        setConsent(userConsent);
        setIsLoading(false);
      }
    };
    loadConsent();
  }, [user]);

  const handleExportData = async () => {
    if (!user) return;

    setIsExporting(true);
    try {
      const data = await exportUserData(user.uid);

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `posty-data-${user.uid}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t.toasts.dataExported);
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error(t.toasts.errorExport);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (password: string) => {
    if (!user) return;

    await deleteUserAccount(password);
    setShowDeleteModal(false);
    toast.success(t.toasts.accountDeleted);

    // Small delay for success animation
    setTimeout(() => {
      router.push("/");
    }, 1500);
  };

  const handleWithdrawConsent = async () => {
    if (!user) return;

    try {
      await withdrawConsent(user.uid);
      setConsent((prev) =>
        prev ? { ...prev, analytics: false, marketing: false } : null
      );
      toast.success(t.toasts.consentWithdrawn);
    } catch (error) {
      console.error("Error withdrawing consent:", error);
      toast.error(t.toasts.errorUpdate);
    }
  };

  const handleToggleAnalytics = async (checked: boolean) => {
    if (!user) return;

    // Optimistic update
    setConsent((prev) => prev ? { ...prev, analytics: checked } : null);

    try {
      await updateConsentPreference(user.uid, "analytics", checked);
      toast.success(checked ? t.toasts.analyticsEnabled : t.toasts.analyticsDisabled);
    } catch (error) {
      console.error("Error updating analytics consent:", error);
      // Revert on error
      setConsent((prev) => prev ? { ...prev, analytics: !checked } : null);
      toast.error(t.toasts.errorUpdate);
    }
  };

  const handleToggleMarketing = async (checked: boolean) => {
    if (!user) return;

    // Optimistic update
    setConsent((prev) => prev ? { ...prev, marketing: checked } : null);

    try {
      await updateConsentPreference(user.uid, "marketing", checked);
      toast.success(checked ? t.toasts.marketingEnabled : t.toasts.marketingDisabled);
    } catch (error) {
      console.error("Error updating marketing consent:", error);
      // Revert on error
      setConsent((prev) => prev ? { ...prev, marketing: !checked } : null);
      toast.error(t.toasts.errorUpdate);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(t.toasts.logoutSuccess);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error(t.toasts.errorLogout);
    }
  };

  const handleDeleteConversations = async () => {
    if (!user) throw new Error("User not found");

    const result = await deleteAllUserConversations(user.uid);
    toast.success(t.settings.deleteConversationsSuccess);
    return result;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-warm dark:bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm md:text-base">{t.common.loading}</p>
      </div>
    );
  }

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
      {/* Sticky Header with Back Button */}
      <div className="sticky top-0 z-40 bg-background-warm/80 dark:bg-dark-bg/80 backdrop-blur-xl border-b border-[#F8935D]/10 dark:border-dark-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center h-16">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors group z-10"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">{t.common.back}</span>
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900 dark:text-white">
              {t.settings.title}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="
        w-full mx-auto
        px-4 py-6
        md:px-6 md:py-8 md:max-w-2xl
        lg:px-8 lg:py-10 lg:max-w-3xl
        xl:py-12 xl:max-w-4xl
      ">
        {/* Page Header - Premium styling */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 xl:mb-10 relative"
        >
          {/* Subtle gradient background */}
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 rounded-2xl pointer-events-none" />
          <div className="relative">
            <h1 className="text-2xl xl:text-3xl font-bold text-silver-shimmer dark:text-white mb-1">
              {t.settings.title}
            </h1>
            <p className="text-text-secondary md:text-lg">
              {t.settings.subtitle}
            </p>
          </div>
        </motion.div>

        {/* Sections with staggered animation */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4 md:space-y-5 lg:space-y-6"
        >
            {/* Platform Connections Section - Multiplatform */}
            <PlatformConnectionsSection />

            {/* Subscription Management Section */}
            <SubscriptionManagement />


            {/* Appearance Section - Theme Toggle */}
            <motion.section
              variants={sectionVariants}
              className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4 md:p-5 lg:p-6 transition-colors duration-200"
            >
              <div className="flex items-center gap-3 mb-4 lg:mb-5">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-[#F8935D]/10 flex items-center justify-center">
                  {isDark ? (
                    <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-base lg:text-lg font-semibold text-silver-solid dark:text-white">{t.settings.appearance || "Apparence"}</h2>
                  <p className="text-xs lg:text-sm text-text-muted mt-0.5">{t.settings.appearanceSubtitle || "Personnalisez l'interface"}</p>
                </div>
              </div>

              {/* Theme Toggle */}
              <ToggleField
                checked={isDark}
                onChange={toggleTheme}
                label={t.settings.themeMode || "Mode d'affichage"}
                description={isDark ? (t.settings.darkModeActive || "Mode sombre activé") : (t.settings.lightModeActive || "Mode clair activé")}
              />
            </motion.section>

            {/* Language Section */}
            <motion.section
              variants={sectionVariants}
              className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4 md:p-5 lg:p-6 transition-colors duration-200"
            >
              <div className="flex items-center gap-3 mb-4 lg:mb-5">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-[#F8935D]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base lg:text-lg font-semibold text-silver-solid dark:text-white">{t.settings.language}</h2>
                  <p className="text-xs lg:text-sm text-text-muted mt-0.5">{t.settings.languageSubtitle}</p>
                </div>
              </div>

              <div className="space-y-2">
                {([
                  { code: "en" as const, label: t.settings.languageEnglish, flag: "🇺🇸" },
                  { code: "fr" as const, label: t.settings.languageFrench, flag: "🇫🇷" },
                ]).map((lang) => (
                  <button
                    key={lang.code}
                    onClick={async () => {
                      setLanguage(lang.code);
                      if (user) {
                        try {
                          await updateUserProfile(user.uid, { language: lang.code });
                        } catch (e) {
                          console.error("Error saving language preference:", e);
                        }
                      }
                      toast.success(t.settings.languageChanged);
                    }}
                    className={`
                      w-full flex items-center gap-3 p-3 lg:p-4 rounded-xl border transition-all duration-200
                      ${language === lang.code
                        ? "bg-[#F8935D]/5 dark:bg-primary/10 border-[#F8935D]/30 dark:border-primary/30"
                        : "bg-white dark:bg-dark-bg border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-border-hover"
                      }
                    `}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className={`font-medium text-sm lg:text-base ${language === lang.code ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                      {lang.label}
                    </span>
                    {language === lang.code && (
                      <svg className="w-5 h-5 text-[#F8935D] ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </motion.section>

            {/* Notifications Section */}
            <motion.section
              variants={sectionVariants}
              className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4 md:p-5 lg:p-6 transition-colors duration-200"
            >
              <div className="flex items-center gap-3 mb-4 lg:mb-5">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-[#F8935D]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base lg:text-lg font-semibold text-silver-solid dark:text-white">{t.settings.notifications}</h2>
                  <p className="text-xs lg:text-sm text-text-muted mt-0.5">{t.settings.notificationsSubtitle}</p>
                </div>
              </div>

              {/* Security Alerts - Always on, highlighted with opinion color */}
              <div className="flex items-center justify-between p-3 lg:p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium text-sm lg:text-base">{t.settings.securityAlerts}</p>
                    <p className="text-xs lg:text-sm text-text-muted mt-0.5">{t.settings.securityAlertsDesc}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-xs font-medium rounded-lg">{t.settings.alwaysActive}</span>
              </div>
            </motion.section>

            {/* Consent preferences */}
            <motion.section
              variants={sectionVariants}
              className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4 md:p-5 lg:p-6 transition-colors duration-200"
            >
              <div className="flex items-center gap-3 mb-4 lg:mb-5">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-[#F8935D]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-base lg:text-lg font-semibold text-silver-solid dark:text-white">{t.settings.consentPreferences}</h2>
              </div>
              <div className="space-y-3 lg:space-y-4">
                <ToggleField
                  label={t.settings.analytics}
                  description={t.settings.analyticsDesc}
                  checked={consent?.analytics ?? false}
                  onChange={handleToggleAnalytics}
                />
                <ToggleField
                  label={t.settings.marketing}
                  description={t.settings.marketingDesc}
                  checked={consent?.marketing ?? false}
                  onChange={handleToggleMarketing}
                />
              </div>
              <button
                onClick={handleWithdrawConsent}
                className="mt-4 text-xs lg:text-sm text-text-muted hover:text-error transition-colors"
              >
                {t.settings.withdrawConsent}
              </button>
            </motion.section>

            {/* Your rights */}
            <motion.section
              variants={sectionVariants}
              className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4 md:p-5 lg:p-6 transition-colors duration-200"
            >
              <div className="flex items-center gap-3 mb-4 lg:mb-5">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-[#F8935D]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-base lg:text-lg font-semibold text-silver-solid dark:text-white">{t.settings.gdprRights}</h2>
              </div>
              <div className="grid gap-2 md:gap-3 grid-cols-2 lg:grid-cols-4">
                <div className="p-3 lg:p-4 bg-[#F8935D]/5 dark:bg-dark-bg rounded-xl border border-[#F8935D]/10 dark:border-dark-border hover:border-warning/20 transition-colors duration-200">
                  <p className="text-gray-900 dark:text-white font-medium text-xs lg:text-sm">{t.settings.rightAccess}</p>
                  <p className="text-xs text-text-muted mt-0.5 lg:mt-1">{t.settings.seeYourData}</p>
                </div>
                <div className="p-3 lg:p-4 bg-[#F8935D]/5 dark:bg-dark-bg rounded-xl border border-[#F8935D]/10 dark:border-dark-border hover:border-warning/20 transition-colors duration-200">
                  <p className="text-gray-900 dark:text-white font-medium text-xs lg:text-sm">{t.settings.rightRectification}</p>
                  <p className="text-xs text-text-muted mt-0.5 lg:mt-1">{t.settings.correctInfo}</p>
                </div>
                <div className="p-3 lg:p-4 bg-[#F8935D]/5 dark:bg-dark-bg rounded-xl border border-[#F8935D]/10 dark:border-dark-border hover:border-warning/20 transition-colors duration-200">
                  <p className="text-gray-900 dark:text-white font-medium text-xs lg:text-sm">{t.settings.rightErasure}</p>
                  <p className="text-xs text-text-muted mt-0.5 lg:mt-1">{t.settings.deleteData}</p>
                </div>
                <div className="p-3 lg:p-4 bg-[#F8935D]/5 dark:bg-dark-bg rounded-xl border border-[#F8935D]/10 dark:border-dark-border hover:border-warning/20 transition-colors duration-200">
                  <p className="text-gray-900 dark:text-white font-medium text-xs lg:text-sm">{t.settings.rightPortability}</p>
                  <p className="text-xs text-text-muted mt-0.5 lg:mt-1">{t.settings.exportData}</p>
                </div>
              </div>
            </motion.section>

            {/* Actions */}
            <motion.section
              variants={sectionVariants}
              className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4 md:p-5 lg:p-6 transition-colors duration-200"
            >
              <div className="flex items-center gap-3 mb-4 lg:mb-5">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gray-100 dark:bg-dark-hover flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-base lg:text-lg font-semibold text-silver-solid dark:text-white">{t.settings.actions}</h2>
              </div>
              <div className="space-y-3 lg:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 lg:p-4 bg-[#F8935D]/5 dark:bg-dark-bg rounded-xl border border-[#F8935D]/10 dark:border-dark-border hover:border-primary/20 transition-colors duration-200">
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium text-sm lg:text-base">{t.settings.exportMyData}</p>
                    <p className="text-xs lg:text-sm text-text-muted mt-0.5">
                      {t.settings.exportDesc}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleExportData}
                    isLoading={isExporting}
                    className="shrink-0 hover:border-primary/40 hover:text-primary"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {t.settings.export}
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 lg:p-4 bg-[#F8935D]/5 dark:bg-dark-bg rounded-xl border border-[#F8935D]/10 dark:border-dark-border hover:border-primary/20 transition-colors duration-200">
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium text-sm lg:text-base">{t.settings.logoutAction}</p>
                    <p className="text-xs lg:text-sm text-text-muted mt-0.5">
                      {t.settings.logoutDesc}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleLogout}
                    className="shrink-0 hover:border-primary/40 hover:text-primary"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t.auth.logout}
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 lg:p-4 bg-amber-50 dark:bg-warning/5 rounded-xl border border-amber-200 dark:border-warning/20 hover:border-amber-300 dark:hover:border-warning/40 transition-colors duration-200">
                  <div>
                    <p className="text-amber-700 dark:text-warning font-medium text-sm lg:text-base">{t.settings.deleteConversations}</p>
                    <p className="text-xs lg:text-sm text-amber-600/70 dark:text-text-muted mt-0.5">
                      {t.settings.deleteConversationsDesc}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDeleteConversationsModal(true)}
                    className="shrink-0 hover:border-amber-400 dark:hover:border-warning/40 hover:text-amber-700 dark:hover:text-warning"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {t.common.delete}
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 lg:p-4 bg-error/5 rounded-xl border border-error/20 hover:border-error/40 transition-colors duration-200">
                  <div>
                    <p className="text-error font-medium text-sm lg:text-base">{t.settings.deleteAccount}</p>
                    <p className="text-xs lg:text-sm text-text-muted mt-0.5">
                      {t.settings.deleteAccountDesc}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                    className="shrink-0"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {t.common.delete}
                  </Button>
                </div>
              </div>
            </motion.section>

            {/* Legal links */}
            <motion.section
              variants={sectionVariants}
              className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4 md:p-5 lg:p-6 transition-colors duration-200"
            >
              <div className="flex items-center gap-3 mb-4 lg:mb-5">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gray-100 dark:bg-dark-hover flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-base lg:text-lg font-semibold text-silver-solid dark:text-white">{t.settings.legalDocuments}</h2>
              </div>
              <div className="space-y-2 lg:space-y-3">
                <a
                  href="/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 lg:p-4 bg-[#F8935D]/5 dark:bg-dark-bg rounded-xl border border-[#F8935D]/10 dark:border-dark-border hover:border-primary/30 transition-all duration-200 group"
                >
                  <span className="text-gray-900 dark:text-white text-sm lg:text-base group-hover:text-primary transition-colors">
                    {t.settings.privacyPolicy}
                  </span>
                  <svg className="w-4 h-4 lg:w-5 lg:h-5 text-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href="/legal/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 lg:p-4 bg-[#F8935D]/5 dark:bg-dark-bg rounded-xl border border-[#F8935D]/10 dark:border-dark-border hover:border-primary/30 transition-all duration-200 group"
                >
                  <span className="text-gray-900 dark:text-white text-sm lg:text-base group-hover:text-primary transition-colors">
                    {t.settings.termsOfUse}
                  </span>
                  <svg className="w-4 h-4 lg:w-5 lg:h-5 text-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href="/legal/notices"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 lg:p-4 bg-[#F8935D]/5 dark:bg-dark-bg rounded-xl border border-[#F8935D]/10 dark:border-dark-border hover:border-primary/30 transition-all duration-200 group"
                >
                  <span className="text-gray-900 dark:text-white text-sm lg:text-base group-hover:text-primary transition-colors">
                    {t.settings.legalNotices}
                  </span>
                  <svg className="w-4 h-4 lg:w-5 lg:h-5 text-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href="/legal/cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 lg:p-4 bg-[#F8935D]/5 dark:bg-dark-bg rounded-xl border border-[#F8935D]/10 dark:border-dark-border hover:border-primary/30 transition-all duration-200 group"
                >
                  <span className="text-gray-900 dark:text-white text-sm lg:text-base group-hover:text-primary transition-colors">
                    {t.settings.cookiePolicy}
                  </span>
                  <svg className="w-4 h-4 lg:w-5 lg:h-5 text-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </motion.section>

            {/* Contact */}
            <motion.div
              variants={sectionVariants}
              className="text-center py-4 lg:py-6"
            >
              <p className="text-text-muted text-xs lg:text-sm mb-2">
                {t.settings.contactPrivacy}
              </p>
              <a
                href="mailto:postygroup@gmail.com"
                className="text-primary hover:text-accent transition-colors font-medium text-sm lg:text-base"
              >
                postygroup@gmail.com
              </a>
            </motion.div>
          </motion.div>

        {/* Bottom spacing */}
        <div className="h-12" />
      </div>

      {/* Delete confirmation modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        isGoogleUser={isGoogleUser}
      />

      {/* Delete conversations confirmation modal */}
      <DeleteConversationsModal
        isOpen={showDeleteConversationsModal}
        onClose={() => setShowDeleteConversationsModal(false)}
        onConfirm={handleDeleteConversations}
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute requireOnboarding requireSubscription>
      <SettingsContent />
    </ProtectedRoute>
  );
}
