"use client";

/**
 * Threads-via-Zernio context. Distinct from ThreadsContext (native Meta,
 * Business-only) — this one routes through the Zernio aggregator (Posty
 * platform key "threadsz") so Threads can be offered on the Max plan without
 * Meta app review. Mirrors RedditContext (the Zernio template), minus the
 * subreddit/title fields (Threads is a plain status post).
 */

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
  getThreadszConnection,
  deleteThreadszConnection,
  ThreadszConnectionData,
} from "@/lib/db/firestore";
import { authFetch } from "@/lib/api/client";
import toast from "@/components/ui/Toast";

interface ThreadszContextType {
  connection: ThreadszConnectionData | null;
  isLoading: boolean;
  isConnected: boolean;
  username: string | null;
  profilePicture: string | null;
  connectThreadsz: () => Promise<void>;
  disconnectThreadsz: () => Promise<void>;
  publishToThreadsz: (params: { content: string }) => Promise<{
    success: boolean;
    postUrl?: string;
    error?: string;
  }>;
  refreshConnection: () => Promise<void>;
}

const ThreadszContext = createContext<ThreadszContextType | undefined>(undefined);

export function ThreadszProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<ThreadszConnectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const conn = await readWithAuthRetry(() => getThreadszConnection(user.uid));
      setConnection(conn);
    } catch (error) {
      console.error("Error loading Threads (Zernio) connection:", error);
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
    if (platform !== "threadsz") return;

    const success = params.get("zernio_success");
    const error = params.get("zernio_error");

    if (success === "true") {
      toast.success("Threads connecté");
      loadConnection();
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
      return;
    }
    if (error) {
      const messages: Record<string, string> = {
        missing_state: "La connexion Threads a été interrompue.",
        invalid_state: "Requête Threads invalide.",
        account_not_found_after_oauth: "Threads n'a pas validé la connexion. Réessaie.",
        service_unavailable: "Service temporairement indisponible.",
        unexpected: "Erreur inattendue lors de la connexion Threads.",
        access_denied: "Tu as refusé l'accès à Threads.",
      };
      toast.error(messages[error] || "La connexion Threads n'a pas abouti.");
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, [user, loadConnection]);

  const connectThreadsz = useCallback(async () => {
    if (!user) {
      toast.error("Connecte-toi d'abord à Posty");
      return;
    }
    try {
      const res = await authFetch("/api/auth/zernio/threadsz/start", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.status === 409 && data.alreadyConnected) {
        toast.error("Un compte Threads est déjà connecté. Déconnecte-le d'abord.");
        return;
      }
      if (!res.ok || !data.authUrl) {
        toast.error(data.error || "Threads OAuth indisponible");
        return;
      }
      window.location.href = data.authUrl;
    } catch {
      toast.error("Échec de la connexion Threads");
    }
  }, [user]);

  const disconnectThreadsz = useCallback(async () => {
    if (!user) return;
    try {
      await deleteThreadszConnection(user.uid);
      setConnection(null);
      toast.success("Threads déconnecté");
    } catch (error) {
      console.error("Error disconnecting Threads (Zernio):", error);
      toast.error("Échec de la déconnexion");
    }
  }, [user]);

  const publishToThreadsz = useCallback(
    async ({ content }: { content: string }) => {
      if (!user || !connection) {
        return { success: false, error: "No Threads connection" };
      }
      try {
        const res = await authFetch("/api/threadsz/publish", {
          method: "POST",
          body: JSON.stringify({ content }),
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

  const value: ThreadszContextType = {
    connection,
    isLoading,
    isConnected: !!connection,
    username: connection?.username || null,
    profilePicture: connection?.profilePicture || null,
    connectThreadsz,
    disconnectThreadsz,
    publishToThreadsz,
    refreshConnection: loadConnection,
  };

  return (
    <ThreadszContext.Provider value={value}>{children}</ThreadszContext.Provider>
  );
}

export function useThreadsz() {
  const context = useContext(ThreadszContext);
  if (context === undefined) {
    throw new Error("useThreadsz must be used within a ThreadszProvider");
  }
  return context;
}
