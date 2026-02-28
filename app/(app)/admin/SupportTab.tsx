import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import {
  GlassCard,
  AnimatedSection,
  colors,
  spacing,
} from "@/components/ui/glass";
import { adminStyles as styles } from "./styles";
import { 
  SupportSummary, 
  SupportTicket, 
  SupportTicketDetail 
} from "./types";
import type { Id } from "@/convex/_generated/dataModel";
import { SupportTicketView } from "./components/SupportTicketView";
import { useAdminToast } from "./hooks";

interface SupportTabProps {
  /** Permission check function */
  hasPermission: (p: string) => boolean;
}

/**
 * SupportTab Component
 * Helpdesk management for user support tickets.
 */
export function SupportTab({ hasPermission }: SupportTabProps) {
  const [statusFilter, setStatusFilter] = useState<string | null>("open");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { showToast } = useAdminToast();

  const summary = useQuery(api.admin.getAdminSupportSummary) as SupportSummary | undefined;
  const tickets = useQuery(api.admin.getAdminTickets, { status: statusFilter || undefined }) as SupportTicket[] | undefined;
  const ticketDetail = useQuery(api.support.getTicketDetail, selectedTicketId ? { ticketId: selectedTicketId as Id<"supportTickets"> } : "skip") as SupportTicketDetail | undefined | null;
  
  const assignTicket = useMutation(api.support.assignTicket);
  const addMessage = useMutation(api.support.addTicketMessage);
  const updateStatus = useMutation(api.support.updateTicketStatus);

  const handleAssign = useCallback(async (ticketId: string) => {
    try {
      await assignTicket({ ticketId: ticketId as Id<"supportTickets"> });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Ticket assigned to you", "success");
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  }, [assignTicket, showToast]);

  const handleSendReply = useCallback(async (message: string) => {
    if (!selectedTicketId) return;
    try {
      await addMessage({ ticketId: selectedTicketId as Id<"supportTickets">, message });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Reply sent", "success");
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  }, [selectedTicketId, addMessage, showToast]);

  const handleUpdateStatus = useCallback(async (status: any) => {
    if (!selectedTicketId) return;
    try {
      await updateStatus({ ticketId: selectedTicketId as Id<"supportTickets">, status });
      if (status === "closed" || status === "resolved") {
        setSelectedTicketId(null);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Ticket ${status}`, "success");
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  }, [selectedTicketId, updateStatus, showToast]);

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
          {ticketDetail && (
            <SupportTicketView 
              ticket={ticketDetail}
              onSendReply={handleSendReply}
              onUpdateStatus={handleUpdateStatus}
              onClose={() => setSelectedTicketId(null)}
            />
          )}
        </View>
      </Modal>

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}
