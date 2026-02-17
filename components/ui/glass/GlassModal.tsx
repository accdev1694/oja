/**
 * GlassModal - Centralised modal wrapper for the Glass UI design system.
 *
 * Every modal in the app should use this component so that overlay styling,
 * backdrop dismiss behaviour, and content card appearance are maintained in
 * a single place.
 */

import React from "react";
import {
  Modal,
  Pressable,
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  colors,
  spacing,
  borderRadius as radii,
} from "@/lib/design/glassTokens";

// ── Types ────────────────────────────────────────────────────────────

export interface GlassModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Called when the user requests close (backdrop tap or Android back) */
  onClose: () => void;
  /** Animation type (default: "fade") */
  animationType?: "fade" | "slide" | "none";
  /**
   * Content position within the overlay (default: "center")
   * - "center": Centered card with padding
   * - "bottom": Bottom sheet with top-only border-radius
   * - "custom": Caller controls positioning via overlayStyle / contentStyle
   */
  position?: "center" | "bottom" | "custom";
  /** Wrap content in KeyboardAvoidingView for screens with text inputs (default: false) */
  avoidKeyboard?: boolean;
  /** Make the status bar translucent on Android (default: false) */
  statusBarTranslucent?: boolean;
  /** Overlay background opacity 0-1 (default: 0.6) */
  overlayOpacity?: number;
  /** Max width of the content card. Pass "full" for full-width bottom sheets. (default: 340) */
  maxWidth?: number | "full";
  /** Additional styles applied to the overlay (useful with position="custom") */
  overlayStyle?: StyleProp<ViewStyle>;
  /** Additional styles applied to the content card View */
  contentStyle?: StyleProp<ViewStyle>;
  /** Bottom offset in px — lifts the sheet above tab bars or nav bars */
  bottomOffset?: number;
  /**
   * When true, the glass card (background, border, padding, border-radius)
   * is NOT rendered — children are placed directly in the overlay.
   * Useful for dropdowns that manage their own card styling.
   */
  bare?: boolean;
  /** Modal content */
  children: React.ReactNode;
}

// ── Component ────────────────────────────────────────────────────────

export function GlassModal({
  visible,
  onClose,
  animationType = "fade",
  position = "center",
  avoidKeyboard = false,
  statusBarTranslucent = false,
  overlayOpacity = 0.6,
  maxWidth = 340,
  overlayStyle: overlayStyleProp,
  contentStyle,
  bottomOffset = 0,
  bare = false,
  children,
}: GlassModalProps) {
  const isBottom = position === "bottom";
  const isCustom = position === "custom";
  const isFull = maxWidth === "full";

  // ── Overlay style ──────────────────────────────────────────────────

  const baseOverlayStyle: ViewStyle = {
    flex: 1,
    backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
    ...(isCustom
      ? {}
      : {
          justifyContent: isBottom ? "flex-end" : "center",
          alignItems: "center",
          padding: isBottom ? 0 : spacing.xl,
        }),
  };

  // ── Wrapper style (sizing lives here so % resolves against overlay) ─

  const wrapperStyle: ViewStyle = isCustom
    ? {}
    : {
        width: isFull || isBottom ? "100%" : "85%",
        ...(isFull || isBottom ? {} : { maxWidth: maxWidth as number }),
      };

  // ── Content card style ─────────────────────────────────────────────

  const cardStyle: ViewStyle = {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.glass.borderFocus,
    padding: spacing.xl,
    width: "100%",
    ...(isBottom
      ? {
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }
      : {
          borderRadius: 20,
        }),
  };

  // ── Inner content (card + stop-propagation wrapper) ────────────────

  const contentNode = bare ? (
    <Pressable onPress={(e) => e.stopPropagation()} style={[wrapperStyle, contentStyle]}>
      {children}
    </Pressable>
  ) : (
    <Pressable onPress={(e) => e.stopPropagation()} style={wrapperStyle}>
      <View style={[cardStyle, contentStyle]}>{children}</View>
    </Pressable>
  );

  const bottomSpacer =
    isBottom && bottomOffset > 0 ? (
      <View style={{ height: bottomOffset }} />
    ) : null;

  // ── Rendered tree ──────────────────────────────────────────────────

  const composedOverlay = [baseOverlayStyle, overlayStyleProp];

  const inner = avoidKeyboard ? (
    <KeyboardAvoidingView
      style={composedOverlay}
      behavior="padding"
    >
      {/* Backdrop behind KAV content */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      {contentNode}
      {bottomSpacer}
    </KeyboardAvoidingView>
  ) : (
    <Pressable style={composedOverlay} onPress={onClose}>
      {contentNode}
      {bottomSpacer}
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent={statusBarTranslucent}
    >
      {inner}
    </Modal>
  );
}
