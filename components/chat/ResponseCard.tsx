"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import toast from "react-hot-toast";

interface ResponseCardProps {
  title?: string;
  content: string;
  type: "storytelling" | "business";
  onSelect?: () => void;
  isSelected?: boolean;
  onCopy?: () => void;
  onPublishToLinkedIn?: () => void;
  showLinkedInButton?: boolean;
}

export default function ResponseCard({
  title,
  content,
  type,
  onSelect,
  isSelected = false,
  onCopy,
  onPublishToLinkedIn,
  showLinkedInButton = false,
}: ResponseCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copie !");
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  const typeStyles = {
    storytelling: {
      badge: "bg-purple-500/20 text-purple-400 border-purple-500/50",
      border: isSelected ? "border-purple-500" : "border-dark-border",
    },
    business: {
      badge: "bg-blue-500/20 text-blue-400 border-blue-500/50",
      border: isSelected ? "border-blue-500" : "border-dark-border",
    },
  };

  return (
    <Card
      className={`
        relative h-full flex flex-col
        ${typeStyles[type].border}
        ${isSelected ? "ring-2 ring-offset-2 ring-offset-dark-bg" : ""}
        ${type === "storytelling" ? (isSelected ? "ring-purple-500" : "") : ""}
        ${type === "business" ? (isSelected ? "ring-blue-500" : "") : ""}
      `}
      padding="none"
    >
      {/* Header */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`
                px-2 py-0.5 text-xs font-medium rounded-full border
                ${typeStyles[type].badge}
              `}
            >
              {type === "storytelling" ? "Storytelling" : "Business"}
            </span>
            {title && <h3 className="font-medium text-white">{title}</h3>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto max-h-[400px]">
        <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
          {content}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-dark-border flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="flex-1"
        >
          {copied ? (
            <>
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copie !
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copier
            </>
          )}
        </Button>
        {showLinkedInButton && onPublishToLinkedIn && (
          <Button
            size="sm"
            onClick={onPublishToLinkedIn}
            className="flex-1 bg-[#0A66C2] hover:bg-[#004182] border-none"
          >
            <LinkedInIcon className="w-4 h-4 mr-1" />
            Publier
          </Button>
        )}
        {onSelect && (
          <Button
            variant={isSelected ? "primary" : "ghost"}
            size="sm"
            onClick={onSelect}
            className="flex-1"
          >
            {isSelected ? "Selectionne" : "Choisir"}
          </Button>
        )}
      </div>
    </Card>
  );
}
