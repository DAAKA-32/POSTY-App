/**
 * Per-model OpenAI pricing table (USD per 1M tokens).
 * Source: https://openai.com/api/pricing/ — keep in sync when prices change.
 *
 * Image generation is billed per image (not per token); listed separately.
 *
 * Unknown models fall back to GPT-4o pricing so we never silently lose a cost.
 */

export type AIProvider = "openai" | "anthropic" | "unknown";

export interface ModelPricing {
  /** Friendly display label */
  label: string;
  provider: AIProvider;
  /** USD per 1 million input tokens */
  inputPerMillion: number;
  /** USD per 1 million output tokens */
  outputPerMillion: number;
  /** Optional: USD per cached input token (gpt-4o family supports prompt caching) */
  cachedInputPerMillion?: number;
}

/**
 * Canonical pricing. Keys must match the exact `model` string passed to OpenAI.
 * When you add a new model in a route, add it here too.
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // GPT-4 family
  "gpt-4": {
    label: "GPT-4",
    provider: "openai",
    inputPerMillion: 30.0,
    outputPerMillion: 60.0,
  },
  "gpt-4-turbo": {
    label: "GPT-4 Turbo",
    provider: "openai",
    inputPerMillion: 10.0,
    outputPerMillion: 30.0,
  },
  "gpt-4-turbo-preview": {
    label: "GPT-4 Turbo Preview",
    provider: "openai",
    inputPerMillion: 10.0,
    outputPerMillion: 30.0,
  },

  // GPT-4o family
  "gpt-4o": {
    label: "GPT-4o",
    provider: "openai",
    inputPerMillion: 2.5,
    outputPerMillion: 10.0,
    cachedInputPerMillion: 1.25,
  },
  "gpt-4o-2024-08-06": {
    label: "GPT-4o (2024-08-06)",
    provider: "openai",
    inputPerMillion: 2.5,
    outputPerMillion: 10.0,
    cachedInputPerMillion: 1.25,
  },
  "gpt-4o-mini": {
    label: "GPT-4o mini",
    provider: "openai",
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
    cachedInputPerMillion: 0.075,
  },
  // Legacy web-search model (fallback path). Token rates match gpt-4o-mini; the
  // fixed per-call web_search tool fee is added via the costUSD override at the
  // call site (realtime-context.ts), so it's no longer billed as gpt-4o nor $0.
  "gpt-4o-mini-search-preview": {
    label: "GPT-4o mini (web search)",
    provider: "openai",
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
  },

  // Audio transcription (Whisper / gpt-4o-transcribe family).
  // gpt-4o-transcribe is billed per token (audio input + text output); the
  // usage object returned by the API carries the token counts we log here.
  // Prices per OpenAI's published rates — keep in sync when they change.
  "gpt-4o-transcribe": {
    label: "GPT-4o Transcribe",
    provider: "openai",
    inputPerMillion: 6.0, // audio input tokens
    outputPerMillion: 10.0,
  },
  "gpt-4o-mini-transcribe": {
    label: "GPT-4o mini Transcribe",
    provider: "openai",
    inputPerMillion: 3.0,
    outputPerMillion: 5.0,
  },
  "whisper-1": {
    // Whisper is billed per minute ($0.006/min), not per token. We log a
    // synthetic token-equivalent cost via costUSD at the call site instead,
    // but keep an entry so getPricing() never falls back to GPT-4o for it.
    label: "Whisper",
    provider: "openai",
    inputPerMillion: 0,
    outputPerMillion: 0,
  },

  // GPT-3.5
  "gpt-3.5-turbo": {
    label: "GPT-3.5 Turbo",
    provider: "openai",
    inputPerMillion: 0.5,
    outputPerMillion: 1.5,
  },
  "gpt-3.5-turbo-0125": {
    label: "GPT-3.5 Turbo (0125)",
    provider: "openai",
    inputPerMillion: 0.5,
    outputPerMillion: 1.5,
  },
};

/** Fallback used when we encounter a model not listed above. Conservative: bills as GPT-4o. */
const FALLBACK_PRICING: ModelPricing = {
  label: "Unknown (billed as GPT-4o)",
  provider: "unknown",
  inputPerMillion: 2.5,
  outputPerMillion: 10.0,
};

export function getPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] || FALLBACK_PRICING;
}

/**
 * Compute estimated cost in USD for a single call.
 * Returns a precise float — callers round to 6 decimals at storage time.
 */
export function estimateCostUSD(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0
): number {
  const pricing = getPricing(model);
  const freshInput = Math.max(0, inputTokens - cachedInputTokens);
  const inputCost = (freshInput / 1_000_000) * pricing.inputPerMillion;
  const cachedCost = pricing.cachedInputPerMillion
    ? (cachedInputTokens / 1_000_000) * pricing.cachedInputPerMillion
    : (cachedInputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  return inputCost + cachedCost + outputCost;
}

/**
 * Image generation is billed per image, not per token. We approximate the
 * effective cost so admins can see image spend alongside text. Adjust when
 * the team switches providers (DALL·E 3, gpt-image-1, etc.).
 */
export const IMAGE_GEN_COST_USD_PER_VARIANT = 0.04;

export function estimateImageCostUSD(variants: number): number {
  return Math.max(0, variants) * IMAGE_GEN_COST_USD_PER_VARIANT;
}
