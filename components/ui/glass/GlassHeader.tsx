/**
 * GlassHeader - Glassmorphism styled header component
 *
 * Custom header with glass background, back button, title,
 * and action buttons for screen navigation.
 */

import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  blur as blurConfig,
} from "@/lib/design/glassTokens";
import { headerLayout } from "@/lib/design/layoutPatterns";
import { BackButton } from "./SimpleHeader";

// =============================================================================
// TYPES
// =============================================================================

export interface HeaderAction {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}

export interface GlassHeaderProps {
  /** Header title */
  title: string;
  /** Large title variant */
  largeTitle?: boolean;
  /** Show back button */
  showBack?: boolean;
  /** Custom back handler (defaults to router.back) */
  onBack?: () => void;
  /** Right side action buttons */
  actions?: HeaderAction[];
  /** Subtitle text */
  subtitle?: string;
  /** Transparent background (no blur/solid) */
  transparent?: boolean;
  /** Custom left element (replaces back button) */
  leftElement?: React.ReactNode;
  /** Custom right element (replaces actions, shown in bottom row) */
  rightElement?: React.ReactNode;
  /** Container styles */
  style?: StyleProp<ViewStyle>;
}

// =============================================================================
// ACTION BUTTON COMPONENT
// =============================================================================

interface ActionButtonProps {
  action: HeaderAction;
}

function ActionButton({ action }: ActionButtonProps) {
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
    if (action.disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action.onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={action.disabled}
        style={[
          styles.actionButton,
          action.disabled && styles.actionButtonDisabled,
        ]}
      >
        <MaterialCommunityIcons
          name={action.icon}
          size={24}
          color={action.color || colors.text.primary}
        />
      </Pressable>
    </Animated.View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function GlassHeader({
  title,
  largeTitle = false,
  showBack = false,
  onBack,
  actions,
  subtitle,
  transparent = false,
  leftElement,
  rightElement,
  style,
}: GlassHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const hasBottomRow = (!largeTitle && subtitle) || rightElement || actions;

  const headerContent = (
    <View style={styles.headerOuter}>
      {/* Row 1: Back + Title (flex: 1, left-aligned) */}
      <View style={headerLayout.topRow}>
        <View style={styles.leftContainer}>
          {leftElement || (showBack && <BackButton onPress={handleBack} />)}
        </View>
        {!largeTitle && (
          <Text style={styles.title}>
            {title}
          </Text>
        )}
      </View>

      {/* Row 2: [Left container] ← space-between → [Right container] */}
      {hasBottomRow ? (
        <View style={[headerLayout.bottomRow, { paddingLeft: 36 + spacing.sm }]}>
          <View style={headerLayout.bottomRowLeft}>
            {!largeTitle && subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={headerLayout.bottomRowRight}>
            {rightElement || (
              actions?.map((action, index) => (
                <ActionButton key={index} action={action} />
              ))
            )}
          </View>
        </View>
      ) : null}
    </View>
  );

  // Large title layout
  const largeTitleContent = largeTitle && (
    <View style={styles.largeTitleContainer}>
      <Text style={styles.largeTitle}>{title}</Text>
      {subtitle && (
        <Text style={styles.largeTitleSubtitle}>{subtitle}</Text>
      )}
    </View>
  );

  // Transparent header
  if (transparent) {
    return (
      <View style={[styles.container, style]}>
        {headerContent}
        {largeTitleContent}
      </View>
    );
  }

  // Glass header with blur (iOS) or solid background (Android)
  if (Platform.OS === "ios" && blurConfig.isSupported) {
    return (
      <View style={[styles.container, style]}>
        <BlurView intensity={60} tint="dark" style={styles.blurView}>
          {headerContent}
        </BlurView>
        {largeTitleContent}
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.solidBackground, style]}>
      {headerContent}
      {largeTitleContent}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    marginBottom: spacing.sm,
  },
  solidBackground: {
    backgroundColor: `${colors.background.secondary}F5`, // 96% opacity, matches SimpleHeader
  },
  blurView: {
    flex: 1,
  },
  headerOuter: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  leftContainer: {
    minWidth: 36,
    alignItems: "flex-start",
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    paddingVertical: 2,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  largeTitleContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  largeTitle: {
    ...typography.displaySmall,
    color: colors.text.primary,
  },
  largeTitleSubtitle: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.background,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
});

export default GlassHeader;
