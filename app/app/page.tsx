"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useQuota } from "@/contexts/QuotaContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useChat } from "@/hooks/useChat";
import { useSmartScroll } from "@/hooks/useSmartScroll";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { getUserPostsWithPinned } from "@/lib/firestore";
import { Post } from "@/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import ChatMessage, { TypingIndicator } from "@/components/chat/ChatMessage";
import ModernAIResponsePair from "@/components/chat/ModernAIResponsePair";
import ModernResponseCard from "@/components/chat/ModernResponseCard";
import ModernStyleSelector from "@/components/chat/ModernStyleSelector";
import { getPlanFeatures } from "@/lib/plan-features";
import NewResponseIndicator from "@/components/chat/NewResponseIndicator";
import { PostInsights } from "@/components/post";
import PublishToLinkedInModal from "@/components/linkedin/PublishToLinkedInModal";
import ScheduleModal from "@/components/schedule/ScheduleModal";
import UpgradeCTA from "@/components/subscription/UpgradeCTA";
import { AnimatedScaleFade } from "@/components/animations/AnimatedPageWrapper";
import toast from "@/components/ui/Toast";
import VoiceWaveform, { ListeningIndicator } from "@/components/chat/VoiceWaveform";
import ShimmeringName from "@/components/ui/ShimmeringName";
import { useBrowserMode, setBrowserModeCSSVars } from "@/hooks/useBrowserMode";
import { CompactPostTemplates } from "@/components/chat/PostTemplates";
import { trackPostGeneration, initAnalytics } from "@/lib/analytics";
import UniversalChatInput, { UniversalChatInputRef } from "@/components/chat/UniversalChatInput";

// Premium animation easings - inspired by Linear, Notion
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Animation variants for app page
const welcomeContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const welcomeItemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: smoothEase,
    },
  },
};

const inputAreaVariants = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      ease: smoothEase,
    },
  },
};

const suggestionButtonVariants = {
  hidden: { opacity: 0, scale: 0.9, filter: "blur(6px)" },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.4,
      delay: 0.4 + i * 0.08,
      ease: smoothEase,
    },
  }),
};

const newConversationVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: smoothEase,
    },
  },
};

// Dynamic placeholder examples that rotate
const PLACEHOLDER_EXAMPLES = [
  "Un post sur le leadership...",
  "Une astuce productivité...",
  "Mon parcours professionnel...",
  "Une leçon apprise récemment...",
  "Un conseil pour les juniors...",
  "Une réflexion sur le télétravail...",
  "Un moment clé de ma carrière...",
];

