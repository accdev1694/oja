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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/components/ui/glass";
import * as Haptics from "expo-haptics";
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
}

// Primary tabs always visible, rest go in "More" menu
// On mobile, only 3 items fit comfortably (2 tabs + More button)
const PRIMARY_TAB_COUNT = 2;

/**
 * AdminTabBar Component
 * A responsive navigation bar that shows primary tabs + "More" overflow menu on mobile.
 */
export function AdminTabBar({ tabs, activeTab, onTabPress, onSearchPress }: AdminTabBarProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isMobile = width < 768;
  const shortcutLabel =
    Platform.OS === "ios" || (isWeb && /Mac/i.test(navigator.userAgent)) ? "⌘K" : "Ctrl+K";

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
    Haptics.selectionAsync();
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
                  Haptics.selectionAsync();
                }}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
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
                Haptics.selectionAsync();
              }}
              style={[styles.tabItem, activeInOverflow && styles.tabItemActive]}
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
            Haptics.selectionAsync();
          }}
          style={styles.searchButton}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={colors.text.tertiary} />
          {isWeb && (
            <View style={styles.shortcutBadge}>
              <Text style={styles.shortcutText}>{shortcutLabel}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* More Menu Modal */}
      <Modal
        visible={showMoreMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMoreMenu(false)}>
          <View style={styles.moreMenu}>
            <View style={styles.moreMenuHeader}>
              <Text style={styles.moreMenuTitle}>More</Text>
              <Pressable onPress={() => setShowMoreMenu(false)} hitSlop={8}>
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
  shortcutBadge: {
    backgroundColor: `${colors.glass.border}60`,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  shortcutText: {
    fontSize: 9,
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-start",
    paddingTop: 100,
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
