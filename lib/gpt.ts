/**
 * OpenAI API Integration (Prepared for future use)
 *
 * This file is prepared for integrating OpenAI's GPT API.
 * Currently using mock responses, but can be easily switched
 * to real AI generation by uncommenting and configuring.
 *
 * To enable:
 * 1. Add OPENAI_API_KEY to your .env.local
 * 2. Install openai package: npm install openai
 * 3. Uncomment the code below
 */

import { MockResponse } from "@/types";
import { getMockResponses } from "./mock-responses";

// ============== CONFIGURATION ==============

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// System prompts for different styles (used by OpenAI implementation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _SYSTEM_PROMPTS = {
  storytelling: `Tu es un expert en copywriting LinkedIn specialise dans le storytelling.
Tu crees des posts engageants qui racontent une histoire personnelle ou professionnelle.
Utilise des emotions, des retours d'experience et des lecons apprises.
Format: paragraphes courts, retours a la ligne, emojis moderes.
Termine par une question pour engager la conversation.
Inclus 3-5 hashtags pertinents a la fin.`,

  business: `Tu es un expert en copywriting LinkedIn specialise dans le contenu business.
Tu crees des posts professionnels, informatifs et axes sur la valeur.
Utilise des listes, des statistiques et des conseils pratiques.
Format: listes numerotees ou a puces, structure claire.
Termine par un call-to-action ou une question.
Inclus 3-5 hashtags pertinents a la fin.`,
};

// ============== TYPES ==============

interface GenerateOptions {
  prompt: string;
  userProfile?: {
    sector?: string;
    role?: string;
    linkedinStyle?: string;
    objective?: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _GeneratedPost {
  storytelling: string;
  business: string;
}

// ============== MOCK IMPLEMENTATION (CURRENT) ==============

export async function generateLinkedInPost(
  options: GenerateOptions
): Promise<MockResponse[]> {
  // Currently returns mock responses
  // Will be replaced with OpenAI API call when ready

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return getMockResponses(options.prompt);
}

// ============== OPENAI IMPLEMENTATION (FUTURE) ==============

/*
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export async function generateLinkedInPostWithAI(
  options: GenerateOptions
): Promise<GeneratedPost> {
  const { prompt, userProfile } = options;

  // Build context from user profile
  let context = "";
  if (userProfile) {
    context = `
Contexte de l'utilisateur:
- Secteur: ${userProfile.sector || "Non specifie"}
- Role: ${userProfile.role || "Non specifie"}
- Style prefere: ${userProfile.linkedinStyle || "Non specifie"}
- Objectif: ${userProfile.objective || "Non specifie"}
`;
  }

  // Generate storytelling version
  const storytellingResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.storytelling + context },
      { role: "user", content: `Cree un post LinkedIn sur le sujet suivant: ${prompt}` },
    ],
    temperature: 0.8,
    max_tokens: 500,
  });

  // Generate business version
  const businessResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.business + context },
      { role: "user", content: `Cree un post LinkedIn sur le sujet suivant: ${prompt}` },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return {
    storytelling: storytellingResponse.choices[0]?.message?.content || "",
    business: businessResponse.choices[0]?.message?.content || "",
  };
}

// API Route handler for server-side generation
export async function POST(request: Request) {
  try {
    const { prompt, userProfile } = await request.json();

    if (!prompt) {
      return Response.json(
        { error: "Le prompt est requis" },
        { status: 400 }
      );
    }

    const result = await generateLinkedInPostWithAI({ prompt, userProfile });

    return Response.json({
      responses: [
        {
          title: "Version Storytelling",
          content: result.storytelling,
          type: "storytelling",
        },
        {
          title: "Version Business",
          content: result.business,
          type: "business",
        },
      ],
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return Response.json(
      { error: "Erreur lors de la generation" },
      { status: 500 }
    );
  }
}
*/

// ============== UTILITY FUNCTIONS ==============

export function isOpenAIConfigured(): boolean {
  return !!OPENAI_API_KEY;
}

export function getAvailableModels() {
  return [
    { id: "gpt-4", name: "GPT-4", description: "Meilleure qualite, plus lent" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5", description: "Rapide, moins cher" },
  ];
}
