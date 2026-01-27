/**
 * AdaptiveCard Component
 *
 * Platform and tier-adaptive card component
 * - Premium tier: Liquid Glass blur (iOS) or elevated surface (Android)
 * - Enhanced tier: Gradient backgrounds
 * - Baseline tier: Solid colors with simple shadows
 */

import { StyleSheet, View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useDeviceCapabilities } from '@/hooks/useDeviceCapabilities';

interface AdaptiveCardProps extends ViewProps {
  /**
   * Blur intensity (only used on premium iOS)
   * @default 50
   */
  intensity?: number;

  /**
   * Background color (used for enhanced/baseline tiers)
   * @default '#FFFAF8'
   */
  backgroundColor?: string;

  /**
   * Shadow size
   * @default 'medium'
   */
  shadowSize?: 'small' | 'medium' | 'large';
}

export function AdaptiveCard({
  children,
  intensity = 50,
  backgroundColor = '#FFFAF8',
  shadowSize = 'medium',
  style,
  ...props
}: AdaptiveCardProps) {
  const { tier, supportsBlur, platform, tokens } = useDeviceCapabilities();

  const shadowStyle = tokens.shadow[shadowSize];

  // PREMIUM TIER: iOS with blur support
  if (tier === 'premium' && supportsBlur && platform === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint="light"
        style={[
          styles.premiumCard,
          {
            borderRadius: tokens.borderRadius.card,
          },
          style,
        ]}
        {...props}
      >
        {children}
      </BlurView>
    );
  }

  // ENHANCED TIER: Gradient fallback (looks similar to blur)
  if (tier === 'enhanced') {
    return (
      <LinearGradient
        colors={['rgba(255,250,248,0.98)', 'rgba(255,250,248,0.95)']}
        style={[
          styles.enhancedCard,
          {
            borderRadius: tokens.borderRadius.card,
            ...shadowStyle,
          },
          platform === 'ios' && styles.iosEnhanced,
          platform === 'android' && styles.androidEnhanced,
          style,
        ]}
        {...props}
      >
        {children}
      </LinearGradient>
    );
  }

  // BASELINE TIER or PREMIUM ANDROID: Solid background
  return (
    <View
      style={[
        styles.baselineCard,
        {
          backgroundColor,
          borderRadius: tokens.borderRadius.card,
          ...shadowStyle,
        },
        platform === 'ios' && styles.iosBaseline,
        platform === 'android' && styles.androidBaseline,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // Premium iOS (Liquid Glass)
  premiumCard: {
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // Enhanced tier (gradient)
  enhancedCard: {
    overflow: 'hidden',
  },
  iosEnhanced: {
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  androidEnhanced: {
    // Elevation set via shadowStyle
  },

  // Baseline tier (solid)
  baselineCard: {
    overflow: 'hidden',
  },
  iosBaseline: {
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  androidBaseline: {
    // Elevation set via shadowStyle
  },
});
