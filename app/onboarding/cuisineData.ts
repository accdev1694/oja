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
  { id: "nigerian", name: "Nigerian", emoji: "\u{1F1F3}\u{1F1EC}" },
  { id: "indian", name: "Indian", emoji: "\u{1F1EE}\u{1F1F3}" },
  { id: "chinese", name: "Chinese", emoji: "\u{1F1E8}\u{1F1F3}" },
  { id: "italian", name: "Italian", emoji: "\u{1F1EE}\u{1F1F9}" },
  { id: "pakistani", name: "Pakistani", emoji: "\u{1F1F5}\u{1F1F0}" },
  { id: "bangladeshi", name: "Bangladeshi", emoji: "\u{1F1E7}\u{1F1E9}" },
  { id: "caribbean", name: "Caribbean", emoji: "\u{1F1EF}\u{1F1F2}" },
  { id: "west-african", name: "West African", emoji: "\u{1F30D}" },
  { id: "east-african", name: "East African", emoji: "\u{1F30D}" },
  { id: "ethiopian", name: "Ethiopian", emoji: "\u{1F1EA}\u{1F1F9}" },
  { id: "southern-african", name: "S. African", emoji: "\u{1F1FF}\u{1F1E6}" },
  { id: "middle-eastern", name: "Middle Eastern", emoji: "\u{1F1E6}\u{1F1EA}" },
  { id: "turkish", name: "Turkish", emoji: "\u{1F1F9}\u{1F1F7}" },
  { id: "greek", name: "Greek", emoji: "\u{1F1EC}\u{1F1F7}" },
  { id: "french", name: "French", emoji: "\u{1F1EB}\u{1F1F7}" },
  { id: "polish", name: "Polish", emoji: "\u{1F1F5}\u{1F1F1}" },
  { id: "mexican", name: "Mexican", emoji: "\u{1F1F2}\u{1F1FD}" },
  { id: "japanese", name: "Japanese", emoji: "\u{1F1EF}\u{1F1F5}" },
  { id: "korean", name: "Korean", emoji: "\u{1F1F0}\u{1F1F7}" },
  { id: "thai", name: "Thai", emoji: "\u{1F1F9}\u{1F1ED}" },
  { id: "vietnamese", name: "Vietnamese", emoji: "\u{1F1FB}\u{1F1F3}" },
  { id: "filipino", name: "Filipino", emoji: "\u{1F1F5}\u{1F1ED}" },
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
