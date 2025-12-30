"use client";

import { useState } from "react";
import { MockResponse } from "@/types";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

interface ResponseCardsProps {
  responses: MockResponse[];
}

export default function ResponseCards({ responses }: ResponseCardsProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast.success("Copie !");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full animate-fade-in-up">
      {responses.map((response, index) => (
        <div
          key={index}
          className="bg-dark-card border border-dark-border rounded-xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-2 border-b border-dark-border flex items-center justify-between">
            <span
              className={`
                text-xs font-medium px-2 py-1 rounded-full
                ${response.type === "storytelling"
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-blue-500/20 text-blue-400"
                }
              `}
            >
              {response.type === "storytelling" ? "Storytelling" : "Business"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(response.content, index)}
              className="!px-2 !py-1"
            >
              {copiedIndex === index ? (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </Button>
          </div>

          {/* Content */}
          <div className="px-4 py-3 max-h-60 overflow-y-auto">
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {response.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
