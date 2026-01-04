"use client";

import Button from "@/components/ui/Button";
import { useTwitter } from "@/contexts/TwitterContext";

interface TwitterConnectButtonProps {
  variant?: "default" | "compact";
  className?: string;
}

export default function TwitterConnectButton({
  variant = "default",
  className = "",
}: TwitterConnectButtonProps) {
  const {
    isConnected,
    isLoading: contextLoading,
    connection,
    connectTwitter,
    disconnectTwitter,
  } = useTwitter();

  const handleConnect = () => {
    connectTwitter();
  };

  const handleDisconnect = async () => {
    await disconnectTwitter();
  };

  if (isConnected && connection) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {variant === "default" && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {connection.profilePicture ? (
              <img
                src={connection.profilePicture}
                alt={connection.profileName || "Twitter profile"}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                loading="lazy"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border-2 border-white/20">
                <TwitterIcon className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{connection.profileName}</p>
              <p className="text-xs text-text-secondary truncate">@{connection.username}</p>
            </div>
            <span className="text-xs text-accent flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-accent rounded-full" />
              Connecte
            </span>
          </div>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDisconnect}
          className="shrink-0"
        >
          Deconnecter
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      isLoading={contextLoading}
      className={`bg-black hover:bg-neutral-800 border border-white/10 ${className}`}
    >
      <TwitterIcon className="w-5 h-5 mr-2" />
      {contextLoading ? "Connexion..." : "Connecter X (Twitter)"}
    </Button>
  );
}

export function TwitterIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
