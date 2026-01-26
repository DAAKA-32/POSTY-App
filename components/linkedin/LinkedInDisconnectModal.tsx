"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import BottomSheet from "@/components/ui/BottomSheet";
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

  // SSR-safe mobile detection
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Force re-check when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
    }
  }, [isOpen]);

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

  const content = (
    <div className="space-y-5">
      {/* Info section */}
      <div className="flex items-start gap-4 p-4 bg-[#0A66C2]/10 border border-[#0A66C2]/20 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-[#0A66C2]/20 flex items-center justify-center shrink-0">
          <LinkedInIcon className="w-5 h-5 text-[#0A66C2]" />
        </div>
        <div>
          <p className="text-gray-900 dark:text-white font-medium text-sm">
            {profileName ? `Déconnecter ${profileName} ?` : "Déconnecter votre compte LinkedIn ?"}
          </p>
          <p className="text-gray-600 dark:text-text-secondary text-xs mt-1">
            Vous ne pourrez plus publier directement sur LinkedIn depuis POSTY.
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
          className="bg-[#0A66C2] hover:bg-[#004182]"
        >
          {isDisconnecting ? "Déconnexion..." : "Oui"}
        </Button>
      </div>
    </div>
  );

  // Mobile: BottomSheet, Desktop: Modal
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Déconnecter LinkedIn"
        swipeToDismiss={!isDisconnecting}
      >
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Déconnecter LinkedIn"
      size="sm"
    >
      {content}
    </Modal>
  );
}
