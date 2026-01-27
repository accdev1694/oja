import * as Haptics from "expo-haptics";

/**
 * Safe haptics wrapper with graceful degradation
 *
 * Provides consistent haptic feedback across devices while
 * gracefully handling devices without haptic support.
 *
 * All functions are safe to call - they will silently fail
 * on unsupported devices without throwing errors.
 */

let hapticSupportCache: boolean | null = null;

/**
 * Check if the device supports haptics
 * Result is cached after first check
 */
async function checkHapticSupport(): Promise<boolean> {
  if (hapticSupportCache !== null) {
    return hapticSupportCache;
  }

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    hapticSupportCache = true;
    return true;
  } catch {
    hapticSupportCache = false;
    return false;
  }
}

/**
 * Light impact - Used for button taps, list item selection
 */
export async function light(): Promise<void> {
  try {
    const supported = await checkHapticSupport();
    if (supported) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (error) {
    // Silently fail - device doesn't support haptics
    console.debug("Haptics not supported:", error);
  }
}

/**
 * Medium impact - Used for swipe actions, confirmations
 */
export async function medium(): Promise<void> {
  try {
    const supported = await checkHapticSupport();
    if (supported) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch (error) {
    console.debug("Haptics not supported:", error);
  }
}

/**
 * Heavy impact - Used for important actions, deletions
 */
export async function heavy(): Promise<void> {
  try {
    const supported = await checkHapticSupport();
    if (supported) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  } catch (error) {
    console.debug("Haptics not supported:", error);
  }
}

/**
 * Success notification - Used when an action completes successfully
 */
export async function success(): Promise<void> {
  try {
    const supported = await checkHapticSupport();
    if (supported) {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    }
  } catch (error) {
    console.debug("Haptics not supported:", error);
  }
}

/**
 * Warning notification - Used for warnings or cautions
 */
export async function warning(): Promise<void> {
  try {
    const supported = await checkHapticSupport();
    if (supported) {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );
    }
  } catch (error) {
    console.debug("Haptics not supported:", error);
  }
}

/**
 * Error notification - Used when an action fails
 */
export async function error(): Promise<void> {
  try {
    const supported = await checkHapticSupport();
    if (supported) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  } catch (err) {
    console.debug("Haptics not supported:", err);
  }
}

/**
 * Selection feedback - Used when a value changes (pickers, sliders)
 */
export async function selection(): Promise<void> {
  try {
    const supported = await checkHapticSupport();
    if (supported) {
      await Haptics.selectionAsync();
    }
  } catch (error) {
    console.debug("Haptics not supported:", error);
  }
}

/**
 * Generic impact with configurable style
 */
export async function impact(
  style: "light" | "medium" | "heavy" = "medium"
): Promise<void> {
  switch (style) {
    case "light":
      return light();
    case "medium":
      return medium();
    case "heavy":
      return heavy();
  }
}

/**
 * Generic notification with configurable type
 */
export async function notification(
  type: "success" | "warning" | "error" = "success"
): Promise<void> {
  switch (type) {
    case "success":
      return success();
    case "warning":
      return warning();
    case "error":
      return error();
  }
}

/**
 * Clear the haptic support cache
 * Useful for testing or if device capabilities change
 */
export function clearHapticCache(): void {
  hapticSupportCache = null;
}

/**
 * Export grouped functions for convenience
 */
export const safeHaptics = {
  light,
  medium,
  heavy,
  success,
  warning,
  error,
  selection,
  impact,
  notification,
  clearCache: clearHapticCache,
};
