/**
 * SimpleHeader - Lightweight header with title, subtitle, back button,
 * and optional right-side actions. Used across most app screens.
 */

import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import {
  colors,
  typography,
  spacing,
  animations,
} from "@/lib/design/glassTokens";
import { headerLayout } from "@/lib/design/layoutPatterns";

// =============================================================================
// BACK BUTTON (shared with GlassHeader)
// =============================================================================

export function BackButton({ onPress }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, animations.spring.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animations.spring.gentle);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.backButton}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          color={colors.text.primary}
        />
      </Pressable>
    </Animated.View>
  );
}

// =============================================================================
// SIMPLE HEADER
// =============================================================================

export interface SimpleHeaderProps {
  title: string;
  /** Subtitle string — rendered in bottom row left container */
  subtitle?: string;
  /** Custom left element for bottom row (replaces subtitle text) */
  subtitleElement?: React.ReactNode;
  /** Right container in bottom row (action icons/buttons) */
  rightElement?: React.ReactNode;
  /** Show back button */
  showBack?: boolean;
  /** Custom back handler (defaults to router.back) */
  onBack?: () => void;
  /** Include safe area top padding (set false when used inside GlassScreen) */
  includeSafeArea?: boolean;
  /** Optional accent color shown as a subtle dot next to the title */
  accentColor?: string;
  /** Override title text styles */
  titleStyle?: StyleProp<import("react-native").TextStyle>;
  style?: StyleProp<ViewStyle>;
  /** Optional title press handler */
  onTitlePress?: () => void;
}

export function SimpleHeader({
  title,
  subtitle,
  subtitleElement,
  rightElement,
  showBack = false,
  onBack,
  includeSafeArea = false,
  accentColor,
  titleStyle,
  style,
  onTitlePress,
}: SimpleHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleTitlePress = () => {
    if (onTitlePress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTitlePress();
    }
  };

  const leftContent = subtitleElement ?? (subtitle ? (
    <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
  ) : null);

  const hasBottomRow = leftContent || rightElement;

  return (
    <View
      style={[
        styles.container,
        includeSafeArea && { paddingTop: insets.top },
        style,
      ]}
    >
      {/* Row 1: Back button (optional) + Title (flex: 1, left-aligned) */}
      <View style={headerLayout.topRow}>
        {showBack && <BackButton onPress={handleBack} />}
        <Pressable
          onPress={handleTitlePress}
          disabled={!onTitlePress}
          style={{ flexShrink: 1 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Text style={[styles.title, titleStyle]}>{title}</Text>
            {accentColor && (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: accentColor,
                }}
              />
            )}
          </View>
        </Pressable>
      </View>

      {/* Row 2: [Left container] ← space-between → [Right container] */}
      {hasBottomRow && (
        <View style={headerLayout.bottomRow}>
          <View style={headerLayout.bottomRowLeft}>
            {leftContent}
          </View>
          {rightElement && (
            <View style={headerLayout.bottomRowRight}>
              {rightElement}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: `${colors.background.secondary}F5`,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  title: {
    ...typography.displaySmall,
    color: colors.text.primary,
    paddingVertical: 2,
  },
  subtitle: {
    ...typography.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.text.secondary,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.background,
  },
});
