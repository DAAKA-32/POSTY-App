"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useQuota } from "@/contexts/QuotaContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useChat } from "@/hooks/chat/useChat";
import { useSmartScroll } from "@/hooks/scroll/useSmartScroll";
import { useKeyboardHeight } from "@/hooks/input/useKeyboardHeight";
import { getUserPostsWithPinned, getDualModeUsageThisWeek, getPost, createImagePost, appendGeneratedImage, setGeneratedImageVariantSelections } from "@/lib/db/firestore";
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
import ConversationalResponse from "@/components/chat/ConversationalResponse";
import ModernStyleSelector from "@/components/chat/ModernStyleSelector";
import DualModeToggle from "@/components/chat/DualModeToggle";
import MaxModeSelector from "@/components/chat/MaxModeSelector";
import AIModeSwitch, { AIMode } from "@/components/chat/AIModeSwitch";
import InlineUpgradeBanner from "@/components/chat/InlineUpgradeBanner";
import GeneratedImageVariants from "@/components/chat/GeneratedImageVariants";
import ImageGenLoader from "@/components/chat/ImageGenLoader";
import { useImageGeneration, type GeneratedImage } from "@/hooks/image/useImageGeneration";
import { resolveImageBrief } from "@/lib/ai/brief-resolver";
import { clientFastIntent } from "@/lib/ai/client-intent";
import { getAuthHeaders } from "@/lib/api/client";
import { getPlanFeatures } from "@/lib/config/plan-features";
import NewResponseIndicator from "@/components/chat/NewResponseIndicator";
import PublishToLinkedInModal from "@/components/linkedin/PublishToLinkedInModal";
import AppTourModal from "@/components/onboarding/AppTourModal";
import { useAppTour } from "@/hooks/app/useAppTour";
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
  // Premium first-time feature tour (5-slide carousel). Auto-opens after the
  // user finishes the profile onboarding form and lands on /app.
  const appTour = useAppTour();
  const [posts, setPosts] = useState<Post[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishContent, setPublishContent] = useState("");
  const [publishModalMode, setPublishModalMode] = useState<"now" | "schedule">("now");
  // Pre-generated visual(s) to attach in the publish modal — one URL per
  // image to surface as a ready-to-go File. Empty array = no media pre-attached.
  const [publishPreloadedImageUrls, setPublishPreloadedImageUrls] = useState<string[]>([]);
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

  // Top-level chat persona: post generation (default), Q&A support, or image
  // generation. Defaults to "posts" so existing post-generation flow is unchanged.
  const [aiMode, setAiMode] = useState<AIMode>("posts");

  // Image-gen entries — one per generation attempt so the chat surface shows
  // the user's prompt, the loader, and the final image (or inline error) in
  // strict chronological order, the way ChatGPT does. Status flips from
  // "generating" → "done" or "error" once the API resolves.
  type ImageEntryStatus = "generating" | "done" | "error";
  interface ImageEntry {
    id: string;
    prompt: string;
    createdAt: number;
    status: ImageEntryStatus;
    /** First variant — kept as a back-compat alias and as the default
     *  selection when `images` isn't populated (legacy entries). */
    image?: GeneratedImage;
    /** All rendered variants in order. Length ≥ 1 when status === "done". */
    images?: GeneratedImage[];
    /** Indices inside `images` the user picked for publishing, in click order.
     *  Defaults to `[0]` on first render (one visual selected) and `[]` after
     *  the user deselects everything. Survives re-renders so the publish
     *  modal knows which URLs to pre-attach. */
    selectedVariantIndices?: number[];
    /** True when this entry was generated as part of an intent=both run.
     *  The renderer uses it to (a) suppress the duplicate user-prompt
     *  bubble that the post pipeline already shows and (b) keep the entry
     *  out of the standalone-image list — the visual will be embedded
     *  inside the matching post bubble via `attachedImage`. */
    embed?: boolean;
    errorMessage?: string;
  }
  const [imageEntries, setImageEntries] = useState<ImageEntry[]>([]);
  /** How many variants we ask /api/image/generate for. The server caps this
   *  to plan limits (Pro ≤ 2, Max ≤ 3), so requesting 3 here is the natural
   *  "give me up to the max your plan allows" knob. Free plans never reach
   *  this code because the prior quota check blocks them. */
  const VARIANT_COUNT_PER_REQUEST = 3;
  // Tracks the `posts/{id}` Firestore doc that owns the current image-mode
  // conversation. Null on the welcome screen; assigned on the first successful
  // generation, then reused for follow-ups on the same chat surface. Cleared
  // by `reset()` when the user starts a new conversation.
  const imagePostIdRef = useRef<string | null>(null);
  // Links a chat message id → the image entry id generated in the SAME
  // "both" intent run. The renderer uses this to embed the image inside
  // the post preview (LinkedIn-style media attachment) instead of showing
  // two separate cards stacked vertically.
  const [messageImagePairs, setMessageImagePairs] = useState<Record<string, string>>({});
  /** True while an intent=both run is awaiting both pipelines + the Firestore
   *  write that links the image to its message. The auto-redirect to
   *  /app/c/[id] gates on this — redirecting early left the new page to
   *  hydrate from Firestore BEFORE the image record was written, so the
   *  embed silently dropped and the user had to refresh to see the visual. */
  const [imageEmbedPersisting, setImageEmbedPersisting] = useState(false);
  const {
    generate: generateImage,
    isLoading: isGeneratingImage,
    quota: imageQuota,
  } = useImageGeneration();

  // Helpers to mutate a single entry without losing the others — used by the
  // submit handler (start → resolve) and the regenerate handler.
  const upsertImageEntry = useCallback(
    (id: string, patch: Partial<ImageEntry>) => {
      setImageEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
    },
    []
  );

  /** Toggle a variant index in/out of an entry's selection, preserving click
   *  order. The first click adds to the end of the array; clicking an already-
   *  selected variant removes it (and renumbers the badges for the rest). */
  const toggleVariantSelection = useCallback(
    (entryId: string, variantIndex: number) => {
      setImageEntries((prev) =>
        prev.map((e) => {
          if (e.id !== entryId) return e;
          const cur = e.selectedVariantIndices ?? (e.image ? [0] : []);
          const next = cur.includes(variantIndex)
            ? cur.filter((i) => i !== variantIndex)
            : [...cur, variantIndex];
          return { ...e, selectedVariantIndices: next };
        })
      );
    },
    []
  );

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
    aiMode,
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
      setImageEntries([]);
      imagePostIdRef.current = null;
      // Allow redirect after next generation
      lastRedirectedPostIdRef.current = null;
    }
  }, [newParam, reset]);

  // Stable refs for values that change rapidly during streaming. Keeping them
  // out of the redirect effect's deps prevents the effect body from being
  // re-evaluated on every SSE chunk (which caused jitter during a stream).
  const redirectInputsRef = useRef({
    messages,
    lastPrompt,
    userId: user?.uid,
    effectiveDualMode,
    effectiveStyle,
    insights,
    imageEntries,
    messageImagePairs,
  });
  redirectInputsRef.current = {
    messages,
    lastPrompt,
    userId: user?.uid,
    effectiveDualMode,
    effectiveStyle,
    insights,
    imageEntries,
    messageImagePairs,
  };

  // Pre-cache the conversation before navigating so the conversation page loads
  // instantly. Triggered only by stream completion (`isStreaming` flips false)
  // — never during a stream, never on every message chunk.
  useEffect(() => {
    if (!postId || postId === lastRedirectedPostIdRef.current || isStreaming) return;
    // Wait for the intent=both Firestore write to settle. Without this guard,
    // the post finishes streaming first → redirect fires → /app/c/[id] hydrates
    // from Firestore that doesn't yet contain the image → user sees text only
    // and needs to refresh. With it, redirect waits the few seconds image gen
    // takes; user stays on /app watching the placeholder until the image lands.
    if (imageEmbedPersisting) return;
    lastRedirectedPostIdRef.current = postId;

    const {
      messages: msgs,
      lastPrompt: lp,
      userId,
      effectiveDualMode: dual,
      effectiveStyle: style,
      insights: ins,
      imageEntries: entries,
      messageImagePairs: pairs,
    } = redirectInputsRef.current;

    // Extract response content from messages we already have in memory.
    // Conversational replies (Q&A, "tu connais X ?", advice) carry no `variant` —
    // useChat sets variant=undefined for them. We MUST persist that signal in
    // the cache so /app/c/[id] renders <ConversationalResponse>, not the
    // <ModernResponseCard> LinkedIn preview. Forgetting it caused the
    // "answers a question → reload flips to a fake post preview" bug.
    const aiMessages = msgs.filter((m) => m.type === "ai");
    const storytellingMsg = aiMessages.find((m) => m.variant === "storytelling");
    const businessMsg = aiMessages.find((m) => m.variant === "business");
    const conversationalMsg = aiMessages.find((m) => m.variant === undefined);
    const isConversational =
      aiMessages.length > 0 && !storytellingMsg && !businessMsg;
    const fallbackContent = aiMessages[0]?.content || "";

    // Reverse-map pair (msg.id → entry.id) for quick lookup when serialising
    // the embed entries into GeneratedImageRecord shape. Without this, the
    // image lands in Firestore (via appendGeneratedImage) but the cached
    // Post we hand to /app/c/[id] omits `generatedImages`, so the new page
    // hydrates from a visual-less cache and the user sees text only —
    // exactly the "loader → empty bubble → Add Visuals button" symptom.
    const entryIdToMessageId = new Map<string, string>();
    for (const [mid, eid] of Object.entries(pairs)) entryIdToMessageId.set(eid, mid);
    const generatedImages = entries
      .filter((e) => e.status === "done" && e.image)
      .map((e) => ({
        id: e.id,
        prompt: e.prompt,
        url: e.image!.url,
        imageId: e.image!.imageId,
        generatedAt: e.image!.generatedAt,
        variants: (e.images && e.images.length > 0 ? e.images : [e.image!]).map((v) => ({
          url: v.url,
          imageId: v.imageId,
        })),
        // Persist BOTH the multi-select array (new field) and the legacy
        // single-index (= first pick) so older clients keep working. Default
        // to [0] when the entry has no explicit selection yet.
        selectedVariantIndices: e.selectedVariantIndices ?? [0],
        selectedVariantIndex: (e.selectedVariantIndices ?? [0])[0] ?? 0,
        ...(entryIdToMessageId.has(e.id)
          ? { messageId: entryIdToMessageId.get(e.id) }
          : {}),
      }));

    // Build a complete Post from local data — no Firestore round-trip needed
    const cachedPost: Post = {
      id: postId,
      userId: userId || "",
      prompt: lp,
      responseA: isConversational
        ? (conversationalMsg?.content || fallbackContent)
        : (storytellingMsg?.content || fallbackContent),
      responseB: isConversational ? "" : (businessMsg?.content || ""),
      selectedVersion: null,
      createdAt: { toDate: () => new Date() } as Post["createdAt"],
      title: lp.length <= 40
        ? lp
        : lp.slice(0, 40).replace(/\s+\S*$/, "") + "…",
      responseMode: isConversational
        ? "conversational"
        : (dual ? "dual" : "single-choice"),
      selectedStyle: (isConversational || dual) ? undefined : style,
      // Insights only fire server-side for posts (the `!isConversational` gate
      // in /api/generate). Drop them here too so a stale insight from a prior
      // post doesn't bleed into a conversational reply's cached snapshot.
      insights: isConversational ? undefined : (ins || undefined),
      ...(generatedImages.length > 0 ? { generatedImages } : {}),
    };

    setCachedConversation(cachedPost);
    setPosts((prev) => [cachedPost, ...prev]);

    router.replace(`/app/c/${postId}`);

    // Background refresh: update cache with full Firestore data silently
    setTimeout(() => {
      getPost(postId).then((freshPost) => {
        if (freshPost) {
          setCachedConversation(freshPost);
          setPosts((prev) => prev.map((p) => p.id === postId ? freshPost : p));
        }
      }).catch(() => {});
    }, 2000);
  }, [postId, isStreaming, imageEmbedPersisting, router]);

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

  /**
   * Runs the image pipeline for a single brief: creates a loader entry,
   * calls the API, then persists / redirects on first success. Extracted
   * so the unified `handleGenerate` can fire it standalone (intent=image)
   * or in parallel with the post pipeline (intent=both).
   *
   * Returns the entry id and the rendered record (when successful) so the
   * caller can hand the visual off to a sibling pipeline — specifically,
   * the intent=both path uses this to append the image to the post Firestore
   * doc created by useChat instead of creating a duplicate image-only Post.
   */
  const runImageGeneration = useCallback(
    async (
      displayPrompt: string,
      brief: string,
      opts?: {
        /** When true, the function skips its own Firestore writes (no
         *  createImagePost / appendGeneratedImage call, no redirect). The
         *  caller is responsible for persisting the returned record onto
         *  whichever post it ends up attached to. Used by intent=both. */
        embed?: boolean;
        /** Override the default VARIANT_COUNT_PER_REQUEST. Used by the
         *  "Ajouter des visuels" picker where the user explicitly chooses
         *  1, 2, or 3 variants. */
        variantCount?: 1 | 2 | 3;
      }
    ): Promise<{
      entryId: string;
      record?: import("@/types").GeneratedImageRecord;
      ok: boolean;
    }> => {
      const entryId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setImageEntries((prev) => [
        ...prev,
        {
          id: entryId,
          prompt: displayPrompt,
          createdAt: Date.now(),
          status: "generating",
          // `embed` tells the renderer this entry is paired with a post —
          // suppresses the duplicate user-prompt bubble and prevents the
          // standalone image card from showing alongside the post bubble.
          embed: opts?.embed === true,
        } as ImageEntry,
      ]);

      // Pull the latest assistant POST (with a variant — conversational
      // replies have variant=undefined and aren't valid image briefs). The
      // brief resolver then decides: if the caller's brief is referential
      // ("ajoute des images", "regenere", a bare noun like "images"), it
      // substitutes a post-derived brief so the visual hits the right
      // topic. Concrete briefs ("Visuel moderne sur la tech") pass through.
      const lastAssistantPost = [...messages]
        .reverse()
        .find((m) => m.type === "ai" && m.variant !== undefined);
      const lastAssistantAnything = [...messages]
        .reverse()
        .find((m) => m.type === "ai");
      const resolved = resolveImageBrief({
        rawBrief: brief,
        postContent: lastAssistantPost?.content ?? null,
      });
      const result = await generateImage(resolved.brief, {
        // postContext keeps the full post visible to the art director (~2000
        // char cap defended in the hook). When the brief was already
        // post-derived, postContext gives extra fidelity (tone, structure).
        postContext: lastAssistantPost?.content ?? lastAssistantAnything?.content,
        language: (t as { meta?: { lang?: "fr" | "en" } })?.meta?.lang ?? "fr",
        silent: true,
        variantCount: opts?.variantCount ?? VARIANT_COUNT_PER_REQUEST,
      });
      if (!result.ok) {
        upsertImageEntry(entryId, { status: "error", errorMessage: result.error.message });
        return { entryId, ok: false };
      }
      upsertImageEntry(entryId, {
        status: "done",
        image: result.image,
        images: result.images,
        // Default = first variant pre-selected; user can toggle others or
        // deselect to publish without any visual.
        selectedVariantIndices: [0],
      });

      const record: import("@/types").GeneratedImageRecord = {
        id: entryId,
        prompt: displayPrompt,
        url: result.image.url,
        imageId: result.image.imageId,
        generatedAt: result.image.generatedAt,
        variants: result.images.map((img) => ({ url: img.url, imageId: img.imageId })),
        selectedVariantIndices: [0],
        selectedVariantIndex: 0,
      };

      if (!user?.uid) return { entryId, record, ok: true };

      // Embedded mode: the caller (intent=both orchestration) owns the
      // Firestore write. We just hand back the record.
      if (opts?.embed) return { entryId, record, ok: true };

      try {
        const existingPostId = imagePostIdRef.current;
        if (!existingPostId) {
          const newPostId = await createImagePost(user.uid, displayPrompt, record);
          imagePostIdRef.current = newPostId;
          const optimistic: Post = {
            id: newPostId,
            userId: user.uid,
            prompt: displayPrompt,
            responseA: "",
            responseB: "",
            selectedVersion: null,
            createdAt: { toDate: () => new Date() } as Post["createdAt"],
            title: displayPrompt.length <= 40
              ? displayPrompt
              : displayPrompt.slice(0, 40).replace(/\s+\S*$/, "") + "…",
            responseMode: "conversational",
            generatedImages: [record],
          };
          setPosts((prev) => [optimistic, ...prev]);
          router.replace(`/app/c/${newPostId}`);
        } else {
          await appendGeneratedImage(existingPostId, record);
        }
      } catch (err) {
        console.warn("[image-gen] persist failed (image still shown):", err);
      }
      return { entryId, record, ok: true };
    },
    [messages, generateImage, t, upsertImageEntry, user, router]
  );

  /**
   * Fires `/api/intent` to classify the prompt with a two-layer safety net:
   *
   *   1. **Client fast-path** (`clientFastIntent`) runs synchronously BEFORE
   *      the network call. When the user's wording is unambiguous (e.g.
   *      "fais un post avec des visuels"), we already know it's `both` —
   *      we still await the server response to capture clean briefs, but
   *      this gives us a reliable fallback if the server is slow or down.
   *
   *   2. **3.5s soft timeout** on the network call. gpt-4o-mini classifies
   *      in ~150-300ms typical but spikes to 2-3s on bad OpenAI days. The
   *      old 1.5s cap silently dropped slow classifications and routed the
   *      prompt to "post", killing every "post + images" request that hit
   *      a latency blip.
   *
   *   3. **Intent-aware fallback** — never silently default to "post" when
   *      the user explicitly mentioned visuals. If the server returns "post"
   *      / "conversation" but the prompt clearly asks for an image, we
   *      surface that mismatch via `userWantedVisuals` so the UI can
   *      highlight the "Add Visual" CTA instead of pretending nothing
   *      happened.
   */
  const classifyIntent = useCallback(
    async (prompt: string): Promise<{
      intent: "post" | "image" | "both" | "conversation";
      postBrief?: string;
      imageBrief?: string;
      /** Fine-grained sub-type — forwarded to /api/generate as intentHint
       *  so the post route skips its own classifier. */
      postType?: "PRODUCTION" | "HYBRID" | "ASSISTANCE" | "SOCIAL";
      /** True when the prompt clearly mentioned a visual deliverable but
       *  the resolved intent didn't end up firing the image pipeline
       *  (server timed out, server returned "post", etc.). Lets the UI
       *  promote the "Add Visual" CTA instead of burying it. */
      userWantedVisuals: boolean;
    }> => {
      const local = clientFastIntent(prompt);

      // Build a deterministic fallback BEFORE the network call. If the
      // server times out or 5xx's, we use this instead of the historical
      // silent "post" default — keeps "fais un post avec des images" on
      // the both-pipeline even when /api/intent is unhealthy.
      const localFallback: {
        intent: "post" | "image" | "both" | "conversation";
        postBrief?: string;
        imageBrief?: string;
        postType?: "PRODUCTION" | "HYBRID" | "ASSISTANCE" | "SOCIAL";
      } =
        local.intent === "both"
          ? { intent: "both", postBrief: local.postBrief, imageBrief: local.imageBrief, postType: "PRODUCTION" }
          : local.intent === "image"
            ? { intent: "image", imageBrief: local.imageBrief }
            : local.intent === "post"
              ? { intent: "post", postBrief: local.postBrief, postType: "PRODUCTION" }
              : { intent: "post", postBrief: prompt };

      try {
        const headers = await getAuthHeaders();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch("/api/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            prompt,
            hasPriorConversation: messages.length > 0 || imageEntries.length > 0,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          return { ...localFallback, userWantedVisuals: local.hasImageMention };
        }
        const data = await res.json();
        const intent = (data.intent ?? localFallback.intent) as "post" | "image" | "both" | "conversation";
        // Mismatch detection: user asked for visuals but the server didn't
        // route to image/both. Don't silently downgrade — flag it so the
        // CTA can pulse and the user can recover in one click.
        const userWantedVisuals =
          local.hasImageMention && intent !== "image" && intent !== "both";
        return {
          intent,
          postBrief: data.postBrief ?? localFallback.postBrief ?? prompt,
          imageBrief: data.imageBrief ?? localFallback.imageBrief ?? prompt,
          postType: data.postType,
          userWantedVisuals,
        };
      } catch {
        return { ...localFallback, userWantedVisuals: local.hasImageMention && localFallback.intent !== "image" && localFallback.intent !== "both" };
      }
    },
    [messages.length, imageEntries.length]
  );

  const handleGenerate = async (prompt: string, file?: FileAttachment | null) => {
    // Support mode is an explicit user choice — never re-classify, just go
    // straight to the conversational pipeline. ASSISTANCE is the hint that
    // tells /api/generate to skip its classifier and use the assistant path.
    if (aiMode === "support") {
      await generate(prompt, file, "ASSISTANCE");
      trackPostGeneration();
      return;
    }

    // Posts mode: classify the user's prompt and route to the right
    // pipeline(s). The classifier is fast (<300ms typical, 1.5s hard cap)
    // and falls back to "post" if anything goes wrong, so the worst case
    // is exactly the legacy behaviour.
    const classification = await classifyIntent(prompt);

    if (classification.intent === "image") {
      await runImageGeneration(prompt, classification.imageBrief || prompt);
      return;
    }

    if (classification.intent === "both") {
      // Conversational acknowledgement: tell the user we understood the
      // multimodal ask BEFORE the two pipelines start streaming. Without
      // this, the UI looks like a regular post generation that suddenly
      // sprouts a visual at the end — confusing for "fais un post avec
      // des images" which is supposed to feel coordinated.
      toast.info("✨ Création du post et des visuels en parallèle…", { duration: 3500 });
      // Block the auto-redirect until the image record is written to
      // Firestore with its messageId — otherwise the redirect races the
      // write and /app/c/[id] hydrates without the image, forcing a refresh.
      setImageEmbedPersisting(true);
      // Post + image in parallel. Both are independent pipelines so
      // Promise.all lets the post stream and the image render finish at
      // their own pace. Two important constraints versus a vanilla run:
      //
      //   1. The post is forced to a single style (storytelling). Stacking
      //      a dual post on top of 3 image variants overloads the chat
      //      surface and was explicitly flagged as a regression. dualMode
      //      stays on for plain post requests; it's only the both-flow
      //      that collapses to one variant.
      //   2. Image generation runs in `embed: true` mode — it does NOT
      //      create a separate image-only Post in Firestore. The post
      //      pipeline owns the Post doc; we append the image to it once
      //      we know its id, so a reload still finds both the text and
      //      the visual in the same conversation.
      let imageResult: Awaited<ReturnType<typeof runImageGeneration>> | null = null;
      let postResult: Awaited<ReturnType<typeof generate>> | null = null;
      try {
        [postResult, imageResult] = await Promise.all([
          generate(
            classification.postBrief || prompt,
            file,
            classification.postType,
            { forceSingleStyle: "storytelling" }
          ),
          runImageGeneration(
            prompt,
            classification.imageBrief || prompt,
            { embed: true }
          ),
        ]);

        // Pair the newest AI message with the just-rendered image so
        // ModernResponseCard embeds it as a LinkedIn-style media attachment.
        if (imageResult.ok && imageResult.record) {
          const latestMessages = redirectInputsRef.current.messages;
          const newestAi = [...latestMessages].reverse().find((m) => m.type === "ai");
          if (newestAi?.id) {
            setMessageImagePairs((prev) => ({ ...prev, [newestAi.id!]: imageResult!.entryId }));
          }
          // Attach the image to the post Firestore doc so the conversation
          // re-loads with text + visual instead of one of them being lost.
          // The `messageId` field is the critical part — without it, reload
          // sees an unowned image and renders it standalone (full-width),
          // breaking the embedded LinkedIn-card geometry and the publish flow
          // (which derives attached images from messageImagePairs).
          if (postResult?.postId && user?.uid) {
            try {
              await appendGeneratedImage(postResult.postId, {
                ...imageResult.record,
                messageId: newestAi?.id,
              });
            } catch (err) {
              console.warn("[intent=both] failed to append image to post (image still rendered):", err);
            }
          }
        }
      } finally {
        // Release the redirect gate even on failure so the user still lands
        // on the conversation page (with text only, in the worst case).
        setImageEmbedPersisting(false);
      }

      trackPostGeneration();
      if (user?.uid && isProPlan && planLimits.dualResponsesPerWeek > 0) {
        getDualModeUsageThisWeek(user.uid).then(setDualUsedThisWeek).catch(() => {});
      }
      return;
    }

    // intent === "post" OR "conversation" — both flow through the post
    // pipeline. "Conversation" is rendered as plain prose by the existing
    // ConversationalResponse component when no LinkedIn structure is detected.
    // Pass `postType` so /api/generate skips its internal classifier.
    await generate(classification.postBrief || prompt, file, classification.postType);
    trackPostGeneration();
    if (user?.uid && isProPlan && planLimits.dualResponsesPerWeek > 0) {
      getDualModeUsageThisWeek(user.uid).then(setDualUsedThisWeek).catch(() => {});
    }
    // Recovery toast — the user explicitly asked for visuals but the
    // classifier landed on post/conversation (e.g. server down, ambiguous
    // wording the LLM mis-routed). Offer one-click recovery instead of
    // making them re-type or hunt for the CTA below the post.
    if (classification.userWantedVisuals) {
      toast.info("Tu as mentionné des visuels — clique sur \"Ajouter des visuels\" sous le post pour les générer.", { duration: 5000 });
    }
  };

  const handleRegenerateImage = useCallback(
    async (entryId: string) => {
      // Regenerate keeps the original prompt and reuses the same entry slot —
      // flipping it back to "generating" so the loader replaces the image
      // in place. Avoids piling up a new bubble for every retry.
      const entry = imageEntries.find((e) => e.id === entryId);
      if (!entry) return;
      upsertImageEntry(entryId, {
        status: "generating",
        image: undefined,
        errorMessage: undefined,
      });
      const result = await generateImage(entry.prompt, {
        language: (t as { meta?: { lang?: "fr" | "en" } })?.meta?.lang ?? "fr",
        silent: true,
        variantCount: VARIANT_COUNT_PER_REQUEST,
      });
      if (result.ok) {
        upsertImageEntry(entryId, {
          status: "done",
          image: result.image,
          images: result.images,
          // Regenerated → reset to first variant pre-selected; the previous
          // selection no longer maps to the new variants anyway.
          selectedVariantIndices: [0],
        });
      } else {
        upsertImageEntry(entryId, {
          status: "error",
          errorMessage: result.error.message,
        });
      }
    },
    [imageEntries, generateImage, t, upsertImageEntry]
  );

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

  /**
   * Resolve the visual URL(s) that should be pre-attached to the publish
   * modal for a given post body. We walk back through the chat messages,
   * find the assistant bubble whose content matches `content`, then look
   * up its image pair via `messageImagePairs`. Multi-select aware — returns
   * every URL the user picked (in click order). LinkedIn supports up to 9
   * images per post, so forwarding the full array is correct.
   *
   * Empty array can mean: no paired image, OR the user deselected everything
   * (publish without any visual). Both cases produce the same "no pre-attach"
   * outcome in the modal, which is the intended behaviour.
   */
  const resolvePreloadedImagesFor = useCallback(
    (content: string): string[] => {
      // Match against the latest AI message with this content. Trimmed
      // comparison is enough — the publish handler always passes the exact
      // text we rendered. We don't fuzz-match because surrogate posts
      // (history, ready-posts) shouldn't accidentally pick up an image.
      const target = content.trim();
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.type !== "ai") continue;
        if (m.content.trim() !== target) continue;
        if (!m.id) return [];
        const entryId = messageImagePairs[m.id];
        if (!entryId) return [];
        const entry = imageEntries.find((e) => e.id === entryId);
        if (!entry || entry.status !== "done") return [];
        const variants = entry.images && entry.images.length > 0
          ? entry.images
          : (entry.image ? [entry.image] : []);
        if (variants.length === 0) return [];
        // Default to first variant when no explicit selection has been made
        // (e.g. legacy entries that didn't track multi-select yet).
        const indices = entry.selectedVariantIndices ?? [0];
        return indices
          .filter((idx) => idx >= 0 && idx < variants.length)
          .map((idx) => variants[idx].url);
      }
      return [];
    },
    [messages, messageImagePairs, imageEntries]
  );

  const handlePublishToLinkedIn = (content: string) => {
    setPublishContent(content);
    setPublishPreloadedImageUrls(resolvePreloadedImagesFor(content));
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
    setPublishPreloadedImageUrls(resolvePreloadedImagesFor(content));
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

  // Determine if scroll should be disabled (no messages AND no image entries
  // means the welcome screen is showing). Image-mode submissions push to
  // `imageEntries` rather than `messages`, so we need both checks here.
  const hasChatContent = messages.length > 0 || imageEntries.length > 0;
  const shouldDisableScroll = !hasChatContent && !isLoading;

  return (
    <MainLayout posts={posts} showMobileHeader={true}>
      <div className="flex flex-col h-full app-content-wrapper">
        {/* Messages area - with padding for content to scroll behind fixed input */}
        <div
          ref={scrollContainerRef}
          className={`
            flex-1 overflow-y-auto gpu-scroll transition-all duration-300 ease-out overscroll-contain
            app-scroll-container
            ${shouldDisableScroll ? 'scroll-disabled lg:overflow-y-auto' : ''}
          `}
        >
          <div className={`max-w-3xl mx-auto px-3 sm:px-4 content-with-fixed-input ${browserMode.isMobileBrowser ? 'mobile-browser-mode' : ''} ${!hasChatContent ? 'h-full' : 'pt-6'}`}>
            {/* Welcome message — hidden as soon as ANY chat content exists,
                including image-gen entries (which don't touch `messages`). */}
            {!hasChatContent && !isLoading && (
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

            {/* Conversation messages — also opens for image-mode runs so
                imageEntries below find a visible container. */}
            {hasChatContent && (
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

                    // Group messages + standalone image entries into ordered "slots".
                    // Each slot carries the timestamp it was created at so we can
                    // sort the unified stream chronologically before rendering —
                    // the bug we're fixing is that image-mode prompts and post
                    // prompts were rendered in two separate sections (messages
                    // first, then imageEntries), so a later post answer always
                    // appeared ABOVE an earlier image generation.
                    const elements: { ts: Date; node: React.ReactNode }[] = [];
                    let i = 0;
                    let pairIndex = 0;

                    while (i < messages.length) {
                      const message = messages[i];

                      if (message.type === "user") {
                        // Render user message with ChatMessage
                        elements.push({
                          ts: message.timestamp,
                          node: (
                            <ChatMessage
                              key={message.id || `user-${i}`}
                              type={message.type}
                              content={message.content}
                              timestamp={message.timestamp}
                              showActions={false}
                              index={i}
                            />
                          ),
                        });
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
                          elements.push({
                            ts: message.timestamp,
                            node: (
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
                            ),
                          });
                          pairIndex++;
                          i += 2; // Skip both messages
                        } else {
                          // Single AI response (FREE/PRO plans) - use ModernResponseCard
                          elements.push({
                            ts: message.timestamp,
                            node: (
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

                              {/* Conversational (Support / ASSISTANCE) replies render as plain
                                  prose — no LinkedIn preview, no author block — because they
                                  aren't deliverable posts. Variant === undefined is the signal
                                  the server / useChat sets for non-post responses. */}
                              {message.variant === undefined ? (
                                <ConversationalResponse
                                  content={message.content}
                                  isStreaming={message.isStreaming}
                                />
                              ) : (
                                <ModernResponseCard
                                  content={message.content}
                                  variant={message.variant}
                                  timestamp={message.timestamp}
                                  isStreaming={message.isStreaming}
                                  userPlan={currentPlan}
                                  onPublishToLinkedIn={handlePublishToLinkedIn}
                                  onSchedule={handleSchedulePost}
                                  showVariantBadge={planFeatures.responseMode === "single-choice"}
                                  isLastMessage={i === lastAIIndex}
                                  attachedVisual={(() => {
                                    if (!message.id) return null;
                                    const entryId = messageImagePairs[message.id];
                                    if (!entryId) return null;
                                    const entry = imageEntries.find((e) => e.id === entryId);
                                    if (!entry || entry.status !== "done" || !entry.image) return null;
                                    // Build the unified variant payload so the
                                    // embed surfaces the same 3-thumbnail picker
                                    // and regenerate action as the standalone
                                    // <GeneratedImageVariants> card. Falls back
                                    // to a single-variant payload for legacy
                                    // entries that pre-date multi-variant.
                                    const variants =
                                      entry.images && entry.images.length > 0
                                        ? entry.images
                                        : [entry.image];
                                    return {
                                      variants: variants.map((v) => ({
                                        url: v.url,
                                        imageId: v.imageId,
                                        alt: entry.prompt,
                                      })),
                                      // Hydrate from the new multi-select
                                      // field, falling back to the legacy
                                      // single-index for entries written
                                      // before multi-select existed.
                                      selectedIndices:
                                        entry.selectedVariantIndices ?? [0],
                                      onToggle: (idx: number) => {
                                        toggleVariantSelection(entry.id, idx);
                                        // Persist silently — user's selection
                                        // must survive a reload so the
                                        // publish flow ships the right set.
                                        // We snapshot the post-toggle state
                                        // from the current entry to avoid a
                                        // race with the setState above.
                                        if (postId) {
                                          const cur =
                                            entry.selectedVariantIndices ?? [0];
                                          const nextSel = cur.includes(idx)
                                            ? cur.filter((i) => i !== idx)
                                            : [...cur, idx];
                                          setGeneratedImageVariantSelections(
                                            postId,
                                            entry.id,
                                            nextSel
                                          ).catch(() => {});
                                        }
                                      },
                                      onRegenerate: () => handleRegenerateImage(entry.id),
                                      isRegenerating: false,
                                      // Hide the regenerate icon once the
                                      // daily image quota is exhausted —
                                      // clicking would just fire a toast.
                                      // `remaining` is null until the first
                                      // call returns, so we default to true.
                                      canRegenerate:
                                        imageQuota?.remaining === undefined || imageQuota.remaining > 0,
                                    };
                                  })()}
                                  attachedImageLoading={(() => {
                                    // Show the "visuel en cours…" slot on the
                                    // last AI bubble while an embed entry is
                                    // either still rendering OR finished but
                                    // not yet paired. The pair gets set one
                                    // render after the entry flips to "done";
                                    // without the "done && unpaired" branch
                                    // the loader disappears one frame before
                                    // the image attaches, producing a visible
                                    // blink and tricking the user into thinking
                                    // generation silently failed (the exact
                                    // intent=both regression the user reported).
                                    if (i !== lastAIIndex) return false;
                                    if (!message.id) return false;
                                    if (messageImagePairs[message.id]) return false;
                                    const pairedEntryIds = new Set(Object.values(messageImagePairs));
                                    return imageEntries.some(
                                      (e) =>
                                        e.embed &&
                                        !pairedEntryIds.has(e.id) &&
                                        (e.status === "generating" || e.status === "done")
                                    );
                                  })()}
                                  // One-click shortcut: feeds the post's text
                                  // straight into the image pipeline. Only on
                                  // the last AI bubble — older posts in the
                                  // scrollback shouldn't sprout an Add Visual
                                  // chip every time you scroll past them.
                                  onAddVisual={
                                    i === lastAIIndex
                                      ? (_postContent, variantCount) =>
                                          runImageGeneration(
                                            "Visuel pour ce post",
                                            // Referential brief — resolveImageBrief
                                            // (inside runImageGeneration) detects
                                            // this is short/referential and
                                            // substitutes a post-derived brief
                                            // from the last assistant POST. No need
                                            // to duplicate the derivation here.
                                            "Visuels",
                                            { embed: true, variantCount }
                                          ).then(async (imageResult) => {
                                            if (
                                              !imageResult.ok ||
                                              !imageResult.record ||
                                              !message.id
                                            )
                                              return;
                                            setMessageImagePairs((prev) => ({
                                              ...prev,
                                              [message.id!]: imageResult.entryId,
                                            }));
                                            if (postId && user?.uid) {
                                              try {
                                                await appendGeneratedImage(
                                                  postId,
                                                  imageResult.record
                                                );
                                              } catch {
                                                /* image still rendered locally */
                                              }
                                            }
                                          })
                                      : undefined
                                  }
                                />
                              )}
                            </motion.div>
                            ),
                          });
                          i++;
                        }
                      } else if (message.type === "action" && message.action) {
                        // Action confirmation card
                        const action = message.action;
                        elements.push({
                          ts: message.timestamp,
                          node: (
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
                          ),
                        });
                        i++;
                      } else {
                        i++;
                      }
                    }

                    // Merge standalone image-mode entries into the same ordered
                    // stream, keyed by their `createdAt` so they appear at the
                    // exact point in time the user submitted the image prompt
                    // (not lumped at the bottom under every text answer).
                    const pairedEntryIds = new Set(Object.values(messageImagePairs));
                    const standaloneImageEntries = imageEntries.filter(
                      // Embed entries that errored still surface so the user
                      // sees an explicit failure card with retry — same rule
                      // as the previous standalone-only block.
                      (e) => !pairedEntryIds.has(e.id) && (!e.embed || e.status === "error")
                    );
                    for (const entry of standaloneImageEntries) {
                      elements.push({
                        ts: new Date(entry.createdAt),
                        node: (
                          <div key={`image-${entry.id}`} className="flex flex-col gap-3">
                            {/* User prompt bubble */}
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, ease: smoothEase }}
                              className="flex justify-end"
                            >
                              <div className="
                                max-w-[85%] lg:max-w-[70%] w-fit
                                px-4 py-3 rounded-2xl rounded-br-sm
                                bg-gray-50 dark:bg-dark-elevated/80
                                border border-gray-200/80 dark:border-dark-border/70
                                text-gray-900 dark:text-white
                                text-[14px] leading-snug whitespace-pre-wrap break-words
                                shadow-[0_1px_2px_-1px_rgba(15,23,42,0.06)]
                              ">
                                {entry.prompt}
                              </div>
                            </motion.div>

                            {/* Assistant body — switches by entry status. */}
                            <AnimatePresence mode="wait" initial={false}>
                              {entry.status === "generating" && (
                                <motion.div
                                  key="loader"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ImageGenLoader prompt={entry.prompt} />
                                </motion.div>
                              )}

                              {entry.status === "done" && entry.image && (
                                <motion.div
                                  key="image"
                                  initial={{ opacity: 0, scale: 0.98 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.3, ease: smoothEase }}
                                >
                                  <GeneratedImageVariants
                                    prompt={entry.prompt}
                                    variants={entry.images && entry.images.length > 0 ? entry.images : [entry.image]}
                                    selectedIndices={entry.selectedVariantIndices ?? [0]}
                                    onToggle={(idx) => {
                                      toggleVariantSelection(entry.id, idx);
                                      const pid = imagePostIdRef.current ?? postId;
                                      if (pid) {
                                        const cur = entry.selectedVariantIndices ?? [0];
                                        const nextSel = cur.includes(idx)
                                          ? cur.filter((i) => i !== idx)
                                          : [...cur, idx];
                                        setGeneratedImageVariantSelections(pid, entry.id, nextSel)
                                          .catch(() => {});
                                      }
                                    }}
                                    onRegenerate={() => handleRegenerateImage(entry.id)}
                                    isRegenerating={false}
                                  />
                                </motion.div>
                              )}

                              {entry.status === "error" && (
                                <motion.div
                                  key="error"
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="
                                    w-full max-w-2xl
                                    rounded-2xl rounded-bl-md
                                    border border-error/30 bg-error/5
                                    px-4 py-3
                                    flex items-start gap-3
                                  "
                                >
                                  <div className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-error/15 text-error flex items-center justify-center text-[13px]">
                                    !
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-text-primary font-medium">
                                      Le visuel n&apos;a pas pu être généré.
                                    </p>
                                    <p className="text-[12px] text-text-secondary mt-0.5">
                                      {entry.errorMessage || "Réessaye dans un instant."}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => handleRegenerateImage(entry.id)}
                                      className="
                                        mt-2 inline-flex items-center gap-1.5
                                        px-2.5 py-1 rounded-lg
                                        bg-error/10 hover:bg-error/15
                                        text-error text-[12px] font-medium
                                        transition-colors
                                      "
                                    >
                                      Réessayer
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ),
                      });
                    }

                    // Stable chronological sort. Equal timestamps keep their
                    // insertion order (user-before-AI within a same-second
                    // exchange) — Array.prototype.sort is stable since ES2019,
                    // but we use index tiebreakers anyway for clarity.
                    const indexed = elements.map((el, idx) => ({ el, idx }));
                    indexed.sort((a, b) => {
                      const diff = a.el.ts.getTime() - b.el.ts.getTime();
                      return diff !== 0 ? diff : a.idx - b.idx;
                    });
                    return indexed.map((x) => x.el.node);
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
          isVisible={!isNearBottom && hasChatContent}
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
            {/* Single toolbar row — AI persona chip + post-style selector.
                Wraps on narrow viewports so it stays one block visually.
                LayoutGroup + `layout` props animate the chip's position when
                the neighbour selector mounts/unmounts: the chip slides into
                its new centred position rather than snapping, and on mobile
                the row's height collapse (2 lines → 1) is animated instead
                of jumping the whole fixed input area down. */}
            <LayoutGroup id="ai-mode-toolbar">
              <motion.div
                layout
                transition={{ layout: { type: "spring", stiffness: 380, damping: 32, mass: 0.7 } }}
                className="mb-3 flex flex-wrap items-center justify-center gap-2"
              >
                <motion.div layout="position">
                  <AIModeSwitch mode={aiMode} onModeChange={setAiMode} />
                </motion.div>

                <AnimatePresence mode="popLayout" initial={false}>
                  {aiMode === "posts" && isMaxPlan && (
                    <motion.div
                      key="max-selector"
                      layout
                      initial={{ opacity: 0, scale: 0.92, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: 4 }}
                      transition={{
                        opacity: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
                        scale: { type: "spring", stiffness: 380, damping: 30, mass: 0.6 },
                        y: { type: "spring", stiffness: 380, damping: 30, mass: 0.6 },
                        layout: { type: "spring", stiffness: 380, damping: 32, mass: 0.7 },
                      }}
                      style={{ willChange: "transform, opacity" }}
                    >
                      <MaxModeSelector
                        selectedMode={maxMode}
                        onModeChange={setMaxMode}
                      />
                    </motion.div>
                  )}
                  {aiMode === "posts" && isProPlan && !isMaxPlan && (
                    <motion.div
                      key="pro-selector"
                      layout
                      initial={{ opacity: 0, scale: 0.92, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: 4 }}
                      transition={{
                        opacity: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
                        scale: { type: "spring", stiffness: 380, damping: 30, mass: 0.6 },
                        y: { type: "spring", stiffness: 380, damping: 30, mass: 0.6 },
                        layout: { type: "spring", stiffness: 380, damping: 32, mass: 0.7 },
                      }}
                      style={{ willChange: "transform, opacity" }}
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
              </motion.div>
            </LayoutGroup>

            <div className="relative">
              {/* Voice feedback is handled by UniversalChatInput's built-in status bar */}

              {/* UniversalChatInput - Unified premium input component */}
              <UniversalChatInput
                ref={chatInputRef}
                onSubmit={async (message, file) => {
                  // Guard against a second submit landing while the current
                  // turn is still streaming / generating. Without this, the new
                  // generate() aborts the in-flight one via abortControllerRef
                  // and the chat surface shows a half-finished bubble followed
                  // by the new turn — the visible symptom of "messages
                  // duplicated / out of order".
                  if (isLoading || isStreaming || isGeneratingImage) return;
                  if (isRecordingRef.current) forceStopRecording();
                  await handleGenerate(message, file);
                }}
                onStop={stopGeneration}
                placeholder={t.appPage.placeholderFixed}
                disabled={!canSendMessage}
                isLoading={isLoading || isStreaming || isGeneratingImage}
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

      {/* Premium first-time feature tour */}
      <AppTourModal isOpen={appTour.isOpen} onClose={appTour.markAsSeen} />

      {/* Unified publish / schedule modal */}
      <PublishToLinkedInModal
        isOpen={showPublishModal}
        onClose={() => {
          setShowPublishModal(false);
          // Reset the pre-attach on close so re-opening from elsewhere
          // (history, ready-posts) starts clean.
          setPublishPreloadedImageUrls([]);
        }}
        content={publishContent}
        linkedInConnection={linkedInConnection}
        onPublish={handleConfirmPublish}
        initialMode={publishModalMode}
        preloadedImageUrls={publishPreloadedImageUrls}
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
