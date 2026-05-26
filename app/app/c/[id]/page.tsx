"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useQuota } from "@/contexts/QuotaContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useChat } from "@/hooks/chat/useChat";
import { useSmartScroll } from "@/hooks/scroll/useSmartScroll";
import { useBrowserMode } from "@/hooks/ui/useBrowserMode";
import { useKeyboardHeight } from "@/hooks/input/useKeyboardHeight";
import { getPost, getUserPostsWithPinned, getDualModeUsageThisWeek, appendGeneratedImage, setGeneratedImageMessageId, setGeneratedImageVariantSelections } from "@/lib/db/firestore";
import { getCachedConversation, setCachedConversation } from "@/lib/storage/conversation-cache";
import { getPlanFeatures } from "@/lib/config/plan-features";
import { Post } from "@/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import ChatMessage, { TypingIndicator, GenerationLoader } from "@/components/chat/ChatMessage";
import ModernAIResponsePair from "@/components/chat/ModernAIResponsePair";
import ModernResponseCard from "@/components/chat/ModernResponseCard";
import ConversationalResponse from "@/components/chat/ConversationalResponse";
import MaxModeSelector from "@/components/chat/MaxModeSelector";
import DualModeToggle from "@/components/chat/DualModeToggle";
import AIModeSwitch, { AIMode } from "@/components/chat/AIModeSwitch";
import InlineUpgradeBanner from "@/components/chat/InlineUpgradeBanner";
import GeneratedImageVariants from "@/components/chat/GeneratedImageVariants";
import ImageGenLoader from "@/components/chat/ImageGenLoader";
import { useImageGeneration, type GeneratedImage } from "@/hooks/image/useImageGeneration";
import { resolveImageBrief } from "@/lib/ai/brief-resolver";
import { clientFastIntent } from "@/lib/ai/client-intent";
import { getAuthHeaders } from "@/lib/api/client";
import Image from "next/image";
import NewResponseIndicator from "@/components/chat/NewResponseIndicator";
import PublishToLinkedInModal from "@/components/linkedin/PublishToLinkedInModal";
import ScheduleModal from "@/components/schedule/ScheduleModal";
import { AnimatedScaleFade } from "@/components/animations/AnimatedPageWrapper";
import toast from "@/components/ui/Toast";
import UniversalChatInput, { UniversalChatInputRef } from "@/components/chat/UniversalChatInput";
import { useLanguage } from "@/contexts/LanguageContext";
import ActionConfirmCard from "@/components/ai-actions/ActionConfirmCard";

// Dynamic placeholder examples that rotate
const PLACEHOLDER_EXAMPLES = [
  "Continuez la conversation...",
  "Affinez le message...",
];

// Animation easing
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

