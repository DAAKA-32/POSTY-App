"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { SECTORS, LINKEDIN_STYLES, OBJECTIVES } from "@/types";

interface ProfileFormData {
  displayName: string;
  bio: string;
  sector: string;
  role: string;
  linkedinStyle: string;
  objective: string;
}

interface ProfileEditFormProps {
  initialData: ProfileFormData;
  onSave: (data: ProfileFormData) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function ProfileEditForm({
  initialData,
  onSave,
  onCancel,
  isSaving = false,
}: ProfileEditFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const updateField = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onSubmit={handleSubmit}
      className="bg-dark-card border border-dark-border rounded-2xl p-5 lg:p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-white text-lg">Modifier mon profil</h2>
          <p className="text-sm text-text-muted">Personnalisez vos informations</p>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-5">
        {/* Name */}
        <Input
          label="Nom complet"
          value={formData.displayName}
          onChange={(e) => updateField("displayName", e.target.value)}
          placeholder="Votre nom"
        />

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Bio
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => updateField("bio", e.target.value)}
            placeholder="Decrivez-vous en quelques mots..."
            rows={3}
            maxLength={160}
            className="
              w-full px-4 py-3
              bg-dark-elevated border border-dark-border
              rounded-xl text-white placeholder-text-muted
              focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
              transition-all duration-200 resize-none
            "
          />
          <div className="flex justify-end mt-1">
            <span className="text-xs text-text-muted">
              {formData.bio.length}/160
            </span>
          </div>
        </div>

        {/* Role */}
        <Input
          label="Role / Metier"
          value={formData.role}
          onChange={(e) => updateField("role", e.target.value)}
          placeholder="Ex: Chef de projet, Developpeur..."
        />

        {/* Sector */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Secteur d&apos;activite
          </label>
          <select
            value={formData.sector}
            onChange={(e) => updateField("sector", e.target.value)}
            className="
              w-full px-4 py-3
              bg-dark-elevated border border-dark-border
              rounded-xl text-white
              focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
              transition-all duration-200
              appearance-none cursor-pointer
            "
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              backgroundSize: "20px",
            }}
          >
            <option value="">Selectionnez...</option>
            {SECTORS.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </div>

        {/* LinkedIn Style */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Style LinkedIn prefere
          </label>
          <select
            value={formData.linkedinStyle}
            onChange={(e) => updateField("linkedinStyle", e.target.value)}
            className="
              w-full px-4 py-3
              bg-dark-elevated border border-dark-border
              rounded-xl text-white
              focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
              transition-all duration-200
              appearance-none cursor-pointer
            "
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              backgroundSize: "20px",
            }}
          >
            <option value="">Selectionnez...</option>
            {LINKEDIN_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </div>

        {/* Objective */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Objectif principal
          </label>
          <select
            value={formData.objective}
            onChange={(e) => updateField("objective", e.target.value)}
            className="
              w-full px-4 py-3
              bg-dark-elevated border border-dark-border
              rounded-xl text-white
              focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
              transition-all duration-200
              appearance-none cursor-pointer
            "
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              backgroundSize: "20px",
            }}
          >
            <option value="">Selectionnez...</option>
            {OBJECTIVES.map((objective) => (
              <option key={objective} value={objective}>
                {objective}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            isLoading={isSaving}
            className="flex-1"
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </motion.form>
  );
}
