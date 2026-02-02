import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  TextInput,
  Modal,
  Switch,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassHeader,
  SkeletonCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

type AdminTab = "overview" | "users" | "receipts" | "catalog" | "settings";

export default function AdminScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const analytics = useQuery(api.admin.getAnalytics);
  const loading = analytics === undefined;

  if (analytics === null) {
    return (
      <GlassScreen>
        <GlassHeader title="Admin" showBack onBack={() => router.back()} />
        <View style={styles.accessDenied}>
          <MaterialCommunityIcons name="shield-lock-outline" size={64} color={colors.semantic.danger} />
          <Text style={styles.accessTitle}>Access Denied</Text>
          <Text style={styles.accessSubtext}>Admin privileges required</Text>
        </View>
      </GlassScreen>
    );
  }

  if (loading) {
    return (
      <GlassScreen>
        <GlassHeader title="Admin Dashboard" showBack onBack={() => router.back()} />
        <View style={styles.loading}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </GlassScreen>
    );
  }

  const tabs: { key: AdminTab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "view-dashboard" },
    { key: "users", label: "Users", icon: "account-group" },
    { key: "receipts", label: "Receipts", icon: "receipt" },
    { key: "catalog", label: "Catalog", icon: "tag-multiple" },
    { key: "settings", label: "Settings", icon: "cog" },
  ];

  return (
    <GlassScreen>
      <GlassHeader title="Admin Dashboard" subtitle="Platform management" showBack onBack={() => router.back()} />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => { setActiveTab(tab.key); Haptics.selectionAsync(); }}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? colors.accent.primary : colors.text.tertiary}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "receipts" && <ReceiptsTab />}
      {activeTab === "catalog" && <CatalogTab />}
      {activeTab === "settings" && <SettingsTab />}
    </GlassScreen>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab() {
  const analytics = useQuery(api.admin.getAnalytics);
  const revenue = useQuery(api.admin.getRevenueReport);
  const health = useQuery(api.admin.getSystemHealth);
  const auditLogs = useQuery(api.admin.getAuditLogs, { limit: 10 });

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* System Health */}
      {health && (
        <Animated.View entering={FadeInDown.duration(400)}>
          <GlassCard style={styles.section}>
            <View style={styles.healthHeader}>
              <View style={[styles.healthDot, { backgroundColor: health.status === "healthy" ? colors.semantic.success : colors.semantic.warning }]} />
              <Text style={styles.sectionTitle}>System: {health.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.metricText}>
              Receipt success rate: {health.receiptProcessing.successRate}%
            </Text>
            <Text style={styles.metricText}>
              Failed: {health.receiptProcessing.failed} | Processing: {health.receiptProcessing.processing}
            </Text>
          </GlassCard>
        </Animated.View>
      )}

      {/* Analytics */}
      {analytics && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="chart-box" size={24} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Analytics</Text>
            </View>
            <View style={styles.metricsGrid}>
              <MetricCard label="Total Users" value={analytics.totalUsers} icon="account-group" />
              <MetricCard label="New (Week)" value={analytics.newUsersThisWeek} icon="account-plus" />
              <MetricCard label="Active (Week)" value={analytics.activeUsersThisWeek} icon="account-check" />
              <MetricCard label="Total Lists" value={analytics.totalLists} icon="clipboard-list" />
              <MetricCard label="Completed" value={analytics.completedLists} icon="check-circle" />
              <MetricCard label="Receipts" value={analytics.totalReceipts} icon="receipt" />
            </View>
            <View style={styles.gmvRow}>
              <Text style={styles.gmvLabel}>Total GMV</Text>
              <Text style={styles.gmvValue}>£{analytics.totalGMV.toLocaleString()}</Text>
            </View>
          </GlassCard>
        </Animated.View>
      )}

      {/* Revenue */}
      {revenue && (
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="cash-multiple" size={24} color={colors.semantic.success} />
              <Text style={styles.sectionTitle}>Revenue</Text>
            </View>
            <View style={styles.revenueGrid}>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueValue}>£{revenue.mrr.toFixed(2)}</Text>
                <Text style={styles.revenueLabel}>MRR</Text>
              </View>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueValue}>£{revenue.arr.toFixed(2)}</Text>
                <Text style={styles.revenueLabel}>ARR</Text>
              </View>
            </View>
            <Text style={styles.metricText}>
              {revenue.monthlySubscribers} monthly • {revenue.annualSubscribers} annual • {revenue.trialsActive} trials
            </Text>
          </GlassCard>
        </Animated.View>
      )}

      {/* Audit Logs */}
      {auditLogs && auditLogs.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Audit Logs</Text>
            {auditLogs.map((log: any) => (
              <View key={log._id} style={styles.logRow}>
                <Text style={styles.logAction}>{log.action}</Text>
                <Text style={styles.logDetails}>{log.details || log.targetType}</Text>
                <Text style={styles.logTime}>
                  {new Date(log.createdAt).toLocaleDateString()} by {log.adminName}
                </Text>
              </View>
            ))}
          </GlassCard>
        </Animated.View>
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}

