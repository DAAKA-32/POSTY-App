"use client";

import { useState } from "react";
import { useOpenAIConfig } from "@/hooks/useOpenAI";
import { Key, Eye, EyeOff, Check, X, Loader2, Trash2 } from "lucide-react";

interface OpenAISettingsProps {
  language?: "fr" | "en";
}

const translations = {
  fr: {
    title: "Configuration OpenAI",
    description:
      "Ajoutez votre clé API OpenAI pour activer la génération de posts avec IA.",
    apiKeyLabel: "Clé API OpenAI",
    apiKeyPlaceholder: "sk-...",
    apiKeyHint: "Votre clé est stockée localement et n'est jamais partagée.",
    modelLabel: "Modèle",
    validating: "Validation...",
    valid: "Clé valide",
    invalid: "Clé invalide",
    save: "Enregistrer",
    clear: "Supprimer la clé",
    globalConfigured: "Une clé globale est configurée sur le serveur.",
    getKey: "Obtenez votre clé sur",
  },
  en: {
    title: "OpenAI Configuration",
    description: "Add your OpenAI API key to enable AI-powered post generation.",
    apiKeyLabel: "OpenAI API Key",
    apiKeyPlaceholder: "sk-...",
    apiKeyHint: "Your key is stored locally and never shared.",
    modelLabel: "Model",
    validating: "Validating...",
    valid: "Valid key",
    invalid: "Invalid key",
    save: "Save",
    clear: "Delete key",
    globalConfigured: "A global key is configured on the server.",
    getKey: "Get your key at",
  },
};

export default function OpenAISettings({ language = "fr" }: OpenAISettingsProps) {
  const {
    apiKey,
    setApiKey,
    clearApiKey,
    model,
    setModel,
    isValidating,
    isValid,
    status,
  } = useOpenAIConfig();

  const [inputValue, setInputValue] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const t = translations[language];

  const handleSave = () => {
    setApiKey(inputValue);
  };

  const handleClear = () => {
    setInputValue("");
    clearApiKey();
  };

  const models = status?.models || [
    { id: "gpt-4", name: "GPT-4", description: "Best quality" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "Faster" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5", description: "Cost-effective" },
  ];

  return (
    <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
          <Key className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{t.title}</h3>
          <p className="text-sm text-text-secondary">{t.description}</p>
        </div>
      </div>

      {status?.configured && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-400 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {t.globalConfigured}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* API Key Input */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {t.apiKeyLabel}
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t.apiKeyPlaceholder}
              className="w-full px-4 py-3 bg-dark-hover border border-dark-border rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary pr-24"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-2 text-text-secondary hover:text-white transition-colors"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
              {isValidating && (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              )}
              {!isValidating && isValid === true && (
                <Check className="w-4 h-4 text-green-400" />
              )}
              {!isValidating && isValid === false && (
                <X className="w-4 h-4 text-red-400" />
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {t.apiKeyHint}{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t.getKey} platform.openai.com
            </a>
          </p>
          {isValidating && (
            <p className="mt-1 text-xs text-primary">{t.validating}</p>
          )}
          {!isValidating && isValid === true && (
            <p className="mt-1 text-xs text-green-400">{t.valid}</p>
          )}
          {!isValidating && isValid === false && (
            <p className="mt-1 text-xs text-red-400">{t.invalid}</p>
          )}
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {t.modelLabel}
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-3 bg-dark-hover border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary appearance-none cursor-pointer"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} - {m.description}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!inputValue || isValidating || inputValue === apiKey}
            className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-dark-hover disabled:text-text-muted text-white font-medium rounded-lg transition-colors"
          >
            {t.save}
          </button>
          {apiKey && (
            <button
              onClick={handleClear}
              className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {t.clear}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
