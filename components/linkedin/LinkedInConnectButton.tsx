"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface LinkedInConnectButtonProps {
  variant?: "default" | "compact";
  className?: string;
}

export default function LinkedInConnectButton({
  variant = "default",
  className = "",
}: LinkedInConnectButtonProps) {
  const { t } = useLanguage();
  const {
    isConnected,
    isLoading: contextLoading,
    connection,
    connectLinkedIn,
    disconnectLinkedIn
  } = useLinkedIn();

  const handleConnect = () => {
    connectLinkedIn();
  };

  const handleDisconnect = async () => {
    await disconnectLinkedIn();
  };

  const [imgError, setImgError] = useState(false);

  if (isConnected && connection) {
    const showPhoto = connection.profilePicture && !imgError;
    const initial = connection.profileName?.charAt(0)?.toUpperCase() || "L";

    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {variant === "default" && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {showPhoto ? (
              <img
                src={connection.profilePicture!}
                alt={connection.profileName || "LinkedIn profile"}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#0A66C2]"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#0A66C2]/15 flex items-center justify-center border-2 border-[#0A66C2]/30">
                <span className="text-base font-semibold text-[#0A66C2]">{initial}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{connection.profileName}</p>
              <p className="text-xs text-accent flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                {t.settings.connected}
              </p>
            </div>
          </div>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDisconnect}
          className="shrink-0"
        >
          {t.settings.disconnect}
        </Button>
      </div>
    );
  }

  // Enhanced connect button with better visibility
  return (
    <Button
      onClick={handleConnect}
      isLoading={contextLoading}
      className={`
        bg-[#0A66C2] hover:bg-[#004182] border-none
        min-h-[52px] sm:min-h-[48px]
        text-base font-semibold
        shadow-lg shadow-[#0A66C2]/25 hover:shadow-xl hover:shadow-[#0A66C2]/30
        transition-all duration-200
        ${className}
      `}
    >
      <LinkedInIcon className="w-5 h-5 mr-2.5" />
      {contextLoading ? t.ui.connecting : t.settings.connectLinkedIn}
    </Button>
  );
}

function LinkedInIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export { LinkedInIcon };
