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
import {
  getXConnection,
  deleteXConnection,
  XConnectionData,
} from "@/lib/db/firestore";
import { authFetch } from "@/lib/api/client";
import toast from "@/components/ui/Toast";

interface XContextType {
  connection: XConnectionData | null;
  isLoading: boolean;
  isConnected: boolean;
  username: string | null;
  profilePicture: string | null;
  connectX: () => Promise<void>;
  disconnectX: () => Promise<void>;
  publishToX: (params: { content: string; imageUrl?: string }) => Promise<{
    success: boolean;
    postUrl?: string;
    error?: string;
  }>;
  refreshConnection: () => Promise<void>;
}

const XContext = createContext<XContextType | undefined>(undefined);

export function XProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<XConnectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const conn = await getXConnection(user.uid);
      setConnection(conn);
    } catch (error) {
      console.error("Error loading X connection:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // Handle OAuth return params (?zernio_success=true / ?zernio_error=...) —
  // callback redirects with `zernio_platform=x|instagram` so each context
  // only reacts to its own platform's outcome.
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const params = new URLSearchParams(window.location.search);
    const platform = params.get("zernio_platform");
    if (platform !== "x") return;

    const success = params.get("zernio_success");
    const error = params.get("zernio_error");

    if (success === "true") {
      toast.success("X connecté");
      loadConnection();
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
      return;
    }
    if (error) {
      const messages: Record<string, string> = {
        missing_state: "La connexion X a été interrompue.",
        invalid_state: "Requête X invalide.",
        account_not_found_after_oauth: "X n'a pas validé la connexion. Réessaie.",
        service_unavailable: "Service temporairement indisponible.",
        unexpected: "Erreur inattendue lors de la connexion X.",
        access_denied: "Tu as refusé l'accès à X.",
      };
      toast.error(messages[error] || "La connexion X n'a pas abouti.");
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, [user, loadConnection]);

  const connectX = useCallback(async () => {
    if (!user) {
      toast.error("Connecte-toi d'abord à Posty");
      return;
    }
    try {
      const res = await authFetch("/api/auth/zernio/x/start", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.status === 409 && data.alreadyConnected) {
        toast.error("Un compte X est déjà connecté. Déconnecte-le d'abord.");
        return;
      }
      if (!res.ok || !data.authUrl) {
        toast.error(data.error || "X OAuth indisponible");
        return;
      }
      window.location.href = data.authUrl;
    } catch {
      toast.error("Échec de la connexion X");
    }
  }, [user]);

  const disconnectX = useCallback(async () => {
    if (!user) return;
    try {
      await deleteXConnection(user.uid);
      setConnection(null);
      toast.success("X déconnecté");
    } catch (error) {
      console.error("Error disconnecting X:", error);
      toast.error("Échec de la déconnexion");
    }
  }, [user]);

  const publishToX = useCallback(
    async ({ content, imageUrl }: { content: string; imageUrl?: string }) => {
      if (!user || !connection) {
        return { success: false, error: "No X connection" };
      }
      try {
        const res = await authFetch("/api/x/publish", {
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

  const value: XContextType = {
    connection,
    isLoading,
    isConnected: !!connection,
    username: connection?.username || null,
    profilePicture: connection?.profilePicture || null,
    connectX,
    disconnectX,
    publishToX,
    refreshConnection: loadConnection,
  };

  return <XContext.Provider value={value}>{children}</XContext.Provider>;
}

export function useX() {
  const context = useContext(XContext);
  if (context === undefined) {
    throw new Error("useX must be used within an XProvider");
  }
  return context;
}
