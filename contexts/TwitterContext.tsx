"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getTwitterConnection,
  deleteTwitterConnection,
} from "@/lib/firestore";
import { TwitterConnectionData } from "@/types";
import {
  isTokenExpired,
  tokenNeedsRefresh,
  postToTwitter as postToTwitterApi,
  refreshTwitterToken,
  validateTweetLength,
  TWITTER_CHAR_LIMIT,
} from "@/lib/twitter";
import toast from "react-hot-toast";

interface TwitterContextType {
  connection: TwitterConnectionData | null;
  isLoading: boolean;
  isConnected: boolean;
  isTokenValid: boolean;
  // Profile shortcuts
  profilePicture: string | null;
  profileName: string | null;
  username: string | null;
  // Character limit
  charLimit: number;
  validateContent: (content: string) => {
    isValid: boolean;
    remaining: number;
    percentage: number;
    length: number;
  };
  // Actions
  connectTwitter: () => void;
  disconnectTwitter: () => Promise<void>;
  publishToTwitter: (content: string, postId?: string) => Promise<{
    success: boolean;
    tweetUrl?: string;
    error?: string;
  }>;
  refreshConnection: () => Promise<void>;
}

const TwitterContext = createContext<TwitterContextType | undefined>(undefined);

export function TwitterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<TwitterConnectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load connection from Firestore
  const loadConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const conn = await getTwitterConnection(user.uid);
      setConnection(conn);

      // Check if token needs refresh (proactive refresh)
      if (conn && conn.expiresAt && tokenNeedsRefresh(conn.expiresAt.toDate())) {
        console.log("Twitter token needs refresh, attempting refresh...");
        const refreshResult = await refreshTwitterToken(user.uid);
        if (refreshResult.success) {
          // Reload connection with new token
          const updatedConn = await getTwitterConnection(user.uid);
          setConnection(updatedConn);
        }
      }
    } catch (error) {
      console.error("Error loading Twitter connection:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load connection on mount and when user changes
  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // Handle OAuth callback success/error from URL params
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;

    const params = new URLSearchParams(window.location.search);
    const twitterSuccess = params.get("twitter_success");
    const twitterError = params.get("twitter_error");

    if (twitterSuccess === "true") {
      // Custom success toast with Twitter/X branding
      toast.success(
        () => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">X (Twitter) connecte !</p>
              <p className="text-xs text-text-secondary">Vous pouvez maintenant publier vos tweets</p>
            </div>
          </div>
        ),
        {
          duration: 4000,
          style: {
            background: '#1a1a2e',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '12px 16px',
            borderRadius: '12px',
          },
        }
      );
      loadConnection();
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (twitterError) {
      const errorMessages: { [key: string]: string } = {
        missing_code: "Code d'autorisation manquant",
        missing_state: "Etat manquant",
        invalid_state: "Etat invalide",
        missing_verifier: "Code verifier manquant",
        token_exchange_failed: "Echec de l'echange du token",
        profile_fetch_failed: "Echec de la recuperation du profil",
        service_unavailable: "Service temporairement indisponible",
        unexpected_error: "Erreur inattendue",
      };

      toast.error(
        () => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Connexion X echouee</p>
              <p className="text-xs text-text-secondary">{errorMessages[twitterError] || decodeURIComponent(twitterError)}</p>
            </div>
          </div>
        ),
        {
          duration: 5000,
          style: {
            background: '#1a1a2e',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '12px 16px',
            borderRadius: '12px',
          },
        }
      );
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user, loadConnection]);

  // Check if token is valid
  const isTokenValid = connection && connection.expiresAt
    ? !isTokenExpired(connection.expiresAt.toDate())
    : false;

  // Connect Twitter (redirect to OAuth via API route)
  const connectTwitter = useCallback(() => {
    if (!user) {
      toast.error("Vous devez etre connecte pour lier votre compte X");
      return;
    }

    // Redirect to our API route that handles PKCE and sets cookies
    window.location.href = `/api/auth/twitter/connect?userId=${user.uid}`;
  }, [user]);

  // Disconnect Twitter
  const disconnectTwitter = useCallback(async () => {
    if (!user) return;

    try {
      await deleteTwitterConnection(user.uid);
      setConnection(null);
      toast.success(
        () => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">X (Twitter) deconnecte</p>
              <p className="text-xs text-text-secondary">Votre compte a ete dissocie</p>
            </div>
          </div>
        ),
        {
          duration: 3000,
          style: {
            background: '#1a1a2e',
            border: '1px solid rgba(0, 212, 170, 0.3)',
            padding: '12px 16px',
            borderRadius: '12px',
          },
        }
      );
    } catch (error) {
      console.error("Error disconnecting Twitter:", error);
      toast.error("Impossible de deconnecter X (Twitter)");
    }
  }, [user]);

  // Publish to Twitter
  const publishToTwitter = useCallback(
    async (content: string, postId?: string): Promise<{ success: boolean; tweetUrl?: string; error?: string }> => {
      if (!user || !connection) {
        return { success: false, error: "Non connecte a X (Twitter)" };
      }

      if (!isTokenValid) {
        // Try to refresh token
        const refreshResult = await refreshTwitterToken(user.uid);
        if (!refreshResult.success) {
          return { success: false, error: "Session X expiree. Veuillez vous reconnecter." };
        }
      }

      // Validate content length
      const validation = validateTweetLength(content);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Tweet trop long (${validation.length}/${TWITTER_CHAR_LIMIT} caracteres)`,
        };
      }

      try {
        const result = await postToTwitterApi(user.uid, content, postId);
        return {
          success: result.success,
          tweetUrl: result.tweetUrl,
          error: result.error,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur de publication";
        return { success: false, error: errorMessage };
      }
    },
    [user, connection, isTokenValid]
  );

  // Profile data shortcuts
  const profilePicture = isTokenValid && connection?.profilePicture ? connection.profilePicture : null;
  const profileName = isTokenValid && connection?.profileName ? connection.profileName : null;
  const username = isTokenValid && connection?.username ? connection.username : null;

  const value: TwitterContextType = {
    connection,
    isLoading,
    isConnected: !!connection,
    isTokenValid,
    profilePicture,
    profileName,
    username,
    charLimit: TWITTER_CHAR_LIMIT,
    validateContent: validateTweetLength,
    connectTwitter,
    disconnectTwitter,
    publishToTwitter,
    refreshConnection: loadConnection,
  };

  return (
    <TwitterContext.Provider value={value}>
      {children}
    </TwitterContext.Provider>
  );
}

export function useTwitter() {
  const context = useContext(TwitterContext);
  if (context === undefined) {
    throw new Error("useTwitter must be used within a TwitterProvider");
  }
  return context;
}
