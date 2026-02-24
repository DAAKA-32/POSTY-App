"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { SECTORS, LINKEDIN_STYLES, OBJECTIVES, TARGET_AUDIENCES, COMMUNICATION_TONES } from "@/types";
import { PlanType } from "@/lib/plans";

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
  currentPlan?: PlanType | null;
}

// Lock icon component
function LockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

// Premium badge component
function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-primary/20 to-accent/20 text-primary text-xs font-medium rounded-full border border-primary/30">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      Pro
    </span>
  );
}

// Locked field wrapper component
function LockedFieldWrapper({
  children,
  isLocked,
  label,
  requiredPlan = "Pro",
}: {
  children: React.ReactNode;
  isLocked: boolean;
  label: string;
  requiredPlan?: "Pro" | "Max";
}) {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Overlay - theme aware */}
      <div className="absolute inset-0 z-10 bg-gray-100/80 dark:bg-dark-bg/60 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center gap-2 cursor-not-allowed">
        <div className="flex items-center gap-2 text-gray-500 dark:text-text-muted">
          <LockIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Disponible avec le plan {requiredPlan}</span>
        </div>
      </div>
      {/* Disabled field underneath */}
      <div className="opacity-40 pointer-events-none">
        {children}
      </div>
    </div>
  );
}

export default function ProfileEditForm({
  initialData,
  onSave,
  onCancel,
  isSaving = false,
  currentPlan = null,
}: ProfileEditFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>(initialData);

  // Plan-based field access control
  const isMaxPlan = currentPlan === "max";
  const isProPlan = currentPlan === "pro";
  const canEditAdvancedFields = isProPlan || isMaxPlan;
  const isUnsubscribed = !currentPlan;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const updateField = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Select field component with optional locking
  const SelectField = ({
    label,
    value,
    onChange,
    options,
    placeholder = "Sélectionnez...",
    locked = false,
    showProBadge = false,
    requiredPlan = "Pro",
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: readonly string[];
    placeholder?: string;
    locked?: boolean;
    showProBadge?: boolean;
    requiredPlan?: "Pro" | "Max";
  }) => (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-text-secondary mb-2">
        {label}
        {showProBadge && <ProBadge />}
      </label>
      <LockedFieldWrapper isLocked={locked} label={label} requiredPlan={requiredPlan}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={locked}
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
            disabled:cursor-not-allowed disabled:opacity-50
            select-with-arrow
          "
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </LockedFieldWrapper>
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

      {/* Header - Premium style */}
      <div className="relative flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#F8935D]/5 dark:bg-gradient-to-br dark:from-primary/20 dark:to-accent/10 border border-[#F8935D]/20 dark:border-primary/20 flex items-center justify-center shadow-sm">
          <svg className="w-5 h-5 text-primary dark:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-text-primary text-lg">Modifier mon profil</h2>
          <p className="text-sm text-gray-500 dark:text-text-muted">Personnalisez vos informations</p>
        </div>
      </div>

      {/* Form fields */}
      <div className="relative space-y-5">
        {/* Section: Informations de base (tous les plans) */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-dark-border">
            <span className="text-sm font-semibold text-gray-900 dark:text-text-primary uppercase tracking-wider">
              Informations de base
            </span>
            <span className="text-xs text-gray-500 dark:text-text-muted">(Tous les plans)</span>
          </div>

          {/* Name - Always editable */}
          <Input
            label="Prénom / Nom"
            value={formData.displayName}
            onChange={(e) => updateField("displayName", e.target.value)}
            placeholder="Votre nom"
          />

          {/* Bio - Always editable */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-text-secondary mb-2">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              placeholder="Décrivez-vous en quelques mots..."
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
              <span className="text-xs text-gray-500 dark:text-text-muted">Quelques mots pour vous présenter</span>
              <span className={`text-xs font-medium ${formData.bio.length >= 140 ? 'text-warning' : 'text-gray-500 dark:text-text-muted'}`}>
                {formData.bio.length}/160
              </span>
            </div>
          </div>
        </div>

        {/* Section: Personnalisation IA (Pro/Max uniquement) */}
        <div className="space-y-5 pt-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-text-primary uppercase tracking-wider">
                Personnalisation IA
              </span>
              <ProBadge />
            </div>
            {isUnsubscribed && (
              <Link
                href="/pricing"
                className="text-xs text-primary dark:text-primary hover:text-primary-hover dark:hover:text-accent transition-colors flex items-center gap-1"
              >
                <span>Passer à Pro</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>

          {/* Info banner for unsubscribed users */}
          {isUnsubscribed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 bg-[#F8935D]/5 dark:bg-primary/5 border border-[#F8935D]/20 dark:border-primary/20 rounded-xl"
            >
              <div className="w-8 h-8 rounded-lg bg-[#F8935D]/10 dark:bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-primary dark:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-text-primary font-medium mb-1">
                  Débloquez la personnalisation IA
                </p>
                <p className="text-xs text-gray-600 dark:text-text-muted mb-2">
                  Avec le plan Pro, l&apos;IA adapte ses réponses à votre secteur, votre rôle, votre audience et votre ton.
                  Vos posts seront plus pertinents et engageants.
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary dark:text-primary hover:text-primary-hover dark:hover:text-accent transition-colors"
                >
                  <span>Découvrir le plan Pro</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Role - Pro & Max only */}
          <LockedFieldWrapper isLocked={isUnsubscribed} label="Rôle / Métier" requiredPlan="Pro">
            <Input
              label="Rôle / Métier"
              value={formData.role}
              onChange={(e) => updateField("role", e.target.value)}
              placeholder="Ex: Chef de projet, Développeur..."
              disabled={isUnsubscribed}
            />
          </LockedFieldWrapper>

          {/* Target Audience - Pro & Max only */}
          <SelectField
            label="Audience ciblée"
            value={formData.targetAudience}
            onChange={(value) => updateField("targetAudience", value)}
            options={TARGET_AUDIENCES}
            placeholder="À qui parlez-vous ?"
            locked={isUnsubscribed}
            requiredPlan="Pro"
          />

          {/* Communication Tone - Pro & Max only */}
          <SelectField
            label="Ton de communication"
            value={formData.communicationTone}
            onChange={(value) => updateField("communicationTone", value)}
            options={COMMUNICATION_TONES}
            placeholder="Comment souhaitez-vous communiquer ?"
            locked={isUnsubscribed}
            requiredPlan="Pro"
          />

          {/* Sector - Max only */}
          <SelectField
            label="Secteur d'activité"
            value={formData.sector}
            onChange={(value) => updateField("sector", value)}
            options={SECTORS}
            locked={!isMaxPlan}
            requiredPlan="Max"
          />

          {/* LinkedIn Style - Max only */}
          <SelectField
            label="Style LinkedIn préféré"
            value={formData.linkedinStyle}
            onChange={(value) => updateField("linkedinStyle", value)}
            options={LINKEDIN_STYLES}
            locked={!isMaxPlan}
            requiredPlan="Max"
          />

          {/* Objective - Max only */}
          <SelectField
            label="Objectif principal"
            value={formData.objective}
            onChange={(value) => updateField("objective", value)}
            options={OBJECTIVES}
            locked={!isMaxPlan}
            requiredPlan="Max"
          />
        </div>

        {/* Actions - Premium styling */}
        <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-dark-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="flex-1 hover:border-text-muted/30"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            isLoading={isSaving}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:shadow-glow"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Enregistrer
          </Button>
        </div>
      </div>
    </motion.form>
  );
}
