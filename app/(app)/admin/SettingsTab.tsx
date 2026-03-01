import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TextInput,
  Pressable,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
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
import { 
  FeatureFlag, 
  Announcement, 
  PricingConfig, 
  AdminSession 
} from "./types";
import type { Id } from "@/convex/_generated/dataModel";
import { useAdminToast } from "./hooks";

interface SettingsTabProps {
  /** Permission check function */
  hasPermission: (p: string) => boolean;
}

/**
 * SettingsTab Component
 * Manages platform-wide settings including pricing, feature flags, and announcements.
 */
export function SettingsTab({ hasPermission }: SettingsTabProps) {
  const { alert: showAlert } = useGlassAlert();
  const { showToast } = useAdminToast();
  
  const canManageFlags = hasPermission("manage_flags");
  const canManageAnnouncements = hasPermission("manage_announcements");
  const canManagePricing = hasPermission("manage_pricing");

  const featureFlags = useQuery(api.admin.getFeatureFlags) as FeatureFlag[] | undefined;
  const announcements = useQuery(api.admin.getAnnouncements) as Announcement[] | undefined;
  const pricingConfig = useQuery(api.admin.getPricingConfig) as PricingConfig[] | undefined;
  const activeSessions = useQuery(api.admin.getActiveSessions) as AdminSession[] | undefined;

  const toggleFlag = useMutation(api.admin.toggleFeatureFlag);
  const createAnnouncement = useMutation(api.admin.createAnnouncement);
  const updateAnnouncement = useMutation(api.admin.updateAnnouncement);
  const toggleAnnouncement = useMutation(api.admin.toggleAnnouncement);
  const updatePricing = useMutation(api.admin.updatePricing);
  const forceLogout = useMutation(api.admin.forceLogoutSession);
  const clearSeedDataMutation = useMutation(api.admin.clearSeedData);
  const archiveLogs = useMutation(api.admin.archiveOldAdminLogs);
  const simulateLoad = useMutation(api.admin.simulateHighLoad);

  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annType, setAnnType] = useState<"info" | "warning" | "promo">("info");

  const [newFlagKey, setNewFlagKey] = useState("");
  const [isCleaning, setIsCleaning] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Image optimization migration state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeProgress, setOptimizeProgress] = useState({ processed: 0, total: 0, saved: 0 });

  // Image migration queries/mutations
  const imagesToOptimize = useQuery(api.migrations.optimizeImages.getImagesToOptimize);
  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const updateReceiptImage = useMutation(api.migrations.optimizeImages.updateReceiptImage);
  const markMigrationComplete = useMutation(api.migrations.optimizeImages.markMigrationComplete);
  const getStorageUrls = useQuery(
    api.receipts.getStorageUrls,
    imagesToOptimize?.total ? { storageIds: imagesToOptimize.receipts.map(r => r.imageStorageId) } : "skip"
  );

  const handleClearSeedData = useCallback(async () => {
    showAlert("Clear Seed Data", "This will permanently remove all placeholder and testing data (receipts, prices, price history). Real scans will NOT be affected. Proceed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear Data",
        style: "destructive",
        onPress: async () => {
          setIsCleaning(true);
          try {
            const result = await clearSeedDataMutation({});
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`Cleared ${result.deletedReceipts} test records`, "success");
          } catch (e) {
            showToast((e as Error).message || "Failed to clear seed data", "error");
          } finally {
            setIsCleaning(false);
          }
        }
      }
    ]);
  }, [clearSeedDataMutation, showAlert, showToast]);

  const handleArchiveLogs = useCallback(async () => {
    setIsArchiving(true);
    try {
      const result = await archiveLogs({});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Archived ${result.archived} old logs`, "success");
    } catch (e) {
      showToast((e as Error).message || "Failed to archive logs", "error");
    } finally {
      setIsArchiving(false);
    }
  }, [archiveLogs, showToast]);

  const handleSimulateLoad = useCallback(async () => {
    showAlert("Scale Test", "Generate 50,000 mock users and 100,000 receipts? This should ONLY be run in a test environment.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Run Test",
        style: "destructive",
        onPress: async () => {
          setIsSimulating(true);
          try {
            const result = await simulateLoad({ userCount: 50000, receiptCount: 100000 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Scale test complete", "success");
          } catch (e) {
            showToast((e as Error).message || "Scale test failed", "error");
          } finally {
            setIsSimulating(false);
          }
        }
      }
    ]);
  }, [simulateLoad, showAlert, showToast]);

  const handleUpdatePrice = useCallback(async (planId: string, amount: string) => {
    const price = parseFloat(amount);
    if (isNaN(price)) return;
    try {
      await updatePricing({ planId, priceAmount: price });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Price updated", "success");
    } catch (error) {
      showToast((error as Error).message || "Failed to update price", "error");
    }
  }, [updatePricing, showToast]);

  const handleToggleFlag = useCallback(async (key: string, currentValue: boolean) => {
    try {
      await toggleFlag({ key, value: !currentValue });
      Haptics.selectionAsync();
      showToast(`${key} toggled`, "success");
    } catch (error) {
      showToast((error as Error).message || "Failed to toggle flag", "error");
    }
  }, [toggleFlag, showToast]);

  const handleAddFlag = useCallback(async () => {
    if (!newFlagKey.trim()) return;
    try {
      await toggleFlag({ key: newFlagKey.trim(), value: true });
      setNewFlagKey("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Flag added", "success");
    } catch (error) {
      showToast((error as Error).message || "Failed to add flag", "error");
    }
  }, [newFlagKey, toggleFlag, showToast]);

  const handleSaveAnnouncement = useCallback(async () => {
    if (!annTitle.trim() || !annBody.trim()) return;
    try {
      if (editingAnnouncement) {
        await updateAnnouncement({
          announcementId: editingAnnouncement._id as Id<"announcements">,
          title: annTitle,
          body: annBody,
          type: annType,
        });
      } else {
        await createAnnouncement({ title: annTitle, body: annBody, type: annType });
      }
      setShowNewAnnouncement(false);
      setEditingAnnouncement(null);
      setAnnTitle("");
      setAnnBody("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(editingAnnouncement ? "Announcement updated" : "Announcement created", "success");
    } catch (error) {
      showToast((error as Error).message || "Failed to save announcement", "error");
    }
  }, [annTitle, annBody, annType, editingAnnouncement, createAnnouncement, updateAnnouncement, showToast]);

  const startEdit = useCallback((ann: Announcement) => {
    setEditingAnnouncement(ann);
    setAnnTitle(ann.title);
    setAnnBody(ann.body);
    setAnnType(ann.type);
    setShowNewAnnouncement(true);
    Haptics.selectionAsync();
  }, []);

  const handleToggleAnnouncement = useCallback(async (id: string) => {
    try {
      await toggleAnnouncement({ announcementId: id as Id<"announcements"> });
      Haptics.selectionAsync();
      showToast("Announcement status toggled", "success");
    } catch (error) {
      showToast((error as Error).message || "Failed to toggle announcement", "error");
    }
  }, [toggleAnnouncement, showToast]);

  const handleForceLogout = useCallback(async (sessionId: string) => {
    showAlert("Force Logout", "Force this admin session to expire?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await forceLogout({ sessionId: sessionId as Id<"adminSessions"> });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Session expired", "success");
          } catch (error) {
            showToast((error as Error).message || "Failed to force logout", "error");
          }
        },
      },
    ]);
  }, [forceLogout, showAlert, showToast]);

  // Handle image optimization migration (receipts only)
  const handleOptimizeImages = useCallback(async () => {
    if (!imagesToOptimize || !getStorageUrls || isOptimizing) return;

    // Only receipts have imageStorageId - listItems and pantryItems use itemVariants
    const receiptImages = imagesToOptimize.receipts.map(r => ({ ...r, targetWidth: 1600 }));

    if (receiptImages.length === 0) {
      showToast("No images to optimize", "info");
      return;
    }

    showAlert(
      "Optimize Receipt Images",
      `This will resize ${receiptImages.length} receipt images to reduce storage and improve load times. This may take several minutes. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Optimize",
          onPress: async () => {
            setIsOptimizing(true);
            setOptimizeProgress({ processed: 0, total: receiptImages.length, saved: 0 });

            let totalSaved = 0;
            let processed = 0;

            for (const record of receiptImages) {
              const imageUrl = getStorageUrls[record.imageStorageId];
              if (!imageUrl) {
                processed++;
                setOptimizeProgress(prev => ({ ...prev, processed }));
                continue;
              }

              try {
                // Fetch original to check size
                const originalResponse = await fetch(imageUrl);
                const originalBlob = await originalResponse.blob();
                const originalSize = originalBlob.size;

                // Skip if already small (< 500KB)
                if (originalSize < 500 * 1024) {
                  processed++;
                  setOptimizeProgress(prev => ({ ...prev, processed }));
                  continue;
                }

                // Optimize
                const manipulated = await ImageManipulator.manipulateAsync(
                  imageUrl,
                  [{ resize: { width: record.targetWidth } }],
                  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );

                // Upload optimized
                const uploadUrl = await generateUploadUrl();
                const optimizedResponse = await fetch(manipulated.uri);
                const optimizedBlob = await optimizedResponse.blob();
                const optimizedSize = optimizedBlob.size;

                // Skip if no significant savings
                if (optimizedSize >= originalSize * 0.9) {
                  processed++;
                  setOptimizeProgress(prev => ({ ...prev, processed }));
                  continue;
                }

                const uploadResponse = await fetch(uploadUrl, {
                  method: "POST",
                  headers: { "Content-Type": "image/jpeg" },
                  body: optimizedBlob,
                });

                if (!uploadResponse.ok) throw new Error("Upload failed");

                const { storageId: newStorageId } = await uploadResponse.json();

                // Update receipt with new optimized image
                await updateReceiptImage({
                  receiptId: record._id as Id<"receipts">,
                  oldStorageId: record.imageStorageId,
                  newStorageId,
                });

                totalSaved += originalSize - optimizedSize;
              } catch (error) {
                console.error(`Failed to optimize ${record._id}:`, error);
              }

              processed++;
              setOptimizeProgress({ processed, total: receiptImages.length, saved: totalSaved });

              // Small delay to avoid overwhelming
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            await markMigrationComplete({ imagesOptimized: processed, bytesFreed: totalSaved });

            setIsOptimizing(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(
              `Optimized ${processed} images, freed ${(totalSaved / 1024 / 1024).toFixed(1)} MB`,
              "success"
            );
          },
        },
      ]
    );
  }, [
    imagesToOptimize,
    getStorageUrls,
    isOptimizing,
    generateUploadUrl,
    updateReceiptImage,
    markMigrationComplete,
    showAlert,
    showToast,
  ]);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Active Sessions */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="security" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Active Admin Sessions</Text>
          </View>
          {Array.isArray(activeSessions) && activeSessions.map((s) => (
            <View key={s._id} style={styles.sessionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{s.userName}</Text>
                <Text style={styles.userEmail}>{s.userAgent || "Unknown Device"}</Text>
                <Text style={styles.lastUpdatedText}>
                  Logged in: {new Date(s.loginAt || Date.now()).toLocaleString()}
                </Text>
                <Text style={styles.lastUpdatedText}>
                  Last active: {new Date(s.lastSeenAt || Date.now()).toLocaleTimeString()}
                </Text>
              </View>
              {hasPermission("manage_flags") && (
                <Pressable onPress={() => handleForceLogout(s._id)} hitSlop={8}>
                  <MaterialCommunityIcons name="logout-variant" size={20} color={colors.semantic.danger} />
                </Pressable>
              )}
            </View>
          ))}
          {(!activeSessions || activeSessions.length === 0) && (
            <Text style={styles.emptyText}>No active admin sessions found.</Text>
          )}
        </GlassCard>
      </AnimatedSection>

      {/* Image Optimization - Available to all admins */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="image-sync" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Storage Optimization</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={styles.userName}>Optimize Receipt Images</Text>
              <Text style={styles.userEmail}>
                {imagesToOptimize?.total ?? 0} receipt images can be resized to reduce storage and improve load times.
                {isOptimizing && ` (${optimizeProgress.processed}/${optimizeProgress.total} - ${(optimizeProgress.saved / 1024 / 1024).toFixed(1)} MB freed)`}
              </Text>
            </View>
            <GlassButton
              variant="secondary"
              size="sm"
              onPress={handleOptimizeImages}
              loading={isOptimizing}
              disabled={!imagesToOptimize?.total}
            >{isOptimizing ? "Optimizing..." : "Optimize"}</GlassButton>
          </View>
        </GlassCard>
      </AnimatedSection>

      {/* Maintenance & Data */}
      {hasPermission("bulk_operation") && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="database-remove" size={24} color={colors.semantic.danger} />
              <Text style={styles.sectionTitle}>Maintenance & Data</Text>
            </View>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1, marginRight: spacing.md }}>
                  <Text style={styles.userName}>Clear Seed Data</Text>
                  <Text style={styles.userEmail}>Removes all placeholder receipts and testing data from the platform.</Text>
                </View>
                <GlassButton
                  variant="danger"
                  size="sm"
                  onPress={handleClearSeedData}
                  loading={isCleaning}
                >Clear</GlassButton>
              </View>

              <View style={{ height: 1, backgroundColor: colors.glass.border, opacity: 0.5, marginVertical: spacing.xs }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1, marginRight: spacing.md }}>
                  <Text style={styles.userName}>Archive Old Logs</Text>
                  <Text style={styles.userEmail}>Manually trigger archival of admin logs older than 90 days.</Text>
                </View>
                <GlassButton
                  variant="secondary"
                  size="sm"
                  onPress={handleArchiveLogs}
                  loading={isArchiving}
                >Archive</GlassButton>
              </View>

              <View style={{ height: 1, backgroundColor: colors.glass.border, opacity: 0.5, marginVertical: spacing.xs }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1, marginRight: spacing.md }}>
                  <Text style={styles.userName}>Scale Testing</Text>
                  <Text style={styles.userEmail}>Simulate 50k users/100k receipts to verify dashboard performance.</Text>
                </View>
                <GlassButton
                  variant="secondary"
                  size="sm"
                  onPress={handleSimulateLoad}
                  loading={isSimulating}
                >Run Test</GlassButton>
              </View>
            </View>
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Platform Pricing */}
      {canManagePricing && Array.isArray(pricingConfig) && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="currency-gbp" size={24} color={colors.semantic.success} />
              <Text style={styles.sectionTitle}>Platform Pricing</Text>
            </View>
            {pricingConfig.map((p) => (
              <View key={p._id} style={styles.flagRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{p.displayName}</Text>
                  <Text style={styles.userEmail}>{p.planId}</Text>
                </View>
                <View style={{ width: 80 }}>
                  <TextInput
                    style={styles.flagInput}
                    keyboardType="numeric"
                    defaultValue={(p.priceAmount ?? 0).toString()}
                    onEndEditing={(e) => handleUpdatePrice(p.planId, e.nativeEvent.text)}
                  />
                </View>
              </View>
            ))}
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Feature Flags */}
      {canManageFlags && Array.isArray(featureFlags) && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="toggle-switch" size={24} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Feature Flags</Text>
            </View>
            {featureFlags.map((f) => (
              <View key={f._id} style={styles.flagRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{f.key}</Text>
                  {f.description && <Text style={styles.userEmail}>{f.description}</Text>}
                  <Text style={styles.lastUpdatedText}>
                    Modified by {f.updatedByName ?? "System"}
                  </Text>
                </View>
                <Switch
                  value={!!f.value}
                  onValueChange={() => handleToggleFlag(f.key, !!f.value)}
                  trackColor={{ false: colors.glass.border, true: `${colors.accent.primary}60` }}
                  thumbColor={!!f.value ? colors.accent.primary : colors.text.tertiary}
                />
              </View>
            ))}
            <View style={styles.addFlagRow}>
              <TextInput
                style={styles.flagInput}
                placeholder="new_flag_key"
                placeholderTextColor={colors.text.tertiary}
                value={newFlagKey}
                onChangeText={setNewFlagKey}
              />
              <Pressable style={styles.addFlagBtn} onPress={handleAddFlag}>
                <MaterialCommunityIcons name="plus" size={20} color={colors.accent.primary} />
              </Pressable>
            </View>
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Announcements */}
      {canManageAnnouncements && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="bullhorn" size={24} color={colors.semantic.warning} />
              <Text style={styles.sectionTitle}>Announcements</Text>
            </View>

            {!showNewAnnouncement ? (
              <GlassButton
                onPress={() => setShowNewAnnouncement(true)}
                variant="secondary"
                size="sm"
                style={{ marginBottom: spacing.md }}
              >New Announcement</GlassButton>
            ) : (
              <View style={styles.newAnnForm}>
                <Text style={styles.userName}>{editingAnnouncement ? "Edit Announcement" : "New Announcement"}</Text>
                <TextInput
                  style={styles.annInput}
                  placeholder="Title"
                  placeholderTextColor={colors.text.tertiary}
                  value={annTitle}
                  onChangeText={setAnnTitle}
                />
                <TextInput
                  style={[styles.annInput, { height: 80, textAlignVertical: "top" }]}
                  placeholder="Body"
                  placeholderTextColor={colors.text.tertiary}
                  value={annBody}
                  onChangeText={setAnnBody}
                  multiline
                />
                <View style={styles.typeRow}>
                  {(["info", "warning", "promo"] as const).map((t) => (
                    <Pressable
                      key={t}
                      style={[styles.typeBtn, annType === t && styles.typeBtnActive]}
                      onPress={() => setAnnType(t)}
                    >
                      <Text style={[styles.typeBtnText, annType === t && styles.typeBtnTextActive]}>
                        {t}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.formActions}>
                  <GlassButton onPress={() => { setShowNewAnnouncement(false); setEditingAnnouncement(null); }} variant="ghost" size="sm">Cancel</GlassButton>
                  <GlassButton onPress={handleSaveAnnouncement} size="sm">{editingAnnouncement ? "Update" : "Create"}</GlassButton>
                </View>
              </View>
            )}

            {Array.isArray(announcements) && announcements.map((a) => (
              <View key={a._id} style={styles.annRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.annTypeBadge, a.type === "warning" ? styles.warningBadge : a.type === "promo" ? styles.promoBadge : styles.infoBadge]}>
                      <Text style={styles.statusBadgeText}>{a.type}</Text>
                    </View>
                    <Text style={[styles.userName, !a.active && { opacity: 0.5 }]}>{a.title}</Text>
                  </View>
                  <Text style={[styles.userEmail, !a.active && { opacity: 0.5 }]}>{a.body}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Pressable onPress={() => startEdit(a)} hitSlop={8}>
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.accent.primary} />
                  </Pressable>
                  <Switch
                    value={!!a.active}
                    onValueChange={() => handleToggleAnnouncement(a._id)}
                    trackColor={{ false: colors.glass.border, true: `${colors.accent.primary}60` }}
                    thumbColor={!!a.active ? colors.accent.primary : colors.text.tertiary}
                  />
                </View>
              </View>
            ))}
          </GlassCard>
        </AnimatedSection>
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}
