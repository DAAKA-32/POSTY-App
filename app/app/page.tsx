"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useQuota } from "@/contexts/QuotaContext";
import { useChat } from "@/hooks/useChat";
import { useSmartScroll } from "@/hooks/useSmartScroll";
import { getUserPostsWithPinned } from "@/lib/firestore";
import { Post } from "@/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import ChatMessage, { TypingIndicator } from "@/components/chat/ChatMessage";
import AIResponsePair from "@/components/chat/AIResponsePair";
import NewResponseIndicator from "@/components/chat/NewResponseIndicator";
import PublishToLinkedInModal from "@/components/linkedin/PublishToLinkedInModal";
import UsageBanner from "@/components/ui/UsageBanner";
import { AnimatedScaleFade } from "@/components/animations/AnimatedPageWrapper";
import toast from "react-hot-toast";

// Dynamic placeholder examples that rotate
const PLACEHOLDER_EXAMPLES = [
  "Un post sur le leadership...",
  "Une astuce productivite...",
  "Mon parcours professionnel...",
  "Une lecon apprise recemment...",
  "Un conseil pour les juniors...",
  "Une reflexion sur le teletravail...",
  "Un moment cle de ma carriere...",
];

// Character limits
const CHAR_LIMIT_WARNING = 2500;
const CHAR_LIMIT_MAX = 3000;

