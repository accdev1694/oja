import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  GlassButton,
  AnimatedSection,
  colors,
  spacing,
  useGlassAlert,
} from "@/components/ui/glass";
import { adminStyles as styles } from "./styles";
import { 
  SupportSummary, 
  SupportTicket, 
  SupportTicketDetail 
} from "./types";
import type { Id } from "@/convex/_generated/dataModel";

interface SupportTabProps {
  hasPermission: (p: string) => boolean;
}

export function SupportTab({ hasPermission }: SupportTabProps) {
  const [statusFilter, setStatusFilter] = useState<string | null>("open");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const summary = useQuery(api.admin.getAdminSupportSummary) as SupportSummary | undefined;
  const tickets = useQuery(api.admin.getAdminTickets, { status: statusFilter || undefined }) as SupportTicket[] | undefined;
  const ticketDetail = useQuery(api.support.getTicketDetail, selectedTicketId ? { ticketId: selectedTicketId as Id<"supportTickets"> } : "skip") as SupportTicketDetail | undefined | null;
  
  const assignTicket = useMutation(api.support.assignTicket);
  const addMessage = useMutation(api.support.addTicketMessage);
  const updateStatus = useMutation(api.support.updateTicketStatus);

  const { alert: showAlert } = useGlassAlert();

  const handleAssign = async (ticketId: string) => {
    try {
      await assignTicket({ ticketId: ticketId as Id<"supportTickets"> });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      showAlert("Error", (e as Error).message);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicketId || !replyText.trim()) return;
    try {
      await addMessage({ ticketId: selectedTicketId as Id<"supportTickets">, message: replyText.trim() });
      setReplyText("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      showAlert("Error", (e as Error).message);
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      await updateStatus({ ticketId: ticketId as Id<"supportTickets">, status: "closed" });
      setSelectedTicketId(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      showAlert("Error", (e as Error).message);
    }
  };

  const statusOptions = [
    { label: "All", value: null },
    { label: "Open", value: "open" },
    { label: "In Progress", value: "in_progress" },
    { label: "Resolved", value: "resolved" },
    { label: "Closed", value: "closed" },
  ];

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Support Summary */}
      {summary && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { width: "23%" }]}>
              <Text style={styles.metricValue}>{summary.open}</Text>
              <Text style={styles.metricLabel}>Open</Text>
            </View>
            <View style={[styles.metricCard, { width: "23%" }]}>
              <Text style={styles.metricValue}>{summary.unassigned}</Text>
              <Text style={styles.metricLabel}>Unassigned</Text>
            </View>
            <View style={[styles.metricCard, { width: "23%" }]}>
              <Text style={styles.metricValue}>{summary.inProgress}</Text>
              <Text style={styles.metricLabel}>Active</Text>
            </View>
            <View style={[styles.metricCard, { width: "23%" }]}>
              <Text style={styles.metricValue}>{summary.resolved}</Text>
              <Text style={styles.metricLabel}>Resolved</Text>
            </View>
          </View>
        </AnimatedSection>
      )}

      {/* Ticket List */}
      <GlassCard style={styles.section}>
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {statusOptions.map((opt) => (
              <Pressable
                key={opt.value || "all"}
                style={[styles.filterChip, statusFilter === opt.value && styles.filterChipActive]}
                onPress={() => { setStatusFilter(opt.value); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.filterChipText, statusFilter === opt.value && styles.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {tickets?.map((t) => (
          <Pressable 
            key={t._id} 
            style={styles.ticketRow}
            onPress={() => { setSelectedTicketId(t._id); Haptics.selectionAsync(); }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[styles.priorityDot, { backgroundColor: t.priority === "urgent" ? colors.semantic.danger : t.priority === "high" ? colors.semantic.warning : colors.accent.primary }]} />
                <Text style={styles.userName}>{t.subject}</Text>
              </View>
              <Text style={styles.userEmail}>{t.userName} • {new Date(t.createdAt).toLocaleDateString()}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <View style={[styles.statusBadge, t.status === "open" ? styles.warningBadge : t.status === "resolved" ? styles.successBadge : styles.infoBadge]}>
                <Text style={styles.statusBadgeText}>{t.status}</Text>
              </View>
              {!t.assignedTo && (
                <Pressable onPress={() => handleAssign(t._id)} style={styles.assignBadge}>
                  <Text style={styles.assignBadgeText}>Claim</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        ))}
        {(!tickets || tickets.length === 0) && (
          <Text style={styles.emptyText}>No tickets found for this filter.</Text>
        )}
      </GlassCard>

      {/* Ticket Detail Modal */}
      <Modal
        visible={!!selectedTicketId && !!ticketDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTicketId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.imageModalContent, { height: "85%" }]}>
            <View style={styles.imageModalHeader}>
              <View>
                <Text style={styles.imageModalTitle}>{ticketDetail?.subject}</Text>
                <Text style={styles.userEmail}>Status: {ticketDetail?.status} • Priority: {ticketDetail?.priority}</Text>
              </View>
              <Pressable onPress={() => setSelectedTicketId(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>
            
            <ScrollView style={{ flex: 1, padding: spacing.md }}>
              <Text style={[styles.userName, { marginBottom: spacing.md }]}>{ticketDetail?.description}</Text>
              
              <View style={styles.chatContainer}>
                {ticketDetail?.messages.map((m) => (
                  <View key={m._id} style={[styles.chatBubble, m.isFromAdmin ? styles.adminBubble : styles.userBubble]}>
                    <Text style={[styles.chatName, m.isFromAdmin && { color: colors.accent.primary }]}>
                      {m.isFromAdmin ? "Support" : m.senderName}
                    </Text>
                    <Text style={styles.chatMessage}>{m.message}</Text>
                    <Text style={styles.chatTime}>{new Date(m.createdAt).toLocaleTimeString()}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a reply..."
                placeholderTextColor={colors.text.tertiary}
                value={replyText}
                onChangeText={setReplyText}
                multiline
              />
              <TouchableOpacity onPress={handleSendReply} style={styles.sendBtn}>
                <MaterialCommunityIcons name="send" size={20} color={colors.accent.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.actionRow, { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.glass.border }]}>
              <GlassButton onPress={() => ticketDetail && handleCloseTicket(ticketDetail._id)} variant="secondary" size="sm" style={{ flex: 1 }}>
                Resolve & Close
              </GlassButton>
              {ticketDetail?.status !== "resolved" && (
                <GlassButton onPress={() => ticketDetail && updateStatus({ ticketId: ticketDetail._id as Id<"supportTickets">, status: "resolved" })} size="sm" style={{ flex: 1 }}>
                  Mark Resolved
                </GlassButton>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}
