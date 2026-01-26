"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useChat } from "@/hooks/useChat";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ChatBubble from "@/components/chat/ChatBubble";
import AIResponsePair from "@/components/chat/AIResponsePair";
import toast from "@/components/ui/Toast";
import { useBrowserMode, setBrowserModeCSSVars } from "@/hooks/useBrowserMode";
import UniversalChatInput from "@/components/chat/UniversalChatInput";

const GUEST_LIMIT = 2;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "storytelling" | "business";
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    responses,
    isLoading,
    generationCount,
    canGenerate,
    generate,
    reset,
    lastPrompt,
  } = useChat({
    isGuest: !user,
  });

  // Detect browser mode vs PWA for input positioning
  const browserMode = useBrowserMode();

  // Set CSS variables for browser mode adjustments
  useEffect(() => {
    setBrowserModeCSSVars(browserMode);
  }, [browserMode]);

  // Redirect authenticated users to /app
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/app");
    }
  }, [user, authLoading, router]);

  // Show signup prompt after 2 messages (1 complete exchange)
  useEffect(() => {
    if (generationCount === 1 && responses.length > 0 && !showSignupPrompt) {
      const timer = setTimeout(() => setShowSignupPrompt(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [generationCount, responses.length, showSignupPrompt]);

  // When responses are received, add them to messages
  useEffect(() => {
    if (responses.length > 0 && lastPrompt) {
      setMessages(prevMessages => {
        const hasUserMsg = prevMessages.some(m => m.content === lastPrompt && m.role === "user");

        if (!hasUserMsg) {
          const userMsgId = `user-${Date.now()}`;
          const newMessages: Message[] = [
            ...prevMessages,
            { id: userMsgId, role: "user", content: lastPrompt },
          ];

          responses.forEach((response, index) => {
            newMessages.push({
              id: `ai-${Date.now()}-${index}`,
              role: "assistant",
              content: response.content,
              type: response.type as "storytelling" | "business",
            });
          });

          return newMessages;
        }
        return prevMessages;
      });
    }
  }, [responses, lastPrompt]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;

    if (!canGenerate) {
      setShowLimitModal(true);
      return;
    }

    const prompt = inputValue.trim();
    setInputValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await generate(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(t.chat.copied);
    } catch {
      toast.error(t.chat.copyError);
    }
  };

  const handleNewChat = () => {
    if (!canGenerate) {
      setShowLimitModal(true);
      return;
    }
    setMessages([]);
    reset();
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-xl animate-pulse-soft" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden app-layout">
      {/* Header */}
      <header className="flex-shrink-0 bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl border-b border-gray-200 dark:border-dark-border z-40 pwa-fixed-header">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-glow transition-transform group-hover:scale-105">
              <img
                src="/logo.jpg"
                alt="Posty Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white text-lg tracking-tight">POSTY</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-dark-elevated rounded-full border border-gray-200 dark:border-dark-border">
              <div className={`w-2 h-2 rounded-full ${canGenerate ? "bg-accent" : "bg-warning"}`} />
              <span className="text-xs text-text-secondary">
                {GUEST_LIMIT - generationCount} {GUEST_LIMIT - generationCount !== 1 ? t.guest.trialsRemaining : t.guest.trialRemaining}
              </span>
            </div>
            <Link href="/login">
              <Button variant="primary" size="sm">
                {t.common.login}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Messages area - with padding for content to scroll behind fixed input */}
      <main className={`flex-1 gpu-scroll app-scroll-container app-content-wrapper ${messages.length === 0 ? 'overflow-hidden lg:overflow-y-auto scroll-disabled' : 'overflow-y-auto'}`}>
        <div
          className={`max-w-2xl mx-auto px-4 pt-6 space-y-4 content-with-fixed-input ${browserMode.isMobileBrowser ? 'mobile-browser-mode' : ''}`}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              {/* Animated logo */}
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-glow animate-float">
                  <span className="text-white font-bold text-2xl">T</span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-xl -z-10" />
              </div>

              <h2 className="text-xl lg:text-2xl font-bold text-text-primary mb-3">
                {t.chat.describeIdea}
              </h2>
              <p className="text-text-secondary text-sm lg:text-base max-w-sm mb-6">
                {t.chat.twoVersionsDesc}
              </p>

              {/* Quick suggestions */}
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {[
                  t.chat.suggestionMotivating,
                  t.chat.suggestionLesson,
                  t.chat.suggestionNews,
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputValue(suggestion)}
                    className="
                      px-4 py-2 text-sm
                      bg-gray-100 dark:bg-dark-elevated hover:bg-gray-200 dark:hover:bg-dark-hover
                      border border-gray-200 dark:border-dark-border hover:border-primary/30
                      text-text-secondary hover:text-text-primary
                      rounded-xl transition-all duration-200
                      haptic-feedback
                    "
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {(() => {
                // Group messages: user messages standalone, AI responses paired
                const elements: React.ReactNode[] = [];
                let i = 0;
                let pairIndex = 0;

                while (i < messages.length) {
                  const message = messages[i];

                  if (message.role === "user") {
                    // Render user message with ChatBubble
                    elements.push(
                      <div key={message.id} className="animate-fade-in-up">
                        <ChatBubble role={message.role}>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </ChatBubble>
                      </div>
                    );
                    i++;
                  } else if (message.role === "assistant") {
                    // Check if next message is also assistant (paired response)
                    const nextMessage = messages[i + 1];

                    if (nextMessage && nextMessage.role === "assistant") {
                      // Find storytelling and business in the pair
                      const storytelling = message.type === "storytelling" ? message : nextMessage;
                      const business = message.type === "business" ? message : nextMessage;

                      // Render paired responses with AIResponsePair
                      elements.push(
                        <div key={`pair-${message.id}`} className="animate-fade-in-up">
                          <AIResponsePair
                            storytellingResponse={{
                              id: storytelling.id,
                              content: storytelling.content,
                              variant: "storytelling",
                            }}
                            businessResponse={{
                              id: business.id,
                              content: business.content,
                              variant: "business",
                            }}
                            onCopy={handleCopy}
                            index={pairIndex}
                          />
                        </div>
                      );
                      pairIndex++;
                      i += 2; // Skip both messages
                    } else {
                      // Single AI message (shouldn't happen normally)
                      elements.push(
                        <div key={message.id} className="animate-fade-in-up">
                          <ChatBubble role={message.role}>
                            {message.type && (
                              <div className="mb-2">
                                <span
                                  className={`
                                    inline-block px-2.5 py-1 text-xs font-medium rounded-lg
                                    ${message.type === "storytelling"
                                      ? "bg-purple-500/20 text-purple-400"
                                      : "bg-primary/20 text-primary"
                                    }
                                  `}
                                >
                                  {message.type === "storytelling" ? "Storytelling" : "Business"}
                                </span>
                              </div>
                            )}
                            <div className="whitespace-pre-wrap">{message.content}</div>
                            <button
                              onClick={() => handleCopy(message.content)}
                              className="
                                mt-3 flex items-center gap-1.5 px-3 py-1.5
                                text-xs text-text-muted hover:text-text-primary
                                bg-gray-100/50 dark:bg-dark-hover/50 hover:bg-gray-200 dark:hover:bg-dark-hover
                                rounded-lg transition-all duration-200
                              "
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              {t.chat.copy}
                            </button>
                          </ChatBubble>
                        </div>
                      );
                      i++;
                    }
                  } else {
                    i++;
                  }
                }

                return elements;
              })()}

              {/* Loading indicator */}
              {isLoading && (
                <div className="animate-fade-in">
                  <ChatBubble role="assistant" isTyping />
                </div>
              )}

              {/* New chat button after responses */}
              {messages.length > 0 && !isLoading && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={handleNewChat}
                    className="
                      flex items-center gap-2 px-5 py-2.5
                      bg-gray-100 dark:bg-dark-elevated hover:bg-gray-200 dark:hover:bg-dark-hover
                      border border-gray-200 dark:border-dark-border hover:border-primary/30
                      text-text-primary text-sm font-medium rounded-xl
                      transition-all duration-200 haptic-feedback
                    "
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t.chat.newPost}
                  </button>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area - Always fixed at bottom on all devices */}
      <div
        className={`
          fixed-input-area
          ${browserMode.isMobileBrowser ? 'mobile-browser-mode' : ''}
        `}
      >
        <div className="max-w-2xl mx-auto px-4 py-1 lg:py-2">
          {/* UniversalChatInput - Unified premium input component */}
          <UniversalChatInput
            onSubmit={async (message) => {
              if (!canGenerate) {
                setShowLimitModal(true);
                return;
              }
              await generate(message);
            }}
            placeholder={t.chat.placeholderLinkedin}
            disabled={!canGenerate}
            isLoading={isLoading}
            enableVoiceRecording={false}
            showHelperText={true}
            maxHeight={120}
            minHeight={56}
            isMobile={browserMode.isMobileBrowser}
            browserMode={browserMode}
            context="guest"
            trialLimitReached={!canGenerate}
          />

          {/* Mobile trial counter */}
          <div className="sm:hidden flex justify-center mt-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/50 dark:bg-dark-elevated/50 rounded-full">
              <div className={`w-2 h-2 rounded-full ${canGenerate ? "bg-accent" : "bg-warning"}`} />
              <span className="text-xs text-text-muted">
                {GUEST_LIMIT - generationCount} {GUEST_LIMIT - generationCount !== 1 ? t.guest.trialsRemaining : t.guest.trialRemaining}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Signup prompt popup after first generation */}
      <Modal
        isOpen={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        showCloseButton={false}
      >
        <div className="text-center">
          <div className="relative mb-5">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-glow">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">
            {t.guest.likePosty}
          </h3>
          <p className="text-text-secondary mb-6 text-sm">
            {t.guest.saveAndPublish}
          </p>
          <div className="space-y-3">
            <Link href="/signup" className="block">
              <Button fullWidth>
                {t.guest.createMyAccount}
              </Button>
            </Link>
            <button
              onClick={() => setShowSignupPrompt(false)}
              className="w-full py-2.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              {t.guest.continueLater}
            </button>
          </div>
        </div>
      </Modal>

      {/* Limit reached modal */}
      <Modal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title={t.guest.limitReached}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            {t.guest.usedTrials.replace("{count}", String(GUEST_LIMIT))}
          </h3>
          <p className="text-text-secondary mb-6 text-sm">
            {t.guest.createFreeAccount}
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/signup" className="block">
              <Button fullWidth>{t.guest.createFreeAccountBtn}</Button>
            </Link>
            <Link href="/login" className="block">
              <Button variant="secondary" fullWidth>
                {t.guest.alreadyHaveAccount}
              </Button>
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
}
