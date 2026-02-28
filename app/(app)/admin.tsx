import React, { useState, useCallback, useEffect, useMemo, ComponentProps } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassScreen,
  colors,
  spacing,
  useGlassAlert,
} from "@/components/ui/glass";

// Modular Admin Components
import { adminStyles as styles } from "./admin/styles";
import { AdminTab, AnalyticsData, PermissionData } from "./admin/types";
import { OverviewTab } from "./admin/OverviewTab";
import { UsersTab } from "./admin/UsersTab";
import { AnalyticsTab } from "./admin/AnalyticsTab";
import { SupportTab } from "./admin/SupportTab";
import { MonitoringTab } from "./admin/MonitoringTab";
import { ReceiptsTab } from "./admin/ReceiptsTab";
import { CatalogTab } from "./admin/CatalogTab";
import { SettingsTab } from "./admin/SettingsTab";
import { WebhooksTab } from "./admin/WebhooksTab";
import { AdminTabBar } from "./admin/components/AdminTabBar";
import { ToastProvider } from "./admin/components/ToastProvider";
import { GlobalSearchModal } from "./admin/components/GlobalSearchModal";
import { Breadcrumbs } from "./admin/components/Breadcrumbs";

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
        <GlassScreen>
          <View style={styles.accessDenied}>
            <MaterialCommunityIcons name="alert-octagon" size={64} color={colors.semantic.danger} />
            <Text style={styles.accessTitle}>Something went wrong</Text>
            <Text style={styles.accessSubtext}>{this.state.error?.message}</Text>
            <Pressable 
              style={[styles.actionBtn, { marginTop: spacing.lg, paddingHorizontal: 20 }]} 
              onPress={() => this.setState({ hasError: false, error: null })}
            >
              <Text style={styles.actionBtnText}>Try Again</Text>
            </Pressable>
          </View>
        </GlassScreen>
      );
    }
    return this.props.children;
  }
}

