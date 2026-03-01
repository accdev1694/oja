import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  GlassModal,
  colors,
  typography,
  spacing,
  borderRadius,
  animations,
} from "@/components/ui/glass";

interface CreateListOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onFromScratch: () => void;
  onUseTemplate: () => void;
  hasHistory: boolean;
}

interface OptionCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}

function OptionCard({ icon, title, subtitle, onPress, disabled }: OptionCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.97, animations.spring.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animations.spring.gentle);
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.optionCard,
          disabled && styles.optionCardDisabled,
          pressed && !disabled && { opacity: 0.9 },
        ]}
      >
        <View style={styles.optionIcon}>
          <MaterialCommunityIcons
            name={icon}
            size={28}
            color={disabled ? colors.text.tertiary : colors.accent.primary}
          />
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionTitle, disabled && styles.disabledText]}>
            {title}
          </Text>
          <Text style={styles.optionSubtitle}>{subtitle}</Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={colors.text.tertiary}
        />
      </Pressable>
    </Animated.View>
  );
}

export function CreateListOptionsModal({
  visible,
  onClose,
  onFromScratch,
  onUseTemplate,
  hasHistory,
}: CreateListOptionsModalProps) {
  return (
    <GlassModal visible={visible} onClose={onClose}>
      <Text style={styles.modalTitle}>Create a New List</Text>
      <Text style={styles.modalSubtitle}>Choose how to start</Text>

      <View style={styles.optionsContainer}>
        <OptionCard
          icon="file-document-plus-outline"
          title="Start from Scratch"
          subtitle="Create a new empty list"
          onPress={onFromScratch}
        />

        <OptionCard
          icon="content-copy"
          title="Use a Template"
          subtitle={
            hasHistory
              ? "Copy items from a previous list"
              : "No completed lists yet"
          }
          onPress={onUseTemplate}
          disabled={!hasHistory}
        />
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  modalTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: spacing.md,
  },
  optionCardDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
    gap: spacing.xs,
  },
  optionTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontWeight: "600",
  },
  optionSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  disabledText: {
    color: colors.text.tertiary,
  },
});
