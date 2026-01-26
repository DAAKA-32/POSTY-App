"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Button from "@/components/ui/Button";
import LinkedInConnectButton, { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import LinkedInDisconnectModal from "@/components/linkedin/LinkedInDisconnectModal";
import { isTokenExpired } from "@/lib/linkedin";
import { PLATFORM_INFO, Platform, PlanType } from "@/lib/plans";
import { canUsePlatform, canConnectPlatform, getAllPlatformsAccessStatus } from "@/lib/permissions";
import Link from "next/link";

// Platform icon colors for Tailwind classes
const platformColors: Record<Platform, { text: string; bg: string }> = {
  linkedin: { text: "text-[#0A66C2]", bg: "bg-[#0A66C2]/15" },
  reddit: { text: "text-[#FF4500]", bg: "bg-[#FF4500]/15" },
  instagram: { text: "text-[#E4405F]", bg: "bg-[#E4405F]/15" },
  facebook: { text: "text-[#1877F2]", bg: "bg-[#1877F2]/15" },
};

// Platform icons
const PlatformIcons: Record<Platform, React.FC<{ className?: string }>> = {
  linkedin: LinkedInIcon,
  reddit: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  ),
  instagram: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
    </svg>
  ),
  facebook: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
};

// Animation variants
const smoothEase = [0.22, 1, 0.36, 1] as const;

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: smoothEase },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: smoothEase } },
};

