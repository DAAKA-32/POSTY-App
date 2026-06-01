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
  getMastodonConnection,
  deleteMastodonConnection,
  MastodonConnectionData,
} from "@/lib/db/firestore";
import { authFetch } from "@/lib/api/client";
import toast from "@/components/ui/Toast";

interface MastodonContextType {
  connection: MastodonConnectionData | null;
  isLoading: boolean;
  isConnected: boolean;
  profilePicture: string | null;
  profileName: string | null;
  acct: string | null;
  instance: string | null;
  /** Start the OAuth flow for a Mastodon instance; redirects the browser. */
  connectMastodon: (
    instance: string
  ) => Promise<{ success: boolean; error?: string }>;
  disconnectMastodon: () => Promise<void>;
  publishToMastodon: (
    content: string,
    visibility?: "public" | "unlisted" | "private" | "direct"
  ) => Promise<{ success: boolean; postUrl?: string; error?: string }>;
  refreshConnection: () => Promise<void>;
}

const MastodonContext = createContext<MastodonContextType | undefined>(
  undefined
);

export function MastodonProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<MastodonConnectionData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const loadConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const conn = await readWithAuthRetry(() => getMastodonConnection(user.uid));
      setConnection(conn);
    } catch (error) {
      console.error("Error loading Mastodon connection:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // Handle OAuth return params (?mastodon_success=true / ?mastodon_error=...)
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const params = new URLSearchParams(window.location.search);
    const success = params.get("mastodon_success");
    const error = params.get("mastodon_error");

    if (success === "true") {
      toast.success("Mastodon connecté");
      loadConnection();
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (error) {
      const messages: Record<string, string> = {
        missing_code: "La connexion Mastodon a été interrompue.",
        invalid_state: "Requête Mastodon invalide.",
        app_not_registered: "L'application Posty n'est pas enregistrée sur cette instance.",
        service_unavailable: "Service temporairement indisponible.",
        unexpected: "Erreur inattendue lors de la connexion Mastodon.",
      };
      toast.error(messages[error] || "La connexion Mastodon n'a pas abouti.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user, loadConnection]);

  const connectMastodon = useCallback(
    async (instance: string) => {
      if (!user) return { success: false, error: "Not logged in" };
      try {
        const res = await authFetch("/api/auth/mastodon/start", {
          method: "POST",
          body: JSON.stringify({ instance }),
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.authUrl) {
          return {
            success: false,
            error: data.error || "Impossible de démarrer l'OAuth Mastodon",
          };
        }
        // Redirect the browser to the user's instance for authorization. The
        // callback route will redirect back to /settings?mastodon_success=true.
        if (typeof window !== "undefined") {
          window.location.href = data.authUrl;
        }
        return { success: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Connection failed";
        return { success: false, error: message };
      }
    },
    [user]
  );

  const disconnectMastodon = useCallback(async () => {
    if (!user) return;
    try {
      await deleteMastodonConnection(user.uid);
      setConnection(null);
      toast.success("Mastodon déconnecté");
    } catch (error) {
      console.error("Error disconnecting Mastodon:", error);
      toast.error("Échec de la déconnexion");
    }
  }, [user]);

  const publishToMastodon = useCallback(
    async (
      content: string,
      visibility?: "public" | "unlisted" | "private" | "direct"
    ) => {
      if (!user || !connection) {
        return { success: false, error: "Not connected to Mastodon" };
      }
      try {
        const res = await authFetch("/api/mastodon/publish", {
          method: "POST",
          body: JSON.stringify({ content, visibility }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || "Publish failed" };
        }
        return { success: true, postUrl: data.postUrl };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Publish failed";
        return { success: false, error: message };
      }
    },
    [user, connection]
  );

  const value: MastodonContextType = {
    connection,
    isLoading,
    isConnected: !!connection,
    profilePicture: connection?.profilePicture || null,
    profileName: connection?.profileName || null,
    acct: connection?.acct || null,
    instance: connection?.instance || null,
    connectMastodon,
    disconnectMastodon,
    publishToMastodon,
    refreshConnection: loadConnection,
  };

  return (
    <MastodonContext.Provider value={value}>
      {children}
    </MastodonContext.Provider>
  );
}

export function useMastodon() {
  const context = useContext(MastodonContext);
  if (context === undefined) {
    throw new Error("useMastodon must be used within a MastodonProvider");
  }
  return context;
}
