"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useQuota } from "@/contexts/QuotaContext";
import { useChat } from "@/hooks/useChat";
import { useSmartScroll } from "@/hooks/useSmartScroll";
import { getPost, getUserPostsWithPinned } from "@/lib/firestore";
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
  "Continuez la conversation...",
  "Une nouvelle idee a explorer...",
  "Affinez le message...",
];

// Character limits
const CHAR_LIMIT_WARNING = 2500;
const CHAR_LIMIT_MAX = 3000;

function ConversationContent() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const { user, userProfile } = useAuth();
  const { connection: linkedInConnection, publishToLinkedIn } = useLinkedIn();
  const { canSendMessage, isPremium } = useQuota();

  // Conversation state
  const [originalPost, setOriginalPost] = useState<Post | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);

  // UI State
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
    loadConversation,
  } = useChat({
    userId: user?.uid,
    isGuest: false,
    conversationId,
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

  // Load the original conversation/post
  useEffect(() => {
    const loadOriginalPost = async () => {
      if (!conversationId || !user) return;

      setIsLoadingPost(true);
      try {
        const post = await getPost(conversationId);
        if (post && post.userId === user.uid) {
          setOriginalPost(post);
          // Load the conversation into chat
          loadConversation?.(post);
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

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isLoading || isOverLimit) return;

    const prompt = inputValue.trim();
    setInputValue("");

    try {
      await generate(prompt);
    } catch (error) {
      console.error("Generation error:", error);
    }
  }, [inputValue, isLoading, isOverLimit, generate]);

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
      toast.success("Copie !");
    } catch {
      toast.error("Erreur lors de la copie");
    }
  }, []);

  // LinkedIn publish handlers
  const handlePublishToLinkedIn = useCallback((content: string) => {
    setPublishContent(content);
    setShowPublishModal(true);
  }, []);

  const handleConfirmPublish = async (editedContent: string) => {
    return await publishToLinkedIn(editedContent);
  };

  const userInitial =
    userProfile?.displayName?.charAt(0) || user?.email?.charAt(0) || "U";
  const userName = userProfile?.displayName || "Vous";

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
      <div className="flex flex-col h-full bg-background">
        {/* Messages area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto gpu-scroll"
        >
          <div className="max-w-3xl mx-auto px-4 py-6 lg:py-12">
            {/* Conversation header */}
            {originalPost && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 pb-4 border-b border-dark-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-semibold text-white truncate">
                      {originalPost.title ||
                        originalPost.prompt.slice(0, 50) +
                          (originalPost.prompt.length > 50 ? "..." : "")}
                    </h1>
                    <p className="text-xs text-text-muted">
                      Conversation active - Continuez a discuter avec l'IA
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Conversation messages */}
            {messages.length > 0 && (
              <div className="space-y-6 mb-8">
                <AnimatePresence mode="popLayout">
                  {(() => {
                    const elements: React.ReactNode[] = [];
                    let i = 0;
                    let pairIndex = 0;

                    while (i < messages.length) {
                      const message = messages[i];

                      if (message.type === "user") {
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
                        const nextMessage = messages[i + 1];

                        if (nextMessage && nextMessage.type === "ai") {
                          const storytelling =
                            message.variant === "storytelling"
                              ? message
                              : nextMessage;
                          const business =
                            message.variant === "business"
                              ? message
                              : nextMessage;

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
                          i += 2;
                        } else {
                          elements.push(
                            <ChatMessage
                              key={message.id}
                              type={message.type}
                              content={message.content}
                              timestamp={message.timestamp}
                              variant={message.variant}
                              showActions={true}
                              onCopy={() => handleCopy(message.content)}
                              onPublishToLinkedIn={() =>
                                handlePublishToLinkedIn(message.content)
                              }
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

        {/* Input area */}
        <div className="flex-shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-safe">
          <div className="max-w-3xl mx-auto px-4 pb-4">
            <UsageBanner className="mb-3" />

            <div
              className={`
                relative bg-dark-card border rounded-2xl shadow-elevated transition-all duration-200
                ${
                  isOverLimit
                    ? "border-error/50 focus-within:border-error"
                    : canSendMessage
                    ? "border-dark-border focus-within:border-primary/50 focus-within:shadow-glow"
                    : "border-error/20 opacity-75"
                }
              `}
            >
              <textarea
                id="chat-input"
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={PLACEHOLDER_EXAMPLES[placeholderIndex]}
                disabled={isLoading || !canSendMessage}
                rows={1}
                aria-label="Votre message"
                aria-describedby="char-count"
                className="
                  w-full bg-transparent text-white text-base
                  placeholder-text-muted resize-none focus:outline-none
                  disabled:opacity-50 min-h-[56px] max-h-[200px]
                  py-4 pl-4 pr-14
                "
              />

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={
                  !inputValue.trim() || isLoading || isOverLimit || !canSendMessage
                }
                className={`
                  absolute right-3 bottom-3
                  w-10 h-10 rounded-xl flex items-center justify-center
                  transition-all duration-200
                  ${
                    inputValue.trim() && !isLoading && !isOverLimit && canSendMessage
                      ? "bg-primary hover:bg-primary-hover text-white shadow-glow"
                      : "bg-dark-hover text-text-muted cursor-not-allowed"
                  }
                `}
                aria-label="Envoyer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Character count */}
            {charCount > 0 && (
              <div
                id="char-count"
                className={`
                  mt-2 text-xs text-right transition-colors
                  ${
                    isOverLimit
                      ? "text-error"
                      : isNearLimit
                      ? "text-warning"
                      : "text-text-muted"
                  }
                `}
              >
                {charCount}/{CHAR_LIMIT_MAX}
              </div>
            )}
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
