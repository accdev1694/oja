/**
 * Safe Keyboard Controller - Expo Go compatible wrapper
 *
 * This module provides fallbacks for react-native-keyboard-controller
 * when running in Expo Go (where native modules aren't available).
 */

import React from "react";
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";

// Try to import the native module, fallback to null if unavailable
let NativeKeyboardProvider: React.ComponentType<{ children: React.ReactNode }> | null = null;
let NativeKeyboardAwareScrollView: React.ComponentType<any> | null = null;

try {
  // Dynamic require to catch linking errors
  const keyboardController = require("react-native-keyboard-controller");
  NativeKeyboardProvider = keyboardController.KeyboardProvider;
  NativeKeyboardAwareScrollView = keyboardController.KeyboardAwareScrollView;
} catch {
  // Native module not available (e.g., Expo Go)
  console.log("[Keyboard] react-native-keyboard-controller not available, using fallbacks");
}

/**
 * Safe KeyboardProvider - wraps children with KeyboardProvider when available,
 * otherwise just renders children directly.
 */
export function SafeKeyboardProvider({ children }: { children: React.ReactNode }) {
  if (NativeKeyboardProvider) {
    return <NativeKeyboardProvider>{children}</NativeKeyboardProvider>;
  }
  // Fallback: just render children
  return <>{children}</>;
}

/**
 * Safe KeyboardAwareScrollView - uses native implementation when available,
 * falls back to KeyboardAvoidingView + ScrollView on Expo Go.
 */
export interface SafeKeyboardAwareScrollViewProps extends ScrollViewProps {
  /** Extra space above keyboard (native only) */
  extraKeyboardSpace?: number;
  /** Bottom offset (used in fallback) */
  bottomOffset?: number;
  /** Disable scroll on keyboard hide (native only) */
  disableScrollOnKeyboardHide?: boolean;
}

export function SafeKeyboardAwareScrollView({
  children,
  style,
  contentContainerStyle,
  bottomOffset = 20,
  extraKeyboardSpace,
  disableScrollOnKeyboardHide,
  ...rest
}: SafeKeyboardAwareScrollViewProps) {
  if (NativeKeyboardAwareScrollView) {
    return (
      <NativeKeyboardAwareScrollView
        style={style}
        contentContainerStyle={contentContainerStyle}
        bottomOffset={bottomOffset}
        extraKeyboardSpace={extraKeyboardSpace}
        disableScrollOnKeyboardHide={disableScrollOnKeyboardHide}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...rest}
      >
        {children}
      </NativeKeyboardAwareScrollView>
    );
  }

  // Fallback for Expo Go: KeyboardAvoidingView + ScrollView
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={bottomOffset}
    >
      <ScrollView
        style={style}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Check if native keyboard controller is available
 */
export const isKeyboardControllerAvailable = NativeKeyboardProvider !== null;
