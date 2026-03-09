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
