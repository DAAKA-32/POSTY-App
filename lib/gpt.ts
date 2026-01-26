/**
 * OpenAI GPT Integration for POSTY
 *
 * This file provides the main interface for AI-powered post generation.
 * Uses the OpenAI service when configured, falls back to mock responses.
 */

import { MockResponse } from "@/types";
import { getMockResponses } from "./mock-responses";
import {
  createOpenAIService,
  isOpenAIConfigured,
  getAvailableModels as getModels,
  SYSTEM_PROMPTS,
} from "./openai";

// Re-export for backwards compatibility
export { isOpenAIConfigured, SYSTEM_PROMPTS };
export const getAvailableModels = getModels;

// ============== TYPES ==============

export interface GenerateOptions {
  prompt: string;
  language?: "fr" | "en";
  userProfile?: {
    sector?: string;
    role?: string;
    linkedinStyle?: string;
    objective?: string;
  };
}

export interface GeneratedPost {
  storytelling: string;
  business: string;
}

// ============== MAIN GENERATION FUNCTION ==============

/**
 * Generate LinkedIn posts (mock or AI-powered)
 * Returns mock responses if OpenAI is not configured
 */
export async function generateLinkedInPost(
  options: GenerateOptions
): Promise<MockResponse[]> {
  const { prompt, language = "fr", userProfile } = options;

  // Check if OpenAI is configured
  if (isOpenAIConfigured()) {
    const service = createOpenAIService();

    if (service) {
      try {
        const results: MockResponse[] = [];

        // Generate storytelling version
        const storytellingContent = await generateWithAI(
          service,
          "storytelling",
          prompt,
          language,
          userProfile
        );
        results.push({
          title:
            language === "fr" ? "Version Storytelling" : "Storytelling Version",
          content: storytellingContent,
          type: "storytelling",
        });

        // Generate business version
        const businessContent = await generateWithAI(
          service,
          "business",
          prompt,
          language,
          userProfile
        );
        results.push({
          title: language === "fr" ? "Version Business" : "Business Version",
          content: businessContent,
          type: "business",
        });

        return results;
      } catch (error) {
        console.error("OpenAI generation failed, falling back to mock:", error);
        // Fall through to mock responses
      }
    }
  }

  // Fallback to mock responses
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return getMockResponses(prompt);
}

/**
 * Generate content using OpenAI (non-streaming)
 */
async function generateWithAI(
  service: NonNullable<ReturnType<typeof createOpenAIService>>,
  type: "storytelling" | "business",
  prompt: string,
  language: "fr" | "en",
  userProfile?: GenerateOptions["userProfile"]
): Promise<string> {
  const systemPrompt = buildSystemPrompt(type, language, userProfile);

  const response = await service["client"].chat.completions.create({
    model: service["model"],
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content:
          language === "fr"
            ? `Crée un post LinkedIn sur le sujet suivant: ${prompt}`
            : `Create a LinkedIn post about the following topic: ${prompt}`,
      },
    ],
    temperature: type === "storytelling" ? 0.8 : 0.7,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || "";
}

/**
 * Build system prompt with user context
 */
function buildSystemPrompt(
  type: "storytelling" | "business",
  language: "fr" | "en",
  userProfile?: GenerateOptions["userProfile"]
): string {
  let prompt = SYSTEM_PROMPTS[type][language];

  if (userProfile) {
    const contextLabels = {
      fr: {
        context: "Contexte de l'utilisateur",
        sector: "Secteur",
        role: "Rôle",
        style: "Style préféré",
        objective: "Objectif",
        notSpecified: "Non spécifié",
      },
      en: {
        context: "User context",
        sector: "Sector",
        role: "Role",
        style: "Preferred style",
        objective: "Objective",
        notSpecified: "Not specified",
      },
    };

    const labels = contextLabels[language];

    prompt += `\n\n${labels.context}:
- ${labels.sector}: ${userProfile.sector || labels.notSpecified}
- ${labels.role}: ${userProfile.role || labels.notSpecified}
- ${labels.style}: ${userProfile.linkedinStyle || labels.notSpecified}
- ${labels.objective}: ${userProfile.objective || labels.notSpecified}`;
  }

  return prompt;
}

// ============== STREAMING GENERATION ==============

/**
 * Generate LinkedIn posts with streaming (for real-time UI updates)
 * Use the /api/generate endpoint instead for full streaming support
 */
export async function* generateLinkedInPostStream(
  options: GenerateOptions
): AsyncGenerator<{
  type: "storytelling" | "business";
  chunk: string;
  done: boolean;
}> {
  const { prompt, language = "fr", userProfile } = options;

  if (!isOpenAIConfigured()) {
    // For mock, yield complete content at once
    const responses = getMockResponses(prompt);
    for (const response of responses) {
      yield {
        type: response.type as "storytelling" | "business",
        chunk: response.content,
        done: true,
      };
    }
    return;
  }

  const service = createOpenAIService();
  if (!service) {
    const responses = getMockResponses(prompt);
    for (const response of responses) {
      yield {
        type: response.type as "storytelling" | "business",
        chunk: response.content,
        done: true,
      };
    }
    return;
  }

  const types: Array<"storytelling" | "business"> = ["storytelling", "business"];

  for (const type of types) {
    const systemPrompt = buildSystemPrompt(type, language, userProfile);

    const stream = await service["client"].chat.completions.create({
      model: service["model"],
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            language === "fr"
              ? `Crée un post LinkedIn sur le sujet suivant: ${prompt}`
              : `Create a LinkedIn post about the following topic: ${prompt}`,
        },
      ],
      temperature: type === "storytelling" ? 0.8 : 0.7,
      max_tokens: 1000,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        yield { type, chunk: content, done: false };
      }
    }

    yield { type, chunk: "", done: true };
  }
}
