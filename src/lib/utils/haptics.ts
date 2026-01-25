/**
 * Haptic Feedback Utilities
 *
 * Uses the Vibration API to provide tactile feedback on supported devices.
 * Falls back gracefully on devices that don't support vibration.
 */

/**
 * Check if the Vibration API is supported
 */
export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger a haptic vibration pattern
 *
 * @param pattern - Duration in ms or array of durations [vibrate, pause, vibrate, ...]
 * @returns true if vibration was triggered, false if not supported
 */
export function vibrate(pattern: number | number[]): boolean {
  if (!isHapticsSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/**
 * Light haptic feedback for selections/interactions
 * Single short pulse (10ms)
 */
export function hapticLight(): boolean {
  return vibrate(10);
}

/**
 * Medium haptic feedback for confirmations
 * Double pulse pattern
 */
export function hapticMedium(): boolean {
  return vibrate([15, 50, 15]);
}

/**
 * Strong haptic feedback for important actions
 * Longer pulse
 */
export function hapticStrong(): boolean {
  return vibrate(30);
}

/**
 * Success haptic pattern
 * Quick ascending pattern
 */
export function hapticSuccess(): boolean {
  return vibrate([10, 30, 20]);
}

/**
 * Error/warning haptic pattern
 * Short repeating pulses
 */
export function hapticError(): boolean {
  return vibrate([20, 50, 20, 50, 20]);
}

/**
 * Selection changed haptic
 * Very light tap for UI selections
 */
export function hapticSelection(): boolean {
  return vibrate(5);
}

/**
 * Cancel any ongoing vibration
 */
export function hapticCancel(): boolean {
  return vibrate(0);
}
