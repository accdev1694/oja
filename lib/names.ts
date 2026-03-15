/**
 * Shared name utilities used across frontend, backend, and onboarding.
 * Single source of truth for generic-name detection and basic validation.
 */

/** Names that identity providers commonly assign as placeholders. */
export const GENERIC_NAMES = [
  "User",
  "Shopper",
  "Anonymous",
  "user",
  "shopper",
  "anonymous",
];

/**
 * Returns true when `name` is missing, empty, or a known generic placeholder.
 */
export function isGenericName(name?: string | null) {
  if (!name) return true;
  return GENERIC_NAMES.includes(name.trim());
}

/**
 * Basic name validation:
 * - At least 2 characters after trimming
 * - Not purely numeric (e.g. "123")
 * - Not a generic placeholder
 */
export function isValidName(name?: string | null) {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  if (/^\d+$/.test(trimmed)) return false;
  if (isGenericName(trimmed)) return false;
  return true;
}
