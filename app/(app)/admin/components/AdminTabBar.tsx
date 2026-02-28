import React, { ComponentProps } from "react";
import { ScrollView, Pressable, Text, View, StyleSheet } from "react-native";
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

/**
 * AdminTabBar Component
 * A persistent horizontal scrollable navigation bar for the Admin Dashboard.
 */
export function AdminTabBar({ tabs, activeTab, onTabPress, onSearchPress }: AdminTabBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={{ flex: 1 }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  onTabPress(tab.key);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.tabItem,
                  isActive && styles.tabItemActive
                ]}
              >
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={18}
                  color={isActive ? colors.accent.primary : colors.text.tertiary}
                />
                <Text style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive
                ]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </Pressable>
            );
          })}
        </ScrollView>
        
        <Pressable 
          onPress={() => { onSearchPress(); Haptics.selectionAsync(); }}
          style={styles.searchButton}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={colors.text.tertiary} />
        </Pressable>
      </View>
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
    paddingHorizontal: spacing.md,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: colors.glass.border,
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
});
