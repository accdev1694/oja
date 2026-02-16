import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import * as Haptics from "expo-haptics";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, typography } from "@/lib/design/glassTokens";
import { GlassModal } from "@/components/ui/glass";

interface ListChatThreadProps {
  visible: boolean;
  listId: Id<"shoppingLists"> | null;
  listName: string;
  onClose: () => void;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ListChatThread({
  visible,
  listId,
  listName,
  onClose,
}: ListChatThreadProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const messages = useQuery(
    api.partners.getListMessages,
    listId ? { listId } : "skip"
  );

  const addMessage = useMutation(api.partners.addListMessage);
  const markListRead = useMutation(api.notifications.markListNotificationsRead);

  // Mark list notifications as read when chat opens
  useEffect(() => {
    if (visible && listId) {
      markListRead({ listId });
    }
  }, [visible, listId]);

  // Auto-scroll on new messages
  const prevCount = useRef(0);
  useEffect(() => {
    if (messages && messages.length > prevCount.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevCount.current = messages?.length ?? 0;
  }, [messages?.length]);

  const handleSend = async () => {
    if (!text.trim() || !listId) return;
    setSending(true);
    try {
      await addMessage({ listId, text: text.trim() });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setText("");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSending(false);
    }
  };

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      animationType="slide"
      position="bottom"
      avoidKeyboard
      maxWidth="full"
      contentStyle={styles.modal}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="chat-outline"
            size={20}
            color={colors.accent.primary}
          />
          <Text style={styles.title} numberOfLines={1}>
            {listName}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
          <MaterialCommunityIcons
            name="close"
            size={22}
            color={colors.text.primary}
          />
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages ?? []}
        keyExtractor={(item) => item._id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="chat-outline"
              size={32}
              color={colors.text.tertiary}
            />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptyHint}>
              Chat with your shopping partners here
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.isSystem) {
            return (
              <View style={styles.systemMessage}>
                <Text style={styles.systemText}>{item.text}</Text>
                <Text style={styles.systemTime}>{timeAgo(item.createdAt)}</Text>
              </View>
            );
          }

          return (
            <View style={styles.message}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.userName || "?")[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.messageBody}>
                <View style={styles.messageHeader}>
                  <Text style={styles.userName}>{item.userName}</Text>
                  <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Send a message..."
          placeholderTextColor={colors.text.tertiary}
          value={text}
          onChangeText={setText}
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[
            styles.sendButton,
            (!text.trim() || sending) && styles.sendDisabled,
          ]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <MaterialCommunityIcons
            name="send"
            size={20}
            color={
              text.trim() ? colors.accent.primary : colors.text.disabled
            }
          />
        </Pressable>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: colors.background.secondary,
    height: Math.round(Dimensions.get("window").height * 0.7),
    borderBottomWidth: 0,
    padding: 0,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.background,
  },
  title: {
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: colors.text.primary,
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.text.tertiary,
    fontSize: typography.bodyMedium.fontSize,
  },
  emptyHint: {
    color: colors.text.tertiary,
    fontSize: typography.bodySmall.fontSize,
  },
  // System messages (approval events)
  systemMessage: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  systemText: {
    color: colors.text.tertiary,
    fontSize: typography.bodySmall.fontSize,
    fontStyle: "italic",
    textAlign: "center",
  },
  systemTime: {
    color: colors.text.disabled,
    fontSize: 10,
    marginTop: 2,
  },
  // User messages
  message: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.text.primary,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: "700",
  },
  messageBody: {
    flex: 1,
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    padding: spacing.sm,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  userName: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: "700",
    color: colors.text.secondary,
  },
  time: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.text.tertiary,
  },
  messageText: {
    fontSize: typography.bodyMedium.fontSize,
    color: colors.text.primary,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.glass.background,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    fontSize: typography.bodyMedium.fontSize,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
