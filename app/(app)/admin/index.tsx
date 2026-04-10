/**
 * Admin tabs screen — /admin (and /admin?tab=xxx).
 *
 * This is the tabs entry point for the admin area. The surrounding chrome
 * (tab bar, breadcrumbs, global search modal, keyboard shortcuts) lives in
 * AdminShellLayout; the error boundary and toast provider live in
 * _layout.tsx. This file is responsible only for:
 *
 *   - the tab definitions and permission filtering
 *   - data loading for the admin dashboard (analytics, permissions)
 *   - routing the active tab to the correct tab component
 *   - the export-CSV action shared by several tabs
 */
import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  ComponentProps,
} from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassScreen,
  colors,
  useGlassAlert,
} from "@/components/ui/glass";

import { adminStyles as styles } from "./styles";
import { AdminTab, AnalyticsData, PermissionData } from "./types";
import { OverviewTab } from "./OverviewTab";
import { UsersTab } from "./UsersTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { SupportTab } from "./SupportTab";
import { MonitoringTab } from "./MonitoringTab";
import { ReceiptsTab } from "./ReceiptsTab";
import { CatalogTab } from "./CatalogTab";
import { SettingsTab } from "./SettingsTab";
import { WebhooksTab } from "./WebhooksTab";
import { PointsTab } from "./PointsTab";
import { AdminShellLayout } from "./components/AdminShellLayout";

