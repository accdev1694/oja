/**
 * Matcher - Core matching orchestration and mapping learning
 *
 * Coordinates multi-signal matching between receipt items and candidates,
 * and manages store-specific learned mappings.
 */

import type { QueryCtx, MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { isDuplicateItemName } from "../fuzzyMatch";
import { tokenize } from "./tokenization";
import { calculateMatchScore } from "./scoring";
import type { ReceiptItem, CandidateItem, MatchResult, MatchConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Store-Specific Learned Mappings
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up a learned mapping from the itemMappings table.
 * Returns the best matching canonical name and confidence.
 */
export async function findLearnedMapping(
  ctx: QueryCtx | MutationCtx,
  storeId: string,
  receiptItemName: string
): Promise<{ canonicalName: string; confidence: number } | null> {
  const normalizedPattern = receiptItemName.toLowerCase().trim();

  // Try exact match first
  const exactMatch = await ctx.db
    .query("itemMappings")
    .withIndex("by_store_pattern", (q) =>
      q.eq("normalizedStoreId", storeId).eq("receiptPattern", normalizedPattern)
    )
    .first();

  if (exactMatch && exactMatch.confirmationCount >= 1) {
    // Confidence based on confirmation count (max at 5 confirmations)
    const confidence = Math.min(50 + exactMatch.confirmationCount * 10, 100);
    return { canonicalName: exactMatch.canonicalName, confidence };
  }

  // Try token-based partial match
  const receiptTokens = tokenize(receiptItemName);
  if (receiptTokens.length === 0) return null;

  // Get all mappings for this store
  const storeMappings = await ctx.db
    .query("itemMappings")
    .withIndex("by_store", (q) => q.eq("normalizedStoreId", storeId))
    .take(100);

  // Find best token overlap
  let bestMapping: typeof storeMappings[0] | null = null;
  let bestOverlap = 0;

  for (const mapping of storeMappings) {
    const mappingTokens = new Set(mapping.receiptPatternTokens);
    let overlap = 0;
    for (const t of receiptTokens) {
      if (mappingTokens.has(t)) overlap++;
    }

    const overlapScore = overlap / Math.min(receiptTokens.length, mappingTokens.size);
    if (overlapScore > bestOverlap && overlapScore >= 0.6) {
      bestOverlap = overlapScore;
      bestMapping = mapping;
    }
  }

  if (bestMapping) {
    // Lower confidence for partial matches
    const baseConfidence = Math.min(30 + bestMapping.confirmationCount * 8, 70);
    return {
      canonicalName: bestMapping.canonicalName,
      confidence: Math.round(baseConfidence * bestOverlap),
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Signal Matcher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the best match for a receipt item among candidates.
 */
export async function findBestMatch(
  ctx: QueryCtx | MutationCtx,
  receiptItem: ReceiptItem,
  candidates: CandidateItem[],
  storeId: string,
  config: MatchConfig = DEFAULT_CONFIG
): Promise<MatchResult> {
  // Check for learned mapping first
  const learnedMapping = await findLearnedMapping(ctx, storeId, receiptItem.name);

  const scoredCandidates: {
    candidate: CandidateItem;
    score: number;
    reasons: string[];
  }[] = [];

  for (const candidate of candidates) {
    // Check if this candidate matches the learned mapping
    let learnedBonus = 0;
    if (learnedMapping && isDuplicateItemName(learnedMapping.canonicalName, candidate.name)) {
      learnedBonus = learnedMapping.confidence;
    }

    const { score, reasons } = calculateMatchScore(receiptItem, candidate, learnedBonus, config);
    scoredCandidates.push({ candidate, score, reasons });
  }

  // Sort by score descending
  scoredCandidates.sort((a, b) => b.score - a.score);

  const bestMatch = scoredCandidates[0];
  let confidence: MatchResult["confidence"] = "none";

  if (bestMatch && bestMatch.score >= config.highConfidenceThreshold) {
    confidence = "high";
  } else if (bestMatch && bestMatch.score >= config.mediumConfidenceThreshold) {
    confidence = "medium";
  } else if (bestMatch && bestMatch.score > 0) {
    confidence = "low";
  }

  return {
    receiptItem,
    bestMatch: bestMatch?.candidate ?? null,
    matchScore: bestMatch?.score ?? 0,
    matchReasons: bestMatch?.reasons ?? [],
    allCandidates: scoredCandidates,
    confidence,
  };
}

/**
 * Match all receipt items against candidates.
 * Returns matched items and unmatched items separately.
 */
export async function matchReceiptItems(
  ctx: QueryCtx | MutationCtx,
  receiptItems: ReceiptItem[],
  candidates: CandidateItem[],
  storeId: string,
  config: MatchConfig = DEFAULT_CONFIG
): Promise<{
  matched: MatchResult[];
  unmatched: MatchResult[];
  autoMatchThreshold: number;
}> {
  const matched: MatchResult[] = [];
  const unmatched: MatchResult[] = [];

  for (const receiptItem of receiptItems) {
    const result = await findBestMatch(ctx, receiptItem, candidates, storeId, config);

    if (result.confidence === "high") {
      matched.push(result);
    } else {
      unmatched.push(result);
    }
  }

  return {
    matched,
    unmatched,
    autoMatchThreshold: config.highConfidenceThreshold,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping Learning
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a confirmed mapping from user.
 * Creates or updates the itemMappings table.
 */
export async function learnMapping(
  ctx: MutationCtx,
  storeId: string,
  receiptItemName: string,
  canonicalName: string,
  category: string | undefined,
  price: number,
  userId: Id<"users">
): Promise<void> {
  const normalizedPattern = receiptItemName.toLowerCase().trim();
  const tokens = tokenize(receiptItemName);
  const now = Date.now();

  // Check for existing mapping
  const existing = await ctx.db
    .query("itemMappings")
    .withIndex("by_store_pattern", (q) =>
      q.eq("normalizedStoreId", storeId).eq("receiptPattern", normalizedPattern)
    )
    .first();

  if (existing) {
    // Update existing mapping
    await ctx.db.patch(existing._id, {
      canonicalName,
      canonicalCategory: category,
      confirmationCount: existing.confirmationCount + 1,
      lastConfirmedAt: now,
      lastConfirmedBy: userId,
      typicalPriceMin: existing.typicalPriceMin
        ? Math.min(existing.typicalPriceMin, price)
        : price,
      typicalPriceMax: existing.typicalPriceMax
        ? Math.max(existing.typicalPriceMax, price)
        : price,
      updatedAt: now,
    });
  } else {
    // Create new mapping
    await ctx.db.insert("itemMappings", {
      normalizedStoreId: storeId,
      receiptPattern: normalizedPattern,
      receiptPatternTokens: tokens,
      canonicalName,
      canonicalCategory: category,
      confirmationCount: 1,
      lastConfirmedAt: now,
      lastConfirmedBy: userId,
      typicalPriceMin: price,
      typicalPriceMax: price,
      createdAt: now,
      updatedAt: now,
    });
  }
}
