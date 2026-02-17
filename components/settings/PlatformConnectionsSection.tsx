"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useFacebook } from "@/contexts/FacebookContext";
import { useThreads } from "@/contexts/ThreadsContext";
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
  threads: { text: "text-black dark:text-white", bg: "bg-black/10 dark:bg-white/15" },
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
  threads: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.187.408-2.26 1.33-3.017.88-.724 2.107-1.138 3.552-1.199 1.07-.044 2.064.068 2.967.315-.024-1.058-.175-1.878-.453-2.45-.354-.73-.942-1.1-1.746-1.1h-.075c-.596.02-1.09.218-1.468.591-.33.326-.53.77-.59 1.318l-2.07-.248c.101-.886.476-1.653 1.084-2.22.71-.662 1.652-1.013 2.723-1.054h.11c1.387 0 2.467.522 3.213 1.552.637.88.975 2.106 1.005 3.648v.156c1.145.504 2.06 1.265 2.652 2.226.756 1.227.911 2.759.436 4.313-.59 1.93-1.776 3.404-3.438 4.267-1.457.756-3.24 1.156-5.3 1.19zm-1.042-6.594c-.036 0-.072 0-.108.002-.982.053-1.74.358-2.19.882-.403.47-.583 1.04-.549 1.686.044.822.457 1.397 1.127 1.83.618.4 1.42.583 2.198.543 1.122-.06 1.98-.46 2.546-1.166.49-.61.82-1.49.954-2.553-.946-.326-2.024-.485-3.123-.485-.288 0-.576.013-.855.038v.223z" />
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
  const {
    connection: facebookConnection,
    isTokenValid: facebookTokenValid,
    isLoading: facebookLoading,
    connectFacebook,
    disconnectFacebook,
    profileName: facebookProfileName,
    profilePicture: facebookProfilePicture,
  } = useFacebook();
  const {
    connection: threadsConnection,
    isTokenValid: threadsTokenValid,
    isLoading: threadsLoading,
    connectThreads,
    disconnectThreads,
    profileName: threadsProfileName,
    profilePicture: threadsProfilePicture,
    username: threadsUsername,
  } = useThreads();

  const [showLinkedInDisconnectModal, setShowLinkedInDisconnectModal] = useState(false);
  const [showFacebookDisconnectConfirm, setShowFacebookDisconnectConfirm] = useState(false);
  const [showThreadsDisconnectConfirm, setShowThreadsDisconnectConfirm] = useState(false);

  // Get all platforms access status
  const platformsStatus = getAllPlatformsAccessStatus(subscription);

  // LinkedIn specific checks
  const linkedInTokenValid = linkedInConnection
    ? !isTokenExpired(linkedInConnection.expiresAt.toDate())
    : false;

  // Count connected platforms
  const connectedCount =
    (linkedInConnection ? 1 : 0) +
    (facebookConnection ? 1 : 0) +
    (threadsConnection ? 1 : 0);

  // Get max connections for current plan
  const connectionResult = canConnectPlatform(subscription, connectedCount);

  const handleLinkedInDisconnect = async () => {
    await disconnectLinkedIn();
    setShowLinkedInDisconnectModal(false);
  };

  const handleFacebookDisconnect = async () => {
    await disconnectFacebook();
    setShowFacebookDisconnectConfirm(false);
  };

  const handleThreadsDisconnect = async () => {
    await disconnectThreads();
    setShowThreadsDisconnectConfirm(false);
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
    const isConnected =
      platform === "linkedin" ? !!linkedInConnection
      : platform === "facebook" ? !!facebookConnection
      : platform === "threads" ? !!threadsConnection
      : false;
    const isTokenValid =
      platform === "linkedin" ? linkedInTokenValid
      : platform === "facebook" ? facebookTokenValid
      : platform === "threads" ? threadsTokenValid
      : false;
    const connectionData =
      platform === "linkedin" ? linkedInConnection
      : platform === "facebook" ? facebookConnection
      : platform === "threads" ? threadsConnection
      : null;
    const isLoading =
      platform === "linkedin" ? linkedInLoading
      : platform === "facebook" ? facebookLoading
      : platform === "threads" ? threadsLoading
      : false;

    return (
      <motion.div
        key={platform}
        variants={itemVariants}
        className={`
          relative p-4 rounded-xl border transition-all duration-200
          ${hasAccess
            ? "bg-gray-50 dark:bg-dark-bg border-gray-200 dark:border-dark-border hover:border-primary/20"
            : "bg-gray-50/50 dark:bg-dark-bg/50 border-gray-200/50 dark:border-dark-border/50"
          }
        `}
      >
        {/* Locked overlay for inaccessible platforms */}
        {!hasAccess && (
          <div className="absolute inset-0 bg-white/60 dark:bg-dark-bg/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10">
            <div className="text-center px-4">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 dark:bg-dark-hover flex items-center justify-center">
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
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">{info.name}</h3>
              <p className="text-xs text-text-muted">{info.description}</p>
            </div>
          </div>
          {requiredPlan !== "free" && (
            <PlanBadge plan={requiredPlan} />
          )}
        </div>

        {/* Connection status / action */}
        {hasAccess && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-border">
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
                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 dark:border-dark-border"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.bg}`}>
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                      {connectionData.profileName}
                    </p>
                    {"username" in connectionData && (connectionData as any).username && (
                      <p className="text-xs text-text-muted truncate">@{(connectionData as any).username}</p>
                    )}
                    <ConnectionStatus connected={true} tokenValid={isTokenValid} />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (platform === "linkedin") setShowLinkedInDisconnectModal(true);
                      else if (platform === "facebook") setShowFacebookDisconnectConfirm(true);
                      else if (platform === "threads") setShowThreadsDisconnectConfirm(true);
                    }}
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
                {!isTokenValid && platform === "facebook" && (
                  <Button variant="secondary" size="sm" onClick={connectFacebook} className="w-full">
                    <Icon className={`w-4 h-4 mr-2 ${colors.text}`} />
                    Reconnecter Facebook
                  </Button>
                )}
                {!isTokenValid && platform === "threads" && (
                  <Button variant="secondary" size="sm" onClick={connectThreads} className="w-full">
                    <Icon className={`w-4 h-4 mr-2 ${colors.text}`} />
                    Reconnecter Threads
                  </Button>
                )}
              </div>
            ) : (
              /* Not connected - show connect button */
              <div>
                <ConnectionStatus connected={false} tokenValid={false} />
                {platform === "linkedin" ? (
                  <LinkedInConnectButton variant="compact" className="w-full mt-3" />
                ) : platform === "facebook" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={connectFacebook}
                    className="w-full mt-3"
                  >
                    <Icon className={`w-4 h-4 mr-2 ${colors.text}`} />
                    Connecter Facebook
                  </Button>
                ) : platform === "threads" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={connectThreads}
                    className="w-full mt-3"
                  >
                    <Icon className={`w-4 h-4 mr-2 ${colors.text}`} />
                    Connecter Threads
                  </Button>
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
        className="group bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border hover:border-primary/20 rounded-xl p-4 md:p-5 lg:p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(232,147,77,0.08)]"
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
              <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Plateformes connectées</h2>
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
          className="flex items-center justify-between p-3 mb-5 bg-gray-50 dark:bg-dark-bg rounded-xl border border-gray-200 dark:border-dark-border"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-900 dark:text-white font-medium">Connexions utilisées</p>
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
              <p className="text-sm text-gray-900 dark:text-white font-medium">Débloquez plus de plateformes</p>
              <p className="text-xs text-text-muted mt-1">
                Passez à <span className="text-primary font-medium">Pro</span> ou{" "}
                <span className="text-accent font-medium">Max</span> pour débloquer toutes les plateformes.
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
          {(["linkedin", "reddit", "threads", "facebook"] as Platform[]).map(renderPlatformCard)}
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

      {/* Facebook Disconnect Confirmation */}
      <AnimatePresence>
        {showFacebookDisconnectConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowFacebookDisconnectConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Déconnecter Facebook</h3>
              <p className="text-sm text-text-muted mb-4">
                Voulez-vous déconnecter {facebookProfileName || "votre compte Facebook"} ? Vous pourrez vous reconnecter à tout moment.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={() => setShowFacebookDisconnectConfirm(false)} className="flex-1">
                  Annuler
                </Button>
                <Button variant="primary" size="sm" onClick={handleFacebookDisconnect} className="flex-1 !bg-error hover:!bg-error/80">
                  Déconnecter
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Threads Disconnect Confirmation */}
      <AnimatePresence>
        {showThreadsDisconnectConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowThreadsDisconnectConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Déconnecter Threads</h3>
              <p className="text-sm text-text-muted mb-4">
                Voulez-vous déconnecter {threadsUsername ? `@${threadsUsername}` : threadsProfileName || "votre compte Threads"} ? Vous pourrez vous reconnecter à tout moment.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={() => setShowThreadsDisconnectConfirm(false)} className="flex-1">
                  Annuler
                </Button>
                <Button variant="primary" size="sm" onClick={handleThreadsDisconnect} className="flex-1 !bg-error hover:!bg-error/80">
                  Déconnecter
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
