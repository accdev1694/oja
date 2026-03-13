/**
 * Item Matcher - Multi-signal matching system for receipt <-> product reconciliation
 *
 * Re-exports all matching functionality from sub-modules:
 * - types.ts: Interfaces, config defaults
 * - tokenization.ts: Token extraction, overlap scoring
 * - scoring.ts: Category, price, and composite scoring
 * - matcher.ts: Orchestration, learned mappings, bulk matching
 */

// Types & config
export type { ReceiptItem, CandidateItem, MatchResult, MatchConfig } from "./types";
export { DEFAULT_CONFIG } from "./types";

// Tokenization
export { tokenize, calculateTokenOverlap } from "./tokenization";

// Scoring
export { calculateCategoryMatch, calculatePriceProximity, calculateMatchScore } from "./scoring";

// Matcher orchestration & learning
export { findLearnedMapping, findBestMatch, matchReceiptItems, learnMapping } from "./matcher";
