"use client";

import MainLayout from "@/components/layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Route-level loading state for pages that render inside <MainLayout>
 * (schedule, history, analytics).
 *
 * The old loading.tsx files were a bare spinner on a transparent page: leaving
 * /app for one of these routes threw the sidebar and the ambient gradient away
 * (flat near-white screen), then the real page mounted them again — the white
 * flash. Rendering the same shell here makes the swap a content change only.
 */
export default function RouteLoadingShell() {
  const { t } = useLanguage();
  return (
    <MainLayout showMobileHeader={true}>
      <div role="status" aria-live="polite" className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">{t.common.loading}</p>
      </div>
    </MainLayout>
  );
}
