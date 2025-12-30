"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile, getUserPosts, getUserSessions } from "@/lib/firestore";
import { SECTORS, LINKEDIN_STYLES, OBJECTIVES } from "@/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { CountUp } from "@/components/ui/Animated";
import toast from "react-hot-toast";

function ProfileContent() {
  const { user, userProfile, signOut, refreshUserProfile } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [postsCount, setPostsCount] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    sector: "",
    role: "",
    linkedinStyle: "",
    objective: "",
  });

  // Animate on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Initialize form data when profile loads
  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || "",
        bio: userProfile.bio || "",
        sector: userProfile.profile?.sector || "",
        role: userProfile.profile?.role || "",
        linkedinStyle: userProfile.profile?.linkedinStyle || "",
        objective: userProfile.profile?.objective || "",
      });
    }
  }, [userProfile]);

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

  const handleSave = async () => {
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

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const formatDate = (timestamp: { toDate?: () => Date } | Date | string | undefined) => {
    if (!timestamp) return "Non disponible";
    let date: Date;
    if (typeof timestamp === "object" && "toDate" in timestamp && timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === "string") {
      date = new Date(timestamp);
    } else {
      date = new Date();
    }
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <MainLayout showMobileHeader={true} headerTitle="Profil">
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl xl:max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-12 pb-24">
          {/* Header section with avatar */}
          <div
            className={`
              relative mb-8 transition-all duration-700 ease-out
              ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
            `}
          >
            {/* Background gradient */}
            <div className="absolute inset-x-0 -top-6 h-32 bg-gradient-to-b from-primary/10 to-transparent rounded-3xl" />

            <div className="relative flex flex-col lg:flex-row items-center lg:items-end gap-4 lg:gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl bg-gradient-to-br from-primary to-accent p-0.5 shadow-glow">
                  <div className="w-full h-full rounded-2xl bg-dark-card flex items-center justify-center overflow-hidden">
                    {userProfile?.photoURL ? (
                      <Image
                        src={userProfile.photoURL}
                        alt={userProfile.displayName || "Avatar"}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl lg:text-5xl font-bold text-gradient">
                        {userProfile?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                      </span>
                    )}
                  </div>
                </div>
                {/* Edit avatar button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary-hover"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={() => toast.error("Fonctionnalite bientot disponible")}
                />
              </div>

              {/* Name and role */}
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">
                  {userProfile?.displayName || "Utilisateur"}
                </h1>
                <p className="text-text-secondary">
                  {userProfile?.profile?.role || "Aucun role defini"}
                </p>
                {userProfile?.profile?.sector && (
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {userProfile.profile.sector}
                  </span>
                )}
              </div>

              {/* Edit button */}
              {!isEditing && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="absolute top-0 right-0 lg:relative"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Modifier
                </Button>
              )}
            </div>

            {/* Bio */}
            {userProfile?.bio && !isEditing && (
              <p className="mt-4 text-text-secondary text-center lg:text-left max-w-lg">
                {userProfile.bio}
              </p>
            )}
          </div>

          {/* Stats cards */}
          <div
            className={`
              grid grid-cols-3 gap-3 lg:gap-6 mb-8 lg:mb-12 transition-all duration-700 delay-100 ease-out
              ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
            `}
          >
            <Card className="text-center py-4 lg:py-6 hover-lift">
              <div className="text-2xl lg:text-4xl font-bold text-white mb-1">
                <CountUp end={postsCount} duration={1200} />
              </div>
              <div className="text-xs lg:text-sm text-text-muted">Posts crees</div>
            </Card>
            <Card className="text-center py-4 lg:py-6 hover-lift">
              <div className="text-2xl lg:text-4xl font-bold text-white mb-1">
                <CountUp end={sessionsCount} duration={1200} />
              </div>
              <div className="text-xs lg:text-sm text-text-muted">Sessions</div>
            </Card>
            <Card className="text-center py-4 lg:py-6 hover-lift">
              <div className="text-lg lg:text-2xl font-bold text-accent mb-1">
                {formatDate(userProfile?.createdAt).split(" ")[1]?.substring(0, 3) || "-"}
              </div>
              <div className="text-xs lg:text-sm text-text-muted">Membre depuis</div>
            </Card>
          </div>

          {/* Edit form or profile details */}
          {isEditing ? (
            <Card
              className={`
                mb-6 transition-all duration-500 delay-200
                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
              `}
              padding="lg"
            >
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier mon profil
              </h2>

              <div className="space-y-5">
                <Input
                  label="Nom complet"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                />

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder="Decrivez-vous en quelques mots..."
                    rows={3}
                    maxLength={160}
                    className="w-full px-4 py-3 bg-dark-card border-2 border-dark-border rounded-xl text-white placeholder-text-muted focus:outline-none focus:border-primary transition-all duration-200 resize-none"
                  />
                  <p className="mt-1 text-xs text-text-muted text-right">
                    {formData.bio.length}/160
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Secteur d&apos;activite
                  </label>
                  <select
                    value={formData.sector}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sector: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-dark-card border-2 border-dark-border rounded-xl text-white focus:outline-none focus:border-primary transition-all duration-200"
                  >
                    <option value="">Selectionnez...</option>
                    {SECTORS.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Role / Metier"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, role: e.target.value }))
                  }
                />

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Style LinkedIn prefere
                  </label>
                  <select
                    value={formData.linkedinStyle}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, linkedinStyle: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-dark-card border-2 border-dark-border rounded-xl text-white focus:outline-none focus:border-primary transition-all duration-200"
                  >
                    <option value="">Selectionnez...</option>
                    {LINKEDIN_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Objectif principal
                  </label>
                  <select
                    value={formData.objective}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, objective: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-dark-card border-2 border-dark-border rounded-xl text-white focus:outline-none focus:border-primary transition-all duration-200"
                  >
                    <option value="">Selectionnez...</option>
                    {OBJECTIVES.map((objective) => (
                      <option key={objective} value={objective}>
                        {objective}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="secondary" onClick={() => setIsEditing(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button onClick={handleSave} isLoading={isSaving} className="flex-1">
                    Enregistrer
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="xl:grid xl:grid-cols-2 xl:gap-8">
              {/* Left column - Profile details */}
              <div>
                {/* Profile details */}
                <Card
                  className={`
                    mb-4 transition-all duration-500 delay-200
                    ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
                  `}
                  padding="none"
                >
                <button
                  onClick={() => toggleSection("details")}
                  className="w-full flex items-center justify-between p-4 lg:p-5 hover:bg-dark-hover transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="font-medium text-white">Informations du profil</span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-text-muted transition-transform duration-200 ${activeSection === "details" ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {activeSection === "details" && (
                  <div className="px-4 lg:px-5 pb-4 lg:pb-5 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between py-3 border-t border-dark-border">
                      <span className="text-sm text-text-muted">Secteur</span>
                      <span className="text-white text-sm font-medium">
                        {userProfile?.profile?.sector || "Non renseigne"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-dark-border">
                      <span className="text-sm text-text-muted">Style</span>
                      <span className="text-white text-sm font-medium">
                        {userProfile?.profile?.linkedinStyle || "Non renseigne"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-dark-border">
                      <span className="text-sm text-text-muted">Objectif</span>
                      <span className="text-white text-sm font-medium">
                        {userProfile?.profile?.objective || "Non renseigne"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-dark-border">
                      <span className="text-sm text-text-muted">Membre depuis</span>
                      <span className="text-white text-sm font-medium">
                        {formatDate(userProfile?.createdAt)}
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Account section */}
              <Card
                className={`
                  mb-4 transition-all duration-500 delay-300
                  ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
                `}
                padding="none"
              >
                <button
                  onClick={() => toggleSection("account")}
                  className="w-full flex items-center justify-between p-4 lg:p-5 hover:bg-dark-hover transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="font-medium text-white">Compte & Securite</span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-text-muted transition-transform duration-200 ${activeSection === "account" ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {activeSection === "account" && (
                  <div className="px-4 lg:px-5 pb-4 lg:pb-5 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between py-3 border-t border-dark-border">
                      <span className="text-sm text-text-muted">Email</span>
                      <span className="text-white text-sm font-medium">
                        {user?.email || "Non renseigne"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-dark-border">
                      <span className="text-sm text-text-muted">Mot de passe</span>
                      <button className="text-primary text-sm font-medium hover:text-primary-hover transition-colors">
                        Modifier
                      </button>
                    </div>
                  </div>
                )}
              </Card>
              </div>

              {/* Right column - Quick actions */}
              <div>
              {/* Quick actions */}
              <div
                className={`
                  space-y-3 mb-8 transition-all duration-500 delay-400
                  ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
                `}
              >
                <Link href="/history">
                  <Card hover className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="font-medium text-white">Historique des posts</span>
                    </div>
                    <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Card>
                </Link>

                <Link href="/settings">
                  <Card hover className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <span className="font-medium text-white">Confidentialite & RGPD</span>
                    </div>
                    <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Card>
                </Link>
              </div>
              </div>
            </div>
          )}

          {/* Logout button */}
          <div
            className={`
              transition-all duration-500 delay-500
              ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
            `}
          >
            <Button variant="danger" fullWidth onClick={handleSignOut}>
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
          </div>

          {/* Footer info */}
          <div
            className={`
              mt-8 text-center transition-all duration-500 delay-600
              ${isVisible ? "opacity-100" : "opacity-0"}
            `}
          >
            <p className="text-xs text-text-muted">
              POSTY v1.0 - Votre assistant LinkedIn IA
            </p>
          </div>
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
