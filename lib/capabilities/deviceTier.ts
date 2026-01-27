/**
 * Device Capability Detection & Tiering System
 *
 * Categorizes devices into tiers for progressive enhancement:
 * - Premium: Latest devices with full feature support
 * - Enhanced: Mid-range devices with good performance
 * - Baseline: Older/low-end devices with basic features
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';

export type DeviceTier = 'baseline' | 'enhanced' | 'premium';

export interface DeviceCapabilities {
  tier: DeviceTier;
  supportsBlur: boolean;
  supportsHaptics: boolean;
  supportsComplexAnimations: boolean;
  platform: 'ios' | 'android' | 'web';
  osVersion: number;
}

/**
 * Detects device tier based on platform, OS version, and hardware
 */
async function detectDeviceTier(): Promise<DeviceTier> {
  // iOS tier detection based on iOS version
  if (Platform.OS === 'ios') {
    const version = parseInt(Platform.Version as string, 10);

    // iOS 15+ (iPhone 12 and newer) - Premium
    if (version >= 15) return 'premium';

    // iOS 13-14 (iPhone 8, X, 11) - Enhanced
    if (version >= 13) return 'enhanced';

    // iOS <13 (iPhone 6s, 7) - Baseline
    return 'baseline';
  }

  // Android tier detection using device year class and memory
  if (Platform.OS === 'android') {
    const year = Device.deviceYearClass || 0;
    const memory = Device.totalMemory || 0;
    const memoryGB = memory / (1024 * 1024 * 1024);

    // High-end Android (2022+, 6GB+ RAM) - Premium
    if (year >= 2022 || memoryGB > 6) return 'premium';

    // Mid-range Android (2020+, 4GB+ RAM) - Enhanced
    if (year >= 2020 || memoryGB > 4) return 'enhanced';

    // Budget/older Android - Baseline
    return 'baseline';
  }

  // Web fallback - Enhanced (no blur, but good performance)
  return 'enhanced';
}

/**
 * Gets comprehensive device capabilities
 * Call once on app start and cache the result
 */
export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  const tier = await detectDeviceTier();
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const osVersion = parseInt(Platform.Version as string, 10) || 0;

  return {
    tier,
    platform,
    osVersion,

    // Blur support: iOS 13+ only (requires expo-blur)
    supportsBlur: platform === 'ios' && osVersion >= 13 && tier !== 'baseline',

    // Haptics: iOS and Android, but not baseline tier or web
    supportsHaptics: platform !== 'web' && tier !== 'baseline',

    // Complex animations: Premium and Enhanced tiers only
    supportsComplexAnimations: tier !== 'baseline',
  };
}

/**
 * Tier descriptions for settings UI
 */
export const TIER_DESCRIPTIONS: Record<DeviceTier, string> = {
  premium: 'Full visual effects with blur and advanced animations',
  enhanced: 'Good experience with gradient backgrounds and smooth animations',
  baseline: 'Optimized for performance with minimal effects',
};
