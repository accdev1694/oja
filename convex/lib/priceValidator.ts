/**
 * Price Validation and Scoring Utilities
 * 
 * Centralizes logic for confidence scoring, price averaging, 
 * and emergency fallback estimates.
 */

/** 
 * Confidence score: higher reportCount + more recent = higher confidence (0-1) 
 */
export function computeConfidence(reportCount: number, daysSinceLastSeen: number): number {
  // Base confidence from report count (max 0.5 from count alone)
  const countFactor = Math.min(reportCount / 10, 0.5);
  // Recency factor (max 0.5 from recency, decays over 30 days)
  const recencyFactor = Math.max(0, 0.5 * (1 - daysSinceLastSeen / 30));
  return Math.min(countFactor + recencyFactor, 1);
}

/**
 * Weighted 30-day average: newer prices weigh more.
 * weight = max(0, 1 - (daysSincePurchase / 30))
 * Prices older than 30 days get zero weight (the existing average represents them).
 */
export function computeWeightedAverage(
  existingAverage: number,
  existingCount: number,
  newPrice: number,
  daysSincePurchase: number
): number {
  const newWeight = Math.max(0, 1 - daysSincePurchase / 30);
  // Existing average represents accumulated history; give it a base weight
  // that decays as the data ages, but at least 0.3 to prevent wild swings
  const existingWeight = Math.max(0.3, 1 - (existingCount > 1 ? 0.1 : 0));
  const totalWeight = existingWeight + newWeight;
  if (totalWeight === 0) return newPrice;
  return (existingAverage * existingWeight + newPrice * newWeight) / totalWeight;
}

/**
 * Emergency fallback for price estimation.
 * Used when all other price sources (variant, currentPrices, pantry) fail.
 * Provides category-based estimates to ensure Zero-Blank Prices policy.
 */
export function getEmergencyPriceEstimate(
  itemName: string,
  category?: string
): { price: number; size: string; unit: string } {
  const name = itemName.toLowerCase();

  // Category-based emergency pricing
  const categoryPrices: Record<string, number> = {
    "Dairy": 2.50,
    "Bakery": 1.50,
    "Produce": 1.00,
    "Meat": 4.00,
    "Beverages": 1.50,
    "Snacks": 2.00,
    "Frozen": 2.50,
    "Pantry Staples": 1.50,
  };

  const basePrice = categoryPrices[category || ""] || 1.50;

  // Common item patterns for better estimates
  if (name.includes("milk")) return { price: 1.15, size: "2 pints", unit: "pint" };
  if (name.includes("bread")) return { price: 1.20, size: "800g", unit: "g" };
  if (name.includes("egg")) return { price: 2.50, size: "6 pack", unit: "pack" };
  if (name.includes("butter")) return { price: 2.00, size: "250g", unit: "g" };
  if (name.includes("chicken")) return { price: 4.50, size: "500g", unit: "g" };
  if (name.includes("rice")) return { price: 2.00, size: "1kg", unit: "kg" };
  if (name.includes("pasta")) return { price: 1.00, size: "500g", unit: "g" };

  return {
    price: basePrice,
    size: "per item",
    unit: "each",
  };
}
