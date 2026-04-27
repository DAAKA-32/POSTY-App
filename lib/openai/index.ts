/**
 * OpenAI Module Exports
 */

export {
  OpenAIService,
  createOpenAIService,
  createUserOpenAIService,
  isOpenAIConfigured,
  isValidApiKeyFormat,
  getAvailableModels,
  SYSTEM_PROMPTS,
  INSIGHTS_PROMPT,
  ANALYSIS_PROMPT,
  PLATFORM_PROMPTS,
  IMPROVE_PROMPT,
  CONVERSATIONAL_PROMPT,
  ASSISTANT_PROMPT,
  INTENT_CLASSIFICATION_PROMPT,
  FILLER_PATTERNS,
} from "./service";

export type {
  OpenAIConfig,
  OpenAIModel,
  GeneratePostOptions,
  GenerateSeedCommentOptions,
  UserProfile,
  GeneratedPost,
  ChatMessage,
  ChatOptions,
  StreamCallbacks,
} from "./service";
