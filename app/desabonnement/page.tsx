"use client";

/**
 * /desabonnement — the page the opt-out link in every prospection email points to.
 *
 * Public, no login, no dark pattern: the address is already in the URL, so there
 * is nothing to type and nothing to confirm twice. One click, one confirmation,
 * done. This is what makes the CNIL opt-out requirement real rather than
 * decorative.
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type State = "idle" | "working" | "done" | "error";

function UnsubscribeInner() {
  const params = useSearchParams();
  const email = params.get("e") ?? "";
  const token = params.get("t") ?? "";

  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  const unsubscribe = useCallback(async () => {
    setState("working");
    try {
      const response = await fetch("/api/outreach/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setMessage(payload?.error ?? "Le lien semble invalide.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setMessage("Impossible de joindre le serveur. Réessayez dans un instant.");
      setState("error");
    }
  }, [email, token]);

  // Acting on load keeps the promise made in the email: one click and it is done.
  useEffect(() => {
    if (email && token) void unsubscribe();
  }, [email, token, unsubscribe]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-light-bg dark:bg-dark-bg">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">
          {state === "done" ? "C'est fait" : "Désabonnement"}
        </h1>

        {state === "working" && (
          <p className="text-text-secondary">Traitement en cours…</p>
        )}

        {state === "done" && (
          <p className="text-text-secondary leading-relaxed">
            {email} ne recevra plus de messages de prospection de notre part. Merci
            de nous avoir prévenus — et désolé pour le dérangement.
          </p>
        )}

        {state === "error" && (
          <div className="text-text-secondary leading-relaxed space-y-4">
            <p>{message}</p>
            <p>
              Écrivez-nous directement à{" "}
              <a className="text-primary underline" href="mailto:postygroup@gmail.com">
                postygroup@gmail.com
              </a>{" "}
              et nous vous retirons de la liste à la main.
            </p>
          </div>
        )}

        {state === "idle" && !email && (
          <p className="text-text-secondary">
            Ce lien est incomplet. Répondez simplement « stop » à notre email et
            nous nous en occupons.
          </p>
        )}
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner />
    </Suspense>
  );
}
