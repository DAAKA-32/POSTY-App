"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useScheduling } from "@/contexts/SchedulingContext";
import { ScheduledPost, ScheduleStatus } from "@/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import Button from "@/components/ui/Button";
import PullToRefresh from "@/components/ui/PullToRefresh";
import ScheduledPostCard from "@/components/schedule/ScheduledPostCard";
import ScheduleModal from "@/components/schedule/ScheduleModal";

// Filter options with icons
const FILTER_OPTIONS: { value: ScheduleStatus | "all"; label: string; icon?: string }[] = [
  { value: "all", label: "Tous" },
  { value: "pending", label: "Programmés", icon: "⏳" },
  { value: "published", label: "Publiés", icon: "✓" },
  { value: "failed", label: "Échec", icon: "!" },
  { value: "cancelled", label: "Annulés" },
];

// Days and months in French
const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"
];

function ScheduleContent() {
  const { user } = useAuth();
  const {
    scheduledPosts,
    isLoading,
    cancelSchedule,
    reschedulePost,
    refreshScheduledPosts,
  } = useScheduling();

  // Enable full scrolling on Schedule page (mouse wheel, trackpad, touch, keyboard)
  useEffect(() => {
    document.documentElement.classList.add("schedule-scroll-enabled");
    document.body.classList.add("schedule-scroll-enabled");
    document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked", "modal-open");

    return () => {
      document.documentElement.classList.remove("schedule-scroll-enabled");
      document.body.classList.remove("schedule-scroll-enabled");
    };
  }, []);

  // State
  const [filter, setFilter] = useState<ScheduleStatus | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Reschedule modal
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);

  // Filter posts
  const filteredPosts = useMemo(() => {
    if (filter === "all") return scheduledPosts;
    return scheduledPosts.filter((post) => post.status === filter);
  }, [scheduledPosts, filter]);

  // Group posts by date for list view
  const groupedPosts = useMemo(() => {
    const groups: { date: string; posts: ScheduledPost[] }[] = [];
    const dateMap = new Map<string, ScheduledPost[]>();

    filteredPosts.forEach((post) => {
      const scheduledDate =
        post.scheduledAt &&
        typeof (post.scheduledAt as { toDate?: () => Date }).toDate === "function"
          ? (post.scheduledAt as { toDate: () => Date }).toDate()
          : new Date(post.scheduledAt as unknown as string);

      const dateKey = scheduledDate.toISOString().split("T")[0];

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(post);
    });

    // Sort by date
    const sortedKeys = Array.from(dateMap.keys()).sort();

    sortedKeys.forEach((key) => {
      const date = new Date(key);
      const dayName = DAYS_FR[date.getDay()];
      const day = date.getDate();
      const month = MONTHS_FR[date.getMonth()];

      groups.push({
        date: `${dayName} ${day} ${month}`,
        posts: dateMap.get(key)!.sort((a, b) => {
          const aDate =
            typeof (a.scheduledAt as { toDate?: () => Date }).toDate === "function"
              ? (a.scheduledAt as { toDate: () => Date }).toDate()
              : new Date(a.scheduledAt as unknown as string);
          const bDate =
            typeof (b.scheduledAt as { toDate?: () => Date }).toDate === "function"
              ? (b.scheduledAt as { toDate: () => Date }).toDate()
              : new Date(b.scheduledAt as unknown as string);
          return aDate.getTime() - bDate.getTime();
        }),
      });
    });

    return groups;
  }, [filteredPosts]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();

    const days: { date: Date | null; posts: ScheduledPost[] }[] = [];

    // Add empty slots for days before the first
    for (let i = 0; i < startDay; i++) {
      days.push({ date: null, posts: [] });
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().split("T")[0];

      const postsForDay = scheduledPosts.filter((post) => {
        const scheduledDate =
          post.scheduledAt &&
          typeof (post.scheduledAt as { toDate?: () => Date }).toDate === "function"
            ? (post.scheduledAt as { toDate: () => Date }).toDate()
            : new Date(post.scheduledAt as unknown as string);
        return scheduledDate.toISOString().split("T")[0] === dateKey;
      });

      days.push({ date, posts: postsForDay });
    }

    return days;
  }, [currentMonth, scheduledPosts]);

  // Handlers
  const handleCancel = async (postId: string) => {
    await cancelSchedule(postId);
  };

  const handleReschedule = (post: ScheduledPost) => {
    setSelectedPost(post);
    setRescheduleModalOpen(true);
  };

  const handleEdit = (post: ScheduledPost) => {
    // For now, just reschedule. Full edit could be added later.
    handleReschedule(post);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // Count by status for badges
  const pendingCount = scheduledPosts.filter((p) => p.status === "pending").length;
  const failedCount = scheduledPosts.filter((p) => p.status === "failed").length;

  return (
    <MainLayout
      posts={[]}
      showMobileHeader={true}
      headerTitle="Posts programmes"
    >
      <PullToRefresh
        onRefresh={refreshScheduledPosts}
        className="min-h-full bg-light-bg dark:bg-dark-bg scroll-smooth lg:overflow-y-auto"
        disabled={isLoading}
      >
        <div className="w-full mx-auto px-4 py-6 md:px-6 md:py-8 md:max-w-2xl lg:px-8 lg:py-10 lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl">
          {/* Premium Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl lg:text-3xl">
                Posts programmés
              </h1>
              <div className="flex items-center gap-3 mt-1.5">
                <p className="text-sm text-gray-600 dark:text-text-muted md:text-base">
                  <span className="font-medium text-gray-900 dark:text-white">{pendingCount}</span> post{pendingCount !== 1 ? "s" : ""} à venir
                </p>
                {failedCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm px-2.5 py-0.5 bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    {failedCount} en échec
                  </span>
                )}
              </div>
            </div>
            <Link href="/app" className="group relative">
              {/* Animated glow effect - Mobile */}
              <div className="md:hidden absolute -inset-0.5 bg-gradient-to-r from-primary via-orange-500 to-primary rounded-xl opacity-75 blur-sm group-hover:opacity-100 animate-pulse-glow" />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="md:hidden relative inline-flex items-center gap-1.5 px-3.5 py-2.5
                  bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500
                  text-white text-sm font-semibold
                  rounded-xl overflow-hidden
                  transition-all duration-200"
                style={{ boxShadow: "0 4px 20px rgba(249, 115, 22, 0.4)" }}
              >
                {/* Shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-shimmer-enhanced" />
                <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="relative z-10">Créer</span>
              </motion.button>
              {/* Animated glow effect - Desktop */}
              <div className="hidden md:block absolute -inset-0.5 bg-gradient-to-r from-primary via-orange-500 to-primary rounded-xl opacity-75 blur-sm group-hover:opacity-100 animate-pulse-glow" />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="hidden md:inline-flex relative items-center gap-2 px-5 py-2.5
                  bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500
                  text-white text-sm font-semibold
                  rounded-xl overflow-hidden
                  transition-all duration-200"
                style={{ boxShadow: "0 4px 20px rgba(249, 115, 22, 0.4)" }}
              >
                {/* Shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-shimmer-enhanced" />
                <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="relative z-10">Créer un post</span>
              </motion.button>
            </Link>
          </motion.div>

          {/* View mode toggle & Filters - Premium design */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-col md:flex-row md:items-center gap-4 mb-8"
          >
            {/* View mode toggle - Premium vibrant design */}
            <div className="flex bg-white dark:bg-dark-card rounded-xl p-1 border border-gray-200 dark:border-dark-border shadow-sm">
              <motion.button
                onClick={() => setViewMode("list")}
                whileHover={{ scale: viewMode !== "list" ? 1.02 : 1 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  viewMode === "list"
                    ? "bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 text-white shadow-md shadow-violet-500/25"
                    : "text-gray-600 dark:text-text-muted hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                }`}
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Liste
              </motion.button>
              <motion.button
                onClick={() => setViewMode("calendar")}
                whileHover={{ scale: viewMode !== "calendar" ? 1.02 : 1 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  viewMode === "calendar"
                    ? "bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 text-white shadow-md shadow-blue-500/25"
                    : "text-gray-600 dark:text-text-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                }`}
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Calendrier
              </motion.button>
            </div>

            {/* Status filter - Premium vibrant pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              {FILTER_OPTIONS.map((option) => {
                const getFilterColors = () => {
                  if (filter !== option.value) {
                    return "bg-white dark:bg-dark-card text-gray-600 dark:text-text-muted hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-dark-border hover:border-violet-500/30 shadow-sm";
                  }
                  switch (option.value) {
                    case "pending": return "bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 text-white shadow-md shadow-violet-500/25 font-medium";
                    case "published": return "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 text-white shadow-md shadow-emerald-500/25 font-medium";
                    case "failed": return "bg-gradient-to-r from-red-500 via-rose-500 to-red-500 text-white shadow-md shadow-red-500/25 font-medium";
                    case "cancelled": return "bg-gradient-to-r from-gray-500 to-gray-400 text-white shadow-md shadow-gray-500/25 font-medium";
                    default: return "bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 text-white shadow-md shadow-blue-500/25 font-medium";
                  }
                };
                return (
                  <motion.button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`px-3.5 py-2 text-sm rounded-xl whitespace-nowrap transition-all duration-200 ${getFilterColors()}`}
                  >
                    {option.icon && <span className="mr-1 text-xs">{option.icon}</span>}
                    {option.label}
                    {option.value === "pending" && pendingCount > 0 && (
                      <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full font-medium ${
                        filter === option.value
                          ? "bg-white/25"
                          : "bg-gradient-to-r from-violet-500/15 to-purple-500/15 text-violet-600 dark:text-violet-400"
                      }`}>
                        {pendingCount}
                      </span>
                    )}
                    {option.value === "failed" && failedCount > 0 && (
                      <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full font-medium ${
                        filter === option.value
                          ? "bg-white/25"
                          : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                      }`}>
                        {failedCount}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Content */}
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 md:py-20 lg:py-24"
            >
              <div className="relative">
                <div className="w-12 h-12 md:w-14 md:h-14 border-3 border-primary/20 rounded-full" />
                <div className="absolute inset-0 w-12 h-12 md:w-14 md:h-14 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-text-muted">Chargement...</p>
            </motion.div>
          ) : filteredPosts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 md:py-20 lg:py-24"
            >
              {/* Premium empty state icon */}
              <div className="relative w-20 h-20 md:w-24 md:h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-xl" />
                <div className="relative w-full h-full bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border shadow-lg flex items-center justify-center">
                  <svg className="w-10 h-10 md:w-12 md:h-12 text-gray-400 dark:text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {filter === "all"
                  ? "Aucun post programmé"
                  : `Aucun post ${FILTER_OPTIONS.find((o) => o.value === filter)?.label.toLowerCase()}`}
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-text-muted mb-8 max-w-sm mx-auto">
                {filter === "all"
                  ? "Créez un post et programmez-le pour le publier automatiquement"
                  : "Modifiez le filtre pour voir d'autres posts"}
              </p>
              {filter === "all" && (
                <Link href="/app" className="group relative inline-block">
                  {/* Animated glow effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-orange-500 to-primary rounded-xl opacity-75 blur-sm group-hover:opacity-100 animate-pulse-glow" />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative inline-flex items-center gap-2.5 px-6 py-3.5
                      bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500
                      text-white font-semibold
                      rounded-xl overflow-hidden
                      transition-all duration-200"
                    style={{ boxShadow: "0 4px 20px rgba(249, 115, 22, 0.4)" }}
                  >
                    {/* Shimmer overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-shimmer-enhanced" />
                    <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="relative z-10">Créer un post</span>
                  </motion.button>
                </Link>
              )}
            </motion.div>
          ) : viewMode === "list" ? (
            /* List View - Premium design */
            <div className="space-y-8 md:space-y-10">
              <AnimatePresence>
                {groupedPosts.map((group, groupIndex) => (
                  <motion.div
                    key={group.date}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIndex * 0.05 }}
                  >
                    {/* Date header - Premium vibrant sticky design */}
                    <div className="sticky top-0 z-10 flex items-center gap-3 mb-4 py-2 bg-gray-50/80 dark:bg-background/80 backdrop-blur-sm -mx-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 shadow-sm shadow-violet-500/50" />
                        <h2 className="text-sm md:text-base font-semibold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                          {group.date}
                        </h2>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-violet-300/50 via-purple-300/30 dark:from-violet-500/30 dark:via-purple-500/20 to-transparent" />
                      <span className="text-xs md:text-sm text-violet-600 dark:text-violet-400 px-2.5 py-1 bg-violet-50 dark:bg-violet-500/10 rounded-lg border border-violet-200 dark:border-violet-500/20 font-medium">
                        {group.posts.length} post{group.posts.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Posts */}
                    <div className="space-y-4">
                      <AnimatePresence>
                        {group.posts.map((post) => (
                          <ScheduledPostCard
                            key={post.id}
                            post={post}
                            onCancel={handleCancel}
                            onReschedule={handleReschedule}
                            onEdit={handleEdit}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            /* Calendar View - Premium vibrant design */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 md:p-6 shadow-lg shadow-blue-100/30 dark:shadow-none"
            >
              {/* Calendar header - Premium vibrant design */}
              <div className="flex items-center justify-between mb-6">
                <motion.button
                  onClick={goToPreviousMonth}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-transparent hover:border-blue-200 dark:hover:border-blue-500/20 transition-all text-gray-600 dark:text-text-secondary hover:text-blue-600 dark:hover:text-blue-400"
                  aria-label="Mois précédent"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </motion.button>
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 dark:from-blue-400 dark:via-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
                  {MONTHS_FR[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <motion.button
                  onClick={goToNextMonth}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-transparent hover:border-blue-200 dark:hover:border-blue-500/20 transition-all text-gray-600 dark:text-text-secondary hover:text-blue-600 dark:hover:text-blue-400"
                  aria-label="Mois suivant"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              </div>

              {/* Days of week header - Premium vibrant design */}
              <div className="grid grid-cols-7 gap-1 mb-3">
                {DAYS_FR.map((day, index) => (
                  <div key={day} className={`text-center text-xs font-semibold py-2 uppercase tracking-wider ${
                    index === 0 || index === 6
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-blue-600 dark:text-blue-400"
                  }`}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid - Premium vibrant design */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((dayData, index) => {
                  const isToday =
                    dayData.date &&
                    dayData.date.toDateString() === new Date().toDateString();
                  const hasPosts = dayData.posts.length > 0;

                  return (
                    <motion.div
                      key={index}
                      whileHover={dayData.date ? { scale: 1.02 } : {}}
                      className={`
                        min-h-[80px] md:min-h-[100px] p-1.5 md:p-2 rounded-xl transition-all duration-200
                        ${!dayData.date ? "invisible" : "cursor-pointer"}
                        ${isToday
                          ? "bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-500/40 shadow-md shadow-amber-500/10"
                          : hasPosts
                            ? "border border-violet-200 dark:border-violet-500/30 hover:border-violet-300 dark:hover:border-violet-500/50 bg-violet-50/50 dark:bg-violet-500/5"
                            : "border border-gray-100 dark:border-dark-border/50 hover:border-blue-200 dark:hover:border-blue-500/30 hover:bg-blue-50/30 dark:hover:bg-blue-500/5"
                        }
                      `}
                    >
                      {dayData.date && (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`
                                text-sm font-semibold
                                ${isToday
                                  ? "w-7 h-7 flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-sm shadow-amber-500/30"
                                  : hasPosts
                                    ? "text-violet-700 dark:text-violet-300"
                                    : "text-gray-700 dark:text-white"
                                }
                              `}
                            >
                              {dayData.date.getDate()}
                            </span>
                            {hasPosts && !isToday && (
                              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 shadow-sm shadow-violet-500/50" />
                            )}
                          </div>

                          {hasPosts && (
                            <div className="mt-1.5 space-y-1">
                              {dayData.posts.slice(0, 2).map((post) => (
                                <motion.div
                                  key={post.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className={`
                                    text-[10px] md:text-xs px-1.5 py-1 rounded-md truncate font-medium
                                    ${post.status === "pending"
                                      ? "bg-gradient-to-r from-violet-500/15 to-purple-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/25"
                                      : post.status === "published"
                                        ? "bg-gradient-to-r from-emerald-500/15 to-green-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                                        : post.status === "failed"
                                          ? "bg-gradient-to-r from-red-500/15 to-rose-500/15 text-red-600 dark:text-red-400 border border-red-500/25"
                                          : "bg-gray-100 dark:bg-dark-elevated text-gray-500 dark:text-text-muted"
                                    }
                                  `}
                                  title={post.content}
                                >
                                  {(() => {
                                    const time =
                                      typeof (post.scheduledAt as { toDate?: () => Date }).toDate === "function"
                                        ? (post.scheduledAt as { toDate: () => Date }).toDate()
                                        : new Date(post.scheduledAt as unknown as string);
                                    return `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;
                                  })()}
                                </motion.div>
                              ))}
                              {dayData.posts.length > 2 && (
                                <div className="text-[10px] md:text-xs text-violet-600 dark:text-violet-400 px-1.5 font-medium">
                                  +{dayData.posts.length - 2} autre{dayData.posts.length - 2 > 1 ? "s" : ""}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Bottom spacing for mobile navigation */}
          <div className="h-20 md:h-8" />
        </div>
      </PullToRefresh>

      {/* Reschedule Modal */}
      {selectedPost && (
        <ScheduleModal
          isOpen={rescheduleModalOpen}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedPost(null);
          }}
          content={selectedPost.content}
          postId={selectedPost.postId}
          title={selectedPost.title}
          onSuccess={() => {
            refreshScheduledPosts();
          }}
        />
      )}
    </MainLayout>
  );
}

export default function SchedulePage() {
  return (
    <ProtectedRoute>
      <ScheduleContent />
    </ProtectedRoute>
  );
}
