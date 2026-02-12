"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useQuota } from "@/contexts/QuotaContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useChat } from "@/hooks/useChat";
import { useSmartScroll } from "@/hooks/useSmartScroll";
import { useBrowserMode } from "@/hooks/useBrowserMode";
import { getPost, getUserPostsWithPinned } from "@/lib/firestore";
import { getPlanFeatures } from "@/lib/plan-features";
import { Post } from "@/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import ChatMessage, { TypingIndicator } from "@/components/chat/ChatMessage";
import ModernAIResponsePair from "@/components/chat/ModernAIResponsePair";
import ModernResponseCard from "@/components/chat/ModernResponseCard";
import NewResponseIndicator from "@/components/chat/NewResponseIndicator";
import PublishToLinkedInModal from "@/components/linkedin/PublishToLinkedInModal";
import ScheduleModal from "@/components/schedule/ScheduleModal";
import { AnimatedScaleFade } from "@/components/animations/AnimatedPageWrapper";
import toast from "@/components/ui/Toast";
import UniversalChatInput, { UniversalChatInputRef } from "@/components/chat/UniversalChatInput";

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

  const { user, userProfile } = useAuth();
  const { connection: linkedInConnection, publishToLinkedIn } = useLinkedIn();
  const { canSendMessage } = useQuota();
  const { currentPlan, planLimits, isMaxPlan, isProPlan } = useSubscription();
  const browserMode = useBrowserMode();

  // Conversation state
  const [originalPost, setOriginalPost] = useState<Post | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
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

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chatInputRef = useRef<UniversalChatInputRef>(null);

  const {
    messages,
    isLoading,
    isStreaming,
    error,
    generate,
    reset,
    loadConversation,
  } = useChat({
    userId: user?.uid,
    isGuest: false,
    conversationId,
    dualMode: isMaxPlan || (isProPlan && planLimits.hasDualResponseMode),
  });

  // Smart scroll
  const {
    containerRef: scrollContainerRef,
    bottomRef: messagesEndRef,
    hasNewContent,
    newContentCount,
    scrollToBottom,
  } = useSmartScroll({
    dependencies: messages,
    isStreaming,
    isLoading,
    threshold: 200,
  });

  // Load the original conversation/post (including follow-up messages for multi-turn)
  useEffect(() => {
    const loadOriginalPost = async () => {
      if (!conversationId || !user) return;

      setIsLoadingPost(true);
      try {
        const post = await getPost(conversationId);
        if (post && post.userId === user.uid) {
          setOriginalPost(post);
          // Load the conversation into chat - including follow-up messages
          loadConversation?.({
            id: post.id,
            prompt: post.prompt,
            responseA: post.responseA,
            responseB: post.responseB,
            // Include follow-up messages for multi-turn conversations
            messages: post.messages || [],
          });
        } else {
          // Post not found or doesn't belong to user
          toast.error("Conversation introuvable");
          router.push("/app");
        }
      } catch (error) {
        console.error("Error loading conversation:", error);
        toast.error("Erreur lors du chargement");
        router.push("/app");
      } finally {
        setIsLoadingPost(false);
      }
    };

    loadOriginalPost();
  }, [conversationId, user, router, loadConversation]);

  // Fetch user posts for sidebar
  useEffect(() => {
    const fetchPosts = async () => {
      if (user) {
        const userPosts = await getUserPostsWithPinned(user.uid, 20);
        setPosts(userPosts);
      }
    };
    fetchPosts();
  }, [user, messages]);

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

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
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
          // Inject transcribed text into the chat input via ref
          chatInputRef.current?.appendValue(finalTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        if (event.error === "not-allowed") {
          toast.error("Microphone non autorisé. Vérifiez les permissions.");
        } else if (event.error === "no-speech") {
          toast.error("Aucune voix détectée. Réessayez.");
        }
      };

      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
    // Cleanup: abort recognition and release microphone on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort errors
        }
        recognitionRef.current = null;
      }
      setIsRecording(false);
    };
  }, []);

  // Toggle voice recording with immediate state updates
  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      // Stop recognition - this releases the microphone
      try {
        recognitionRef.current.stop();
      } catch {
        // Force abort if stop fails
        recognitionRef.current.abort();
      }
      // Update state immediately (don't wait for onend)
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Failed to start recording:", error);
        setIsRecording(false);
        toast.error("Impossible de démarrer l'enregistrement");
      }
    }
  }, [isRecording]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    // Stop recording if active
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    const prompt = inputValue.trim();
    setInputValue("");

    try {
      await generate(prompt);
    } catch (error) {
      console.error("Generation error:", error);
    }
  }, [inputValue, isLoading, isRecording, generate]);

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
      toast.success("Copié !");
    } catch {
      toast.error("Erreur lors de la copie");
    }
  }, []);

  // LinkedIn publish handlers
  const handlePublishToLinkedIn = useCallback((content: string) => {
    setPublishContent(content);
    setShowPublishModal(true);
  }, []);

  const handleConfirmPublish = async (editedContent: string, visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC") => {
    return await publishToLinkedIn(editedContent, visibility);
  };

  // Schedule handlers
  const handleSchedulePost = useCallback((content: string) => {
    setScheduleContent(content);
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
      <div className="flex flex-col h-full bg-background app-content-wrapper">
        {/* Messages area - with padding for content to scroll behind fixed input */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto gpu-scroll app-scroll-container overscroll-contain"
        >
          <div
            className={`max-w-3xl mx-auto px-4 pt-6 lg:pt-12 content-with-fixed-input ${browserMode.isMobileBrowser ? 'mobile-browser-mode' : ''}`}
          >
            {/* Conversation messages */}
            {messages.length > 0 && (
              <div className="space-y-6 mb-8">
                <AnimatePresence mode="popLayout">
                  {(() => {
                    // Get response mode based on plan
                    // Pro: limited dual (3/week), Max: unlimited dual
                    const planFeatures = getPlanFeatures(currentPlan);
                    const isDualMode = planFeatures.responseMode === "dual" || planLimits.hasDualResponseMode;

                    const elements: React.ReactNode[] = [];
                    let i = 0;
                    let pairIndex = 0;

                    while (i < messages.length) {
                      const message = messages[i];

                      if (message.type === "user") {
                        elements.push(
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
                        );
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
                          elements.push(
                            <div key={`pair-${message.id || i}-${pairIndex}`}>
                              {/* POSTY Avatar and Label */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm">
                                  <img
                                    src="/logo.jpg"
                                    alt="Posty"
                                    className="w-full h-full object-cover"
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
                              />
                            </div>
                          );
                          pairIndex++;
                          i += 2;
                        } else {
                          // Single AI response (FREE/PRO plans) - use ModernResponseCard
                          elements.push(
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
                                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm">
                                  <img
                                    src="/logo.jpg"
                                    alt="Posty"
                                    className="w-full h-full object-cover"
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
                              />
                            </motion.div>
                          );
                          i++;
                        }
                      } else {
                        i++;
                      }
                    }

                    return elements;
                  })()}
                </AnimatePresence>

                {/* Typing indicator */}
                <AnimatePresence>
                  {isLoading && !isStreaming && <TypingIndicator />}
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

        {/* New response indicator */}
        <NewResponseIndicator
          isVisible={hasNewContent && !isLoading && !isStreaming}
          onClick={scrollToBottom}
          newCount={newContentCount}
        />

        {/* Input area - Always fixed at bottom on all devices */}
        <div
          className={`
            fixed-input-area
            ${browserMode.isMobileBrowser ? 'mobile-browser-mode' : ''}
          `}
        >
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-1 lg:py-2">
            {/* UniversalChatInput - Unified premium input component */}
            <UniversalChatInput
              ref={chatInputRef}
              onSubmit={async (message) => {
                // Stop recording if active
                if (isRecording && recognitionRef.current) {
                  recognitionRef.current.stop();
                  setIsRecording(false);
                }
                await generate(message);
              }}
              placeholder={PLACEHOLDER_EXAMPLES}
              disabled={false}
              isLoading={isLoading}
              enableVoiceRecording={speechSupported}
              onVoiceRecordingStart={toggleRecording}
              onVoiceRecordingStop={toggleRecording}
              isRecording={isRecording}
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
        onClose={() => setShowPublishModal(false)}
        content={publishContent}
        linkedInConnection={linkedInConnection}
        onPublish={handleConfirmPublish}
      />

      {/* Schedule post modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        content={scheduleContent}
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
