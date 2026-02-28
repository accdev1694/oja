import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  GlassButton,
  GlassInput,
  AnimatedSection,
  colors,
  spacing,
  useGlassAlert,
  SkeletonCard,
} from "@/components/ui/glass";
import { adminStyles as styles } from "./styles";
import { 
  MonitoringSummary, 
  Experiment, 
  Workflow 
} from "./types";
import type { Id } from "@/convex/_generated/dataModel";
import { useAdminToast } from "./hooks";

interface MonitoringTabProps {
  /** Permission check function */
  hasPermission: (p: string) => boolean;
}

/**
 * MonitoringTab Component
 * Monitors system health, alerts, A/B experiments, and automated workflows.
 */
export function MonitoringTab({ hasPermission }: MonitoringTabProps) {
  const { showToast } = useAdminToast();
  const { alert: showAlert } = useGlassAlert();
  
  const summary = useQuery(api.admin.getMonitoringSummary) as MonitoringSummary | undefined;
  const experiments = useQuery(api.admin.getExperiments) as Experiment[] | undefined;
  const workflows = useQuery(api.admin.getWorkflows) as Workflow[] | undefined;

  const resolveAlert = useMutation(api.admin.resolveAlert);
  const toggleWorkflow = useMutation(api.admin.toggleWorkflow);
  const createExperiment = useMutation(api.admin.createExperiment);

  const [experimentModalVisible, setExperimentModalVisible] = useState(false);
  const [experimentForm, setExperimentForm] = useState({
    name: "",
    description: "",
    goalEvent: "",
    variants: [
      { name: "Control", allocationPercent: 50 },
      { name: "Variant A", allocationPercent: 50 }
    ]
  });

  const handleResolveAlert = useCallback(async (id: string) => {
    try {
      await resolveAlert({ alertId: id as Id<"adminAlerts"> });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Alert resolved", "success");
    } catch (e) { showToast((e as Error).message, "error"); }
  }, [resolveAlert, showToast]);

  const handleToggleWorkflow = useCallback(async (workflowId: string) => {
    try {
      await toggleWorkflow({ workflowId: workflowId as Id<"automationWorkflows"> });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Workflow status updated", "success");
    } catch (e) { showToast((e as Error).message, "error"); }
  }, [toggleWorkflow, showToast]);

  const handleCreateExperiment = useCallback(async () => {
    try {
      if (!experimentForm.name || !experimentForm.goalEvent) {
        showToast("Name and goal event are required", "error");
        return;
      }
      await createExperiment(experimentForm);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Experiment created", "success");
      setExperimentModalVisible(false);
      setExperimentForm({
        name: "",
        description: "",
        goalEvent: "",
        variants: [
          { name: "Control", allocationPercent: 50 },
          { name: "Variant A", allocationPercent: 50 }
        ]
      });
    } catch (e) { showToast((e as Error).message, "error"); }
  }, [experimentForm, createExperiment, showToast]);

  if (!summary) return <View style={styles.loading}><SkeletonCard /></View>;

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Active Alerts */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="bell-ring" size={24} color={colors.semantic.danger} />
            <Text style={styles.sectionTitle}>Active Alerts ({summary.alertCount})</Text>
          </View>
          {summary.alerts.map((a) => (
            <View key={a._id} style={styles.alertRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: a.severity === "critical" ? colors.semantic.danger : a.severity === "high" ? colors.semantic.warning : colors.text.primary }]}>
                  {a.alertType.toUpperCase().replace(/_/g, " ")}
                </Text>
                <Text style={styles.userEmail}>{a.message}</Text>
                <Text style={styles.logTime}>{new Date(a.createdAt).toLocaleString()}</Text>
              </View>
              <GlassButton onPress={() => handleResolveAlert(a._id)} variant="ghost" size="sm">Resolve</GlassButton>
            </View>
          ))}
          {summary.alerts.length === 0 && (
            <Text style={styles.emptyText}>All systems nominal. No active alerts.</Text>
          )}
        </GlassCard>
      </AnimatedSection>

      {/* SLA Health */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color={colors.semantic.success} />
            <Text style={styles.sectionTitle}>SLA Performance: {summary.slaStatus.toUpperCase()}</Text>
          </View>
          {summary.recentSLA.map((s) => (
            <View key={s._id} style={styles.slaRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{s.metric.replace(/_/g, " ").toUpperCase()}</Text>
                <Text style={styles.userEmail}>Target: {s.target}ms | Actual: {s.actual}ms</Text>
              </View>
              <View style={[styles.statusBadge, s.status === "pass" ? styles.successBadge : s.status === "warn" ? styles.warningBadge : styles.errorBadge]}>
                <Text style={styles.statusBadgeText}>{s.status}</Text>
              </View>
            </View>
          ))}
        </GlassCard>
      </AnimatedSection>

      {/* A/B Experiments */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={200}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="beaker-outline" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Experiments</Text>
          </View>
          {experiments?.map((e) => (
            <View key={e._id} style={styles.experimentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{e.name}</Text>
                <Text style={styles.userEmail}>{e.status} • Goal: {e.goalEvent}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.tertiary} />
            </View>
          ))}
          <GlassButton onPress={() => setExperimentModalVisible(true)} variant="secondary" size="sm" style={{ marginTop: spacing.md }}>
            New Experiment
          </GlassButton>
        </GlassCard>
      </AnimatedSection>

      {/* Automated Workflows */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={300}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="robot-outline" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Workflows</Text>
          </View>
          {workflows?.map((w) => (
            <View key={w._id} style={styles.workflowRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{w.name}</Text>
                <Text style={styles.userEmail}>Trigger: {w.trigger} • {w.actions.length} actions</Text>
              </View>
              <Switch value={w.isEnabled} onValueChange={() => handleToggleWorkflow(w._id)} />
            </View>
          ))}
        </GlassCard>
      </AnimatedSection>

      {/* Experiment Creation Modal */}
      <Modal
        visible={experimentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExperimentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Experiment</Text>
              <TouchableOpacity onPress={() => setExperimentModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <View style={{ gap: spacing.md }}>
                <View>
                  <Text style={styles.fieldLabel}>Experiment Name *</Text>
                  <GlassInput
                    value={experimentForm.name}
                    onChangeText={(name) => setExperimentForm({ ...experimentForm, name })}
                    placeholder="e.g., New Checkout Flow"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Description</Text>
                  <GlassInput
                    value={experimentForm.description}
                    onChangeText={(description) => setExperimentForm({ ...experimentForm, description })}
                    placeholder="Brief description of what you're testing"
                    multiline
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Goal Event *</Text>
                  <GlassInput
                    value={experimentForm.goalEvent}
                    onChangeText={(goalEvent) => setExperimentForm({ ...experimentForm, goalEvent })}
                    placeholder="e.g., subscribed, first_receipt"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Variants (must total 100%)</Text>
                  {experimentForm.variants.map((variant, index) => (
                    <View key={index} style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                      <GlassInput
                        value={variant.name}
                        onChangeText={(name) => {
                          const newVariants = [...experimentForm.variants];
                          newVariants[index] = { ...variant, name };
                          setExperimentForm({ ...experimentForm, variants: newVariants });
                        }}
                        placeholder="Variant name"
                        style={{ flex: 1 }}
                      />
                      <GlassInput
                        value={variant.allocationPercent.toString()}
                        onChangeText={(value) => {
                          const newVariants = [...experimentForm.variants];
                          newVariants[index] = { ...variant, allocationPercent: parseInt(value) || 0 };
                          setExperimentForm({ ...experimentForm, variants: newVariants });
                        }}
                        placeholder="%"
                        keyboardType="numeric"
                        style={{ width: 80 }}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <GlassButton onPress={() => setExperimentModalVisible(false)} variant="ghost" style={{ flex: 1 }}>
                Cancel
              </GlassButton>
              <GlassButton onPress={handleCreateExperiment} style={{ flex: 1 }}>
                Create Experiment
              </GlassButton>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}
