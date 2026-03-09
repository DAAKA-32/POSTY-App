"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { updateUserProfile, getUserPosts, getUserSessions } from "@/lib/firestore";
import { SubscriptionPlan } from "@/types";
import { PlanType, DAILY_MESSAGE_LIMITS } from "@/lib/plans";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import {
  ProfileHeader,
  ProfilePlanCard,
  ProfileStatsRow,
  ProfileSection,
  ProfileEditForm,
} from "@/components/profile";
import toast from "@/components/ui/Toast";
import { usePageTitle } from "@/hooks/usePageTitle";

function ProfileContent() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { isConnected: linkedInConnected, profilePicture: linkedInPhoto } = useLinkedIn();
  const { t, language } = useLanguage();
  const { currentPlan } = useSubscription();
  usePageTitle("profile");
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [postsCount, setPostsCount] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // Enable full scrolling on Profile page (mouse wheel, trackpad, touch, keyboard)
  useEffect(() => {
    document.documentElement.classList.add("profile-scroll-enabled");
    document.body.classList.add("profile-scroll-enabled");
    // Remove any classes that might block scroll
    document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked", "modal-open");

    return () => {
      document.documentElement.classList.remove("profile-scroll-enabled");
      document.body.classList.remove("profile-scroll-enabled");
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
        } finally {
          setStatsLoading(false);
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

  // Current plan info — use SubscriptionContext as single source of truth
  // This handles test mode, Stripe, and legacy plan mapping correctly
  const subscriptionPlan: PlanType | null = currentPlan;
  const profileEditPlan: PlanType | null = currentPlan;
  const dailyLimit = currentPlan ? DAILY_MESSAGE_LIMITS[currentPlan] : 0;
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
      const isMax = profileEditPlan === "max";
      const isPro = profileEditPlan === "pro";

      // Build profile object based on plan permissions:
      // - Max: all fields from form
      // - Pro: role, targetAudience, communicationTone from form + keep existing sector, linkedinStyle, objective
      // - Free: keep all existing profile data unchanged
      let profileData: {
        sector: string;
        role: string;
        objective: string;
        linkedinStyle?: string;
        targetAudience?: string;
        communicationTone?: string;
      };
      if (isMax) {
        profileData = {
          sector: formData.sector,
          role: formData.role,
          linkedinStyle: formData.linkedinStyle,
          objective: formData.objective,
          targetAudience: formData.targetAudience,
          communicationTone: formData.communicationTone,
        };
      } else if (isPro) {
        profileData = {
          // Pro-editable fields: from form
          role: formData.role,
          targetAudience: formData.targetAudience,
          communicationTone: formData.communicationTone,
          // Max-only fields: keep existing values
          sector: userProfile?.profile?.sector || "",
          linkedinStyle: userProfile?.profile?.linkedinStyle || "",
          objective: userProfile?.profile?.objective || "",
        };
      } else {
        // Free: keep all existing profile data
        profileData = {
          sector: userProfile?.profile?.sector || "",
          role: userProfile?.profile?.role || "",
          linkedinStyle: userProfile?.profile?.linkedinStyle || "",
          objective: userProfile?.profile?.objective || "",
        };
      }

      await updateUserProfile(user.uid, {
        displayName: formData.displayName,
        bio: formData.bio,
        profile: profileData,
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
      className="bg-background-warm dark:bg-background"
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Sticky Header with Back Button */}
      <div className="sticky top-0 z-40 bg-background-warm/80 dark:bg-dark-bg/80 backdrop-blur-xl border-b border-[#F8935D]/10 dark:border-dark-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center h-16">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors group z-10"
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
                  photoURL={linkedInPhoto || userProfile?.photoURL || user?.photoURL || null}
                  branding={userProfile?.branding}
                />

                {/* Plan Card */}
                <ProfilePlanCard
                  currentPlan={subscriptionPlan}
                  dailyMessagesUsed={dailyMessagesUsed}
                  dailyLimit={dailyLimit}
                />

                {/* Stats Row */}
                <ProfileStatsRow stats={stats} isLoading={statsLoading} />

                {/* Profile Info Section */}
                <ProfileSection
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                  iconColor="bg-[#F8935D]/10 text-primary dark:text-primary"
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

                {/* Quick Actions Section */}
                <ProfileSection
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                  iconColor="bg-[#F8935D]/10 text-primary dark:text-primary"
                  title={t.profile.quickActions}
                  collapsible={false}
                >
                  <div className="space-y-2">
                    <Link href="/history">
                      <motion.div
                        whileHover={{ x: 4 }}
                        className="
                          flex items-center justify-between p-3
                          bg-[#F8935D]/10 dark:bg-dark-hover hover:bg-[#F8935D]/15 dark:hover:bg-dark-active
                          rounded-xl cursor-pointer
                          transition-colors duration-200
                        "
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#F8935D]/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-primary dark:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                    <Link href="/settings?from=/profile">
                      <motion.div
                        whileHover={{ x: 4 }}
                        className="
                          flex items-center justify-between p-3
                          bg-[#F8935D]/10 dark:bg-dark-hover hover:bg-[#F8935D]/15 dark:hover:bg-dark-active
                          rounded-xl cursor-pointer
                          transition-colors duration-200
                        "
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#F8935D]/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-primary dark:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                {/* Footer */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.25 }}
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
