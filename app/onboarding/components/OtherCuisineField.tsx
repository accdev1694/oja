import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
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

interface OtherCuisineFieldProps {
  isSelected: boolean;
  text: string;
  onToggle: () => void;
  onChangeText: (text: string) => void;
}

/** Grid tile for "Other" cuisine + expandable text input below the grid. */
export function OtherCuisineTile({ isSelected, onToggle }: Pick<OtherCuisineFieldProps, "isSelected" | "onToggle">) {
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
          accentColor={isSelected ? colors.accent.primary : undefined}
          style={[styles.card, isSelected && styles.cardSelected]}
        >
          <MaterialCommunityIcons
            name="plus"
            size={28}
            color={isSelected ? colors.accent.primary : colors.text.tertiary}
          />
          <Text style={[styles.name, isSelected && styles.nameSelected]}>
            Other
          </Text>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

/** Expandable text input shown below the cuisine grid when "Other" is selected. */
export function OtherCuisineInput({ text, onChangeText }: Pick<OtherCuisineFieldProps, "text" | "onChangeText">) {
  return (
    <View style={styles.inputContainer}>
      <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.inputCard}>
        <View style={styles.inputRow}>
          <MaterialCommunityIcons
            name="food-variant"
            size={20}
            color={colors.accent.primary}
          />
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={onChangeText}
            placeholder="Type your cuisine (e.g. Somali, Peruvian)"
            placeholderTextColor={colors.text.disabled}
            maxLength={40}
            autoCapitalize="words"
            autoFocus
          />
        </View>
      </GlassCard>
    </View>
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
  name: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
    fontWeight: "600",
    textAlign: "center",
  },
  nameSelected: {
    color: colors.accent.primary,
  },
  inputContainer: {
    width: "100%",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  inputCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
    padding: 0,
  },
});
