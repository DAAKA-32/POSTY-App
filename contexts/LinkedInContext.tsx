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
  saveLinkedInConnection,
  deleteLinkedInConnection,
  updateLinkedInLastUsed,
  saveLinkedInPost,
  LinkedInConnectionData,
} from "@/lib/firestore";
import { isTokenExpired, postToLinkedIn as postToLinkedInApi, exchangeCodeForToken } from "@/lib/linkedin";
import toast from "react-hot-toast";

interface LinkedInContextType {
  connection: LinkedInConnectionData | null;
  isLoading: boolean;
  isConnected: boolean;
  isTokenValid: boolean;
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

  // Handle OAuth callback from URL params
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const linkedInError = params.get("error");
    const errorDescription = params.get("error_description");

    if (linkedInError) {
      toast.error(errorDescription || linkedInError);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (code) {
      // Exchange code for token via Cloud Function
      const processOAuthCallback = async () => {
        try {
          const result = await exchangeCodeForToken(code);

          if (!result.success || !result.accessToken) {
            toast.error(result.error || "Erreur lors de la connexion LinkedIn");
            return;
          }

          // Save connection to Firestore
          await saveLinkedInConnection(user.uid, {
            linkedInId: result.linkedInId!,
            accessToken: result.accessToken,
            expiresAt: new Date(result.expiresAt!),
            profileName: result.profileName!,
            profilePicture: result.profilePicture,
            email: result.email,
          });

          await loadConnection();
          toast.success("LinkedIn connecte avec succes !");
        } catch (error) {
          console.error("Error processing LinkedIn callback:", error);
          toast.error("Erreur lors de la connexion LinkedIn");
        } finally {
          // Clean URL
          window.history.replaceState({}, "", window.location.pathname);
        }
      };

      processOAuthCallback();
    }
  }, [user, loadConnection]);

  // Check if token is valid
  const isTokenValid = connection
    ? !isTokenExpired(connection.expiresAt.toDate())
    : false;

  // Connect LinkedIn (redirect to OAuth)
  const connectLinkedIn = useCallback(() => {
    // The LinkedInConnectButton handles the redirect
    // This is a placeholder for any pre-connect logic
  }, []);

  // Disconnect LinkedIn
  const disconnectLinkedIn = useCallback(async () => {
    if (!user) return;

    try {
      await deleteLinkedInConnection(user.uid);
      setConnection(null);
      toast.success("LinkedIn deconnecte");
    } catch (error) {
      console.error("Error disconnecting LinkedIn:", error);
      toast.error("Erreur lors de la deconnexion");
    }
  }, [user]);

  // Publish to LinkedIn
  const publishToLinkedIn = useCallback(
    async (content: string): Promise<{ success: boolean; postUrl?: string; error?: string }> => {
      if (!user || !connection) {
        return { success: false, error: "Non connecte a LinkedIn" };
      }

      if (!isTokenValid) {
        return { success: false, error: "Session LinkedIn expiree. Veuillez vous reconnecter." };
      }

      try {
        const result = await postToLinkedInApi(
          connection.accessToken,
          connection.linkedInId,
          content,
          connection.expiresAt.toDate().toISOString()
        );

        // Save post record to Firestore
        await saveLinkedInPost(user.uid, {
          linkedInId: connection.linkedInId,
          postId: result.id || "",
          content,
          postUrl: result.postUrl,
          success: result.success,
          error: result.error,
        });

        // Update last used timestamp
        if (result.success) {
          await updateLinkedInLastUsed(user.uid);
        }

        return {
          success: result.success,
          postUrl: result.postUrl,
          error: result.error,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur de publication";

        // Save failed post record
        await saveLinkedInPost(user.uid, {
          linkedInId: connection.linkedInId,
          postId: "",
          content,
          success: false,
          error: errorMessage,
        });

        return { success: false, error: errorMessage };
      }
    },
    [user, connection, isTokenValid]
  );

  const value: LinkedInContextType = {
    connection,
    isLoading,
    isConnected: !!connection,
    isTokenValid,
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
