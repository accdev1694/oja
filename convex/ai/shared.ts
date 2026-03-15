import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { metricsFromGemini, metricsFromOpenAI } from "../lib/aiTracking";
import type { AICallMetrics } from "../lib/aiTracking";

export type { AICallMetrics };

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

/**
 * Retry wrapper for AI API calls with exponential backoff.
 * Handles rate limits (429) and transient errors with automatic retry.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  operationName: string,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    const isRateLimit =
      error?.status === 429 ||
      error?.message?.includes("429") ||
      error?.message?.includes("quota") ||
      error?.message?.includes("RESOURCE_EXHAUSTED") ||
      error?.message?.includes("Rate limit");

    const isTransientError =
      error?.message?.includes("UNAVAILABLE") ||
      error?.message?.includes("DEADLINE_EXCEEDED") ||
      error?.message?.includes("timeout") ||
      (error?.status ?? 0) >= 500;

    if (retries > 0 && (isRateLimit || isTransientError)) {
      const errorType = isRateLimit ? "Rate limit" : "Transient error";
      console.warn(`[${operationName}] ${errorType} hit, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, operationName, retries - 1, delay * 2);
    }

    throw error;
  }
}

/**
 * Result from an instrumented AI generation call.
 */
export interface InstrumentedResult<T> {
  result: T;
  metrics: AICallMetrics;
}

/**
 * Fallback wrapper that tries Gemini first and OpenAI second.
 * Returns the result along with provider metrics.
 */
export async function withAIFallbackInstrumented<T>(
  operationName: string,
  geminiFn: () => Promise<InstrumentedResult<T>>,
  openaiFn: () => Promise<InstrumentedResult<T>>
): Promise<InstrumentedResult<T>> {
  try {
    return await withRetry(geminiFn, operationName);
  } catch (geminiErr: unknown) {
    console.warn(`[${operationName}] Gemini failed permanently, falling back to OpenAI (gpt-4o-mini)...`);
    try {
      return await withRetry(openaiFn, `${operationName}_fallback_openai`);
    } catch (openaiErr: unknown) {
      const openaiError = openaiErr as Error;
      console.error(`[${operationName}] Both AI providers failed for ${operationName}.`);

      throw new Error(
        openaiError?.message?.includes("API key")
          ? "AI service configuration error. Please contact support."
          : "AI services temporarily unavailable. Please try again."
      );
    }
  }
}

/**
 * Run a prompt through Gemini and return result + metrics.
 */
export async function geminiGenerateInstrumented(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<InstrumentedResult<string>> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 4000,
    },
  });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const metrics = metricsFromGemini(response.usageMetadata);
  return { result: response.text().trim(), metrics };
}

/**
 * Run a prompt through OpenAI and return result + metrics.
 */
export async function openaiGenerateInstrumented(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<InstrumentedResult<string>> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4000,
  });
  const metrics = metricsFromOpenAI(response.usage);
  return { result: response.choices[0].message.content?.trim() || "", metrics };
}

/**
 * Run a prompt with an image through OpenAI and return result + metrics.
 */
export async function openaiVisionGenerateInstrumented(prompt: string, base64Image: string, options?: { temperature?: number; maxTokens?: number }): Promise<InstrumentedResult<string>> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
        ],
      },
    ],
    temperature: options?.temperature ?? 0.2,
    max_tokens: options?.maxTokens ?? 4000,
  });
  const metrics = metricsFromOpenAI(response.usage, true);
  return { result: response.choices[0].message.content?.trim() || "", metrics };
}

/**
 * Unified generation helper with fallback and instrumentation.
 */
export async function smartGenerateInstrumented(prompt: string, operationName: string, options?: { temperature?: number; maxTokens?: number }): Promise<InstrumentedResult<string>> {
  return await withAIFallbackInstrumented(
    operationName,
    async () => geminiGenerateInstrumented(prompt, options),
    async () => openaiGenerateInstrumented(prompt, options)
  );
}

/** Strip markdown code blocks from AI response */
export function stripCodeBlocks(text: string): string {
  if (text.startsWith("```json")) {
    return text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  }
  if (text.startsWith("```")) {
    return text.replace(/```\n?/g, "");
  }
  return text;
}
