"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getThreadsConnection,
  deleteThreadsConnection,
} from "@/lib/firestore";
import { ThreadsConnectionData } from "@/types";
import {
  isMetaTokenExpired,
  getThreadsAuthUrl,
  postToThreads as postToThreadsApi,
} from "@/lib/meta";
import { getAuthHeaders } from "@/lib/api-client";
import toast from "@/components/ui/Toast";

// Refresh when token has less than 7 days remaining
const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

interface ThreadsContextType {
  connection: ThreadsConnectionData | null;
  isLoading: boolean;
  isConnected: boolean;
  isTokenValid: boolean;
  // Profile shortcuts
  profilePicture: string | null;
  profileName: string | null;
  username: string | null;
  // Actions
  connectThreads: () => void;
  disconnectThreads: () => Promise<void>;
  publishToThreads: (content: string, postId?: string) => Promise<{
    success: boolean;
    permalink?: string;
    error?: string;
  }>;
  refreshConnection: () => Promise<void>;
}

const ThreadsContext = createContext<ThreadsContextType | undefined>(undefined);

export function ThreadsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<ThreadsConnectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshAttempted = useRef(false);

  // Load connection from Firestore
  const loadConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const conn = await getThreadsConnection(user.uid);
      setConnection(conn);
    } catch (error) {
      console.error("Error loading Threads connection:", error);
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
    const threadsSuccess = params.get("threads_success");
    const threadsError = params.get("threads_error");

    if (threadsSuccess === "true") {
      toast.success("Compte Threads connecté avec succès", { duration: 4000 });
      loadConnection();
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (threadsError) {
      const errorMessages: { [key: string]: string } = {
        missing_code: "Code d'autorisation manquant",
        missing_state: "État de la requête manquant",
        invalid_state: "État de la requête invalide",
        token_exchange_failed: "Échec de la connexion Threads",
        profile_fetch_failed: "Impossible de récupérer le profil Threads",
        service_unavailable: "Service temporairement indisponible",
        unexpected_error: "Une erreur inattendue est survenue",
      };

      const errorMessage = errorMessages[threadsError] || "Échec de la connexion Threads";
      toast.error(errorMessage, { duration: 5000 });
      console.error("Threads OAuth error:", threadsError);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user, loadConnection]);

  // Auto-refresh token if it expires within 7 days (once per session)
  useEffect(() => {
    if (!user || !connection?.expiresAt || refreshAttempted.current) return;

    const expiresAt = connection.expiresAt.toDate();
    const remaining = expiresAt.getTime() - Date.now();

    // Token already expired or not close to expiring → skip
    if (remaining <= 0 || remaining > REFRESH_THRESHOLD_MS) return;

    refreshAttempted.current = true;

    (async () => {
      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch("/api/threads/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ userId: user.uid }),
        });

        const result = await response.json();

        if (result.success) {
          console.log("Threads: Token auto-refreshed successfully");
          await loadConnection();
        } else if (result.reconnectRequired) {
          console.warn("Threads: Token refresh failed, reconnection required");
        }
      } catch (error) {
        console.error("Threads: Auto-refresh error:", error);
      }
    })();
  }, [user, connection, loadConnection]);

  // Check if token is valid
  const isTokenValid = connection && connection.expiresAt
    ? !isMetaTokenExpired(connection.expiresAt.toDate())
    : false;

  // Connect Threads (redirect to OAuth)
  const connectThreads = useCallback(() => {
    if (!user) {
      toast.error("Vous devez être connecté pour lier votre compte Threads");
      return;
    }

    window.location.href = getThreadsAuthUrl(user.uid);
  }, [user]);

  // Disconnect Threads
  const disconnectThreads = useCallback(async () => {
    if (!user) return;

    try {
      await deleteThreadsConnection(user.uid);
      setConnection(null);
      toast.success("Threads déconnecté");
    } catch (error) {
      console.error("Error disconnecting Threads:", error);
      toast.error("Impossible de déconnecter Threads");
    }
  }, [user]);

  // Publish to Threads
  const publishToThreads = useCallback(
    async (content: string, postId?: string): Promise<{ success: boolean; permalink?: string; error?: string }> => {
      if (!user || !connection) {
        return { success: false, error: "Non connecté à Threads" };
      }

      if (!isTokenValid) {
        return { success: false, error: "Session Threads expirée. Veuillez vous reconnecter." };
      }

      try {
        const result = await postToThreadsApi(user.uid, content, postId);
        return {
          success: result.success,
          permalink: result.permalink,
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

  const value: ThreadsContextType = {
    connection,
    isLoading,
    isConnected: !!connection,
    isTokenValid,
    profilePicture,
    profileName,
    username,
    connectThreads,
    disconnectThreads,
    publishToThreads,
    refreshConnection: loadConnection,
  };

  return (
    <ThreadsContext.Provider value={value}>
      {children}
    </ThreadsContext.Provider>
  );
}

export function useThreads() {
  const context = useContext(ThreadsContext);
  if (context === undefined) {
    throw new Error("useThreads must be used within a ThreadsProvider");
  }
  return context;
}
