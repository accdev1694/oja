import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, typography, GlassButton } from "@/components/ui/glass";
import { SupportTicketDetail } from "../types";
import { adminStyles as styles } from "../styles";

interface SupportTicketViewProps {
  ticket: SupportTicketDetail;
  onSendReply: (message: string) => Promise<void>;
  onUpdateStatus: (status: "open" | "in_progress" | "resolved" | "closed") => Promise<void>;
  onClose: () => void;
}

/**
 * SupportTicketView Component
 * Dedicated detail view for managing a single support ticket.
 */
export function SupportTicketView({ 
  ticket, 
  onSendReply, 
  onUpdateStatus, 
  onClose 
}: SupportTicketViewProps) {
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!replyText.trim() || isSending) return;
    setIsSending(true);
    try {
      await onSendReply(replyText.trim());
      setReplyText("");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={localStyles.container}>
      <View style={styles.imageModalHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.imageModalTitle}>{ticket.subject}</Text>
          <Text style={styles.userEmail}>
            User: {ticket.userName} • Priority: {ticket.priority.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={localStyles.scroll} 
        contentContainerStyle={{ padding: spacing.md }}
      >
        <View style={localStyles.descriptionBox}>
          <Text style={localStyles.descriptionLabel}>Original Request:</Text>
          <Text style={styles.userName}>{ticket.description}</Text>
          <Text style={styles.logTime}>Opened: {new Date(ticket.createdAt).toLocaleString()}</Text>
        </View>

        <View style={styles.chatContainer}>
          {ticket.messages.map((m) => (
            <View 
              key={m._id} 
              style={[
                styles.chatBubble, 
                m.isFromAdmin ? styles.adminBubble : styles.userBubble
              ]}
            >
              <Text style={[styles.chatName, m.isFromAdmin && { color: colors.accent.primary }]}>
                {m.isFromAdmin ? "Support Team" : ticket.userName}
              </Text>
              <Text style={styles.chatMessage}>{m.message}</Text>
              <Text style={styles.chatTime}>{new Date(m.createdAt).toLocaleTimeString()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={localStyles.footer}>
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type your response..."
            placeholderTextColor={colors.text.tertiary}
            value={replyText}
            onChangeText={setReplyText}
            multiline
          />
          <TouchableOpacity 
            onPress={handleSend} 
            style={[styles.sendBtn, !replyText.trim() && { opacity: 0.5 }]}
            disabled={!replyText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.accent.primary} />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color={colors.accent.primary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          {ticket.status !== "resolved" && (
            <GlassButton 
              onPress={() => onUpdateStatus("resolved")} 
              variant="secondary" 
              size="sm" 
              style={{ flex: 1 }}
            >Mark Resolved</GlassButton>
          )}
          <GlassButton 
            onPress={() => onUpdateStatus("closed")} 
            variant="ghost" 
            size="sm" 
            style={{ flex: 1 }}
          >Close Ticket</GlassButton>
        </View>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.glass.background,
    borderRadius: 20,
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
  },
  descriptionBox: {
    backgroundColor: `${colors.glass.border}20`,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.primary,
  },
  descriptionLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
});
