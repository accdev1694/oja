import React, { ComponentProps, useState } from "react";
import {
  ScrollView,
  Pressable,
  Text,
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/components/ui/glass";
import { safeHaptics } from "@/lib/haptics/safeHaptics";
import { AdminTab } from "../types";

interface TabItem {
  key: AdminTab;
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
}

interface AdminTabBarProps {
  tabs: TabItem[];
  activeTab: AdminTab;
  onTabPress: (tab: AdminTab) => void;
  onSearchPress: () => void;
  /** Exit the admin screen entirely (to previous route or profile). */
  onExit?: () => void;
}

// Primary tabs always visible, rest go in "More" menu.
// On mobile, 4 primary items + More + search + exit still fits comfortably
// at 375px viewport. Previously this was 2, which pushed 80% of tabs behind
// an overflow menu — now the core workflow tabs are inline.
const PRIMARY_TAB_COUNT = 4;

/**
 * AdminTabBar Component
 * Responsive navigation bar: primary tabs + overflow "More" menu, search, exit.
 */
export function AdminTabBar({ tabs, activeTab, onTabPress, onSearchPress, onExit }: AdminTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const isMobile = width < 768;
  // `navigator` only exists on web. Guard with `typeof` so native bundlers
  // don't treat the reference as a runtime dependency.
  const isMacWeb =
    isWeb && typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
  const shortcutLabel = Platform.OS === "ios" || isMacWeb ? "⌘K" : "Ctrl+K";

  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // On mobile, split tabs into primary (visible) and overflow (in More menu)
  const primaryTabs = isMobile ? tabs.slice(0, PRIMARY_TAB_COUNT) : tabs;
  const overflowTabs = isMobile ? tabs.slice(PRIMARY_TAB_COUNT) : [];
  const hasOverflow = overflowTabs.length > 0;

  // Check if active tab is in overflow
  const activeInOverflow = overflowTabs.some((t) => t.key === activeTab);

  const handleOverflowTabPress = (tab: AdminTab) => {
    setShowMoreMenu(false);
    onTabPress(tab);
    safeHaptics.selection();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={{ flex: 1 }}
        >
          {primaryTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  onTabPress(tab.key);
                  safeHaptics.selection();
                }}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${tab.label} tab`}
              >
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={18}
                  color={isActive ? colors.accent.primary : colors.text.tertiary}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </Pressable>
            );
          })}

          {/* More button for overflow tabs */}
          {hasOverflow && (
            <Pressable
              onPress={() => {
                setShowMoreMenu(true);
                safeHaptics.selection();
              }}
              style={[styles.tabItem, activeInOverflow && styles.tabItemActive]}
              accessibilityRole="button"
              accessibilityLabel={`More tabs (${overflowTabs.length} more)`}
              accessibilityHint="Opens menu with additional admin tabs"
            >
              <MaterialCommunityIcons
                name="dots-horizontal"
                size={18}
                color={activeInOverflow ? colors.accent.primary : colors.text.tertiary}
              />
              <Text style={[styles.tabLabel, activeInOverflow && styles.tabLabelActive]}>
                More
              </Text>
              {activeInOverflow && <View style={styles.activeIndicator} />}
            </Pressable>
          )}
        </ScrollView>

        <Pressable
          onPress={() => {
            onSearchPress();
            safeHaptics.selection();
          }}
          style={styles.searchButton}
          accessibilityRole="button"
          accessibilityLabel="Search admin"
          accessibilityHint={isWeb ? `Keyboard shortcut ${shortcutLabel}` : undefined}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={colors.text.tertiary} />
          {isWeb && (
            <View style={styles.shortcutBadge}>
              <Text style={styles.shortcutText}>{shortcutLabel}</Text>
            </View>
          )}
        </Pressable>

        {onExit && (
          <Pressable
            onPress={() => {
              onExit();
              safeHaptics.selection();
            }}
            style={styles.exitButton}
            accessibilityRole="button"
            accessibilityLabel="Exit admin dashboard"
          >
            <MaterialCommunityIcons name="close" size={22} color={colors.text.tertiary} />
          </Pressable>
        )}
      </View>

      {/* More Menu Modal */}
      <Modal
        visible={showMoreMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { paddingTop: insets.top + spacing.xl }]}
          onPress={() => setShowMoreMenu(false)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss more menu"
        >
          <View style={styles.moreMenu}>
            <View style={styles.moreMenuHeader}>
              <Text style={styles.moreMenuTitle}>More</Text>
              <Pressable
                onPress={() => setShowMoreMenu(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close more menu"
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.text.secondary} />
              </Pressable>
            </View>
            {overflowTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => handleOverflowTabPress(tab.key)}
                  style={[styles.moreMenuItem, isActive && styles.moreMenuItemActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${tab.label} tab`}
                >
                  <MaterialCommunityIcons
                    name={tab.icon}
                    size={20}
                    color={isActive ? colors.accent.primary : colors.text.secondary}
                  />
                  <Text style={[styles.moreMenuLabel, isActive && styles.moreMenuLabelActive]}>
                    {tab.label}
                  </Text>
                  {isActive && (
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color={colors.accent.primary}
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    backgroundColor: "transparent",
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    height: 48,
    alignItems: "center",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    height: 48,
    gap: 6,
    borderLeftWidth: 1,
    borderLeftColor: colors.glass.border,
  },
  exitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    height: 48,
    minWidth: 44,
    borderLeftWidth: 1,
    borderLeftColor: colors.glass.border,
  },
  shortcutBadge: {
    backgroundColor: `${colors.glass.border}60`,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  shortcutText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontWeight: "700",
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    height: "100%",
    gap: 6,
    position: "relative",
  },
  tabItemActive: {
    // No background change, using indicator instead
  },
  tabLabel: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: colors.accent.primary,
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: spacing.md,
    right: spacing.md,
    height: 3,
    backgroundColor: colors.accent.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  // More Menu styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.glass.scrim,
    justifyContent: "flex-start",
    paddingHorizontal: spacing.lg,
  },
  moreMenu: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: "hidden",
  },
  moreMenuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  moreMenuTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "700",
  },
  moreMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  moreMenuItemActive: {
    backgroundColor: `${colors.accent.primary}15`,
  },
  moreMenuLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  moreMenuLabelActive: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
});
