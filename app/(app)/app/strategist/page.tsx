"use client";

/**
 * /app/strategist — Posty Stratège as a full workspace.
 *
 * Lives under /app so it is rendered by the SAME persistent shell as the post
 * studio (app/(app)/app/AppShell.tsx): sidebar and gradient never unmount when
 * the user switches Posty Post ⇄ Posty Stratège, and back / reload / deep links
 * work like any page. Same layout recipe as /app: desktop renders inline in the
 * shell; mobile portals under <body> below the fixed 56px header so the
 * composer anchors to the viewport and can follow the keyboard.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { useKeyboardHeight } from "@/hooks/input/useKeyboardHeight";
import { usePageTitle } from "@/hooks/ui/usePageTitle";
import { isStrategistEnabled } from "@/lib/config/feature-flags";

// Heavy (chat, plan cards, settings): loaded on demand, never in the shell.
const StrategistWorkspace = dynamic(
  () => import("@/components/strategist/StrategistWorkspace"),
  { ssr: false, loading: () => <WorkspaceSkeleton /> }
);

const MOBILE_QUERY = "(max-width: 1023px)";

function WorkspaceSkeleton() {
  return (
    <div className="flex h-full items-center justify-center" role="status" aria-label="…">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin motion-reduce:animate-none" />
    </div>
  );
}

function MobileStrategistPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { keyboardHeight } = useKeyboardHeight();
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div
      data-mobile-page-portal=""
      className="lg:hidden fixed left-0 right-0 bottom-0 z-30 overflow-hidden bg-white dark:bg-dark-card"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 56px)",
        // The virtual keyboard shrinks the visual viewport but not the layout
        // viewport: pad the bottom so the composer stays above the keyboard.
        paddingBottom: keyboardHeight > 0 ? keyboardHeight : "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {children}
    </div>,
    document.body
  );
}

function StrategistRoute() {
  const router = useRouter();
  const enabled = isStrategistEnabled();
  usePageTitle("strategist");

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Gated off: a direct URL must not surface a feature that isn't exposed.
  useEffect(() => {
    if (!enabled) router.replace("/app");
  }, [enabled, router]);

  if (!enabled) return null;

  return isMobile ? (
    <MobileStrategistPortal>
      <StrategistWorkspace />
    </MobileStrategistPortal>
  ) : (
    <div className="flex h-full w-full min-h-0 flex-col">
      <StrategistWorkspace />
    </div>
  );
}

export default function StrategistPage() {
  return (
    <ProtectedRoute requireOnboarding requireSubscription>
      <StrategistRoute />
    </ProtectedRoute>
  );
}
