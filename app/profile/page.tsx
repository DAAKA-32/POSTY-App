"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { updateUserProfile, getUserPosts, getUserSessions } from "@/lib/firestore";
import { DAILY_MESSAGE_LIMITS, SubscriptionPlan } from "@/types";
import { PlanType } from "@/lib/plans";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Button from "@/components/ui/Button";
import {
  ProfileHeader,
  ProfilePlanCard,
  ProfileStatsRow,
  ProfileSection,
  ProfileLinkedInCard,
  ProfileEditForm,
} from "@/components/profile";
import toast from "@/components/ui/Toast";

function ProfileContent() {
  const { user, userProfile, signOut, refreshUserProfile } = useAuth();
  const {
    isConnected: linkedInConnected,
    isTokenValid,
    profileName,
    profilePicture,
    connectLinkedIn,
    disconnectLinkedIn,
    isLoading: linkedInLoading,
  } = useLinkedIn();
  const { t, language } = useLanguage();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [postsCount, setPostsCount] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);

  // Enable scrolling on this page (override global overflow:hidden)
  useEffect(() => {
    document.documentElement.classList.add("scrollable-page");
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    document.documentElement.style.overflow = "auto";
    document.documentElement.style.height = "auto";

    return () => {
      document.documentElement.classList.remove("scrollable-page");
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
    };
  }, []);

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      if (user) {
        try {
          const [posts, sessions] = await Promise.all([
            getUserPosts(user.uid, 1000),
            getUserSessions(user.uid, 1000),
          ]);
          setPostsCount(posts.length);
          setSessionsCount(sessions.length);
        } catch (error) {
          console.error("Error fetching stats:", error);
        }
      }
    }
    fetchStats();
  }, [user]);

  // Format member date
  const memberSince = useMemo(() => {
    if (!userProfile?.createdAt) return "-";
    const date =
      typeof userProfile.createdAt.toDate === "function"
        ? userProfile.createdAt.toDate()
        : new Date(userProfile.createdAt as unknown as string);

    // French only
    return new Intl.DateTimeFormat("fr-FR", {
      month: "short",
      year: "numeric",
    }).format(date);
  }, [userProfile?.createdAt, language]);

  // Stats data
  const stats = useMemo(
    () => [
      { id: "posts", value: postsCount, label: t.profile.postsCreated, color: "primary" as const },
      { id: "sessions", value: sessionsCount, label: t.profile.sessions, color: "accent" as const },
      { id: "member", value: memberSince, label: t.profile.memberSince },
    ],
    [postsCount, sessionsCount, memberSince, t.profile.postsCreated, t.profile.sessions, t.profile.memberSince]
  );

  // Current plan info
  // subscriptionPlan = plan from Firestore (free/pro/max)
  const subscriptionPlan: SubscriptionPlan = (userProfile?.subscription?.plan || "free") as SubscriptionPlan;
  // profileEditPlan = same as subscriptionPlan now (both use free/pro/max)
  const profileEditPlan: PlanType = subscriptionPlan;
  const dailyLimit = DAILY_MESSAGE_LIMITS[subscriptionPlan];
  const dailyMessagesUsed = userProfile?.quota?.dailyMessageCount || 0;

  // Handle save profile
  const handleSaveProfile = async (formData: {
    displayName: string;
    bio: string;
    sector: string;
    role: string;
    linkedinStyle: string;
    objective: string;
    targetAudience: string;
    communicationTone: string;
  }) => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Only save advanced fields if user is Pro or Max
      const isProOrMax = profileEditPlan === "pro" || profileEditPlan === "max";

      await updateUserProfile(user.uid, {
        displayName: formData.displayName,
        bio: formData.bio,
        profile: isProOrMax ? {
          sector: formData.sector,
          role: formData.role,
          linkedinStyle: formData.linkedinStyle,
          objective: formData.objective,
          targetAudience: formData.targetAudience,
          communicationTone: formData.communicationTone,
        } : {
          // Free users keep existing profile data (from onboarding)
          sector: userProfile?.profile?.sector || "",
          role: userProfile?.profile?.role || "",
          linkedinStyle: userProfile?.profile?.linkedinStyle || "",
          objective: userProfile?.profile?.objective || "",
        },
      });
      await refreshUserProfile();
      setIsEditing(false);
      toast.success(t.profile.profileUpdated);
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(t.profile.errorUpdating);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    toast.success(t.toasts.logoutSuccess);
    router.push("/");
  };

  // Initial form data
  const initialFormData = {
    displayName: userProfile?.displayName || "",
    bio: userProfile?.bio || "",
    sector: userProfile?.profile?.sector || "",
    role: userProfile?.profile?.role || "",
    linkedinStyle: userProfile?.profile?.linkedinStyle || "",
    objective: userProfile?.profile?.objective || "",
    targetAudience: userProfile?.profile?.targetAudience || "",
    communicationTone: userProfile?.profile?.communicationTone || "",
  };

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: "100vh",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Sticky Header with Back Button */}
      <div className="sticky top-0 z-40 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-xl border-b border-light-border dark:border-dark-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center h-16">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-text-secondary hover:text-gray-900 dark:hover:text-white transition-colors group z-10"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">{t.common.back}</span>
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900 dark:text-white">
              {t.profile.title}
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
          {/* Edit Form or Profile View */}
          <AnimatePresence mode="wait">
            {isEditing ? (
              <ProfileEditForm
                key="edit-form"
                initialData={initialFormData}
                onSave={handleSaveProfile}
                onCancel={() => setIsEditing(false)}
                isSaving={isSaving}
                currentPlan={profileEditPlan}
              />
            ) : (
              <motion.div
                key="profile-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Header: Photo + Name + Role */}
                <ProfileHeader
                  displayName={userProfile?.displayName || ""}
                  role={userProfile?.profile?.role}
                  sector={userProfile?.profile?.sector}
                  bio={userProfile?.bio}
                  linkedInConnected={linkedInConnected}
                  onEdit={() => setIsEditing(true)}
                  isEditing={isEditing}
                />

                {/* Plan Card */}
                <ProfilePlanCard
                  currentPlan={subscriptionPlan}
                  dailyMessagesUsed={dailyMessagesUsed}
                  dailyLimit={dailyLimit}
                />

                {/* Stats Row */}
                <ProfileStatsRow stats={stats} />

                {/* LinkedIn Card */}
                <ProfileLinkedInCard
                  isConnected={linkedInConnected}
                  isTokenValid={isTokenValid}
                  profileName={profileName}
                  profilePicture={profilePicture}
                  onConnect={connectLinkedIn}
                  onDisconnect={disconnectLinkedIn}
                  isLoading={linkedInLoading}
                />

                {/* Profile Info Section - Premium purple (storytelling/personal) */}
                <ProfileSection
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                  iconColor="bg-purple-500/10 text-purple-500 dark:text-purple-400"
                  title={t.profile.profileInfo}
                  subtitle={t.profile.profileInfoSubtitle}
                  defaultOpen={false}
                >
                  <div className="space-y-0 divide-y divide-gray-200 dark:divide-dark-border">
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-text-muted">{t.profile.linkedinStyle}</span>
                      <span className="text-sm text-gray-900 dark:text-white font-medium">
                        {userProfile?.profile?.linkedinStyle || t.profile.notSpecified}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-text-muted">{t.profile.objective}</span>
                      <span className="text-sm text-gray-900 dark:text-white font-medium">
                        {userProfile?.profile?.objective || t.profile.notSpecified}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-text-muted">{t.profile.email}</span>
                      <span className="text-sm text-gray-900 dark:text-white font-medium truncate max-w-[180px]">
                        {user?.email || t.profile.notSpecified}
                      </span>
                    </div>
                  </div>
                </ProfileSection>

                {/* Quick Actions Section - Premium violet (engagement/interactive) */}
                <ProfileSection
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                  iconColor="bg-violet-500/10 text-violet-500 dark:text-violet-400"
                  title={t.profile.quickActions}
                  collapsible={false}
                >
                  <div className="space-y-2">
                    <Link href="/history">
                      <motion.div
                        whileHover={{ x: 4 }}
                        className="
                          flex items-center justify-between p-3
                          bg-gray-100 dark:bg-dark-hover hover:bg-gray-200 dark:hover:bg-dark-active
                          rounded-xl cursor-pointer
                          transition-colors duration-200
                        "
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{t.profile.postsHistory}</span>
                        </div>
                        <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.div>
                    </Link>

                    <Link href="/settings">
                      <motion.div
                        whileHover={{ x: 4 }}
                        className="
                          flex items-center justify-between p-3
                          bg-gray-100 dark:bg-dark-hover hover:bg-gray-200 dark:hover:bg-dark-active
                          rounded-xl cursor-pointer
                          transition-colors duration-200
                        "
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{t.profile.privacyGdpr}</span>
                        </div>
                        <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.div>
                    </Link>
                  </div>
                </ProfileSection>

                {/* Logout Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={handleSignOut}
                    className="py-3"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    {t.profile.signOut}
                  </Button>
                </motion.div>

                {/* Footer */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-center text-xs text-text-muted pt-4"
                >
                  {t.profile.footer}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
