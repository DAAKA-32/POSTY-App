"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "@/components/ui/Modal";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import { formatTimeLocale } from "@/components/ui/IOSTimePicker";
import TimeDropdown from "@/components/schedule/TimeDropdown";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useFacebook } from "@/contexts/FacebookContext";
import { useThreads } from "@/contexts/ThreadsContext";
import { SchedulePlatform, LinkedInPostType } from "@/types";
import { canUsePlatform } from "@/lib/config/permissions";
import { PLATFORMS } from "@/components/publish/platforms-config";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import { useRouter } from "next/navigation";
import { useHapticFeedback } from "@/hooks/ui/useHapticFeedback";
import toast from "@/components/ui/Toast";
import { useLanguage } from "@/contexts/LanguageContext";

// Minimum scheduling buffer in minutes (prevent scheduling too close to now)
const MIN_SCHEDULE_BUFFER_MINUTES = 5;

// Image constraints (match LinkedIn limits)
const MAX_IMAGES = 9;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  postId?: string;
  title?: string;
  onSuccess?: (scheduledPostId: string) => void;
  /**
   * AI-generated first-comment proposed for this post (algo boost).
   * If provided, the modal shows a "Boost algo" toggle pre-filled with this
   * text. Default: enabled when text is present, editable, fired ~3 min after
   * publish (server-side jitter handled by Cloud Function).
   */
  seedCommentText?: string;
}

// Get user's timezone
const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// i18n day/month helpers — built from translation keys at render time
const getDaysShort = (t: any) => [t.scheduler.daysSun, t.scheduler.daysMon, t.scheduler.daysTue, t.scheduler.daysWed, t.scheduler.daysThu, t.scheduler.daysFri, t.scheduler.daysSat];
const getDaysFull = (t: any) => [t.scheduler.daysSundayFull, t.scheduler.daysMondayFull, t.scheduler.daysTuesdayFull, t.scheduler.daysWednesdayFull, t.scheduler.daysThursdayFull, t.scheduler.daysFridayFull, t.scheduler.daysSaturdayFull];
const getMonths = (t: any) => [t.scheduler.monthJanuary, t.scheduler.monthFebruary, t.scheduler.monthMarch, t.scheduler.monthApril, t.scheduler.monthMay, t.scheduler.monthJune, t.scheduler.monthJuly, t.scheduler.monthAugust, t.scheduler.monthSeptember, t.scheduler.monthOctober, t.scheduler.monthNovember, t.scheduler.monthDecember];

