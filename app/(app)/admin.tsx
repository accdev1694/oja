import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, usePaginatedQuery, useAction, useStorageUrl } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassScreen,
  GlassCard,
  GlassButton,
  SimpleHeader,
  SkeletonCard,
  AnimatedSection,
  colors,
  typography,
  spacing,
  useGlassAlert,
  GlassDateRangePicker,
  type DateRange,
} from "@/components/ui/glass";
import Animated, { FadeInDown } from "react-native-reanimated";

type AdminTab = "overview" | "users" | "analytics" | "support" | "monitoring" | "receipts" | "catalog" | "settings";

// Error Boundary wrapper for crash protection
class AdminErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[AdminScreen] Error:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1528", padding: 20 }}>
          <Text style={{ color: "#FF6B6B", fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>
            Admin Screen Error
          </Text>
          <Text style={{ color: "#FFFFFF", fontSize: 14, textAlign: "center", marginBottom: 20 }}>
            {this.state.error?.message || "Unknown error"}
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: "#00D4AA", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
          >
            <Text style={{ color: "#000", fontWeight: "bold" }}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

function AdminScreenInner() {
  const router = useRouter();
  const { alert: showAlert } = useGlassAlert();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  const analytics = useQuery(api.admin.getAnalytics, {});
  const myPerms = useQuery(api.admin.getMyPermissions, {});
  const logSession = useMutation(api.admin.logAdminSession);
  const exportData = useAction(api.admin.exportDataToCSV);

  const loading = analytics === undefined || myPerms === undefined;

  const handleExportCSV = useCallback(async (type: "users" | "receipts" | "prices" | "analytics") => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const result = await exportData({ dataType: type });
      showAlert("Export Complete", `Generated ${result.fileName}.\n\nPreview (Top 5 rows):\n${result.csv.split('\n').slice(0, 5).join('\n')}`);
    } catch (e: any) {
      showAlert("Error", e.message || "Failed to export CSV");
    }
  }, [exportData]);

  const hasPermission = useCallback((p: string) => {
    if (!myPerms) return false;
    if (myPerms.role === "super_admin") return true;
    return Array.isArray(myPerms.permissions) && myPerms.permissions.includes(p);
  }, [myPerms]);

  // Session Heartbeat
  useEffect(() => {
    if (analytics === null || myPerms === null || loading) return;

    const heartbeat = async () => {
      try {
        await logSession({
          userAgent: `Mobile App (${Platform.OS})`,
        });
      } catch (e) {
        console.error("Failed to log admin session:", e);
      }
    };

    heartbeat();
    const interval = setInterval(heartbeat, 5 * 60 * 1000); // every 5 mins
    return () => clearInterval(interval);
  }, [analytics === null, myPerms === null, loading]);

  if (!loading && (analytics === null || myPerms === null)) {
    return (
      <GlassScreen>
        <SimpleHeader title="Admin" showBack onBack={() => router.back()} />
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
        <SimpleHeader title="Admin Dashboard" showBack onBack={() => router.back()} />
        <View style={styles.loading}>
          <SkeletonCard />
          <SkeletonCard style={{ marginTop: spacing.md }} />
          <SkeletonCard style={{ marginTop: spacing.md }} />
        </View>
      </GlassScreen>
    );
  }

  const tabs: { key: AdminTab; label: string; icon: string; permission: string }[] = [
    { key: "overview", label: "Overview", icon: "view-dashboard", permission: "view_analytics" },
    { key: "users", label: "Users", icon: "account-group", permission: "view_users" },
    { key: "analytics", label: "Analytics", icon: "chart-timeline-variant", permission: "view_analytics" },
    { key: "support", label: "Support", icon: "help-circle", permission: "view_analytics" },
    { key: "monitoring", label: "Ops", icon: "pulse", permission: "view_analytics" },
    { key: "receipts", label: "Receipts", icon: "receipt", permission: "view_receipts" },
    { key: "catalog", label: "Catalog", icon: "tag-multiple", permission: "manage_catalog" },
    { key: "settings", label: "Settings", icon: "cog", permission: "manage_flags" }, 
  ];

  const visibleTabs = tabs.filter(tab => hasPermission(tab.permission));
  const activeTabData = tabs.find(t => t.key === activeTab) || tabs[0];

  return (
    <GlassScreen>
      <SimpleHeader 
        title="Admin Dashboard" 
        subtitle={myPerms?.displayName || "Platform management"} 
        showBack onBack={() => router.back()} 
      />

      {/* Collapsible Tool Switcher */}
      <View style={styles.switcherWrapper}>
        <Pressable 
          style={[styles.activeToolPill, isMenuExpanded && styles.activeToolPillExpanded]}
          onPress={() => { setIsMenuExpanded(!isMenuExpanded); Haptics.selectionAsync(); }}
        >
          <View style={styles.activeToolInfo}>
            <MaterialCommunityIcons name={activeTabData.icon as any} size={20} color={colors.accent.primary} />
            <Text style={styles.activeToolLabel}>{activeTabData.label}</Text>
          </View>
          <MaterialCommunityIcons 
            name={isMenuExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={colors.text.tertiary} 
          />
        </Pressable>

        {isMenuExpanded && (
          <AnimatedSection animation="fadeInDown" duration={300}>
            <GlassCard style={styles.menuExpandedGrid}>
              <View style={styles.gridContainer}>
                {visibleTabs.map((tab) => (
                  <Pressable
                    key={tab.key}
                    style={[styles.gridItem, activeTab === tab.key && styles.gridItemActive]}
                    onPress={() => { 
                      setActiveTab(tab.key); 
                      setIsMenuExpanded(false); 
                      Haptics.selectionAsync(); 
                    }}
                  >
                    <View style={[styles.gridIconCircle, activeTab === tab.key && styles.gridIconCircleActive]}>
                      <MaterialCommunityIcons
                        name={tab.icon as any}
                        size={20}
                        color={activeTab === tab.key ? "#000" : colors.text.secondary}
                      />
                    </View>
                    <Text style={[styles.gridLabel, activeTab === tab.key && styles.gridLabelActive]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </GlassCard>
          </AnimatedSection>
        )}
      </View>

      <View style={{ flex: 1, zIndex: 1 }}>
        {activeTab === "overview" && <OverviewTab hasPermission={hasPermission} />}
        {activeTab === "users" && <UsersTab hasPermission={hasPermission} handleExportCSV={handleExportCSV} />}
        {activeTab === "analytics" && <AnalyticsTab hasPermission={hasPermission} handleExportCSV={handleExportCSV} />}
        {activeTab === "support" && <SupportTab hasPermission={hasPermission} />}
        {activeTab === "monitoring" && <MonitoringTab hasPermission={hasPermission} />}
        {activeTab === "receipts" && <ReceiptsTab hasPermission={hasPermission} />}
        {activeTab === "catalog" && <CatalogTab hasPermission={hasPermission} />}
        {activeTab === "settings" && <SettingsTab hasPermission={hasPermission} />}
      </View>
    </GlassScreen>
  );
}

// Wrap with Error Boundary for crash protection
export default function AdminScreen() {
  return (
    <AdminErrorBoundary>
      <AdminScreenInner />
    </AdminErrorBoundary>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ hasPermission }: { hasPermission: (p: string) => boolean }) {
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshKey, setRefreshKey] = useState(Date.now().toString());
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

  const canViewLogs = hasPermission("view_audit_logs");

  const queryArgs = { 
    refreshKey, 
    dateFrom: dateRange.startDate || undefined, 
    dateTo: dateRange.endDate || undefined 
  };

  const analytics = useQuery(api.admin.getAnalytics, queryArgs);
  const revenue = useQuery(api.admin.getRevenueReport, queryArgs);
  const financial = useQuery(api.admin.getFinancialReport, queryArgs);
  const health = useQuery(api.admin.getSystemHealth, { refreshKey });
  
  const { results: auditLogs, status: auditStatus, loadMore: loadMoreLogs } = usePaginatedQuery(
    api.admin.getAuditLogs, 
    canViewLogs ? { 
      refreshKey,
      dateFrom: dateRange.startDate || undefined,
      dateTo: dateRange.endDate || undefined
    } : "skip",
    { initialNumItems: 10 }
  );

  useEffect(() => {
    let interval: any;
    if (autoRefreshEnabled) {
      interval = setInterval(() => {
        setRefreshKey(Date.now().toString());
        setLastUpdated(new Date());
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefreshEnabled]);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Date Range Picker */}
      <GlassDateRangePicker 
        value={dateRange} 
        onChange={setDateRange} 
        onClear={() => setDateRange({ startDate: null, endDate: null })}
      />

      {/* Auto-Refresh Toggle */}
      <GlassCard style={[styles.section, styles.refreshCard]}>
        <View style={styles.refreshHeader}>
          <View>
            <Text style={styles.sectionTitle}>Dashboard Status</Text>
            <Text style={styles.lastUpdatedText}>
              {analytics?.computedAt
                ? `Metrics as of: ${new Date(analytics.computedAt).toLocaleString()}${analytics.isPrecomputed ? ' (cached)' : ' (live)'}`
                : `Last refreshed: ${lastUpdated.toLocaleTimeString()}`
              }
            </Text>
          </View>
          <View style={styles.refreshToggle}>
            <Text style={styles.toggleLabel}>Auto-refresh</Text>
            <Switch
              value={autoRefreshEnabled}
              onValueChange={setAutoRefreshEnabled}
              trackColor={{ false: colors.glass.border, true: `${colors.accent.primary}60` }}
              thumbColor={autoRefreshEnabled ? colors.accent.primary : colors.text.tertiary}
            />
          </View>
        </View>
      </GlassCard>

      {/* System Health */}
      {health && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={styles.section}>
            <View style={styles.healthHeader}>
              <View style={[styles.healthDot, { backgroundColor: health.status === "healthy" ? colors.semantic.success : colors.semantic.warning }]} />
              <Text style={styles.sectionTitle}>System: {health.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.metricText}>
              Receipt success rate: {health.receiptProcessing?.successRate ?? 0}%
            </Text>
            <Text style={styles.metricText}>
              Failed: {health.receiptProcessing?.failed ?? 0} | Processing: {health.receiptProcessing?.processing ?? 0}
            </Text>
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Analytics */}
      {analytics && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="chart-box" size={24} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Analytics</Text>
            </View>
            <View style={styles.metricsGrid}>
              <MetricCard label="Total Users" value={analytics.totalUsers ?? 0} icon="account-group" />
              <MetricCard label="New (Week)" value={analytics.newUsersThisWeek ?? 0} icon="account-plus" />
              <MetricCard label="Active (Week)" value={analytics.activeUsersThisWeek ?? 0} icon="account-check" />
              <MetricCard label="Total Lists" value={analytics.totalLists ?? 0} icon="clipboard-list" />
              <MetricCard label="Completed" value={analytics.completedLists ?? 0} icon="check-circle" />
              <MetricCard label="Receipts" value={analytics.totalReceipts ?? 0} icon="receipt" />
            </View>
            <View style={styles.gmvRow}>
              <Text style={styles.gmvLabel}>Total GMV</Text>
              <Text style={styles.gmvValue}>£{(analytics.totalGMV ?? 0).toLocaleString()}</Text>
            </View>
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Revenue */}
      {revenue && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={200}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="cash-multiple" size={24} color={colors.semantic.success} />
              <Text style={styles.sectionTitle}>Revenue</Text>
            </View>
            <View style={styles.revenueGrid}>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueValue}>£{(revenue.mrr ?? 0).toFixed(2)}</Text>
                <Text style={styles.revenueLabel}>MRR</Text>
              </View>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueValue}>£{(revenue.arr ?? 0).toFixed(2)}</Text>
                <Text style={styles.revenueLabel}>ARR</Text>
              </View>
            </View>
            <Text style={styles.metricText}>
              {revenue.monthlySubscribers ?? 0} monthly • {revenue.annualSubscribers ?? 0} annual • {revenue.trialsActive ?? 0} trials
            </Text>
            {financial && (
              <View style={[styles.revenueGrid, { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.glass.border, paddingTop: spacing.md }]}>
                <View style={styles.revenueItem}>
                  <Text style={[styles.revenueValue, { color: colors.accent.primary }]}>£{financial.netRevenue.toFixed(2)}</Text>
                  <Text style={styles.revenueLabel}>Est. Net (MRR)</Text>
                </View>
                <View style={styles.revenueItem}>
                  <Text style={[styles.revenueValue, { color: colors.text.secondary }]}>{financial.margin.toFixed(0)}%</Text>
                  <Text style={styles.revenueLabel}>Margin</Text>
                </View>
              </View>
            )}
            {financial && (
              <Text style={[styles.metricText, { fontSize: 10 }]}>
                Estimated tax (VAT 20%): £{financial.estimatedTax.toFixed(2)} • COGS: £{financial.estimatedCOGS.toFixed(2)}
              </Text>
            )}
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Audit Logs */}
      {canViewLogs && Array.isArray(auditLogs) && auditLogs.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={300}>
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
            {auditStatus === "CanLoadMore" && (
              <GlassButton 
                onPress={() => loadMoreLogs(20)} 
                variant="ghost" 
                size="sm" 
                style={{ marginTop: spacing.sm }}
              >Load More Logs</GlassButton>
            )}
            {auditStatus === "LoadingMore" && (
              <ActivityIndicator color={colors.accent.primary} style={{ marginTop: spacing.sm }} />
            )}
          </GlassCard>
        </AnimatedSection>
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}

// ============================================================================
// ACTIVITY TIMELINE
// ============================================================================

function ActivityTimeline({ userId }: { userId: string }) {
  const events = useQuery(api.admin.getUserTimeline, { userId: userId as any, limit: 20 });

  if (!events) return <ActivityIndicator color={colors.accent.primary} />;
  if (events.length === 0) return <Text style={styles.emptyText}>No recent activity found.</Text>;

  const getEventIcon = (type: string) => {
    switch (type) {
      case "login": return "login";
      case "signup": return "account-plus";
      case "onboarding_complete": return "check-decagram";
      case "first_list": return "clipboard-list";
      case "first_receipt": return "receipt";
      case "first_scan": return "barcode-scan";
      case "subscribed": return "crown";
      case "support_ticket_created": return "help-circle";
      default: return "circle-outline";
    }
  };

  return (
    <View style={styles.timelineContainer}>
      {events.map((e: any, idx: number) => (
        <View key={e._id} style={styles.timelineRow}>
          <View style={styles.timelineLineContainer}>
            <View style={styles.timelineIcon}>
              <MaterialCommunityIcons name={getEventIcon(e.eventType) as any} size={14} color={colors.accent.primary} />
            </View>
            {idx < events.length - 1 && <View style={styles.timelineLine} />}
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineType}>{e.eventType.replace(/_/g, " ").toUpperCase()}</Text>
            <Text style={styles.timelineTime}>{new Date(e.timestamp).toLocaleString()}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// USERS TAB
// ============================================================================

function UsersTab({ 
  hasPermission,
  handleExportCSV
}: { 
  hasPermission: (p: string) => boolean;
  handleExportCSV: (type: "users" | "receipts" | "prices" | "analytics") => Promise<void>;
}) {
  const { alert: showAlert } = useGlassAlert();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [detailTab, setDetailTab] = useState<"info" | "activity">("info");
  const [newTag, setNewTag] = useState("");

  const canEdit = hasPermission("edit_users");
  const canBulk = hasPermission("bulk_operation");

  const { results: users, status, loadMore } = usePaginatedQuery(
    api.admin.getUsers,
    {},
    { initialNumItems: 50 }
  );

  const searchResults = useQuery(
    api.admin.searchUsers,
    search.length >= 2 ? { searchTerm: search } : "skip"
  );
  const userDetail = useQuery(
    api.admin.getUserDetail,
    selectedUser ? { userId: selectedUser as any } : "skip"
  );
  const userTags = useQuery(api.admin.getUserTags, selectedUser ? { userId: selectedUser as any } : "skip");

  const toggleAdmin = useMutation(api.admin.toggleAdmin);
  const extendTrial = useMutation(api.admin.extendTrial);
  const bulkExtendTrial = useMutation(api.admin.bulkExtendTrial);
  const grantAccess = useMutation(api.admin.grantComplimentaryAccess);
  const toggleSuspension = useMutation(api.admin.toggleSuspension);
  const generateToken = useMutation(api.impersonation.generateImpersonationToken);
  const addTag = useMutation(api.tags.addUserTag);
  const removeTag = useMutation(api.tags.removeUserTag);

  const displayUsers = search.length >= 2 ? searchResults : users;

  const toggleUserSelection = (userId: string) => {
    const next = new Set(selectedUsers);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedUsers(next);
    Haptics.selectionAsync();
  };

  const handleBulkExtend = async () => {
    if (selectedUsers.size === 0) return;
    showAlert("Bulk Extend", `Add 14 days to trial for ${selectedUsers.size} users?`, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Extend", 
        onPress: async () => {
          try {
            await bulkExtendTrial({ userIds: Array.from(selectedUsers) as any, days: 14 });
            setSelectedUsers(new Set());
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e: any) { showAlert("Error", e.message); }
        }
      }
    ]);
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const result = await generateToken({ userId: userId as any });
      showAlert("Impersonation Mode", `Token: ${result.tokenValue}\n\nUse this link:\noja://impersonate?token=${result.tokenValue}`);
      // In a real app, this might open a browser or deep link to the app
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleAddTag = async () => {
    if (!selectedUser || !newTag.trim()) return;
    try {
      await addTag({ userId: selectedUser as any, tag: newTag.trim() });
      setNewTag("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleToggleAdmin = async (userId: string) => {
    try {
      await toggleAdmin({ userId: userId as any });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to toggle admin status");
    }
  };

  const handleExtendTrial = async (userId: string) => {
    showAlert("Extend Trial", "Add 14 days to trial?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Extend",
        onPress: async () => {
          try {
            await extendTrial({ userId: userId as any, days: 14 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            showAlert("Error", error.message || "Failed to extend trial");
          }
        },
      },
    ]);
  };

  const handleGrantAccess = async (userId: string) => {
    showAlert("Grant Premium", "Give free premium annual access?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Grant",
        onPress: async () => {
          try {
            await grantAccess({ userId: userId as any, months: 12 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            showAlert("Error", error.message || "Failed to grant access");
          }
        },
      },
    ]);
  };

  const handleToggleSuspension = async (userId: string) => {
    try {
      await toggleSuspension({ userId: userId as any });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to toggle suspension");
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Search */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
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
      </AnimatedSection>

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && canBulk && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={[styles.section, { backgroundColor: `${colors.accent.primary}10` }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.userName}>{selectedUsers.size} users selected</Text>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <GlassButton onPress={handleBulkExtend} variant="secondary" size="sm">
                  +14d Trial
                </GlassButton>
                <GlassButton onPress={() => handleExportCSV("users")} variant="ghost" size="sm">
                  CSV
                </GlassButton>
                <Pressable onPress={() => setSelectedUsers(new Set())} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.text.tertiary} />
                </Pressable>
              </View>
            </View>
          </GlassCard>
        </AnimatedSection>
      )}

      {/* User Detail Modal */}
      {selectedUser && userDetail && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={styles.section}>
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.sectionTitle}>{userDetail.name}</Text>
                <Text style={styles.userEmail}>{userDetail.email || "No email"}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <Pressable onPress={() => handleImpersonate(selectedUser)} hitSlop={8}>
                  <MaterialCommunityIcons name="incognito" size={24} color={colors.accent.primary} />
                </Pressable>
                <Pressable onPress={() => setSelectedUser(null)}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.text.tertiary} />
                </Pressable>
              </View>
            </View>

            {/* Tags */}
            <View style={[styles.filterRow, { marginVertical: spacing.sm }]}>
              {userTags?.map((tag: string) => (
                <View key={tag} style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>{tag}</Text>
                  <Pressable onPress={() => removeTag({ userId: selectedUser as any, tag })}>
                    <MaterialCommunityIcons name="close-circle" size={14} color={colors.text.tertiary} />
                  </Pressable>
                </View>
              ))}
              <View style={styles.addTagRow}>
                <TextInput
                  style={styles.tagInput}
                  placeholder="+Tag"
                  placeholderTextColor={colors.text.tertiary}
                  value={newTag}
                  onChangeText={setNewTag}
                  onSubmitEditing={handleAddTag}
                />
              </View>
            </View>

            {/* Tabs */}
            <View style={[styles.filterRow, { marginBottom: spacing.md }]}>
              <Pressable 
                style={[styles.filterChip, detailTab === "info" && styles.filterChipActive]}
                onPress={() => setDetailTab("info")}
              >
                <Text style={[styles.filterChipText, detailTab === "info" && styles.filterChipTextActive]}>Info</Text>
              </Pressable>
              <Pressable 
                style={[styles.filterChip, detailTab === "activity" && styles.filterChipActive]}
                onPress={() => setDetailTab("activity")}
              >
                <Text style={[styles.filterChipText, detailTab === "activity" && styles.filterChipTextActive]}>Activity</Text>
              </Pressable>
            </View>

            {detailTab === "info" ? (
              <>
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailValue}>{userDetail.receiptCount ?? 0}</Text>
                    <Text style={styles.detailLabel}>Receipts</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailValue}>{userDetail.listCount ?? 0}</Text>
                    <Text style={styles.detailLabel}>Lists</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailValue}>£{userDetail.totalSpent ?? 0}</Text>
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
                {canEdit && (
                  <View style={styles.actionRow}>
                    <Pressable style={styles.actionBtn} onPress={() => handleExtendTrial(selectedUser)}>
                      <MaterialCommunityIcons name="clock-plus-outline" size={16} color={colors.accent.primary} />
                      <Text style={styles.actionBtnText}>+14d Trial</Text>
                    </Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => handleGrantAccess(selectedUser)}>
                      <MaterialCommunityIcons name="crown" size={16} color={colors.semantic.warning} />
                      <Text style={styles.actionBtnText}>Free Premium</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, styles.suspendBtn]}
                      onPress={() => handleToggleSuspension(selectedUser)}
                    >
                      <MaterialCommunityIcons
                        name={userDetail.suspended ? "account-check-outline" : "account-off-outline"}
                        size={16}
                        color={colors.semantic.danger}
                      />
                      <Text style={[styles.actionBtnText, { color: colors.semantic.danger }]}>
                        {userDetail.suspended ? "Unsuspend" : "Suspend"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : (
              <ActivityTimeline userId={selectedUser} />
            )}
          </GlassCard>
        </AnimatedSection>
      )}

      {/* User List */}
      {Array.isArray(displayUsers) && displayUsers.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>
              {search.length >= 2 ? `Results (${displayUsers.length})` : `Users (${displayUsers.length})`}
            </Text>
            {displayUsers.map((u: any) => (
              <Pressable
                key={u._id}
                style={[styles.userRow, selectedUsers.has(u._id) && { backgroundColor: `${colors.accent.primary}05` }]}
                onPress={() => setSelectedUser(u._id)}
              >
                {canBulk && (
                  <Pressable 
                    onPress={() => toggleUserSelection(u._id)}
                    style={{ marginRight: spacing.sm }}
                  >
                    <MaterialCommunityIcons 
                      name={selectedUsers.has(u._id) ? "checkbox-marked" : "checkbox-blank-outline"} 
                      size={20} 
                      color={selectedUsers.has(u._id) ? colors.accent.primary : colors.text.tertiary} 
                    />
                  </Pressable>
                )}
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
                  {canEdit && (
                    <Pressable onPress={() => handleToggleAdmin(u._id)} hitSlop={8}>
                      <MaterialCommunityIcons
                        name={u.isAdmin ? "shield-check" : "shield-outline"}
                        size={20}
                        color={u.isAdmin ? colors.accent.primary : colors.text.tertiary}
                      />
                    </Pressable>
                  )}
                </View>
              </Pressable>
            ))}
            {status === "CanLoadMore" && (
              <GlassButton
                onPress={() => loadMore(50)}
                variant="ghost"
                size="sm"
                style={{ marginTop: spacing.md }}
              >Load More Users</GlassButton>
            )}
          </GlassCard>
        </AnimatedSection>
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}

// ============================================================================
// ANALYTICS TAB
// ============================================================================

function AnalyticsTab({ 
  hasPermission,
  handleExportCSV
}: { 
  hasPermission: (p: string) => boolean;
  handleExportCSV: (type: "users" | "receipts" | "prices" | "analytics") => Promise<void>;
}) {
  const cohortMetrics = useQuery(api.admin.getCohortMetrics);
  const funnelAnalytics = useQuery(api.admin.getFunnelAnalytics);
  const churnMetrics = useQuery(api.admin.getChurnMetrics);
  const ltvMetrics = useQuery(api.admin.getLTVMetrics);
  const segmentSummary = useQuery(api.admin.getUserSegmentSummary);
  
  const { alert: showAlert } = useGlassAlert();

  const loading = !cohortMetrics || !funnelAnalytics || !churnMetrics || !ltvMetrics || !segmentSummary;

  if (loading) {
    return (
      <View style={styles.loading}>
        <SkeletonCard />
        <SkeletonCard style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Funnel Analytics */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="filter-variant" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Conversion Funnel</Text>
          </View>
          <View style={styles.funnelContainer}>
            {funnelAnalytics.map((step: any, idx: number) => (
              <View key={step.step} style={styles.funnelStep}>
                <View style={styles.funnelBarContainer}>
                  <View 
                    style={[
                      styles.funnelBar, 
                      { width: `${step.percentage}%`, backgroundColor: `rgba(0, 212, 170, ${0.4 + (1 - idx/funnelAnalytics.length) * 0.6})` }
                    ]} 
                  />
                  <Text style={styles.funnelCount}>{step.count}</Text>
                </View>
                <View style={styles.funnelLabelRow}>
                  <Text style={styles.funnelLabel}>{step.step.replace(/_/g, " ").toUpperCase()}</Text>
                  <Text style={styles.funnelPercentage}>{step.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            ))}
          </View>
          <GlassButton 
            onPress={() => handleExportCSV("analytics")} 
            variant="ghost" 
            size="sm" 
            icon="download"
            style={{ marginTop: spacing.md }}
          >Export Funnel Data</GlassButton>
        </GlassCard>
      </AnimatedSection>

      {/* User Segments */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-group" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>User Segments</Text>
          </View>
          <View style={styles.segmentGrid}>
            {segmentSummary.map((seg: any) => (
              <View key={seg.name} style={styles.segmentCard}>
                <Text style={styles.segmentValue}>{seg.count}</Text>
                <Text style={styles.segmentName}>{seg.name.replace(/_/g, " ")}</Text>
                <Text style={styles.segmentPercent}>{seg.percentage.toFixed(1)}%</Text>
              </View>
            ))}
          </View>
          <GlassButton 
            onPress={() => handleExportCSV("analytics")} 
            variant="ghost" 
            size="sm" 
            icon="download"
            style={{ marginTop: spacing.md }}
          >Export Segment Data</GlassButton>
        </GlassCard>
      </AnimatedSection>

      {/* Cohort Retention */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={200}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="calendar-clock" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Cohort Retention (%)</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.retentionTable}>
              <View style={styles.retentionHeader}>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell, { width: 80 }]}>Cohort</Text>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell]}>Users</Text>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell]}>D7</Text>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell]}>D14</Text>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell]}>D30</Text>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell]}>D60</Text>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell]}>D90</Text>
              </View>
              {cohortMetrics.map((row: any) => (
                <View key={row.cohortMonth} style={styles.retentionRow}>
                  <Text style={[styles.retentionCell, { width: 80, fontWeight: "600" }]}>{row.cohortMonth}</Text>
                  <Text style={styles.retentionCell}>{row.totalUsers}</Text>
                  <RetentionCell value={row.retentionDay7} />
                  <RetentionCell value={row.retentionDay14} />
                  <RetentionCell value={row.retentionDay30} />
                  <RetentionCell value={row.retentionDay60} />
                  <RetentionCell value={row.retentionDay90} />
                </View>
              ))}
            </View>
          </ScrollView>
          <GlassButton 
            onPress={() => handleExportCSV("analytics")} 
            variant="ghost" 
            size="sm" 
            icon="download"
            style={{ marginTop: spacing.md }}
          >Export Retention Table</GlassButton>
        </GlassCard>
      </AnimatedSection>

      {/* LTV Metrics */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={300}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="trending-up" size={24} color={colors.semantic.success} />
            <Text style={styles.sectionTitle}>Lifetime Value (LTV)</Text>
          </View>
          {ltvMetrics.map((ltv: any) => (
            <View key={ltv.cohortMonth} style={styles.ltvRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{ltv.cohortMonth} Cohort</Text>
                <Text style={styles.userEmail}>
                  {ltv.paidUsers} paid ({ltv.conversionRate.toFixed(1)}% conv.)
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.ltvValue}>£{ltv.avgLTV.toFixed(2)}</Text>
                <Text style={styles.ltvLabel}>Avg LTV</Text>
              </View>
            </View>
          ))}
          <View style={styles.gmvRow}>
            <Text style={styles.gmvLabel}>Total Cohort Revenue</Text>
            <Text style={styles.gmvValue}>£{ltvMetrics.reduce((s: number, l: any) => s + l.totalRevenue, 0).toLocaleString()}</Text>
          </View>
          <GlassButton 
            onPress={() => handleExportCSV("analytics")} 
            variant="ghost" 
            size="sm" 
            icon="download"
            style={{ marginTop: spacing.md }}
          >Export LTV Data</GlassButton>
        </GlassCard>
      </AnimatedSection>

      {/* Churn Analytics */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={400}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-minus" size={24} color={colors.semantic.danger} />
            <Text style={styles.sectionTitle}>Churn Analytics</Text>
          </View>
          {churnMetrics.map((m: any) => (
            <View key={m.month} style={styles.churnRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{m.month}</Text>
                <Text style={styles.userEmail}>
                  {m.churnedUsers} churned • {m.atRiskCount} at risk
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.ltvValue, { color: colors.semantic.danger }]}>{m.churnRate.toFixed(1)}%</Text>
                <Text style={styles.ltvLabel}>Churn Rate</Text>
              </View>
            </View>
          ))}
          <GlassButton 
            onPress={() => handleExportCSV("analytics")} 
            variant="ghost" 
            size="sm" 
            icon="download"
            style={{ marginTop: spacing.md }}
          >Export Churn Data</GlassButton>
        </GlassCard>
      </AnimatedSection>

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}

