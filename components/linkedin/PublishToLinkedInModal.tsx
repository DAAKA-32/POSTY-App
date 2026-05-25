"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "@/components/ui/Modal";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import UpgradeProModal from "@/components/ui/UpgradeProModal";
import { LinkedInIcon } from "./LinkedInConnectButton";
import ConnectPlatformPopup from "@/components/publish/ConnectPlatformPopup";
import { PLATFORMS as ALL_PLATFORMS } from "@/components/publish/platforms-config";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { LinkedInConnectionData } from "@/lib/db/firestore";
import { useQuota } from "@/contexts/QuotaContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useScheduling } from "@/contexts/SchedulingContext";
import toast from "@/components/ui/Toast";
import { useLinkedInErrorToast } from "@/components/linkedin/useLinkedInErrorToast";
import PlatformSelector from "@/components/publish/PlatformSelector";
import { Platform, SchedulePlatform } from "@/types";
import { usePlatformSelection } from "@/hooks/gesture/usePlatformSelection";
import { triggerHaptic } from "@/hooks/ui/useHapticFeedback";
import { useFacebook } from "@/contexts/FacebookContext";
import { useThreads } from "@/contexts/ThreadsContext";
import { useBluesky } from "@/contexts/BlueskyContext";
import { useMastodon } from "@/contexts/MastodonContext";
import { useDiscord } from "@/contexts/DiscordContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { postToLinkedInWithMedia, postToLinkedInWithVideo } from "@/lib/platforms/linkedin";
import { shouldShowFreeSignature, FREE_PLAN_SIGNATURE } from "@/lib/config/plans";
import { formatTimeLocale } from "@/components/ui/IOSTimePicker";
import TimeDropdown from "@/components/schedule/TimeDropdown";
import FullScreenTextEditor from "@/components/publish/FullScreenTextEditor";
import { useRouter } from "next/navigation";

// Image upload constraints (match backend)
const MAX_IMAGES = 9;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Video upload constraints
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