function AppContent() {
  const { user, userProfile } = useAuth();
  const { connection: linkedInConnection, publishToLinkedIn } = useLinkedIn();
  const { canSendMessage, isPremium } = useQuota();
  const [posts, setPosts] = useState<Post[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishContent, setPublishContent] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Character count helpers
  const charCount = inputValue.length;
  const isNearLimit = charCount >= CHAR_LIMIT_WARNING;
  const isOverLimit = charCount > CHAR_LIMIT_MAX;

  const {
    messages,
    isLoading,
    isStreaming,
    error,
    generate,
    reset,
  } = useChat({
    userId: user?.uid,
    isGuest: false,
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

  const handleGenerate = async (prompt: string) => {
    await generate(prompt);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading || isStreaming || isOverLimit) return;
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
      toast.success("Copie !");
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  const handlePublishToLinkedIn = (content: string) => {
    setPublishContent(content);
    setShowPublishModal(true);
  };

  const handleConfirmPublish = async (editedContent: string) => {
    return await publishToLinkedIn(editedContent);
  };

  const userInitial = userProfile?.displayName?.charAt(0) || user?.email?.charAt(0) || "U";
  const userName = userProfile?.displayName || "Vous";

  return (
    <MainLayout posts={posts} showMobileHeader={true}>
      <div className="flex flex-col h-full bg-background">
        {/* Messages area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto gpu-scroll">
          <div className="max-w-3xl mx-auto px-4 py-6 lg:py-12">
            {/* Welcome message when no messages */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                {/* Animated logo */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-glow animate-float">
                    <span className="text-white font-bold text-3xl">T</span>
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-xl -z-10" />
                </div>

                {/* Greeting */}
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3">
                  {userProfile?.displayName
                    ? `Bonjour, ${userProfile.displayName.split(" ")[0]} !`
                    : "Bienvenue sur POSTY"}
                </h1>
                <p className="text-text-secondary text-base lg:text-lg max-w-md mb-8">
                  Decrivez votre idee et je genererai 2 versions optimisees de votre post LinkedIn
                </p>

                {/* Quick suggestions */}
                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                  {[
                    "Un post sur le leadership",
                    "Une astuce productivite",
                    "Mon parcours professionnel",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInputValue(suggestion)}
                      className="
                        px-4 py-2 text-sm
                        bg-dark-elevated hover:bg-dark-hover
                        border border-dark-border hover:border-primary/30
                        text-text-secondary hover:text-white
                        rounded-xl transition-all duration-200
                        haptic-feedback
                      "
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation messages */}
            {messages.length > 0 && (
              <div className="space-y-6 mb-8">
                <AnimatePresence mode="popLayout">
                  {(() => {
                    // Group messages: user messages standalone, AI responses paired
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
                            showActions={false}
                            index={i}
                          />
                        );
                        i++;
                      } else if (message.type === "ai") {
                        // Check if next message is also AI (paired response)
                        const nextMessage = messages[i + 1];

                        if (nextMessage && nextMessage.type === "ai") {
                          // Find storytelling and business in the pair
                          const storytelling = message.variant === "storytelling" ? message : nextMessage;
                          const business = message.variant === "business" ? message : nextMessage;

                          // Render paired responses with AIResponsePair
                          elements.push(
                            <AIResponsePair
                              key={`pair-${message.id}`}
                              storytellingResponse={{
                                id: storytelling.id,
                                content: storytelling.content,
                                variant: "storytelling",
                                timestamp: storytelling.timestamp,
                                isStreaming: storytelling.isStreaming,
                              }}
                              businessResponse={{
                                id: business.id,
                                content: business.content,
                                variant: "business",
                                timestamp: business.timestamp,
                                isStreaming: business.isStreaming,
                              }}
                              onCopy={handleCopy}
                              onPublishToLinkedIn={handlePublishToLinkedIn}
                              index={pairIndex}
                            />
                          );
                          pairIndex++;
                          i += 2; // Skip both messages
                        } else {
                          // Single AI message (shouldn't happen normally, but handle it)
                          elements.push(
                            <ChatMessage
                              key={message.id}
                              type={message.type}
                              content={message.content}
                              timestamp={message.timestamp}
                              variant={message.variant}
                              showActions={true}
                              onCopy={() => handleCopy(message.content)}
                              onPublishToLinkedIn={() => handlePublishToLinkedIn(message.content)}
                              index={i}
                              isStreaming={message.isStreaming}
                            />
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

                {/* New conversation button */}
                {!isLoading && !isStreaming && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleNewConversation}
                      className="
                        flex items-center gap-2 px-6 py-3
                        bg-dark-elevated hover:bg-dark-hover
                        border border-dark-border hover:border-primary/30
                        text-white font-medium rounded-xl
                        transition-all duration-200 haptic-feedback
                      "
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Nouvelle conversation
                    </button>
                  </div>
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

        {/* Input area - fixed at bottom like ChatGPT */}
        <div className="flex-shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-safe">
          <div className="max-w-3xl mx-auto px-4 pb-4">
            {/* Usage Banner - Above input for free users */}
            <UsageBanner className="mb-3" />

            <div className={`
              relative bg-dark-card border rounded-2xl shadow-elevated transition-all duration-200
              ${isOverLimit
                ? "border-error/50 focus-within:border-error"
                : canSendMessage
                  ? "border-dark-border focus-within:border-primary/50 focus-within:shadow-glow"
                  : "border-error/20 opacity-75"
              }
            `}>
              <textarea
                id="chat-input"
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={
                  !canSendMessage
                    ? "Limite de messages atteinte pour aujourd'hui"
                    : PLACEHOLDER_EXAMPLES[placeholderIndex]
                }
                disabled={isLoading || isStreaming || !canSendMessage}
                rows={1}
                aria-label="Decrivez votre post LinkedIn"
                aria-describedby="char-counter"
                className="
                  w-full bg-transparent text-white text-base
                  placeholder-text-muted resize-none focus:outline-none
                  disabled:opacity-50 min-h-[56px] max-h-[200px]
                  py-[18px] px-4 pr-14
                  leading-5 transition-[height] duration-150 ease-out
                "
                style={{ overflow: inputValue.length > 100 ? "auto" : "hidden" }}
              />

              {/* Character counter - screen reader version always available */}
              <span id="char-counter" className="sr-only">
                {charCount} caracteres sur {CHAR_LIMIT_MAX} maximum
                {isOverLimit && ". Limite depassee."}
                {isNearLimit && !isOverLimit && ". Proche de la limite."}
              </span>

              {/* Character counter - visual version */}
              <AnimatePresence>
                {charCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    aria-hidden="true"
                    className={`
                      absolute left-4 bottom-3 text-xs font-medium
                      transition-colors duration-200
                      ${isOverLimit
                        ? "text-error"
                        : isNearLimit
                          ? "text-warning"
                          : "text-text-muted"
                      }
                    `}
                  >
                    {charCount.toLocaleString()}/{CHAR_LIMIT_MAX.toLocaleString()}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isLoading || isStreaming || !canSendMessage || isOverLimit}
                className={`
                  absolute right-3 bottom-3
                  w-10 h-10 rounded-xl flex items-center justify-center
                  transition-all duration-200
                  ${inputValue.trim() && !isLoading && !isStreaming && canSendMessage && !isOverLimit
                    ? "bg-gradient-to-r from-primary to-primary-hover text-white shadow-glow hover:shadow-lg"
                    : "bg-dark-border text-text-muted"
                  }
                  disabled:opacity-50 active:scale-95 haptic-feedback
                `}
                title={isOverLimit ? "Message trop long" : "Envoyer (Entree)"}
              >
                {isLoading || isStreaming ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Helper text with keyboard shortcut hint */}
            <div className="flex items-center justify-between mt-3 px-1">
              <p className="text-2xs text-text-muted">
                POSTY peut faire des erreurs. Verifiez les informations importantes.
              </p>
              <p className="text-2xs text-text-muted hidden sm:block">
                <kbd className="px-1.5 py-0.5 bg-dark-elevated rounded text-text-secondary">Entree</kbd> envoyer
                <span className="mx-1.5 text-dark-border">|</span>
                <kbd className="px-1.5 py-0.5 bg-dark-elevated rounded text-text-secondary">Shift+Entree</kbd> nouvelle ligne
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Publish to LinkedIn modal */}
      <PublishToLinkedInModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        content={publishContent}
        linkedInConnection={linkedInConnection}
        onPublish={handleConfirmPublish}
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
