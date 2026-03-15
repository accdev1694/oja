/**
 * Centralized AI usage tracking with cost estimation.
 *
 * Calculates estimated costs based on provider pricing:
 * - Gemini 2.5 Flash-Lite (AI Studio): $0.075/1M input, $0.30/1M output
 * - OpenAI gpt-4o-mini: $0.15/1M input, $0.60/1M output
 * - Azure TTS Neural: $16/1M characters
 *
 * Provider free tier limits (the real constraints):
 * - Gemini 2.5 Flash-Lite (AI Studio): 15 RPM, 1,000 RPD
 * - Azure TTS: 500K chars/month
 */

// Cost per 1M tokens (USD) — based on paid tier pricing for projections
const COST_TABLE = {
  gemini: { input: 0.075, output: 0.30 },
  openai: { input: 0.15, output: 0.60 },
  azure_tts: { perMillionChars: 16 },
} as const;

// Provider free tier limits — ENFORCED, not just tracked
export const PROVIDER_LIMITS = {
  gemini: {
    requestsPerMinute: 15,
    requestsPerDay: 1000,
    tokensPerMinute: 1_000_000,
  },
  openai: {
    /** Hard daily spend cap in USD. $0 = never use OpenAI (free tier only). */
    dailySpendCapUsd: 0,
  },
  azure_tts: {
    freeCharsPerMonth: 500_000,
  },
} as const;

export function calculateCostUsd(
  provider: "gemini" | "openai",
  inputTokens: number,
  outputTokens: number
) {
  const rates = COST_TABLE[provider];
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

export function calculateTtsCostUsd(characterCount: number) {
  return (characterCount * COST_TABLE.azure_tts.perMillionChars) / 1_000_000;
}

/**
 * Result returned by instrumented AI calls.
 * Every AI function should return this alongside its normal result.
 */
export interface AICallMetrics {
  provider: "gemini" | "openai";
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  isVision: boolean;
  isFallback: boolean;
}

/**
 * Build metrics from a Gemini response's usageMetadata.
 */
export function metricsFromGemini(
  usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined,
  isVision = false
): AICallMetrics {
  const inputTokens = usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;
  return {
    provider: "gemini",
    inputTokens,
    outputTokens,
    estimatedCostUsd: calculateCostUsd("gemini", inputTokens, outputTokens),
    isVision,
    isFallback: false,
  };
}

/**
 * Build metrics from an OpenAI response's usage.
 */
export function metricsFromOpenAI(
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined | null,
  isVision = false
): AICallMetrics {
  const inputTokens = usage?.prompt_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? 0;
  return {
    provider: "openai",
    inputTokens,
    outputTokens,
    estimatedCostUsd: calculateCostUsd("openai", inputTokens, outputTokens),
    isVision,
    isFallback: true,
  };
}
