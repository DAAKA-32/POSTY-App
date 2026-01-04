"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserConsent,
  saveUserConsent,
  exportUserData,
  withdrawConsent,
  UserConsent,
} from "@/lib/firestore";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import Button from "@/components/ui/Button";
import DeleteAccountModal from "@/components/ui/DeleteAccountModal";
import LinkedInConnectButton, { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import LinkedInDisconnectModal from "@/components/linkedin/LinkedInDisconnectModal";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { isTokenExpired } from "@/lib/linkedin";
import toast from "react-hot-toast";

// Animation variants for staggered sections
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// Toggle Switch Component
function ToggleSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`
        relative w-12 h-6 md:w-14 md:h-7 rounded-full transition-all duration-200
        ${enabled ? "bg-accent" : "bg-dark-border"}
      `}
    >
      <motion.span
        animate={{ x: enabled ? 24 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-sm"
      />
    </button>
  );
}

function SettingsContent() {
  const { user, userProfile, deleteUserAccount, signOut } = useAuth();
  const { connection: linkedInConnection, disconnectLinkedIn, isLoading: linkedInLoading } = useLinkedIn();
  const router = useRouter();
  const [consent, setConsent] = useState<UserConsent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLinkedInDisconnectModal, setShowLinkedInDisconnectModal] = useState(false);

  // Check if user signed in with Google
  const isGoogleUser = user?.providerData.some(
    (provider) => provider.providerId === "google.com"
  ) ?? false;

  // Check LinkedIn token status
  const linkedInTokenValid = linkedInConnection
    ? !isTokenExpired(linkedInConnection.expiresAt.toDate())
    : false;

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

  const handleConsentChange = async (key: "analytics" | "marketing", value: boolean) => {
    if (!user) return;

    try {
      await saveUserConsent(user.uid, {
        privacyPolicy: consent?.privacyPolicy ?? true,
        termsOfService: consent?.termsOfService ?? true,
        analytics: key === "analytics" ? value : (consent?.analytics ?? false),
        marketing: key === "marketing" ? value : (consent?.marketing ?? false),
      });

      setConsent((prev) =>
        prev
          ? { ...prev, [key]: value }
          : {
              userId: user.uid,
              privacyPolicy: true,
              termsOfService: true,
              analytics: key === "analytics" ? value : false,
              marketing: key === "marketing" ? value : false,
            } as UserConsent
      );

      toast.success("Preferences mises a jour");
    } catch (error) {
      console.error("Error updating consent:", error);
      toast.error("Erreur lors de la mise a jour");
    }
  };

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

      toast.success("Donnees exportees avec succes");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (password: string) => {
    if (!user) return;

    await deleteUserAccount(password);
    setShowDeleteModal(false);
    toast.success("Compte supprime avec succes");

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
      toast.success("Consentement retire");
    } catch (error) {
      console.error("Error withdrawing consent:", error);
      toast.error("Erreur lors du retrait du consentement");
    }
  };

  const handleLinkedInDisconnect = async () => {
    await disconnectLinkedIn();
    // Toast is handled by LinkedInContext
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Deconnexion reussie");
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Erreur lors de la deconnexion");
    }
  };

  if (isLoading) {
    return (
      <MainLayout showMobileHeader={true} headerTitle="Parametres">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm md:text-base">Chargement...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showMobileHeader={true} headerTitle="Parametres">
      <div className="h-full overflow-y-auto bg-background scroll-smooth">
        {/*
          Responsive container
          - Mobile: px-4, compact
          - Tablet (md): px-6, max-w-2xl
          - Desktop (lg): px-8, max-w-3xl
          - Large (xl): max-w-4xl
        */}
        <div className="
          w-full mx-auto
          px-4 py-6
          md:px-6 md:py-8 md:max-w-2xl
          lg:px-8 lg:py-10 lg:max-w-3xl
          xl:py-12 xl:max-w-4xl
        ">
          {/* Header - Desktop only */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden lg:block mb-8 xl:mb-10"
          >
            <h1 className="text-2xl xl:text-3xl font-bold text-white mb-1">
              Parametres
            </h1>
            <p className="text-text-secondary md:text-lg">
              Gerez vos connexions et preferences
            </p>
          </motion.div>

          {/* Sections with staggered animation */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 md:space-y-5 lg:space-y-6"
          >
            {/* External Connections Section */}
            <motion.section
              variants={sectionVariants}
              className="bg-dark-card border border-dark-border rounded-xl p-4 md:p-5 lg:p-6"
            >
              {/* Section Header with Security Badge */}
              <div className="flex items-center justify-between mb-5 lg:mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base lg:text-lg font-semibold text-white">Connexions externes</h2>
                    <p className="text-xs lg:text-sm text-text-muted">
                      Gerez vos comptes connectes
                    </p>
                  </div>
                </div>
                {/* Security Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent/10 border border-accent/20 rounded-lg">
                  <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-xs text-accent font-medium hidden sm:inline">Securise</span>
                </div>
              </div>

              {/* Security Message */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 p-3 mb-5 bg-accent/5 border border-accent/10 rounded-xl"
              >
                <svg className="w-5 h-5 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-xs lg:text-sm text-text-secondary">
                  Vos connexions sont securisees. Les tokens d&apos;acces sont chiffres et stockes de maniere securisee.
                </p>
              </motion.div>

              {/* LinkedIn Connection */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center">
                    <LinkedInIcon className="w-4 h-4 text-[#0A66C2]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">LinkedIn</h3>
                    <p className="text-xs text-text-muted">Publiez vos posts directement</p>
                  </div>
                </div>

                {linkedInLoading ? (
                  <div className="flex items-center gap-3 p-4 bg-dark-bg rounded-xl">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-[#0A66C2] border-t-transparent rounded-full"
                    />
                    <span className="text-text-secondary text-sm">Chargement...</span>
                  </div>
                ) : linkedInConnection ? (
                  <div className="space-y-3">
                    {/* Connected profile */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-dark-bg rounded-xl border border-dark-border"
                    >
                      {linkedInConnection.profilePicture ? (
                        <motion.img
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          src={linkedInConnection.profilePicture}
                          alt={linkedInConnection.profileName}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-[#0A66C2]"
                        />
                      ) : (
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#0A66C2]/20 flex items-center justify-center">
                          <LinkedInIcon className="w-5 h-5 md:w-6 md:h-6 text-[#0A66C2]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm md:text-base truncate">
                          {linkedInConnection.profileName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {linkedInTokenValid ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex items-center gap-1.5"
                            >
                              <motion.span
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-2 h-2 bg-accent rounded-full"
                              />
                              <span className="text-xs text-accent">Connecte</span>
                            </motion.div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                              <span className="text-xs text-warning">Session expiree</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowLinkedInDisconnectModal(true)}
                        className="hover:bg-error/10 hover:text-error hover:border-error/20 transition-colors"
                      >
                        Deconnecter
                      </Button>
                    </motion.div>

                    {/* Token expired warning */}
                    {!linkedInTokenValid && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="flex items-start gap-3 p-3 md:p-4 bg-warning/10 border border-warning/20 rounded-xl"
                      >
                        <svg className="w-5 h-5 text-warning shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-warning font-medium text-sm">Session expiree</p>
                          <p className="text-text-muted text-xs mt-1">
                            Reconnectez-vous pour pouvoir publier sur LinkedIn.
                          </p>
                          <LinkedInConnectButton className="mt-3" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 md:p-4 bg-dark-bg rounded-xl border border-dark-border border-dashed"
                  >
                    <p className="text-text-secondary text-sm mb-4">
                      Connectez votre compte LinkedIn pour publier vos posts en un clic.
                    </p>
                    <LinkedInConnectButton />
                  </motion.div>
                )}
              </div>

              {/* Divider */}
              <div className="my-5 border-t border-dark-border" />

              {/* Google Connection (Placeholder) */}
              <div className="space-y-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">Google</h3>
                      <p className="text-xs text-text-muted">Synchronisation contacts</p>
                    </div>
                  </div>
                  <span className="text-xs text-text-muted bg-dark-hover px-2.5 py-1 rounded-lg">Bientot</span>
                </div>
                <div className="p-3 md:p-4 bg-dark-bg/50 rounded-xl border border-dark-border border-dashed">
                  <p className="text-text-muted text-sm">
                    La connexion Google sera disponible prochainement pour synchroniser vos contacts.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* Data collected section */}
            <motion.section
              variants={sectionVariants}
              className="bg-dark-card border border-dark-border rounded-xl p-4 md:p-5 lg:p-6"
            >
              <div className="flex items-center gap-3 mb-4 lg:mb-5">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-base lg:text-lg font-semibold text-white">Donnees collectees</h2>
              </div>
              <div className="space-y-0 divide-y divide-dark-border">
                <div className="flex items-center justify-between py-3 lg:py-4">
                  <span className="text-text-secondary text-sm lg:text-base">Email</span>
                  <span className="text-white font-medium text-sm lg:text-base truncate max-w-[180px] lg:max-w-none">
                    {user?.email}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 lg:py-4">
                  <span className="text-text-secondary text-sm lg:text-base">Nom</span>
                  <span className="text-white font-medium text-sm lg:text-base">
                    {userProfile?.displayName || "Non renseigne"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 lg:py-4">
                  <span className="text-text-secondary text-sm lg:text-base">Secteur</span>
                  <span className="text-white font-medium text-sm lg:text-base">
                    {userProfile?.profile?.sector || "Non renseigne"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 lg:py-4">
                  <span className="text-text-secondary text-sm lg:text-base">Role</span>
                  <span className="text-white font-medium text-sm lg:text-base">
                    {userProfile?.profile?.role || "Non renseigne"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 lg:py-4">
                  <span className="text-text-secondary text-sm lg:text-base">Style LinkedIn</span>
                  <span className="text-white font-medium text-sm lg:text-base">
                    {userProfile?.profile?.linkedinStyle || "Non renseigne"}
                  </span>
                </div>
              </div>
              <Link
                href="/profile"
                className="
                  inline-flex items-center gap-2 mt-4 px-4 py-2.5
                  text-sm lg:text-base text-primary hover:text-accent
                  bg-primary/5 hover:bg-primary/10
                  rounded-xl transition-all duration-200
                "
              >
                Modifier mon profil
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </motion.section>

            {/* Consent preferences */}
            <motion.section
              variants={sectionVariants}
              className="bg-dark-card border border-dark-border rounded-xl p-4 md:p-5 lg:p-6"
            >
              <div className="flex items-center gap-3 mb-4 lg:mb-5">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-base lg:text-lg font-semibold text-white">Preferences de consentement</h2>
              </div>
              <div className="space-y-3 lg:space-y-4">
                <div className="flex items-center justify-between p-3 lg:p-4 bg-dark-bg rounded-xl">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-white font-medium text-sm lg:text-base">Analytics</p>
                    <p className="text-xs lg:text-sm text-text-muted mt-0.5">Nous aide a ameliorer le service</p>
                  </div>
                  <ToggleSwitch
                    enabled={consent?.analytics ?? false}
                    onChange={() => handleConsentChange("analytics", !consent?.analytics)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 lg:p-4 bg-dark-bg rounded-xl">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-white font-medium text-sm lg:text-base">Communications marketing</p>
                    <p className="text-xs lg:text-sm text-text-muted mt-0.5">Recevoir des emails promotionnels</p>
                  </div>
                  <ToggleSwitch
                    enabled={consent?.marketing ?? false}
                    onChange={() => handleConsentChange("marketing", !consent?.marketing)}
                  />
                </div>
              </div>
              <button
                onClick={handleWithdrawConsent}
                className="mt-4 text-xs lg:text-sm text-text-muted hover:text-error transition-colors"
              >
                Retirer tous les consentements optionnels
              </button>
            </motion.section>

            {/* Your rights */}
            <motion.section
              variants={sectionVariants}
              className="bg-dark-card border border-dark-border rounded-xl p-4 md:p-5 lg:p-6"
            >
              <div className="flex items-center gap-3 mb-4 lg:mb-5">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-base lg:text-lg font-semibold text-white">Vos droits RGPD</h2>
              </div>
              <div className="grid gap-2 md:gap-3 grid-cols-2 lg:grid-cols-4">
                <div className="p-3 lg:p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <p className="text-white font-medium text-xs lg:text-sm">Droit d&apos;acces</p>
                  <p className="text-xs text-text-muted mt-0.5 lg:mt-1">Voir vos donnees</p>
                </div>
                <div className="p-3 lg:p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <p className="text-white font-medium text-xs lg:text-sm">Droit de rectification</p>
                  <p className="text-xs text-text-muted mt-0.5 lg:mt-1">Corriger vos infos</p>
                </div>
                <div className="p-3 lg:p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <p className="text-white font-medium text-xs lg:text-sm">Droit a l&apos;effacement</p>
                  <p className="text-xs text-text-muted mt-0.5 lg:mt-1">Supprimer vos donnees</p>
                </div>
                <div className="p-3 lg:p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <p className="text-white font-medium text-xs lg:text-sm">Droit a la portabilite</p>
                  <p className="text-xs text-text-muted mt-0.5 lg:mt-1">Exporter vos donnees</p>
                </div>
              </div>
            </motion.section>

            {/* Actions */}
            <motion.section
              variants={sectionVariants}
              className="bg-dark-card border border-dark-border rounded-xl p-4 md:p-5 lg:p-6"
            >
              <div className="flex items-center gap-3 mb-4 lg:mb-5">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-base lg:text-lg font-semibold text-white">Actions</h2>
              </div>
              <div className="space-y-3 lg:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 lg:p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <div>
                    <p className="text-white font-medium text-sm lg:text-base">Exporter mes donnees</p>
                    <p className="text-xs lg:text-sm text-text-muted mt-0.5">
                      Telecharger toutes vos donnees au format JSON
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleExportData}
                    isLoading={isExporting}
                    className="shrink-0"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exporter
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 lg:p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <div>
                    <p className="text-white font-medium text-sm lg:text-base">Se deconnecter</p>
                    <p className="text-xs lg:text-sm text-text-muted mt-0.5">
                      Deconnectez-vous de votre compte POSTY
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleLogout}
                    className="shrink-0"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Deconnexion
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 lg:p-4 bg-error/5 rounded-xl border border-error/20">
                  <div>
                    <p className="text-error font-medium text-sm lg:text-base">Supprimer mon compte</p>
                    <p className="text-xs lg:text-sm text-text-muted mt-0.5">
                      Supprime definitivement votre compte et toutes vos donnees
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
                    Supprimer
                  </Button>
                </div>
              </div>
            </motion.section>

            {/* Legal links */}
            <motion.section
              variants={sectionVariants}
              className="bg-dark-card border border-dark-border rounded-xl p-4 md:p-5 lg:p-6"
            >
              <div className="flex items-center gap-3 mb-4 lg:mb-5">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-text-muted/10 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-base lg:text-lg font-semibold text-white">Documents legaux</h2>
              </div>
              <div className="space-y-2 lg:space-y-3">
                <a
                  href="/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 lg:p-4 bg-dark-bg rounded-xl border border-dark-border hover:border-primary/30 transition-all duration-200 group"
                >
                  <span className="text-white text-sm lg:text-base group-hover:text-primary transition-colors">
                    Politique de confidentialite
                  </span>
                  <svg className="w-4 h-4 lg:w-5 lg:h-5 text-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href="/legal/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 lg:p-4 bg-dark-bg rounded-xl border border-dark-border hover:border-primary/30 transition-all duration-200 group"
                >
                  <span className="text-white text-sm lg:text-base group-hover:text-primary transition-colors">
                    Conditions d&apos;utilisation
                  </span>
                  <svg className="w-4 h-4 lg:w-5 lg:h-5 text-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href="/legal/notices"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 lg:p-4 bg-dark-bg rounded-xl border border-dark-border hover:border-primary/30 transition-all duration-200 group"
                >
                  <span className="text-white text-sm lg:text-base group-hover:text-primary transition-colors">
                    Mentions legales
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
                Pour toute question concernant vos donnees :
              </p>
              <a
                href="mailto:privacy@posty.app"
                className="text-primary hover:text-accent transition-colors font-medium text-sm lg:text-base"
              >
                privacy@posty.app
              </a>
            </motion.div>
          </motion.div>

          {/* Bottom spacing for mobile navigation */}
          <div className="h-20 md:h-8" />
        </div>
      </div>

      {/* Delete confirmation modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        isGoogleUser={isGoogleUser}
      />

      {/* LinkedIn disconnect confirmation modal */}
      <LinkedInDisconnectModal
        isOpen={showLinkedInDisconnectModal}
        onClose={() => setShowLinkedInDisconnectModal(false)}
        onConfirm={handleLinkedInDisconnect}
        profileName={linkedInConnection?.profileName}
      />
    </MainLayout>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
