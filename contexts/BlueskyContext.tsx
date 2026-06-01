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
import { authFetch } from "@/lib/api/client";
import {
  getBlueskyConnection,
  deleteBlueskyConnection,
  BlueskyConnectionData,
} from "@/lib/db/firestore";
import toast from "@/components/ui/Toast";

interface BlueskyContextType {
  connection: BlueskyConnectionData | null;
  isLoading: boolean;
  isConnected: boolean;
  profilePicture: string | null;
  profileName: string | null;
  handle: string | null;
  connectBluesky: (handle: string, password: string, service?: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  disconnectBluesky: () => Promise<void>;
  publishToBluesky: (content: string) => Promise<{
    success: boolean;
    postUrl?: string;
    error?: string;
  }>;
  refreshConnection: () => Promise<void>;
}

const BlueskyContext = createContext<BlueskyContextType | undefined>(undefined);

export function BlueskyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<BlueskyConnectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const conn = await readWithAuthRetry(() => getBlueskyConnection(user.uid));
      setConnection(conn);
    } catch (error) {
      console.error("Error loading Bluesky connection:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  const connectBluesky = useCallback(
    async (handle: string, password: string, service?: string) => {
      if (!user) return { success: false, error: "Not logged in" };
      try {
        const response = await authFetch("/api/bluesky/connect", {
          method: "POST",
          body: JSON.stringify({ handle, password, service }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          return { success: false, error: data.error || "Connection failed" };
        }
        await loadConnection();
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Connection failed";
        return { success: false, error: message };
      }
    },
    [user, loadConnection]
  );

  const disconnectBluesky = useCallback(async () => {
    if (!user) return;
    try {
      await deleteBlueskyConnection(user.uid);
      setConnection(null);
      toast.success("Bluesky déconnecté");
    } catch (error) {
      console.error("Error disconnecting Bluesky:", error);
      toast.error("Échec de la déconnexion");
    }
  }, [user]);

  const publishToBluesky = useCallback(
    async (content: string) => {
      if (!user || !connection) {
        return { success: false, error: "Not connected to Bluesky" };
      }
      try {
        const response = await authFetch("/api/bluesky/publish", {
          method: "POST",
          body: JSON.stringify({ content }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          return { success: false, error: data.error || "Publish failed" };
        }
        return { success: true, postUrl: data.postUrl };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Publish failed";
        return { success: false, error: message };
      }
    },
    [user, connection]
  );

  const value: BlueskyContextType = {
    connection,
    isLoading,
    isConnected: !!connection,
    profilePicture: connection?.profilePicture || null,
    profileName: connection?.profileName || null,
    handle: connection?.handle || null,
    connectBluesky,
    disconnectBluesky,
    publishToBluesky,
    refreshConnection: loadConnection,
  };

  return (
    <BlueskyContext.Provider value={value}>{children}</BlueskyContext.Provider>
  );
}

export function useBluesky() {
  const context = useContext(BlueskyContext);
  if (context === undefined) {
    throw new Error("useBluesky must be used within a BlueskyProvider");
  }
  return context;
}
