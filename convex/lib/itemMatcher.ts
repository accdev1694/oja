/**
 * Item Matcher - Multi-signal matching system for receipt <-> product reconciliation
 *
 * This file is now a barrel re-export. All implementation has been moved to
 * convex/lib/matching/ for maintainability:
 *
 * - matching/types.ts: Interfaces, config defaults
 * - matching/tokenization.ts: Token extraction, overlap scoring
 * - matching/scoring.ts: Category, price, and composite scoring
 * - matching/matcher.ts: Orchestration, learned mappings, bulk matching
 * - matching/index.ts: Barrel re-exports
 */

export * from "./matching/index";
