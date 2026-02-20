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
  /** Custom right element (replaces actions, shown in bottom row) */
  rightElement?: React.ReactNode;
  /** Element shown at the right of the top row (title row) */
  topRightElement?: React.ReactNode;
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
  topRightElement,
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
    <View style={[styles.headerOuter, { paddingTop: insets.top }]}>
      {/* Row 1: Back + Title */}
      <View style={styles.headerTopRow}>
        <View style={styles.leftContainer}>
          {leftElement || (showBack && <BackButton onPress={handleBack} />)}
        </View>
        {!largeTitle && (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        )}
        {topRightElement}
      </View>

      {/* Row 2: Subtitle + Right actions */}
      {(!largeTitle && subtitle) || rightElement || actions ? (
        <View style={styles.headerBottomRow}>
          {!largeTitle && subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : (
            <View />
          )}
          <View style={styles.rightContainer}>
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
  },
  solidBackground: {
    backgroundColor: `${colors.background.secondary}F5`, // 96% opacity, matches SimpleHeader
  },
  blurView: {
    flex: 1,
  },
  headerOuter: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
  },
  headerBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 44 + spacing.md,
    marginTop: -4,
  },
  leftContainer: {
    minWidth: 44,
    alignItems: "flex-start",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    flex: 1,
    marginLeft: spacing.sm,
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
    alignItems: "flex-start",
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
    fontSize: 12,
    lineHeight: 16,
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
  /** Optional accent color shown as a subtle dot next to the title */
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function SimpleHeader({
  title,
  subtitle,
  rightElement,
  includeSafeArea = false, // Default false - assumes used inside GlassScreen which handles safe area
  accentColor,
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
        <Text style={[styles.simpleTitle, { flex: 1 }]}>{title}</Text>
        {rightElement}
      </View>
      {subtitle && (
        <Text style={styles.simpleSubtitle}>{subtitle}</Text>
      )}
    </View>
  );
}

const simpleStyles = StyleSheet.create({});

// Extend styles
Object.assign(styles, {
  simpleHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.lg,
    backgroundColor: `${colors.background.secondary}F5`,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  simpleHeaderContent: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    fontSize: 12,
    lineHeight: 16,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});

export default GlassHeader;
