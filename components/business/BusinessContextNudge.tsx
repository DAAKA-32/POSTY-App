"use client";

/**
 * One quiet line on the studio's empty state: shown only while the core
 * business fields (name, offer, ideal customer) are missing, and gone for good
 * once they are filled. Opens the same modal as the dashboard.
 */

import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { businessCompleteness, normalizeBusinessProfile } from "@/lib/business/profile";
import BusinessProfileModal from "./BusinessProfileModal";

const LABEL = {
  fr: "Ajoutez le contexte de votre entreprise : vos posts seront plus précis",
  en: "Add your business context so your posts are more precise",
};

export default function BusinessContextNudge() {
  const { userProfile } = useAuth();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const done = useMemo(() => {
    const c = businessCompleteness(normalizeBusinessProfile(userProfile?.profile?.business));
    return c.filledCore === c.totalCore;
  }, [userProfile]);

  // Wait for the profile so the line never flashes for users who already filled it.
  if (!userProfile || done) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 inline-flex items-center gap-2 min-h-[44px] px-3 text-sm text-text-secondary hover:text-text-primary underline-offset-4 hover:underline"
      >
        <Building2 aria-hidden className="w-4 h-4" />
        {language === "fr" ? LABEL.fr : LABEL.en}
      </button>
      <BusinessProfileModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
