"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export default function DashboardLoading() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">{t.common.loading}</p>
      </div>
    </div>
  );
}
