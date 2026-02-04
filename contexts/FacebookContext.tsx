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
  getFacebookConnection,
  deleteFacebookConnection,
} from "@/lib/firestore";
import { FacebookConnectionData } from "@/types";
import {
  isMetaTokenExpired,
  getFacebookAuthUrl,
  postToFacebook as postToFacebookApi,
} from "@/lib/meta";
import toast from "@/components/ui/Toast";

interface FacebookContextType {
  connection: FacebookConnectionData | null;
  isLoading: boolean;
  isConnected: boolean;
  isTokenValid: boolean;
  // Profile shortcuts
  profilePicture: string | null;
  profileName: string | null;
  // Pages
  pages: Array<{ id: string; name: string }>;
  selectedPageId: string | null;
  // Actions
  connectFacebook: () => void;
  disconnectFacebook: () => Promise<void>;
  publishToFacebook: (content: string, postId?: string) => Promise<{
    success: boolean;
    postUrl?: string;
    error?: string;
  }>;
  refreshConnection: () => Promise<void>;
}

const FacebookContext = createContext<FacebookContextType | undefined>(undefined);

export function FacebookProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<FacebookConnectionData | null>(null);
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
      const conn = await getFacebookConnection(user.uid);
      setConnection(conn);
    } catch (error) {
      console.error("Error loading Facebook connection:", error);
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
    const facebookSuccess = params.get("facebook_success");
    const facebookError = params.get("facebook_error");

    if (facebookSuccess === "true") {
      toast.success("Facebook connecté");
      loadConnection();
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (facebookError) {
      const errorMessages: { [key: string]: string } = {
        missing_code: "Code d'autorisation manquant",
        missing_state: "État manquant",
        invalid_state: "État invalide",
        token_exchange_failed: "Échec de l'échange du token",
        profile_fetch_failed: "Échec de la récupération du profil",
        service_unavailable: "Service temporairement indisponible",
        unexpected_error: "Erreur inattendue",
      };

      const errorMessage = errorMessages[facebookError] || decodeURIComponent(facebookError);
      toast.error(errorMessage);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user, loadConnection]);

  // Check if token is valid
  const isTokenValid = connection && connection.expiresAt
    ? !isMetaTokenExpired(connection.expiresAt.toDate())
    : false;

  // Connect Facebook (redirect to OAuth)
  const connectFacebook = useCallback(() => {
    if (!user) {
      toast.error("Vous devez être connecté pour lier votre compte Facebook");
      return;
    }

    window.location.href = getFacebookAuthUrl(user.uid);
  }, [user]);

  // Disconnect Facebook
  const disconnectFacebook = useCallback(async () => {
    if (!user) return;

    try {
      await deleteFacebookConnection(user.uid);
      setConnection(null);
      toast.success("Facebook déconnecté");
    } catch (error) {
      console.error("Error disconnecting Facebook:", error);
      toast.error("Impossible de déconnecter Facebook");
    }
  }, [user]);

  // Publish to Facebook
  const publishToFacebook = useCallback(
    async (content: string, postId?: string): Promise<{ success: boolean; postUrl?: string; error?: string }> => {
      if (!user || !connection) {
        return { success: false, error: "Non connecté à Facebook" };
      }

      if (!isTokenValid) {
        return { success: false, error: "Session Facebook expirée. Veuillez vous reconnecter." };
      }

      try {
        const result = await postToFacebookApi(user.uid, content, postId);
        return {
          success: result.success,
          postUrl: result.postUrl,
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

  // Pages
  const pages = connection?.pageIds
    ? connection.pageIds.map((id) => ({ id, name: id }))
    : [];
  const selectedPageId = connection?.selectedPageId || null;

  const value: FacebookContextType = {
    connection,
    isLoading,
    isConnected: !!connection,
    isTokenValid,
    profilePicture,
    profileName,
    pages,
    selectedPageId,
    connectFacebook,
    disconnectFacebook,
    publishToFacebook,
    refreshConnection: loadConnection,
  };

  return (
    <FacebookContext.Provider value={value}>
      {children}
    </FacebookContext.Provider>
  );
}

export function useFacebook() {
  const context = useContext(FacebookContext);
  if (context === undefined) {
    throw new Error("useFacebook must be used within a FacebookProvider");
  }
  return context;
}
