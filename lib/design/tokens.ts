import { Platform } from "react-native";
import type { DeviceTier } from "@/lib/capabilities/deviceTier";

/**
 * Design tokens adapted for each device tier
 *
 * Premium: iOS Liquid Glass aesthetic
 * Enhanced: Material You with gradients
 * Baseline: Simplified solid colors
 */

export interface DesignTokens {
  // Border radius
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };

  // Shadows
  shadow: {
    sm: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    lg: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };

  // Spacing
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };

  // Colors
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    brand: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
  };

  // Blur (iOS only)
  blur: {
    intensity: number;
    tint: "light" | "dark" | "default";
  };
}

/**
 * Premium tier tokens - iOS Liquid Glass
 */
const premiumTokens: DesignTokens = {
  borderRadius: {
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },

  shadow: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  colors: {
    background: "#FFFAF8", // Warm white
    surface: "rgba(255, 255, 255, 0.75)", // Translucent for blur
    surfaceElevated: "rgba(255, 255, 255, 0.85)",
    border: "rgba(0, 0, 0, 0.06)",
    text: {
      primary: "#2D3436",
      secondary: "#636E72",
      tertiary: "#95A5A6",
    },
    brand: {
      primary: "#FF6B35", // Oja orange
      secondary: "#FFB800", // Golden accent
      tertiary: "#FF8C61",
    },
  },

  blur: {
    intensity: 80,
    tint: "light",
  },
};

/**
 * Enhanced tier tokens - Material You with gradients
 */
const enhancedTokens: DesignTokens = {
  borderRadius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
  },

  shadow: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  colors: {
    background: "#FFFAF8",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    border: "rgba(0, 0, 0, 0.08)",
    text: {
      primary: "#2D3436",
      secondary: "#636E72",
      tertiary: "#95A5A6",
    },
    brand: {
      primary: "#FF6B35",
      secondary: "#FFB800",
      tertiary: "#FF8C61",
    },
  },

  blur: {
    intensity: 0,
    tint: "default",
  },
};

/**
 * Baseline tier tokens - Simplified solid colors
 */
const baselineTokens: DesignTokens = {
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },

  shadow: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  colors: {
    background: "#FFFAF8",
    surface: "#FFFFFF",
    surfaceElevated: "#F8F9FA",
    border: "rgba(0, 0, 0, 0.1)",
    text: {
      primary: "#2D3436",
      secondary: "#636E72",
      tertiary: "#95A5A6",
    },
    brand: {
      primary: "#FF6B35",
      secondary: "#FFB800",
      tertiary: "#FF8C61",
    },
  },

  blur: {
    intensity: 0,
    tint: "default",
  },
};

/**
 * Get design tokens for a specific device tier
 */
export function getDesignTokens(tier: DeviceTier): DesignTokens {
  switch (tier) {
    case "premium":
      return premiumTokens;
    case "enhanced":
      return enhancedTokens;
    case "baseline":
      return baselineTokens;
  }
}

/**
 * Platform-specific adjustments
 */
export function applyPlatformAdjustments(tokens: DesignTokens): DesignTokens {
  if (Platform.OS === "android") {
    // Android uses elevation instead of shadows
    return {
      ...tokens,
      shadow: {
        sm: { ...tokens.shadow.sm, shadowOpacity: 0 },
        md: { ...tokens.shadow.md, shadowOpacity: 0 },
        lg: { ...tokens.shadow.lg, shadowOpacity: 0 },
      },
    };
  }

  return tokens;
}
