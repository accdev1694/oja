import { useEffect, useState } from "react";
import {
  detectDeviceCapabilities,
  getVisualConfig,
  type DeviceCapabilities,
  type DeviceTier,
} from "@/lib/capabilities/deviceTier";

/**
 * Hook to access device capabilities and tier
 *
 * Detects device capabilities on mount and provides:
 * - Device tier (premium, enhanced, baseline)
 * - Capability flags (blur, haptics, animations)
 * - Visual configuration for the tier
 *
 * @example
 * const { tier, supportsBlur, visualConfig } = useDeviceCapabilities();
 *
 * if (supportsBlur) {
 *   // Use Liquid Glass blur
 * } else if (visualConfig.useGradients) {
 *   // Use gradient fallback
 * } else {
 *   // Use solid color fallback
 * }
 */
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    detectDeviceCapabilities()
      .then((caps) => {
        setCapabilities(caps);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to detect device capabilities:", error);
        // Fallback to enhanced tier on error
        setCapabilities({
          tier: "enhanced",
          supportsBlur: false,
          supportsHaptics: false,
          supportsAdvancedAnimations: true,
          osVersion: 0,
          modelName: null,
        });
        setIsLoading(false);
      });
  }, []);

  const visualConfig = capabilities
    ? getVisualConfig(capabilities.tier)
    : getVisualConfig("enhanced");

  return {
    // Capabilities
    tier: capabilities?.tier ?? ("enhanced" as DeviceTier),
    supportsBlur: capabilities?.supportsBlur ?? false,
    supportsHaptics: capabilities?.supportsHaptics ?? false,
    supportsAdvancedAnimations: capabilities?.supportsAdvancedAnimations ?? true,
    osVersion: capabilities?.osVersion ?? 0,
    modelName: capabilities?.modelName ?? null,

    // Visual configuration
    visualConfig,

    // Loading state
    isLoading,
  };
}
