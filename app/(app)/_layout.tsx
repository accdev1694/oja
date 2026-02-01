import { Redirect, Stack, usePathname, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from "react-native";
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
import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import {
  TAB_CONFIG,
  TAB_BAR_HEIGHT,
  colors,
  spacing,
  typography,
  borderRadius as radii,
  blur as blurConfig,
  animations,
} from "@/components/ui/glass";

// =============================================================================
// ROUTES WHERE TAB BAR IS HIDDEN (focused-task flows)
// =============================================================================

const HIDE_TAB_BAR_PATTERNS = [
  "/receipt/",
  "/trip-summary",
  "/pantry-pick",
  "/join-list",
  "/onboarding",
];

function shouldShowTabBar(pathname: string): boolean {
  return !HIDE_TAB_BAR_PATTERNS.some((p) => pathname.includes(p));
}

/** Map current pathname to which tab should be highlighted */
function getActiveTab(pathname: string): string {
  // Direct tab routes
  if (pathname === "/(app)/(tabs)" || pathname === "/(app)/(tabs)/index" || pathname === "/") return "index";
  if (pathname.includes("/(tabs)/lists") || pathname.includes("/lists")) return "lists";
  if (pathname.includes("/(tabs)/scan") || pathname.includes("/scan")) return "scan";
  if (pathname.includes("/(tabs)/profile") || pathname.includes("/profile")) return "profile";
  if (pathname.includes("/(tabs)/index") || pathname.includes("/(tabs)")) return "index";

  // Nested routes → map to parent tab
  if (pathname.includes("/list/") || pathname.includes("/partners") || pathname.includes("/notifications")) return "lists";
  if (pathname.includes("/price-history")) return "index";
  if (pathname.includes("/insights") || pathname.includes("/subscription") || pathname.includes("/admin") || pathname.includes("/edit-profile")) return "profile";

  return "index";
}

// =============================================================================
// TAB ITEM
// =============================================================================

interface TabItemProps {
  config: (typeof TAB_CONFIG)[string];
  isFocused: boolean;
  onPress: () => void;
  badge?: number;
}

function TabItem({ config, isFocused, onPress, badge }: TabItemProps) {
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(isFocused ? 1 : 0);

  React.useEffect(() => {
    bgOpacity.value = withTiming(isFocused ? 1 : 0, { duration: animations.timing.fast });
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

  const iconName = isFocused ? config.iconFocused || config.icon : config.icon;
  const iconColor = isFocused ? config.color || colors.accent.primary : colors.text.tertiary;
  const textColor = isFocused ? config.color || colors.accent.primary : colors.text.tertiary;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={tabStyles.tabItem}
    >
      <Animated.View style={[tabStyles.tabItemInner, animatedScale]}>
        <Animated.View
          style={[
            tabStyles.activeBg,
            { backgroundColor: config.color ? `${config.color}20` : colors.semantic.pantryGlow },
            animatedBg,
          ]}
        />
        <View style={{ position: "relative" }}>
          <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
          {badge != null && badge > 0 && (
            <View style={tabStyles.badge}>
              <Text style={tabStyles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
            </View>
          )}
        </View>
        <Text style={[tabStyles.tabLabel, { color: textColor }, isFocused && tabStyles.tabLabelActive]}>
          {config.title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// =============================================================================
// PERSISTENT TAB BAR
// =============================================================================

function PersistentTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, spacing.sm);
  const { user } = useCurrentUser();

  // Stock tab badge: count of Low + Out items
  const pantryItems = useQuery(
    api.pantryItems.getByUser,
    user?._id ? { userId: user._id } : "skip"
  );
  const stockBadge = React.useMemo(() => {
    if (!pantryItems) return 0;
    return pantryItems.filter(
      (item: any) => item.stockLevel === "low" || item.stockLevel === "out"
    ).length;
  }, [pantryItems]);

  const show = shouldShowTabBar(pathname);
  const activeTab = getActiveTab(pathname);

  if (!show) return null;

  const tabs = ["index", "lists", "scan", "profile"] as const;

  const handleTabPress = (tabName: string) => {
    const routes: Record<string, string> = {
      index: "/(app)/(tabs)/",
      lists: "/(app)/(tabs)/lists",
      scan: "/(app)/(tabs)/scan",
      profile: "/(app)/(tabs)/profile",
    };
    router.navigate(routes[tabName] as any);
  };

  const tabBarContent = (
    <View style={[tabStyles.tabBarInner, { paddingBottom: bottomPadding }]}>
      {tabs.map((tabName) => {
        const config = TAB_CONFIG[tabName];
        const badge = tabName === "index" ? stockBadge : undefined;
        return (
          <TabItem
            key={tabName}
            config={config}
            isFocused={activeTab === tabName}
            onPress={() => handleTabPress(tabName)}
            badge={badge}
          />
        );
      })}
    </View>
  );

  if (Platform.OS === "ios" && blurConfig.isSupported) {
    return (
      <View style={tabStyles.container} pointerEvents="box-none">
        <BlurView intensity={80} tint="dark" style={tabStyles.blurView}>
          {tabBarContent}
        </BlurView>
      </View>
    );
  }

  return (
    <View style={[tabStyles.container, tabStyles.solidBackground]} pointerEvents="box-none">
      {tabBarContent}
    </View>
  );
}

// =============================================================================
// APP LAYOUT
// =============================================================================

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="list/[id]" />
        <Stack.Screen
          name="pantry-pick"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen name="receipt/[id]/confirm" />
        <Stack.Screen name="receipt/[id]/reconciliation" />
        <Stack.Screen name="trip-summary" />
        <Stack.Screen name="partners" />
        <Stack.Screen name="join-list" />
        <Stack.Screen name="notifications" />
        <Stack.Screen
          name="insights"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen
          name="subscription"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen name="admin" />
      </Stack>
      <PersistentTabBar />
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.primary,
  },
});

const tabStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  solidBackground: {
    backgroundColor: `${colors.background.primary}F5`,
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
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: colors.semantic.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
  },
});
