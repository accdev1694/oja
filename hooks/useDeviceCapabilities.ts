/**
 * useDeviceCapabilities Hook
 *
 * Provides access to device tier and capabilities
 * Includes design tokens for the current tier
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  DeviceCapabilities,
  DeviceTier,
  getDeviceCapabilities,
  TIER_DESCRIPTIONS,
} from '@/lib/capabilities/deviceTier';
import { getTokensForTier, DesignTokens, colors } from '@/lib/design/tokens';

interface UseDeviceCapabilitiesReturn extends DeviceCapabilities {
  tokens: DesignTokens;
  colors: typeof colors;
  tierDescription: string;
}

let cachedCapabilities: DeviceCapabilities | null = null;

/**
 * Hook to access device capabilities and design tokens
 * Capabilities are cached after first detection
 */
export function useDeviceCapabilities(): UseDeviceCapabilitiesReturn {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>(() => {
    // Return cached if available (for immediate render)
    if (cachedCapabilities) return cachedCapabilities;

    // Fallback to safe defaults during initial load
    return {
      tier: 'enhanced' as DeviceTier,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
      osVersion: parseInt(Platform.Version as string, 10) || 0,
      supportsBlur: false,
      supportsHaptics: false,
      supportsComplexAnimations: true,
    };
  });

  useEffect(() => {
    // Only detect once
    if (cachedCapabilities) return;

    async function detectCapabilities() {
      const caps = await getDeviceCapabilities();
      cachedCapabilities = caps;
      setCapabilities(caps);
    }

    detectCapabilities();
  }, []);

  const tokens = getTokensForTier(capabilities.tier, capabilities.platform);
  const tierDescription = TIER_DESCRIPTIONS[capabilities.tier];

  return {
    ...capabilities,
    tokens,
    colors,
    tierDescription,
  };
}

/**
 * Clear cached capabilities (for testing/debugging)
 */
export function clearCapabilitiesCache() {
  cachedCapabilities = null;
}
