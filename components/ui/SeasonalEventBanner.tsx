import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  colors,
  typography,
  spacing,
  borderRadius,
} from "./glass";

export function SeasonalEventBanner() {
  const activeEvent = useQuery(api.events.getActiveEvent);

  if (!activeEvent) return null;

  const getIcon = () => {
    switch (activeEvent.type) {
      case "points_multiplier": return "star-shooting";
      case "bonus_points": return "gift";
      case "tier_boost": return "trending-up";
      default: return "calendar-star";
    }
  };

  return (
    <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: `${colors.accent.primary}20` }]}>
          <MaterialCommunityIcons name={getIcon()} size={24} color={colors.accent.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{activeEvent.name}</Text>
          <Text style={styles.description}>{activeEvent.description}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    padding: spacing.md,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  title: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "700",
  },
  description: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
});