function AdminScreenInner() {
  const { tab } = useLocalSearchParams<{ tab: string }>();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchTargetId, setSearchTargetId] = useState<string | null>(null);
  const [selectionLabel, setSelectionLabel] = useState<string | null>(null);
  const { alert: showAlert } = useGlassAlert();

  const tabs: { key: AdminTab; label: string; icon: ComponentProps<typeof MaterialCommunityIcons>["name"]; permission?: string }[] = useMemo(() => [
    { key: "overview", label: "Overview", icon: "view-dashboard" },
    { key: "users", label: "Users", icon: "account-group", permission: "view_users" },
    { key: "analytics", label: "Analytics", icon: "chart-bar", permission: "view_analytics" },
    { key: "receipts", label: "Receipts", icon: "receipt", permission: "view_receipts" },
    { key: "catalog", label: "Catalog", icon: "database", permission: "manage_catalog" },
    { key: "support", label: "Support", icon: "help-circle", permission: "view_support" },
    { key: "monitoring", label: "Monitoring", icon: "pulse", permission: "view_analytics" },
    { key: "webhooks", label: "Webhooks", icon: "webhook", permission: "manage_flags" },
    { key: "settings", label: "Settings", icon: "cog", permission: "manage_flags" },
  ], []);

  useEffect(() => {
    if (tab && ["overview", "users", "analytics", "support", "monitoring", "receipts", "catalog", "settings", "webhooks"].includes(tab)) {
      setActiveTab(tab as AdminTab);
    }
  }, [tab]);

  const analytics = useQuery(api.admin.getAnalytics, {}) as AnalyticsData | undefined | null;
  const myPerms = useQuery(api.admin.getMyPermissions, {}) as PermissionData | undefined | null;
  const logSession = useMutation(api.admin.logAdminSession);
  const exportData = useAction(api.admin.exportDataToCSV);

  const loading = analytics === undefined || myPerms === undefined;

  const handleExportCSV = useCallback(async (type: "users" | "receipts" | "prices" | "analytics") => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const result = await exportData({ dataType: type });
      showAlert("Export Complete", `Generated ${result.fileName}.\n\nPreview (Top 5 rows):\n${result.csv.split('\n').slice(0, 5).join('\n')}`);
    } catch (e) {
      showAlert("Error", (e as Error).message || "Failed to export CSV");
    }
  }, [exportData, showAlert]);

  const hasPermission = useCallback((p: string) => {
    if (!myPerms) return false;
    if (myPerms.role === "super_admin") return true;
    return Array.isArray(myPerms.permissions) && myPerms.permissions.includes(p);
  }, [myPerms]);

  useEffect(() => {
    if (activeTab) {
      logSession({ userAgent: Platform.OS + " " + Platform.Version }).catch(console.error);
      setSelectionLabel(null); // Reset label when tab changes
    }
  }, [activeTab, logSession]);

  // Keyboard Shortcuts (Web/Desktop Support)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      // 1-8 for tabs
      if (e.key >= '1' && e.key <= '8') {
        const index = parseInt(e.key) - 1;
        if (tabs[index]) {
          setActiveTab(tabs[index].key);
          Haptics.selectionAsync();
        }
      }

      // S for search
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSearchVisible(true);
        Haptics.selectionAsync();
      }

      // Esc to close modals
      if (e.key === 'Escape') {
        setSearchVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs]);

  const handleSelectSearchResult = useCallback((tab: AdminTab, id: string) => {
    setActiveTab(tab);
    setSearchTargetId(id);
    // Clear search target after components have had time to react
    setTimeout(() => setSearchTargetId(null), 1000);
  }, []);

  const handleResetSelection = useCallback(() => {
    setSearchTargetId("RESET"); // Signal to tabs to clear selection
    setSelectionLabel(null);
    setTimeout(() => setSearchTargetId(null), 100);
  }, []);

  if (loading) {
    return (
      <GlassScreen>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </GlassScreen>
    );
  }

  if (!myPerms) {
    return (
      <GlassScreen>
        <View style={styles.accessDenied}>
          <MaterialCommunityIcons name="lock-outline" size={64} color={colors.semantic.danger} />
          <Text style={styles.accessTitle}>Access Denied</Text>
          <Text style={styles.accessSubtext}>You do not have administrative privileges.</Text>
        </View>
      </GlassScreen>
    );
  }

  const visibleTabs = tabs.filter(t => !t.permission || hasPermission(t.permission));

  return (
    <GlassScreen>
      <AdminTabBar 
        tabs={visibleTabs} 
        activeTab={activeTab} 
        onTabPress={setActiveTab}
        onSearchPress={() => setSearchVisible(true)}
      />

      <Breadcrumbs 
        activeTab={activeTab} 
        selectionLabel={selectionLabel}
        onResetSelection={handleResetSelection}
      />

      <GlobalSearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onSelectResult={handleSelectSearchResult}
      />

      <View style={{ flex: 1, zIndex: 1 }}>
        {activeTab === "overview" && <OverviewTab hasPermission={hasPermission} />}
        {activeTab === "users" && (
          <UsersTab 
            hasPermission={hasPermission} 
            handleExportCSV={handleExportCSV} 
            initialUserId={searchTargetId && activeTab === "users" ? searchTargetId : undefined}
            onSelectionChange={setSelectionLabel}
          />
        )}
        {activeTab === "analytics" && <AnalyticsTab hasPermission={hasPermission} handleExportCSV={handleExportCSV} />}
        {activeTab === "support" && <SupportTab hasPermission={hasPermission} />}
        {activeTab === "monitoring" && <MonitoringTab hasPermission={hasPermission} />}
        {activeTab === "receipts" && (
          <ReceiptsTab 
            hasPermission={hasPermission} 
            initialReceiptId={searchTargetId && activeTab === "receipts" ? searchTargetId : undefined}
            onSelectionChange={setSelectionLabel}
          />
        )}
        {activeTab === "catalog" && <CatalogTab hasPermission={hasPermission} />}
        {activeTab === "webhooks" && <WebhooksTab hasPermission={hasPermission} />}
        {activeTab === "settings" && <SettingsTab hasPermission={hasPermission} />}
      </View>
    </GlassScreen>
  );
}

// Wrap with Error Boundary for crash protection
export default function AdminScreen() {
  return (
    <AdminErrorBoundary>
      <ToastProvider>
        <AdminScreenInner />
      </ToastProvider>
    </AdminErrorBoundary>
  );
}
