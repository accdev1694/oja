import { Text, Pressable, StyleSheet } from "react-native";
import { ComponentProps } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";
import type { DietaryOption } from "../cuisineData";

interface DietaryButtonProps {
  diet: DietaryOption;
  isSelected: boolean;
  onToggle: () => void;
}

export function DietaryButton({ diet, isSelected, onToggle }: DietaryButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        onPress={onToggle}
        onPressIn={() => (scale.value = withSpring(0.95))}
        onPressOut={() => (scale.value = withSpring(1))}
      >
        <GlassCard
          variant={isSelected ? "bordered" : "standard"}
          accentColor={isSelected ? colors.accent.success : undefined}
          style={[styles.card, isSelected && styles.cardSelected]}
        >
          <MaterialCommunityIcons
            name={diet.icon as ComponentProps<typeof MaterialCommunityIcons>["name"]}
            size={24}
            color={isSelected ? colors.accent.success : colors.text.secondary}
          />
          <Text
            style={[styles.name, isSelected && styles.nameSelected]}
          >
            {diet.name}
          </Text>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "31%",
    flexGrow: 1,
  },
  card: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  cardSelected: {
    backgroundColor: `${colors.accent.success}10`,
  },
  name: {
    ...typography.labelSmall,
    color: colors.text.primary,
    textAlign: "center",
  },
  nameSelected: {
    color: colors.accent.success,
    fontWeight: "700",
  },
});
