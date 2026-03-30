/**
 * Normalize an email for tombstone matching (trial abuse prevention).
 *
 * 1. Lowercases
 * 2. Trims whitespace
 * 3. Strips Gmail-style "+" aliases (user+tag@gmail.com → user@gmail.com)
 *    Also covers googlemail.com which is the same service.
 *
 * This prevents the most common trial abuse vector where a user signs up
 * with user@gmail.com, deletes, then re-signs up as user+2@gmail.com.
 */
export function normalizeEmailForTombstone(email: string): string {
  const lower = email.toLowerCase().trim();
  const [localPart, domain] = lower.split("@");
  if (!localPart || !domain) return lower;

  // Gmail and Googlemail: strip "+" aliases and dots (dots are also ignored by Gmail)
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const stripped = localPart.split("+")[0].replace(/\./g, "");
    return `${stripped}@gmail.com`; // Normalize googlemail.com → gmail.com too
  }

  // For other providers: only strip "+" aliases (dots may be significant)
  const stripped = localPart.split("+")[0];
  return `${stripped}@${domain}`;
}
