"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PricingPage() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    // Redirect to the main subscription page
    router.replace("/subscription");
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary">{t.landing.redirecting}</p>
      </div>
    </div>
  );
}
