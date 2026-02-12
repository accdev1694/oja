/**
 * KeyboardAwareGlassScreen - Keyboard-aware screen wrapper
 *
 * Use this for screens with form inputs. The content will automatically
 * scroll to keep the focused input visible when the keyboard appears.
 *
 * NOTE: This file is intentionally NOT exported from the barrel file (index.ts)
 * to prevent cascade failures if the native module isn't linked.
 * Import directly: import { KeyboardAwareGlassScreen } from "@/components/ui/glass/KeyboardAwareGlassScreen"
 */

import React from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { GradientBackground } from "./GradientBackground";

export interface KeyboardAwareGlassScreenProps {
  children: React.ReactNode;
  /** Additional styles for the scroll view container */
  style?: StyleProp<ViewStyle>;
  /** Additional styles for the scroll view content */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Safe area edges to respect (default: ["top"]) */
  edges?: ("top" | "bottom" | "left" | "right")[];
  /** Extra space above keyboard (default: 20) */
  extraKeyboardSpace?: number;
  /** Offset from bottom of screen (default: 0) */
  bottomOffset?: number;
  /** Whether to disable scroll when keyboard hides (default: false) */
  disableScrollOnKeyboardHide?: boolean;
}

/**
 * Keyboard-aware screen wrapper with gradient background
 *
 * @example
 * import { KeyboardAwareGlassScreen } from "@/components/ui/glass/KeyboardAwareGlassScreen";
 *
 * <KeyboardAwareGlassScreen>
 *   <GlassInput placeholder="Email" />
 *   <GlassInput placeholder="Password" />
 *   <GlassButton title="Submit" />
 * </KeyboardAwareGlassScreen>
 */
export function KeyboardAwareGlassScreen({
  children,
  style,
  contentContainerStyle,
  edges = ["top"],
  extraKeyboardSpace = 20,
  bottomOffset = 0,
  disableScrollOnKeyboardHide = false,
}: KeyboardAwareGlassScreenProps) {
  return (
    <GradientBackground safeArea edges={edges}>
      <KeyboardAwareScrollView
        style={[{ flex: 1 }, style]}
        contentContainerStyle={contentContainerStyle}
        extraKeyboardSpace={extraKeyboardSpace}
        bottomOffset={bottomOffset}
        disableScrollOnKeyboardHide={disableScrollOnKeyboardHide}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </KeyboardAwareScrollView>
    </GradientBackground>
  );
}

// Also re-export KeyboardAwareScrollView for custom layouts
export { KeyboardAwareScrollView } from "react-native-keyboard-controller";
