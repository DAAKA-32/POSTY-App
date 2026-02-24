"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { TwitterIcon } from "./TwitterConnectButton";

interface TwitterDisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  profileName?: string;
  username?: string;
}

export default function TwitterDisconnectModal({
  isOpen,
  onClose,
  onConfirm,
  profileName,
  username,
}: TwitterDisconnectModalProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConfirm = async () => {
    setIsDisconnecting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Error disconnecting Twitter:", error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleClose = () => {
    if (!isDisconnecting) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Déconnecter X (Twitter)"
      size="sm"
    >
      <div className="space-y-5">
        {/* Info section */}
        <div className="flex items-start gap-4 p-4 bg-black/30 border border-white/10 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0 border border-white/20">
            <TwitterIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">
              {profileName
                ? `Déconnecter ${profileName} ?`
                : "Déconnecter votre compte X ?"}
            </p>
            {username && (
              <p className="text-text-secondary text-xs">@{username}</p>
            )}
            <p className="text-text-secondary text-xs mt-2">
              Vous ne pourrez plus publier directement sur X depuis POSTY.
              Vous pourrez vous reconnecter à tout moment.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleClose}
            disabled={isDisconnecting}
          >
            Non
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleConfirm}
            isLoading={isDisconnecting}
            className="bg-black hover:bg-neutral-800 border border-white/10"
          >
            {isDisconnecting ? "Deconnexion..." : "Oui"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
