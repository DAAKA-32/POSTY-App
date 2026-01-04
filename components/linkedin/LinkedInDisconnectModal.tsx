"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { LinkedInIcon } from "./LinkedInConnectButton";

interface LinkedInDisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  profileName?: string;
}

export default function LinkedInDisconnectModal({
  isOpen,
  onClose,
  onConfirm,
  profileName,
}: LinkedInDisconnectModalProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConfirm = async () => {
    setIsDisconnecting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Error disconnecting LinkedIn:", error);
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
      title="Deconnecter LinkedIn"
      size="sm"
    >
      <div className="space-y-5">
        {/* Info section */}
        <div className="flex items-start gap-4 p-4 bg-[#0A66C2]/10 border border-[#0A66C2]/20 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-[#0A66C2]/20 flex items-center justify-center shrink-0">
            <LinkedInIcon className="w-5 h-5 text-[#0A66C2]" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">
              {profileName ? `Deconnecter ${profileName} ?` : "Deconnecter votre compte LinkedIn ?"}
            </p>
            <p className="text-text-secondary text-xs mt-1">
              Vous ne pourrez plus publier directement sur LinkedIn depuis POSTY.
              Vous pourrez vous reconnecter a tout moment.
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
            className="bg-[#0A66C2] hover:bg-[#004182]"
          >
            {isDisconnecting ? "Deconnexion..." : "Oui"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
