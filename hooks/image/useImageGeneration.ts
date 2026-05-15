"use client";

/**
 * useImageGeneration — wraps POST /api/image/generate with loading/error
 * state, auth headers, and quota-error parsing so the consumer just calls
 * `generate(brief, postContext?)` and reacts to `result` / `error`.
 */

import { useCallback, useState } from "react";
import { getAuthHeaders } from "@/lib/api/client";
import toast from "@/components/ui/Toast";

export interface GeneratedImage {
  url: string;
  imageId: string;
  prompt: string;
  generatedAt: number;
}

interface QuotaInfo {
  plan: "free" | "pro" | "max" | null;
  limit: number;
  used: number;
  remaining: number;
}

export interface GenerationError {
  code: string;
  message: string;
  quota?: QuotaInfo;
}

/** Discriminated result so the caller can render image vs. error inline
 *  without juggling separate hook-state reads after the await resolves. */
export type GenerationResult =
  | { ok: true; image: GeneratedImage }
  | { ok: false; error: GenerationError };

export function useImageGeneration() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);

  const generate = useCallback(
    async (
      brief: string,
      opts?: { postContext?: string; language?: "fr" | "en"; silent?: boolean }
    ): Promise<GenerationResult> => {
      // `silent: true` lets the caller render errors inline (in the chat
      // bubble) instead of surfacing a global toast. Quota errors still
      // toast because they imply a side-action (upgrade) the inline card
      // alone can't carry.
      const silent = opts?.silent === true;
      setIsLoading(true);
      setError(null);
      try {
        const body = JSON.stringify({
          brief,
          postContext: opts?.postContext,
          language: opts?.language ?? "fr",
        });

        // First attempt with the (possibly cached) ID token.
        const callWithAuth = async (force: boolean) => {
          const headers = await getAuthHeaders(force);
          if (!headers.Authorization) {
            // No user, no token — surface a clear local error instead of
            // letting the request fall through to a server-side 401.
            return { ok: false, status: 401, data: { error: "not_signed_in" } } as const;
          }
          const response = await fetch("/api/image/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body,
          });
          const json = await response.json().catch(() => ({}));
          return { ok: response.ok, status: response.status, data: json } as const;
        };

        let res = await callWithAuth(false);
        // Retry once on 401 with a force-refreshed token. Covers the common
        // case where the cached ID token expired between renders — without
        // this, the user has to reload the whole page to recover.
        if (!res.ok && res.status === 401 && (res.data as { error?: string })?.error !== "not_signed_in") {
          res = await callWithAuth(true);
        }

        const data = res.data as {
          error?: string;
          message?: string;
          quota?: QuotaInfo;
          url?: string;
          imageId?: string;
        };

        const finish = (err: GenerationError): GenerationResult => {
          setError(err);
          if (data?.quota) setQuota(data.quota);
          return { ok: false, error: err };
        };

        if (!res.ok) {
          if (data?.error === "not_signed_in") {
            const err: GenerationError = {
              code: "not_signed_in",
              message: "Connecte-toi pour générer un visuel.",
            };
            if (!silent) toast.error(err.message);
            return finish(err);
          }
          if (res.status === 401) {
            const err: GenerationError = {
              code: "unauthorized",
              message: "Session expirée. Reconnecte-toi pour générer un visuel.",
            };
            if (!silent) toast.error(err.message);
            return finish(err);
          }
          const err: GenerationError = {
            code: data?.error || `http_${res.status}`,
            message: data?.message || "La génération du visuel a échoué.",
            quota: data?.quota,
          };

          // Quota errors always toast — they're paired with an upsell action
          // (open the pricing page) that the inline card alone can't carry.
          if (err.code === "quota_exceeded") {
            const plan = data?.quota?.plan;
            const limit = data?.quota?.limit;
            const isPro = plan === "pro";
            toast.error(
              isPro
                ? `Quota Pro atteint (${limit}/jour). Passe en Max pour 5 visuels par jour.`
                : err.message,
              {
                duration: 6000,
                ...(isPro ? { icon: "🎨" } : {}),
              }
            );
            if (isPro && typeof window !== "undefined") {
              setTimeout(() => {
                window.open("/subscription?plan=max&from=image_quota", "_blank", "noopener,noreferrer");
              }, 350);
            }
          } else if (!silent) {
            // Fall-through toast for callers that don't render their own
            // inline error UI.
            if (err.code === "ai_invalid_dsl" || err.code === "ai_invalid_json" || err.code === "ai_empty") {
              toast.error("L'IA n'a pas pu générer un visuel cohérent. Réessaye avec un brief un peu plus précis.");
            } else if (err.code === "render_failed") {
              toast.error("Le rendu du visuel a échoué. Réessaye dans un instant.");
            } else if (err.code === "upload_failed") {
              toast.error("Sauvegarde du visuel impossible. Réessaye.");
            } else if (err.code !== "network") {
              toast.error(err.message);
            }
          }

          return finish(err);
        }

        if (!data.url || !data.imageId) {
          const err: GenerationError = {
            code: "invalid_response",
            message: "Réponse serveur incomplète.",
          };
          if (!silent) toast.error(err.message + " Réessaye.");
          return finish(err);
        }
        const image: GeneratedImage = {
          url: data.url,
          imageId: data.imageId,
          prompt: brief,
          generatedAt: Date.now(),
        };
        setResult(image);
        if (data.quota) setQuota(data.quota);
        return { ok: true, image };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Réseau indisponible.";
        const err: GenerationError = { code: "network", message };
        setError(err);
        if (!silent) toast.error("Connexion impossible. Vérifie ton réseau.");
        return { ok: false, error: err };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { generate, reset, isLoading, result, error, quota };
}
