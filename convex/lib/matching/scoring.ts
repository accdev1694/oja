/**
 * Scoring Functions
 *
 * Category matching, price proximity, and composite match score
 * calculation for the multi-signal matching system.
 */

import { normalizeItemName, calculateSimilarity, isDuplicateItemName } from "../fuzzyMatch";
import { calculateTokenOverlap } from "./tokenization";
import type { ReceiptItem, CandidateItem, MatchConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

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
// Multi-Signal Match Score
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
