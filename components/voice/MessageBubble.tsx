/**
 * MessageBubble — Glass-styled chat bubble for voice assistant.
 *
 * User messages: right-aligned, glass background.
 * Assistant messages: left-aligned, warm accent left border.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "@/lib/design/glassTokens";

interface Props {
  role: "user" | "model";
  text: string;
}

export function MessageBubble({ role, text }: Props) {
  const isUser = role === "user";

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.modelContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.modelBubble,
        ]}
      >
        <Text style={[styles.text, isUser ? styles.userText : styles.modelText]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  userContainer: {
    alignItems: "flex-end",
  },
  modelContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "85%",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  userBubble: {
    backgroundColor: colors.glass.backgroundActive,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderTopRightRadius: 4,
  },
  modelBubble: {
    backgroundColor: "rgba(255, 176, 136, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.warm,
    borderTopLeftRadius: 4,
  },
  text: {
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
  },
  userText: {
    color: colors.text.primary,
  },
  modelText: {
    color: colors.text.primary,
  },
});
