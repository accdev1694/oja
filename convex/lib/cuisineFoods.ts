/**
 * Cuisine-Specific Food Database — Exports
 *
 * Combines cuisine data from cuisineFoodsData.ts (Africa/Caribbean/South Asian)
 * and cuisineFoodsDataWorld.ts (Asian/European/Latin American).
 */

import type { CuisineSeedItem } from "./cuisineFoodsData";
import {
  BRITISH, WEST_AFRICAN, EAST_AFRICAN, SOUTHERN_AFRICAN,
  NORTH_AFRICAN, CARIBBEAN, SOUTH_ASIAN,
} from "./cuisineFoodsData";
import {
  CHINESE, JAPANESE, KOREAN, SOUTHEAST_ASIAN,
  MIDDLE_EASTERN, TURKISH, MEDITERRANEAN, FRENCH,
  EASTERN_EUROPEAN, LATIN_AMERICAN,
} from "./cuisineFoodsDataWorld";

export type { CuisineSeedItem };

const CUISINE_MAP: Record<string, CuisineSeedItem[]> = {
  // Canonical IDs (match app/onboarding/cuisineData.ts)
  british: BRITISH,
  "west-african": WEST_AFRICAN,
  "east-african": EAST_AFRICAN,
  "southern-african": SOUTHERN_AFRICAN,
  "north-african": NORTH_AFRICAN,
  caribbean: CARIBBEAN,
  "south-asian": SOUTH_ASIAN,
  chinese: CHINESE,
  japanese: JAPANESE,
  korean: KOREAN,
  "southeast-asian": SOUTHEAST_ASIAN,
  "middle-eastern": MIDDLE_EASTERN,
  turkish: TURKISH,
  mediterranean: MEDITERRANEAN,
  french: FRENCH,
  "eastern-european": EASTERN_EUROPEAN,
  "latin-american": LATIN_AMERICAN,

  // Aliases for custom user input
  nigerian: WEST_AFRICAN,
  ghanaian: WEST_AFRICAN,
  ethiopian: EAST_AFRICAN,
  kenyan: EAST_AFRICAN,
  somali: EAST_AFRICAN,
  "south-african": SOUTHERN_AFRICAN,
  "south african": SOUTHERN_AFRICAN,
  moroccan: NORTH_AFRICAN,
  tunisian: NORTH_AFRICAN,
  algerian: NORTH_AFRICAN,
  egyptian: NORTH_AFRICAN,
  jamaican: CARIBBEAN,
  trinidadian: CARIBBEAN,
  indian: SOUTH_ASIAN,
  pakistani: SOUTH_ASIAN,
  bangladeshi: SOUTH_ASIAN,
  "sri lankan": SOUTH_ASIAN,
  thai: SOUTHEAST_ASIAN,
  vietnamese: SOUTHEAST_ASIAN,
  malaysian: SOUTHEAST_ASIAN,
  indonesian: SOUTHEAST_ASIAN,
  filipino: SOUTHEAST_ASIAN,
  italian: MEDITERRANEAN,
  spanish: MEDITERRANEAN,
  greek: MEDITERRANEAN,
  lebanese: MIDDLE_EASTERN,
  persian: MIDDLE_EASTERN,
  iranian: MIDDLE_EASTERN,
  iraqi: MIDDLE_EASTERN,
  syrian: MIDDLE_EASTERN,
  polish: EASTERN_EUROPEAN,
  russian: EASTERN_EUROPEAN,
  ukrainian: EASTERN_EUROPEAN,
  hungarian: EASTERN_EUROPEAN,
  romanian: EASTERN_EUROPEAN,
  mexican: LATIN_AMERICAN,
  colombian: LATIN_AMERICAN,
  brazilian: LATIN_AMERICAN,
  peruvian: LATIN_AMERICAN,
  argentinian: LATIN_AMERICAN,
};

/**
 * Get cuisine-specific food items for the given cuisine IDs.
 * Always includes British staples as the base.
 * Deduplicates by item name (case-insensitive).
 */
export function getCuisineFoods(
  cuisineIds: string[],
  maxItems = 200
): Array<CuisineSeedItem & { source: "local" | "cultural" }> {
  const seen = new Set<string>();
  const result: Array<CuisineSeedItem & { source: "local" | "cultural" }> = [];

  // Always include British staples as "local"
  for (const item of BRITISH) {
    const key = item.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ ...item, source: "local" });
    }
  }

  // Add cultural items from each selected cuisine
  for (const cuisineId of cuisineIds) {
    const normalized = cuisineId.toLowerCase().trim();
    if (normalized === "british") continue;

    const foods = CUISINE_MAP[normalized];
    if (!foods) continue;

    for (const item of foods) {
      const key = item.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ ...item, source: "cultural" });
      }
    }
  }

  return result.slice(0, maxItems);
}

/**
 * Check if a cuisine ID has a known food list.
 */
export function hasCuisineFoods(cuisineId: string): boolean {
  return cuisineId.toLowerCase().trim() in CUISINE_MAP;
}
