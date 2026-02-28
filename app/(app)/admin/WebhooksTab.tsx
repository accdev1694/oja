import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useQuery, useMutation, useAction } from "convex/react";
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
} from "@/components/ui/glass";
import { adminStyles as styles } from "./styles";
import { Webhook } from "./types";
import { useAdminToast } from "./hooks";

interface WebhooksTabProps {
  hasPermission: (p: string) => boolean;
}

/**
 * WebhooksTab Component
 * Manages external webhook integrations.
 */
export function WebhooksTab({ hasPermission }: WebhooksTabProps) {
  const { alert: showAlert } = useGlassAlert();
  const { showToast } = useAdminToast();
  
  const webhooks = useQuery(api.admin.getWebhooks) as Webhook[] | undefined;
  const createWebhook = useMutation(api.admin.createWebhook);
  const toggleWebhook = useMutation(api.admin.toggleWebhook);
  const deleteWebhook = useMutation(api.admin.deleteWebhook);
  const testWebhook = useAction(api.admin.testWebhook);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    url: "",
    description: "",
    events: ["receipt.completed", "user.subscribed"],
  });

  const availableEvents = [
    "user.signup",
    "user.onboarding_complete",
    "user.subscribed",
    "list.created",
    "receipt.completed",
    "receipt.failed",
  ];

  const handleToggleEvent = (event: string) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
    Haptics.selectionAsync();
  };

  const handleCreate = useCallback(async () => {
    if (!form.url.trim()) {
      showToast("URL is required", "error");
      return;
    }
    try {
      await createWebhook(form);
      setModalVisible(false);
      setForm({ url: "", description: "", events: ["receipt.completed", "user.subscribed"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Webhook created", "success");
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  }, [form, createWebhook, showToast]);

  const handleTest = useCallback(async (id: string) => {
    try {
      await testWebhook({ id: id as any });
      showToast("Test event sent", "success");
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  }, [testWebhook, showToast]);

  const handleDelete = useCallback(async (id: string) => {
    showAlert("Delete Webhook", "Are you sure you want to remove this integration?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteWebhook({ id: id as any });
            showToast("Webhook deleted", "success");
          } catch (e) {
            showToast((e as Error).message, "error");
          }
        }
      }
    ]);
  }, [deleteWebhook, showAlert, showToast]);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <AnimatedSection animation="fadeInDown" duration={400}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="webhook" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>External Webhooks</Text>
          </View>
          
          <Text style={[styles.userEmail, { marginBottom: spacing.md }]}>
            Send real-time events to your external systems or monitoring tools.
          </Text>

          <GlassButton 
            onPress={() => setModalVisible(true)}
            size="sm"
            icon="plus"
          >Add Webhook</GlassButton>
        </GlassCard>
      </AnimatedSection>

      {webhooks?.map((wh, idx) => (
        <AnimatedSection key={wh._id} animation="fadeInDown" duration={400} delay={idx * 50}>
          <GlassCard style={styles.section}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>{wh.url}</Text>
                {wh.description ? <Text style={styles.userEmail}>{wh.description}</Text> : null}
                <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                  {wh.events.map(e => (
                    <View key={e} style={[styles.statusBadge, styles.infoBadge]}>
                      <Text style={styles.statusBadgeText}>{e}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Switch 
                value={wh.isEnabled} 
                onValueChange={async () => {
                  try {
                    await toggleWebhook({ id: wh._id as any });
                  } catch (e) {
                    showToast((e as Error).message, "error");
                  }
                }}
                trackColor={{ false: colors.glass.border, true: `${colors.accent.primary}60` }}
                thumbColor={wh.isEnabled ? colors.accent.primary : colors.text.tertiary}
              />
            </View>

            <View style={{ marginTop: spacing.md, padding: spacing.sm, backgroundColor: `${colors.glass.border}20`, borderRadius: 8 }}>
              <Text style={styles.fieldLabel}>Signing Secret (keep private)</Text>
              <Text style={[styles.logTime, { color: colors.text.primary }]}>{wh.secret}</Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md }}>
              <View>
                <Text style={styles.logTime}>
                  Last triggered: {wh.lastTriggeredAt ? new Date(wh.lastTriggeredAt).toLocaleString() : "Never"}
                </Text>
                {wh.lastResponseStatus && (
                  <Text style={[styles.logTime, { color: wh.lastResponseStatus < 300 ? colors.semantic.success : colors.semantic.danger }]}>
                    Last status: {wh.lastResponseStatus}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <GlassButton onPress={() => handleTest(wh._id)} variant="secondary" size="sm">Test</GlassButton>
                <Pressable onPress={() => handleDelete(wh._id)} style={{ padding: 8 }}>
                  <MaterialCommunityIcons name="delete-outline" size={20} color={colors.semantic.danger} />
                </Pressable>
              </View>
            </View>
          </GlassCard>
        </AnimatedSection>
      ))}

      {webhooks?.length === 0 && (
        <Text style={styles.emptyText}>No webhooks configured yet.</Text>
      )}

      {/* Create Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Webhook</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }}>
              <View style={{ gap: spacing.md }}>
                <View>
                  <Text style={styles.fieldLabel}>Endpoint URL *</Text>
                  <GlassInput
                    value={form.url}
                    onChangeText={url => setForm(f => ({ ...f, url }))}
                    placeholder="https://api.yourservice.com/webhook"
                    autoCapitalize="none"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Description</Text>
                  <GlassInput
                    value={form.description}
                    onChangeText={description => setForm(f => ({ ...f, description }))}
                    placeholder="Internal reference name"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Subscribed Events</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {availableEvents.map(e => (
                      <Pressable 
                        key={e}
                        onPress={() => handleToggleEvent(e)}
                        style={[
                          styles.filterChip,
                          form.events.includes(e) && styles.filterChipActive
                        ]}
                      >
                        <Text style={[
                          styles.filterChipText,
                          form.events.includes(e) && styles.filterChipTextActive
                        ]}>{e}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <GlassButton onPress={() => setModalVisible(false)} variant="ghost" style={{ flex: 1 }}>
                Cancel
              </GlassButton>
              <GlassButton onPress={handleCreate} style={{ flex: 1 }}>
                Create Webhook
              </GlassButton>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}
