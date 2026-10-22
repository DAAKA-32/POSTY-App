"use client";

/**
 * BusinessProfileModal — progressive capture of the business context.
 *
 * Nothing is required: the modal can be closed ("Later") at any time and
 * reopened from the marketing overview. Only the three core fields (name,
 * offer, ideal customer) feed the completeness meter; everything else is a
 * refinement. Saved to users/{uid}.profile.business via saveBusinessProfile.
 */

import { useEffect, useId, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import toast from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { saveBusinessProfile } from "@/lib/db/firestore";
import { trackEvent } from "@/lib/analytics/tracker";
import { useBusinessCopy } from "@/lib/business/copy";
import {
  BUSINESS_FIELDS,
  businessCompleteness,
  normalizeBusinessProfile,
  type BusinessProfile,
} from "@/lib/business/profile";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the saved profile after a successful write. */
  onSaved?: (business: BusinessProfile) => void;
}

const fieldClass =
  "w-full rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-elevated px-3 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

export default function BusinessProfileModal({ isOpen, onClose, onSaved }: Props) {
  const { c } = useBusinessCopy();
  const { user, userProfile, refreshUserProfile } = useAuth();
  const baseId = useId();
  const saved = useMemo(() => normalizeBusinessProfile(userProfile?.profile?.business), [userProfile]);
  const [draft, setDraft] = useState<BusinessProfile>(saved);
  const [saving, setSaving] = useState(false);

  // Re-sync whenever the modal opens (or the stored profile changes underneath).
  useEffect(() => {
    if (isOpen) setDraft(saved);
  }, [isOpen, saved]);

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const before = businessCompleteness(saved);
      const next = await saveBusinessProfile(user.uid, draft);
      const after = businessCompleteness(next);
      // Milestone fires once, on the save that completes the core fields.
      if (after.filledCore === after.totalCore && before.filledCore < before.totalCore) {
        void trackEvent("business_profile_completed");
      }
      await refreshUserProfile();
      toast.success(c.modal.saved);
      onSaved?.(next);
      onClose();
    } catch (error) {
      console.error("saveBusinessProfile failed:", error);
      toast.error(c.modal.saveFail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={c.modal.title}
      description={c.modal.description}
      size="lg"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {c.modal.cancel}
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={saving} loadingText={c.modal.saving}>
            {c.modal.save}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">{c.modal.description}</p>
        {BUSINESS_FIELDS.map(({ key, max, multiline, core }) => {
          const copy = c.fields[key] as { label: string; placeholder: string; hint?: string };
          const id = `${baseId}-${key}`;
          const value = draft[key] ?? "";
          return (
            <div key={key}>
              <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-[14px] font-medium text-gray-900 dark:text-white">
                <span>{copy.label}</span>
                {!core && <span className="text-xs font-normal text-gray-500">{c.modal.optional}</span>}
              </label>
              {multiline ? (
                <textarea
                  id={id}
                  value={value}
                  rows={2}
                  maxLength={max}
                  placeholder={copy.placeholder}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  className={`${fieldClass} resize-y`}
                  style={{ fontSize: "max(16px, 1rem)" }}
                />
              ) : (
                <input
                  id={id}
                  type={key === "website" ? "url" : "text"}
                  value={value}
                  maxLength={max}
                  placeholder={copy.placeholder}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  className={fieldClass}
                  style={{ fontSize: "max(16px, 1rem)" }}
                />
              )}
              {copy.hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{copy.hint}</p>}
            </div>
          );
        })}
        <p className="text-xs text-gray-500 dark:text-gray-400">{c.modal.privacy}</p>
      </div>
    </Modal>
  );
}