// ============================================================================
// USERS TAB
// ============================================================================

function UsersTab() {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const users = useQuery(api.admin.getUsers, { limit: 50 });
  const searchResults = useQuery(
    api.admin.searchUsers,
    search.length >= 2 ? { searchTerm: search } : "skip"
  );
  const userDetail = useQuery(
    api.admin.getUserDetail,
    selectedUser ? { userId: selectedUser as any } : "skip"
  );

  const toggleAdmin = useMutation(api.admin.toggleAdmin);
  const extendTrial = useMutation(api.admin.extendTrial);
  const grantAccess = useMutation(api.admin.grantComplimentaryAccess);
  const toggleSuspension = useMutation(api.admin.toggleSuspension);

  const displayUsers = search.length >= 2 ? searchResults : users;

  const handleToggleAdmin = async (userId: string) => {
    try {
      await toggleAdmin({ userId: userId as any });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to toggle admin status");
    }
  };

  const handleExtendTrial = async (userId: string) => {
    Alert.alert("Extend Trial", "Add 14 days to trial?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Extend",
        onPress: async () => {
          try {
            await extendTrial({ userId: userId as any, days: 14 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Failed to extend trial");
          }
        },
      },
    ]);
  };

  const handleGrantAccess = async (userId: string) => {
    Alert.alert("Grant Premium", "Give free premium annual access?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Grant",
        onPress: async () => {
          try {
            await grantAccess({ userId: userId as any });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Failed to grant access");
          }
        },
      },
    ]);
  };

  const handleSuspend = async (userId: string) => {
    try {
      await toggleSuspension({ userId: userId as any });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      Alert.alert("Error", "Failed to toggle suspension");
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Search */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <GlassCard style={styles.section}>
          <View style={styles.searchRow}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              placeholderTextColor={colors.text.tertiary}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </GlassCard>
      </Animated.View>

      {/* User Detail Modal */}
      {selectedUser && userDetail && (
        <Animated.View entering={FadeInDown.duration(400)}>
          <GlassCard style={styles.section}>
            <View style={styles.detailHeader}>
              <Text style={styles.sectionTitle}>{userDetail.name}</Text>
              <Pressable onPress={() => setSelectedUser(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.tertiary} />
              </Pressable>
            </View>
            <Text style={styles.metricText}>{userDetail.email || "No email"}</Text>
            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailValue}>{userDetail.receiptCount}</Text>
                <Text style={styles.detailLabel}>Receipts</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailValue}>{userDetail.listCount}</Text>
                <Text style={styles.detailLabel}>Lists</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailValue}>£{userDetail.totalSpent}</Text>
                <Text style={styles.detailLabel}>Spent</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailValue}>{userDetail.scanRewards?.lifetimeScans ?? 0}</Text>
                <Text style={styles.detailLabel}>Scans</Text>
              </View>
            </View>
            {userDetail.subscription && (
              <Text style={styles.metricText}>
                Plan: {userDetail.subscription.plan} • Status: {userDetail.subscription.status}
              </Text>
            )}
            <View style={styles.actionRow}>
              <Pressable style={styles.actionBtn} onPress={() => handleExtendTrial(selectedUser)}>
                <MaterialCommunityIcons name="clock-plus-outline" size={16} color={colors.accent.primary} />
                <Text style={styles.actionBtnText}>+14d Trial</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => handleGrantAccess(selectedUser)}>
                <MaterialCommunityIcons name="crown" size={16} color={colors.semantic.warning} />
                <Text style={styles.actionBtnText}>Free Premium</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.dangerBtn]} onPress={() => handleSuspend(selectedUser)}>
                <MaterialCommunityIcons name="account-off" size={16} color={colors.semantic.danger} />
                <Text style={[styles.actionBtnText, { color: colors.semantic.danger }]}>Suspend</Text>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>
      )}

      {/* User List */}
      {displayUsers && displayUsers.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>
              {search.length >= 2 ? `Results (${displayUsers.length})` : `Users (${displayUsers.length})`}
            </Text>
            {displayUsers.map((u: any) => (
              <Pressable
                key={u._id}
                style={styles.userRow}
                onPress={() => setSelectedUser(u._id)}
              >
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail}>{u.email || "No email"}</Text>
                </View>
                <View style={styles.userActions}>
                  {u.isAdmin && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                  <Pressable onPress={() => handleToggleAdmin(u._id)} hitSlop={8}>
                    <MaterialCommunityIcons
                      name={u.isAdmin ? "shield-check" : "shield-outline"}
                      size={20}
                      color={u.isAdmin ? colors.accent.primary : colors.text.tertiary}
                    />
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </GlassCard>
        </Animated.View>
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}

// ============================================================================
// RECEIPTS TAB
// ============================================================================

function ReceiptsTab() {
  const recentReceipts = useQuery(api.admin.getRecentReceipts, { limit: 20 });
  const flaggedReceipts = useQuery(api.admin.getFlaggedReceipts);
  const priceAnomalies = useQuery(api.admin.getPriceAnomalies);

  const deleteReceipt = useMutation(api.admin.deleteReceipt);
  const bulkAction = useMutation(api.admin.bulkReceiptAction);
  const overridePrice = useMutation(api.admin.overridePrice);

  const handleDeleteReceipt = async (receiptId: string) => {
    Alert.alert("Delete Receipt", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReceipt({ receiptId: receiptId as any });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Failed to delete receipt");
          }
        },
      },
    ]);
  };

  const handleBulkApprove = async () => {
    if (!flaggedReceipts || flaggedReceipts.length === 0) return;
    const ids = flaggedReceipts.map((r: any) => r._id);
    try {
      await bulkAction({ receiptIds: ids, action: "approve" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to approve receipts");
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    try {
      await overridePrice({ priceId: priceId as any, deleteEntry: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to delete price");
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Flagged Receipts */}
      {flaggedReceipts && flaggedReceipts.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400)}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="flag" size={24} color={colors.semantic.warning} />
              <Text style={styles.sectionTitle}>Flagged ({flaggedReceipts.length})</Text>
            </View>
            {flaggedReceipts.slice(0, 10).map((r: any) => (
              <View key={r._id} style={styles.receiptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{r.storeName}</Text>
                  <Text style={styles.userEmail}>
                    £{r.total} • {r.userName} • {r.processingStatus}
                  </Text>
                </View>
                <Pressable onPress={() => handleDeleteReceipt(r._id)} hitSlop={8}>
                  <MaterialCommunityIcons name="delete-outline" size={20} color={colors.semantic.danger} />
                </Pressable>
              </View>
            ))}
            <GlassButton
              onPress={handleBulkApprove}
              variant="secondary"
              size="sm"
              style={{ marginTop: spacing.sm }}
            >{`Approve All (${flaggedReceipts.length})`}</GlassButton>
          </GlassCard>
        </Animated.View>
      )}

      {/* Price Anomalies */}
      {priceAnomalies && priceAnomalies.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={colors.semantic.danger} />
              <Text style={styles.sectionTitle}>Price Anomalies ({priceAnomalies.length})</Text>
            </View>
            {priceAnomalies.slice(0, 10).map((a: any) => (
              <View key={a._id} style={styles.receiptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{a.itemName}</Text>
                  <Text style={styles.userEmail}>
                    £{a.unitPrice.toFixed(2)} at {a.storeName} (avg: £{a.averagePrice}, {a.deviation}% off)
                  </Text>
                </View>
                <Pressable onPress={() => handleDeletePrice(a._id)} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle" size={20} color={colors.semantic.danger} />
                </Pressable>
              </View>
            ))}
          </GlassCard>
        </Animated.View>
      )}

      {/* Recent Receipts */}
      {recentReceipts && recentReceipts.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Receipts</Text>
            {recentReceipts.map((r: any) => (
              <View key={r._id} style={styles.receiptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{r.storeName}</Text>
                  <Text style={styles.userEmail}>
                    £{r.total.toFixed(2)} • {r.userName} • {new Date(r.purchaseDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.statusBadge, r.processingStatus === "completed" ? styles.successBadge : styles.warningBadge]}>
                  <Text style={styles.statusBadgeText}>{r.processingStatus}</Text>
                </View>
              </View>
            ))}
          </GlassCard>
        </Animated.View>
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}

// ============================================================================
// CATALOG TAB
// ============================================================================

function CatalogTab() {
  const categories = useQuery(api.admin.getCategories);
  const duplicateStores = useQuery(api.admin.getDuplicateStores);
  const mergeStores = useMutation(api.admin.mergeStoreNames);

  const handleMerge = async (variants: string[], suggested: string) => {
    Alert.alert("Merge Stores", `Merge all variants to "${suggested}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Merge",
        onPress: async () => {
          try {
            await mergeStores({ fromNames: variants, toName: suggested });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Failed to merge stores");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Duplicate Stores */}
      {duplicateStores && duplicateStores.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400)}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="store-alert" size={24} color={colors.semantic.warning} />
              <Text style={styles.sectionTitle}>Duplicate Stores ({duplicateStores.length})</Text>
            </View>
            {duplicateStores.map((d: any, i: number) => (
              <View key={i} style={styles.storeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{d.variants.join(" / ")}</Text>
                  <Text style={styles.userEmail}>Suggested: {d.suggested}</Text>
                </View>
                <Pressable
                  style={styles.mergeBtn}
                  onPress={() => handleMerge(d.variants, d.suggested)}
                >
                  <Text style={styles.mergeBtnText}>Merge</Text>
                </Pressable>
              </View>
            ))}
          </GlassCard>
        </Animated.View>
      )}

      {/* Categories */}
      {categories && categories.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Categories ({categories.length})</Text>
            <View style={styles.categoryGrid}>
              {categories.map((c: any) => (
                <View key={c.name} style={styles.categoryChip}>
                  <Text style={styles.categoryName}>{c.name}</Text>
                  <Text style={styles.categoryCount}>{c.count}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </Animated.View>
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}

// ============================================================================
// SETTINGS TAB (Feature Flags + Announcements)
// ============================================================================

function SettingsTab() {
  const featureFlags = useQuery(api.admin.getFeatureFlags);
  const announcements = useQuery(api.admin.getAnnouncements);

  const toggleFlag = useMutation(api.admin.toggleFeatureFlag);
  const createAnnouncement = useMutation(api.admin.createAnnouncement);
  const toggleAnnouncement = useMutation(api.admin.toggleAnnouncement);

  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annType, setAnnType] = useState<"info" | "warning" | "promo">("info");

  const [newFlagKey, setNewFlagKey] = useState("");

  const handleToggleFlag = async (key: string, currentValue: boolean) => {
    try {
      await toggleFlag({ key, value: !currentValue });
      Haptics.selectionAsync();
    } catch {
      Alert.alert("Error", "Failed to toggle flag");
    }
  };

  const handleAddFlag = async () => {
    if (!newFlagKey.trim()) return;
    try {
      await toggleFlag({ key: newFlagKey.trim(), value: true, description: "New feature flag" });
      setNewFlagKey("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to add flag");
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) return;
    try {
      await createAnnouncement({ title: annTitle, body: annBody, type: annType });
      setShowNewAnnouncement(false);
      setAnnTitle("");
      setAnnBody("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to create announcement");
    }
  };

  const handleToggleAnnouncement = async (id: string) => {
    try {
      await toggleAnnouncement({ announcementId: id as any });
      Haptics.selectionAsync();
    } catch {
      Alert.alert("Error", "Failed to toggle announcement");
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Feature Flags */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="toggle-switch" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Feature Flags</Text>
          </View>
          {featureFlags?.map((f: any) => (
            <View key={f._id} style={styles.flagRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{f.key}</Text>
                {f.description && <Text style={styles.userEmail}>{f.description}</Text>}
              </View>
              <Switch
                value={f.value}
                onValueChange={() => handleToggleFlag(f.key, f.value)}
                trackColor={{ false: colors.glass.border, true: `${colors.accent.primary}60` }}
                thumbColor={f.value ? colors.accent.primary : colors.text.tertiary}
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
      </Animated.View>

      {/* Announcements */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
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
                <GlassButton onPress={() => setShowNewAnnouncement(false)} variant="ghost" size="sm">Cancel</GlassButton>
                <GlassButton onPress={handleCreateAnnouncement} size="sm">Create</GlassButton>
              </View>
            </View>
          )}

          {announcements?.map((a: any) => (
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
              <Switch
                value={a.active}
                onValueChange={() => handleToggleAnnouncement(a._id)}
                trackColor={{ false: colors.glass.border, true: `${colors.accent.primary}60` }}
                thumbColor={a.active ? colors.accent.primary : colors.text.tertiary}
              />
            </View>
          ))}
        </GlassCard>
      </Animated.View>

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function MetricCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons name={icon as any} size={20} color={colors.accent.primary} />
      <Text style={styles.metricValue}>{value.toLocaleString()}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  loading: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  accessDenied: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  accessTitle: { ...typography.headlineMedium, color: colors.semantic.danger },
  accessSubtext: { ...typography.bodyMedium, color: colors.text.tertiary },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: 2,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent.primary,
  },
  tabLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  tabLabelActive: {
    color: colors.accent.primary,
  },

  // Sections
  section: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { ...typography.headlineSmall, color: colors.text.primary, marginBottom: spacing.sm },
  healthHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  healthDot: { width: 12, height: 12, borderRadius: 6 },
  metricText: { ...typography.bodyMedium, color: colors.text.tertiary, marginTop: 4 },

  // Metrics grid
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  metricCard: {
    width: "30%",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    padding: spacing.sm,
    gap: 4,
  },
  metricValue: { ...typography.headlineSmall, color: colors.text.primary },
  metricLabel: { ...typography.bodySmall, color: colors.text.tertiary, textAlign: "center", fontSize: 10 },
  gmvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.glass.border },
  gmvLabel: { ...typography.bodyLarge, color: colors.text.secondary },
  gmvValue: { ...typography.headlineMedium, color: colors.semantic.success },

  // Revenue
  revenueGrid: { flexDirection: "row", gap: spacing.lg, marginBottom: spacing.sm },
  revenueItem: { alignItems: "center" },
  revenueValue: { ...typography.headlineMedium, color: colors.semantic.success },
  revenueLabel: { ...typography.bodySmall, color: colors.text.tertiary },

  // Users
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchInput: { flex: 1, ...typography.bodyMedium, color: colors.text.primary, padding: 0 },
  userRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  userInfo: { flex: 1 },
  userName: { ...typography.bodyMedium, color: colors.text.primary, fontWeight: "600" },
  userEmail: { ...typography.bodySmall, color: colors.text.tertiary },
  userActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  adminBadge: { backgroundColor: `${colors.accent.primary}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  adminBadgeText: { ...typography.labelSmall, color: colors.accent.primary },

  // User detail
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailGrid: { flexDirection: "row", gap: spacing.md, marginVertical: spacing.md },
  detailItem: { flex: 1, alignItems: "center", backgroundColor: colors.glass.background, borderRadius: 12, padding: spacing.sm },
  detailValue: { ...typography.headlineSmall, color: colors.text.primary },
  detailLabel: { ...typography.bodySmall, color: colors.text.tertiary, fontSize: 10 },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    backgroundColor: colors.glass.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  actionBtnText: { ...typography.labelSmall, color: colors.accent.primary },
  dangerBtn: { borderColor: `${colors.semantic.danger}40` },

  // Receipts
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    gap: spacing.sm,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  successBadge: { backgroundColor: `${colors.semantic.success}20` },
  warningBadge: { backgroundColor: `${colors.semantic.warning}20` },
  statusBadgeText: { ...typography.labelSmall, color: colors.text.secondary, fontSize: 10 },

  // Catalog
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    gap: spacing.sm,
  },
  mergeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${colors.accent.primary}20`,
    borderRadius: 8,
  },
  mergeBtnText: { ...typography.labelSmall, color: colors.accent.primary },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.glass.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  categoryName: { ...typography.bodySmall, color: colors.text.primary },
  categoryCount: { ...typography.labelSmall, color: colors.text.tertiary },

  // Feature flags
  flagRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  addFlagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  flagInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
    backgroundColor: colors.glass.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  addFlagBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.accent.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },

  // Announcements
  annRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  annTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  infoBadge: { backgroundColor: `${colors.accent.primary}20` },
  promoBadge: { backgroundColor: `${colors.semantic.success}20` },
  newAnnForm: { gap: spacing.sm, marginBottom: spacing.md },
  annInput: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    backgroundColor: colors.glass.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  typeRow: { flexDirection: "row", gap: spacing.sm },
  typeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  typeBtnActive: {
    borderColor: colors.accent.primary,
    backgroundColor: `${colors.accent.primary}15`,
  },
  typeBtnText: { ...typography.labelSmall, color: colors.text.tertiary },
  typeBtnTextActive: { color: colors.accent.primary },
  formActions: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" },

  // Audit logs
  logRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  logAction: { ...typography.bodyMedium, color: colors.text.primary, fontWeight: "600" },
  logDetails: { ...typography.bodySmall, color: colors.text.secondary },
  logTime: { ...typography.bodySmall, color: colors.text.tertiary, marginTop: 2 },
});
