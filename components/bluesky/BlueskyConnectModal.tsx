"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useBluesky } from "@/contexts/BlueskyContext";
import toast from "@/components/ui/Toast";

interface BlueskyConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Bluesky uses an app password (NOT the account password). The user must
// generate it at https://bsky.app/settings/app-passwords. Posty never stores
// the password — only the JWT pair returned by com.atproto.server.createSession.
export default function BlueskyConnectModal({
  isOpen,
  onClose,
}: BlueskyConnectModalProps) {
  const { connectBluesky } = useBluesky();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!handle.trim() || !password.trim()) {
      setError("Handle et mot de passe d'application requis");
      return;
    }
    setIsSubmitting(true);
    const result = await connectBluesky(handle.trim(), password);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || "Connexion impossible");
      return;
    }
    toast.success("Bluesky connecté");
    setHandle("");
    setPassword("");
    onClose();
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setError(null);
    setHandle("");
    setPassword("");
    onClose();
  };

  const footer = (
    <div className="flex gap-3">
      <Button
        variant="secondary"
        fullWidth
        onClick={handleClose}
        disabled={isSubmitting}
        className="min-h-[48px]"
      >
        Annuler
      </Button>
      <Button
        fullWidth
        onClick={handleSubmit}
        isLoading={isSubmitting}
        className="min-h-[48px] bg-[#0085FF] hover:bg-[#0074dd] border-none"
      >
        Connecter
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Connecter Bluesky"
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-secondary">
          Bluesky utilise un{" "}
          <a
            href="https://bsky.app/settings/app-passwords"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium hover:underline"
          >
            mot de passe d&apos;application
          </a>{" "}
          dédié. Votre mot de passe réel n&apos;est jamais transmis à Posty.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">
            Handle
          </label>
          <Input
            type="text"
            placeholder="alice.bsky.social"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            disabled={isSubmitting}
            autoComplete="username"
            autoCapitalize="none"
          />
          <p className="text-xs text-text-muted mt-1">
            Sans le @. Si vous tapez seulement « alice », on ajoute .bsky.social.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">
            Mot de passe d&apos;application
          </label>
          <Input
            type="password"
            placeholder="xxxx-xxxx-xxxx-xxxx"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            autoComplete="current-password"
          />
          <p className="text-xs text-text-muted mt-1">
            À générer sur bsky.app → Settings → App Passwords.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-error/10 border border-error/30 rounded-lg">
            <svg
              className="w-4 h-4 text-error shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Hidden submit so Enter key triggers onSubmit */}
        <button type="submit" className="hidden" aria-hidden="true" />
      </form>
    </Modal>
  );
}
