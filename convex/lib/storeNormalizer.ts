/**
 * UK Store Normalizer Utility
 *
 * Normalizes receipt store names to canonical store IDs and provides
 * store metadata (brand colors, display names, types) for the UK market.
 *
 * Used by:
 * - Receipt parsing (normalize raw store names)
 * - Store comparison UI (display colors, names)
 * - Insights/analytics (group by normalized store)
 * - Onboarding (store selection)
 *
 * This file is a barrel re-export. Implementation lives in ./stores/
 */
export * from "./stores/index";