function AppContent() {
  const { user, userProfile } = useAuth();
  const { connection: linkedInConnection, publishToLinkedIn } = useLinkedIn();
  const { canSendMessage } = useQuota();
  const { isMaxPlan, currentPlan } = useSubscription();
  const [posts, setPosts] = useState<Post[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishContent, setPublishContent] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleContent, setScheduleContent] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<UniversalChatInputRef>(null);
  const prefersReducedMotion = useReducedMotion();

  // Style selection state (PRO plan feature)
  const [selectedStyle, setSelectedStyle] = useState<"storytelling" | "business">("business");

  // Track session activity for intelligent upgrade CTA timing
  const [sessionStartTime] = useState(Date.now());
  const [sessionMessageCount, setSessionMessageCount] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Detect mobile keyboard
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();

  // Detect browser mode vs PWA for input positioning
  const browserMode = useBrowserMode();

  // Set CSS variables for browser mode adjustments
  useEffect(() => {
    setBrowserModeCSSVars(browserMode);
  }, [browserMode]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const {
    messages,
    isLoading,
    isStreaming,
    error,
    generate,
    reset,
    insights,
  } = useChat({
    userId: user?.uid,
    isGuest: false,
    selectedStyle,
  });

  // Smart scroll: only auto-scroll when user is near bottom
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

  // Track session duration for intelligent upgrade CTA timing
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Track message count for intelligent upgrade CTA timing
  useEffect(() => {
    const userMessages = messages.filter((m) => m.type === "user");
    setSessionMessageCount(userMessages.length);
  }, [messages]);

  // Initialize analytics on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Fetch user posts (with pinned posts first)
  useEffect(() => {
    const fetchPosts = async () => {
      if (user) {
        const userPosts = await getUserPostsWithPinned(user.uid, 20);
        setPosts(userPosts);
      }
    };
    fetchPosts();
  }, [user, messages]);

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

  // Rotating placeholder effect
  useEffect(() => {
    if (isFocused || inputValue.length > 0) return; // Don't rotate when focused or has content

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isFocused, inputValue.length]);

  // Initialize speech recognition
  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "fr-FR";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          // Show processing state briefly for smooth transition
          setIsProcessingVoice(true);
          setTimeout(() => {
            setInputValue((prev) => prev + (prev ? " " : "") + finalTranscript);
            setIsProcessingVoice(false);
          }, 300);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsRecording(false);

        // Only show user-friendly errors, don't pollute console with permission denials
        if (event.error === "not-allowed") {
          toast.error("Microphone non autorisé. Vérifiez les permissions.");
        } else if (event.error === "no-speech") {
          toast.error("Aucune voix détectée. Réessayez.");
        } else if (event.error !== "aborted") {
          // Log unexpected errors (but not "aborted" which is normal when user stops)
          console.warn("Speech recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Toggle voice recording
  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Failed to start recording:", error);
        toast.error("Impossible de démarrer l'enregistrement");
      }
    }
  }, [isRecording]);

  const handleGenerate = async (prompt: string) => {
    await generate(prompt);
    // Track post generation for activation rate analytics
    trackPostGeneration();
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading || isStreaming) return;
    // Stop recording if active
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
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
      toast.success("Copié !");
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  const handlePublishToLinkedIn = (content: string) => {
    setPublishContent(content);
    setShowPublishModal(true);
  };

  const handleConfirmPublish = async (editedContent: string, visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC") => {
    return await publishToLinkedIn(editedContent, visibility);
  };

  const handleSchedulePost = (content: string) => {
    setScheduleContent(content);
    setShowScheduleModal(true);
  };

  const userInitial = userProfile?.displayName?.charAt(0) || user?.email?.charAt(0) || "U";
  const userName = userProfile?.displayName || "Vous";
  const userPhotoURL = user?.photoURL || userProfile?.photoURL || null;

  // Determine if scroll should be disabled (no messages = welcome screen)
  const shouldDisableScroll = messages.length === 0 && !isLoading;

  return (
    <MainLayout posts={posts} showMobileHeader={true}>
      <div className="flex flex-col h-full bg-background app-content-wrapper">
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
                  {/* Multi-layer glow effect behind logo */}
                  <motion.div
                    className="absolute -inset-8 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 rounded-full blur-3xl -z-10"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={prefersReducedMotion ? { opacity: 0.4, scale: 1 } : {
                      opacity: [0.3, 0.5, 0.3],
                      scale: [0.9, 1.1, 0.9]
                    }}
                    transition={{
                      duration: 4,
                      repeat: prefersReducedMotion ? 0 : Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <motion.div
                    className="absolute -inset-4 bg-gradient-to-tr from-accent/25 to-primary/25 rounded-full blur-xl -z-10"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={prefersReducedMotion ? { opacity: 0.3, scale: 1 } : {
                      opacity: [0.4, 0.6, 0.4],
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, 0, -5, 0]
                    }}
                    transition={{
                      duration: 6,
                      repeat: prefersReducedMotion ? 0 : Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  {/* Logo container with premium border and float animation */}
                  <motion.div
                    className="relative"
                    animate={prefersReducedMotion ? {} : { y: [0, -8, 0] }}
                    transition={{
                      duration: 3.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {/* Gradient border ring */}
                    <div className="absolute -inset-1 bg-gradient-to-br from-primary via-accent to-primary rounded-3xl opacity-60 blur-[2px]" />
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-elevated ring-2 ring-white/50 dark:ring-dark-card/50">
                      <img
                        src="/logo.jpg"
                        alt="Posty Logo"
                        className="w-full h-full object-contain"
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
                      <span className="text-text-primary">Bonjour, </span>
                      <ShimmeringName
                        name={`${userProfile.displayName.split(" ")[0]} !`}
                        showSparkles={true}
                        delay={400}
                      />
                    </>
                  ) : (
                    "Bienvenue sur POSTY"
                  )}
                </motion.h1>
                <motion.p
                  variants={welcomeItemVariants}
                  className="text-text-secondary text-sm sm:text-base lg:text-lg max-w-md mb-6 sm:mb-8 px-2"
                >
                  Décrivez votre idée et je générerai{" "}
                  <span className="shimmer-text-gradient font-semibold">2 versions optimisées</span>
                  {" "}de votre post LinkedIn
                </motion.p>

                {/* Visual Post Templates */}
                <motion.div
                  variants={welcomeItemVariants}
                  className="w-full max-w-2xl px-2 template-section"
                >
                  <CompactPostTemplates
                    onSelect={(template) => {
                      // Inject template into UniversalChatInput
                      chatInputRef.current?.setValue(template);
                      // Focus the chat input after template injection
                      setTimeout(() => {
                        chatInputRef.current?.focus();
                      }, 100);
                    }}
                    className="justify-center infinite-scroll-stable"
                    disabled={!canSendMessage}
                  />
                </motion.div>
              </motion.div>
            )}

            {/* Conversation messages */}
            {messages.length > 0 && (
              <div className="space-y-6 mb-8 w-full">
                <AnimatePresence mode="popLayout">
                  {(() => {
                    // Get response mode based on plan (dual = 2 versions, else single)
                    const planFeatures = getPlanFeatures(currentPlan);
                    const isDualMode = planFeatures.responseMode === "dual";

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
                            key={message.id}
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
                            <div key={`pair-${message.id}`}>
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
                          i += 2; // Skip both messages
                        } else {
                          // Single AI response (FREE/PRO plans) - use ModernResponseCard
                          elements.push(
                            <motion.div
                              key={message.id}
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

                {/* Typing indicator when loading (before streaming starts) */}
                <AnimatePresence>
                  {isLoading && !isStreaming && <TypingIndicator />}
                </AnimatePresence>

                {/* AI-generated insights (all plans) */}
                {insights && !isLoading && !isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="mt-4"
                  >
                    <PostInsights insights={insights} />
                  </motion.div>
                )}

                {/* New conversation button - Premium version */}
                {!isLoading && !isStreaming && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={newConversationVariants}
                    className="flex justify-center pt-6"
                  >
                    <motion.button
                      onClick={handleNewConversation}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="
                        group relative flex items-center gap-2.5 px-6 py-3.5
                        bg-white dark:bg-dark-elevated
                        hover:bg-gray-50 dark:hover:bg-dark-hover
                        border border-gray-200 dark:border-dark-border
                        hover:border-primary/40 dark:hover:border-primary/40
                        text-text-primary font-medium rounded-2xl
                        transition-all duration-300
                        shadow-sm hover:shadow-md hover:shadow-primary/10
                        haptic-feedback
                      "
                    >
                      {/* Gradient icon background on hover */}
                      <span className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 dark:bg-dark-hover group-hover:bg-gradient-to-br group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                        <svg className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </span>
                      <span className="group-hover:text-primary transition-colors">
                        Nouvelle conversation
                      </span>
                    </motion.button>
                  </motion.div>
                )}
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

        {/* New response indicator - shown when user scrolled up and new content is available */}
        <NewResponseIndicator
          isVisible={hasNewContent && !isLoading && !isStreaming}
          onClick={scrollToBottom}
          newCount={newContentCount}
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
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-1 lg:py-2">
            {/* Upgrade CTA - Dynamic based on plan with intelligent timing */}
            <UpgradeCTA
              variant="inline"
              className="mb-2 sm:mb-3"
              messageCount={sessionMessageCount}
              sessionDuration={sessionDuration}
            />

            {/* Modern Style Selector - ONLY for PRO plan */}
            {currentPlan === "pro" && (
              <div className="mb-3 flex justify-center">
                <ModernStyleSelector
                  selectedStyle={selectedStyle}
                  onStyleChange={setSelectedStyle}
                  disabled={isLoading || isStreaming}
                />
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1, ease: smoothEase }}
              className="relative"
            >
              {/* Premium Voice Recording Indicator */}
              <AnimatePresence mode="wait">
                {(isRecording || isProcessingVoice) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: smoothEase }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center justify-center z-10"
                  >
                    {isProcessingVoice ? (
                      <motion.div
                        key="processing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 px-4 py-2 bg-dark-card/95 backdrop-blur-sm border border-primary/30 rounded-2xl shadow-lg shadow-primary/10"
                      >
                        <div className="flex items-center gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 rounded-full bg-primary"
                              animate={{
                                y: [0, -6, 0],
                                opacity: [0.4, 1, 0.4],
                              }}
                              transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                delay: i * 0.12,
                                ease: "easeInOut",
                              }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="recording"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 px-4 py-2.5 bg-dark-card/95 backdrop-blur-sm border border-primary/40 rounded-2xl shadow-lg shadow-primary/20"
                      >
                        <div className="relative flex items-center justify-center w-6 h-6">
                          <motion.div
                            className="absolute inset-0 rounded-full bg-primary/20"
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.6, 0, 0.6],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />
                          <motion.div
                            className="absolute inset-1 rounded-full bg-primary/30"
                            animate={{
                              scale: [1, 1.3, 1],
                              opacity: [0.8, 0.2, 0.8],
                            }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.2,
                            }}
                          />
                          <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50" />
                        </div>
                        <VoiceWaveform isRecording={isRecording} barCount={7} />
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* UniversalChatInput - Unified premium input component */}
              <UniversalChatInput
                ref={chatInputRef}
                onSubmit={handleGenerate}
                placeholder={PLACEHOLDER_EXAMPLES}
                disabled={!canSendMessage}
                isLoading={isLoading || isStreaming}
                enableVoiceRecording={speechSupported}
                onVoiceRecordingStart={toggleRecording}
                onVoiceRecordingStop={toggleRecording}
                isRecording={isRecording}
                showHelperText={true}
                maxHeight={200}
                minHeight={56}
                isMobile={browserMode.isMobileBrowser}
                keyboardHeight={keyboardHeight}
                browserMode={browserMode}
                context="new-chat"
                quotaLimitReached={!canSendMessage}
              />
            </motion.div>

            {/* Additional helper text - Desktop only (hidden on mobile via CSS) */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4, ease: smoothEase }}
              className="hidden sm:block text-2xs text-gray-500 dark:text-gray-400 text-center mt-0"
            >
              POSTY peut faire des erreurs. Vérifiez les informations importantes.
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* Publish to LinkedIn modal */}
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

export default function AppPage() {
  return (
    <ProtectedRoute>
      <AppContent />
    </ProtectedRoute>
  );
}
