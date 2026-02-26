import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "expo-router";
import {
  GlassScreen,
  GlassCard,
  GlassButton,
  SimpleHeader,
  AnimatedSection,
  colors,
  typography,
  spacing,
  useGlassAlert,
} from "@/components/ui/glass";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export default function SupportScreen() {
  const router = useRouter();
  const { alert: showAlert } = useGlassAlert();
  const [view, setView] = useState<"form" | "list">("form");
  
  // Form State
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [isSubmitting, setIsNewSubmitting] = useState(false);

  const myTickets = useQuery(api.support.getMyTickets);
  const createTicket = useMutation(api.support.createTicket);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      showAlert("Missing Information", "Please provide both a subject and a description.");
      return;
    }

    setIsNewSubmitting(true);
    try {
      await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        priority,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert("Ticket Created", "We've received your request and will get back to you soon.", [
        { text: "View My Tickets", onPress: () => setView("list") }
      ]);
      
      setSubject("");
      setDescription("");
    } catch (e: any) {
      showAlert("Error", e.message || "Failed to create ticket");
    } finally {
      setIsNewSubmitting(false);
    }
  };

  return (
    <GlassScreen>
      <SimpleHeader 
        title="Support" 
        subtitle="How can we help you today?" 
        showBack 
        onBack={() => router.back()} 
      />

      <View style={styles.viewSwitcher}>
        <Pressable 
          style={[styles.switchBtn, view === "form" && styles.switchBtnActive]} 
          onPress={() => setView("form")}
        >
          <Text style={[styles.switchText, view === "form" && styles.switchTextActive]}>New Ticket</Text>
        </Pressable>
        <Pressable 
          style={[styles.switchBtn, view === "list" && styles.switchBtnActive]} 
          onPress={() => setView("list")}
        >
          <Text style={[styles.switchText, view === "list" && styles.switchTextActive]}>
            My Tickets {myTickets && myTickets.length > 0 && `(${myTickets.length})`}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {view === "form" ? (
            <AnimatedSection animation="fadeInUp">
              <GlassCard style={styles.formCard}>
                <Text style={styles.label}>Subject</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Summary of the issue"
                  placeholderTextColor={colors.text.tertiary}
                  value={subject}
                  onChangeText={setSubject}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Provide details about what happened..."
                  placeholderTextColor={colors.text.tertiary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={5}
                />

                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityRow}>
                  {(["low", "medium", "high"] as const).map((p) => (
                    <Pressable
                      key={p}
                      style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]}
                      onPress={() => { setPriority(p); Haptics.selectionAsync(); }}
                    >
                      <Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>
                        {p.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <GlassButton
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  style={{ marginTop: spacing.lg }}
                >
                  Submit Support Request
                </GlassButton>
              </GlassCard>
            </AnimatedSection>
          ) : (
            <AnimatedSection animation="fadeInUp">
              {myTickets === undefined ? (
                <ActivityIndicator color={colors.accent.primary} style={{ marginTop: 40 }} />
              ) : myTickets.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="ticket-outline" size={64} color={colors.text.tertiary} />
                  <Text style={styles.emptyText}>You haven't created any support tickets yet.</Text>
                  <GlassButton onPress={() => setView("form")} variant="ghost" size="sm">
                    Create New Ticket
                  </GlassButton>
                </View>
              ) : (
                myTickets.map((ticket) => (
                  <GlassCard key={ticket._id} style={styles.ticketCard}>
                    <View style={styles.ticketHeader}>
                      <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                      <View style={[styles.statusBadge, getStatusStyle(ticket.status)]}>
                        <Text style={styles.statusText}>{ticket.status.replace(/_/g, " ")}</Text>
                      </View>
                    </View>
                    <Text style={styles.ticketDate}>
                      Created: {new Date(ticket.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={styles.ticketPreview} numberOfLines={2}>
                      {ticket.description}
                    </Text>
                  </GlassCard>
                ))
              )}
            </AnimatedSection>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </GlassScreen>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case "open": return { backgroundColor: `${colors.semantic.warning}20`, borderColor: colors.semantic.warning };
    case "resolved": return { backgroundColor: `${colors.semantic.success}20`, borderColor: colors.semantic.success };
    case "closed": return { backgroundColor: `${colors.glass.border}40`, borderColor: colors.glass.border };
    default: return { backgroundColor: `${colors.accent.primary}20`, borderColor: colors.accent.primary };
  }
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  viewSwitcher: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: `${colors.glass.border}20`,
    borderRadius: 12,
    padding: 4,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  switchBtnActive: {
    backgroundColor: colors.glass.background,
  },
  switchText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  switchTextActive: {
    color: colors.accent.primary,
    fontWeight: "700",
  },
  formCard: { padding: spacing.lg },
  label: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: `${colors.glass.border}20`,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  priorityRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  priorityBtnActive: {
    borderColor: colors.accent.primary,
    backgroundColor: `${colors.accent.primary}10`,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text.tertiary,
  },
  priorityTextActive: {
    color: colors.accent.primary,
  },
  ticketCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  ticketSubject: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.text.primary,
  },
  ticketDate: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginBottom: 8,
  },
  ticketPreview: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