function RetentionCell({ value }: { value: number }) {
  // Color scale for retention
  let backgroundColor = "rgba(0, 212, 170, 0.05)";
  let textColor: string = colors.text.tertiary;

  if (value > 40) {
    backgroundColor = `rgba(0, 212, 170, 0.8)`;
    textColor = "#000000";
  } else if (value > 25) {
    backgroundColor = `rgba(0, 212, 170, 0.5)`;
    textColor = "#000000";
  } else if (value > 15) {
    backgroundColor = `rgba(0, 212, 170, 0.3)`;
    textColor = colors.text.primary;
  } else if (value > 5) {
    backgroundColor = `rgba(0, 212, 170, 0.15)`;
    textColor = colors.text.secondary;
  }

  return (
    <View style={[styles.retentionCell, { backgroundColor, borderRadius: 4, margin: 2 }]}>
      <Text style={[styles.retentionCellText, { color: textColor as any }]}>
        {value > 0 ? `${value.toFixed(0)}%` : "-"}
      </Text>
    </View>
  );
}

// ============================================================================
// SUPPORT TAB
// ============================================================================

function SupportTab({ hasPermission }: { hasPermission: (p: string) => boolean }) {
  const [statusFilter, setStatusFilter] = useState<string | null>("open");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const summary = useQuery(api.admin.getAdminSupportSummary);
  const tickets = useQuery(api.admin.getAdminTickets, { status: statusFilter || undefined });
  const ticketDetail = useQuery(api.support.getTicketDetail, selectedTicketId ? { ticketId: selectedTicketId as any } : "skip");
  
  const assignTicket = useMutation(api.support.assignTicket);
  const addMessage = useMutation(api.support.addTicketMessage);
  const updateStatus = useMutation(api.support.updateTicketStatus);

  const { alert: showAlert } = useGlassAlert();

  const handleAssign = async (ticketId: string) => {
    try {
      await assignTicket({ ticketId: ticketId as any });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicketId || !replyText.trim()) return;
    try {
      await addMessage({ ticketId: selectedTicketId as any, message: replyText.trim() });
      setReplyText("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      await updateStatus({ ticketId: ticketId as any, status: "closed" });
      setSelectedTicketId(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      showAlert("Error", e.message);
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

        {tickets?.map((t: any) => (
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
                {ticketDetail?.messages.map((m: any) => (
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
                <GlassButton onPress={() => ticketDetail && updateStatus({ ticketId: ticketDetail._id, status: "resolved" })} size="sm" style={{ flex: 1 }}>
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

// ============================================================================
// MONITORING & OPS TAB
// ============================================================================

function MonitoringTab({ hasPermission }: { hasPermission: (p: string) => boolean }) {
  const summary = useQuery(api.admin.getMonitoringSummary);
  const experiments = useQuery(api.admin.getExperiments);
  const workflows = useQuery(api.admin.getWorkflows);
  
  const resolveAlert = useMutation(api.admin.resolveAlert);
  const { alert: showAlert } = useGlassAlert();

  const handleResolveAlert = async (id: string) => {
    try {
      await resolveAlert({ alertId: id as any });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) { showAlert("Error", e.message); }
  };

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
          {summary.alerts.map((a: any) => (
            <View key={a._id} style={styles.alertRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: a.severity === "critical" ? colors.semantic.danger : colors.semantic.warning }]}>
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
          {summary.recentSLA.map((s: any) => (
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
          {experiments?.map((e: any) => (
            <View key={e._id} style={styles.experimentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{e.name}</Text>
                <Text style={styles.userEmail}>{e.status} • Goal: {e.goalEvent}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.tertiary} />
            </View>
          ))}
          <GlassButton onPress={() => showAlert("Experiment", "New experiment form...")} variant="secondary" size="sm" style={{ marginTop: spacing.md }}>
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
          {workflows?.map((w: any) => (
            <View key={w._id} style={styles.workflowRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{w.name}</Text>
                <Text style={styles.userEmail}>Trigger: {w.trigger} • {w.actions.length} actions</Text>
              </View>
              <Switch value={w.isEnabled} onValueChange={() => {}} />
            </View>
          ))}
        </GlassCard>
      </AnimatedSection>

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}

// ============================================================================
// RECEIPTS TAB
// ============================================================================

function ReceiptsTab({ hasPermission }: { hasPermission: (p: string) => boolean }) {
  const { alert: showAlert } = useGlassAlert();
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const canDelete = hasPermission("delete_receipts");

  const recentReceipts = useQuery(api.admin.getRecentReceipts, { 
    limit: 50,
    dateFrom: dateRange.startDate || undefined,
    dateTo: dateRange.endDate || undefined,
    searchTerm: search.length >= 2 ? search : undefined,
    status: statusFilter || undefined,
  });
  const flaggedReceipts = useQuery(api.admin.getFlaggedReceipts, {});
  const priceAnomaliesData = useQuery(api.admin.getPriceAnomalies, {});
  const priceAnomalies = priceAnomaliesData?.anomalies || [];

  const deleteReceipt = useMutation(api.admin.deleteReceipt);
  const bulkAction = useMutation(api.admin.bulkReceiptAction);
  const overridePrice = useMutation(api.admin.overridePrice);

  const statusOptions = [
    { label: "All", value: null },
    { label: "Pending", value: "pending" },
    { label: "Processing", value: "processing" },
    { label: "Completed", value: "completed" },
    { label: "Failed", value: "failed" },
  ];

  const handleDeleteReceipt = async (receiptId: string) => {
    showAlert("Delete Receipt", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReceipt({ receiptId: receiptId as any });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            showAlert("Error", error.message || "Failed to delete receipt");
          }
        },
      },
    ]);
  };

  const handleBulkApprove = async () => {
    if (!flaggedReceipts || flaggedReceipts.length === 0) return;
    
    showAlert(
      "Bulk Approve", 
      `Are you sure you want to approve all ${flaggedReceipts.length} flagged receipts?`, 
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve All",
          onPress: async () => {
            const ids = flaggedReceipts.map((r: any) => r._id);
            try {
              await bulkAction({ receiptIds: ids, action: "approve" });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error: any) {
              showAlert("Error", error.message || "Failed to approve receipts");
            }
          }
        }
      ]
    );
  };

  const handleDeletePrice = async (priceId: string) => {
    try {
      await overridePrice({ priceId: priceId as any, deleteEntry: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to delete price");
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedImage(null)}>
          <View style={styles.imageModalContent}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle}>Receipt Image</Text>
              <Pressable onPress={() => setSelectedImage(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>
            {selectedImage && <ReceiptImage storageId={selectedImage} />}
          </View>
        </Pressable>
      </Modal>

      {/* Search & Filters */}
      <GlassCard style={styles.section}>
        <View style={styles.searchRow}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search store, user..."
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>
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
      </GlassCard>

      {/* Date Range Picker */}
      <GlassDateRangePicker 
        value={dateRange} 
        onChange={setDateRange} 
        onClear={() => setDateRange({ startDate: null, endDate: null })}
        title="Filter Receipts"
      />

      {/* Flagged Receipts */}
      {Array.isArray(flaggedReceipts) && flaggedReceipts.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
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
                <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
                  {r.imageStorageId && (
                    <Pressable onPress={() => setSelectedImage(r.imageStorageId)} hitSlop={8}>
                      <MaterialCommunityIcons name="eye-outline" size={20} color={colors.accent.primary} />
                    </Pressable>
                  )}
                  {canDelete && (
                    <Pressable onPress={() => handleDeleteReceipt(r._id)} hitSlop={8}>
                      <MaterialCommunityIcons name="delete-outline" size={20} color={colors.semantic.danger} />
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
            <GlassButton
              onPress={handleBulkApprove}
              variant="secondary"
              size="sm"
              style={{ marginTop: spacing.sm }}
            >{`Approve All (${flaggedReceipts.length})`}</GlassButton>
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Price Anomalies */}
      {Array.isArray(priceAnomalies) && priceAnomalies.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
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
                    £{(a.unitPrice ?? 0).toFixed(2)} at {a.storeName} (avg: £{a.averagePrice ?? 0}, {a.deviation ?? 0}% off)
                  </Text>
                </View>
                {canDelete && (
                  <Pressable onPress={() => handleDeletePrice(a._id)} hitSlop={8}>
                    <MaterialCommunityIcons name="close-circle" size={20} color={colors.semantic.danger} />
                  </Pressable>
                )}
              </View>
            ))}
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Recent Receipts */}
      {Array.isArray(recentReceipts) && recentReceipts.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={200}>
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Receipts</Text>
            {recentReceipts.map((r: any) => (
              <View key={r._id} style={styles.receiptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{r.storeName}</Text>
                  <Text style={styles.userEmail}>
                    £{(r.total ?? 0).toFixed(2)} • {r.userName} • {new Date(r.purchaseDate || Date.now()).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
                  {r.imageStorageId && (
                    <Pressable onPress={() => setSelectedImage(r.imageStorageId)} hitSlop={8}>
                      <MaterialCommunityIcons name="eye-outline" size={20} color={colors.accent.primary} />
                    </Pressable>
                  )}
                  <View style={[styles.statusBadge, r.processingStatus === "completed" ? styles.successBadge : styles.warningBadge]}>
                    <Text style={styles.statusBadgeText}>{r.processingStatus}</Text>
                  </View>
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

// ============================================================================
// CATALOG TAB
// ============================================================================

function CatalogTab({ hasPermission }: { hasPermission: (p: string) => boolean }) {
  const { alert: showAlert } = useGlassAlert();
  const categories = useQuery(api.admin.getCategories, {});
  const duplicateStores = useQuery(api.admin.getDuplicateStores, {});
  const mergeStores = useMutation(api.admin.mergeStoreNames);

  const canMerge = hasPermission("manage_catalog");

  const handleMerge = async (variants: string[], suggested: string) => {
    showAlert("Merge Stores", `Merge all variants to "${suggested}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Merge",
        onPress: async () => {
          try {
            await mergeStores({ fromNames: variants, toName: suggested });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            showAlert("Error", error.message || "Failed to merge stores");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Duplicate Stores */}
      {Array.isArray(duplicateStores) && duplicateStores.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="store-alert" size={24} color={colors.semantic.warning} />
              <Text style={styles.sectionTitle}>Duplicate Stores ({duplicateStores.length})</Text>
            </View>
            {duplicateStores.map((d: any, i: number) => (
              <View key={i} style={styles.storeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{(d.variants || []).join(" / ")}</Text>
                  <Text style={styles.userEmail}>Suggested: {d.suggested}</Text>
                </View>
                {canMerge && (
                  <Pressable
                    style={styles.mergeBtn}
                    onPress={() => handleMerge(d.variants, d.suggested)}
                  >
                    <Text style={styles.mergeBtnText}>Merge</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Categories */}
      {Array.isArray(categories) && categories.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Categories ({categories.length})</Text>
            <View style={styles.categoryGrid}>
              {categories.map((c: any) => (
                <View key={c.category} style={styles.categoryChip}>
                  <Text style={styles.categoryName}>{c.category}</Text>
                  <Text style={styles.categoryCount}>{c.count}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </AnimatedSection>
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}

// ============================================================================
// SETTINGS TAB (Feature Flags + Announcements)
// ============================================================================

function SettingsTab({ hasPermission }: { hasPermission: (p: string) => boolean }) {
  const { alert: showAlert } = useGlassAlert();
  
  const canManageFlags = hasPermission("manage_flags");
  const canManageAnnouncements = hasPermission("manage_announcements");
  const canManagePricing = hasPermission("manage_pricing");

  const featureFlags = useQuery(api.admin.getFeatureFlags);
  const announcements = useQuery(api.admin.getAnnouncements);
  const pricingConfig = useQuery(api.admin.getPricingConfig);
  const activeSessions = useQuery(api.admin.getActiveSessions);

  const toggleFlag = useMutation(api.admin.toggleFeatureFlag);
  const createAnnouncement = useMutation(api.admin.createAnnouncement);
  const updateAnnouncement = useMutation(api.admin.updateAnnouncement);
  const toggleAnnouncement = useMutation(api.admin.toggleAnnouncement);
  const updatePricing = useMutation(api.admin.updatePricing);
  const forceLogout = useMutation(api.admin.forceLogoutSession);

  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annType, setAnnType] = useState<"info" | "warning" | "promo">("info");

  const [newFlagKey, setNewFlagKey] = useState("");

  const handleUpdatePrice = async (planId: string, amount: string) => {
    const price = parseFloat(amount);
    if (isNaN(price)) return;
    try {
      await updatePricing({ planId, priceAmount: price });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to update price");
    }
  };

  const handleToggleFlag = async (key: string, currentValue: boolean) => {
    try {
      await toggleFlag({ key, value: !currentValue });
      Haptics.selectionAsync();
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to toggle flag");
    }
  };

  const handleAddFlag = async () => {
    if (!newFlagKey.trim()) return;
    try {
      await toggleFlag({ key: newFlagKey.trim(), value: true });
      setNewFlagKey("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to add flag");
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) return;
    try {
      if (editingAnnouncement) {
        await updateAnnouncement({
          announcementId: editingAnnouncement._id,
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
    } catch (error: any) {
      showAlert("Error", error.message || `Failed to ${editingAnnouncement ? "update" : "create"} announcement`);
    }
  };

  const startEdit = (ann: any) => {
    setEditingAnnouncement(ann);
    setAnnTitle(ann.title);
    setAnnBody(ann.body);
    setAnnType(ann.type);
    setShowNewAnnouncement(true);
    Haptics.selectionAsync();
  };

  const handleToggleAnnouncement = async (id: string) => {
    try {
      await toggleAnnouncement({ announcementId: id as any });
      Haptics.selectionAsync();
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to toggle announcement");
    }
  };

  const handleForceLogout = async (sessionId: string) => {
    showAlert("Force Logout", "Force this admin session to expire?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await forceLogout({ sessionId: sessionId as any });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            showAlert("Error", error.message || "Failed to force logout");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Active Sessions */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="security" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Active Admin Sessions</Text>
          </View>
          {Array.isArray(activeSessions) && activeSessions.map((s: any) => (
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

      {/* Platform Pricing */}
      {canManagePricing && Array.isArray(pricingConfig) && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="currency-gbp" size={24} color={colors.semantic.success} />
              <Text style={styles.sectionTitle}>Platform Pricing</Text>
            </View>
            {pricingConfig.map((p: any) => (
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
            {featureFlags.map((f: any) => (
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

            {Array.isArray(announcements) && announcements.map((a: any) => (
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

function ReceiptImage({ storageId }: { storageId: string }) {
  const url = useStorageUrl(storageId);
  if (!url) return <ActivityIndicator color={colors.accent.primary} style={{ margin: 40 }} />;
  return (
    <View style={styles.imageContainer}>
      <Animated.Image
        source={{ uri: url }}
        style={styles.receiptImage}
        resizeMode="contain"
        entering={FadeInDown}
      />
    </View>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function MetricCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  const safeValue = typeof value === "number" ? value : 0;
  return (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons name={icon as any} size={20} color={colors.accent.primary} />
      <Text style={styles.metricValue}>{safeValue.toLocaleString()}</Text>
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

  // Collapsible Tool Switcher
  switcherWrapper: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    zIndex: 10,
  },
  activeToolPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.accent.primary}10`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}30`,
  },
  activeToolPillExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: `${colors.accent.primary}20`,
  },
  activeToolInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  activeToolLabel: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontSize: 16,
  },
  menuExpandedGrid: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: -1, // overlap border
    padding: spacing.md,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  gridItem: {
    width: "47%",
    alignItems: "center",
    paddingVertical: spacing.md,
    backgroundColor: `${colors.glass.border}20`,
    borderRadius: 12,
    gap: 8,
  },
  gridItemActive: {
    backgroundColor: colors.accent.primary,
  },
  gridIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.text.secondary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  gridIconCircleActive: {
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  gridLabel: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  gridLabelActive: {
    color: "#000",
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

  // Funnel
  funnelContainer: { gap: spacing.md },
  funnelStep: { gap: 4 },
  funnelBarContainer: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  funnelBar: { height: 16, borderRadius: 8 },
  funnelCount: { ...typography.labelSmall, color: colors.text.primary, fontWeight: "700" },
  funnelLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  funnelLabel: { ...typography.labelSmall, color: colors.text.tertiary, fontSize: 8 },
  funnelPercentage: { ...typography.labelSmall, color: colors.accent.primary, fontSize: 8 },

  // Segments
  segmentGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  segmentCard: { width: "47%", backgroundColor: colors.glass.background, borderRadius: 12, padding: spacing.md, alignItems: "center", gap: 2 },
  segmentValue: { ...typography.headlineSmall, color: colors.text.primary },
  segmentName: { ...typography.labelSmall, color: colors.text.tertiary, textTransform: "uppercase", fontSize: 9 },
  segmentPercent: { ...typography.labelSmall, color: colors.accent.primary, fontSize: 9 },

  // Retention Table
  retentionTable: { gap: 4, minWidth: 400 },
  retentionHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.glass.border, paddingBottom: 4 },
  retentionRow: { flexDirection: "row" },
  retentionCell: { width: 50, textAlign: "center", color: colors.text.secondary, fontSize: 10, paddingVertical: 4 },
  retentionHeaderCell: { color: colors.text.tertiary, fontWeight: "700" },
  retentionCellText: { fontSize: 9, fontWeight: "600" },

  // LTV & Churn
  ltvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  ltvValue: { ...typography.headlineSmall, color: colors.semantic.success },
  ltvLabel: { ...typography.bodySmall, color: colors.text.tertiary, fontSize: 10 },
  churnRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },

  // Support
  ticketRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  assignBadge: { backgroundColor: `${colors.accent.primary}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  assignBadgeText: { ...typography.labelSmall, color: colors.accent.primary, fontSize: 9 },
  
  // Chat
  chatContainer: { gap: spacing.md, paddingBottom: spacing.xl },
  chatBubble: { maxWidth: "85%", padding: spacing.sm, borderRadius: 12 },
  userBubble: { alignSelf: "flex-start", backgroundColor: colors.glass.background, borderBottomLeftRadius: 2 },
  adminBubble: { alignSelf: "flex-end", backgroundColor: `${colors.accent.primary}15`, borderBottomRightRadius: 2 },
  chatName: { ...typography.labelSmall, color: colors.text.tertiary, marginBottom: 2 },
  chatMessage: { ...typography.bodyMedium, color: colors.text.primary },
  chatTime: { ...typography.labelSmall, color: colors.text.tertiary, alignSelf: "flex-end", fontSize: 8, marginTop: 2 },
  chatInputRow: { flexDirection: "row", padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.glass.border, gap: spacing.sm, alignItems: "flex-end" },
  chatInput: { flex: 1, backgroundColor: colors.glass.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, color: colors.text.primary, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.accent.primary}10`, alignItems: "center", justifyContent: "center" },

  // Timeline
  timelineContainer: { marginTop: spacing.md },
  timelineRow: { flexDirection: "row", gap: spacing.md },
  timelineLineContainer: { width: 24, alignItems: "center" },
  timelineIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: `${colors.accent.primary}15`, alignItems: "center", justifyContent: "center", zIndex: 1 },
  timelineLine: { width: 2, flex: 1, backgroundColor: `${colors.accent.primary}20`, marginVertical: -2 },
  timelineContent: { flex: 1, paddingBottom: spacing.lg },
  timelineType: { ...typography.labelSmall, color: colors.text.primary, fontWeight: "700" },
  timelineTime: { ...typography.labelSmall, color: colors.text.tertiary, fontSize: 9 },

  // Alerts & SLA
  alertRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  slaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  experimentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  workflowRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  errorBadge: { backgroundColor: `${colors.semantic.danger}20` },

  // Tags
  tagBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${colors.accent.primary}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  tagBadgeText: { ...typography.labelSmall, color: colors.accent.primary, fontSize: 10 },
  tagInput: { ...typography.labelSmall, color: colors.text.primary, padding: 0, minWidth: 40 },
  addTagRow: { backgroundColor: colors.glass.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.glass.border },

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
  suspendBtn: { borderColor: `${colors.semantic.danger}40` },
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
  promoBadge: { backgroundColor: `${colors.semantic.success}20` },
  infoBadge: { backgroundColor: `${colors.accent.primary}20` },
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

  // Feature flags & sessions
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
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
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

  // Refresh controls
  refreshCard: { marginBottom: spacing.md, paddingVertical: spacing.sm },
  refreshHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  refreshToggle: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  toggleLabel: { ...typography.bodySmall, color: colors.text.tertiary },
  lastUpdatedText: { ...typography.bodySmall, color: colors.text.tertiary, fontSize: 10 },

  // Pagination
  loadMoreContainer: { alignItems: "center", marginVertical: spacing.md },
  doneText: { ...typography.bodySmall, color: colors.text.tertiary, fontStyle: "italic" },

  // Filters
  filterRow: { flexDirection: "row", marginTop: spacing.md, alignItems: "center" },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  filterChipActive: {
    backgroundColor: `${colors.accent.primary}20`,
    borderColor: colors.accent.primary,
  },
  filterChipText: { ...typography.labelSmall, color: colors.text.tertiary },
  filterChipTextActive: { color: colors.accent.primary, fontWeight: "600" },

  // Image Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  imageModalContent: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    overflow: "hidden",
  },
  imageModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  imageModalTitle: { ...typography.headlineSmall, color: colors.text.primary },
  imageContainer: { width: "100%", height: 500, backgroundColor: "#000" },
  receiptImage: { width: "100%", height: "100%" },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
});
