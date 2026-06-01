"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { readWithAuthRetry } from "@/lib/db/with-auth-retry";
import {
  getRedditConnection,
  deleteRedditConnection,
  RedditConnectionData,
} from "@/lib/db/firestore";
import { authFetch } from "@/lib/api/client";
import toast from "@/components/ui/Toast";

interface RedditContextType {
  connection: RedditConnectionData | null;
  isLoading: boolean;
  isConnected: boolean;
  username: string | null;
  profilePicture: string | null;
  connectReddit: () => Promise<void>;
  disconnectReddit: () => Promise<void>;
  /**
   * Publish a Reddit post. The user picks the target subreddit + title at
   * publish time — Reddit posts are subreddit-scoped, there is no global
   * "feed" target.
   */
  publishToReddit: (params: {
    content: string;
    title: string;
    subreddit: string;
  }) => Promise<{
    success: boolean;
    postUrl?: string;
    error?: string;
  }>;
  refreshConnection: () => Promise<void>;
}

const RedditContext = createContext<RedditContextType | undefined>(undefined);

export function RedditProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<RedditConnectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const conn = await readWithAuthRetry(() => getRedditConnection(user.uid));
      setConnection(conn);
    } catch (error) {
      console.error("Error loading Reddit connection:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const params = new URLSearchParams(window.location.search);
    const platform = params.get("zernio_platform");
    if (platform !== "reddit") return;

    const success = params.get("zernio_success");
    const error = params.get("zernio_error");

    if (success === "true") {
      toast.success("Reddit connecté");
      loadConnection();
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
      return;
    }
    if (error) {
      const messages: Record<string, string> = {
        missing_state: "La connexion Reddit a été interrompue.",
        invalid_state: "Requête Reddit invalide.",
        account_not_found_after_oauth: "Reddit n'a pas validé la connexion. Réessaie.",
        service_unavailable: "Service temporairement indisponible.",
        unexpected: "Erreur inattendue lors de la connexion Reddit.",
        access_denied: "Tu as refusé l'accès à Reddit.",
      };
      toast.error(messages[error] || "La connexion Reddit n'a pas abouti.");
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, [user, loadConnection]);

  const connectReddit = useCallback(async () => {
    if (!user) {
      toast.error("Connecte-toi d'abord à Posty");
      return;
    }
    try {
      const res = await authFetch("/api/auth/zernio/reddit/start", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.status === 409 && data.alreadyConnected) {
        toast.error("Un compte Reddit est déjà connecté. Déconnecte-le d'abord.");
        return;
      }
      if (!res.ok || !data.authUrl) {
        toast.error(data.error || "Reddit OAuth indisponible");
        return;
      }
      window.location.href = data.authUrl;
    } catch {
      toast.error("Échec de la connexion Reddit");
    }
  }, [user]);

  const disconnectReddit = useCallback(async () => {
    if (!user) return;
    try {
      await deleteRedditConnection(user.uid);
      setConnection(null);
      toast.success("Reddit déconnecté");
    } catch (error) {
      console.error("Error disconnecting Reddit:", error);
      toast.error("Échec de la déconnexion");
    }
  }, [user]);

  const publishToReddit = useCallback(
    async ({
      content,
      title,
      subreddit,
    }: {
      content: string;
      title: string;
      subreddit: string;
    }) => {
      if (!user || !connection) {
        return { success: false, error: "No Reddit connection" };
      }
      try {
        const res = await authFetch("/api/reddit/publish", {
          method: "POST",
          body: JSON.stringify({ content, title, subreddit }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || "Publish failed" };
        }
        return { success: true, postUrl: data.postUrl };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Publish failed";
        return { success: false, error: message };
      }
    },
    [user, connection],
  );

  const value: RedditContextType = {
    connection,
    isLoading,
    isConnected: !!connection,
    username: connection?.username || null,
    profilePicture: connection?.profilePicture || null,
    connectReddit,
    disconnectReddit,
    publishToReddit,
    refreshConnection: loadConnection,
  };

  return (
    <RedditContext.Provider value={value}>{children}</RedditContext.Provider>
  );
}

export function useReddit() {
  const context = useContext(RedditContext);
  if (context === undefined) {
    throw new Error("useReddit must be used within a RedditProvider");
  }
  return context;
}
