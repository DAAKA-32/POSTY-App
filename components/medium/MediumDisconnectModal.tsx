"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { MediumIcon } from "./MediumConnectButton";

interface MediumDisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  profileName?: string;
  username?: string;
}

export default function MediumDisconnectModal({
  isOpen,
  onClose,
  onConfirm,
  profileName,
  username,
}: MediumDisconnectModalProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConfirm = async () => {
    setIsDisconnecting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Error disconnecting Medium:", error);
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
      title="Deconnecter Medium"
      size="sm"
    >
      <div className="space-y-5">
        {/* Info section */}
        <div className="flex items-start gap-4 p-4 bg-[#00ab6c]/10 border border-[#00ab6c]/20 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-[#00ab6c]/20 flex items-center justify-center shrink-0">
            <MediumIcon className="w-5 h-5 text-[#00ab6c]" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">
              {profileName
                ? `Deconnecter ${profileName} ?`
                : "Deconnecter votre compte Medium ?"}
            </p>
            {username && (
              <p className="text-text-secondary text-xs">@{username}</p>
            )}
            <p className="text-text-secondary text-xs mt-2">
              Vous ne pourrez plus publier sur Medium depuis POSTY.
              Vous pourrez vous reconnecter a tout moment avec un nouveau token.
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
            className="bg-[#00ab6c] hover:bg-[#008f5a]"
          >
            {isDisconnecting ? "Deconnexion..." : "Oui"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