export default function ScheduleModal({
  isOpen,
  onClose,
  content,
  postId,
  title,
  onSuccess,
  seedCommentText,
}: ScheduleModalProps) {
  const { schedulePost, isUploading } = useScheduling();
  const { canSchedulePosts, currentPlan, subscription } = useSubscription();
  const { isConnected: linkedInConnected } = useLinkedIn();
  const { isConnected: facebookConnected } = useFacebook();
  const { isConnected: threadsConnected } = useThreads();
  const router = useRouter();
  const { trigger: triggerHaptic } = useHapticFeedback();
  const { t } = useLanguage();

  // Check if user can schedule posts
  const schedulePermission = canSchedulePosts();
  const canSchedule = schedulePermission.allowed;

  // Build available platforms based on plan + connection status
  const availablePlatforms = useMemo(() => {
    // NOTE: Bluesky/Mastodon/Discord are wired in the main publish flow but
    // not yet in the scheduling pipeline (no Cloud Function dispatcher for
    // them). They appear here as "not connected" until that work lands.
    const connectionStatus: Record<string, boolean> = {
      linkedin: linkedInConnected,
      facebook: facebookConnected,
      threads: threadsConnected,
    };

    return PLATFORMS.map((p) => {
      const hasAccess = canUsePlatform(subscription, p.id).allowed;
      const isConnected = connectionStatus[p.id] || false;
      return {
        ...p,
        hasAccess,
        isConnected,
        isComingSoon: false,
        selectable: hasAccess && isConnected,
      };
    }).filter((p) => p.hasAccess);
  }, [linkedInConnected, facebookConnected, threadsConnected, subscription]);

  // Detect mobile - SSR-safe initialization
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Force re-check when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
    }
  }, [isOpen]);

  // Real-time clock for smart scheduling
  const [currentTime, setCurrentTime] = useState(new Date());
  const currentTimeRef = useRef(new Date());

  // Update current time every 30 seconds for real-time validation
  useEffect(() => {
    if (!isOpen) return;

    // Update immediately when modal opens
    const now = new Date();
    setCurrentTime(now);
    currentTimeRef.current = now;

    const interval = setInterval(() => {
      const newTime = new Date();
      setCurrentTime(newTime);
      currentTimeRef.current = newTime;
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isOpen]);

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  });
  const [selectedTime, setSelectedTime] = useState({ hour: 9, minute: 0 });
  const [platform, setPlatform] = useState<SchedulePlatform>("linkedin");
  const [postType, setPostType] = useState<LinkedInPostType>("feed");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [step, setStep] = useState<"date" | "time" | "confirm">("date");

  // Image state (LinkedIn only)
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed comment (algo-boost first reply) — pre-filled from prop, editable.
  // Only ever offered when the platform is LinkedIn (other platforms ignore).
  const [seedEnabled, setSeedEnabled] = useState<boolean>(!!seedCommentText);
  const [seedDraft, setSeedDraft] = useState<string>(seedCommentText ?? "");

  const timezone = useMemo(() => getUserTimezone(), []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setSelectedDate(tomorrow);
      setSelectedTime({ hour: 9, minute: 0 });
      setStep("date");
      setCurrentMonth(new Date());

      // Auto-select first connected platform
      const firstSelectable = availablePlatforms.find((p) => p.selectable);
      setPlatform(firstSelectable ? firstSelectable.id as SchedulePlatform : "linkedin");
      setPostType("feed");

      // Reset images
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setImages([]);
      setImagePreviews([]);

      // Re-seed the boost-comment fields from the latest prop value.
      setSeedEnabled(!!seedCommentText);
      setSeedDraft(seedCommentText ?? "");
    }
  }, [isOpen, availablePlatforms]);

  // Cleanup object URLs on unmount only (not on every state change)
  const imagePreviewsRef = useRef<string[]>([]);
  imagePreviewsRef.current = imagePreviews;
  useEffect(() => {
    return () => {
      imagePreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [currentMonth]);

  // Check if a date is disabled (in the past or today with no valid slots)
  const isDateDisabled = useCallback((date: Date | null) => {
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Date is in the past
    if (date < today) return true;

    // Check if it's today and has no valid time slots remaining
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate.getTime() === today.getTime()) {
      // Only disable if no valid slots remain
      const now = currentTimeRef.current;
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes() + MIN_SCHEDULE_BUFFER_MINUTES;
      const lastSlotMinutes = 23 * 60 + 30; // 23:30
      return currentTotalMinutes >= lastSlotMinutes;
    }

    return false;
  }, []);

  // Check if date is selected
  const isDateSelected = useCallback((date: Date | null) => {
    if (!date) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  }, [selectedDate]);

  // Check if date is today
  const isToday = useCallback((date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  // Check if a date is the selected date
  const isSelectedDateToday = useMemo(() => {
    return isToday(selectedDate);
  }, [selectedDate, isToday]);

  // Check if a specific time is disabled (in the past for today)
  const isTimeDisabled = useCallback((hour: number, minute: number, forDate?: Date) => {
    const checkDate = forDate || selectedDate;

    // Only check for today
    if (!isToday(checkDate)) return false;

    const now = currentTimeRef.current;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Add buffer: disable times within MIN_SCHEDULE_BUFFER_MINUTES of current time
    const bufferMinutes = MIN_SCHEDULE_BUFFER_MINUTES;
    const currentTotalMinutes = currentHour * 60 + currentMinute + bufferMinutes;
    const checkTotalMinutes = hour * 60 + minute;

    return checkTotalMinutes <= currentTotalMinutes;
  }, [selectedDate, isToday]);

  // Get the first available time slot for today
  const getFirstAvailableTimeForToday = useCallback(() => {
    const now = currentTimeRef.current;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Round up to next 30-minute slot + buffer
    let nextHour = currentHour;
    let nextMinute = currentMinute < 30 ? 30 : 0;
    if (currentMinute >= 30) {
      nextHour++;
    }

    // Add buffer
    nextMinute += MIN_SCHEDULE_BUFFER_MINUTES;
    if (nextMinute >= 60) {
      nextHour++;
      nextMinute -= 60;
    }

    // Round to nearest 30 min slot
    nextMinute = nextMinute < 30 ? 30 : 0;
    if (nextMinute === 0 && currentMinute >= 30) {
      nextHour++;
    }

    return { hour: Math.min(nextHour, 23), minute: nextMinute };
  }, []);

  // Check if today has any valid time slots remaining
  const todayHasValidTimeSlots = useCallback(() => {
    const now = currentTimeRef.current;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Check if there's at least one 30-min slot available today
    // Last possible slot is 23:30
    const currentTotalMinutes = currentHour * 60 + currentMinute + MIN_SCHEDULE_BUFFER_MINUTES;
    const lastSlotMinutes = 23 * 60 + 30; // 23:30

    return currentTotalMinutes < lastSlotMinutes;
  }, []);

  // Get the appropriate initial date (today if valid slots exist, otherwise tomorrow)
  const getSmartInitialDate = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (todayHasValidTimeSlots()) {
      const firstTime = getFirstAvailableTimeForToday();
      today.setHours(firstTime.hour, firstTime.minute, 0, 0);
      return today;
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }
  }, [todayHasValidTimeSlots, getFirstAvailableTimeForToday]);

  // Handle date selection with smart time adjustment
  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) return;
    triggerHaptic("light");
    setSelectedDate(date);

    // If selecting today, auto-select first available time
    if (isToday(date)) {
      const firstAvailable = getFirstAvailableTimeForToday();
      setSelectedTime(firstAvailable);
    } else {
      // For future dates, default to 9:00 AM
      setSelectedTime({ hour: 9, minute: 0 });
    }

    setStep("time");
  };

  // Handle time pick from the dropdown — sets value and advances to confirm
  const handleTimePick = (hour: number, minute: number) => {
    if (isTimeDisabled(hour, minute)) {
      triggerHaptic("error");
      return;
    }
    setSelectedTime({ hour, minute });
    setStep("confirm");
  };

  // ── Image handlers (LinkedIn only) ─────────────────────────────
  const handleAddImages = (files: FileList | null) => {
    if (!files) return;
    const newFiles: File[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: ${t.scheduler.unsupportedFormat}`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name}: ${t.scheduler.fileTooLarge}`);
        continue;
      }
      if (images.length + newFiles.length >= MAX_IMAGES) {
        errors.push(t.scheduler.maxImages.replace("{n}", String(MAX_IMAGES)));
        break;
      }
      newFiles.push(file);
    }

    if (errors.length > 0) {
      toast.error(errors[0]);
    }

    if (newFiles.length > 0) {
      const previews = newFiles.map((f) => URL.createObjectURL(f));
      setImages((prev) => [...prev, ...newFiles]);
      setImagePreviews((prev) => [...prev, ...previews]);
    }
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Whether image picker should be shown (LinkedIn only, feed post type)
  const showImagePicker = platform === "linkedin" && postType === "feed";

  // Navigate months
  const goToPreviousMonth = () => {
    triggerHaptic("light");
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    triggerHaptic("light");
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // Format selected date/time for display
  const formattedDateTime = useMemo(() => {
    const date = new Date(selectedDate);
    date.setHours(selectedTime.hour, selectedTime.minute, 0, 0);

    const dayName = getDaysFull(t)[date.getDay()];
    const day = date.getDate();
    const month = getMonths(t)[date.getMonth()];
    const time = formatTimeLocale(selectedTime.hour, selectedTime.minute, t.ui.timeLocale);

    return `${dayName} ${day} ${month} — ${time}`;
  }, [selectedDate, selectedTime, t]);

  const formattedDateShort = useMemo(() => {
    const dayName = getDaysShort(t)[selectedDate.getDay()];
    const day = selectedDate.getDate();
    const month = getMonths(t)[selectedDate.getMonth()];
    return `${dayName} ${day} ${month}`;
  }, [selectedDate, t]);

  // Handle submit with final validation
  const handleSubmit = async () => {
    // Final validation: check if the selected time is still valid
    // This handles the case where user leaves modal open and time passes
    const now = new Date();
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(selectedTime.hour, selectedTime.minute, 0, 0);

    // Ensure scheduled time is at least MIN_SCHEDULE_BUFFER_MINUTES in the future
    const minimumTime = new Date(now.getTime() + MIN_SCHEDULE_BUFFER_MINUTES * 60 * 1000);

    if (scheduledAt <= minimumTime) {
      triggerHaptic("error");
      // Auto-correct: if today, select first available time; otherwise keep date but reset time
      if (isToday(selectedDate)) {
        if (todayHasValidTimeSlots()) {
          const firstAvailable = getFirstAvailableTimeForToday();
          setSelectedTime(firstAvailable);
          setStep("time");
          toast.error(t.scheduler.timePassedToast);
        } else {
          // Today no longer has valid slots, switch to tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          setSelectedDate(tomorrow);
          setSelectedTime({ hour: 9, minute: 0 });
          setStep("date");
          toast.error(t.scheduler.noSlotsToday);
        }
      }
      return;
    }

    setIsSubmitting(true);
    triggerHaptic("medium");

    try {
      // Only attach seedComment when boost is on, text is meaningful, and
      // we're targeting LinkedIn (other platforms have no comment-on-post API
      // wired up — and the algo lever is LinkedIn-specific anyway).
      const trimmedSeed = seedDraft.trim();
      const seedComment =
        platform === "linkedin" && seedEnabled && trimmedSeed.length >= 10
          ? { enabled: true, text: trimmedSeed, delayMinutes: 3 }
          : undefined;

      const result = await schedulePost({
        content,
        postId,
        title,
        scheduledAt,
        timezone,
        platform,
        postType,
        imageFiles: showImagePicker && images.length > 0 ? images : undefined,
        seedComment,
      });

      if (result.success && result.scheduledPostId) {
        triggerHaptic("success");
        onSuccess?.(result.scheduledPostId);
        onClose();
      } else if (!result.success) {
        // Error already shown via toast in SchedulingContext
        triggerHaptic("error");
      }
    } catch (error) {
      console.error("Error in schedule submit:", error);
      triggerHaptic("error");
      toast.error(t.scheduler.schedulingError || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle upgrade navigation
  const handleUpgrade = () => {
    onClose();
    router.push("/pricing");
  };

  // Render upgrade prompt for users without active scheduling access
  const renderUpgradeContent = () => (
    <div className="py-4">
      {/* Lock icon with gradient background */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse" />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-white text-center mb-3">
        {t.scheduler.upgradeTitle}
      </h3>

      <p className="text-text-secondary text-center text-sm mb-6 max-w-sm mx-auto">
        {t.scheduler.upgradeDescription}
      </p>

      {/* Benefits list */}
      <div className="bg-dark-elevated rounded-xl p-4 mb-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">{t.scheduler.timeSaving}</p>
            <p className="text-xs text-text-muted">{t.scheduler.prepareInAdvance}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">{t.scheduler.bestEngagement}</p>
            <p className="text-xs text-text-muted">{t.scheduler.publishOptimalTimesDesc}</p>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          {t.scheduler.later}
        </Button>
        <Button
          onClick={handleUpgrade}
          className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {t.scheduler.goToPro}
        </Button>
      </div>

      <p className="text-xs text-text-muted text-center mt-4">
        {t.scheduler.currentPlan} <span className="text-text-secondary font-medium capitalize">{currentPlan}</span>
      </p>
    </div>
  );

  // Render main scheduling content
  const renderSchedulingContent = () => (
    <div className="space-y-5">
      {/* Premium Progress indicator */}
      <div className="flex items-center justify-center gap-2 pb-4">
        {[
          { key: "date", label: t.scheduler.dateStep, icon: "📅" },
          { key: "time", label: t.scheduler.timeStep, icon: "🕐" },
          { key: "confirm", label: t.ui.confirmTime, icon: "✓" },
        ].map((s, i) => {
          const steps = ["date", "time", "confirm"];
          const currentIndex = steps.indexOf(step);
          const isActive = step === s.key;
          const isPast = currentIndex > i;

          return (
            <div key={s.key} className="flex items-center">
              <motion.button
                onClick={() => {
                  if (s.key === "date") setStep("date");
                  else if (s.key === "time" && currentIndex >= 1) setStep("time");
                }}
                disabled={!isPast && !isActive}
                whileHover={isPast || isActive ? { scale: 1.05 } : {}}
                whileTap={isPast || isActive ? { scale: 0.95 } : {}}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300
                  ${isActive
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30 font-semibold"
                    : isPast
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-gray-100/50 dark:bg-dark-elevated/50 text-text-muted border border-gray-200/50 dark:border-dark-border/50"
                  }
                `}
              >
                <span className="text-base">{isPast && !isActive ? "✓" : s.icon}</span>
                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
              </motion.button>
              {/* Connector line */}
              {i < 2 && (
                <div className={`w-8 h-0.5 mx-1 rounded-full transition-colors duration-300 ${
                  currentIndex > i ? "bg-primary" : "bg-gray-200 dark:bg-dark-border"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Date Selection */}
        {step === "date" && (
          <motion.div
            key="date"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header — left aligned, title + subtitle */}
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                {t.scheduler.whenPublish}
              </h3>
              <p className="text-sm text-text-muted mt-0.5">{t.scheduler.chooseDate}</p>
            </div>

            {/* Quick date shortcuts — minimal pill chips */}
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { label: t.scheduler.todayShort, days: 0, requiresValidSlots: true },
                { label: t.scheduler.tomorrow, days: 1, requiresValidSlots: false },
                { label: t.scheduler.in3Days, days: 3, requiresValidSlots: false },
                { label: t.scheduler.oneWeek, days: 7, requiresValidSlots: false },
              ].map(({ label, days, requiresValidSlots }) => {
                const date = new Date();
                date.setDate(date.getDate() + days);
                date.setHours(0, 0, 0, 0);
                const isSelected = isDateSelected(date);
                const isUnavailable = requiresValidSlots && !todayHasValidTimeSlots();

                return (
                  <button
                    key={days}
                    onClick={() => !isUnavailable && handleDateSelect(date)}
                    disabled={isUnavailable}
                    title={isUnavailable ? t.scheduler.noSlotsAvailableToday : undefined}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[40px] whitespace-nowrap
                      ${isUnavailable
                        ? "opacity-40 cursor-not-allowed bg-transparent text-text-muted border border-gray-200 dark:border-dark-border line-through"
                        : isSelected
                          ? "bg-primary text-white shadow-sm"
                          : "bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-dark-border"
                      }
                    `}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Info message when today is not available */}
            {!todayHasValidTimeSlots() && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <svg className="w-5 h-5 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-blue-400">
                  {t.scheduler.tooLateToday}
                </p>
              </div>
            )}

            {/* Calendar — minimal, Linear/Notion inspired */}
            <div className="bg-white dark:bg-dark-elevated rounded-2xl p-5 border border-gray-100 dark:border-dark-border/60">
              {/* Month navigator */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label={t.scheduler.monthsPrevious}
                >
                  <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                  {getMonths(t)[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  onClick={goToNextMonth}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label={t.scheduler.monthsNext}
                >
                  <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {getDaysShort(t).map((day: string) => (
                  <div key={day} className="text-center text-[10px] text-text-muted font-semibold py-1.5 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                  const selected = isDateSelected(date);
                  const today = isToday(date);
                  const disabled = isDateDisabled(date);

                  return (
                    <button
                      key={index}
                      onClick={() => date && handleDateSelect(date)}
                      disabled={disabled}
                      className={`
                        aspect-square flex items-center justify-center text-sm rounded-lg
                        transition-all min-h-[42px]
                        ${!date ? "invisible" : ""}
                        ${disabled ? "text-text-muted/25 cursor-not-allowed" : "cursor-pointer"}
                        ${selected ? "bg-primary text-white font-semibold shadow-sm" : ""}
                        ${today && !selected ? "ring-2 ring-inset ring-primary text-primary font-semibold" : ""}
                        ${!selected && !today && !disabled ? "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-hover font-medium" : ""}
                      `}
                    >
                      {date?.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Selected date preview — inline confirmation */}
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-border/60 flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <p className="text-sm text-text-muted">
                    {t.scheduler.selected}{" "}
                    <span className="text-gray-900 dark:text-white font-semibold">
                      {getDaysFull(t)[selectedDate.getDay()]} {selectedDate.getDate()} {getMonths(t)[selectedDate.getMonth()]}
                    </span>
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: Time Selection */}
        {step === "time" && (
          <motion.div
            key="time"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header — left aligned with selected date as subtitle */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                  {t.scheduler.chooseTime}
                </h3>
                <p className="text-sm text-text-muted mt-0.5 truncate">{formattedDateShort}</p>
              </div>
              <button
                onClick={() => setStep("date")}
                className="shrink-0 text-sm text-primary font-medium hover:underline min-h-[36px] px-2 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t.ui.changeDate}
              </button>
            </div>

            {/* Info banner when today is selected */}
            {isSelectedDateToday && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <svg className="w-5 h-5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-amber-400">
                  {t.scheduler.pastSlotsDisabled} {formatTimeLocale(currentTime.getHours(), currentTime.getMinutes(), t.ui.timeLocale)}.
                </p>
              </div>
            )}

            {/* Compact time dropdown — recommended slots + full list */}
            <TimeDropdown
              value={selectedTime}
              onSelect={handleTimePick}
              isTimeDisabled={isTimeDisabled}
            />
          </motion.div>
        )}

        {/* Step 3: Confirmation */}
        {step === "confirm" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-center mb-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
              >
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t.ui.confirmScheduling}</h3>
              <p className="text-primary font-semibold text-lg mt-2">{formattedDateTime}</p>
              <p className="text-xs text-text-muted mt-1">{timezone}</p>
            </div>

            {/* Platform selector - single select */}
            {availablePlatforms.length > 1 && (
              <div className="mb-4">
                <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">
                  {t.scheduler.publishPlatform}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {availablePlatforms.map((p) => {
                    const isSelected = platform === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (p.selectable) {
                            triggerHaptic("selection");
                            setPlatform(p.id as SchedulePlatform);
                            if (p.id !== "linkedin") setPostType("feed");
                          } else {
                            triggerHaptic("error");
                          }
                        }}
                        disabled={!p.selectable}
                        className={`
                          relative p-3 rounded-xl border-2 transition-all duration-200
                          flex items-center gap-2.5
                          ${!p.selectable
                            ? "bg-gray-100/30 dark:bg-dark-bg/30 border-gray-200/30 dark:border-dark-border/30 opacity-50 cursor-not-allowed"
                            : isSelected
                              ? `${p.bgColor} ${p.borderColor} ${p.color}`
                              : "bg-gray-50 dark:bg-dark-elevated border-gray-200 dark:border-dark-border text-text-secondary hover:border-gray-300 dark:hover:border-dark-hover hover:text-gray-900 dark:hover:text-white"
                          }
                        `}
                      >
                        <div className={isSelected && p.selectable ? p.color : "text-text-muted"}>
                          {p.icon}
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">{p.name}</span>
                          {p.isComingSoon && (
                            <span className="text-[9px] text-text-muted">{t.scheduler.comingSoon}</span>
                          )}
                          {!p.isConnected && !p.isComingSoon && (
                            <span className="text-[9px] text-text-muted">{t.scheduler.notConnected}</span>
                          )}
                        </div>
                        {isSelected && p.selectable && (
                          <div className="absolute top-1.5 right-1.5">
                            <svg className={`w-4 h-4 ${p.color}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Post preview */}
            <div className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4 mb-4 border border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-2 mb-3">
                {(() => {
                  const selectedP = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
                  const bgColors: Record<string, string> = {
                    linkedin: "#0A66C2",
                    facebook: "#1877F2",
                    threads: "#000000",
                    bluesky: "#0085FF",
                    mastodon: "#6364FF",
                    discord: "#5865F2",
                  };
                  return (
                    <>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: bgColors[platform] || "#0A66C2" }}
                      >
                        <div className="w-4 h-4">{selectedP.icon}</div>
                      </div>
                      <span className="text-sm text-gray-900 dark:text-white font-medium">{selectedP.name}</span>
                    </>
                  );
                })()}
                {platform === "linkedin" && postType && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-dark-card rounded-full text-text-muted border border-gray-200 dark:border-dark-border">
                    {postType === "feed" ? "Post" : "Article"}
                  </span>
                )}
              </div>
              <p className="text-sm text-text-secondary line-clamp-3">{content}</p>
              {/* Show image count badge in preview if images attached */}
              {images.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t.scheduler.photosAttached.replace("{n}", String(images.length))}
                </div>
              )}
            </div>

            {/* Type selection - LinkedIn only */}
            {platform === "linkedin" && (
              <div className="mb-5">
                <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">{t.scheduler.publicationType}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPostType("feed")}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      postType === "feed"
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "bg-gray-50 dark:bg-dark-elevated text-text-secondary hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-dark-border"
                    }`}
                  >
                    Post
                  </button>
                  <button
                    onClick={() => setPostType("article")}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      postType === "article"
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "bg-gray-50 dark:bg-dark-elevated text-text-secondary hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-dark-border"
                    }`}
                  >
                    Article
                  </button>
                </div>
              </div>
            )}

            {/* Image picker (LinkedIn feed only) */}
            {showImagePicker && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
                    Photos
                  </p>
                  <span className="text-xs text-text-muted">
                    {images.length}/{MAX_IMAGES}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((preview, idx) => (
                    <div
                      key={idx}
                      className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border group"
                    >
                      <img
                        src={preview}
                        alt={`Image ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 active:opacity-100"
                        style={{ opacity: isMobile ? 1 : undefined }}
                        aria-label={`${t.scheduler.deleteImageAria} ${idx + 1}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}

                  {images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-dashed border-gray-200 dark:border-dark-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-text-muted hover:text-primary transition-colors duration-200"
                      aria-label={t.scheduler.addPhoto}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-[10px]">Photo</span>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleAddImages(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
            )}

            {/* Seed comment block — algo boost (LinkedIn only) */}
            {platform === "linkedin" && (
              <div
                className="rounded-xl ring-1 overflow-hidden"
                style={{
                  borderColor: "rgba(248,147,93,0.18)",
                  backgroundImage:
                    "linear-gradient(180deg, rgba(248,147,93,0.05), rgba(247,107,84,0.03))",
                  ['--tw-ring-color' as string]: "rgba(248,147,93,0.18)",
                }}
              >
                <label className="flex items-start gap-3 px-3.5 py-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={seedEnabled}
                    onChange={(e) => setSeedEnabled(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-[#F8935D] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[11px] font-bold uppercase text-[#B5532E] dark:text-[#F8935D]"
                        style={{ letterSpacing: "0.12em" }}
                      >
                        🚀 Boost algo · 1er commentaire
                      </span>
                      <span className="text-[10px] text-gray-400">
                        ~3 min après publish
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] text-gray-500 leading-snug">
                      Posty publiera automatiquement ce commentaire sur votre post quelques minutes après publication. Cela booste fortement la portée via l&apos;algorithme LinkedIn.
                    </p>
                  </div>
                </label>

                {seedEnabled && (
                  <div className="px-3.5 pb-3">
                    <textarea
                      value={seedDraft}
                      onChange={(e) => setSeedDraft(e.target.value.slice(0, 600))}
                      placeholder="Écris ici le commentaire — une question ouverte, un bonus, une nuance…"
                      rows={3}
                      className="
                        w-full resize-none rounded-lg border border-[#F8935D]/20
                        bg-white/80 dark:bg-dark-card/60
                        px-3 py-2 text-[13px] text-gray-800 dark:text-text-primary
                        placeholder:text-gray-400
                        focus:outline-none focus:ring-2 focus:ring-[#F8935D]/30 focus:border-[#F8935D]/40
                        transition
                      "
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      <span
                        className={`text-[10px] ${
                          seedDraft.trim().length < 10
                            ? "text-red-500"
                            : "text-gray-400"
                        }`}
                      >
                        {seedDraft.trim().length < 10
                          ? "Min. 10 caractères"
                          : `${seedDraft.length}/600`}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Modifiable, validation finale avant publication
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep("time")}
                className="flex-1"
                disabled={isSubmitting || isUploading}
              >
                {t.scheduler.editBtn}
              </Button>
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting || isUploading}
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {isUploading ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Upload...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t.scheduler.scheduleBtn}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Users without active scheduling access see upgrade prompt
  if (!canSchedule) {
    return isMobile ? (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={t.scheduler.schedulingTitle}
      >
        {renderUpgradeContent()}
      </BottomSheet>
    ) : (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t.scheduler.schedulingTitle}
        size="md"
        description={t.scheduler.activeSubRequired}
      >
        {renderUpgradeContent()}
      </Modal>
    );
  }

  // Pro/Max users see scheduling interface
  return isMobile ? (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t.ui.schedulePost}
      height="auto"
      swipeToDismiss={step === "date"}
    >
      {renderSchedulingContent()}
    </BottomSheet>
  ) : (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.ui.schedulePost}
      size="md"
      description={t.scheduler.scheduleDescription}
    >
      {renderSchedulingContent()}
    </Modal>
  );
}
