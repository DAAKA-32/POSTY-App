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
  getInstagramConnection,
  deleteInstagramConnection,
  InstagramConnectionData,
} from "@/lib/db/firestore";
import { authFetch } from "@/lib/api/client";
import toast from "@/components/ui/Toast";

interface InstagramContextType {
  connection: InstagramConnectionData | null;
  isLoading: boolean;
  isConnected: boolean;
  username: string | null;
  profilePicture: string | null;
  connectInstagram: () => Promise<void>;
  disconnectInstagram: () => Promise<void>;
  publishToInstagram: (params: {
    content: string;
    imageUrl: string;
  }) => Promise<{
    success: boolean;
    postUrl?: string;
    error?: string;
  }>;
  refreshConnection: () => Promise<void>;
}

const InstagramContext = createContext<InstagramContextType | undefined>(
  undefined,
);

export function InstagramProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<InstagramConnectionData | null>(
    null,
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
      const conn = await readWithAuthRetry(() => getInstagramConnection(user.uid));
      setConnection(conn);
    } catch (error) {
      console.error("Error loading Instagram connection:", error);
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
    if (platform !== "instagram") return;

    const success = params.get("zernio_success");
    const error = params.get("zernio_error");

    if (success === "true") {
      toast.success("Instagram connecté");
      loadConnection();
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
      return;
    }
    if (error) {
      const messages: Record<string, string> = {
        missing_state: "La connexion Instagram a été interrompue.",
        invalid_state: "Requête Instagram invalide.",
        account_not_found_after_oauth:
          "Instagram n'a pas validé la connexion. Vérifie que tu utilises un compte Business ou Creator.",
        service_unavailable: "Service temporairement indisponible.",
        unexpected: "Erreur inattendue lors de la connexion Instagram.",
        access_denied: "Tu as refusé l'accès à Instagram.",
      };
      toast.error(
        messages[error] || "La connexion Instagram n'a pas abouti.",
      );
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, [user, loadConnection]);

  const connectInstagram = useCallback(async () => {
    if (!user) {
      toast.error("Connecte-toi d'abord à Posty");
      return;
    }
    try {
      const res = await authFetch("/api/auth/zernio/instagram/start", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.status === 409 && data.alreadyConnected) {
        toast.error(
          "Un compte Instagram est déjà connecté. Déconnecte-le d'abord.",
        );
        return;
      }
      if (!res.ok || !data.authUrl) {
        toast.error(data.error || "Instagram OAuth indisponible");
        return;
      }
      window.location.href = data.authUrl;
    } catch {
      toast.error("Échec de la connexion Instagram");
    }
  }, [user]);

  const disconnectInstagram = useCallback(async () => {
    if (!user) return;
    try {
      await deleteInstagramConnection(user.uid);
      setConnection(null);
      toast.success("Instagram déconnecté");
    } catch (error) {
      console.error("Error disconnecting Instagram:", error);
      toast.error("Échec de la déconnexion");
    }
  }, [user]);

  const publishToInstagram = useCallback(
    async ({ content, imageUrl }: { content: string; imageUrl: string }) => {
      if (!user || !connection) {
        return { success: false, error: "No Instagram connection" };
      }
      try {
        const res = await authFetch("/api/instagram/publish", {
          method: "POST",
          body: JSON.stringify({ content, imageUrl }),
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

  const value: InstagramContextType = {
    connection,
    isLoading,
    isConnected: !!connection,
    username: connection?.username || null,
    profilePicture: connection?.profilePicture || null,
    connectInstagram,
    disconnectInstagram,
    publishToInstagram,
    refreshConnection: loadConnection,
  };

  return (
    <InstagramContext.Provider value={value}>
      {children}
    </InstagramContext.Provider>
  );
}

export function useInstagram() {
  const context = useContext(InstagramContext);
  if (context === undefined) {
    throw new Error("useInstagram must be used within an InstagramProvider");
  }
  return context;
}
