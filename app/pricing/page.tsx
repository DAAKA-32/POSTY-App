"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  useEffect(() => {
    // Transfer query params to subscription page
    const redirect = searchParams.get("redirect");
    const reason = searchParams.get("reason");

    let targetUrl = "/subscription";
    const params = new URLSearchParams();

    if (redirect) params.append("redirect", redirect);
    if (reason) params.append("reason", reason);

    if (params.toString()) {
      targetUrl += `?${params.toString()}`;
    }

    router.replace(targetUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary">{t.landing.redirecting}</p>
      </div>
    </div>
  );
}
