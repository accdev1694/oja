/**
 * GlassTabBar - Glassmorphism styled tab bar for bottom navigation
 *
 * Custom tab bar component for Expo Router with glass styling,
 * animated indicators, and haptic feedback.
 */

import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import {
  colors,
  borderRadius as radii,
  typography,
  spacing,
  animations,
  blur as blurConfig,
} from "@/lib/design/glassTokens";

// =============================================================================
// TYPES
// =============================================================================

export interface TabConfig {
  name: string;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconFocused?: keyof typeof MaterialCommunityIcons.glyphMap;
  color?: string;
}

/** Approximate tab bar height (icon + label + padding). Use for bottom spacers. */
export const TAB_BAR_HEIGHT = 80;

export const TAB_CONFIG: Record<string, TabConfig> = {
  stock: {
    name: "stock",
    title: "Stock",
    icon: "home-outline",
    iconFocused: "home",
    color: colors.semantic.pantry,
  },
  index: {
    name: "index",
    title: "Lists",
    icon: "clipboard-list-outline",
    iconFocused: "clipboard-list",
    color: colors.semantic.lists,
  },
  scan: {
    name: "scan",
    title: "Scan",
    icon: "camera-outline",
    iconFocused: "camera",
    color: colors.semantic.scan,
  },
  profile: {
    name: "profile",
    title: "Profile",
    icon: "account-outline",
    iconFocused: "account",
    color: colors.semantic.profile,
  },
};

// =============================================================================
// TAB ITEM COMPONENT
// =============================================================================

interface TabItemProps {
  config: TabConfig;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function TabItem({ config, isFocused, onPress, onLongPress }: TabItemProps) {
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0);

  React.useEffect(() => {
    bgOpacity.value = withTiming(isFocused ? 1 : 0, {
      duration: animations.timing.fast,
    });
  }, [isFocused, bgOpacity]);

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBg = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, animations.spring.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animations.spring.gentle);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const iconName = isFocused
    ? config.iconFocused || config.icon
    : config.icon;

  const iconColor = isFocused
    ? config.color || colors.accent.primary
    : colors.text.tertiary;

  const textColor = isFocused
    ? config.color || colors.accent.primary
    : colors.text.tertiary;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.tabItemInner, animatedScale]}>
        {/* Active background pill */}
        <Animated.View
          style={[
            styles.activeBg,
            {
              backgroundColor: config.color
                ? `${config.color}20`
                : colors.semantic.pantryGlow,
            },
            animatedBg,
          ]}
        />

        {/* Icon */}
        <MaterialCommunityIcons
          name={iconName}
          size={24}
          color={iconColor}
        />

        {/* Label */}
        <Text
          style={[
            styles.tabLabel,
            { color: textColor },
            isFocused && styles.tabLabelActive,
          ]}
        >
          {config.title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, spacing.sm);

  const tabBarContent = (
    <View style={[styles.tabBarInner, { paddingBottom: bottomPadding }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const config = TAB_CONFIG[route.name] || {
          name: route.name,
          title: options.title || route.name,
          icon: "circle-outline",
          color: colors.accent.primary,
        };

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <TabItem
            key={route.key}
            config={config}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );

  // Use BlurView on iOS, solid background on Android
  if (Platform.OS === "ios" && blurConfig.isSupported) {
    return (
      <View style={styles.container}>
        <BlurView
          intensity={80}
          tint="dark"
          style={styles.blurView}
        >
          {tabBarContent}
        </BlurView>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.solidBackground]}>
      {tabBarContent}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  solidBackground: {
    backgroundColor: `${colors.background.primary}F5`, // 96% opacity
  },
  blurView: {
    flex: 1,
  },
  tabBarInner: {
    flexDirection: "row",
    paddingTop: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItemInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    position: "relative",
  },
  activeBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.lg,
  },
  tabLabel: {
    ...typography.labelSmall,
    marginTop: spacing.xs,
    textTransform: "none",
    letterSpacing: 0,
  },
  tabLabelActive: {
    fontWeight: "600",
  },
});

// =============================================================================
// SIMPLE TAB ICON (for use with default Tabs)
// =============================================================================

interface GlassTabIconProps {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  size: number;
  focused?: boolean;
}

export function GlassTabIcon({ name, color, size, focused }: GlassTabIconProps) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
    />
  );
}

export default GlassTabBar;
