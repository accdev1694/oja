import React from "react";
import { Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  AnimatedSection,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

const CombineActionBar = React.memo(function CombineActionBar({
  selectedCount,
  onCombine,
}: {
  selectedCount: number;
  onCombine: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <AnimatedSection animation="fadeInUp" duration={300} style={styles.combineActionContainer}>
      <Pressable
        style={styles.combineActionButton}
        onPress={onCombine}
      >
        <MaterialCommunityIcons name="layers-plus" size={20} color={colors.text.inverse} />
        <Text style={styles.combineActionText}>
          Combine {selectedCount} List{selectedCount > 1 ? "s" : ""}
        </Text>
      </Pressable>
    </AnimatedSection>
  );
});

export { CombineActionBar };

const styles = StyleSheet.create({
  combineActionContainer: {
    position: "absolute",
    bottom: spacing.lg + 80,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  combineActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  combineActionText: {
    ...typography.labelLarge,
    color: colors.text.inverse,
    fontWeight: "600",
  },
});