export default function AdminScreen() {
  const { tab } = useLocalSearchParams<{ tab: string }>();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [searchTargetId, setSearchTargetId] = useState<string | null>(null);
  // selectionLabel: populated by ReceiptsTab only (post-M3). User detail
  // is now its own route (/admin/users/[id]) whose SimpleHeader title acts
  // as the breadcrumb, so UsersTab no longer reports selection here.
  const [selectionLabel, setSelectionLabel] = useState<string | null>(null);
  const { alert: showAlert } = useGlassAlert();

  const tabs: {
    key: AdminTab;
    label: string;
    icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
    permission?: string;
  }[] = useMemo(
    () => [
      { key: "overview", label: "Overview", icon: "view-dashboard" },
      { key: "users", label: "Users", icon: "account-group", permission: "view_users" },
      { key: "analytics", label: "Analytics", icon: "chart-bar", permission: "view_analytics" },
      { key: "receipts", label: "Receipts", icon: "receipt", permission: "view_receipts" },
      { key: "catalog", label: "Catalog", icon: "database", permission: "manage_catalog" },
      { key: "points", label: "Points", icon: "star-circle", permission: "view_analytics" },
      { key: "support", label: "Support", icon: "help-circle", permission: "view_support" },
      { key: "monitoring", label: "Monitoring", icon: "pulse", permission: "view_analytics" },
      { key: "webhooks", label: "Webhooks", icon: "webhook", permission: "manage_flags" },
      { key: "settings", label: "Settings", icon: "cog", permission: "manage_flags" },
    ],
    []
  );

  useEffect(() => {
    if (
      tab &&
      [
        "overview",
        "users",
        "analytics",
        "support",
        "monitoring",
        "receipts",
        "catalog",
        "settings",
        "webhooks",
        "points",
      ].includes(tab)
    ) {
      setActiveTab(tab as AdminTab);
    }
  }, [tab]);

  const analytics = useQuery(api.admin.getAnalytics, {}) as AnalyticsData | undefined | null;
  const myPerms = useQuery(api.admin.getMyPermissions, {}) as PermissionData | undefined | null;
  const logSession = useMutation(api.admin.logAdminSession);
  const exportData = useAction(api.admin.exportDataToCSV);

  const loading = analytics === undefined || myPerms === undefined;

  const handleExportCSV = useCallback(
    async (type: "users" | "receipts" | "prices" | "analytics") => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const result = await exportData({ dataType: type });
        showAlert(
          "Export Complete",
          `Generated ${result.fileName}.\n\nPreview (Top 5 rows):\n${result.csv
            .split("\n")
            .slice(0, 5)
            .join("\n")}`
        );
      } catch (e) {
        showAlert("Error", (e as Error).message || "Failed to export CSV");
      }
    },
    [exportData, showAlert]
  );

  const hasPermission = useCallback(
    (p: string) => {
      if (!myPerms) return false;
      if (myPerms.role === "super_admin") return true;
      return Array.isArray(myPerms.permissions) && myPerms.permissions.includes(p);
    },
    [myPerms]
  );

  useEffect(() => {
    if (activeTab) {
      logSession({ userAgent: Platform.OS + " " + Platform.Version }).catch(console.error);
      setSelectionLabel(null); // Reset label when tab changes
    }
  }, [activeTab, logSession]);

  // Track pending setTimeouts so we can cancel them on unmount — otherwise
  // a timer firing after unmount would call setState on a dead component.
  const searchTargetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (searchTargetTimeoutRef.current) clearTimeout(searchTargetTimeoutRef.current);
    },
    []
  );

  const handleSelectSearchResult = useCallback((tab: AdminTab, id: string) => {
    setActiveTab(tab);
    setSearchTargetId(id);
    // Clear search target after components have had time to react
    if (searchTargetTimeoutRef.current) clearTimeout(searchTargetTimeoutRef.current);
    searchTargetTimeoutRef.current = setTimeout(() => setSearchTargetId(null), 1000);
  }, []);

  const handleResetSelection = useCallback(() => {
    setSearchTargetId("RESET"); // Signal to tabs to clear selection
    setSelectionLabel(null);
    if (searchTargetTimeoutRef.current) clearTimeout(searchTargetTimeoutRef.current);
    searchTargetTimeoutRef.current = setTimeout(() => setSearchTargetId(null), 100);
  }, []);

  const handleExit = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/(tabs)/profile");
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
          <MaterialCommunityIcons
            name="lock-outline"
            size={64}
            color={colors.semantic.danger}
          />
          <Text style={styles.accessTitle}>Access Denied</Text>
          <Text style={styles.accessSubtext}>
            You do not have administrative privileges.
          </Text>
        </View>
      </GlassScreen>
    );
  }

  const visibleTabs = tabs.filter((t) => !t.permission || hasPermission(t.permission));

  return (
    <GlassScreen>
      <AdminShellLayout
        tabs={visibleTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectionLabel={selectionLabel}
        onResetSelection={handleResetSelection}
        onSelectSearchResult={handleSelectSearchResult}
        onExit={handleExit}
      >
        <View style={{ flex: 1, zIndex: 1 }}>
          {activeTab === "overview" && <OverviewTab hasPermission={hasPermission} />}
          {activeTab === "users" && (
            <UsersTab
              hasPermission={hasPermission}
              handleExportCSV={handleExportCSV}
            />
          )}
          {activeTab === "analytics" && (
            <AnalyticsTab hasPermission={hasPermission} handleExportCSV={handleExportCSV} />
          )}
          {activeTab === "support" && <SupportTab hasPermission={hasPermission} />}
          {activeTab === "monitoring" && <MonitoringTab hasPermission={hasPermission} />}
          {activeTab === "receipts" && (
            <ReceiptsTab
              hasPermission={hasPermission}
              initialReceiptId={
                searchTargetId && activeTab === "receipts" ? searchTargetId : undefined
              }
              onSelectionChange={setSelectionLabel}
            />
          )}
          {activeTab === "points" && <PointsTab hasPermission={hasPermission} />}
          {activeTab === "catalog" && <CatalogTab hasPermission={hasPermission} />}
          {activeTab === "webhooks" && <WebhooksTab hasPermission={hasPermission} />}
          {activeTab === "settings" && <SettingsTab hasPermission={hasPermission} />}
        </View>
      </AdminShellLayout>
    </GlassScreen>
  );
}
