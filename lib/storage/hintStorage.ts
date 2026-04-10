import { createSafeMMKV } from './safeMMKV';

export const hintStorage = createSafeMMKV({ id: 'tutorial-hints' });

export function markHintAsViewed(hintId: string) {
  hintStorage.set(`hint_${hintId}`, true);
}

export function hasViewedHint(hintId: string): boolean {
  return hintStorage.getBoolean(`hint_${hintId}`) ?? false;
}

export function isHintsEnabled(): boolean {
  // TEMPORARY: Hints disabled - change to true to re-enable
  return false;
  // return hintStorage.getBoolean('hints_enabled') ?? true;
}

export function setHintsEnabled(enabled: boolean) {
  hintStorage.set('hints_enabled', enabled);
}

export function resetAllHints() {
  hintStorage.clearAll();
}

// ─────────────────────────────────────────────────────────────────────────────
// Whisper-style action hints: per-hint mute counter for "two-strike quiet mode"
// ─────────────────────────────────────────────────────────────────────────────

const MUTE_KEY = (hintId: string) => `hint_mute_${hintId}`;

export function getHintMuteCount(hintId: string): number {
  return hintStorage.getNumber(MUTE_KEY(hintId)) ?? 0;
}

export function bumpHintMuteCount(hintId: string): number {
  const next = getHintMuteCount(hintId) + 1;
  hintStorage.set(MUTE_KEY(hintId), next);
  return next;
}

export function resetHintMute(hintId: string) {
  hintStorage.delete(MUTE_KEY(hintId));
}
