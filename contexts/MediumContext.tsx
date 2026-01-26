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
  getMediumConnection,
  saveMediumConnection,
  deleteMediumConnection,
} from "@/lib/firestore";
import { MediumConnectionData } from "@/types";
import {
  validateMediumToken,
  postToMedium as postToMediumApi,
  generateTitleFromContent,
} from "@/lib/medium";
import type { MediumPublishStatus } from "@/lib/medium";
import toast from "@/components/ui/Toast";

interface MediumContextType {
  connection: MediumConnectionData | null;
  isLoading: boolean;
  isConnected: boolean;
  // Profile shortcuts
  profilePicture: string | null;
  profileName: string | null;
  username: string | null;
  profileUrl: string | null;
  // Actions
  connectMedium: (integrationToken: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  disconnectMedium: () => Promise<void>;
  publishToMedium: (
    content: string,
    title?: string,
    publishStatus?: MediumPublishStatus,
    postId?: string
  ) => Promise<{
    success: boolean;
    articleUrl?: string;
    error?: string;
  }>;
  refreshConnection: () => Promise<void>;
}

const MediumContext = createContext<MediumContextType | undefined>(undefined);

export function MediumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<MediumConnectionData | null>(null);
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
      const conn = await getMediumConnection(user.uid);
      setConnection(conn);
    } catch (error) {
      console.error("Error loading Medium connection:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load connection on mount and when user changes
  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // Connect Medium with integration token
  const connectMedium = useCallback(
    async (integrationToken: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: "Vous devez etre connecte" };
      }

      if (!integrationToken || integrationToken.trim().length === 0) {
        return { success: false, error: "Token d'integration requis" };
      }

      setIsLoading(true);
      try {
        // Validate token with Medium API
        const profile = await validateMediumToken(integrationToken);

        if (!profile) {
          return { success: false, error: "Token invalide ou expire" };
        }

        // Save connection to Firestore
        await saveMediumConnection(user.uid, {
          mediumId: profile.id,
          username: profile.username,
          integrationToken: integrationToken,
          profileName: profile.name,
          profilePicture: profile.imageUrl,
          profileUrl: profile.url,
        });

        // Reload connection
        await loadConnection();

        // Success toast
        toast.success("Medium connecté");

        return { success: true };
      } catch (error) {
        console.error("Error connecting Medium:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erreur de connexion",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [user, loadConnection]
  );

  // Disconnect Medium
  const disconnectMedium = useCallback(async () => {
    if (!user) return;

    try {
      await deleteMediumConnection(user.uid);
      setConnection(null);
      toast.success("Medium déconnecté");
    } catch (error) {
      console.error("Error disconnecting Medium:", error);
      toast.error("Impossible de deconnecter Medium");
    }
  }, [user]);

  // Publish to Medium
  const publishToMedium = useCallback(
    async (
      content: string,
      title?: string,
      publishStatus: MediumPublishStatus = "draft",
      postId?: string
    ): Promise<{ success: boolean; articleUrl?: string; error?: string }> => {
      if (!user || !connection) {
        return { success: false, error: "Non connecte a Medium" };
      }

      try {
        // Generate title from content if not provided
        const articleTitle = title || generateTitleFromContent(content);

        const result = await postToMediumApi(
          user.uid,
          articleTitle,
          content,
          publishStatus,
          postId
        );

        return {
          success: result.success,
          articleUrl: result.articleUrl,
          error: result.error,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur de publication";
        return { success: false, error: errorMessage };
      }
    },
    [user, connection]
  );

  // Profile data shortcuts
  const profilePicture = connection?.profilePicture || null;
  const profileName = connection?.profileName || null;
  const username = connection?.username || null;
  const profileUrl = connection?.profileUrl || null;

  const value: MediumContextType = {
    connection,
    isLoading,
    isConnected: !!connection,
    profilePicture,
    profileName,
    username,
    profileUrl,
    connectMedium,
    disconnectMedium,
    publishToMedium,
    refreshConnection: loadConnection,
  };

  return (
    <MediumContext.Provider value={value}>
      {children}
    </MediumContext.Provider>
  );
}

export function useMedium() {
  const context = useContext(MediumContext);
  if (context === undefined) {
    throw new Error("useMedium must be used within a MediumProvider");
  }
  return context;
}
