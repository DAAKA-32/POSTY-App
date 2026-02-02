"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile } from "@/lib/firestore";
import { uploadProfileImage } from "@/lib/storage";
import {
  PersonalBranding,
  ACCENT_COLOR_PRESETS,
  GRADIENT_PRESETS,
} from "@/types";
import {
  Camera,
  Image as ImageIcon,
  Palette,
  Link2,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Globe,
  Linkedin,
  Twitter,
  Github,
  Instagram,
  Youtube,
  Sparkles,
  Crown,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface PersonalBrandingSettingsProps {
  isPro?: boolean;
  onSave?: () => void;
}

export default function PersonalBrandingSettings({
  isPro = false,
  onSave,
}: PersonalBrandingSettingsProps) {
  const { userProfile, refreshUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Form state
  const [branding, setBranding] = useState<PersonalBranding>(
    userProfile?.branding || {}
  );

  // File upload refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Upload states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    try {
      setUploadingAvatar(true);
      const url = await uploadProfileImage(userProfile.id, file, "avatar");
      setBranding((prev) => ({ ...prev, customAvatarURL: url }));
      await saveField("customAvatarURL", url);
    } catch (error) {
      console.error("Error uploading avatar:", error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle cover upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    try {
      setUploadingCover(true);
      const url = await uploadProfileImage(userProfile.id, file, "cover");
      setBranding((prev) => ({ ...prev, coverImageURL: url }));
      await saveField("coverImageURL", url);
    } catch (error) {
      console.error("Error uploading cover:", error);
    } finally {
      setUploadingCover(false);
    }
  };

  // Save a single field
  const saveField = async (field: keyof PersonalBranding, value: unknown) => {
    if (!userProfile) return;

    try {
      await updateUserProfile(userProfile.id, {
        branding: {
          ...userProfile.branding,
          ...branding,
          [field]: value,
        },
      });
      await refreshUserProfile();
      showSaveMessage();
    } catch (error) {
      console.error("Error saving field:", error);
    }
  };

  // Save all branding settings
  const handleSaveAll = async () => {
    if (!userProfile) return;

    try {
      setIsLoading(true);
      await updateUserProfile(userProfile.id, {
        branding: branding,
      });
      await refreshUserProfile();
      showSaveMessage();
      onSave?.();
    } catch (error) {
      console.error("Error saving branding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const showSaveMessage = () => {
    setSaveMessage("Enregistre !");
    setTimeout(() => setSaveMessage(null), 2000);
  };

  // Get current avatar URL
  const currentAvatarURL =
    branding.customAvatarURL || userProfile?.photoURL || null;
  const currentCoverURL = branding.coverImageURL;

  // Get user initials for fallback
  const initials = userProfile?.displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#F8935D]" />
            Personal Branding
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Personnalisez votre identite visuelle
          </p>
        </div>
        {!isPro && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
            <Crown className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
              Pro
            </span>
          </div>
        )}
      </div>

      {/* Avatar Section */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar preview */}
          <div className="relative group">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-dark-border flex items-center justify-center"
              style={{
                background: branding.accentColor
                  ? `linear-gradient(135deg, ${branding.accentColor}20, ${branding.accentColor}10)`
                  : "linear-gradient(135deg, #F8935D20, #F76B5410)",
              }}
            >
              {currentAvatarURL ? (
                <img
                  src={currentAvatarURL}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="text-2xl font-bold"
                  style={{ color: branding.accentColor || "#F8935D" }}
                >
                  {initials}
                </span>
              )}
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#F8935D] text-white flex items-center justify-center shadow-lg hover:bg-[#F76B54] transition-colors"
              disabled={!isPro}
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={!isPro}
            />
          </div>

          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
              Photo de profil
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {isPro
                ? "Uploadez une photo personnalisee"
                : "Passez a Pro pour uploader une photo personnalisee"}
            </p>
            {branding.customAvatarURL && (
              <button
                onClick={() => {
                  setBranding((prev) => ({ ...prev, customAvatarURL: undefined }));
                  saveField("customAvatarURL", null);
                }}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Supprimer la photo personnalisee
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Cover Image Section */}
      <Card className="p-5">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-gray-400" />
          Image de couverture
        </h4>

        <div
          className="relative h-32 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 dark:border-dark-border cursor-pointer hover:border-[#F8935D] transition-colors group"
          onClick={() => isPro && coverInputRef.current?.click()}
          style={{
            background: currentCoverURL
              ? `url(${currentCoverURL}) center/cover`
              : branding.gradientPreset && GRADIENT_PRESETS[branding.gradientPreset as keyof typeof GRADIENT_PRESETS]
              ? `linear-gradient(135deg, ${GRADIENT_PRESETS[branding.gradientPreset as keyof typeof GRADIENT_PRESETS].start}, ${GRADIENT_PRESETS[branding.gradientPreset as keyof typeof GRADIENT_PRESETS].end})`
              : "linear-gradient(135deg, #F8935D20, #F76B5410)",
          }}
        >
          {uploadingCover && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          {!currentCoverURL && !uploadingCover && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2 group-hover:text-[#F8935D] transition-colors" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isPro ? "Cliquez pour ajouter une image" : "Pro requis"}
                </span>
              </div>
            </div>
          )}
          {currentCoverURL && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setBranding((prev) => ({ ...prev, coverImageURL: undefined }));
                saveField("coverImageURL", null);
              }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          className="hidden"
          disabled={!isPro}
        />
      </Card>

      {/* Accent Color Section */}
      <Card className="p-5">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4 text-gray-400" />
          Couleur d'accent
        </h4>

        <div className="grid grid-cols-5 gap-3">
          {ACCENT_COLOR_PRESETS.map((color) => (
            <button
              key={color.hex}
              onClick={() => {
                if (!isPro) return;
                setBranding((prev) => ({ ...prev, accentColor: color.hex }));
                saveField("accentColor", color.hex);
              }}
              className={`relative w-full aspect-square rounded-xl transition-transform hover:scale-105 ${
                branding.accentColor === color.hex
                  ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white"
                  : ""
              } ${!isPro ? "opacity-50 cursor-not-allowed" : ""}`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
              disabled={!isPro}
            >
              {branding.accentColor === color.hex && (
                <Check className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              )}
            </button>
          ))}
        </div>

        {isPro && (
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm text-gray-500 dark:text-gray-400">
              Personnalise :
            </label>
            <input
              type="color"
              value={branding.accentColor || "#F8935D"}
              onChange={(e) => {
                setBranding((prev) => ({ ...prev, accentColor: e.target.value }));
              }}
              onBlur={() => saveField("accentColor", branding.accentColor)}
              className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-200 dark:border-dark-border"
            />
          </div>
        )}
      </Card>

      {/* Gradient Preset Section */}
      <Card className="p-5">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          Style de gradient
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(GRADIENT_PRESETS).map(([key, gradient]) => (
            <button
              key={key}
              onClick={() => {
                if (!isPro) return;
                setBranding((prev) => ({
                  ...prev,
                  gradientPreset: key as PersonalBranding["gradientPreset"],
                }));
                saveField("gradientPreset", key);
              }}
              className={`relative h-16 rounded-xl transition-transform hover:scale-[1.02] ${
                branding.gradientPreset === key
                  ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white"
                  : ""
              } ${!isPro ? "opacity-50 cursor-not-allowed" : ""}`}
              style={{
                background: `linear-gradient(135deg, ${gradient.start}, ${gradient.end})`,
              }}
              disabled={!isPro}
            >
              <span className="absolute bottom-2 left-3 text-xs font-medium text-white drop-shadow">
                {gradient.name}
              </span>
              {branding.gradientPreset === key && (
                <Check className="w-4 h-4 text-white absolute top-2 right-2" />
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Tagline Section */}
      <Card className="p-5">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          Tagline professionnelle
        </h4>
        <input
          type="text"
          value={branding.tagline || ""}
          onChange={(e) =>
            setBranding((prev) => ({ ...prev, tagline: e.target.value }))
          }
          onBlur={() => saveField("tagline", branding.tagline)}
          placeholder="Ex: Expert LinkedIn | Coach en personal branding"
          maxLength={80}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F8935D]/50 focus:border-[#F8935D]"
          disabled={!isPro}
        />
        <p className="text-xs text-gray-400 mt-2">
          {(branding.tagline?.length || 0)}/80 caracteres
        </p>
      </Card>

      {/* Social Links Section */}
      <Card className="p-5">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-gray-400" />
          Liens sociaux
        </h4>

        <div className="space-y-3">
          {[
            { key: "website", icon: Globe, label: "Site web", placeholder: "https://monsite.com" },
            { key: "linkedin", icon: Linkedin, label: "LinkedIn", placeholder: "https://linkedin.com/in/..." },
            { key: "twitter", icon: Twitter, label: "Twitter/X", placeholder: "https://twitter.com/..." },
            { key: "github", icon: Github, label: "GitHub", placeholder: "https://github.com/..." },
            { key: "instagram", icon: Instagram, label: "Instagram", placeholder: "https://instagram.com/..." },
            { key: "youtube", icon: Youtube, label: "YouTube", placeholder: "https://youtube.com/..." },
          ].map((social) => (
            <div key={social.key} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-dark-hover flex items-center justify-center flex-shrink-0">
                <social.icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <input
                type="url"
                value={branding.socialLinks?.[social.key as keyof PersonalBranding["socialLinks"]] || ""}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    socialLinks: {
                      ...prev.socialLinks,
                      [social.key]: e.target.value,
                    },
                  }))
                }
                onBlur={() =>
                  saveField("socialLinks", branding.socialLinks)
                }
                placeholder={social.placeholder}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8935D]/50 focus:border-[#F8935D]"
                disabled={!isPro}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Visibility Settings */}
      <Card className="p-5">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-gray-400" />
          Visibilite du profil
        </h4>

        <div className="space-y-3">
          {[
            { key: "showStats", label: "Afficher les statistiques", default: true },
            { key: "showSocialLinks", label: "Afficher les liens sociaux", default: true },
            { key: "showBio", label: "Afficher la bio", default: true },
            { key: "showSector", label: "Afficher le secteur", default: true },
          ].map((option) => (
            <label
              key={option.key}
              className={`flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-hover transition-colors ${
                !isPro ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {option.label}
              </span>
              <div
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  (branding.visibility?.[option.key as keyof PersonalBranding["visibility"]] ?? option.default)
                    ? "bg-[#F8935D]"
                    : "bg-gray-200 dark:bg-dark-hover"
                }`}
                onClick={() => {
                  if (!isPro) return;
                  const currentValue =
                    branding.visibility?.[option.key as keyof PersonalBranding["visibility"]] ?? option.default;
                  setBranding((prev) => ({
                    ...prev,
                    visibility: {
                      ...prev.visibility,
                      [option.key]: !currentValue,
                    },
                  }));
                  saveField("visibility", {
                    ...branding.visibility,
                    [option.key]: !currentValue,
                  });
                }}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    (branding.visibility?.[option.key as keyof PersonalBranding["visibility"]] ?? option.default)
                      ? "translate-x-5"
                      : ""
                  }`}
                />
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4">
        <AnimatePresence>
          {saveMessage && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
            >
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">{saveMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="primary"
          onClick={handleSaveAll}
          disabled={isLoading || !isPro}
          isLoading={isLoading}
        >
          {isPro ? "Enregistrer tout" : "Passer a Pro"}
        </Button>
      </div>

      {/* Pro upsell */}
      {!isPro && (
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                Debloquez le Personal Branding complet
              </p>
              <p className="text-xs text-violet-600/80 dark:text-violet-400/80 mt-1">
                Passez a Pro pour personnaliser votre avatar, couleurs, gradient,
                liens sociaux et plus encore.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
