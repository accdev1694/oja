/**
 * Item Matcher Types & Configuration
 *
 * Shared types for the multi-signal matching system used in
 * receipt <-> product reconciliation.
 */

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
  allCandidates: {
    candidate: CandidateItem;
    score: number;
    reasons: string[];
  }[];
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

export const DEFAULT_CONFIG: MatchConfig = {
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
