"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useMastodon } from "@/contexts/MastodonContext";

interface MastodonConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mastodon is federated — we need the user's instance URL to know which
// server to run OAuth against. Posty registers itself as an app on that
// instance (no App Review needed) and redirects the browser to the
// standard OAuth2 authorization page. No password ever leaves the user's
// instance; Posty only stores the returned access token.
export default function MastodonConnectModal({
  isOpen,
  onClose,
}: MastodonConnectModalProps) {
  const { connectMastodon } = useMastodon();
  const [instance, setInstance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!instance.trim()) {
      setError("URL d'instance requise");
      return;
    }
    setIsSubmitting(true);
    const result = await connectMastodon(instance.trim());
    if (!result.success) {
      setIsSubmitting(false);
      setError(result.error || "Connexion impossible");
      return;
    }
    // On success the browser is being redirected to the instance — no need to
    // reset state; the modal will unmount when the page navigates.
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setError(null);
    setInstance("");
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
        className="min-h-[48px] bg-[#6364FF] hover:bg-[#4f50e0] border-none"
      >
        Continuer
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Connecter Mastodon"
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-secondary">
          Indiquez votre instance Mastodon (le serveur sur lequel votre compte
          vit). Vous serez ensuite redirigé·e vers cette instance pour
          autoriser Posty — aucun mot de passe ne transite par Posty.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">
            Instance
          </label>
          <Input
            type="text"
            placeholder="mastodon.social"
            value={instance}
            onChange={(e) => setInstance(e.target.value)}
            disabled={isSubmitting}
            autoComplete="off"
            autoCapitalize="none"
          />
          <p className="text-xs text-text-muted mt-1">
            Exemples : mastodon.social, hachyderm.io, fosstodon.org,
            mamot.fr, piaille.fr.
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

        <button type="submit" className="hidden" aria-hidden="true" />
      </form>
    </Modal>
  );
}
