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
} from "@/lib/db/firestore";
import { isTokenExpired, postToLinkedIn as postToLinkedInApi, getLinkedInAuthUrl } from "@/lib/platforms/linkedin";
import toast from "@/components/ui/Toast";
import { useLanguage } from "@/contexts/LanguageContext";

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
  refreshProfilePhoto: () => Promise<string | null>;
}

const LinkedInContext = createContext<LinkedInContextType | undefined>(undefined);

export function LinkedInProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
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
      toast.success(t.toasts.linkedinConnectedSuccess, {
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
        missing_code: "La connexion LinkedIn a ete interrompue. Reessayez.",
        missing_user_id: "Veuillez vous reconnecter a Posty avant de lier LinkedIn.",
        token_exchange_failed: "LinkedIn n'a pas pu valider la connexion. Reessayez dans quelques instants.",
        profile_fetch_failed: "Impossible de recuperer votre profil LinkedIn. Reessayez.",
        unexpected_error: "Un probleme est survenu. Reessayez ou contactez le support.",
        service_unavailable: "LinkedIn est temporairement indisponible. Reessayez dans quelques minutes.",
      };

      const errorMessage = errorMessages[linkedInError] || "La connexion LinkedIn n'a pas abouti. Reessayez.";
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
      toast.error(t.toasts.mustBeLoggedIn);
      return;
    }

    // Store current URL to return after OAuth (preserves user's position)
    if (typeof window !== "undefined") {
      const currentUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem("linkedin_return_url", currentUrl);
    }

    // Show connecting notification
    toast.info(t.toasts.redirectingToLinkedin, { duration: 2000 });

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
      toast.success(t.toasts.linkedinDisconnected);
    } catch (error) {
      console.error("Error disconnecting LinkedIn:", error);
      toast.error(t.toasts.disconnectFailed);
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

  // Refresh LinkedIn profile photo by re-fetching from LinkedIn API
  const refreshProfilePhoto = useCallback(async (): Promise<string | null> => {
    if (!user || !connection) return null;

    try {
      const response = await fetch("/api/linkedin/refresh-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (data.photoUrl) {
        // Update local state with fresh photo URL
        setConnection((prev) =>
          prev ? { ...prev, profilePicture: data.photoUrl } : prev
        );
        return data.photoUrl;
      }
      return null;
    } catch (error) {
      console.error("Failed to refresh LinkedIn photo:", error);
      return null;
    }
  }, [user, connection]);

  // Profile data shortcuts
  // Photo URL is a CDN link (media.licdn.com), works independently of OAuth token validity
  const profilePicture = connection?.profilePicture || null;
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
    refreshProfilePhoto,
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
