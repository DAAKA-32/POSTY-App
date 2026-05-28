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
