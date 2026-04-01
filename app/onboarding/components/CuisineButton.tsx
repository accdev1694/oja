import { Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  GlassCard,
  colors,
  typography,
  spacing,
  animations,
} from "@/components/ui/glass";
import type { CuisineOption } from "../cuisineData";

interface CuisineButtonProps {
  cuisine: CuisineOption;
  isSelected: boolean;
  onToggle: () => void;
}

export function CuisineButton({ cuisine, isSelected, onToggle }: CuisineButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, animations.spring.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animations.spring.gentle);
  };

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        onPress={onToggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <GlassCard
          variant={isSelected ? "bordered" : "standard"}
          accentColor={isSelected ? colors.accent.primary : undefined}
          style={[styles.card, isSelected && styles.cardSelected]}
        >
          <Text style={styles.emoji}>{cuisine.emoji}</Text>
          <Text
            style={[styles.name, isSelected && styles.nameSelected]}
            numberOfLines={1}
          >
            {cuisine.name}
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
    paddingVertical: spacing.md,
  },
  cardSelected: {
    backgroundColor: `${colors.accent.primary}10`,
  },
  emoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.labelMedium,
    color: colors.text.primary,
    fontWeight: "600",
    textAlign: "center",
  },
  nameSelected: {
    color: colors.accent.primary,
  },
});