function formatFileSize(bytes: number, lang: string): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} ${lang === 'fr' ? 'Ko' : 'KB'}`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ${lang === 'fr' ? 'Mo' : 'MB'}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getVideoFormatLabel(type: string): string {
  const map: Record<string, string> = { "video/mp4": "MP4", "video/quicktime": "MOV", "video/webm": "WebM" };
  return map[type] || "Vidéo";
}

// Scheduling constants
const MIN_SCHEDULE_BUFFER_MINUTES = 5;

// Scheduling helpers
const getUserTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;
const getDaysShort = (t: any) => [t.scheduler.daysSun, t.scheduler.daysMon, t.scheduler.daysTue, t.scheduler.daysWed, t.scheduler.daysThu, t.scheduler.daysFri, t.scheduler.daysSat];
const getDaysFull = (t: any) => [t.scheduler.daysSundayFull, t.scheduler.daysMondayFull, t.scheduler.daysTuesdayFull, t.scheduler.daysWednesdayFull, t.scheduler.daysThursdayFull, t.scheduler.daysFridayFull, t.scheduler.daysSaturdayFull];
const getMonths = (t: any) => [t.scheduler.monthJanuary, t.scheduler.monthFebruary, t.scheduler.monthMarch, t.scheduler.monthApril, t.scheduler.monthMay, t.scheduler.monthJune, t.scheduler.monthJuly, t.scheduler.monthAugust, t.scheduler.monthSeptember, t.scheduler.monthOctober, t.scheduler.monthNovember, t.scheduler.monthDecember];

// Publish mode
type PublishMode = "now" | "schedule";

// Visibility options for LinkedIn posts
type PostVisibility = "PUBLIC" | "CONNECTIONS";

interface VisibilityOption {
  id: PostVisibility;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// Platform brand colors and labels for success links
const PLATFORM_LINK_CONFIG: Record<string, { color: string; label: string }> = {
  LinkedIn: { color: "text-[#0A66C2] hover:text-[#004182]", label: "LinkedIn" },
  Facebook: { color: "text-[#1877F2] hover:text-[#0C5DC7]", label: "Facebook" },
  Threads: { color: "text-foreground hover:text-text-secondary", label: "Threads" },
};

type PublishStep = "preview" | "confirm" | "publishing" | "success" | "error";

interface PublishToLinkedInModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  linkedInConnection: LinkedInConnectionData | null;
  onPublish: (
    editedContent: string,
    visibility: PostVisibility,
    organizationUrn?: string
  ) => Promise<{ success: boolean; postUrl?: string; error?: string }>;
  // Scheduling props
  postId?: string;
  title?: string;
  initialMode?: PublishMode;
  onScheduleSuccess?: (scheduledPostId: string) => void;
  /**
   * Optional list of fully-resolved image URLs (e.g. Firebase Storage URLs
   * for visuals Posty just generated). When provided, the modal fetches each
   * URL on open and seeds the `images: File[]` state so the user sees the
   * visual already attached instead of having to re-upload. Failed fetches
   * are silently dropped — we never block the open on a network hiccup.
   */
  preloadedImageUrls?: string[];
}

export default function PublishToLinkedInModal({
  isOpen,
  onClose,
  content: initialContent,
  linkedInConnection,
  onPublish,
  postId,
  title,
  initialMode = "now",
  onScheduleSuccess,
  preloadedImageUrls,
}: PublishToLinkedInModalProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const {
    quota, canPublish, recordPublish,
    isMaxPlan: quotaIsMax, currentPlan: quotaPlan,
    hasWeeklyPublishLimit, weeklyPublishUsed, weeklyPublishLimit: wpLimit,
    weeklyPublishRemaining, canPublishThisWeek,
  } = useQuota();
  const { isMaxPlan: subIsMax, currentPlan: subPlan, canSchedulePosts } = useSubscription();
  // Use either context to detect Max — SubscriptionContext is more reliable (normalizes plan names)
  const isMaxPlan = subIsMax || quotaIsMax;
  const currentPlan = subPlan || quotaPlan;
  const { connectLinkedIn } = useLinkedIn();
  const showLinkedInError = useLinkedInErrorToast();
  const { isConnected: facebookConnected, publishToFacebook, connectFacebook } = useFacebook();
  const { isConnected: threadsConnected, publishToThreads, connectThreads } = useThreads();
  const { isConnected: blueskyConnected, publishToBluesky } = useBluesky();
  const { isConnected: mastodonConnected, publishToMastodon } = useMastodon();
  const { isConnected: discordConnected, publishToDiscord, connectDiscord } = useDiscord();
  const { schedulePost, isUploading } = useScheduling();
  const router = useRouter();
  const [step, setStep] = useState<PublishStep>("preview");
  const [editedContent, setEditedContent] = useState(initialContent);
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
  // Publish-as target. "" = personal profile (default). A URN like
  // "urn:li:organization:12345" = publish as that Company Page.
  // Only orgs that the user administers (populated at OAuth) appear.
  const [authorTargetUrn, setAuthorTargetUrn] = useState<string>("");
  const [publishedLinks, setPublishedLinks] = useState<{ platform: string; url: string }[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [progress, setProgress] = useState(0);
  const [publishMessage, setPublishMessage] = useState("");
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Initialize mobile state with SSR-safe check
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showFullScreenEditor, setShowFullScreenEditor] = useState(false);
  // Platform pending the "Connect this platform?" popup. Triggered when the
  // user clicks a non-connected platform in the selector.
  const [connectPopupPlatform, setConnectPopupPlatform] = useState<Platform | null>(null);

  // Image state
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video state
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Scheduling state
  const [publishMode, setPublishMode] = useState<PublishMode>(initialMode);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  });
  const [scheduledTime, setScheduledTime] = useState({ hour: 9, minute: 0 });
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduleStep, setScheduleStep] = useState<"date" | "time">("date");
  const [isScheduleSubmitting, setIsScheduleSubmitting] = useState(false);
  const timezone = useMemo(() => getUserTimezone(), []);

  /**
   * Sub-view state inside the modal's "preview" step. Drives the slide
   * transition between the compose form and the date/time picker, so the
   * picker no longer expands inline (forcing a scroll) but takes over the
   * full modal body with a back arrow.
   */
  const [composeView, setComposeView] = useState<"compose" | "schedule">("compose");

  // Real-time clock for schedule validation
  const [currentTime, setCurrentTime] = useState(new Date());
  const currentTimeRef = useRef(new Date());

  useEffect(() => {
    if (!isOpen || publishMode !== "schedule") return;
    const now = new Date();
    setCurrentTime(now);
    currentTimeRef.current = now;
    const interval = setInterval(() => {
      const newTime = new Date();
      setCurrentTime(newTime);
      currentTimeRef.current = newTime;
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen, publishMode]);

  // Check if user can schedule
  const schedulePermission = canSchedulePosts();
  const canSchedule = schedulePermission.allowed;

  // Calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let day = 1; day <= lastDay.getDate(); day++) days.push(new Date(year, month, day));
    return days;
  }, [currentMonth]);

  const isDateDisabled = useCallback((date: Date | null) => {
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate.getTime() === today.getTime()) {
      const now = currentTimeRef.current;
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes() + MIN_SCHEDULE_BUFFER_MINUTES;
      return currentTotalMinutes >= 23 * 60 + 30;
    }
    return false;
  }, []);

  const isDateToday = useCallback((date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }, []);

  const isDateSelected = useCallback((date: Date | null) => {
    if (!date) return false;
    return date.getDate() === scheduledDate.getDate() && date.getMonth() === scheduledDate.getMonth() && date.getFullYear() === scheduledDate.getFullYear();
  }, [scheduledDate]);

  const isTimeDisabled = useCallback((hour: number, minute: number) => {
    if (!isDateToday(scheduledDate)) return false;
    const now = currentTimeRef.current;
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes() + MIN_SCHEDULE_BUFFER_MINUTES;
    return hour * 60 + minute <= currentTotalMinutes;
  }, [scheduledDate, isDateToday]);

  const getFirstAvailableTimeForToday = useCallback(() => {
    const now = currentTimeRef.current;
    let nextHour = now.getHours();
    let nextMinute = now.getMinutes() < 30 ? 30 : 0;
    if (now.getMinutes() >= 30) nextHour++;
    nextMinute += MIN_SCHEDULE_BUFFER_MINUTES;
    if (nextMinute >= 60) { nextHour++; nextMinute -= 60; }
    nextMinute = nextMinute < 30 ? 30 : 0;
    if (nextMinute === 0 && now.getMinutes() >= 30) nextHour++;
    return { hour: Math.min(nextHour, 23), minute: nextMinute };
  }, []);

  const todayHasValidTimeSlots = useCallback(() => {
    const now = currentTimeRef.current;
    return now.getHours() * 60 + now.getMinutes() + MIN_SCHEDULE_BUFFER_MINUTES < 23 * 60 + 30;
  }, []);

  const formattedScheduleDateTime = useMemo(() => {
    const date = new Date(scheduledDate);
    date.setHours(scheduledTime.hour, scheduledTime.minute, 0, 0);
    const dayName = getDaysFull(t)[date.getDay()];
    const day = date.getDate();
    const month = getMonths(t)[date.getMonth()];
    const time = formatTimeLocale(scheduledTime.hour, scheduledTime.minute, t.ui.timeLocale);
    return `${dayName} ${day} ${month} — ${time}`;
  }, [scheduledDate, scheduledTime, t]);

  // Connected platforms
  const connectedPlatforms: Platform[] = [
    ...(linkedInConnection ? ["linkedin" as Platform] : []),
    ...(facebookConnected ? ["facebook" as Platform] : []),
    ...(threadsConnected ? ["threads" as Platform] : []),
    ...(blueskyConnected ? ["bluesky" as Platform] : []),
    ...(mastodonConnected ? ["mastodon" as Platform] : []),
    ...(discordConnected ? ["discord" as Platform] : []),
  ];

  // Smart platform selection with persistence
  const {
    selectedPlatforms,
    togglePlatform,
    saveSelection,
  } = usePlatformSelection({
    connectedPlatforms,
    defaultPlatforms: ["linkedin"],
  });

  const handlePlatformToggle = (platform: Platform) => {
    // Forward toggle for any real publishing platform. The previous whitelist
    // only allowed linkedin/facebook/threads here and dropped clicks on
    // bluesky/mastodon/discord silently — every platform with a publish
    // dispatcher must be toggleable.
    if (
      platform === "linkedin" ||
      platform === "facebook" ||
      platform === "threads" ||
      platform === "bluesky" ||
      platform === "mastodon" ||
      platform === "discord"
    ) {
      togglePlatform(platform);
    }
  };

  // Trigger the connection flow for the platform from the popup. OAuth
  // platforms get an inline redirect; credential-based ones (Bluesky,
  // Mastodon) need the form on the settings page.
  const startPlatformConnection = useCallback((platform: Platform) => {
    switch (platform) {
      case "linkedin":
        connectLinkedIn();
        break;
      case "facebook":
        connectFacebook();
        break;
      case "threads":
        connectThreads();
        break;
      case "discord":
        connectDiscord();
        break;
      case "bluesky":
      case "mastodon":
        onClose();
        router.push("/settings");
        break;
      default:
        onClose();
        router.push("/settings");
    }
  }, [connectLinkedIn, connectFacebook, connectThreads, connectDiscord, onClose, router]);

  // Lookup table for the popup styling (icon + colors per platform).
  const popupPlatformInfo = useMemo(() => {
    if (!connectPopupPlatform) return null;
    const info = ALL_PLATFORMS.find((p) => p.id === connectPopupPlatform);
    return info || null;
  }, [connectPopupPlatform]);

  // Localized publishing messages
  const publishingMessages = [
    { progress: 0, message: t.publish.connectingPlatforms },
    { progress: 30, message: t.publish.preparingContent },
    { progress: 60, message: t.publish.publishingInProgress },
    { progress: 90, message: t.publish.finalizing },
    { progress: 100, message: t.publish.itsLive },
  ];

  // Localized visibility options
  const visibilityOptions: VisibilityOption[] = [
    {
      id: "PUBLIC",
      label: t.publish.publicLabel,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: t.publish.publicDesc,
    },
    {
      id: "CONNECTIONS",
      label: t.publish.connectionsLabel,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      description: t.publish.connectionsDesc,
    },
  ];

  // Detect mobile - check on mount and when modal opens
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); // Immediate check
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Force re-check when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
    }
  }, [isOpen]);

  // Reset state when modal opens (platform selection persists via hook)
  useEffect(() => {
    if (isOpen) {
      setStep("preview");
      setEditedContent(initialContent);
      setVisibility("PUBLIC");
      setAuthorTargetUrn("");
      setPublishedLinks([]);
      setError(undefined);
      setProgress(0);
      setPublishMessage(publishingMessages[0].message);
      // Reset images
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setImages([]);
      setImagePreviews([]);
      // Reset video
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideo(null);
      setVideoPreview(null);
      setVideoDuration(null);
      // Reset scheduling state
      setPublishMode(initialMode);
      setShowSchedulePicker(false);
      setScheduleConfirmed(false);
      setScheduleStep("date");
      setComposeView("compose");
      setCurrentMonth(new Date());
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setScheduledDate(tomorrow);
      setScheduledTime({ hour: 9, minute: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialContent, initialMode]);

  // Pre-attach generated visuals when the page passes URLs along. Runs after
  // the reset effect (same `isOpen` trigger, ordered by declaration). Each
  // URL is fetched and converted into a `File` so it goes through the same
  // pipeline as a user-uploaded image — validation, preview, multi-image
  // grid, LinkedIn upload — without any special-case branch downstream.
  //
  // Failures are swallowed: if a fetch hangs or the URL is unreachable, we
  // simply skip that file. The user can still upload manually, and we don't
  // want to block the publish flow on a transient network error.
  useEffect(() => {
    if (!isOpen) return;
    if (!preloadedImageUrls || preloadedImageUrls.length === 0) return;

    let cancelled = false;
    const cap = Math.min(preloadedImageUrls.length, MAX_IMAGES);

    (async () => {
      const fetched = await Promise.all(
        preloadedImageUrls.slice(0, cap).map(async (url, i) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const blob = await res.blob();
            if (!ACCEPTED_IMAGE_TYPES.includes(blob.type) && blob.type !== "") {
              // Storage may return application/octet-stream — derive from URL.
              // Fall back to image/png which is what the generator emits.
            }
            const mime = ACCEPTED_IMAGE_TYPES.includes(blob.type)
              ? blob.type
              : "image/png";
            const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1] || "png";
            const file = new File([blob], `posty-visuel-${i + 1}.${ext}`, {
              type: mime,
            });
            if (file.size > MAX_IMAGE_SIZE) return null;
            return file;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;
      const files = fetched.filter((f): f is File => f !== null);
      if (files.length === 0) return;

      const previews = files.map((f) => URL.createObjectURL(f));
      setImages(files);
      setImagePreviews(previews);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, preloadedImageUrls]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup progress interval
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Update message based on progress
  useEffect(() => {
    const currentMessage = [...publishingMessages]
      .reverse()
      .find((m) => progress >= m.progress);
    if (currentMessage) {
      setPublishMessage(currentMessage.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, t]);

  // ── Image handlers ────────────────────────────────────────────────
  const handleAddImages = (files: FileList | null) => {
    if (!files) return;

    const newFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name} : ${t.publish.unsupportedImageFormat}`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name} : ${t.publish.imageTooLarge}`);
        continue;
      }
      if (images.length + newFiles.length >= MAX_IMAGES) {
        errors.push(t.publish.maxImages.replace("{count}", String(MAX_IMAGES)));
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
      triggerHaptic("light");
    }
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    triggerHaptic("light");
  };

  // ── Video handlers ─────────────────────────────────────────────────
  const handleAddVideo = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      toast.error(t.publish.unsupportedFormat);
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error(t.publish.videoTooLarge);
      return;
    }
    const url = URL.createObjectURL(file);
    setVideo(file);
    setVideoPreview(url);
    setVideoDuration(null);
    // Extract duration from video metadata
    const el = document.createElement("video");
    el.preload = "metadata";
    el.src = url;
    el.onloadedmetadata = () => setVideoDuration(el.duration);
    triggerHaptic("light");
  };

  const handleRemoveVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview(null);
    setVideoDuration(null);
    triggerHaptic("light");
  };

  const handleClose = () => {
    if (step !== "publishing") {
      onClose();
    }
  };

  const handleConfirm = () => {
    // Safety check: prevent publish without platform
    if (selectedPlatforms.length === 0) {
      triggerHaptic("error");
      return;
    }

    if (publishMode === "schedule") {
      // Validate schedule is confirmed
      if (!scheduleConfirmed) {
        triggerHaptic("error");
        toast.error(t.publish.scheduleRequired);
        return;
      }
      // Validate scheduling permission
      if (!canSchedule) {
        triggerHaptic("warning");
        setShowUpgradeModal(true);
        return;
      }
    } else {
      // Max plan = unlimited, never block. Pro = check daily quota.
      if (!isMaxPlan && !canPublish) {
        triggerHaptic("warning");
        setShowUpgradeModal(true);
        return;
      }
    }
    // Haptic feedback for proceeding to confirmation
    triggerHaptic("medium");
    setStep("confirm");
  };

  const handlePublish = async () => {
    // Safety check: prevent publish without platform
    if (selectedPlatforms.length === 0) {
      triggerHaptic("error");
      setError(t.ui.noPlatformSelected);
      setStep("error");
      return;
    }

    // Haptic feedback for starting publication
    triggerHaptic("impact");
    setStep("publishing");
    setError(undefined);
    setProgress(0);

    // Start progress animation
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const increment = prev < 30 ? 6 : prev < 60 ? 4 : 2;
        return Math.min(prev + increment, 90);
      });
    }, 150);

    try {
      const results: { platform: string; success: boolean; url?: string; error?: string }[] = [];

      // Publish to LinkedIn if selected
      if (selectedPlatforms.includes("linkedin")) {
        let result: { success: boolean; postUrl?: string; error?: string };
        const orgUrn = authorTargetUrn || undefined;
        if (images.length > 0 && user) {
          result = await postToLinkedInWithMedia(user.uid, editedContent, visibility, images, postId, orgUrn);
        } else if (video && user) {
          result = await postToLinkedInWithVideo(user.uid, editedContent, visibility, video, postId, orgUrn);
        } else {
          result = await onPublish(editedContent, visibility, orgUrn);
        }
        results.push({
          platform: "LinkedIn",
          success: result.success,
          url: result.postUrl,
          error: result.error,
        });
      }

      // Publish to Facebook if selected
      if (selectedPlatforms.includes("facebook")) {
        const result = await publishToFacebook(editedContent);
        results.push({
          platform: "Facebook",
          success: result.success,
          url: result.postUrl,
          error: result.error,
        });
      }

      // Publish to Threads if selected
      if (selectedPlatforms.includes("threads")) {
        const result = await publishToThreads(editedContent);
        const validPermalink = result.permalink && !result.permalink.includes("error=") ? result.permalink : undefined;
        results.push({
          platform: "Threads",
          success: result.success,
          url: validPermalink,
          error: result.error,
        });
      }

      // Publish to Bluesky if selected
      if (selectedPlatforms.includes("bluesky")) {
        const result = await publishToBluesky(editedContent);
        results.push({
          platform: "Bluesky",
          success: result.success,
          url: result.postUrl,
          error: result.error,
        });
      }

      // Publish to Mastodon if selected
      if (selectedPlatforms.includes("mastodon")) {
        const result = await publishToMastodon(editedContent);
        results.push({
          platform: "Mastodon",
          success: result.success,
          url: result.postUrl,
          error: result.error,
        });
      }

      // Publish to Discord if selected
      if (selectedPlatforms.includes("discord")) {
        const result = await publishToDiscord(editedContent);
        results.push({
          platform: "Discord",
          success: result.success,
          url: result.postUrl,
          error: result.error,
        });
      }

      const successResults = results.filter((r) => r.success);
      const failedResults = results.filter((r) => !r.success);

      if (successResults.length > 0) {
        // Record publish in quota
        await recordPublish();
        // Save platform selection for future sessions
        saveSelection();
        // Animate to 100%
        setProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 600));
        // Success haptic feedback - celebratory pattern
        triggerHaptic("success");
        // Store all successful platform links
        setPublishedLinks(
          successResults
            .filter((r) => r.url)
            .map((r) => ({ platform: r.platform, url: r.url! }))
        );
        setStep("success");

        const platformNames = successResults.map((r) => r.platform).join(", ");
        toast.success(t.publish.postPublishedOn.replace("{platforms}", platformNames));

        if (failedResults.length > 0) {
          // If LinkedIn is among the failures, surface a friendly,
          // action-oriented LinkedIn toast instead of dumping the raw error.
          const linkedinFailure = failedResults.find(
            (r) => r.platform.toLowerCase() === "linkedin"
          );
          if (linkedinFailure) {
            showLinkedInError(linkedinFailure.error);
          } else {
            const failedNames = failedResults.map((r) => r.platform).join(", ");
            toast.error(
              t.publish.failedOn
                .replace("{platforms}", failedNames)
                .replace("{error}", failedResults[0].error || "")
            );
          }
        }
      } else {
        // All failed
        triggerHaptic("error");
        setError(failedResults.map((r) => `${r.platform}: ${r.error}`).join("\n") || t.publish.genericError);
        setStep("error");
        setProgress(0);
      }
    } catch (err) {
      // Error haptic feedback
      triggerHaptic("error");
      setError(err instanceof Error ? err.message : t.publish.genericError);
      setStep("error");
      setProgress(0);
    } finally {
      // Always cleanup the interval, regardless of success or error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  const handleRetry = () => {
    setStep("preview");
    setError(undefined);
    setProgress(0);
  };

  // Handle schedule submission
  const handleScheduleSubmit = async () => {
    if (!scheduleConfirmed) return;

    const scheduledAt = new Date(scheduledDate);
    scheduledAt.setHours(scheduledTime.hour, scheduledTime.minute, 0, 0);

    // Final validation: ensure time is still valid
    const now = new Date();
    const minimumTime = new Date(now.getTime() + MIN_SCHEDULE_BUFFER_MINUTES * 60 * 1000);
    if (scheduledAt <= minimumTime) {
      triggerHaptic("error");
      toast.error(t.scheduler.timePassedToast);
      setScheduleConfirmed(false);
      setShowSchedulePicker(true);
      return;
    }

    setIsScheduleSubmitting(true);
    triggerHaptic("impact");
    setStep("publishing");
    setProgress(0);

    // Progress animation for scheduling
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return Math.min(prev + 8, 90);
      });
    }, 150);

    try {
      // Map first selected platform to schedule platform
      const schedulePlatform = (selectedPlatforms[0] || "linkedin") as SchedulePlatform;

      // Race the schedule call against a timeout to prevent infinite hang on mobile/PWA
      const SCHEDULE_TIMEOUT_MS = 30_000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), SCHEDULE_TIMEOUT_MS)
      );

      // Propagate audience + org target to the scheduled doc so the cron
      // publishes with the same author/visibility the user picked here.
      // Without this the scheduler silently downgraded to personal + PUBLIC.
      const isLinkedIn = schedulePlatform === "linkedin";
      const scheduleOrgUrn = isLinkedIn ? (authorTargetUrn || undefined) : undefined;
      const scheduleVisibility = isLinkedIn ? visibility : undefined;

      const result = await Promise.race([
        schedulePost({
          content: editedContent,
          postId,
          title,
          scheduledAt,
          timezone,
          platform: schedulePlatform,
          postType: "feed",
          visibility: scheduleVisibility,
          organizationUrn: scheduleOrgUrn,
          imageFiles: images.length > 0 ? images : undefined,
        }),
        timeoutPromise,
      ]);

      if (result.success && result.scheduledPostId) {
        // Clear interval before setting 100% so UI is clean
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 600));
        triggerHaptic("success");
        setStep("success");
        toast.success(t.publish.postScheduled);
        onScheduleSuccess?.(result.scheduledPostId);
      } else {
        triggerHaptic("error");
        setError(result.error || t.publish.genericError);
        setStep("error");
        setProgress(0);
      }
    } catch (err) {
      triggerHaptic("error");
      const isTimeout = err instanceof Error && err.message === "TIMEOUT";
      setError(
        isTimeout
          ? (t.publish.timeoutError || "The request timed out. Please check your connection and try again.")
          : (err instanceof Error ? err.message : t.publish.genericError)
      );
      setStep("error");
      setProgress(0);
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setIsScheduleSubmitting(false);
    }
  };

  const isConnected = !!linkedInConnection;
  const characterCount = editedContent.length;
  const linkedInLimit = 3000;
  const threadsLimit = 500;
  const blueskyLimit = 300;
  const mastodonLimit = 500;
  const discordLimit = 2000;
  const isOverLinkedInLimit = selectedPlatforms.includes("linkedin") && characterCount > linkedInLimit;
  const isOverThreadsLimit = selectedPlatforms.includes("threads") && characterCount > threadsLimit;
  const isOverBlueskyLimit = selectedPlatforms.includes("bluesky") && characterCount > blueskyLimit;
  const isOverMastodonLimit = selectedPlatforms.includes("mastodon") && characterCount > mastodonLimit;
  const isOverDiscordLimit = selectedPlatforms.includes("discord") && characterCount > discordLimit;
  const isOverLimit =
    isOverLinkedInLimit ||
    isOverThreadsLimit ||
    isOverBlueskyLimit ||
    isOverMastodonLimit ||
    isOverDiscordLimit;
  const noPlatformSelected = selectedPlatforms.length === 0;
  const weeklyLimitReached = publishMode === "now" && hasWeeklyPublishLimit && !canPublishThisWeek;
  const scheduleNotReady = publishMode === "schedule" && !scheduleConfirmed;
  const cannotPublishOrSchedule = isOverLimit || !editedContent.trim() || noPlatformSelected || weeklyLimitReached || scheduleNotReady;

  // Content to render inside modal/bottom sheet
  const renderContent = () => {
    return (
      <>
        {/* Preview Step */}
        {step === "preview" && (
          <AnimatePresence mode="wait" initial={false}>
          {composeView === "compose" && (
          <motion.div
            key="compose-view"
            initial={{ x: -16, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -16, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            {/* LinkedIn Profile — only shown when LinkedIn is connected.
                Other platforms surface their own context inside their card. */}
            {isConnected && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                {linkedInConnection?.profilePicture ? (
                  <img
                    src={linkedInConnection.profilePicture}
                    alt={linkedInConnection.profileName}
                    className="w-10 h-10 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#0A66C2]/20 flex items-center justify-center">
                    <LinkedInIcon className="w-5 h-5 text-[#0A66C2]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white font-medium truncate">{linkedInConnection?.profileName}</p>
                  <p className="text-xs text-text-muted">{t.publish.willBePublishedOnProfile}</p>
                </div>
              </div>
            )}

            {/* Platform Selector */}
            <PlatformSelector
              selectedPlatforms={selectedPlatforms}
              connectedPlatforms={connectedPlatforms}
              onToggle={handlePlatformToggle}
              showAllPlatforms={true}
              onConnectRequest={(platform) => setConnectPopupPlatform(platform)}
            />

            {/* Quota Info — only for Pro users with a daily limit */}
            {quota && quota.plan === "pro" && (
              <div
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  canPublish
                    ? "bg-gray-50 dark:bg-dark-bg border-gray-200 dark:border-dark-border"
                    : "bg-error/10 border-error/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{canPublish ? "\uD83D\uDCCA" : "\u26A0\uFE0F"}</span>
                  <span className="text-sm text-text-secondary">
                    {canPublish ? (
                      <>
                        <span className="text-gray-900 dark:text-white font-medium">{quota.remaining}</span>{" "}
                        {quota.remaining > 1 ? t.publish.remainingPublicationsPlural : t.publish.remainingPublications}{" "}
                        {quota.remaining > 1 ? t.publish.remainingTodayPlural : t.publish.remainingToday}
                      </>
                    ) : (
                      <span className="text-error">{t.publish.dailyLimitReached}</span>
                    )}
                  </span>
                </div>
                {!canPublish && (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="text-xs text-accent hover:text-accent/80 font-medium min-h-[44px] px-2 flex items-center"
                  >
                    {t.publish.upgradeToMax}
                  </button>
                )}
              </div>
            )}

            {/* Publish-as Selector — profil perso vs Company Page */}
            {isConnected && linkedInConnection?.organizations && linkedInConnection.organizations.length > 0 && (
              <div className={`transition-opacity duration-200 ${selectedPlatforms.includes("linkedin") ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
                    {t.publish.publishAsLabel}
                  </p>
                  <span className="text-[10px] text-text-muted/70 font-normal normal-case tracking-normal">
                    LinkedIn
                  </span>
                </div>
                <select
                  value={authorTargetUrn}
                  onChange={(e) => {
                    if (selectedPlatforms.includes("linkedin")) {
                      triggerHaptic("selection");
                      setAuthorTargetUrn(e.target.value);
                    }
                  }}
                  disabled={!selectedPlatforms.includes("linkedin")}
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm font-medium text-text-secondary hover:border-gray-300 dark:hover:border-dark-hover focus:outline-none focus:border-[#0A66C2] disabled:cursor-not-allowed"
                >
                  <option value="">
                    {linkedInConnection.profileName
                      ? `${linkedInConnection.profileName} — ${t.publish.publishAsPersonSuffix}`
                      : t.publish.publishAsPersonSuffix}
                  </option>
                  {linkedInConnection.organizations.map((org) => (
                    <option key={org.urn} value={org.urn}>
                      {org.name} — {t.publish.publishAsOrgSuffix}
                    </option>
                  ))}
                </select>
                {/* Explain the metrics trade-off — honest about the LinkedIn limitation */}
                <p className="text-[11px] text-text-muted mt-1.5 flex items-start gap-1.5">
                  <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {authorTargetUrn
                      ? t.publish.publishAsOrgMetricsHint
                      : t.publish.publishAsPersonMetricsHint}
                  </span>
                </p>
              </div>
            )}

            {/* Visibility Selector — LinkedIn-specific, conditional display */}
            {isConnected && (
              <div className={`transition-opacity duration-200 ${selectedPlatforms.includes("linkedin") ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
                    {t.publish.visibilityLabel}
                  </p>
                  <span className="text-[10px] text-text-muted/70 font-normal normal-case tracking-normal">
                    LinkedIn
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {visibilityOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        if (selectedPlatforms.includes("linkedin")) {
                          triggerHaptic("selection");
                          setVisibility(option.id);
                        }
                      }}
                      disabled={!selectedPlatforms.includes("linkedin")}
                      className={`
                        min-h-[44px] p-3 rounded-lg border transition-all duration-200
                        flex items-center gap-3
                        ${
                          !selectedPlatforms.includes("linkedin")
                            ? "bg-gray-50 dark:bg-dark-bg border-gray-200 dark:border-dark-border text-text-muted cursor-not-allowed"
                            : visibility === option.id
                            ? "bg-[#0A66C2]/20 border-[#0A66C2] text-[#0A66C2]"
                            : "bg-gray-50 dark:bg-dark-bg border-gray-200 dark:border-dark-border text-text-secondary hover:border-gray-300 dark:hover:border-dark-hover hover:text-gray-900 dark:hover:text-white"
                        }
                      `}
                    >
                      {option.icon}
                      <div className="text-left">
                        <span className="text-sm font-medium block">{option.label}</span>
                        <span className="text-xs opacity-70">{option.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {!selectedPlatforms.includes("linkedin") && (
                  <p className="text-[11px] text-text-muted mt-1.5">
                    {t.publish.enableLinkedInVisibility}
                  </p>
                )}
              </div>
            )}

            {/* Media Picker — Images / Vidéos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
                  {t.publish.imagesVideos}
                </p>
                {isMaxPlan && images.length > 0 && (
                  <span className="text-xs text-text-muted">{images.length}/{MAX_IMAGES}</span>
                )}
                {isMaxPlan && video && (
                  <span className="text-xs text-text-muted">{t.publish.videoCount}</span>
                )}
                {!isMaxPlan && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">Max</span>
                )}
              </div>

              {/* Non-Max plan — media restricted banner */}
              {!isMaxPlan && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-elevated rounded-xl border border-gray-200 dark:border-dark-border">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.publish.mediaMaxOnly}</p>
                    <button
                      type="button"
                      onClick={() => { onClose(); router.push("/pricing"); }}
                      className="text-xs text-primary font-medium mt-0.5 hover:underline"
                    >
                      {t.publish.upgradeToMax}
                    </button>
                  </div>
                </div>
              )}

              {/* No media selected — two add buttons (Max plan only) */}
              {isMaxPlan && images.length === 0 && !video && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 h-11 rounded-lg border-2 border-dashed border-gray-300 dark:border-dark-border hover:border-primary/50 flex items-center justify-center gap-2 text-text-muted hover:text-primary transition-colors duration-200 text-sm"
                    aria-label={t.publish.addImages}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t.publish.images}
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex-1 h-11 rounded-lg border-2 border-dashed border-gray-300 dark:border-dark-border hover:border-primary/50 flex items-center justify-center gap-2 text-text-muted hover:text-primary transition-colors duration-200 text-sm"
                    aria-label={t.publish.addVideo}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {t.publish.video}
                  </button>
                </div>
              )}

              {/* Image preview grid (Max plan only) */}
              {isMaxPlan && images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((preview, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border group"
                    >
                      <img src={preview} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className={`absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center transition-opacity duration-150 ${
                          isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100 active:opacity-100"
                        }`}
                        aria-label={`${t.publish.removeImage} ${idx + 1}`}
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
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-dark-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-text-muted hover:text-primary transition-colors duration-200"
                      aria-label={t.publish.addImage}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Video preview (Max plan only) */}
              {isMaxPlan && video && videoPreview && (
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border">
                  <video
                    src={videoPreview}
                    className="w-full max-h-44 object-contain bg-black"
                    preload="metadata"
                    muted
                    playsInline
                  />
                  <div className="flex items-center justify-between px-3 py-2.5 bg-gray-100 dark:bg-dark-elevated/90 border-t border-gray-200 dark:border-dark-border/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <svg className="w-4 h-4 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-900 dark:text-white font-medium truncate max-w-[140px]">{video.name}</span>
                      <span className="text-xs text-gray-500 dark:text-text-muted shrink-0">{formatFileSize(video.size, language)}</span>
                      {videoDuration !== null && (
                        <span className="text-xs text-gray-500 dark:text-text-muted shrink-0">{formatDuration(videoDuration)}</span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-dark-hover text-gray-500 dark:text-text-muted shrink-0">
                        {getVideoFormatLabel(video.type)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center ml-2 shrink-0 transition-colors"
                      aria-label={t.publish.removeVideo}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file inputs (Max plan only) */}
              {isMaxPlan && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => { handleAddImages(e.target.files); e.target.value = ""; }}
                  />
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    className="hidden"
                    onChange={(e) => { handleAddVideo(e.target.files); e.target.value = ""; }}
                  />
                </>
              )}
            </div>

            {/* Editable Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
                  {t.publish.postContent}
                </p>
                <button
                  onClick={() => setEditedContent(initialContent)}
                  className="text-xs text-accent hover:text-accent/80 transition-colors min-h-[44px] px-2 flex items-center"
                >
                  {t.publish.reset}
                </button>
              </div>
              {/* Mobile: tap to open fullscreen editor */}
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setShowFullScreenEditor(true)}
                  className={`
                    w-full p-4 bg-gray-50 dark:bg-dark-bg border rounded-xl text-gray-900 dark:text-white text-sm
                    min-h-[100px] max-h-[180px] overflow-hidden cursor-text text-left
                    active:scale-[0.99] transition-all duration-150
                    ${isOverLimit ? "border-error ring-1 ring-error/20" : "border-gray-200 dark:border-dark-border"}
                  `}
                  aria-label={t.publish.tapToEdit || "Tap to edit"}
                >
                  <p className="whitespace-pre-wrap line-clamp-5 leading-relaxed text-[15px]">
                    {editedContent || <span className="text-gray-400">{t.ui.writeContentPlaceholder}</span>}
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2 text-primary py-2 bg-primary/5 rounded-lg border border-primary/10">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="text-sm font-medium">{t.publish.tapToEdit || "Tap to edit"}</span>
                  </div>
                </button>
              ) : (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className={`
                    w-full p-4 bg-gray-50 dark:bg-dark-bg border rounded-lg text-gray-900 dark:text-white text-sm
                    resize-none focus:outline-none focus:ring-2 focus:ring-primary/50
                    transition-all duration-200 min-h-[160px] max-h-[300px]
                    ${isOverLimit ? "border-error" : "border-gray-200 dark:border-dark-border"}
                  `}
                  placeholder={t.ui.writeContentPlaceholder}
                />
              )}
              <div className="flex justify-between items-start mt-2 text-xs">
                <span className="text-text-muted">
                  {editedContent !== initialContent && (
                    <span className="text-warning">{t.publish.modified}</span>
                  )}
                </span>
                <div className="flex flex-col items-end gap-0.5">
                  {selectedPlatforms.includes("linkedin") && (
                    <span className={isOverLinkedInLimit ? "text-error font-medium" : "text-text-muted"}>
                      LinkedIn: {characterCount} / {linkedInLimit}
                    </span>
                  )}
                  {selectedPlatforms.includes("threads") && (
                    <span className={isOverThreadsLimit ? "text-error font-medium" : "text-text-muted"}>
                      Threads: {characterCount} / {threadsLimit}
                    </span>
                  )}
                  {!selectedPlatforms.includes("linkedin") && !selectedPlatforms.includes("threads") && (
                    <span className="text-text-muted">{characterCount}</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Publishing Options ─────────────────────────────── */}
            <div>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-2">
                {t.publish.publishingOptions}
              </p>
              <div className="space-y-2">
                {/* Publish Now */}
                <button
                  type="button"
                  onClick={() => {
                    setPublishMode("now");
                    setShowSchedulePicker(false);
                    triggerHaptic("selection");
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                    publishMode === "now"
                      ? "border-primary bg-primary/10"
                      : "border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg hover:border-gray-300 dark:hover:border-dark-hover"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    publishMode === "now" ? "border-primary" : "border-gray-300 dark:border-dark-border"
                  }`}>
                    {publishMode === "now" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium block ${
                      publishMode === "now" ? "text-gray-900 dark:text-white" : "text-text-secondary"
                    }`}>
                      {t.publish.publishNow}
                    </span>
                    <span className="text-xs text-text-muted">{t.publish.publishNowDesc}</span>
                  </div>
                  <svg className={`w-5 h-5 shrink-0 ${publishMode === "now" ? "text-primary" : "text-text-muted"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>

                {/* Schedule Post */}
                <button
                  type="button"
                  onClick={() => {
                    setPublishMode("schedule");
                    if (!scheduleConfirmed && canSchedule) {
                      /* Slide into the schedule sub-view (no inline expansion). */
                      setShowSchedulePicker(true);
                      setScheduleStep("date");
                      setComposeView("schedule");
                    }
                    triggerHaptic("selection");
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                    publishMode === "schedule"
                      ? "border-primary bg-primary/10"
                      : "border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg hover:border-gray-300 dark:hover:border-dark-hover"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    publishMode === "schedule" ? "border-primary" : "border-gray-300 dark:border-dark-border"
                  }`}>
                    {publishMode === "schedule" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium block ${
                      publishMode === "schedule" ? "text-gray-900 dark:text-white" : "text-text-secondary"
                    }`}>
                      {t.publish.schedulePost}
                    </span>
                    <span className="text-xs text-text-muted">{t.publish.schedulePostDesc}</span>
                  </div>
                  <svg className={`w-5 h-5 shrink-0 ${publishMode === "schedule" ? "text-primary" : "text-text-muted"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>

              {/* Schedule confirmed preview — "Ce post sera publié le ..." */}
              {publishMode === "schedule" && scheduleConfirmed && !showSchedulePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-3 p-4 bg-accent/5 border border-accent/20 rounded-xl"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-muted uppercase tracking-wide font-medium">
                      {t.publish.scheduledFor}
                    </p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-0.5 tabular-nums">
                      {formattedScheduleDateTime}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSchedulePicker(true);
                      setScheduleStep("date");
                      setComposeView("schedule");
                    }}
                    className="shrink-0 text-sm text-primary font-medium hover:underline min-h-[44px] px-2 flex items-center"
                  >
                    {t.publish.changeSchedule}
                  </button>
                </motion.div>
              )}

              {/* Pro required notice for scheduling */}
              {publishMode === "schedule" && !canSchedule && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-3 p-3 bg-warning/10 border border-warning/30 rounded-xl"
                >
                  <svg className="w-5 h-5 text-warning shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.publish.proRequiredForSchedule}</p>
                    <button
                      onClick={() => { onClose(); router.push("/pricing"); }}
                      className="text-xs text-primary font-medium mt-1 hover:underline"
                    >
                      {t.publish.upgradeToSchedule}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Schedule picker is rendered as the "schedule" sub-view below
                  (back arrow + slide-in). The block kept here is unreachable
                  (`{false && …}`) — the JSX is preserved so closures still
                  resolve at parse time, but it never renders. */}
              <AnimatePresence>
                {false && publishMode === "schedule" && showSchedulePicker && canSchedule && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 bg-gray-50/80 dark:bg-dark-elevated/60 rounded-2xl p-5 border border-gray-100 dark:border-dark-border/60">
                      <AnimatePresence mode="wait">
                        {scheduleStep === "date" && (
                          <motion.div
                            key="schedule-date"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            {/* Step header — left aligned, title + subtitle */}
                            <div className="mb-4">
                              <h4 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                                {t.scheduler.whenPublish}
                              </h4>
                              <p className="text-xs text-text-muted mt-0.5">
                                {t.scheduler.chooseDate}
                              </p>
                            </div>

                            {/* Quick date shortcuts — pill chips, wrapping */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {[
                                { label: t.scheduler.todayShort, days: 0, requiresValid: true },
                                { label: t.scheduler.tomorrow, days: 1, requiresValid: false },
                                { label: t.scheduler.in3Days, days: 3, requiresValid: false },
                                { label: t.scheduler.oneWeek, days: 7, requiresValid: false },
                              ].map(({ label, days, requiresValid }) => {
                                const date = new Date();
                                date.setDate(date.getDate() + days);
                                date.setHours(0, 0, 0, 0);
                                const selected = isDateSelected(date);
                                const unavailable = requiresValid && !todayHasValidTimeSlots();
                                return (
                                  <button
                                    key={days}
                                    onClick={() => {
                                      if (!unavailable && !isDateDisabled(date)) {
                                        triggerHaptic("light");
                                        setScheduledDate(date);
                                        if (isDateToday(date)) {
                                          setScheduledTime(getFirstAvailableTimeForToday());
                                        } else {
                                          setScheduledTime({ hour: 9, minute: 0 });
                                        }
                                        setScheduleStep("time");
                                      }
                                    }}
                                    disabled={unavailable}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[40px] whitespace-nowrap ${
                                      unavailable ? "opacity-40 cursor-not-allowed bg-transparent text-text-muted border border-gray-200 dark:border-dark-border" :
                                      selected ? "bg-primary text-white shadow-sm" :
                                      "bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-dark-border"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Calendar — minimal, Linear/Notion style */}
                            <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border/60">
                              <div className="flex items-center justify-between mb-3">
                                <button
                                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
                                  aria-label="Previous month"
                                >
                                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>
                                <span className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                                  {getMonths(t)[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                </span>
                                <button
                                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
                                  aria-label="Next month"
                                >
                                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>
                              <div className="grid grid-cols-7 gap-1 mb-1">
                                {getDaysShort(t).map((day: string) => (
                                  <div key={day} className="text-center text-[10px] text-text-muted font-semibold py-1.5 uppercase tracking-wider">
                                    {day}
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((date, index) => {
                                  const selected = isDateSelected(date);
                                  const today = isDateToday(date);
                                  const disabled = isDateDisabled(date);
                                  return (
                                    <button
                                      key={index}
                                      onClick={() => {
                                        if (date && !disabled) {
                                          triggerHaptic("light");
                                          setScheduledDate(date);
                                          if (isDateToday(date)) {
                                            setScheduledTime(getFirstAvailableTimeForToday());
                                          } else {
                                            setScheduledTime({ hour: 9, minute: 0 });
                                          }
                                          setScheduleStep("time");
                                        }
                                      }}
                                      disabled={disabled}
                                      className={`
                                        aspect-square flex items-center justify-center text-sm rounded-lg transition-all min-h-[40px]
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
                            </div>
                          </motion.div>
                        )}

                        {scheduleStep === "time" && (
                          <motion.div
                            key="schedule-time"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            {/* Step header — left aligned with selected date subtitle */}
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                                  {t.scheduler.chooseTime}
                                </h4>
                                <p className="text-xs text-text-muted mt-0.5 truncate">
                                  {getDaysShort(t)[scheduledDate.getDay()]} {scheduledDate.getDate()} {getMonths(t)[scheduledDate.getMonth()]}
                                </p>
                              </div>
                              <button
                                onClick={() => setScheduleStep("date")}
                                className="shrink-0 text-xs text-primary font-medium hover:underline min-h-[32px] px-2 flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                {t.ui.changeDate}
                              </button>
                            </div>

                            {/* Compact time dropdown — recommended slots + full list */}
                            <TimeDropdown
                              value={scheduledTime}
                              isTimeDisabled={isTimeDisabled}
                              onSelect={(hour, minute) => {
                                setScheduledTime({ hour, minute });
                                setScheduleConfirmed(true);
                                setShowSchedulePicker(false);
                                setComposeView("compose");
                              }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Free plan signature notice */}
            {shouldShowFreeSignature(currentPlan) && (
              <div className="flex items-start gap-2.5 p-3 bg-primary/5 border border-primary/15 rounded-lg">
                <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {t.publish.freeSignatureNotice}
                  </p>
                  <p className="text-[11px] text-text-muted mt-1 italic">
                    {FREE_PLAN_SIGNATURE.trim()}
                  </p>
                </div>
              </div>
            )}

            {/* Weekly publish quota indicator (Free plan) */}
            {hasWeeklyPublishLimit && (
              <div className={`flex items-start gap-2.5 p-3 rounded-lg border ${
                weeklyLimitReached
                  ? "bg-error/10 border-error/30"
                  : "bg-gray-50 dark:bg-dark-bg border-gray-200 dark:border-dark-border/50"
              }`}>
                <svg className={`w-4 h-4 shrink-0 mt-0.5 ${weeklyLimitReached ? "text-error" : "text-text-muted"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="flex-1">
                  {weeklyLimitReached ? (
                    <>
                      <p className="text-sm font-medium text-error">
                        {t.publish.weeklyLimitReached}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {t.publish.weeklyLimitReachedDesc}
                      </p>
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="text-xs text-primary font-medium mt-2 hover:underline"
                      >
                        {t.publish.upgradeForUnlimited}
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-text-muted">
                      {t.publish.weeklyPublishCount
                        .replace("{used}", String(weeklyPublishUsed))
                        .replace("{limit}", String(wpLimit))}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* No platform selected warning */}
            {noPlatformSelected && (
              <div className="flex items-start gap-3 p-3 bg-error/10 border border-error/30 rounded-lg">
                <svg className="w-5 h-5 text-error shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-error">
                  {t.ui.noPlatformSelectedFull}
                </p>
              </div>
            )}

            {/* Actions moved to Modal/BottomSheet footer prop (renderMobileFooter). */}
          </motion.div>
          )}
          {composeView === "schedule" && (
          <motion.div
            key="schedule-view"
            initial={{ x: 16, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 16, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Back arrow header */}
            <div className="flex items-center gap-2 mb-4 -mt-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setComposeView("compose");
                  /* If user backs out before confirming, keep them on
                   * "Publish now" so the modal isn't stuck in an unfinishable
                   * "schedule" state. Their date/time selections are preserved. */
                  if (!scheduleConfirmed) setPublishMode("now");
                }}
                aria-label={t.dashboard.back}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                {t.publish.schedulePost}
              </h3>
            </div>

            <div className="bg-gray-50/80 dark:bg-dark-elevated/60 rounded-2xl p-5 border border-gray-100 dark:border-dark-border/60">
              <AnimatePresence mode="wait">
                {scheduleStep === "date" && (
                  <motion.div
                    key="schedule-date"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="mb-4">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                        {t.scheduler.whenPublish}
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        {t.scheduler.chooseDate}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {[
                        { label: t.scheduler.todayShort, days: 0, requiresValid: true },
                        { label: t.scheduler.tomorrow, days: 1, requiresValid: false },
                        { label: t.scheduler.in3Days, days: 3, requiresValid: false },
                        { label: t.scheduler.oneWeek, days: 7, requiresValid: false },
                      ].map(({ label, days, requiresValid }) => {
                        const date = new Date();
                        date.setDate(date.getDate() + days);
                        date.setHours(0, 0, 0, 0);
                        const selected = isDateSelected(date);
                        const unavailable = requiresValid && !todayHasValidTimeSlots();
                        return (
                          <button
                            key={days}
                            onClick={() => {
                              if (!unavailable && !isDateDisabled(date)) {
                                triggerHaptic("light");
                                setScheduledDate(date);
                                if (isDateToday(date)) {
                                  setScheduledTime(getFirstAvailableTimeForToday());
                                } else {
                                  setScheduledTime({ hour: 9, minute: 0 });
                                }
                                setScheduleStep("time");
                              }
                            }}
                            disabled={unavailable}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[40px] whitespace-nowrap ${
                              unavailable ? "opacity-40 cursor-not-allowed bg-transparent text-text-muted border border-gray-200 dark:border-dark-border" :
                              selected ? "bg-primary text-white shadow-sm" :
                              "bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-dark-border"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border/60">
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
                          aria-label="Previous month"
                        >
                          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <span className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                          {getMonths(t)[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </span>
                        <button
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
                          aria-label="Next month"
                        >
                          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {getDaysShort(t).map((day: string) => (
                          <div key={day} className="text-center text-[10px] text-text-muted font-semibold py-1.5 uppercase tracking-wider">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((date, index) => {
                          const selected = isDateSelected(date);
                          const today = isDateToday(date);
                          const disabled = isDateDisabled(date);
                          return (
                            <button
                              key={index}
                              onClick={() => {
                                if (date && !disabled) {
                                  triggerHaptic("light");
                                  setScheduledDate(date);
                                  if (isDateToday(date)) {
                                    setScheduledTime(getFirstAvailableTimeForToday());
                                  } else {
                                    setScheduledTime({ hour: 9, minute: 0 });
                                  }
                                  setScheduleStep("time");
                                }
                              }}
                              disabled={disabled}
                              className={`
                                aspect-square flex items-center justify-center text-sm rounded-lg transition-all min-h-[40px]
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
                    </div>
                  </motion.div>
                )}

                {scheduleStep === "time" && (
                  <motion.div
                    key="schedule-time"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                          {t.scheduler.chooseTime}
                        </h4>
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          {getDaysShort(t)[scheduledDate.getDay()]} {scheduledDate.getDate()} {getMonths(t)[scheduledDate.getMonth()]}
                        </p>
                      </div>
                      <button
                        onClick={() => setScheduleStep("date")}
                        className="shrink-0 text-xs text-primary font-medium hover:underline min-h-[32px] px-2 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {t.ui.changeDate}
                      </button>
                    </div>

                    <TimeDropdown
                      value={scheduledTime}
                      isTimeDisabled={isTimeDisabled}
                      onSelect={(hour, minute) => {
                        setScheduledTime({ hour, minute });
                        setScheduleConfirmed(true);
                        setShowSchedulePicker(false);
                        setComposeView("compose");
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          )}
          </AnimatePresence>
        )}

        {/* Confirm Step */}
        {step === "confirm" && (
          <div className="space-y-5 text-center">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              publishMode === "schedule" ? "bg-primary/20" : "bg-warning/20"
            }`}>
              {publishMode === "schedule" ? (
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {publishMode === "schedule" ? t.ui.confirmScheduling : t.ui.confirmPublish}
              </h3>
              {publishMode === "schedule" ? (
                <>
                  <p className="text-text-secondary text-sm">
                    {t.publish.confirmScheduleDesc}
                  </p>
                  <p className="text-primary font-semibold text-base mt-2">{formattedScheduleDateTime}</p>
                  <p className="text-xs text-text-muted mt-1">{timezone}</p>
                </>
              ) : (
                <p className="text-text-secondary text-sm">
                  {t.publish.confirmPublishDesc}{" "}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedPlatforms.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}
                  </span>
                  {selectedPlatforms.includes("linkedin") && (
                    <span>
                      {" "}({visibility === "PUBLIC" ? "public" : t.publish.connectionsOnly})
                    </span>
                  )}
                  .
                </p>
              )}
            </div>
            {/* Actions moved to Modal/BottomSheet footer prop (renderMobileFooter). */}
          </div>
        )}

        {/* Publishing Step */}
        {step === "publishing" && (
          <div className="text-center py-8">
            {/* Circular Progress */}
            <div className="relative w-28 h-28 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(248, 147, 93, 0.2)"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#F8935D"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - progress / 100) }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <svg className="w-6 h-6 text-primary mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{progress}%</span>
              </div>
            </div>

            {/* Dynamic message */}
            <AnimatePresence mode="wait">
              <motion.div
                key={publishMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-gray-900 dark:text-white font-semibold text-lg mb-2">
                  {progress === 100 ? (
                    <span className="flex items-center justify-center gap-2">
                      {publishMode === "schedule" ? t.publish.postScheduled : t.publish.itsLive} <span className="text-xl">{publishMode === "schedule" ? "\u2705" : "\uD83D\uDE80"}</span>
                    </span>
                  ) : (
                    publishMode === "schedule" ? t.publish.schedulingPost : publishMessage
                  )}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress bar */}
            <div className="mt-6 mx-auto max-w-xs">
              <div className="h-1.5 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === "success" && (
          <div className="text-center py-6">
            <motion.div
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
            >
              <motion.svg
                className="w-10 h-10 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </motion.svg>
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {publishMode === "schedule" ? t.publish.postScheduled : t.publish.postPublished}
            </h3>
            <p className="text-text-secondary text-sm mb-6">
              {publishMode === "schedule" ? (
                <>
                  {t.publish.scheduledSuccessfully}
                  <br />
                  <span className="text-primary font-medium">{formattedScheduleDateTime}</span>
                </>
              ) : (
                <>{t.publish.publishedSuccessfully}{publishedLinks.length > 1 ? t.publish.publishedOnSelectedPlatforms : ""}.</>
              )}
            </p>
            {publishMode === "now" && publishedLinks.length > 0 && (
              <div className="flex flex-col gap-2 mb-6">
                {publishedLinks.map((link) => {
                  const config = PLATFORM_LINK_CONFIG[link.platform] || { color: "text-primary hover:text-primary/80", label: link.platform };
                  return (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center gap-2 ${config.color} transition-colors min-h-[44px] px-4 text-sm font-medium`}
                      aria-label={`${t.publish.viewPostOn} ${config.label}`}
                    >
                      {t.publish.viewPostOn} {config.label}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  );
                })}
              </div>
            )}
            {publishMode === "schedule" && (
              <button
                onClick={() => { handleClose(); router.push("/schedule"); }}
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors min-h-[44px] px-4 text-sm font-medium mb-4"
              >
                {t.publish.viewSchedule}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <Button fullWidth onClick={handleClose} className="min-h-[52px]">
              {t.common.close}
            </Button>
          </div>
        )}

        {/* Error Step */}
        {step === "error" && (
          <div className="space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-error/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t.publish.publishFailed}</h3>
              <p className="text-error text-sm">{error}</p>
            </div>
            {/* Actions moved to Modal/BottomSheet footer prop (renderMobileFooter). */}
          </div>
        )}
      </>
    );
  };

  // Mobile footer — fixed at bottom of BottomSheet, outside scroll.
  // Always render in preview/confirm/error so the modal stays usable even when
  // LinkedIn isn't connected — the publish button is gated by
  // cannotPublishOrSchedule (which becomes true when no connected platform is
  // selected).
  const renderMobileFooter = () => {
    if (step === "preview") {
      return (
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleClose}
            className="min-h-[52px]"
          >
            {t.templates.cancel}
          </Button>
          <Button
            fullWidth
            onClick={handleConfirm}
            disabled={cannotPublishOrSchedule}
            className={`min-h-[52px] ${
              cannotPublishOrSchedule
                ? "bg-gray-100 dark:bg-dark-hover border-gray-200 dark:border-dark-border cursor-not-allowed opacity-50"
                : "bg-primary hover:bg-primary-hover border-none"
            }`}
          >
            {publishMode === "schedule" ? (
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
            {publishMode === "schedule" ? t.scheduler.scheduleBtn : t.publish.publish}
          </Button>
        </div>
      );
    }

    if (step === "confirm") {
      return (
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setStep("preview")}
            className="min-h-[52px]"
          >
            {t.publish.back}
          </Button>
          <Button
            fullWidth
            onClick={publishMode === "schedule" ? handleScheduleSubmit : handlePublish}
            isLoading={isScheduleSubmitting || isUploading}
            className="bg-primary hover:bg-primary-hover border-none min-h-[52px]"
          >
            {publishMode === "schedule" ? t.publish.yesSchedule : t.publish.yesPublish}
          </Button>
        </div>
      );
    }

    if (step === "error") {
      return (
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={handleClose} className="min-h-[52px]">
            {t.common.close}
          </Button>
          <Button fullWidth onClick={handleRetry} className="min-h-[52px]">
            {t.publish.retry}
          </Button>
        </div>
      );
    }

    return undefined;
  };

  // Render mobile (BottomSheet) or desktop (Modal)
  return (
    <>
      {isMobile ? (
        <BottomSheet
          isOpen={isOpen}
          onClose={handleClose}
          title={step === "success" ? "" : step === "error" ? t.publish.error : t.ui.publishContent}
          swipeToDismiss={step !== "publishing"}
          footer={renderMobileFooter()}
        >
          {renderContent()}
        </BottomSheet>
      ) : (
        <Modal
          isOpen={isOpen}
          onClose={handleClose}
          title={step === "success" ? "" : step === "error" ? t.publish.error : t.ui.publishContent}
          size="md"
          footer={renderMobileFooter()}
        >
          {renderContent()}
        </Modal>
      )}

      {/* Upgrade Modal */}
      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        remaining={quota?.remaining}
        resetsAt={quota?.resetsAt}
        currentPlan={currentPlan}
      />

      {/* Fullscreen Text Editor (mobile) */}
      <FullScreenTextEditor
        isOpen={showFullScreenEditor}
        onClose={() => setShowFullScreenEditor(false)}
        content={editedContent}
        onChange={setEditedContent}
        placeholder={t.ui.writeContentPlaceholder}
        title={t.publish.postContent}
        platformLimits={[
          ...(selectedPlatforms.includes("linkedin") ? [{ name: "LinkedIn", limit: linkedInLimit }] : []),
          ...(selectedPlatforms.includes("threads") ? [{ name: "Threads", limit: threadsLimit }] : []),
          ...(selectedPlatforms.includes("bluesky") ? [{ name: "Bluesky", limit: blueskyLimit }] : []),
          ...(selectedPlatforms.includes("mastodon") ? [{ name: "Mastodon", limit: mastodonLimit }] : []),
          ...(selectedPlatforms.includes("discord") ? [{ name: "Discord", limit: discordLimit }] : []),
        ]}
      />

      {/* Lightweight connect popup — overlays the modal, never blocks it. */}
      <ConnectPlatformPopup
        isOpen={connectPopupPlatform !== null}
        platform={connectPopupPlatform}
        platformName={popupPlatformInfo?.name || ""}
        platformIcon={popupPlatformInfo?.icon || null}
        platformColor={popupPlatformInfo?.color || ""}
        platformBgColor={popupPlatformInfo?.bgColor || ""}
        onClose={() => setConnectPopupPlatform(null)}
        onConnect={() => {
          if (connectPopupPlatform) {
            const target = connectPopupPlatform;
            setConnectPopupPlatform(null);
            startPlatformConnection(target);
          }
        }}
      />
    </>
  );
}
