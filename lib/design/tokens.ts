/**
 * Design Tokens System
 *
 * Platform-adaptive and tier-aware design tokens
 * Provides consistent styling across different device capabilities
 */

import { DeviceTier } from '@/lib/capabilities/deviceTier';

/**
 * Platform type
 */
export type Platform = 'ios' | 'android' | 'web';

/**
 * Design tokens for a specific tier and platform
 */
export interface DesignTokens {
  // Border radius
  borderRadius: {
    small: number;
    medium: number;
    large: number;
    card: number;
  };

  // Blur intensity (0 if not supported)
  blur: {
    subtle: number;
    medium: number;
    strong: number;
  };

  // Shadow configuration
  shadow: {
    small: ShadowConfig;
    medium: ShadowConfig;
    large: ShadowConfig;
  };

  // Animation durations (ms)
  animation: {
    fast: number;
    normal: number;
    slow: number;
  };

  // Spacing scale
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

interface ShadowConfig {
  elevation?: number; // Android
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
}

/**
 * Get design tokens for specific tier and platform
 */
export function getTokensForTier(tier: DeviceTier, platform: Platform): DesignTokens {
  const baseTokens = getBaseTokens(platform);

  switch (tier) {
    case 'premium':
      return {
        ...baseTokens,
        borderRadius: {
          small: platform === 'ios' ? 12 : 8,
          medium: platform === 'ios' ? 16 : 12,
          large: platform === 'ios' ? 24 : 16,
          card: platform === 'ios' ? 20 : 18,
        },
        blur: {
          subtle: 30,
          medium: 50,
          strong: 80,
        },
        shadow: {
          small: {
            elevation: platform === 'android' ? 2 : undefined,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          medium: {
            elevation: platform === 'android' ? 4 : undefined,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
          },
          large: {
            elevation: platform === 'android' ? 8 : undefined,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
          },
        },
        animation: {
          fast: 150,
          normal: 300,
          slow: 500,
        },
      };

    case 'enhanced':
      return {
        ...baseTokens,
        borderRadius: {
          small: platform === 'ios' ? 10 : 8,
          medium: platform === 'ios' ? 14 : 12,
          large: platform === 'ios' ? 20 : 16,
          card: platform === 'ios' ? 18 : 16,
        },
        blur: {
          subtle: 0, // No blur on enhanced tier
          medium: 0,
          strong: 0,
        },
        shadow: {
          small: {
            elevation: platform === 'android' ? 1 : undefined,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 3,
          },
          medium: {
            elevation: platform === 'android' ? 3 : undefined,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          },
          large: {
            elevation: platform === 'android' ? 6 : undefined,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
          },
        },
        animation: {
          fast: 100,
          normal: 200,
          slow: 350,
        },
      };

    case 'baseline':
      return {
        ...baseTokens,
        borderRadius: {
          small: 8,
          medium: 12,
          large: 16,
          card: 16,
        },
        blur: {
          subtle: 0, // No blur on baseline
          medium: 0,
          strong: 0,
        },
        shadow: {
          small: {
            elevation: platform === 'android' ? 1 : undefined,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 2,
          },
          medium: {
            elevation: platform === 'android' ? 2 : undefined,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
          },
          large: {
            elevation: platform === 'android' ? 3 : undefined,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
          },
        },
        animation: {
          fast: 50,
          normal: 150,
          slow: 250,
        },
      };
  }
}

/**
 * Base tokens shared across all tiers
 */
function getBaseTokens(platform: Platform): DesignTokens {
  return {
    borderRadius: {
      small: 8,
      medium: 12,
      large: 16,
      card: 16,
    },
    blur: {
      subtle: 0,
      medium: 0,
      strong: 0,
    },
    shadow: {
      small: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      large: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    },
    animation: {
      fast: 100,
      normal: 200,
      slow: 300,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
  };
}

/**
 * Oja brand colors (shared across all platforms and tiers)
 */
export const colors = {
  // Primary brand color
  primary: '#FF6B35',
  primaryLight: '#FF8F66',
  primaryDark: '#E84A1A',

  // Background
  background: '#FFFAF8',
  surface: '#FFFFFF',

  // Text
  text: '#2D3436',
  textSecondary: '#636E72',
  textTertiary: '#B2BEC3',

  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Stock levels
  stockStocked: '#10B981',
  stockGood: '#3B82F6',
  stockLow: '#F59E0B',
  stockOut: '#EF4444',

  // Budget status (Safe Zone)
  budgetSafe: '#10B981',
  budgetWarning: '#F59E0B',
  budgetDanger: '#EF4444',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
};
