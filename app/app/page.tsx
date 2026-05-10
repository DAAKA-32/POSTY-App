"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useQuota } from "@/contexts/QuotaContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useChat } from "@/hooks/chat/useChat";
import { useSmartScroll } from "@/hooks/scroll/useSmartScroll";
import { useKeyboardHeight } from "@/hooks/input/useKeyboardHeight";
import { getUserPostsWithPinned, getDualModeUsageThisWeek, getPost } from "@/lib/db/firestore";
import { setCachedConversation } from "@/lib/storage/conversation-cache";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/db/firebase";
import Image from "next/image";
import { Post, FileAttachment } from "@/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import ChatMessage, { TypingIndicator } from "@/components/chat/ChatMessage";
import ModernAIResponsePair from "@/components/chat/ModernAIResponsePair";
import ModernResponseCard from "@/components/chat/ModernResponseCard";
import ModernStyleSelector from "@/components/chat/ModernStyleSelector";
import DualModeToggle from "@/components/chat/DualModeToggle";
import MaxModeSelector from "@/components/chat/MaxModeSelector";
import InlineUpgradeBanner from "@/components/chat/InlineUpgradeBanner";
import { getPlanFeatures } from "@/lib/config/plan-features";
import NewResponseIndicator from "@/components/chat/NewResponseIndicator";
import PublishToLinkedInModal from "@/components/linkedin/PublishToLinkedInModal";
import { AnimatedScaleFade } from "@/components/animations/AnimatedPageWrapper";
import toast from "@/components/ui/Toast";

import ShimmeringName from "@/components/ui/ShimmeringName";
import { useBrowserMode, setBrowserModeCSSVars } from "@/hooks/ui/useBrowserMode";
import ReadyPostsCarousel from "@/components/ready-posts/ReadyPostsCarousel";
import ReadyPostEditor from "@/components/ready-posts/ReadyPostEditor";
import type { ReadyPostCategory } from "@/lib/data/ready-posts";
import { isReadyPostsEnabled } from "@/lib/config/feature-flags";
import { usePageTitle } from "@/hooks/ui/usePageTitle";
import { trackPostGeneration, initAnalytics } from "@/lib/utils/analytics";
import UniversalChatInput, { UniversalChatInputRef } from "@/components/chat/UniversalChatInput";
import ActionConfirmCard from "@/components/ai-actions/ActionConfirmCard";
import { getPersonalizedGreeting, getPersonalizedSubtitle } from "@/lib/services/personalization";
import { getGiftPopupInfo, isGiftPopupPreviewEmail } from "@/lib/config/plans";

// Premium animation easings - inspired by Linear, Notion
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Animation variants for app page — GPU-friendly (opacity + transform only, no filter:blur)
const welcomeContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const welcomeItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: smoothEase,
    },
  },
};

const inputAreaVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: smoothEase,
    },
  },
};

const suggestionButtonVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      delay: 0.2 + i * 0.05,
      ease: smoothEase,
    },
  }),
};

// Placeholder arrays moved to translation keys (appPage.placeholderExamples / placeholderGeneral)

function AppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile } = useAuth();
  const { connection: linkedInConnection, publishToLinkedIn } = useLinkedIn();
  const { t, language } = useLanguage();
  const { canSendMessage } = useQuota();
  const { isMaxPlan, isProPlan, currentPlan, planLimits } = useSubscription();
  usePageTitle("app");
  const [posts, setPosts] = useState<Post[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishContent, setPublishContent] = useState("");
  const [publishModalMode, setPublishModalMode] = useState<"now" | "schedule">("now");
  // Ready-to-publish post editor state
  const [showReadyEditor, setShowReadyEditor] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ReadyPostCategory | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showGiftPopup, setShowGiftPopup] = useState(false);
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<UniversalChatInputRef>(null);
  const prefersReducedMotion = useReducedMotion();

  // Style selection state (PRO plan feature)
  const [selectedStyle, setSelectedStyle] = useState<"storytelling" | "business">("business");

  // Dual mode state (Pro: 3/week, Max: always on)
  const [dualMode, setDualMode] = useState(false);
  const [dualUsedThisWeek, setDualUsedThisWeek] = useState(0);

  // Max mode selector state (Max plan: choose between dual/storytelling/business)
  const [maxMode, setMaxMode] = useState<"dual" | "storytelling" | "business">("dual");

  // Inline upgrade banner state (replaces mode selector zone for Pro users)
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [upgradeBannerReason, setUpgradeBannerReason] = useState<"dual-limit" | "max-feature">("max-feature");


  // Detect mobile keyboard
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();

  // Detect browser mode vs PWA for input positioning
  const browserMode = useBrowserMode();

  // Set CSS variables for browser mode adjustments
  useEffect(() => {
    setBrowserModeCSSVars(browserMode);
  }, [browserMode]);

  // Load dual mode usage for Pro users
  useEffect(() => {
    if (user?.uid && isProPlan && planLimits.dualResponsesPerWeek > 0) {
      getDualModeUsageThisWeek(user.uid).then(setDualUsedThisWeek).catch(() => {});
    }
  }, [user?.uid, isProPlan, planLimits.dualResponsesPerWeek]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false); // Mirror for callbacks

  // Derive effective dual mode and style from Max selector or Pro toggle
  const effectiveDualMode = isMaxPlan ? maxMode === "dual" : dualMode;
  const effectiveStyle = isMaxPlan
    ? (maxMode === "dual" ? "business" : maxMode)
    : selectedStyle;

  const {
    messages,
    isLoading,
    isStreaming,
    error,
    generate,
    stopGeneration,
    reset,
    insights,
    postId,
    lastPrompt,
  } = useChat({
    userId: user?.uid,
    isGuest: false,
    selectedStyle: effectiveStyle,
    dualMode: effectiveDualMode,
  });

  // Track the last postId we redirected to — prevents duplicate redirects
  const lastRedirectedPostIdRef = useRef<string | null>(null);

  // Reset chat when "Nouveau post" button is clicked (detected via ?new= param)
  const newParam = searchParams.get("new");
  const lastNewParamRef = useRef<string | null>(null);
  useEffect(() => {
    if (newParam && newParam !== lastNewParamRef.current) {
      lastNewParamRef.current = newParam;
      // Reset state for the new conversation
      reset();
      // Allow redirect after next generation
      lastRedirectedPostIdRef.current = null;
    }
  }, [newParam, reset]);

  // Pre-cache the conversation before navigating so the conversation page loads instantly
  useEffect(() => {
    if (postId && postId !== lastRedirectedPostIdRef.current && !isStreaming) {
      lastRedirectedPostIdRef.current = postId;

      // Extract response content from messages we already have in memory
      const aiMessages = messages.filter((m) => m.type === "ai");
      const storytellingMsg = aiMessages.find((m) => m.variant === "storytelling");
      const businessMsg = aiMessages.find((m) => m.variant === "business");
      // Fallback: if no variant, use the first AI message as responseA
      const fallbackContent = aiMessages[0]?.content || "";

      // Build a complete Post from local data — no Firestore round-trip needed
      const cachedPost: Post = {
        id: postId,
        userId: user?.uid || "",
        prompt: lastPrompt,
        responseA: storytellingMsg?.content || fallbackContent,
        responseB: businessMsg?.content || "",
        selectedVersion: null,
        createdAt: { toDate: () => new Date() } as Post["createdAt"],
        title: lastPrompt.length <= 40
          ? lastPrompt
          : lastPrompt.slice(0, 40).replace(/\s+\S*$/, "") + "…",
        responseMode: effectiveDualMode ? "dual" : "single-choice",
        selectedStyle: effectiveDualMode ? undefined : effectiveStyle,
        insights: insights || undefined,
      };

      // Cache before navigating — conversation page will find it instantly
      setCachedConversation(cachedPost);
      setPosts((prev) => [cachedPost, ...prev]);

      // Navigate immediately — no flash since cache is already populated
      router.replace(`/app/c/${postId}`);

      // Background refresh: update cache with full Firestore data silently
      // Delay to let the Firestore save from useChat complete first
      setTimeout(() => {
        getPost(postId).then((freshPost) => {
          if (freshPost) {
            setCachedConversation(freshPost);
            setPosts((prev) => prev.map((p) => p.id === postId ? freshPost : p));
          }
        }).catch(() => {});
      }, 2000);
    }
  }, [postId, isStreaming, router, lastPrompt, user?.uid, messages, effectiveDualMode, effectiveStyle, insights]);

  // Smart scroll: only auto-scroll when user is near bottom
  const {
    containerRef: scrollContainerRef,
    bottomRef: messagesEndRef,
    isNearBottom,
    hasNewContent,
    newContentCount,
    scrollToBottom,
  } = useSmartScroll({
    dependencies: messages,
    isStreaming,
    isLoading,
    threshold: 200,
  });


  // Initialize analytics on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Welcome modal after first payment (one-time, dual-source: sessionStorage + Firestore)
  useEffect(() => {
    const fromSession = sessionStorage.getItem("posty_show_welcome") === "1";
    const fromFirestore = userProfile?.showWelcomeModal === true;

    if (fromSession || fromFirestore) {
      sessionStorage.removeItem("posty_show_welcome");
      const timer = setTimeout(() => setShowWelcomeModal(true), 600);
      return () => clearTimeout(timer);
    }
  }, [userProfile?.showWelcomeModal]);

  // Gift plan popup — one-time display for gift recipients (+ founder preview)
  useEffect(() => {
    if (!user?.email) return;
    const giftInfo = getGiftPopupInfo(user.email);
    if (!giftInfo) return;

    // Preview emails (if any in GIFT_POPUP_PREVIEW_EMAILS) always re-display so
    // we can iterate on the design without resetting Firestore. Real gift
    // recipients see it once and the dismiss is persisted.
    const isPreview = isGiftPopupPreviewEmail(user.email);
    if (!isPreview && userProfile?.giftPopupSeen === true) return;

    setGiftRecipientName(giftInfo.displayName);
    const timer = setTimeout(() => setShowGiftPopup(true), 800);
    return () => clearTimeout(timer);
  }, [user?.email, userProfile?.giftPopupSeen]);

  // Dismiss gift popup and persist in Firestore (skipped for preview emails)
  const dismissGiftPopup = useCallback(() => {
    setShowGiftPopup(false);
    if (user && !isGiftPopupPreviewEmail(user.email)) {
      updateDoc(doc(db, "users", user.uid), { giftPopupSeen: true }).catch(() => {});
    }
  }, [user]);

  // Fetch user posts (with pinned posts first)
  // Fetch sidebar posts — only on mount/user change, NOT on every message
  const sidebarLoadedRef = useRef(false);
  useEffect(() => {
    if (!user || sidebarLoadedRef.current) return;
    sidebarLoadedRef.current = true;
    getUserPostsWithPinned(user.uid, 20).then((userPosts) => {
      setPosts(userPosts);
      // Pre-cache all sidebar conversations for instant navigation
      userPosts.forEach((p) => setCachedConversation(p));
    }).catch(() => {});
  }, [user]);

  // Expand input when keyboard is visible or when focused
  useEffect(() => {
    setIsInputExpanded(isKeyboardVisible || isFocused);
  }, [isKeyboardVisible, isFocused]);

  // Handle click outside to blur input and close keyboard
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      // If click is outside the input container and input is focused
      if (
        inputContainerRef.current &&
        !inputContainerRef.current.contains(target) &&
        textareaRef.current &&
        document.activeElement === textareaRef.current
      ) {
        // Blur the textarea to close keyboard
        textareaRef.current.blur();
      }
    };

    // Add listeners for both mouse and touch events
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Auto-resize textarea with smooth transition
  const resizeTextarea = useCallback(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = "auto";
      // Calculate new height with min/max constraints
      const minHeight = 56;
      const maxHeight = 200;
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [inputValue, resizeTextarea]);


  // Force stop recording helper - cleans up all state
  // IMPORTANT: Set ref to false BEFORE abort() so the onend handler doesn't auto-restart
  const forceStopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setIsProcessingVoice(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore errors
      }
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "fr-FR";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }

        if (finalTranscript) {
          chatInputRef.current?.appendValue(finalTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed") {
          isRecordingRef.current = false;
          setIsRecording(false);
          setIsProcessingVoice(false);
          toast.error(t.appPage.micNotAllowed);
        } else if (event.error === "no-speech") {
          // Silently handle - expected when user pauses
        } else if (event.error !== "aborted") {
          console.warn("Speech recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        // With continuous=true, the browser may still stop unexpectedly
        // (e.g. prolonged silence, network issue). Auto-restart if user hasn't stopped manually.
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch {
            isRecordingRef.current = false;
            setIsRecording(false);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort errors
        }
        recognitionRef.current = null;
      }
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsProcessingVoice(false);
    };
  }, []);

  // Toggle voice recording — user controls start/stop manually
  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isRecordingRef.current) {
      forceStopRecording();
    } else {
      try {
        setIsProcessingVoice(false);
        recognitionRef.current.start();
        isRecordingRef.current = true;
        setIsRecording(true);
      } catch (error) {
        console.error("Failed to start recording:", error);
        isRecordingRef.current = false;
        setIsRecording(false);
        toast.error(t.appPage.recordingError);
      }
    }
  }, [forceStopRecording]);

  const handleGenerate = async (prompt: string, file?: FileAttachment | null) => {
    await generate(prompt, file);
    // Track post generation for activation rate analytics
    trackPostGeneration();
    // Refresh dual mode usage counter for Pro users
    if (user?.uid && isProPlan && planLimits.dualResponsesPerWeek > 0) {
      getDualModeUsageThisWeek(user.uid).then(setDualUsedThisWeek).catch(() => {});
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading || isStreaming) return;
    // Stop recording if active - use forceStopRecording for reliable cleanup
    if (isRecordingRef.current) {
      forceStopRecording();
    }
    const prompt = inputValue.trim();
    setInputValue("");
    // Reset textarea height smoothly
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
    }
    await handleGenerate(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleNewConversation = () => {
    reset();
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(t.appPage.copied);
    } catch {
      toast.error(t.appPage.copyError);
    }
  };

  const handlePublishToLinkedIn = (content: string) => {
    setPublishContent(content);
    setPublishModalMode("now");
    setShowPublishModal(true);
  };

  const handleConfirmPublish = async (
    editedContent: string,
    visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC",
    organizationUrn?: string
  ) => {
    return await publishToLinkedIn(editedContent, visibility, undefined, organizationUrn);
  };

  const handleSchedulePost = (content: string) => {
    setPublishContent(content);
    setPublishModalMode("schedule");
    setShowPublishModal(true);
  };

  const userFirstName = userProfile?.displayName?.split(" ")[0] || "";

  // Dismiss welcome modal and clear Firestore flag
  const dismissWelcomeModal = useCallback(() => {
    setShowWelcomeModal(false);
    if (user) {
      updateDoc(doc(db, "users", user.uid), { showWelcomeModal: false }).catch(() => {});
    }
  }, [user]);

  // Determine if scroll should be disabled (no messages = welcome screen)
  const shouldDisableScroll = messages.length === 0 && !isLoading;

  return (
    <MainLayout posts={posts} showMobileHeader={true}>
      <div className="flex flex-col h-full bg-background-warm dark:bg-background app-content-wrapper">
        {/* Messages area - with padding for content to scroll behind fixed input */}
        <div
          ref={scrollContainerRef}
          className={`
            flex-1 overflow-y-auto gpu-scroll transition-all duration-300 ease-out overscroll-contain
            app-scroll-container
            ${shouldDisableScroll ? 'scroll-disabled lg:overflow-y-auto' : ''}
          `}
        >
          <div className={`max-w-3xl mx-auto px-3 sm:px-4 content-with-fixed-input ${browserMode.isMobileBrowser ? 'mobile-browser-mode' : ''} ${messages.length === 0 ? 'h-full' : 'pt-6'}`}>
            {/* Welcome message when no messages */}
            {messages.length === 0 && !isLoading && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={welcomeContainerVariants}
                className="welcome-screen-container text-center"
              >
                {/* Official Posty logo - Premium version */}
                <motion.div
                  className="relative mb-6 sm:mb-8"
                  variants={welcomeItemVariants}
                >
                  {/* Single subtle glow behind logo — static, GPU-friendly */}
                  <div className="absolute -inset-6 bg-gradient-to-br from-primary/20 via-accent/15 to-primary/20 rounded-full blur-2xl -z-10 opacity-50" />
                  {/* Logo container with subtle float */}
                  <motion.div
                    className="relative gpu-layer"
                    animate={prefersReducedMotion ? {} : { y: [0, -5, 0] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {/* Gradient border ring */}
                    <div className="absolute -inset-1 bg-gradient-to-br from-primary via-accent to-primary rounded-3xl opacity-60 blur-[2px]" />
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden shadow-elevated ring-2 ring-white/50 dark:ring-dark-card/50">
                      <Image
                        src="/logo.png"
                        alt="Posty Logo"
                        width={96}
                        height={96}
                        className="w-full h-full object-contain"
                        priority
                      />
                    </div>
                  </motion.div>
                </motion.div>

                {/* Greeting with premium shimmering name */}
                <motion.h1
                  variants={welcomeItemVariants}
                  className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary mb-2 sm:mb-3"
                >
                  {userProfile?.displayName ? (
                    <>
                      <span className="text-text-primary">{getPersonalizedGreeting(userProfile.displayName.split(" ")[0], language)}</span>
                      <ShimmeringName
                        name={`${userProfile.displayName.split(" ")[0]} !`}
                        showSparkles={true}
                        delay={400}
                      />
                    </>
                  ) : (
                    t.appPage.welcomeTitle
                  )}
                </motion.h1>
                <motion.p
                  variants={welcomeItemVariants}
                  className="text-text-secondary text-sm sm:text-base lg:text-lg max-w-md mb-6 sm:mb-8 px-2"
                >
                  {getPersonalizedSubtitle(userProfile?.profile, language)}
                </motion.p>

                {/* Ready-to-publish post categories — gated behind a rollout
                    flag while the template catalog is finalized. The editor
                    modal stays imported so existing deep-links keep working
                    if anyone navigates with a category preselected. */}
                {isReadyPostsEnabled() && (
                  <motion.div
                    variants={welcomeItemVariants}
                    className="w-full max-w-2xl px-2 template-section"
                  >
                    <ReadyPostsCarousel
                      disabled={!canSendMessage}
                      onPickCategory={(category) => {
                        setSelectedCategory(category);
                        setShowReadyEditor(true);
                      }}
                      className="justify-center"
                    />
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Conversation messages */}
            {messages.length > 0 && (
              <div className="space-y-6 mb-8 w-full">
                <AnimatePresence mode="sync">
                  {(() => {
                    // Get response mode based on plan
                    // Pro: limited dual (3/week), Max: unlimited dual
                    const planFeatures = getPlanFeatures(currentPlan);
                    const isDualMode = planFeatures.responseMode === "dual" || planLimits.hasDualResponseMode;

                    // Find the last AI message index (for action visibility)
                    let lastAIIndex = -1;
                    for (let j = messages.length - 1; j >= 0; j--) {
                      if (messages[j].type === "ai") {
                        lastAIIndex = j;
                        break;
                      }
                    }

                    // Group messages: user messages standalone, AI responses based on plan
                    const elements: React.ReactNode[] = [];
                    let i = 0;
                    let pairIndex = 0;

                    while (i < messages.length) {
                      const message = messages[i];

                      if (message.type === "user") {
                        // Render user message with ChatMessage
                        elements.push(
                          <ChatMessage
                            key={message.id || `user-${i}`}
                            type={message.type}
                            content={message.content}
                            timestamp={message.timestamp}
                            showActions={false}
                            index={i}
                          />
                        );
                        i++;
                      } else if (message.type === "ai") {
                        // Check if next message is also AI (paired response for MAX plan)
                        const nextMessage = messages[i + 1];

                        // Only render AIResponsePair if:
                        // 1. User has MAX plan (dual mode)
                        // 2. There are two consecutive AI messages
                        if (isDualMode && nextMessage && nextMessage.type === "ai") {
                          // Find storytelling and business in the pair
                          const storytelling = message.variant === "storytelling" ? message : nextMessage;
                          const business = message.variant === "business" ? message : nextMessage;

                          // Render paired responses with ModernAIResponsePair (MAX plan only)
                          elements.push(
                            <div key={`pair-${message.id || i}-${pairIndex}`}>
                              {/* POSTY Avatar and Label */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 shrink-0 rounded-xl overflow-hidden shadow-sm">
                                  <Image
                                    src="/logo.png"
                                    alt="Posty"
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <span className="text-xs text-text-muted font-medium">POSTY</span>
                              </div>
                              <ModernAIResponsePair
                                storytellingResponse={{
                                  content: storytelling.content,
                                  variant: "storytelling",
                                  timestamp: storytelling.timestamp,
                                  isStreaming: storytelling.isStreaming,
                                }}
                                businessResponse={{
                                  content: business.content,
                                  variant: "business",
                                  timestamp: business.timestamp,
                                  isStreaming: business.isStreaming,
                                }}
                                userPlan={currentPlan}
                                onPublishToLinkedIn={handlePublishToLinkedIn}
                                onSchedule={handleSchedulePost}
                                isLastMessage={i === lastAIIndex || i + 1 === lastAIIndex}
                              />
                            </div>
                          );
                          pairIndex++;
                          i += 2; // Skip both messages
                        } else {
                          // Single AI response (FREE/PRO plans) - use ModernResponseCard
                          elements.push(
                            <motion.div
                              key={message.id || `ai-${i}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.2,
                                ease: smoothEase,
                              }}
                              className="w-full"
                            >
                              {/* POSTY Avatar and Label */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 shrink-0 rounded-xl overflow-hidden shadow-sm">
                                  <Image
                                    src="/logo.png"
                                    alt="Posty"
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <span className="text-xs text-text-muted font-medium">POSTY</span>
                              </div>

                              {/* Modern Response Card - No border, no block, like ChatGPT */}
                              <ModernResponseCard
                                content={message.content}
                                variant={message.variant || "business"}
                                timestamp={message.timestamp}
                                isStreaming={message.isStreaming}
                                userPlan={currentPlan}
                                onPublishToLinkedIn={handlePublishToLinkedIn}
                                onSchedule={handleSchedulePost}
                                showVariantBadge={planFeatures.responseMode === "single-choice"}
                                isLastMessage={i === lastAIIndex}
                              />
                            </motion.div>
                          );
                          i++;
                        }
                      } else if (message.type === "action" && message.action) {
                        // Action confirmation card
                        const action = message.action;
                        elements.push(
                          <motion.div
                            key={message.id || `action-${i}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, ease: smoothEase }}
                            className="w-full"
                          >
                            {/* POSTY Avatar */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 shrink-0 rounded-xl overflow-hidden shadow-sm">
                                <Image
                                  src="/logo.png"
                                  alt="Posty"
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <span className="text-xs text-text-muted font-medium">POSTY</span>
                            </div>
                            <ActionConfirmCard
                              action={action}
                              onSuccess={(actionType, data) => {
                                if (actionType === "publish_post" && action.params.content) {
                                  handlePublishToLinkedIn(action.params.content);
                                } else if (actionType === "delete_conversation") {
                                  reset();
                                  router.push(`/app?new=${Date.now()}`);
                                }
                                void data;
                              }}
                              onCancel={() => {}}
                            />
                          </motion.div>
                        );
                        i++;
                      } else {
                        i++;
                      }
                    }

                    return elements;
                  })()}
                </AnimatePresence>

                {/* Typing indicator when loading (before streaming starts) */}
                <AnimatePresence>
                  {isLoading && !isStreaming && <TypingIndicator />}
                </AnimatePresence>

              </div>
            )}

            {/* Error message */}
            {error && (
              <AnimatedScaleFade delay={0.1}>
                <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-xl text-error text-center text-sm">
                  <svg className="w-5 h-5 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              </AnimatedScaleFade>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll arrow — visible whenever user is scrolled up and there are messages */}
        <NewResponseIndicator
          isVisible={!isNearBottom && messages.length > 0}
          onClick={scrollToBottom}
          newCount={newContentCount}
          mode={hasNewContent ? "new-content" : "scroll-down"}
        />

        {/* Input area - Always fixed at bottom on all devices */}
        <motion.div
          ref={inputContainerRef}
          initial="hidden"
          animate="visible"
          variants={inputAreaVariants}
          className={`
            fixed-input-area
            ${browserMode.isMobileBrowser ? 'mobile-browser-mode' : ''}
            ${isKeyboardVisible ? 'keyboard-visible' : ''}
          `}
          style={{
            ...(isKeyboardVisible && {
              '--keyboard-height': `${keyboardHeight}px`,
            } as React.CSSProperties),
          }}
        >
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 sm:py-3 lg:py-2">
            {/* Post Mode Selector / Upgrade Banner zone */}
            <AnimatePresence mode="wait">
              {isMaxPlan && (
                <motion.div
                  key="max-selector"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mb-3 flex items-center justify-center gap-2 overflow-hidden"
                >
                  <MaxModeSelector
                    selectedMode={maxMode}
                    onModeChange={setMaxMode}
                  />
                </motion.div>
              )}
              {isProPlan && !isMaxPlan && (
                <motion.div
                  key="pro-selector"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mb-3 flex items-center justify-center gap-2 overflow-hidden"
                >
                  {showUpgradeBanner ? (
                    <InlineUpgradeBanner
                      reason={upgradeBannerReason}
                      onClose={() => setShowUpgradeBanner(false)}
                    />
                  ) : (
                    <DualModeToggle
                      enabled={dualMode}
                      onToggle={(val) => setDualMode(val)}
                      responseType={selectedStyle}
                      onResponseTypeChange={setSelectedStyle}
                      dualUsedThisWeek={dualUsedThisWeek}
                      onUpgradePrompt={(reason) => {
                        setUpgradeBannerReason(reason);
                        setShowUpgradeBanner(true);
                      }}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              {/* Voice feedback is handled by UniversalChatInput's built-in status bar */}

              {/* UniversalChatInput - Unified premium input component */}
              <UniversalChatInput
                ref={chatInputRef}
                onSubmit={async (message, file) => {
                  if (isRecordingRef.current) forceStopRecording();
                  await handleGenerate(message, file);
                }}
                onStop={stopGeneration}
                placeholder={t.appPage.placeholderFixed}
                disabled={!canSendMessage}
                isLoading={isLoading || isStreaming}
                enableVoiceRecording={speechSupported}
                onVoiceRecordingStart={toggleRecording}
                onVoiceRecordingStop={toggleRecording}
                isRecording={isRecording}
                enableFileAttachment={true}
                fileAttachmentAllowed={isMaxPlan}
                showHelperText={true}
                maxHeight={200}
                minHeight={56}
                isMobile={browserMode.isMobileBrowser}
                keyboardHeight={keyboardHeight}
                browserMode={browserMode}
                context="new-chat"
                quotaLimitReached={!canSendMessage}
                currentPlan={currentPlan}
                maxCharacters={planLimits.maxCharactersPerPrompt}
                showCharacterCount={true}
              />
            </div>

            {/* Additional helper text - Desktop only (hidden on mobile via CSS) */}
            <p className="hidden sm:block text-2xs text-gray-500 dark:text-gray-400 text-center mt-0">
              {t.appPage.disclaimer}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Unified publish / schedule modal */}
      <PublishToLinkedInModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        content={publishContent}
        linkedInConnection={linkedInConnection}
        onPublish={handleConfirmPublish}
        initialMode={publishModalMode}
      />

      {/* Ready-to-publish post browser/editor */}
      <ReadyPostEditor
        isOpen={showReadyEditor}
        category={selectedCategory}
        unlocked={isMaxPlan}
        profile={userProfile?.profile}
        onClose={() => {
          setShowReadyEditor(false);
          setSelectedCategory(null);
        }}
        onPublishNow={(content) => {
          setShowReadyEditor(false);
          setSelectedCategory(null);
          handlePublishToLinkedIn(content);
        }}
        onSchedule={(content) => {
          setShowReadyEditor(false);
          setSelectedCategory(null);
          handleSchedulePost(content);
        }}
        onUpgrade={() => {
          setShowReadyEditor(false);
          setSelectedCategory(null);
          router.push("/pricing");
        }}
      />

      {/* Gift Plan Popup - One-time for gift recipients */}
      <AnimatePresence>
        {showGiftPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md"
            onClick={dismissGiftPopup}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-lg bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top gradient bar — Max plan signature */}
              <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary shrink-0" />

              {/* Close button — 40px touch target for mobile, explicit colors */}
              <button
                onClick={dismissGiftPopup}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 z-10"
                aria-label="Fermer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="px-5 sm:px-7 pt-7 sm:pt-8 pb-6 sm:pb-7 overflow-y-auto">
                {/* Gift icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 14 }}
                  className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 flex items-center justify-center text-3xl sm:text-4xl"
                >
                  🎁
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center px-2"
                >
                  Bonjour {giftRecipientName} 👋
                </motion.h2>

                {/* Hero pitch */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="text-center text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-5 leading-relaxed"
                >
                  Comme prévu, voici vos <span className="font-semibold text-primary">2 semaines d&apos;accès offert au plan Max</span> 🚀
                </motion.p>

                {/* Body — what's included (frosted glass card) */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gray-100/70 dark:bg-white/[0.05] backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-xl p-4 mb-5"
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Vous débloquez l&apos;intégralité de Posty :
                  </p>
                  <ul className="text-sm text-gray-900 dark:text-white space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Créations IA <strong>illimitées</strong>, qualité ultra</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Multi-réseaux + publication simultanée</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Programmation, mode Story + Business, briefs longs</span>
                    </li>
                  </ul>
                </motion.div>

                {/* Future offer teaser */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed"
                >
                  À l&apos;issue de cet essai, on revient vers vous avec une <span className="font-semibold text-gray-900 dark:text-white">offre personnalisée</span> — taillée sur mesure pour automatiser entièrement votre présence sur Instagram, TikTok et plus, avec du contenu vraiment adapté à votre image.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-gray-700 dark:text-gray-300 mb-5 leading-relaxed"
                >
                  En attendant, profitez-en à fond — et n&apos;hésitez pas à nous partager vos retours, ils nous sont précieux.
                </motion.p>

                {/* Signature */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="text-sm text-gray-500 dark:text-gray-400 italic mb-6"
                >
                  — Côme &amp; Emilien
                </motion.p>

                {/* CTA */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  onClick={dismissGiftPopup}
                  className="w-full py-3 px-6 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
                >
                  C&apos;est parti 🚀
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Modal - One-time after first payment */}
      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={dismissWelcomeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md bg-white dark:bg-dark-card rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-dark-border text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={dismissWelcomeModal}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors text-text-muted hover:text-text-primary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Logo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 mx-auto mb-6 rounded-3xl overflow-hidden shadow-lg ring-2 ring-primary/20"
              >
                <Image src="/logo.png" alt="Posty" width={80} height={80} className="w-full h-full object-contain" />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-silver-shimmer dark:text-white mb-2"
              >
                {userFirstName ? `${t.appPage.welcomeUser} ${userFirstName} !` : t.appPage.welcomeBack}
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-text-secondary mb-6"
              >
                {t.appPage.subscriptionActive}
              </motion.p>

              {/* Quick tips */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4 mb-6 text-left space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p className="text-sm text-text-secondary">{t.appPage.tipGenerate}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <p className="text-sm text-text-secondary">{t.appPage.tipTemplate}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <p className="text-sm text-text-secondary">{t.appPage.tipPublish}</p>
                </div>
              </motion.div>

              {/* CTA */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={dismissWelcomeModal}
                className="w-full py-3 px-6 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
              >
                {t.appPage.getStarted}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}

export default function AppPage() {
  return (
    <ProtectedRoute requireOnboarding requireSubscription>
      <Suspense fallback={null}>
        <AppContent />
      </Suspense>
    </ProtectedRoute>
  );
}
