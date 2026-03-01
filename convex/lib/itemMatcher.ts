/**
 * Item Matcher - Multi-signal matching system for receipt ↔ product reconciliation
 *
 * Combines multiple weak signals to produce confident matches:
 * 1. Token overlap (common keywords between names)
 * 2. Category matching (both in same category)
 * 3. Price proximity (prices within threshold)
 * 4. Store-specific learned mappings (crowdsourced confirmations)
 * 5. Fuzzy text similarity (Levenshtein-based)
 */

import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";
import { normalizeItemName, calculateSimilarity, isDuplicateItemName } from "./fuzzyMatch";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ReceiptItem {
  name: string;
  unitPrice: number;
  quantity: number;
  category?: string;
}

export interface CandidateItem {
  id: string;
  type: "list_item" | "pantry_item" | "scanned_product";
  name: string;
  category?: string;
  estimatedPrice?: number;
}

export interface MatchResult {
  receiptItem: ReceiptItem;
  bestMatch: CandidateItem | null;
  matchScore: number;           // 0-100
  matchReasons: string[];       // ["token_overlap", "category_match", etc.]
  allCandidates: Array<{
    candidate: CandidateItem;
    score: number;
    reasons: string[];
  }>;
  confidence: "high" | "medium" | "low" | "none";
}

export interface MatchConfig {
  // Thresholds
  highConfidenceThreshold: number;    // Score >= this = high confidence (default: 75)
  mediumConfidenceThreshold: number;  // Score >= this = medium confidence (default: 50)
  priceProximityPercent: number;      // Price within X% = price match (default: 20)

  // Signal weights (must sum to 100)
  weights: {
    tokenOverlap: number;       // Default: 35
    categoryMatch: number;      // Default: 20
    priceProximity: number;     // Default: 15
    learnedMapping: number;     // Default: 20
    fuzzySimilarity: number;    // Default: 10
  };
}

const DEFAULT_CONFIG: MatchConfig = {
  highConfidenceThreshold: 70,
  mediumConfidenceThreshold: 45,
  priceProximityPercent: 25,
  weights: {
    tokenOverlap: 35,
    categoryMatch: 20,
    priceProximity: 15,
    learnedMapping: 20,
    fuzzySimilarity: 10,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tokenization
// ─────────────────────────────────────────────────────────────────────────────

/** Common words to ignore in matching */
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for", "with",
  "pack", "pk", "x", "box", "bag", "each", "per", "kg", "g", "ml", "l", "oz",
]);

/** UK supermarket brand prefixes to strip */
const BRAND_PREFIXES = [
  "tesco", "asda", "sainsbury", "sainsburys", "morrisons", "waitrose", "aldi",
  "lidl", "coop", "co-op", "iceland", "marks", "spencer", "m&s", "ocado",
  "amazon", "fresh", "finest", "everyday", "essential", "basics", "smart price",
  "by sainsbury", "hubbards", "stamford", "hearty food", "grower's harvest",
];

/**
 * Tokenize an item name into meaningful keywords.
 * Strips brands, stop words, sizes, and normalizes.
 */
export function tokenize(name: string): string[] {
  let normalized = name.toLowerCase().trim();

  // Strip brand prefixes
  for (const brand of BRAND_PREFIXES) {
    if (normalized.startsWith(brand + " ") || normalized.startsWith(brand + "'s ")) {
      normalized = normalized.replace(new RegExp(`^${brand}('s)?\\s+`, "i"), "");
    }
  }

  // Remove size patterns (e.g., "500g", "2 pint", "35-38")
  normalized = normalized
    .replace(/\d+\s*-\s*\d+/g, "")           // Size ranges like "35-38"
    .replace(/\d+\s*(g|kg|ml|l|oz|lb|pt|pint|pints|pack|pk|x)\b/gi, "")
    .replace(/\d{6,}/g, "")                   // Product codes (6+ digits)
    .replace(/[^\w\s]/g, " ")                 // Remove punctuation
    .replace(/\s+/g, " ")                     // Normalize whitespace
    .trim();

  // Split and filter
  const tokens = normalized
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  return [...new Set(tokens)]; // Deduplicate
}

/**
 * Calculate token overlap score between two names.
 * Returns 0-100 where 100 = perfect overlap.
 */
