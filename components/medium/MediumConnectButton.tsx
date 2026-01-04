"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useMedium } from "@/contexts/MediumContext";

interface MediumConnectButtonProps {
  variant?: "default" | "compact";
  className?: string;
}

export default function MediumConnectButton({
  variant = "default",
  className = "",
}: MediumConnectButtonProps) {
  const {
    isConnected,
    isLoading: contextLoading,
    connection,
    connectMedium,
    disconnectMedium,
  } = useMedium();

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [token, setToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");

  const handleOpenModal = () => {
    setShowTokenModal(true);
    setToken("");
    setError("");
  };

  const handleConnect = async () => {
    if (!token.trim()) {
      setError("Le token est requis");
      return;
    }

    setIsConnecting(true);
    setError("");

    const result = await connectMedium(token.trim());

    if (result.success) {
      setShowTokenModal(false);
      setToken("");
    } else {
      setError(result.error || "Erreur de connexion");
    }

    setIsConnecting(false);
  };

  const handleDisconnect = async () => {
    await disconnectMedium();
  };

  if (isConnected && connection) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {variant === "default" && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {connection.profilePicture ? (
              <img
                src={connection.profilePicture}
                alt={connection.profileName || "Medium profile"}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#00ab6c]/50"
                loading="lazy"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#00ab6c]/20 flex items-center justify-center">
                <MediumIcon className="w-5 h-5 text-[#00ab6c]" />
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
    <>
      <Button
        onClick={handleOpenModal}
        isLoading={contextLoading}
        className={`bg-[#00ab6c] hover:bg-[#008f5a] border-none ${className}`}
      >
        <MediumIcon className="w-5 h-5 mr-2" />
        {contextLoading ? "Chargement..." : "Connecter Medium"}
      </Button>

      {/* Token Input Modal */}
      <Modal
        isOpen={showTokenModal}
        onClose={() => !isConnecting && setShowTokenModal(false)}
        title="Connecter Medium"
        size="md"
      >
        <div className="space-y-5">
          {/* Instructions */}
          <div className="p-4 bg-[#00ab6c]/10 border border-[#00ab6c]/20 rounded-xl">
            <div className="flex items-start gap-3">
              <MediumIcon className="w-6 h-6 text-[#00ab6c] shrink-0 mt-0.5" />
              <div className="text-sm space-y-2">
                <p className="text-white font-medium">Comment obtenir votre token ?</p>
                <ol className="text-text-secondary space-y-1 list-decimal list-inside">
                  <li>Allez sur <a href="https://medium.com/me/settings/security" target="_blank" rel="noopener noreferrer" className="text-[#00ab6c] hover:underline">medium.com/me/settings/security</a></li>
                  <li>Cliquez sur &quot;Integration tokens&quot;</li>
                  <li>Generez un nouveau token</li>
                  <li>Copiez et collez-le ci-dessous</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Token Input */}
          <div>
            <label htmlFor="medium-token" className="block text-sm font-medium text-white mb-2">
              Token d&apos;integration
            </label>
            <input
              id="medium-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Collez votre token ici..."
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-[#00ab6c] transition-colors"
              disabled={isConnecting}
            />
            {error && (
              <p className="mt-2 text-sm text-error">{error}</p>
            )}
          </div>

          {/* Security Note */}
          <p className="text-xs text-text-secondary">
            Votre token est stocke de maniere securisee et n&apos;est jamais expose publiquement.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowTokenModal(false)}
              disabled={isConnecting}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleConnect}
              isLoading={isConnecting}
              className="bg-[#00ab6c] hover:bg-[#008f5a]"
              disabled={!token.trim()}
            >
              {isConnecting ? "Connexion..." : "Connecter"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function MediumIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
    </svg>
  );
}
