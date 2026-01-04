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
import toast from "react-hot-toast";

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
  publishToLinkedIn: (content: string) => Promise<{
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
      // Custom success toast with LinkedIn branding
      toast.success(
        (t) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">LinkedIn connecte !</p>
              <p className="text-xs text-text-secondary">Vous pouvez maintenant publier vos posts</p>
            </div>
          </div>
        ),
        {
          duration: 4000,
          style: {
            background: '#1a1a2e',
            border: '1px solid rgba(10, 102, 194, 0.3)',
            padding: '12px 16px',
            borderRadius: '12px',
          },
        }
      );
      loadConnection(); // Reload connection from Firestore
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (linkedInError) {
      const errorMessages: { [key: string]: string } = {
        missing_code: "Code d'autorisation manquant",
        missing_user_id: "ID utilisateur manquant",
        token_exchange_failed: "Echec de l'echange du token",
        profile_fetch_failed: "Echec de la recuperation du profil",
        unexpected_error: "Erreur inattendue",
      };

      toast.error(
        (t) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Connexion echouee</p>
              <p className="text-xs text-text-secondary">{errorMessages[linkedInError] || decodeURIComponent(linkedInError)}</p>
            </div>
          </div>
        ),
        {
          duration: 5000,
          style: {
            background: '#1a1a2e',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '12px 16px',
            borderRadius: '12px',
          },
        }
      );
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
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
      // Custom success toast for disconnect
      toast.success(
        (t) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">LinkedIn deconnecte</p>
              <p className="text-xs text-text-secondary">Votre compte a ete dissocie</p>
            </div>
          </div>
        ),
        {
          duration: 3000,
          style: {
            background: '#1a1a2e',
            border: '1px solid rgba(0, 212, 170, 0.3)',
            padding: '12px 16px',
            borderRadius: '12px',
          },
        }
      );
    } catch (error) {
      console.error("Error disconnecting LinkedIn:", error);
      toast.error(
        (t) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Erreur</p>
              <p className="text-xs text-text-secondary">Impossible de deconnecter LinkedIn</p>
            </div>
          </div>
        ),
        {
          duration: 4000,
          style: {
            background: '#1a1a2e',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '12px 16px',
            borderRadius: '12px',
          },
        }
      );
    }
  }, [user]);

  // Publish to LinkedIn
  const publishToLinkedIn = useCallback(
    async (content: string, postId?: string): Promise<{ success: boolean; postUrl?: string; error?: string }> => {
      if (!user || !connection) {
        return { success: false, error: "Non connecté à LinkedIn" };
      }

      if (!isTokenValid) {
        return { success: false, error: "Session LinkedIn expirée. Veuillez vous reconnecter." };
      }

      try {
        // Call Next.js API route which handles everything securely
        const result = await postToLinkedInApi(user.uid, content, postId);

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