export function calculateTokenOverlap(name1: string, name2: string): number {
  const tokens1 = tokenize(name1);
  const tokens2 = tokenize(name2);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let overlap = 0;
  for (const t of set1) {
    if (set2.has(t)) overlap++;
  }

  // Use Jaccard-like similarity but weighted toward smaller set
  // If all tokens of shorter name appear in longer, that's a strong match
  const minSize = Math.min(set1.size, set2.size);
  const maxSize = Math.max(set1.size, set2.size);

  // Primary: overlap / min (catches subset matches)
  const subsetScore = overlap / minSize;
  // Secondary: overlap / max (penalizes very different lengths)
  const jaccardScore = overlap / maxSize;

  // Weighted average: 70% subset, 30% jaccard
  return Math.round((subsetScore * 0.7 + jaccardScore * 0.3) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Matching
// ─────────────────────────────────────────────────────────────────────────────

/** Category aliases for flexible matching */
const CATEGORY_ALIASES: Record<string, string[]> = {
  "clothing": ["clothes", "apparel", "fashion", "wear"],
  "food": ["groceries", "grocery", "edible"],
  "dairy": ["milk", "cheese", "yogurt", "butter"],
  "meat": ["poultry", "beef", "pork", "chicken", "fish", "seafood"],
  "produce": ["fruit", "vegetable", "vegetables", "fruits", "fresh"],
  "bakery": ["bread", "baked", "pastry", "pastries"],
  "drinks": ["beverages", "beverage", "drink"],
  "household": ["home", "cleaning", "laundry"],
  "toiletries": ["personal care", "hygiene", "beauty"],
};

/**
 * Normalize a category name for comparison.
 */
function normalizeCategory(category: string | undefined): string {
  if (!category) return "";
  const lower = category.toLowerCase().trim();

  // Check aliases
  for (const [canonical, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (lower === canonical || aliases.includes(lower)) {
      return canonical;
    }
  }

  return lower;
}

/**
 * Check if two categories match (considering aliases).
 * Returns 100 for match, 0 for no match.
 */
export function calculateCategoryMatch(cat1?: string, cat2?: string): number {
  if (!cat1 || !cat2) return 0;

  const norm1 = normalizeCategory(cat1);
  const norm2 = normalizeCategory(cat2);

  if (!norm1 || !norm2) return 0;

  return norm1 === norm2 ? 100 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Price Proximity
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate price proximity score.
 * Returns 100 if prices match exactly, decreasing as they differ.
 */
export function calculatePriceProximity(
  price1: number | undefined,
  price2: number | undefined,
  thresholdPercent: number = 25
): number {
  if (price1 === undefined || price2 === undefined) return 0;
  if (price1 <= 0 || price2 <= 0) return 0;

  const diff = Math.abs(price1 - price2);
  const avg = (price1 + price2) / 2;
  const percentDiff = (diff / avg) * 100;

  if (percentDiff === 0) return 100;
  if (percentDiff >= thresholdPercent) return 0;

  // Linear decay from 100 to 0 as diff approaches threshold
  return Math.round(100 * (1 - percentDiff / thresholdPercent));
}

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
 * Calculate match score between a receipt item and a candidate.
 */
export function calculateMatchScore(
  receiptItem: ReceiptItem,
  candidate: CandidateItem,
  learnedConfidence: number = 0,
  config: MatchConfig = DEFAULT_CONFIG
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let weightedScore = 0;

  // 1. Token overlap
  const tokenScore = calculateTokenOverlap(receiptItem.name, candidate.name);
  if (tokenScore > 0) {
    weightedScore += (tokenScore / 100) * config.weights.tokenOverlap;
    if (tokenScore >= 50) reasons.push(`token_overlap:${tokenScore}`);
  }

  // 2. Category match
  const categoryScore = calculateCategoryMatch(receiptItem.category, candidate.category);
  if (categoryScore > 0) {
    weightedScore += (categoryScore / 100) * config.weights.categoryMatch;
    reasons.push("category_match");
  }

  // 3. Price proximity
  const priceScore = calculatePriceProximity(
    receiptItem.unitPrice,
    candidate.estimatedPrice,
    config.priceProximityPercent
  );
  if (priceScore > 0) {
    weightedScore += (priceScore / 100) * config.weights.priceProximity;
    if (priceScore >= 50) reasons.push(`price_match:${priceScore}`);
  }

  // 4. Learned mapping confidence
  if (learnedConfidence > 0) {
    weightedScore += (learnedConfidence / 100) * config.weights.learnedMapping;
    reasons.push(`learned:${learnedConfidence}`);
  }

  // 5. Fuzzy text similarity (fallback)
  const fuzzySimilarity = calculateSimilarity(
    normalizeItemName(receiptItem.name),
    normalizeItemName(candidate.name)
  );
  if (fuzzySimilarity > 50) {
    weightedScore += (fuzzySimilarity / 100) * config.weights.fuzzySimilarity;
    if (fuzzySimilarity >= 70) reasons.push(`fuzzy:${Math.round(fuzzySimilarity)}`);
  }

  // Also check isDuplicateItemName as a bonus
  if (isDuplicateItemName(receiptItem.name, candidate.name)) {
    // Boost score if fuzzy match confirms
    weightedScore = Math.min(weightedScore + 15, 100);
    if (!reasons.includes("fuzzy_duplicate")) reasons.push("fuzzy_duplicate");
  }

  return { score: Math.round(weightedScore), reasons };
}

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

  const scoredCandidates: Array<{
    candidate: CandidateItem;
    score: number;
    reasons: string[];
  }> = [];

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
