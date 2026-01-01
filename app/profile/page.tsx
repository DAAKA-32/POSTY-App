"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { updateUserProfile, getUserPosts, getUserSessions } from "@/lib/firestore";
import { DAILY_MESSAGE_LIMITS } from "@/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import Button from "@/components/ui/Button";
import {
  ProfileHeader,
  ProfilePlanCard,
  ProfileStatsRow,
  ProfileSection,
  ProfileLinkedInCard,
  ProfileEditForm,
} from "@/components/profile";
import toast from "react-hot-toast";

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
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [postsCount, setPostsCount] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);

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

    return new Intl.DateTimeFormat("fr-FR", {
      month: "short",
      year: "numeric",
    }).format(date);
  }, [userProfile?.createdAt]);

  // Stats data
  const stats = useMemo(
    () => [
      { id: "posts", value: postsCount, label: "Posts crees", color: "primary" as const },
      { id: "sessions", value: sessionsCount, label: "Sessions", color: "accent" as const },
      { id: "member", value: memberSince, label: "Membre depuis" },
    ],
    [postsCount, sessionsCount, memberSince]
  );

  // Current plan info
  const currentPlan = userProfile?.subscription?.plan || "free";
  const dailyLimit = DAILY_MESSAGE_LIMITS[currentPlan];
  const dailyMessagesUsed = userProfile?.quota?.dailyMessageCount || 0;

  // Handle save profile
  const handleSaveProfile = async (formData: {
    displayName: string;
    bio: string;
    sector: string;
    role: string;
    linkedinStyle: string;
    objective: string;
  }) => {
    if (!user) return;

    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: formData.displayName,
        bio: formData.bio,
        profile: {
          sector: formData.sector,
          role: formData.role,
          linkedinStyle: formData.linkedinStyle,
          objective: formData.objective,
        },
      });
      await refreshUserProfile();
      setIsEditing(false);
      toast.success("Profil mis a jour !");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Erreur lors de la mise a jour");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
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
  };

  return (
    <MainLayout showMobileHeader={true} headerTitle="Profil">
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10 pb-24">
          {/* Edit Form or Profile View */}
          <AnimatePresence mode="wait">
            {isEditing ? (
              <ProfileEditForm
                key="edit-form"
                initialData={initialFormData}
                onSave={handleSaveProfile}
                onCancel={() => setIsEditing(false)}
                isSaving={isSaving}
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
                  currentPlan={currentPlan}
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

                {/* Profile Info Section */}
                <ProfileSection
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                  iconColor="bg-primary/10 text-primary"
                  title="Informations du profil"
                  subtitle="Votre style et vos objectifs"
                  defaultOpen={false}
                >
                  <div className="space-y-0 divide-y divide-dark-border">
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-text-muted">Style LinkedIn</span>
                      <span className="text-sm text-white font-medium">
                        {userProfile?.profile?.linkedinStyle || "Non renseigne"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-text-muted">Objectif</span>
                      <span className="text-sm text-white font-medium">
                        {userProfile?.profile?.objective || "Non renseigne"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-text-muted">Email</span>
                      <span className="text-sm text-white font-medium truncate max-w-[180px]">
                        {user?.email || "Non renseigne"}
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
                  iconColor="bg-accent/10 text-accent"
                  title="Actions rapides"
                  collapsible={false}
                >
                  <div className="space-y-2">
                    <Link href="/history">
                      <motion.div
                        whileHover={{ x: 4 }}
                        className="
                          flex items-center justify-between p-3
                          bg-dark-hover hover:bg-dark-active
                          rounded-xl cursor-pointer
                          transition-colors duration-200
                        "
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-white">Historique des posts</span>
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
                          bg-dark-hover hover:bg-dark-active
                          rounded-xl cursor-pointer
                          transition-colors duration-200
                        "
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-white">Confidentialite & RGPD</span>
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
                    Se deconnecter
                  </Button>
                </motion.div>

                {/* Footer */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-center text-xs text-text-muted pt-4"
                >
                  POSTY v1.0 - Votre assistant LinkedIn IA
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
