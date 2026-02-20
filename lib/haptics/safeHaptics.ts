/**
 * Safe Haptics System
 *
 * Provides haptic feedback with:
 * - Device capability detection
 * - User preference support
 * - Silent fallback (no errors on unsupported devices)
 * - Comprehensive feedback types
 */

import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const HAPTICS_ENABLED_KEY = 'haptics_enabled';

let isEnabled = true;
let deviceSupports = false;

/**
 * Initialize haptics system
 * Call once on app start
 */
export async function initHaptics() {
  // Check if device supports haptics
  deviceSupports = Platform.OS !== 'web';

  // Load user preference
  try {
    const pref = await AsyncStorage.getItem(HAPTICS_ENABLED_KEY);
    isEnabled = pref !== 'false';
  } catch (error) {
    // If AsyncStorage fails, default to enabled
    isEnabled = true;
  }
}

/**
 * Haptic feedback types
 */
export type HapticType =
  | 'selection'      // UI element selected (light tap)
  | 'light'          // Subtle feedback
  | 'medium'         // Standard feedback
  | 'heavy'          // Strong feedback
  | 'success'        // Action succeeded
  | 'warning'        // Caution/attention
  | 'error';         // Action failed

/**
 * Trigger haptic feedback
 * Silently fails if device doesn't support or user disabled
 */
export async function haptic(type: HapticType): Promise<void> {
  // Triple safety check
  if (!deviceSupports || !isEnabled) return;

  try {
    switch (type) {
      case 'selection':
        await Haptics.selectionAsync();
        break;

      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;

      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;

      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;

      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;

      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;

      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch (error) {
    // Silently fail - haptics are decorative, not functional
    // Log in dev mode for debugging
    if (__DEV__) {
      console.debug('Haptic skipped:', type, error);
    }
  }
}

/**
 * Complex haptic patterns
 */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function hapticPattern(pattern: 'double' | 'triple' | 'rising' | 'celebration'): Promise<void> {
  if (!deviceSupports || !isEnabled) return;

  try {
    switch (pattern) {
      case 'double':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await delay(80);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;

      case 'triple':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await delay(80);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await delay(80);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;

      case 'rising':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await delay(50);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await delay(50);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;

      case 'celebration':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await delay(120);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await delay(60);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await delay(60);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
    }
  } catch (error) {
    if (__DEV__) {
      console.debug('Haptic pattern skipped:', pattern, error);
    }
  }
}

/**
 * Update user preference for haptics
 */
export async function setHapticsEnabled(enabled: boolean): Promise<void> {
  isEnabled = enabled;
  try {
    await AsyncStorage.setItem(HAPTICS_ENABLED_KEY, String(enabled));
  } catch (error) {
    console.error('Failed to save haptics preference:', error);
  }
}

/**
 * Get current haptics state
 */
export function getHapticsState(): { enabled: boolean; supported: boolean } {
  return {
    enabled: isEnabled,
    supported: deviceSupports,
  };
}

/**
 * Check if haptics are available
 */
export function canUseHaptics(): boolean {
  return deviceSupports && isEnabled;
}
