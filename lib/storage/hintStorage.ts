import { MMKV } from 'react-native-mmkv';

export const hintStorage = new MMKV({ id: 'tutorial-hints' });

export function markHintAsViewed(hintId: string) {
  hintStorage.set(`hint_${hintId}`, true);
}

export function hasViewedHint(hintId: string): boolean {
  return hintStorage.getBoolean(`hint_${hintId}`) ?? false;
}

export function isHintsEnabled(): boolean {
  return hintStorage.getBoolean('hints_enabled') ?? true;
}

export function setHintsEnabled(enabled: boolean) {
  hintStorage.set('hints_enabled', enabled);
}

export function resetAllHints() {
  hintStorage.clearAll();
}
