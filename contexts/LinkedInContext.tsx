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
  getLinkedInConnection,
  deleteLinkedInConnection,
  LinkedInConnectionData,
} from "@/lib/firestore";
import { isTokenExpired, postToLinkedIn as postToLinkedInApi, getLinkedInAuthUrl } from "@/lib/linkedin";
import toast from "@/components/ui/Toast";

interface LinkedInContextType {
  connection: LinkedInConnectionData | null;
  isLoading: boolean;
  isConnected: boolean;
  isTokenValid: boolean;
  // Profile shortcuts
  profilePicture: string | null;
  profileName: string | null;
  // Actions
  connectLinkedIn: () => void;
  disconnectLinkedIn: () => Promise<void>;
  publishToLinkedIn: (content: string, visibility?: "PUBLIC" | "CONNECTIONS") => Promise<{
    success: boolean;
    postUrl?: string;
    error?: string;
  }>;
  refreshConnection: () => Promise<void>;
}

const LinkedInContext = createContext<LinkedInContextType | undefined>(undefined);

export function LinkedInProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<LinkedInConnectionData | null>(null);
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
      const conn = await getLinkedInConnection(user.uid);
      setConnection(conn);
    } catch (error) {
      console.error("Error loading LinkedIn connection:", error);
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
    const linkedInSuccess = params.get("linkedin_success");
    const linkedInError = params.get("linkedin_error");

    if (linkedInSuccess === "true") {
      // Enhanced success notification with professional message
      toast.success("Compte LinkedIn connecté avec succès", {
        duration: 4000,
      });

      // Reload connection from Firestore
      loadConnection();

      // Check for stored return URL and redirect back
      const storedReturnUrl = sessionStorage.getItem("linkedin_return_url");
      sessionStorage.removeItem("linkedin_return_url");

      if (storedReturnUrl) {
        // Redirect to stored URL (without query params to keep clean)
        window.history.replaceState({}, "", storedReturnUrl);
      } else {
        // Just clean the URL params
        window.history.replaceState({}, "", window.location.pathname);
      }
      return;
    }

    if (linkedInError) {
      const errorMessages: { [key: string]: string } = {
        missing_code: "Code d'autorisation manquant",
        missing_user_id: "ID utilisateur manquant",
        token_exchange_failed: "Échec de l'échange du token",
        profile_fetch_failed: "Échec de la récupération du profil",
        unexpected_error: "Erreur inattendue",
        service_unavailable: "Service temporairement indisponible",
      };

      const errorMessage = errorMessages[linkedInError] || decodeURIComponent(linkedInError);
      toast.error(errorMessage, { duration: 5000 });

      // Clean URL and restore previous location if available
      const storedReturnUrl = sessionStorage.getItem("linkedin_return_url");
      sessionStorage.removeItem("linkedin_return_url");

      if (storedReturnUrl) {
        window.history.replaceState({}, "", storedReturnUrl);
      } else {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [user, loadConnection]);

  // Check if token is valid
  const isTokenValid = connection
    ? !isTokenExpired(connection.expiresAt.toDate())
    : false;

  // Connect LinkedIn (redirect to OAuth)
  const connectLinkedIn = useCallback(() => {
    if (!user) {
      toast.error("Vous devez être connecté pour lier votre compte LinkedIn");
      return;
    }

    // Store current URL to return after OAuth (preserves user's position)
    if (typeof window !== "undefined") {
      const currentUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem("linkedin_return_url", currentUrl);
    }

    // Show connecting notification
    toast.info("Redirection vers LinkedIn...", { duration: 2000 });

    // Redirect to LinkedIn authorization page
    const authUrl = getLinkedInAuthUrl(user.uid);
    window.location.href = authUrl;
  }, [user]);

  // Disconnect LinkedIn
  const disconnectLinkedIn = useCallback(async () => {
    if (!user) return;

    try {
      await deleteLinkedInConnection(user.uid);
      setConnection(null);
      toast.success("LinkedIn déconnecté");
    } catch (error) {
      console.error("Error disconnecting LinkedIn:", error);
      toast.error("Impossible de déconnecter LinkedIn");
    }
  }, [user]);

  // Publish to LinkedIn
  const publishToLinkedIn = useCallback(
    async (content: string, visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC", postId?: string): Promise<{ success: boolean; postUrl?: string; error?: string }> => {
      if (!user || !connection) {
        return { success: false, error: "Non connecté à LinkedIn" };
      }

      if (!isTokenValid) {
        return { success: false, error: "Session LinkedIn expirée. Veuillez vous reconnecter." };
      }

      try {
        // Call Next.js API route which handles everything securely
        const result = await postToLinkedInApi(user.uid, content, visibility, postId);

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

  const value: LinkedInContextType = {
    connection,
    isLoading,
    isConnected: !!connection,
    isTokenValid,
    profilePicture,
    profileName,
    connectLinkedIn,
    disconnectLinkedIn,
    publishToLinkedIn,
    refreshConnection: loadConnection,
  };

  return (
    <LinkedInContext.Provider value={value}>
      {children}
    </LinkedInContext.Provider>
  );
}

export function useLinkedIn() {
  const context = useContext(LinkedInContext);
  if (context === undefined) {
    throw new Error("useLinkedIn must be used within a LinkedInProvider");
  }
  return context;
}
