/**
 * Cuisine and dietary restriction data for onboarding.
 *
 * Cuisine IDs must match CuisineId type in convex/lib/stores/types.ts
 * for predefined cuisines. The "Other" free-text field stores arbitrary
 * strings which are handled dynamically by the AI pantry seeding.
 */

export interface CuisineOption {
  id: string;
  name: string;
  emoji: string;
}

export interface DietaryOption {
  id: string;
  name: string;
  icon: string;
}

export const CUISINES: readonly CuisineOption[] = [
  { id: "british", name: "British", emoji: "\u{1F1EC}\u{1F1E7}" },
  { id: "west-african", name: "West African", emoji: "\u{1F30D}" },
  { id: "east-african", name: "East African", emoji: "\u{1F30D}" },
  { id: "southern-african", name: "S. African", emoji: "\u{1F1FF}\u{1F1E6}" },
  { id: "north-african", name: "N. African", emoji: "\u{1F1F2}\u{1F1E6}" },
  { id: "caribbean", name: "Caribbean", emoji: "\u{1F1EF}\u{1F1F2}" },
  { id: "south-asian", name: "South Asian", emoji: "\u{1F1EE}\u{1F1F3}" },
  { id: "chinese", name: "Chinese", emoji: "\u{1F1E8}\u{1F1F3}" },
  { id: "japanese", name: "Japanese", emoji: "\u{1F1EF}\u{1F1F5}" },
  { id: "korean", name: "Korean", emoji: "\u{1F1F0}\u{1F1F7}" },
  { id: "southeast-asian", name: "SE Asian", emoji: "\u{1F1F9}\u{1F1ED}" },
  { id: "middle-eastern", name: "Middle Eastern", emoji: "\u{1F1E6}\u{1F1EA}" },
  { id: "turkish", name: "Turkish", emoji: "\u{1F1F9}\u{1F1F7}" },
  { id: "mediterranean", name: "Mediterranean", emoji: "\u{1F1EE}\u{1F1F9}" },
  { id: "eastern-european", name: "E. European", emoji: "\u{1F1F5}\u{1F1F1}" },
  { id: "french", name: "French", emoji: "\u{1F1EB}\u{1F1F7}" },
  { id: "latin-american", name: "Latin American", emoji: "\u{1F1F2}\u{1F1FD}" },
];

export const DIETARY_RESTRICTIONS: readonly DietaryOption[] = [
  { id: "vegan", name: "Vegan", icon: "leaf" },
  { id: "vegetarian", name: "Vegetarian", icon: "carrot" },
  { id: "gluten-free", name: "Gluten-Free", icon: "wheat-off" },
  { id: "dairy-free", name: "Dairy-Free", icon: "cow-off" },
  { id: "halal", name: "Halal", icon: "star-crescent" },
  { id: "kosher", name: "Kosher", icon: "star-david" },
  { id: "pescatarian", name: "Pescatarian", icon: "fish" },
  { id: "keto", name: "Keto", icon: "fire" },
  { id: "paleo", name: "Paleo", icon: "bone" },
];