function ConversationContent() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const { t } = useLanguage();

  const { user, userProfile } = useAuth();
  const { connection: linkedInConnection, publishToLinkedIn } = useLinkedIn();
  const { canSendMessage } = useQuota();
  const { currentPlan, planLimits, isMaxPlan, isProPlan } = useSubscription();
  const browserMode = useBrowserMode();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();

  // Conversation state — try cache first for instant display
  const cachedPost = getCachedConversation(conversationId);
  const [originalPost, setOriginalPost] = useState<Post | null>(cachedPost);
  const [isLoadingPost, setIsLoadingPost] = useState(!cachedPost);
  const [posts, setPosts] = useState<Post[]>([]);

  // UI State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishContent, setPublishContent] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleContent, setScheduleContent] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Style selection state (restored from loaded post)
  const [selectedStyle, setSelectedStyle] = useState<"storytelling" | "business">("business");
  const [dualMode, setDualMode] = useState(false);
  const [dualUsedThisWeek, setDualUsedThisWeek] = useState(0);
  const [maxMode, setMaxMode] = useState<"dual" | "storytelling" | "business">("dual");
  // Top-level chat persona for follow-up messages in this conversation.
  const [aiMode, setAiMode] = useState<AIMode>("posts");
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [upgradeBannerReason, setUpgradeBannerReason] = useState<"dual-limit" | "max-feature">("max-feature");

  // Image-gen entries — same shape as /app. Each entry tracks one generation
  // attempt (prompt + status + image/error) so the conversation shows the
  // user's brief, the loader, and the resolved card in chronological order.
  type ImageEntryStatus = "generating" | "done" | "error";
  interface ImageEntry {
    id: string;
    prompt: string;
    createdAt: number;
    status: ImageEntryStatus;
    /** First / fallback variant — also doubles as the back-compat alias for
     *  callers that ignore the variants array. */
    image?: GeneratedImage;
    /** All rendered variants (length ≥ 1 when status === "done"). */
    images?: GeneratedImage[];
    /** Indices in `images` the user picked for publishing, in click order.
     *  Defaults to `[0]` on first render and `[]` when the user deselects all
     *  variants (publish without visual). */
    selectedVariantIndices?: number[];
    /** True for entries paired with a post bubble (intent=both flow or
     *  Add-Visual shortcut). Hides the duplicate user-prompt header and
     *  keeps the entry out of the standalone-image list. */
    embed?: boolean;
    errorMessage?: string;
  }
  const [imageEntries, setImageEntries] = useState<ImageEntry[]>([]);
  const VARIANT_COUNT_PER_REQUEST = 3;
  // Links a chat message id → the image entry id generated in the SAME
  // "both" intent run. Same role as on /app — the renderer uses this to
  // embed the image inside the LinkedIn preview instead of standalone.
  const [messageImagePairs, setMessageImagePairs] = useState<Record<string, string>>({});
  const {
    generate: generateImage,
    isLoading: isGeneratingImage,
    quota: imageQuota,
  } = useImageGeneration();

  const upsertImageEntry = useCallback(
    (id: string, patch: Partial<ImageEntry>) => {
      setImageEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
    },
    []
  );

  /** Toggle a variant index in/out of an entry's multi-select, preserving
   *  click order. Same semantics as on /app/page.tsx. */
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

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [autoSendCountdown, setAutoSendCountdown] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chatInputRef = useRef<UniversalChatInputRef>(null);
  const preRecordingTextRef = useRef("");
  const accumulatedTranscriptRef = useRef("");
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Derive effective dual mode and style from Max selector or Pro toggle
  const effectiveDualMode = isMaxPlan ? maxMode === "dual" : dualMode;
  const effectiveStyle = isMaxPlan
    ? (maxMode === "dual" ? "business" : maxMode)
    : selectedStyle;

  // Load dual mode usage for Pro users
  useEffect(() => {
    if (user?.uid && isProPlan && planLimits.dualResponsesPerWeek > 0) {
      getDualModeUsageThisWeek(user.uid).then(setDualUsedThisWeek).catch(() => {});
    }
  }, [user?.uid, isProPlan, planLimits.dualResponsesPerWeek]);

  const {
    messages,
    isLoading,
    isStreaming,
    generationPhase,
    generationPhaseMessage,
    error,
    generate,
    stopGeneration,
    reset,
    loadConversation,
    responses,
    regenerateSeedComment,
  } = useChat({
    userId: user?.uid,
    isGuest: false,
    conversationId,
    dualMode: effectiveDualMode,
    selectedStyle: effectiveStyle,
    aiMode,
  });

  // Keep generate ref in sync for use in voice auto-send callbacks
  const generateRef = useRef(generate);
  useEffect(() => { generateRef.current = generate; }, [generate]);
  // Mirror the latest messages in a ref so async handlers can read fresh
  // state after an await without being trapped in the submit-time closure
  // (which is what made the inline intent=both flow pair the new image with
  // the WRONG AI message — the closure's `messages` didn't include the just-
  // streamed assistant turn).
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  /** Image-mode entry point. `displayPrompt` is what the user actually typed
   *  (rendered in the chat bubble), `brief` is the cleaned-by-classifier
   *  version we pass to the image pipeline. When omitted, both are the same.
   *  Persists to the current `posts/{id}` doc on success so the visual
   *  survives a reload. */
  const handleImageGenerate = useCallback(
    async (
      displayPrompt: string,
      brief: string = displayPrompt,
      opts?: { embed?: boolean; messageId?: string; variantCount?: 1 | 2 | 3 }
    ): Promise<{ entryId: string; ok: boolean }> => {
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
          // `embed` keeps the entry out of the standalone-image list so the
          // user-prompt header isn't duplicated when this image is paired
          // with an existing post bubble (Add-Visual shortcut path).
          embed: opts?.embed === true,
        } as ImageEntry,
      ]);
      // Same context-resolution as /app: prefer the last AI POST (variant
      // !== undefined) as the source for both postContext and the brief
      // derivation. Referential prompts ("ajoute des images", "regenere")
      // get rewritten so the visual targets the actual post topic instead
      // of the literal user phrasing.
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
        postContext: lastAssistantPost?.content ?? lastAssistantAnything?.content,
        language: (t as { meta?: { lang?: "fr" | "en" } })?.meta?.lang ?? "fr",
        silent: true,
        variantCount: opts?.variantCount ?? VARIANT_COUNT_PER_REQUEST,
      });
      if (result.ok) {
        upsertImageEntry(entryId, {
          status: "done",
          image: result.image,
          images: result.images,
          // Default = first variant pre-selected. User can toggle others
          // or deselect everything before publishing.
          selectedVariantIndices: [0],
        });
        try {
          await appendGeneratedImage(conversationId, {
            id: entryId,
            prompt: displayPrompt,
            url: result.image.url,
            imageId: result.image.imageId,
            generatedAt: result.image.generatedAt,
            variants: result.images.map((img) => ({ url: img.url, imageId: img.imageId })),
            selectedVariantIndices: [0],
            selectedVariantIndex: 0,
            // Persist the message↔image link when the caller knows it
            // (Add-Visual shortcut). Reload reads this back into
            // messageImagePairs so the visual stays embedded in the bubble
            // and the publish flow keeps the attachment.
            ...(opts?.messageId ? { messageId: opts.messageId } : {}),
          });
        } catch (err) {
          console.warn("[image-gen] persist failed (image still shown):", err);
        }
        return { entryId, ok: true };
      }
      upsertImageEntry(entryId, {
        status: "error",
        errorMessage: result.error.message,
      });
      return { entryId, ok: false };
    },
    [messages, generateImage, t, upsertImageEntry, conversationId]
  );

  const handleRegenerateImage = useCallback(
    async (entryId: string) => {
      const entry = imageEntries.find((e) => e.id === entryId);
      if (!entry) return;
      upsertImageEntry(entryId, {
        status: "generating",
        image: undefined,
        images: undefined,
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
          // Regen replaces variants → previous selection no longer maps;
          // reset to the first variant pre-picked.
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

  // Smart scroll
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

  // Restore toggle state from a post's metadata
  const restorePostState = useCallback((post: Post) => {
    if (post.responseMode === "dual") {
      if (isMaxPlan) {
        setMaxMode("dual");
      } else {
        setDualMode(true);
      }
    } else if (post.responseMode === "single-choice" && post.selectedStyle) {
      if (isMaxPlan) {
        setMaxMode(post.selectedStyle);
      } else {
        setDualMode(false);
        setSelectedStyle(post.selectedStyle);
      }
    } else if (post.selectedStyle) {
      setSelectedStyle(post.selectedStyle);
    }
  }, [isMaxPlan]);

  /**
   * Mirror what useChat.loadConversation generates as AI message ids so we
   * can reconcile image↔message pairings that were saved with a transient
   * id from the original streaming session.
   *
   * The mismatch happens because:
   *   - During streaming, useChat assigns `ai-${Date.now()}-${variant}` to
   *     each AI message and persists that id when an image is paired with it.
   *   - On reload, loadConversation rebuilds the same message with
   *     `ai-${post.id}-${variant}`. The two ids don't match → the pair
   *     dangles → the image is filtered out of both the standalone list
   *     (embed: true) and the embedded preview (no current message id matches).
   */
  const computeRebuiltAiIds = useCallback((post: Post): string[] => {
    const isConv = post.responseMode === "conversational";
    const variantA: "storytelling" | "business" | undefined = isConv
      ? undefined
      : post.responseMode === "dual"
        ? "storytelling"
        : (post.selectedStyle as "storytelling" | "business") || "storytelling";
    const ids: string[] = [];
    if (post.responseA) {
      ids.push(isConv ? `ai-${post.id}-conversational` : `ai-${post.id}-${variantA}`);
    }
    if (post.responseB) ids.push(`ai-${post.id}-business`);
    if (post.messages) {
      for (const msg of post.messages) {
        if (msg.role === "assistant" && msg.id) ids.push(msg.id);
      }
    }
    return ids;
  }, []);

  /**
   * Build the in-memory image-mode state (`imageEntries` + `messageImagePairs`)
   * from a Post. Used by both the initial cache load AND the background
   * Firestore refresh — the latter is critical because the pre-redirect
   * cache built on /app may have been written before the image landed in
   * Firestore, leaving the visual invisible until reload without this rebuild.
   */
  const hydrateImageStateFromPost = useCallback((post: Post): {
    entries: ImageEntry[];
    pairs: Record<string, string>;
  } => {
    if (!post.generatedImages || post.generatedImages.length === 0) {
      return { entries: [], pairs: {} };
    }
    const rebuiltAiIds = computeRebuiltAiIds(post);
    const validIdSet = new Set(rebuiltAiIds);
    const usedAiIds = new Set<string>();
    // First pass: claim messageIds that still resolve to a rebuilt message
    // before we hand out fallbacks. Otherwise a stale id could grab an AI id
    // that a later (still-valid) image legitimately owns.
    for (const img of post.generatedImages) {
      if (img.messageId && validIdSet.has(img.messageId)) usedAiIds.add(img.messageId);
    }

    const pairs: Record<string, string> = {};
    const entries: ImageEntry[] = post.generatedImages.map((img) => {
      const variants =
        img.variants && img.variants.length > 0
          ? img.variants
          : [{ url: img.url, imageId: img.imageId }];
      const images = variants.map((v) => ({
        url: v.url,
        imageId: v.imageId,
        prompt: img.prompt,
        generatedAt: img.generatedAt,
      }));
      // Resolve the messageId: keep if it still matches, else fall back to
      // the next unused rebuilt AI id (chronological). Handles intent=both
      // perfectly: stored "ai-<timestamp>-storytelling" → fallback to
      // "ai-<post.id>-storytelling".
      let resolvedMessageId: string | undefined;
      if (img.messageId && validIdSet.has(img.messageId)) {
        resolvedMessageId = img.messageId;
      } else if (img.messageId) {
        for (const id of rebuiltAiIds) {
          if (!usedAiIds.has(id)) {
            resolvedMessageId = id;
            usedAiIds.add(id);
            break;
          }
        }
      }
      if (resolvedMessageId) pairs[resolvedMessageId] = img.id;

      return {
        id: img.id,
        prompt: img.prompt,
        createdAt: img.generatedAt,
        status: "done" as const,
        image: images[0],
        images,
        // Hydrate the new multi-select field from Firestore; if it's absent
        // (legacy record), fall back to `[selectedVariantIndex]` so the
        // user's previous single-pick is preserved as a 1-item multi-pick.
        selectedVariantIndices:
          img.selectedVariantIndices ?? [img.selectedVariantIndex ?? 0],
        embed: Boolean(resolvedMessageId),
      };
    });
    return { entries, pairs };
  }, [computeRebuiltAiIds]);

  // Load conversation into chat hook
  const loadPostIntoChat = useCallback((post: Post) => {
    loadConversation?.({
      id: post.id,
      prompt: post.prompt,
      responseA: post.responseA,
      responseB: post.responseB,
      messages: post.messages || [],
      responseMode: post.responseMode,
      selectedStyle: post.selectedStyle,
    });
    // Hydrate the visual-mode timeline so reloading a conversation that
    // contains generated images shows them in the chat, not a blank surface.
    const { entries, pairs } = hydrateImageStateFromPost(post);
    if (entries.length > 0) setImageEntries(entries);
    if (Object.keys(pairs).length > 0) setMessageImagePairs(pairs);
  }, [loadConversation, hydrateImageStateFromPost]);

  /**
   * Sync image state with Firestore when the background refresh brings in
   * `generatedImages` the pre-redirect cache didn't have. This is the fix
   * for the intent=both regression: the cache written on /app right before
   * `router.replace("/app/c/[id]")` could lag the appendGeneratedImage write,
   * so the new page hydrated from a visual-less cache and the user saw
   * "post + Add Visuals button" instead of "post + visual".
   *
   * Gate on quiet state (no streaming, no in-flight image gen) so we never
   * stomp on a generation the user just kicked off. Merge — never replace —
   * so locally-generated entries keep their interactive state (e.g. the
   * variant the user selected before the refresh landed).
   */
  useEffect(() => {
    if (!originalPost?.generatedImages || originalPost.generatedImages.length === 0) return;
    if (isStreaming || isLoading || isGeneratingImage) return;

    const { entries, pairs } = hydrateImageStateFromPost(originalPost);

    setImageEntries((current) => {
      const knownIds = new Set(current.map((e) => e.id));
      const newEntries = entries.filter((e) => !knownIds.has(e.id));
      if (newEntries.length === 0) return current;
      return [...current, ...newEntries];
    });

    setMessageImagePairs((current) => {
      let added = false;
      const merged = { ...current };
      for (const [k, v] of Object.entries(pairs)) {
        if (!(k in merged)) {
          merged[k] = v;
          added = true;
        }
      }
      return added ? merged : current;
    });
  }, [originalPost, isStreaming, isLoading, isGeneratingImage, hydrateImageStateFromPost]);

  // Track whether we've already loaded this conversation into the chat
  const loadedConversationRef = useRef<string | null>(null);

  // Load the original conversation/post (including follow-up messages for multi-turn)
  useEffect(() => {
    if (!conversationId || !user) return;
    // Prevent re-loading if we already loaded this conversation
    if (loadedConversationRef.current === conversationId) return;

    const loadOriginalPost = async () => {
      // Check cache first — instant display, no spinner
      const cached = getCachedConversation(conversationId);
      if (cached && cached.userId === user.uid) {
        loadedConversationRef.current = conversationId;
        setOriginalPost(cached);
        setIsLoadingPost(false);
        restorePostState(cached);
        loadPostIntoChat(cached);

        // Background refresh — silently update the cache + sidebar for the next
        // page visit. We deliberately do NOT call loadPostIntoChat() with the
        // fresh Firestore result here: useChat owns the message timeline now,
        // including any follow-ups streamed locally. Overwriting that state
        // with a Firestore snapshot raced against an active stream is the
        // exact bug that caused mid-typing/mid-streaming resets.
        getPost(conversationId).then((freshPost) => {
          if (freshPost && freshPost.userId === user.uid) {
            setCachedConversation(freshPost);
            setOriginalPost(freshPost);
          }
        }).catch(() => { /* silent background refresh */ });
        return;
      }

      // No cache — fetch from Firestore (show spinner only on first load)
      setIsLoadingPost(true);
      try {
        const post = await getPost(conversationId);
        if (post && post.userId === user.uid) {
          loadedConversationRef.current = conversationId;
          setCachedConversation(post);
          setOriginalPost(post);
          restorePostState(post);
          loadPostIntoChat(post);
        } else {
          toast.error(t.toasts.conversationUnavailable);
          router.push("/app");
        }
      } catch (error) {
        console.error("Error loading conversation:", error);
        toast.error(t.toasts.conversationLoadError);
        router.push("/app");
      } finally {
        setIsLoadingPost(false);
      }
    };

    loadOriginalPost();
  }, [conversationId, user, router, restorePostState, loadPostIntoChat]);

  // Fetch user posts for sidebar — on mount and after each generation completes
  const sidebarLoadedRef = useRef(false);
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (!user) return;

    // Refresh sidebar when streaming just finished (new message saved)
    const streamingJustEnded = prevStreamingRef.current && !isStreaming;
    prevStreamingRef.current = isStreaming;

    if (!sidebarLoadedRef.current || streamingJustEnded) {
      sidebarLoadedRef.current = true;
      getUserPostsWithPinned(user.uid, 20).then((userPosts) => {
        setPosts(userPosts);
        userPosts.forEach((p) => setCachedConversation(p));
      }).catch(() => {});
    }
  }, [user, isStreaming]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
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

  // Rotating placeholder
  useEffect(() => {
    if (isFocused || inputValue) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isFocused, inputValue]);

  // Mirror ref for reliable state in callbacks
  const isRecordingRef = useRef(false);

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
        let newFinals = "";
        let currentInterim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            newFinals += transcript;
          } else {
            currentInterim += transcript;
          }
        }
        // Accumulate finalized transcripts
        if (newFinals) {
          accumulatedTranscriptRef.current += newFinals;
        }
        // Build full display: pre-recording text + voice text
        const prefix = preRecordingTextRef.current;
        const voiceText = accumulatedTranscriptRef.current + currentInterim;
        const separator = prefix && voiceText ? " " : "";
        const fullText = voiceText ? prefix + separator + voiceText : prefix;
        chatInputRef.current?.setValue(fullText);
        setInterimText(currentInterim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed") {
          isRecordingRef.current = false;
          setIsRecording(false);
          toast.error(t.appPage.micNotAllowed);
        } else if (event.error === "no-speech") {
          // Silently handle — expected during pauses
        } else if (event.error !== "aborted") {
          console.warn("Speech recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        // Auto-restart if user hasn't stopped manually (browser may cut unexpectedly)
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
      // Clean up voice auto-send timers
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Cancel any pending auto-send countdown
  const cancelAutoSend = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }
    setAutoSendCountdown(0);
  }, []);

  // Start 3-second auto-send countdown after voice processing
  const startAutoSendCountdown = useCallback(() => {
    cancelAutoSend();
    setAutoSendCountdown(3);
    countdownIntervalRef.current = setInterval(() => {
      setAutoSendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          // Auto-send the message
          const currentText = chatInputRef.current?.getValue() || "";
          if (currentText.trim()) {
            generateRef.current(currentText.trim());
            chatInputRef.current?.setValue("");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cancelAutoSend]);

  // Toggle voice recording — user controls start/stop manually
  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isRecordingRef.current) {
      // Graceful stop — keeps last words (unlike abort())
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsVoiceProcessing(true);
      setInterimText("");
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors
      }
      // 800ms processing animation, then auto-send countdown
      autoSendTimerRef.current = setTimeout(() => {
        setIsVoiceProcessing(false);
        const currentText = chatInputRef.current?.getValue() || "";
        if (currentText.trim()) {
          startAutoSendCountdown();
        }
      }, 800);
    } else {
      // Save pre-existing text and reset accumulated transcript
      cancelAutoSend();
      preRecordingTextRef.current = chatInputRef.current?.getValue() || "";
      accumulatedTranscriptRef.current = "";
      try {
        recognitionRef.current.start();
        isRecordingRef.current = true;
        setIsRecording(true);
        setInterimText("");
        // Haptic feedback on mobile
        if (navigator.vibrate) navigator.vibrate(50);
      } catch (error) {
        console.error("Failed to start recording:", error);
        isRecordingRef.current = false;
        setIsRecording(false);
        toast.error(t.appPage.recordingError);
      }
    }
  }, [cancelAutoSend, startAutoSendCountdown]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    // Block submit during streaming too — otherwise a second generate() aborts
    // the first via abortControllerRef and the UI sees a half-finished reply
    // followed by the new turn, which reads as "duplication / reordering".
    if (!inputValue.trim() || isLoading || isStreaming) return;
    // Block submit until the conversation has been hydrated. Without this guard,
    // useChat sees messages.length === 0 and treats the turn as a NEW post —
    // forking the conversation under a fresh postId instead of appending here.
    if (loadedConversationRef.current !== conversationId) return;
    // Stop recording if active — set ref BEFORE abort() to prevent onend auto-restart
    if (isRecordingRef.current && recognitionRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }

    const prompt = inputValue.trim();
    setInputValue("");

    try {
      await generate(prompt);
    } catch (error) {
      console.error("Generation error:", error);
    }
  }, [inputValue, isLoading, isStreaming, generate, conversationId]);

  // Handle keyboard submit
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Copy handler
  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(t.toasts.copied);
    } catch {
      toast.error(t.toasts.copyError);
    }
  }, []);

  // Pre-generated visual(s) to attach when the user opens the publish modal
  // from a post that carries a paired image. See the equivalent comment in
  // /app/app/page.tsx for the rationale.
  const [publishPreloadedImageUrls, setPublishPreloadedImageUrls] = useState<string[]>([]);

  /** Walks the chat messages to find the assistant bubble that produced
   *  `content`, then resolves ALL selected variant URLs for its paired
   *  image entry (multi-select aware — LinkedIn supports up to 9 images
   *  per post). Empty array = no pre-attach in the publish modal. */
  const resolvePreloadedImagesFor = useCallback(
    (content: string): string[] => {
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
        const indices = entry.selectedVariantIndices ?? [0];
        return indices
          .filter((idx) => idx >= 0 && idx < variants.length)
          .map((idx) => variants[idx].url);
      }
      return [];
    },
    [messages, messageImagePairs, imageEntries]
  );

  // LinkedIn publish handlers
  const handlePublishToLinkedIn = useCallback(
    (content: string) => {
      setPublishContent(content);
      setPublishPreloadedImageUrls(resolvePreloadedImagesFor(content));
      setShowPublishModal(true);
    },
    [resolvePreloadedImagesFor]
  );

  const handleConfirmPublish = async (
    editedContent: string,
    visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC",
    organizationUrn?: string
  ) => {
    return await publishToLinkedIn(editedContent, visibility, undefined, organizationUrn);
  };

  // Schedule handlers — seedCommentText (optional) pre-fills the modal's
  // boost-comment block when the user came from a freshly-generated post.
  const [scheduleSeedText, setScheduleSeedText] = useState<string | undefined>(undefined);
  const handleSchedulePost = useCallback((content: string, seedCommentText?: string) => {
    setScheduleContent(content);
    setScheduleSeedText(seedCommentText);
    setShowScheduleModal(true);
  }, []);

  const userInitial =
    userProfile?.displayName?.charAt(0) || user?.email?.charAt(0) || "U";
  const userName = userProfile?.displayName || "Vous";
  const userPhotoURL = user?.photoURL || userProfile?.photoURL || null;

  // Loading state
  if (isLoadingPost) {
    return (
      <MainLayout posts={posts} showMobileHeader={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted">Chargement de la conversation...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout posts={posts} showMobileHeader={true}>
      <div className="flex flex-col h-full app-content-wrapper">
        {/* Messages area - with padding for content to scroll behind fixed input */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden gpu-scroll app-scroll-container overscroll-contain"
        >
          <div
            className={`max-w-3xl mx-auto px-4 pt-6 lg:pt-12 content-with-fixed-input ${browserMode.isMobileBrowser ? 'mobile-browser-mode' : ''}`}
          >
            {/* Conversation messages — also opens for image-mode runs so
                imageEntries below find a visible container. */}
            {(messages.length > 0 || imageEntries.length > 0) && (
              <div className="space-y-6 mb-8">
                <AnimatePresence mode="popLayout">
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

                    // Each slot carries the timestamp it was created at so the
                    // unified stream sorts chronologically — fixes the bug where
                    // a later post answer appeared above an earlier image
                    // generation because messages and imageEntries were
                    // rendered in two separate sections.
                    const elements: { ts: Date; node: React.ReactNode }[] = [];
                    let i = 0;
                    let pairIndex = 0;

                    while (i < messages.length) {
                      const message = messages[i];

                      if (message.type === "user") {
                        elements.push({
                          ts: message.timestamp,
                          node: (
                            <ChatMessage
                              key={message.id || `user-${i}-${Date.now()}`}
                              type={message.type}
                              content={message.content}
                              timestamp={message.timestamp}
                              userName={userName}
                              userInitial={userInitial}
                              userPhotoURL={userPhotoURL || undefined}
                              showActions={false}
                              index={i}
                            />
                          ),
                        });
                        i++;
                      } else if (message.type === "ai") {
                        const nextMessage = messages[i + 1];

                        // Only render AIResponsePair if:
                        // 1. User has MAX plan (dual mode)
                        // 2. There are two consecutive AI messages
                        if (isDualMode && nextMessage && nextMessage.type === "ai") {
                          const storytelling =
                            message.variant === "storytelling"
                              ? message
                              : nextMessage;
                          const business =
                            message.variant === "business"
                              ? message
                              : nextMessage;

                          // Render paired responses with ModernAIResponsePair (MAX plan only)
                          elements.push({
                            ts: message.timestamp,
                            node: (
                            <div key={`pair-${message.id || i}-${pairIndex}`}>
                              {/* POSTY Avatar and Label */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 shrink-0 rounded-xl overflow-hidden shadow-sm">
                                  <img
                                    src="/logo.png"
                                    alt="Posty"
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
                                  // Seed comment only attached to the LATEST pair —
                                  // older history doesn't get retroactive boost prompts.
                                  seedComment:
                                    i === lastAIIndex || i + 1 === lastAIIndex
                                      ? responses.find((r) => r.type === "storytelling")?.seedComment
                                      : undefined,
                                }}
                                businessResponse={{
                                  content: business.content,
                                  variant: "business",
                                  timestamp: business.timestamp,
                                  isStreaming: business.isStreaming,
                                  seedComment:
                                    i === lastAIIndex || i + 1 === lastAIIndex
                                      ? responses.find((r) => r.type === "business")?.seedComment
                                      : undefined,
                                }}
                                userPlan={currentPlan}
                                onPublishToLinkedIn={handlePublishToLinkedIn}
                                onSchedule={handleSchedulePost}
                                isLastMessage={i === lastAIIndex || i + 1 === lastAIIndex}
                                onRegenerateSeedComment={
                                  i === lastAIIndex || i + 1 === lastAIIndex
                                    ? (variant) => {
                                        const idx = responses.findIndex((r) => r.type === variant);
                                        if (idx >= 0) regenerateSeedComment(idx);
                                      }
                                    : undefined
                                }
                              />
                            </div>
                            ),
                          });
                          pairIndex++;
                          i += 2;
                        } else {
                          // Single AI response (FREE/PRO plans) - use ModernResponseCard
                          elements.push({
                            ts: message.timestamp,
                            node: (
                            <motion.div
                              key={message.id || `ai-${i}`}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.25,
                                delay: i * 0.05,
                                ease: smoothEase,
                              }}
                              className="w-full"
                            >
                              {/* POSTY Avatar and Label */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 shrink-0 rounded-xl overflow-hidden shadow-sm">
                                  <img
                                    src="/logo.png"
                                    alt="Posty"
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <span className="text-xs text-text-muted font-medium">POSTY</span>
                              </div>

                              {/* Conversational (Support / ASSISTANCE) → plain prose, no
                                  LinkedIn preview. Variant === undefined is the signal set
                                  by useChat for non-post responses. */}
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
                                  seedComment={
                                    i === lastAIIndex
                                      ? responses[0]?.seedComment
                                      : undefined
                                  }
                                  onRegenerateSeedComment={
                                    i === lastAIIndex && responses[0]
                                      ? () => regenerateSeedComment(0)
                                      : undefined
                                  }
                                  attachedVisual={(() => {
                                    if (!message.id) return null;
                                    const entryId = messageImagePairs[message.id];
                                    if (!entryId) return null;
                                    const entry = imageEntries.find((e) => e.id === entryId);
                                    if (!entry || entry.status !== "done" || !entry.image) return null;
                                    // Same unified variant payload as /app —
                                    // surfaces 3-thumb picker + regenerate
                                    // inside the LinkedIn preview, so reloaded
                                    // conversations get the same premium UX
                                    // as fresh in-session generations.
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
                                      // field; fall back to [0] for entries
                                      // generated before multi-select existed.
                                      selectedIndices:
                                        entry.selectedVariantIndices ?? [0],
                                      onToggle: (idx: number) => {
                                        toggleVariantSelection(entry.id, idx);
                                        // Persist silently — choice survives
                                        // reload and stays correct on publish.
                                        // Compute the post-toggle state from
                                        // the current entry to avoid a race
                                        // with the setState above.
                                        const cur =
                                          entry.selectedVariantIndices ?? [0];
                                        const nextSel = cur.includes(idx)
                                          ? cur.filter((i) => i !== idx)
                                          : [...cur, idx];
                                        setGeneratedImageVariantSelections(
                                          conversationId,
                                          entry.id,
                                          nextSel
                                        ).catch(() => {});
                                      },
                                      onRegenerate: () => handleRegenerateImage(entry.id),
                                      isRegenerating: false,
                                      // Hide regenerate icon when daily image
                                      // quota is exhausted — see /app page
                                      // mirror for the same logic.
                                      canRegenerate:
                                        imageQuota?.remaining === undefined || imageQuota.remaining > 0,
                                    };
                                  })()}
                                  attachedImageLoading={(() => {
                                    // Keep the loader visible until the pair
                                    // lands. An embed entry that finished but
                                    // hasn't been paired yet still reads as
                                    // "loading" from the bubble's perspective
                                    // — otherwise the loader disappears one
                                    // render before the image attaches, which
                                    // is the visible blink behind the bug
                                    // report. 60s age cap prevents a stuck
                                    // entry from blocking the bubble's CTA.
                                    if (i !== lastAIIndex) return false;
                                    if (!message.id) return false;
                                    if (messageImagePairs[message.id]) return false;
                                    const pairedEntryIds = new Set(Object.values(messageImagePairs));
                                    const ATTACHMENT_LOADER_MAX_AGE_MS = 60_000;
                                    const now = Date.now();
                                    return imageEntries.some(
                                      (e) =>
                                        e.embed &&
                                        !pairedEntryIds.has(e.id) &&
                                        (e.status === "generating" || e.status === "done") &&
                                        now - e.createdAt < ATTACHMENT_LOADER_MAX_AGE_MS
                                    );
                                  })()}
                                  onAddVisual={
                                    i === lastAIIndex
                                      ? async (_postContent, variantCount) => {
                                          const r = await handleImageGenerate(
                                            "Visuel pour ce post",
                                            // Referential brief — handleImageGenerate
                                            // funnels through resolveImageBrief which
                                            // substitutes a post-derived brief from
                                            // the last assistant post automatically.
                                            "Visuels",
                                            { embed: true, messageId: message.id, variantCount }
                                          );
                                          if (r.ok && message.id) {
                                            setMessageImagePairs((prev) => ({
                                              ...prev,
                                              [message.id!]: r.entryId,
                                            }));
                                          }
                                        }
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
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 shrink-0 rounded-xl overflow-hidden shadow-sm">
                                  <img src="/logo.png" alt="Posty" className="w-full h-full object-contain" />
                                </div>
                                <span className="text-xs text-text-muted font-medium">POSTY</span>
                              </div>
                              <ActionConfirmCard
                                action={action}
                                onSuccess={(actionType, data) => {
                                  if (actionType === "publish_post" && action.params.content) {
                                    handlePublishToLinkedIn(action.params.content);
                                  } else if (actionType === "delete_conversation") {
                                    router.push("/app?new=" + Date.now());
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

                    // Merge standalone image-mode entries into the same stream,
                    // keyed by their createdAt so they sort into the right
                    // chronological position relative to text messages.
                    const pairedEntryIds = new Set(Object.values(messageImagePairs));
                    const standaloneImageEntries = imageEntries.filter(
                      (e) => !pairedEntryIds.has(e.id) && (!e.embed || e.status === "error")
                    );
                    for (const entry of standaloneImageEntries) {
                      elements.push({
                        ts: new Date(entry.createdAt),
                        node: (
                          <div key={`image-${entry.id}`} className="flex flex-col gap-3">
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
                                      const cur = entry.selectedVariantIndices ?? [0];
                                      const nextSel = cur.includes(idx)
                                        ? cur.filter((i) => i !== idx)
                                        : [...cur, idx];
                                      setGeneratedImageVariantSelections(conversationId, entry.id, nextSel)
                                        .catch(() => {});
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
                                        mt-2 inline-flex items-center justify-center gap-1.5
                                        min-h-[36px] px-3 py-1.5 rounded-lg
                                        bg-error/10 hover:bg-error/15 active:bg-error/20
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

                    // Stable chronological sort — equal timestamps keep
                    // insertion order so user → assistant pairs stay correct.
                    const indexed = elements.map((el, idx) => ({ el, idx }));
                    indexed.sort((a, b) => {
                      const diff = a.el.ts.getTime() - b.el.ts.getTime();
                      return diff !== 0 ? diff : a.idx - b.idx;
                    });
                    return indexed.map((x) => x.el.node);
                  })()}
                </AnimatePresence>

                {/* Generation phase loader / Typing indicator */}
                <AnimatePresence>
                  {isLoading && !isStreaming && (
                    generationPhaseMessage
                      ? <GenerationLoader phase={generationPhase} message={generationPhaseMessage} />
                      : <TypingIndicator />
                  )}
                </AnimatePresence>

              </div>
            )}

            {/* Error display */}
            {error && (
              <AnimatedScaleFade>
                <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-xl text-error text-center text-sm">
                  <svg
                    className="w-5 h-5 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
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
          isVisible={!isNearBottom && (messages.length > 0 || imageEntries.length > 0)}
          onClick={scrollToBottom}
          newCount={newContentCount}
          mode={hasNewContent ? "new-content" : "scroll-down"}
        />

        {/* Input area - Always fixed at bottom on all devices */}
        <div
          className={`
            fixed-input-area
            ${browserMode.isMobileBrowser ? 'mobile-browser-mode' : ''}
            ${isKeyboardVisible ? 'keyboard-visible' : ''}
          `}
          style={
            isKeyboardVisible
              ? ({ '--keyboard-height': `${keyboardHeight}px` } as React.CSSProperties)
              : undefined
          }
        >
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 sm:py-3 lg:py-2">
            {/* Single toolbar row — AI persona chip + post-style selector.
                LayoutGroup + `layout` keeps the chip's recentring smooth when
                the neighbour selector swaps in/out (posts ↔ support). */}
            <LayoutGroup id="ai-mode-toolbar-conv">
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

            {/* UniversalChatInput - Unified premium input component */}
            <UniversalChatInput
              ref={chatInputRef}
              onSubmit={async (message) => {
                // Double-submit + race-condition guards (mirror handleSubmit).
                // - isStreaming guard prevents a second generate() aborting the
                //   first via abortControllerRef and orphaning the partial reply.
                // - loadedConversationRef guard prevents useChat from forking
                //   the conversation under a fresh postId when the user types
                //   before loadOriginalPost has hydrated messages.
                if (isLoading || isStreaming) return;
                if (loadedConversationRef.current !== conversationId) return;
                // Cancel voice auto-send and stop recording if active
                cancelAutoSend();
                setIsVoiceProcessing(false);
                if (isRecordingRef.current && recognitionRef.current) {
                  isRecordingRef.current = false;
                  setIsRecording(false);
                  try { recognitionRef.current.stop(); } catch { /* ignore */ }
                }
                requestAnimationFrame(() => scrollToBottom());

                if (aiMode === "support") {
                  await generate(message, undefined, "ASSISTANCE");
                  return;
                }

                // Posts mode: classify intent then route. Same robust pattern
                // as /app — client fast-path runs first (deterministic regex
                // mirror of the server-side classifier), then we await the
                // server response with a 3.5s soft timeout. If the server
                // is slow or unhealthy, the local fast-path becomes the
                // fallback instead of the historical silent "post" default
                // (which used to eat every "fais un post avec des images"
                // request that hit a latency blip).
                const local = clientFastIntent(message);
                let intent: "post" | "image" | "both" | "conversation" =
                  local.intent === "unknown" ? "post" : local.intent;
                let postBrief = local.postBrief ?? message;
                let imageBrief = local.imageBrief ?? message;
                let postType: "PRODUCTION" | "HYBRID" | "ASSISTANCE" | "SOCIAL" | undefined =
                  local.intent === "both" || local.intent === "post" ? "PRODUCTION" : undefined;
                let userWantedVisuals = false;
                // Same signal as /app: "did the user clearly ask for a
                // visual?" — silent on subject mentions, loud on real
                // deliverable cues.
                const localWantedVisuals =
                  local.intent === "image" || local.intent === "both" || local.isAdditive;

                try {
                  const headers = await getAuthHeaders();
                  const controller = new AbortController();
                  const timeout = setTimeout(() => controller.abort(), 3500);
                  const t0 = Date.now();
                  const res = await fetch("/api/intent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...headers },
                    body: JSON.stringify({ prompt: message, hasPriorConversation: true }),
                    signal: controller.signal,
                  });
                  clearTimeout(timeout);
                  const elapsedMs = Date.now() - t0;
                  if (res.ok) {
                    const data = await res.json();
                    intent = data.intent ?? intent;
                    postBrief = data.postBrief ?? postBrief;
                    imageBrief = data.imageBrief ?? imageBrief;
                    postType = data.postType ?? postType;
                    if (process.env.NODE_ENV !== "production") {
                      console.debug("[intent]", {
                        promptPreview: message.slice(0, 60),
                        local: local.intent,
                        server: intent,
                        source: data.source,
                        elapsedMs,
                      });
                    }
                  } else {
                    console.warn("[intent] server returned non-ok", { status: res.status, elapsedMs, fallback: intent });
                  }
                } catch (err) {
                  console.warn("[intent] classifier unreachable, using local fallback", { fallback: intent, err: (err as Error)?.message });
                }

                // Mismatch detection: prompt asked for a visual deliverable
                // (additive verb or fast-path said image/both) but the
                // resolved intent didn't trigger the image pipeline. Surface
                // a recovery toast so the user can click the CTA in one shot.
                userWantedVisuals = localWantedVisuals && intent !== "image" && intent !== "both";

                if (intent === "image") {
                  await handleImageGenerate(message, imageBrief);
                } else if (intent === "both") {
                  toast.info("✨ Création du post et des visuels en parallèle…", { duration: 3500 });
                  // Snapshot length so we can pair the new image entry with
                  // the freshly-streamed AI message after both pipelines
                  // complete.
                  const entriesBeforeCount = imageEntries.length;
                  await Promise.all([
                    generate(postBrief, undefined, postType),
                    // embed:true keeps the entry out of the standalone list
                    // — the freshly-streamed AI message owns the visual.
                    handleImageGenerate(message, imageBrief, { embed: true }),
                  ]);
                  setImageEntries((current) => {
                    const newEntry = current[entriesBeforeCount];
                    if (newEntry?.status !== "done") return current;
                    // Read from ref, not closure — `messages` captured at
                    // submit time doesn't include the AI turn that
                    // generate() just streamed in.
                    const newestAi = [...messagesRef.current]
                      .reverse()
                      .find((m) => m.type === "ai");
                    if (newestAi?.id) {
                      setMessageImagePairs((prev) => ({
                        ...prev,
                        [newestAi.id!]: newEntry.id,
                      }));
                      // Patch the Firestore record now that the AI message
                      // id exists. Without this, reload sees an unowned
                      // image and renders it standalone (full-width),
                      // breaking the embedded preview + publish flow.
                      setGeneratedImageMessageId(
                        conversationId,
                        newEntry.id,
                        newestAi.id
                      ).catch((err) => {
                        console.warn("[intent=both] failed to persist messageId on image:", err);
                      });
                      return current;
                    }
                    // No AI message to pair with — demote to standalone so
                    // the bubble's attachment loader releases and the user
                    // sees the image rendered normally instead of waiting.
                    return current.map((e) =>
                      e.id === newEntry.id ? { ...e, embed: false } : e
                    );
                  });
                } else {
                  await generate(postBrief, undefined, postType);
                }

                // Recovery toast — user asked for visuals but the resolved
                // intent didn't trigger the image pipeline. One-click
                // recovery via the "Ajouter des visuels" CTA below the post.
                if (userWantedVisuals) {
                  toast.info(
                    "Tu as mentionné des visuels — clique sur \"Ajouter des visuels\" sous le post pour les générer.",
                    { duration: 5000 }
                  );
                }
              }}
              onStop={stopGeneration}
              placeholder={PLACEHOLDER_EXAMPLES}
              disabled={false}
              isLoading={isLoading || isGeneratingImage}
              enableVoiceRecording={speechSupported}
              onVoiceRecordingStart={toggleRecording}
              onVoiceRecordingStop={toggleRecording}
              isRecording={isRecording}
              interimText={interimText}
              isVoiceProcessing={isVoiceProcessing}
              autoSendCountdown={autoSendCountdown}
              onCancelAutoSend={cancelAutoSend}
              enableFileAttachment={true}
              fileAttachmentAllowed={isMaxPlan}
              showHelperText={true}
              maxHeight={200}
              minHeight={56}
              isMobile={browserMode.isMobileBrowser}
              browserMode={browserMode}
              context="conversation"
              quotaLimitReached={!canSendMessage}
              currentPlan={currentPlan}
              maxCharacters={planLimits.maxCharactersPerPrompt}
              showCharacterCount={true}
            />
          </div>
        </div>
      </div>

      {/* LinkedIn Publish Modal */}
      <PublishToLinkedInModal
        isOpen={showPublishModal}
        onClose={() => {
          setShowPublishModal(false);
          setPublishPreloadedImageUrls([]);
        }}
        content={publishContent}
        linkedInConnection={linkedInConnection}
        onPublish={handleConfirmPublish}
        preloadedImageUrls={publishPreloadedImageUrls}
      />

      {/* Schedule post modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        content={scheduleContent}
        seedCommentText={scheduleSeedText}
      />
    </MainLayout>
  );
}

export default function ConversationPage() {
  return (
    <ProtectedRoute>
      <ConversationContent />
    </ProtectedRoute>
  );
}
