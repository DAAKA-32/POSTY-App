"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { SECTORS, LINKEDIN_STYLES, OBJECTIVES, TARGET_AUDIENCES, COMMUNICATION_TONES } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileFormData {
  displayName: string;
  bio: string;
  sector: string;
  role: string;
  linkedinStyle: string;
  objective: string;
  targetAudience: string;
  communicationTone: string;
}

interface ProfileEditFormProps {
  initialData: ProfileFormData;
  onSave: (data: ProfileFormData) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

// Rate-limit: minimum 30s between saves
const SAVE_COOLDOWN_MS = 30_000;

export default function ProfileEditForm({
  initialData,
  onSave,
  onCancel,
  isSaving = false,
}: ProfileEditFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>(initialData);
  const { t } = useLanguage();
  const lastSaveRef = useRef<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Anti-spam: enforce cooldown between saves
    const now = Date.now();
    const elapsed = now - lastSaveRef.current;
    if (elapsed < SAVE_COOLDOWN_MS) {
      const remaining = Math.ceil((SAVE_COOLDOWN_MS - elapsed) / 1000);
      setCooldownRemaining(remaining);
      // Auto-clear the message after the remaining time
      setTimeout(() => setCooldownRemaining(0), (SAVE_COOLDOWN_MS - elapsed));
      return;
    }

    lastSaveRef.current = now;
    setCooldownRemaining(0);
    await onSave(formData);
  }, [formData, onSave]);

  const updateField = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Reusable select field component
  const SelectField = ({
    label,
    value,
    onChange,
    options,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: readonly string[];
    placeholder?: string;
  }) => (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-text-secondary mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full px-4 py-3
          bg-white dark:bg-dark-elevated
          border border-gray-200 dark:border-dark-border
          rounded-xl
          text-gray-900 dark:text-text-primary
          focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_12px_rgba(232,147,77,0.1)]
          hover:border-gray-300 dark:hover:border-dark-hover
          transition-all duration-300
          appearance-none cursor-pointer
          select-with-arrow
        "
      >
        <option value="">{placeholder || t.profile.select}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onSubmit={handleSubmit}
      className="relative bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border hover:border-[#F8935D]/20 dark:hover:border-primary/20 rounded-2xl p-5 lg:p-6 transition-colors duration-300 shadow-sm dark:shadow-none"
    >
      {/* Premium gradient overlay */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#F8935D]/5 dark:bg-gradient-to-br dark:from-primary/20 dark:to-accent/10 border border-[#F8935D]/20 dark:border-primary/20 flex items-center justify-center shadow-sm">
          <svg className="w-5 h-5 text-primary dark:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-text-primary text-lg">{t.profile.editMyProfile}</h2>
          <p className="text-sm text-gray-500 dark:text-text-muted">{t.profile.customizeInfo}</p>
        </div>
      </div>

      {/* Form fields */}
      <div className="relative space-y-5">
        {/* Section: Basic info */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-dark-border">
            <span className="text-sm font-semibold text-gray-900 dark:text-text-primary uppercase tracking-wider">
              {t.profile.basicInfo}
            </span>
          </div>

          {/* Name */}
          <Input
            label={t.profile.nameLabel}
            value={formData.displayName}
            onChange={(e) => updateField("displayName", e.target.value)}
            placeholder={t.profile.namePlaceholder}
          />

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-text-secondary mb-2">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              placeholder={t.ui.describePlaceholder}
              rows={3}
              maxLength={160}
              className="
                w-full px-4 py-3
                bg-white dark:bg-dark-elevated
                border border-gray-200 dark:border-dark-border
                rounded-xl
                text-gray-900 dark:text-text-primary
                placeholder-gray-400 dark:placeholder-text-muted
                focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_12px_rgba(232,147,77,0.1)]
                hover:border-gray-300 dark:hover:border-dark-hover
                transition-all duration-300 resize-none
              "
            />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500 dark:text-text-muted">{t.profile.bioHelper}</span>
              <span className={`text-xs font-medium ${formData.bio.length >= 140 ? 'text-warning' : 'text-gray-500 dark:text-text-muted'}`}>
                {formData.bio.length}/160
              </span>
            </div>
          </div>
        </div>

        {/* Section: AI Personalization — all plans */}
        <div className="space-y-5 pt-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-dark-border">
            <span className="text-sm font-semibold text-gray-900 dark:text-text-primary uppercase tracking-wider">
              {t.profile.aiPersonalization}
            </span>
          </div>

          <p className="text-xs text-gray-500 dark:text-text-muted -mt-2">
            {t.profile.aiPersonalizationDesc}
          </p>

          {/* Role */}
          <Input
            label={t.profile.roleLabel}
            value={formData.role}
            onChange={(e) => updateField("role", e.target.value)}
            placeholder={t.profile.rolePlaceholder}
          />

          {/* Target Audience */}
          <SelectField
            label={t.profile.targetAudienceLabel}
            value={formData.targetAudience}
            onChange={(value) => updateField("targetAudience", value)}
            options={TARGET_AUDIENCES}
            placeholder={t.ui.targetAudience}
          />

          {/* Communication Tone */}
          <SelectField
            label={t.profile.communicationToneLabel}
            value={formData.communicationTone}
            onChange={(value) => updateField("communicationTone", value)}
            options={COMMUNICATION_TONES}
            placeholder={t.profile.communicationTonePlaceholder}
          />

          {/* Sector */}
          <SelectField
            label={t.profile.sectorLabel}
            value={formData.sector}
            onChange={(value) => updateField("sector", value)}
            options={SECTORS}
          />

          {/* LinkedIn Style */}
          <SelectField
            label={t.profile.linkedinStyleLabel}
            value={formData.linkedinStyle}
            onChange={(value) => updateField("linkedinStyle", value)}
            options={LINKEDIN_STYLES}
          />

          {/* Objective */}
          <SelectField
            label={t.profile.objectiveLabel}
            value={formData.objective}
            onChange={(value) => updateField("objective", value)}
            options={OBJECTIVES}
          />
        </div>

        {/* Cooldown warning */}
        {cooldownRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl"
          >
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t.profile.saveCooldown.replace("{n}", String(cooldownRemaining))}
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-dark-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="flex-1 hover:border-text-muted/30"
          >
            {t.common.cancel}
          </Button>
          <Button
            type="submit"
            isLoading={isSaving}
            disabled={cooldownRemaining > 0}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:shadow-glow"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t.profile.save}
          </Button>
        </div>
      </div>
    </motion.form>
  );
}
