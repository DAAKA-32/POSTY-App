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
  getDiscordConnection,
  deleteDiscordConnection,
  DiscordConnectionData,
} from "@/lib/db/firestore";
import { authFetch } from "@/lib/api/client";
import toast from "@/components/ui/Toast";

interface DiscordContextType {
  connection: DiscordConnectionData | null;
  isLoading: boolean;
  isConnected: boolean;
  webhookName: string | null;
  profilePicture: string | null;
  /** Redirect the user to Discord's OAuth flow (webhook.incoming scope). */
  connectDiscord: () => Promise<void>;
  disconnectDiscord: () => Promise<void>;
  publishToDiscord: (content: string) => Promise<{
    success: boolean;
    postUrl?: string;
    error?: string;
  }>;
  refreshConnection: () => Promise<void>;
}

const DiscordContext = createContext<DiscordContextType | undefined>(undefined);

export function DiscordProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<DiscordConnectionData | null>(
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
      const conn = await readWithAuthRetry(() => getDiscordConnection(user.uid));
      setConnection(conn);
    } catch (error) {
      console.error("Error loading Discord connection:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // Handle OAuth return params (?discord_success=true / ?discord_error=...)
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const params = new URLSearchParams(window.location.search);
    const success = params.get("discord_success");
    const error = params.get("discord_error");

    if (success === "true") {
      toast.success("Discord connecté");
      loadConnection();
      // Clean URL
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
      return;
    }
    if (error) {
      const messages: Record<string, string> = {
        missing_user: "Vous devez être connecté à Posty avant de lier Discord.",
        not_configured: "Discord OAuth n'est pas configuré sur cette instance.",
        missing_code: "La connexion Discord a été interrompue.",
        invalid_state: "Requête Discord invalide.",
        no_webhook: "Discord n'a pas renvoyé de webhook. Ré-essayez.",
        service_unavailable: "Service temporairement indisponible.",
        unexpected: "Erreur inattendue lors de la connexion Discord.",
      };
      toast.error(messages[error] || "La connexion Discord n'a pas abouti.");
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, [user, loadConnection]);

  const connectDiscord = useCallback(async () => {
    if (!user) {
      toast.error("Veuillez vous connecter d'abord");
      return;
    }
    // POST + redirect (instead of plain <a href>) so the request can carry
    // the Firebase Bearer token. The server uses it to bind the OAuth state
    // to this verified uid before redirecting to Discord.
    try {
      const res = await authFetch("/api/auth/discord/connect", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.authUrl) {
        toast.error(data.error || "Discord OAuth indisponible");
        return;
      }
      window.location.href = data.authUrl;
    } catch {
      toast.error("Échec de la connexion Discord");
    }
  }, [user]);

  const disconnectDiscord = useCallback(async () => {
    if (!user) return;
    try {
      await deleteDiscordConnection(user.uid);
      setConnection(null);
      toast.success("Discord déconnecté");
    } catch (error) {
      console.error("Error disconnecting Discord:", error);
      toast.error("Échec de la déconnexion");
    }
  }, [user]);

  const publishToDiscord = useCallback(
    async (content: string) => {
      if (!user || !connection) {
        return { success: false, error: "No Discord webhook" };
      }
      try {
        const res = await authFetch("/api/discord/publish", {
          method: "POST",
          body: JSON.stringify({ content }),
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

  const value: DiscordContextType = {
    connection,
    isLoading,
    isConnected: !!connection,
    webhookName: connection?.webhookName || null,
    profilePicture: connection?.webhookAvatar || null,
    connectDiscord,
    disconnectDiscord,
    publishToDiscord,
    refreshConnection: loadConnection,
  };

  return (
    <DiscordContext.Provider value={value}>{children}</DiscordContext.Provider>
  );
}

export function useDiscord() {
  const context = useContext(DiscordContext);
  if (context === undefined) {
    throw new Error("useDiscord must be used within a DiscordProvider");
  }
  return context;
}
