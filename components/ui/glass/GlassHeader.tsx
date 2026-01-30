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
  blur as blurConfig,
} from "@/lib/design/glassTokens";

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
  /** Custom right element (replaces actions) */
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
// BACK BUTTON COMPONENT
// =============================================================================

interface BackButtonProps {
  onPress: () => void;
}

function BackButton({ onPress }: BackButtonProps) {
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
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const headerContent = (
    <View style={[styles.headerInner, { paddingTop: insets.top }]}>
      {/* Left Side */}
      <View style={styles.leftContainer}>
        {leftElement || (showBack && <BackButton onPress={handleBack} />)}
      </View>

      {/* Center - Title */}
      <View style={styles.centerContainer}>
        {!largeTitle && (
          <>
            <Text
              style={styles.title}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </>
        )}
      </View>

      {/* Right Side */}
      <View style={styles.rightContainer}>
        {rightElement || (
          actions?.map((action, index) => (
            <ActionButton key={index} action={action} />
          ))
        )}
      </View>
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
  },
  solidBackground: {
    backgroundColor: `${colors.background.primary}F0`, // 94% opacity
  },
  blurView: {
    flex: 1,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    minHeight: 56,
  },
  leftContainer: {
    width: 60,
    alignItems: "flex-start",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
  },
  rightContainer: {
    width: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: 2,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.background,
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
  // Simple Header styles
  simpleHeader: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  simpleHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  simpleHeaderText: {
    flex: 1,
  },
  simpleTitle: {
    ...typography.displaySmall,
    color: colors.text.primary,
  },
  simpleSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});

// =============================================================================
// SIMPLE HEADER (no navigation features)
// =============================================================================

export interface SimpleHeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  /** Include safe area top padding (set false when used inside GlassScreen) */
  includeSafeArea?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SimpleHeader({
  title,
  subtitle,
  rightElement,
  includeSafeArea = false, // Default false - assumes used inside GlassScreen which handles safe area
  style,
}: SimpleHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.simpleHeader,
        includeSafeArea && { paddingTop: insets.top },
        style,
      ]}
    >
      <View style={styles.simpleHeaderContent}>
        <View style={styles.simpleHeaderText}>
          <Text style={styles.simpleTitle}>{title}</Text>
          {subtitle && (
            <Text style={styles.simpleSubtitle}>{subtitle}</Text>
          )}
        </View>
        {rightElement}
      </View>
    </View>
  );
}

const simpleStyles = StyleSheet.create({});

// Extend styles
Object.assign(styles, {
  simpleHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  simpleHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  simpleHeaderText: {
    flex: 1,
  },
  simpleTitle: {
    ...typography.headlineLarge,
    color: colors.text.primary,
  },
  simpleSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});

export default GlassHeader;
