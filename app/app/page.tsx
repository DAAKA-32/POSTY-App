"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useChat } from "@/hooks/useChat";
import { getUserPosts } from "@/lib/firestore";
import { Post } from "@/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import ResponseCard from "@/components/chat/ResponseCard";
import PublishToLinkedInModal from "@/components/linkedin/PublishToLinkedInModal";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { AnimatedStaggerContainer, AnimatedStaggerItem, AnimatedScaleFade } from "@/components/animations/AnimatedPageWrapper";
import toast from "react-hot-toast";

function AppContent() {
  const { user, userProfile } = useAuth();
  const { connection: linkedInConnection, publishToLinkedIn } = useLinkedIn();
  const [posts, setPosts] = useState<Post[]>([]);
  const [showAnotherModal, setShowAnotherModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishContent, setPublishContent] = useState("");
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    responses,
    isLoading,
    error,
    generate,
    reset,
    lastPrompt,
  } = useChat({
    userId: user?.uid,
    isGuest: false,
  });

  // Fetch user posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (user) {
        const userPosts = await getUserPosts(user.uid, 10);
        setPosts(userPosts);
      }
    };
    fetchPosts();
  }, [user, responses]);

  // Scroll to bottom when responses change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [responses]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleGenerate = async (prompt: string) => {
    await generate(prompt);
    setTimeout(() => setShowAnotherModal(true), 500);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;
    const prompt = inputValue.trim();
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await handleGenerate(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleNewPost = () => {
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

  const handleConfirmPublish = async () => {
    return await publishToLinkedIn(publishContent);
  };

  return (
    <MainLayout posts={posts} showMobileHeader={true}>
      <div className="flex flex-col h-full bg-background">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 lg:py-12">
            {/* Welcome message when no responses */}
            {responses.length === 0 && (
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

            {/* Results */}
            {responses.length > 0 && (
              <div className="mb-8 animate-fade-in-up">
                {/* User prompt */}
                <div className="mb-6 p-4 bg-dark-card border border-dark-border rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold text-sm">
                        {userProfile?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted mb-1">Votre demande</p>
                      <p className="text-white text-sm lg:text-base">{lastPrompt}</p>
                    </div>
                  </div>
                </div>

                {/* Response cards */}
                <AnimatedStaggerContainer staggerDelay={0.12} className="grid gap-4 lg:grid-cols-2">
                  {responses.map((response, index) => (
                    <AnimatedStaggerItem key={index}>
                      <ResponseCard
                        title={response.title}
                        content={response.content}
                        type={response.type}
                        onCopy={() => handleCopy(response.content)}
                        showLinkedInButton={true}
                        onPublishToLinkedIn={() => handlePublishToLinkedIn(response.content)}
                      />
                    </AnimatedStaggerItem>
                  ))}
                </AnimatedStaggerContainer>

                {/* Generate another button */}
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleNewPost}
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
                    Nouveau post
                  </button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {isLoading && responses.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">T</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-xl animate-pulse-soft" />
                </div>
                <p className="text-text-secondary text-sm">Generation en cours...</p>
                <div className="flex gap-1 mt-3">
                  <span className="w-2 h-2 bg-primary rounded-full typing-dot" />
                  <span className="w-2 h-2 bg-primary rounded-full typing-dot" />
                  <span className="w-2 h-2 bg-primary rounded-full typing-dot" />
                </div>
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

        {/* Input area - fixed at bottom like ChatGPT */}
        <div className="flex-shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-safe">
          <div className="max-w-3xl mx-auto px-4 pb-4">
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
            <p className="text-center text-2xs text-text-muted mt-3">
              POSTY peut faire des erreurs. Verifiez les informations importantes.
            </p>
          </div>
        </div>
      </div>

      {/* Want another modal */}
      <Modal
        isOpen={showAnotherModal}
        onClose={() => setShowAnotherModal(false)}
        title="Voulez-vous un autre post ?"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-text-secondary mb-6 text-sm">
            Souhaitez-vous generer une autre version de ce post ?
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setShowAnotherModal(false)}>
              Non, merci
            </Button>
            <Button
              fullWidth
              onClick={() => {
                setShowAnotherModal(false);
                handleNewPost();
              }}
            >
              Oui, generer
            </Button>
          </div>
        </div>
      </Modal>

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
