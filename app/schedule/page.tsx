"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { ScheduledPost, ScheduleStatus } from "@/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import Button from "@/components/ui/Button";
import ScheduledPostCard from "@/components/schedule/ScheduledPostCard";
import ScheduleModal from "@/components/schedule/ScheduleModal";
import SchedulePaywallModal from "@/components/schedule/SchedulePaywallModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatTimeLocale } from "@/components/ui/IOSTimePicker";

function ScheduleContent() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  usePageTitle("schedule");

  // Filter options with icons (translated)
  const FILTER_OPTIONS: { value: ScheduleStatus | "all"; label: string; icon?: string }[] = [
    { value: "all", label: t.schedulePage.filterAll },
    { value: "pending", label: t.schedulePage.filterScheduled, icon: "⏳" },
    { value: "published", label: t.schedulePage.filterPublished, icon: "✓" },
    { value: "failed", label: t.schedulePage.filterFailed, icon: "!" },
    { value: "cancelled", label: t.schedulePage.filterCancelled },
  ];
  const {
    scheduledPosts,
    isLoading,
    cancelSchedule,
    deleteSchedule,
    reschedulePost,
    refreshScheduledPosts,
  } = useScheduling();
  const { canSchedulePosts } = useSubscription();
  const canSchedule = canSchedulePosts().allowed;

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

  // Paywall modal for Free users
  const [showPaywall, setShowPaywall] = useState(false);

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
      const dayName = t.schedulePage.daysShort[date.getDay()];
      const day = date.getDate();
      const month = t.schedulePage.monthNames[date.getMonth()];

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
  }, [filteredPosts, t]);

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

  const handleDelete = async (postId: string) => {
    await deleteSchedule(postId);
  };

  const handleReschedule = (post: ScheduledPost) => {
    if (!canSchedule) {
      setShowPaywall(true);
      return;
    }
    setSelectedPost(post);
    setRescheduleModalOpen(true);
  };

  const handleEdit = (post: ScheduledPost) => {
    if (!canSchedule) {
      setShowPaywall(true);
      return;
    }
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
      headerTitle={t.schedulePage.headerTitle}
    >
      <div className="min-h-full bg-background-warm dark:bg-dark-bg scroll-smooth lg:overflow-y-auto">
        <div className="w-full min-w-0 mx-auto px-3 py-5 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8 lg:py-10 lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl overflow-x-clip">
          {/* Premium Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between gap-2 mb-5 sm:mb-8"
          >
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-silver-shimmer dark:text-white md:text-2xl lg:text-3xl truncate">
                {t.schedulePage.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
                <p className="text-sm text-gray-600 dark:text-text-muted md:text-base">
                  <span className="font-medium text-gray-900 dark:text-white">{pendingCount}</span> {pendingCount !== 1 ? t.schedulePage.posts : t.schedulePage.post} {t.schedulePage.upcomingPosts}
                </p>
                {failedCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    {failedCount} {t.schedulePage.failedPosts}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* View mode toggle & Filters - Premium design */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4 mb-5 sm:mb-8"
          >
            {/* View mode toggle - Clean design */}
            <div className="flex bg-gray-100 dark:bg-dark-hover rounded-xl p-1 border border-gray-200 dark:border-dark-border">
              <button
                onClick={() => setViewMode("list")}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  viewMode === "list"
                    ? "bg-white dark:bg-dark-elevated text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-text-muted hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {t.schedulePage.list}
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  viewMode === "calendar"
                    ? "bg-white dark:bg-dark-elevated text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-text-muted hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t.schedulePage.calendar}
              </button>
            </div>

            {/* Status filter - Clean pills */}
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => {
                const isActive = filter === option.value;
                const getFilterColors = () => {
                  if (!isActive) {
                    return "bg-white dark:bg-dark-hover text-gray-600 dark:text-text-muted hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-dark-border";
                  }
                  // All active states: colored bg + forced white text for guaranteed contrast
                  switch (option.value) {
                    case "pending": return "bg-primary !text-white border border-transparent";
                    case "published": return "bg-emerald-500 !text-white border border-transparent";
                    case "failed": return "bg-red-500 !text-white border border-transparent";
                    case "cancelled": return "bg-gray-500 !text-white border border-transparent";
                    default: return "bg-gray-900 dark:bg-white !text-white dark:!text-gray-900 border border-transparent shadow-sm";
                  }
                };
                return (
                  <button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={`px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap transition-colors duration-200 ${getFilterColors()}`}
                  >
                    {option.label}
                    {option.value === "pending" && pendingCount > 0 && (
                      <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full font-medium ${
                        isActive ? "bg-white/25" : "bg-primary/10 text-primary"
                      }`}>
                        {pendingCount}
                      </span>
                    )}
                    {option.value === "failed" && failedCount > 0 && (
                      <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full font-medium ${
                        isActive ? "bg-white/25" : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                      }`}>
                        {failedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Content */}
          <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center py-16 md:py-20 lg:py-24"
            >
              <div className="relative">
                <div className="w-12 h-12 md:w-14 md:h-14 border-3 border-primary/20 rounded-full" />
                <div className="absolute inset-0 w-12 h-12 md:w-14 md:h-14 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-text-muted">{t.common.loading}</p>
            </motion.div>
          ) : filteredPosts.length === 0 ? (
            <motion.div
              key={`empty-${filter}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-center py-16 md:py-20 lg:py-24"
            >
              {/* Empty state icon - Clean version */}
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 bg-gray-100 dark:bg-primary/10 rounded-2xl border border-gray-200 dark:border-primary/15 flex items-center justify-center">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-gray-400 dark:text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-silver-solid dark:text-white mb-2">
                {filter === "all"
                  ? t.ui.noPostsScheduled
                  : `${t.schedulePage.noFilteredPosts} ${FILTER_OPTIONS.find((o) => o.value === filter)?.label.toLowerCase()}`}
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-text-muted mb-8 max-w-sm mx-auto">
                {filter === "all"
                  ? t.schedulePage.emptyDescription
                  : t.schedulePage.changeFilter}
              </p>
              {filter === "all" && (
                <Link
                  href="/app"
                  className="
                    inline-flex items-center gap-2.5 px-6 py-3
                    bg-primary hover:bg-primary-hover
                    text-white font-semibold
                    rounded-xl shadow-sm hover:shadow-md
                    transition-all duration-200
                  "
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{t.schedulePage.createPost}</span>
                </Link>
              )}
            </motion.div>
          ) : viewMode === "list" ? (
            /* List View - Premium design */
            <motion.div
              key={`list-${filter}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 sm:space-y-8 md:space-y-10"
            >
                {groupedPosts.map((group) => (
                  <div
                    key={group.date}
                  >
                    {/* Date header - Clean professional styling */}
                    <div className="sticky top-0 z-10 flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 py-2 bg-background-warm/95 dark:bg-dark-bg/95 backdrop-blur-sm -mx-3 px-3 sm:-mx-4 sm:px-4 min-w-0">
                      <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        {group.date}
                      </h2>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border min-w-4" />
                      <span className="shrink-0 text-xs md:text-sm px-2.5 py-1 rounded-lg font-medium text-gray-500 dark:text-text-muted bg-gray-100 dark:bg-primary/10 border border-gray-200 dark:border-primary/15 whitespace-nowrap">
                        {group.posts.length} {group.posts.length !== 1 ? t.schedulePage.posts : t.schedulePage.post}
                      </span>
                    </div>

                    {/* Posts */}
                    <div className="space-y-4">
                      <AnimatePresence initial={false}>
                        {group.posts.map((post) => (
                          <motion.div
                            key={post.id}
                            layout
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                          >
                            <ScheduledPostCard
                              post={post}
                              onCancel={handleCancel}
                              onDelete={handleDelete}
                              onReschedule={handleReschedule}
                              onEdit={handleEdit}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
            </motion.div>
          ) : (
            /* Calendar View - Clean professional design */
            <motion.div
              key="calendar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl sm:rounded-2xl p-1 sm:p-3 md:p-6 overflow-hidden schedule-calendar-overflow"
            >
              {/* Calendar header */}
              <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6 px-1">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors text-gray-600 dark:text-text-secondary"
                  aria-label={t.schedulePage.previousMonth}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {t.schedulePage.monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  onClick={goToNextMonth}
                  className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors text-gray-600 dark:text-text-secondary"
                  aria-label={t.schedulePage.nextMonth}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-px sm:gap-0.5 md:gap-1 mb-1 sm:mb-2 md:mb-3">
                {t.schedulePage.daysShort.map((day: string, index: number) => (
                  <div key={day} className={`text-center text-[9px] sm:text-[10px] md:text-xs font-semibold py-1 sm:py-1.5 md:py-2 uppercase tracking-wide sm:tracking-wider ${
                    index === 0 || index === 6
                      ? "text-gray-400 dark:text-text-muted"
                      : "text-gray-600 dark:text-text-secondary"
                  }`}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px sm:gap-0.5 md:gap-1.5">
                {calendarDays.map((dayData, index) => {
                  const isToday =
                    dayData.date &&
                    dayData.date.toDateString() === new Date().toDateString();
                  const hasPosts = dayData.posts.length > 0;

                  return (
                    <div
                      key={index}
                      className={`
                        min-h-[44px] sm:min-h-[64px] md:min-h-[100px] p-0.5 sm:p-1.5 md:p-2 rounded-md sm:rounded-xl transition-colors duration-200
                        ${!dayData.date ? "invisible" : "cursor-pointer"}
                        ${isToday
                          ? "bg-primary/10 border-2 border-primary/30"
                          : hasPosts
                            ? "border border-gray-200 dark:border-primary/15 bg-gray-50 dark:bg-primary/8 hover:bg-gray-100 dark:hover:bg-primary/12"
                            : "border border-gray-100 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-primary/5"
                        }
                      `}
                    >
                      {dayData.date && (
                        <>
                          <div className="flex items-center justify-between mb-0 sm:mb-0.5 md:mb-1">
                            <span
                              className={`
                                text-[10px] sm:text-xs md:text-sm font-semibold leading-none
                                ${isToday
                                  ? "w-4 h-4 sm:w-6 sm:h-6 md:w-7 md:h-7 flex items-center justify-center bg-primary text-white rounded sm:rounded-md md:rounded-lg text-[9px] sm:text-xs md:text-sm"
                                  : "text-gray-700 dark:text-white"
                                }
                              `}
                            >
                              {dayData.date.getDate()}
                            </span>
                            {hasPosts && !isToday && (
                              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>

                          {hasPosts && (
                            <div className="mt-0 sm:mt-1 md:mt-1.5 space-y-px sm:space-y-0.5 md:space-y-1 overflow-hidden">
                              {dayData.posts.slice(0, 2).map((post, postIdx) => (
                                <div
                                  key={post.id}
                                  className={`
                                    text-[7px] sm:text-[9px] md:text-xs px-0.5 sm:px-1 md:px-1.5 py-px sm:py-0.5 md:py-1 rounded-sm sm:rounded-md truncate font-medium leading-tight
                                    ${postIdx > 0 ? "hidden sm:block" : ""}
                                    ${post.status === "pending"
                                      ? "bg-primary/10 text-primary"
                                      : post.status === "published"
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : post.status === "failed"
                                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                          : "bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-text-muted"
                                    }
                                  `}
                                  title={post.content}
                                >
                                  {(() => {
                                    const time =
                                      typeof (post.scheduledAt as { toDate?: () => Date }).toDate === "function"
                                        ? (post.scheduledAt as { toDate: () => Date }).toDate()
                                        : new Date(post.scheduledAt as unknown as string);
                                    return formatTimeLocale(time.getHours(), time.getMinutes(), t.ui.timeLocale);
                                  })()}
                                </div>
                              ))}
                              {/* Mobile: show +N if more than 1 post */}
                              {dayData.posts.length > 1 && (
                                <div className="sm:hidden text-[7px] text-gray-500 dark:text-text-muted px-0.5 font-medium leading-tight">
                                  +{dayData.posts.length - 1}
                                </div>
                              )}
                              {/* Desktop: show +N if more than 2 posts */}
                              {dayData.posts.length > 2 && (
                                <div className="hidden sm:block text-[9px] md:text-xs text-gray-500 dark:text-text-muted px-1 md:px-1.5 font-medium leading-tight">
                                  +{dayData.posts.length - 2}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Bottom spacing for mobile navigation + safe area */}
          <div className="h-24 sm:h-20 md:h-8" />
        </div>
      </div>

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

      {/* Paywall Modal for Free users */}
      <SchedulePaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </MainLayout>
  );
}

export default function SchedulePage() {
  return (
    <ProtectedRoute requireOnboarding>
      <ScheduleContent />
    </ProtectedRoute>
  );
}
