/**
 * GlassInput - Glassmorphism styled text input component
 *
 * Provides consistent input styling with glass effects,
 * focus states, error handling, and optional icons.
 */

import React, { useState, forwardRef } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import {
  colors,
  borderRadius as radii,
  typography,
  spacing,
  animations,
} from "@/lib/design/glassTokens";

// =============================================================================
// TYPES
// =============================================================================

export type GlassInputVariant = "standard" | "filled";
export type GlassInputSize = "md" | "lg";

export interface GlassInputProps extends Omit<TextInputProps, "style"> {
  /** Input style variant */
  variant?: GlassInputVariant;
  /** Input size */
  size?: GlassInputSize;
  /** Label text */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message (also sets error state) */
  error?: string;
  /** Leading icon name */
  iconLeft?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Trailing icon name */
  iconRight?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Show clear button when has value */
  clearable?: boolean;
  /** Callback when clear button pressed */
  onClear?: () => void;
  /** Container styles */
  containerStyle?: StyleProp<ViewStyle>;
  /** Input container styles */
  inputContainerStyle?: StyleProp<ViewStyle>;
}

// =============================================================================
// STYLE PRESETS
// =============================================================================

const sizeStyles: Record<
  GlassInputSize,
  {
    height: number;
    fontSize: number;
    iconSize: number;
    paddingHorizontal: number;
  }
> = {
  md: {
    height: 48,
    fontSize: typography.bodyMedium.fontSize,
    iconSize: 20,
    paddingHorizontal: spacing.lg,
  },
  lg: {
    height: 56,
    fontSize: typography.bodyLarge.fontSize,
    iconSize: 24,
    paddingHorizontal: spacing.xl,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

const AnimatedView = Animated.createAnimatedComponent(View);

export const GlassInput = forwardRef<TextInput, GlassInputProps>(
  (
    {
      variant = "standard",
      size = "md",
      label,
      helperText,
      error,
      iconLeft,
      iconRight,
      clearable = false,
      onClear,
      onFocus,
      onBlur,
      value,
      containerStyle,
      inputContainerStyle,
      multiline,
      ...textInputProps
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const borderColorAnim = useSharedValue(0);

    const sStyles = sizeStyles[size];
    const hasError = !!error;
    const hasValue = !!value && value.length > 0;
    const showClear = clearable && hasValue && !iconRight;

    // Animated border style
    const animatedBorderStyle = useAnimatedStyle(() => {
      const borderColor = hasError
        ? colors.accent.error
        : borderColorAnim.value === 1
          ? colors.accent.primary
          : colors.glass.border;

      return {
        borderColor,
      };
    });

    // Handlers
    const handleFocus = (e: any) => {
      setIsFocused(true);
      borderColorAnim.value = withTiming(1, { duration: animations.timing.fast });
      Haptics.selectionAsync();
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      borderColorAnim.value = withTiming(0, { duration: animations.timing.fast });
      onBlur?.(e);
    };

    const handleClear = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onClear?.();
    };

    // Background color based on variant
    const backgroundColor =
      variant === "filled"
        ? isFocused
          ? colors.glass.backgroundActive
          : colors.glass.backgroundHover
        : colors.glass.background;

    return (
      <View style={[styles.container, containerStyle]}>
        {/* Label */}
        {label && (
          <Text
            style={[
              styles.label,
              hasError && styles.labelError,
            ]}
          >
            {label}
          </Text>
        )}

        {/* Input Container */}
        <AnimatedView
          style={[
            styles.inputContainer,
            {
              backgroundColor,
              height: multiline ? undefined : sStyles.height,
              minHeight: multiline ? sStyles.height * 2 : undefined,
              paddingHorizontal: sStyles.paddingHorizontal,
              borderWidth: variant === "standard" ? 1 : 0,
            },
            animatedBorderStyle,
            inputContainerStyle,
          ]}
        >
          {/* Left Icon */}
          {iconLeft && (
            <MaterialCommunityIcons
              name={iconLeft}
              size={sStyles.iconSize}
              color={
                hasError
                  ? colors.accent.error
                  : isFocused
                    ? colors.accent.primary
                    : colors.text.tertiary
              }
              style={styles.iconLeft}
            />
          )}

          {/* Text Input */}
          <TextInput
            ref={ref}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={colors.text.tertiary}
            selectionColor={colors.accent.primary}
            multiline={multiline}
            style={[
              styles.input,
              {
                fontSize: sStyles.fontSize,
              },
              multiline && styles.multilineInput,
            ]}
            {...textInputProps}
          />

          {/* Clear Button */}
          {showClear && (
            <Pressable onPress={handleClear} style={styles.clearButton}>
              <MaterialCommunityIcons
                name="close-circle"
                size={sStyles.iconSize}
                color={colors.text.tertiary}
              />
            </Pressable>
          )}

          {/* Right Icon */}
          {iconRight && (
            <MaterialCommunityIcons
              name={iconRight}
              size={sStyles.iconSize}
              color={
                hasError
                  ? colors.accent.error
                  : isFocused
                    ? colors.accent.primary
                    : colors.text.tertiary
              }
              style={styles.iconRight}
            />
          )}
        </AnimatedView>

        {/* Helper/Error Text */}
        {(helperText || error) && (
          <Text
            style={[
              styles.helperText,
              hasError && styles.errorText,
            ]}
          >
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

GlassInput.displayName = "GlassInput";

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  labelError: {
    color: colors.accent.error,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.md,
    borderColor: colors.glass.border,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  multilineInput: {
    textAlignVertical: "top",
    paddingTop: spacing.md,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  clearButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.accent.error,
  },
});

// =============================================================================
// SEARCH INPUT VARIANT
// =============================================================================

export interface GlassSearchInputProps extends Omit<GlassInputProps, "iconLeft" | "clearable"> {
  onSearch?: (text: string) => void;
}

export function GlassSearchInput({
  onSearch,
  onChangeText,
  ...props
}: GlassSearchInputProps) {
  const handleChangeText = (text: string) => {
    onChangeText?.(text);
    onSearch?.(text);
  };

  return (
    <GlassInput
      {...props}
      iconLeft="magnify"
      clearable
      onChangeText={handleChangeText}
      placeholder={props.placeholder || "Search..."}
      returnKeyType="search"
    />
  );
}

export default GlassInput;
