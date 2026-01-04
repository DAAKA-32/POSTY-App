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
import toast from "react-hot-toast";

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
        toast.success(
          () => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00ab6c] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Medium connecte !</p>
                <p className="text-xs text-text-secondary">Bienvenue, {profile.name}</p>
              </div>
            </div>
          ),
          {
            duration: 4000,
            style: {
              background: '#1a1a2e',
              border: '1px solid rgba(0, 171, 108, 0.3)',
              padding: '12px 16px',
              borderRadius: '12px',
            },
          }
        );

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
      toast.success(
        () => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-white">Medium deconnecte</p>
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