// Plan badge component
function PlanBadge({ plan, className = "" }: { plan: PlanType; className?: string }) {
  const colors = {
    free: "bg-text-muted/10 text-text-muted border-text-muted/20",
    pro: "bg-primary/10 text-primary border-primary/20",
    max: "bg-accent/10 text-accent border-accent/20",
  };

  const labels = {
    free: "Gratuit",
    pro: "Pro",
    max: "Max",
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${colors[plan]} ${className}`}>
      {labels[plan]}
    </span>
  );
}

// Connection status indicator
function ConnectionStatus({ connected, tokenValid }: { connected: boolean; tokenValid: boolean }) {
  if (!connected) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-text-muted">
        <span className="w-2 h-2 rounded-full bg-text-muted/40" />
        Non connecté
      </span>
    );
  }

  if (!tokenValid) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-warning">
        <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
        Session expirée
      </span>
    );
  }

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex items-center gap-1.5 text-xs text-accent"
    >
      <motion.span
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-2 h-2 rounded-full bg-accent"
      />
      Connecté
    </motion.span>
  );
}

export default function PlatformConnectionsSection() {
  const { t } = useLanguage();
  const { currentPlan, subscription } = useSubscription();
  const { connection: linkedInConnection, disconnectLinkedIn, isLoading: linkedInLoading } = useLinkedIn();

  const [showLinkedInDisconnectModal, setShowLinkedInDisconnectModal] = useState(false);

  // Get all platforms access status
  const platformsStatus = getAllPlatformsAccessStatus(subscription);

  // LinkedIn specific checks
  const linkedInTokenValid = linkedInConnection
    ? !isTokenExpired(linkedInConnection.expiresAt.toDate())
    : false;

  // Count connected platforms
  const connectedCount = linkedInConnection ? 1 : 0; // Will expand when other contexts are added

  // Get max connections for current plan
  const connectionResult = canConnectPlatform(subscription, connectedCount);

  const handleLinkedInDisconnect = async () => {
    await disconnectLinkedIn();
    setShowLinkedInDisconnectModal(false);
  };

  // Render platform card
  const renderPlatformCard = (platform: Platform) => {
    const info = PLATFORM_INFO[platform];
    const Icon = PlatformIcons[platform];
    const colors = platformColors[platform];
    const access = platformsStatus.find(p => p.platform === platform);
    const hasAccess = access?.hasAccess ?? false;
    const requiredPlan = info.minPlan;

    // Check if this platform is connected
    const isConnected = platform === "linkedin" && !!linkedInConnection;
    const isTokenValid = platform === "linkedin" ? linkedInTokenValid : false;
    const connectionData = platform === "linkedin" ? linkedInConnection : null;
    const isLoading = platform === "linkedin" ? linkedInLoading : false;

    return (
      <motion.div
        key={platform}
        variants={itemVariants}
        className={`
          relative p-4 rounded-xl border transition-all duration-200
          ${hasAccess
            ? "bg-dark-bg border-dark-border hover:border-primary/20"
            : "bg-dark-bg/50 border-dark-border/50"
          }
        `}
      >
        {/* Locked overlay for inaccessible platforms */}
        {!hasAccess && (
          <div className="absolute inset-0 bg-dark-bg/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10">
            <div className="text-center px-4">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-dark-hover flex items-center justify-center">
                <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-sm text-text-muted mb-2">
                Requiert <PlanBadge plan={requiredPlan} />
              </p>
              <Link
                href="/subscription"
                className="text-xs text-primary hover:text-accent transition-colors"
              >
                Voir les plans →
              </Link>
            </div>
          </div>
        )}

        {/* Platform header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}>
              <Icon className={`w-5 h-5 ${colors.text}`} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">{info.name}</h3>
              <p className="text-xs text-text-muted">{info.description}</p>
            </div>
          </div>
          {requiredPlan !== "free" && (
            <PlanBadge plan={requiredPlan} />
          )}
        </div>

        {/* Connection status / action */}
        {hasAccess && (
          <div className="mt-3 pt-3 border-t border-dark-border">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className={`w-4 h-4 border-2 border-t-transparent rounded-full ${colors.text}`}
                />
                <span className="text-xs text-text-muted">Chargement...</span>
              </div>
            ) : isConnected && connectionData ? (
              <div className="space-y-3">
                {/* Connected profile */}
                <div className="flex items-center gap-3">
                  {connectionData.profilePicture ? (
                    <img
                      src={connectionData.profilePicture}
                      alt={connectionData.profileName}
                      className={`w-8 h-8 rounded-full object-cover border-2 border-[#0A66C2]`}
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.bg}`}>
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {connectionData.profileName}
                    </p>
                    <ConnectionStatus connected={true} tokenValid={isTokenValid} />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLinkedInDisconnectModal(true)}
                    className="text-text-muted hover:text-error hover:bg-error/10"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </Button>
                </div>

                {/* Token expired warning */}
                {!isTokenValid && (
                  <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/20 rounded-lg">
                    <svg className="w-4 h-4 text-warning shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-xs text-warning font-medium">Session expirée</p>
                      <p className="text-xs text-text-muted mt-0.5">Reconnectez-vous pour publier</p>
                    </div>
                  </div>
                )}

                {/* Reconnect button if token expired */}
                {!isTokenValid && platform === "linkedin" && (
                  <LinkedInConnectButton variant="compact" className="w-full" />
                )}
              </div>
            ) : (
              /* Not connected - show connect button */
              <div>
                <ConnectionStatus connected={false} tokenValid={false} />
                {platform === "linkedin" ? (
                  <LinkedInConnectButton variant="compact" className="w-full mt-3" />
                ) : platform === "instagram" || platform === "facebook" ? (
                  <div className="mt-3 space-y-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled
                      className="w-full opacity-60"
                    >
                      <Icon className={`w-4 h-4 mr-2 ${colors.text}`} />
                      Très prochainement
                    </Button>
                    <p className="text-[10px] text-text-muted text-center leading-relaxed px-2">
                      L'équipe Posty travaille activement sur cette intégration. Nous nous excusons pour l'attente.
                    </p>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled
                    className="w-full mt-3 opacity-50"
                  >
                    <Icon className={`w-4 h-4 mr-2 ${colors.text}`} />
                    Bientôt disponible
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <>
      <motion.section
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="group bg-dark-card border border-dark-border hover:border-primary/20 rounded-xl p-4 md:p-5 lg:p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(232,147,77,0.08)]"
      >
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5 lg:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20 flex items-center justify-center group-hover:shadow-glow transition-shadow duration-300">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-white">Plateformes connectées</h2>
              <p className="text-xs lg:text-sm text-text-muted mt-0.5">
                Gérez vos connexions aux réseaux sociaux
              </p>
            </div>
          </div>
          {/* Security Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent/10 border border-accent/20 rounded-lg">
            <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs text-accent font-medium hidden sm:inline">Sécurisé</span>
          </div>
        </div>

        {/* Connection Limit Info */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between p-3 mb-5 bg-dark-bg rounded-xl border border-dark-border"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-white font-medium">Connexions utilisées</p>
              <p className="text-xs text-text-muted">
                {currentPlan === "max" ? "Illimitées" : `${connectedCount} sur ${currentPlan === "pro" ? 2 : 1}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-primary">{connectedCount}</p>
            <p className="text-xs text-text-muted">
              / {currentPlan === "max" ? "∞" : currentPlan === "pro" ? "2" : "1"}
            </p>
          </div>
        </motion.div>

        {/* Plan Benefits Info */}
        {currentPlan === "free" && (
          <motion.div
            variants={itemVariants}
            className="flex items-start gap-3 p-3 mb-5 bg-primary/5 border border-primary/20 rounded-xl"
          >
            <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <p className="text-sm text-white font-medium">Débloquez plus de plateformes</p>
              <p className="text-xs text-text-muted mt-1">
                Passez à <span className="text-primary font-medium">Pro</span> pour Reddit ou{" "}
                <span className="text-accent font-medium">Max</span> pour toutes les plateformes.
              </p>
              <Link
                href="/subscription"
                className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:text-accent transition-colors"
              >
                Voir les plans
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Platform Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["linkedin", "reddit", "instagram", "facebook"] as Platform[]).map(renderPlatformCard)}
        </div>

        {/* Security Notice */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3 p-3 mt-5 bg-accent/5 border border-accent/10 rounded-xl"
        >
          <svg className="w-5 h-5 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-xs lg:text-sm text-text-secondary">
            Vos identifiants sont chiffrés et ne sont jamais stockés. Nous utilisons OAuth 2.0 pour une connexion sécurisée.
          </p>
        </motion.div>
      </motion.section>

      {/* LinkedIn Disconnect Modal */}
      <LinkedInDisconnectModal
        isOpen={showLinkedInDisconnectModal}
        onClose={() => setShowLinkedInDisconnectModal(false)}
        onConfirm={handleLinkedInDisconnect}
        profileName={linkedInConnection?.profileName}
      />
    </>
  );
}
