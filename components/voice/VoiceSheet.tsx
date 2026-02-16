/**
 * VoiceSheet — Bottom sheet modal for the voice assistant conversation.
 *
 * Shows conversation bubbles, status indicators, action confirmation bar,
 * and a mic control at the bottom.
 */

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassModal } from "@/components/ui/glass/GlassModal";
import { TAB_BAR_HEIGHT } from "@/components/ui/glass/GlassTabBar";
import { MessageBubble } from "./MessageBubble";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "@/lib/design/glassTokens";
import type {
  ConversationMessage,
  PendingAction,
} from "@/lib/voice/voiceTypes";

interface Props {
  visible: boolean;
  onClose: () => void;
  // State
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  partialTranscript: string;
  response: string;
  pendingAction: PendingAction | null;
  error: string | null;
  conversationHistory: ConversationMessage[];
  // Actions
  onStartListening: () => void;
  onStopListening: () => void;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  onResetConversation: () => void;
}

export function VoiceSheet({
  visible,
  onClose,
  isListening,
  isProcessing,
  partialTranscript,
  pendingAction,
  error,
  conversationHistory,
  onStartListening,
  onStopListening,
  onConfirmAction,
  onCancelAction,
  onResetConversation,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (conversationHistory.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [conversationHistory.length]);

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      animationType="slide"
      position="bottom"
      maxWidth="full"
      overlayOpacity={0.5}
      statusBarTranslucent
      bottomOffset={TAB_BAR_HEIGHT}
      contentStyle={styles.sheet}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="microphone"
            size={20}
            color={colors.accent.primary}
          />
          <Text style={styles.headerTitle}>Ask Tobi</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
          <MaterialCommunityIcons
            name="close"
            size={22}
            color={colors.text.primary}
          />
        </Pressable>
      </View>

      {/* Conversation */}
      <ScrollView
        ref={scrollRef}
        style={styles.conversation}
        contentContainerStyle={styles.conversationContent}
        showsVerticalScrollIndicator={false}
      >
        {conversationHistory.length === 0 && !isListening && !isProcessing && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="microphone-outline"
              size={40}
              color={colors.text.disabled}
            />
            <Text style={styles.emptyText}>
              Tap the mic and ask Tobi anything about your pantry, lists, prices,
              or spending.
            </Text>
          </View>
        )}

        {conversationHistory.map((msg, i) => (
          <MessageBubble key={i} role={msg.role} text={msg.text} />
        ))}

        {/* Partial transcript while listening */}
        {isListening && partialTranscript ? (
          <MessageBubble role="user" text={`${partialTranscript}...`} />
        ) : null}
      </ScrollView>

      {/* Status indicator */}
      {(isListening || isProcessing) && (
        <View style={styles.statusBar}>
          {isListening ? (
            <>
              <View style={styles.listeningDot} />
              <Text style={styles.statusText}>Listening...</Text>
            </>
          ) : (
            <>
              <ActivityIndicator size="small" color={colors.accent.primary} />
              <Text style={styles.statusText}>Thinking...</Text>
            </>
          )}
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Action Confirmation */}
      {pendingAction && (
        <View style={styles.confirmBar}>
          <Text style={styles.confirmLabel}>{pendingAction.confirmLabel}</Text>
          <View style={styles.confirmButtons}>
            <Pressable
              style={styles.confirmButton}
              onPress={onConfirmAction}
            >
              <Text style={styles.confirmButtonText}>Yes, do it</Text>
            </Pressable>
            <Pressable
              style={styles.cancelButton}
              onPress={onCancelAction}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {conversationHistory.length > 0 && (
          <Pressable style={styles.newChatButton} onPress={onResetConversation}>
            <MaterialCommunityIcons
              name="refresh"
              size={18}
              color={colors.text.secondary}
            />
            <Text style={styles.newChatText}>New chat</Text>
          </Pressable>
        )}

        <Pressable
          style={[
            styles.micButton,
            isListening && styles.micButtonActive,
          ]}
          onPress={isListening ? onStopListening : onStartListening}
          disabled={isProcessing}
        >
          <MaterialCommunityIcons
            name={isListening ? "stop" : "microphone"}
            size={28}
            color={
              isListening
                ? colors.text.primary
                : isProcessing
                  ? colors.text.disabled
                  : colors.text.primary
            }
          />
        </Pressable>

        {/* Spacer for symmetry when new chat button is visible */}
        {conversationHistory.length > 0 && <View style={{ width: 80 }} />}
      </View>
    </GlassModal>
  );
}

const SHEET_HEIGHT = Math.round(Dimensions.get("window").height * 0.55);

const styles = StyleSheet.create({
  sheet: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 0,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: typography.headlineSmall.fontSize,
    fontWeight: "600",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.background,
  },
  conversation: {
    flex: 1,
    minHeight: 120,
  },
  conversationContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.text.tertiary,
    fontSize: typography.bodySmall.fontSize,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: typography.bodySmall.lineHeight,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.error,
  },
  statusText: {
    color: colors.text.secondary,
    fontSize: typography.bodySmall.fontSize,
  },
  errorBar: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    marginHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  errorText: {
    color: colors.accent.errorLight,
    fontSize: typography.bodySmall.fontSize,
    textAlign: "center",
  },
  confirmBar: {
    backgroundColor: "rgba(0, 212, 170, 0.08)",
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 170, 0.2)",
    gap: spacing.sm,
  },
  confirmLabel: {
    color: colors.text.primary,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: "500",
  },
  confirmButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  confirmButtonText: {
    color: colors.text.inverse,
    fontWeight: "600",
    fontSize: typography.bodySmall.fontSize,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: typography.bodySmall.fontSize,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  newChatText: {
    color: colors.text.secondary,
    fontSize: 10,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  micButtonActive: {
    backgroundColor: colors.accent.error,
    shadowColor: colors.accent.error,
  },
});
