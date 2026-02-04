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
  getThreadsConnection,
  deleteThreadsConnection,
} from "@/lib/firestore";
import { ThreadsConnectionData } from "@/types";
import {
  isMetaTokenExpired,
  getThreadsAuthUrl,
  postToThreads as postToThreadsApi,
} from "@/lib/meta";
import toast from "@/components/ui/Toast";

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
      toast.success("Threads connecté");
      loadConnection();
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (threadsError) {
      const errorMessages: { [key: string]: string } = {
        missing_code: "Code d'autorisation manquant",
        missing_state: "État manquant",
        invalid_state: "État invalide",
        token_exchange_failed: "Échec de l'échange du token",
        profile_fetch_failed: "Échec de la récupération du profil",
        service_unavailable: "Service temporairement indisponible",
        unexpected_error: "Erreur inattendue",
      };

      const errorMessage = errorMessages[threadsError] || decodeURIComponent(threadsError);
      toast.error(errorMessage);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user, loadConnection]);

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
