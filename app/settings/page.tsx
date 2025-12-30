"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { isTokenExpired } from "@/lib/linkedin";
import toast from "react-hot-toast";

function SettingsContent() {
  const { user, userProfile, deleteUserAccount } = useAuth();
  const { connection: linkedInConnection, disconnectLinkedIn, isLoading: linkedInLoading } = useLinkedIn();
  const router = useRouter();
  const [consent, setConsent] = useState<UserConsent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  if (isLoading) {
    return (
      <MainLayout showMobileHeader={true} headerTitle="Parametres">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Chargement...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showMobileHeader={true} headerTitle="Parametres">
      <div className="h-full overflow-y-auto bg-background">
        <div className="max-w-2xl xl:max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-12">
          {/* Header */}
          <div className="hidden lg:block mb-8 xl:mb-12">
            <h1 className="text-2xl xl:text-3xl font-bold text-white mb-2">
              Parametres
            </h1>
            <p className="text-text-secondary xl:text-lg">
              Gerez vos connexions et preferences
            </p>
          </div>

          {/* LinkedIn Connection Section */}
          <section className="mb-6 bg-dark-card border border-dark-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#0A66C2]/10 flex items-center justify-center">
                <LinkedInIcon className="w-5 h-5 text-[#0A66C2]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">LinkedIn</h2>
                <p className="text-xs text-text-muted">
                  Publiez vos posts directement sur LinkedIn
                </p>
              </div>
            </div>

            {linkedInLoading ? (
              <div className="flex items-center gap-3 p-4 bg-dark-bg rounded-xl">
                <div className="w-5 h-5 border-2 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
                <span className="text-text-secondary text-sm">Chargement...</span>
              </div>
            ) : linkedInConnection ? (
              <div className="space-y-4">
                {/* Connected profile */}
                <div className="flex items-center gap-4 p-4 bg-dark-bg rounded-xl">
                  {linkedInConnection.profilePicture ? (
                    <img
                      src={linkedInConnection.profilePicture}
                      alt={linkedInConnection.profileName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#0A66C2]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#0A66C2]/20 flex items-center justify-center">
                      <LinkedInIcon className="w-6 h-6 text-[#0A66C2]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {linkedInConnection.profileName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {linkedInTokenValid ? (
                        <>
                          <span className="w-2 h-2 bg-accent rounded-full" />
                          <span className="text-xs text-accent">Connecte</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 bg-warning rounded-full" />
                          <span className="text-xs text-warning">Session expiree</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={disconnectLinkedIn}
                  >
                    Deconnecter
                  </Button>
                </div>

                {/* Token expired warning */}
                {!linkedInTokenValid && (
                  <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl">
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
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-dark-bg rounded-xl">
                <p className="text-text-secondary text-sm mb-4">
                  Connectez votre compte LinkedIn pour publier vos posts en un clic.
                </p>
                <LinkedInConnectButton />
              </div>
            )}
          </section>

          {/* Data collected section */}
          <section className="mb-6 bg-dark-card border border-dark-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Donnees collectees</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-3 border-b border-dark-border">
                <span className="text-text-secondary">Email</span>
                <span className="text-white font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-dark-border">
                <span className="text-text-secondary">Nom</span>
                <span className="text-white font-medium">
                  {userProfile?.displayName || "Non renseigne"}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-dark-border">
                <span className="text-text-secondary">Secteur</span>
                <span className="text-white font-medium">
                  {userProfile?.profile?.sector || "Non renseigne"}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-dark-border">
                <span className="text-text-secondary">Role</span>
                <span className="text-white font-medium">
                  {userProfile?.profile?.role || "Non renseigne"}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-text-secondary">Style LinkedIn</span>
                <span className="text-white font-medium">
                  {userProfile?.profile?.linkedinStyle || "Non renseigne"}
                </span>
              </div>
            </div>
            <Link
              href="/profile"
              className="
                inline-flex items-center gap-2 mt-4 px-4 py-2
                text-sm text-primary hover:text-accent
                bg-primary/5 hover:bg-primary/10
                rounded-xl transition-all duration-200
              "
            >
              Modifier mon profil
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </section>

          {/* Consent preferences */}
          <section className="mb-6 bg-dark-card border border-dark-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Preferences de consentement</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-dark-bg rounded-xl">
                <div>
                  <p className="text-white font-medium">Analytics</p>
                  <p className="text-xs text-text-muted mt-0.5">Nous aide a ameliorer le service</p>
                </div>
                <button
                  onClick={() => handleConsentChange("analytics", !consent?.analytics)}
                  className={`
                    relative w-14 h-7 rounded-full transition-all duration-200
                    ${consent?.analytics ? "bg-accent" : "bg-dark-border"}
                  `}
                >
                  <span
                    className={`
                      absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200
                      ${consent?.analytics ? "left-8" : "left-1"}
                    `}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-bg rounded-xl">
                <div>
                  <p className="text-white font-medium">Communications marketing</p>
                  <p className="text-xs text-text-muted mt-0.5">Recevoir des emails promotionnels</p>
                </div>
                <button
                  onClick={() => handleConsentChange("marketing", !consent?.marketing)}
                  className={`
                    relative w-14 h-7 rounded-full transition-all duration-200
                    ${consent?.marketing ? "bg-accent" : "bg-dark-border"}
                  `}
                >
                  <span
                    className={`
                      absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200
                      ${consent?.marketing ? "left-8" : "left-1"}
                    `}
                  />
                </button>
              </div>
            </div>
            <button
              onClick={handleWithdrawConsent}
              className="mt-4 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Retirer tous les consentements optionnels
            </button>
          </section>

          {/* Your rights */}
          <section className="mb-6 bg-dark-card border border-dark-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Vos droits RGPD</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                <p className="text-white font-medium text-sm">Droit d&apos;acces</p>
                <p className="text-xs text-text-muted mt-1">Voir vos donnees</p>
              </div>
              <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                <p className="text-white font-medium text-sm">Droit de rectification</p>
                <p className="text-xs text-text-muted mt-1">Corriger vos infos</p>
              </div>
              <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                <p className="text-white font-medium text-sm">Droit a l&apos;effacement</p>
                <p className="text-xs text-text-muted mt-1">Supprimer vos donnees</p>
              </div>
              <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                <p className="text-white font-medium text-sm">Droit a la portabilite</p>
                <p className="text-xs text-text-muted mt-1">Exporter vos donnees</p>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="mb-6 bg-dark-card border border-dark-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Actions</h2>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-dark-bg rounded-xl border border-dark-border">
                <div>
                  <p className="text-white font-medium">Exporter mes donnees</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Telecharger toutes vos donnees au format JSON
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportData}
                  isLoading={isExporting}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Exporter
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-error/5 rounded-xl border border-error/20">
                <div>
                  <p className="text-error font-medium">Supprimer mon compte</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Supprime definitivement votre compte et toutes vos donnees
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer
                </Button>
              </div>
            </div>
          </section>

          {/* Legal links */}
          <section className="mb-6 bg-dark-card border border-dark-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-text-muted/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Documents legaux</h2>
            </div>
            <div className="space-y-2">
              <Link
                href="/legal/privacy"
                className="flex items-center justify-between p-4 bg-dark-bg rounded-xl border border-dark-border hover:border-primary/30 transition-all duration-200 group"
              >
                <span className="text-white group-hover:text-primary transition-colors">Politique de confidentialite</span>
                <svg className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/legal/terms"
                className="flex items-center justify-between p-4 bg-dark-bg rounded-xl border border-dark-border hover:border-primary/30 transition-all duration-200 group"
              >
                <span className="text-white group-hover:text-primary transition-colors">Conditions d&apos;utilisation</span>
                <svg className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/legal/notices"
                className="flex items-center justify-between p-4 bg-dark-bg rounded-xl border border-dark-border hover:border-primary/30 transition-all duration-200 group"
              >
                <span className="text-white group-hover:text-primary transition-colors">Mentions legales</span>
                <svg className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </section>

          {/* Contact */}
          <div className="text-center py-6">
            <p className="text-text-muted text-sm mb-2">Pour toute question concernant vos donnees :</p>
            <a href="mailto:privacy@posty.app" className="text-primary hover:text-accent transition-colors font-medium">
              privacy@posty.app
            </a>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        isGoogleUser={isGoogleUser}
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
