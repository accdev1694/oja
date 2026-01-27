import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";

/**
 * Device capability tiers for graceful degradation
 *
 * Premium: Latest iOS (16+) with full Liquid Glass effects
 * Enhanced: Android 12+ or older iOS with gradient fallbacks
 * Baseline: Older devices with solid color fallbacks
 */
export type DeviceTier = "premium" | "enhanced" | "baseline";

export interface DeviceCapabilities {
  tier: DeviceTier;
  supportsBlur: boolean;
  supportsHaptics: boolean;
  supportsAdvancedAnimations: boolean;
  osVersion: number;
  modelName: string | null;
}

/**
 * Get iOS version number from Platform.Version
 */
function getIOSVersion(): number {
  if (Platform.OS !== "ios") return 0;

  const version = Platform.Version;
  if (typeof version === "string") {
    return parseInt(version.split(".")[0], 10);
  }
  return version;
}

/**
 * Get Android API level from Platform.Version
 */
function getAndroidAPILevel(): number {
  if (Platform.OS !== "android") return 0;

  const version = Platform.Version;
  if (typeof version === "number") {
    return version;
  }
  return 0;
}

/**
 * Check if device supports haptic feedback
 */
async function checkHapticSupport(): Promise<boolean> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    return true;
  } catch {
    return false;
  }
}

/**
 * Determine if device supports blur effects
 * iOS 10+ supports blur, Android uses gradients
 */
function supportsBlur(osVersion: number): boolean {
  if (Platform.OS === "ios") {
    return osVersion >= 10;
  }
  // Android doesn't have native blur like iOS, use gradients
  return false;
}

/**
 * Determine device tier based on capabilities
 *
 * Premium tier:
 * - iOS 16+ on iPhone 12 or newer
 * - Full Liquid Glass blur effects
 *
 * Enhanced tier:
 * - iOS 14-15
 * - Android 12+ (API 31+)
 * - Gradient fallbacks for blur
 *
 * Baseline tier:
 * - iOS 13 or older
 * - Android 11 or older (API 30-)
 * - Solid color fallbacks
 */
function determineDeviceTier(
  osVersion: number,
  modelName: string | null,
  supportsBlur: boolean
): DeviceTier {
  if (Platform.OS === "ios") {
    // Premium: iOS 16+ with blur support
    if (osVersion >= 16 && supportsBlur) {
      return "premium";
    }

    // Enhanced: iOS 14-15
    if (osVersion >= 14) {
      return "enhanced";
    }

    // Baseline: iOS 13 or older
    return "baseline";
  }

  if (Platform.OS === "android") {
    const apiLevel = getAndroidAPILevel();

    // Enhanced: Android 12+ (API 31+)
    if (apiLevel >= 31) {
      return "enhanced";
    }

    // Baseline: Android 11 or older
    return "baseline";
  }

  // Web or unknown platform
  return "enhanced";
}

/**
 * Detect device capabilities and assign tier
 */
export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  const osVersion = Platform.OS === "ios"
    ? getIOSVersion()
    : getAndroidAPILevel();

  const modelName = Device.modelName;
  const blurSupport = supportsBlur(osVersion);
  const hapticSupport = await checkHapticSupport();

  const tier = determineDeviceTier(osVersion, modelName, blurSupport);

  // Advanced animations available on Premium and Enhanced tiers
  const supportsAdvancedAnimations = tier === "premium" || tier === "enhanced";

  return {
    tier,
    supportsBlur: blurSupport && tier === "premium",
    supportsHaptics: hapticSupport,
    supportsAdvancedAnimations,
    osVersion,
    modelName,
  };
}

/**
 * Get visual effect configuration based on device tier
 */
export function getVisualConfig(tier: DeviceTier) {
  switch (tier) {
    case "premium":
      return {
        useBlur: true,
        useGradients: true,
        blurIntensity: 80,
        animationDuration: 300,
        shadowOpacity: 0.15,
      };

    case "enhanced":
      return {
        useBlur: false,
        useGradients: true,
        blurIntensity: 0,
        animationDuration: 250,
        shadowOpacity: 0.1,
      };

    case "baseline":
      return {
        useBlur: false,
        useGradients: false,
        blurIntensity: 0,
        animationDuration: 200,
        shadowOpacity: 0.05,
      };
  }
}
