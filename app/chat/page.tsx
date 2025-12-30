"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/hooks/useChat";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ChatBubble from "@/components/chat/ChatBubble";
import toast from "react-hot-toast";

const GUEST_LIMIT = 2;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "storytelling" | "business";
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
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
      toast.success("Copie !");
    } catch {
      toast.error("Erreur lors de la copie");
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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-dark-card/95 backdrop-blur-xl border-b border-dark-border z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-xl overflow-hidden flex items-center justify-center shadow-glow transition-transform group-hover:scale-105">
              <img
                src="/logo.png"
                alt="POSTY Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (sibling) sibling.style.display = 'flex';
                }}
              />
              <span className="text-white font-bold text-lg hidden">P</span>
            </div>
            <span className="font-semibold text-white text-lg tracking-tight">POSTY</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-dark-elevated rounded-full border border-dark-border">
              <div className={`w-2 h-2 rounded-full ${canGenerate ? "bg-accent" : "bg-warning"}`} />
              <span className="text-xs text-text-secondary">
                {GUEST_LIMIT - generationCount} essai{GUEST_LIMIT - generationCount !== 1 ? "s" : ""} restant{GUEST_LIMIT - generationCount !== 1 ? "s" : ""}
              </span>
            </div>
            <Link href="/login">
              <Button variant="primary" size="sm">
                Connexion
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              {/* Animated logo */}
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-glow animate-float">
                  <span className="text-white font-bold text-2xl">T</span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-xl -z-10" />
              </div>

              <h2 className="text-xl lg:text-2xl font-bold text-white mb-3">
                Decrivez votre idee
              </h2>
              <p className="text-text-secondary text-sm lg:text-base max-w-sm mb-6">
                POSTY genere 2 versions de votre post : Storytelling et Business
              </p>

              {/* Quick suggestions */}
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {[
                  "Un post motivant",
                  "Partager une lecon",
                  "Annoncer une news",
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
          ) : (
            <>
              {messages.map((message) => (
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
                    {message.role === "assistant" && (
                      <button
                        onClick={() => handleCopy(message.content)}
                        className="
                          mt-3 flex items-center gap-1.5 px-3 py-1.5
                          text-xs text-text-muted hover:text-white
                          bg-dark-hover/50 hover:bg-dark-hover
                          rounded-lg transition-all duration-200
                        "
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copier
                      </button>
                    )}
                  </ChatBubble>
                </div>
              ))}

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
                      bg-dark-elevated hover:bg-dark-hover
                      border border-dark-border hover:border-primary/30
                      text-white text-sm font-medium rounded-xl
                      transition-all duration-200 haptic-feedback
                    "
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nouveau post
                  </button>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area - fixed at bottom like ChatGPT */}
      <div className="flex-shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-safe">
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <div className="relative bg-dark-card border border-dark-border rounded-2xl shadow-elevated transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-glow">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Decrivez votre post LinkedIn..."
              disabled={isLoading}
              rows={1}
              className="
                w-full bg-transparent text-white text-base
                placeholder-text-muted resize-none focus:outline-none
                disabled:opacity-50 min-h-[56px] max-h-[120px]
                py-4 px-4 pr-14
              "
            />
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isLoading}
              className={`
                absolute right-3 bottom-3
                w-10 h-10 rounded-xl flex items-center justify-center
                transition-all duration-200
                ${inputValue.trim() && !isLoading
                  ? "bg-gradient-to-r from-primary to-primary-hover text-white shadow-glow hover:shadow-lg"
                  : "bg-dark-border text-text-muted"
                }
                disabled:opacity-50 active:scale-95 haptic-feedback
              `}
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>
          {/* Mobile trial counter */}
          <div className="sm:hidden flex justify-center mt-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-elevated/50 rounded-full">
              <div className={`w-2 h-2 rounded-full ${canGenerate ? "bg-accent" : "bg-warning"}`} />
              <span className="text-xs text-text-muted">
                {GUEST_LIMIT - generationCount} essai{GUEST_LIMIT - generationCount !== 1 ? "s" : ""} restant{GUEST_LIMIT - generationCount !== 1 ? "s" : ""}
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
          <h3 className="text-xl font-bold text-white mb-2">
            Tu aimes POSTY ?
          </h3>
          <p className="text-text-secondary mb-6 text-sm">
            Sauvegarde tes posts et publie-les directement sur LinkedIn
          </p>
          <div className="space-y-3">
            <Link href="/signup" className="block">
              <Button fullWidth>
                Creer mon compte
              </Button>
            </Link>
            <button
              onClick={() => setShowSignupPrompt(false)}
              className="w-full py-2.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Continuer plus tard
            </button>
          </div>
        </div>
      </Modal>

      {/* Limit reached modal */}
      <Modal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title="Limite atteinte"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Tu as utilise tes {GUEST_LIMIT} essais gratuits
          </h3>
          <p className="text-text-secondary mb-6 text-sm">
            Cree un compte gratuit pour continuer a generer des posts LinkedIn
            et acceder a ton historique.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/signup" className="block">
              <Button fullWidth>Creer un compte gratuit</Button>
            </Link>
            <Link href="/login" className="block">
              <Button variant="secondary" fullWidth>
                J&apos;ai deja un compte
              </Button>
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
}
