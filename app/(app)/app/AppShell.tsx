"use client";

import type { ReactNode } from "react";
import MainLayout from "@/components/layout/MainLayout";

/**
 * Persistent shell for the /app/* route tree. Mounted once by app/app/layout.tsx
 * and preserved by the Next.js App Router across the /app ⇄ /app/c/[id]
 * transition — the sidebar, gradient ambient, and main scroll container
 * therefore never unmount, never refetch, never replay their entrance
 * animation. This single change is what kills the "screen goes empty for
 * a beat then re-renders" symptom users saw the moment an AI response
 * finished and the router replaced /app with /app/c/<id>.
 *
 * Pages under /app/* render the conversation content as children — they
 * MUST NOT wrap themselves in <MainLayout> any longer.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  return <MainLayout showMobileHeader={true}>{children}</MainLayout>;
}
