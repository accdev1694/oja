import { useCallback, useMemo, useState, createContext, useContext } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { useGlassAlert, colors } from "@/components/ui/glass";
import { PermissionData, AnalyticsData } from "./types";

interface ToastState {
  visible: boolean;
  message: string;
  icon?: string;
  type: "success" | "error" | "info";
}

const ToastContext = createContext<{
  showToast: (message: string, type?: "success" | "error" | "info", icon?: string) => void;
  hideToast: () => void;
  toast: ToastState;
} | null>(null);

export function useAdminToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useAdminToast must be used within a ToastProvider");
  }
  return context;
}

export function useAdminToastInternal() {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "info",
  });

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info", icon?: string) => {
    setToast({
      visible: true,
      message,
      type,
      icon: icon || (type === "success" ? "check-circle" : type === "error" ? "alert-circle" : "information"),
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return { toast, showToast, hideToast };
}

export { ToastContext };

/**
 * Hook for managing global admin state and permissions
 */
export function useAdminAuth() {
  const myPerms = useQuery(api.admin.getMyPermissions, {}) as PermissionData | undefined | null;
  
  const hasPermission = useCallback((p: string) => {
    if (!myPerms) return false;
    if (myPerms.role === "super_admin") return true;
    return Array.isArray(myPerms.permissions) && myPerms.permissions.includes(p);
  }, [myPerms]);

  return {
    myPerms,
    hasPermission,
    isLoading: myPerms === undefined,
  };
}

/**
 * Hook for data export actions with Haptic feedback and Alerts
 */
export function useAdminExport() {
  const { showToast } = useAdminToast();
  const exportData = useAction(api.admin.exportDataToCSV);

  const handleExportCSV = useCallback(async (type: "users" | "receipts" | "prices" | "analytics") => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const result = await exportData({ dataType: type });
      showToast(`Export complete: ${result.fileName}`, "success");
    } catch (e) {
      showToast((e as Error).message || "Failed to export CSV", "error");
    }
  }, [exportData, showToast]);

  return { handleExportCSV };
}

/**
 * Hook for processing GMV data with memoization
 */
export function useGmvMetrics(analytics: AnalyticsData | undefined | null, filter: string) {
  return useMemo(() => {
    if (!analytics) return 0;
    switch (filter) {
      case "week": return analytics.gmvThisWeek ?? 0;
      case "month": return analytics.gmvThisMonth ?? 0;
      case "year": return analytics.gmvThisYear ?? 0;
      default: return analytics.totalGMV ?? 0;
    }
  }, [analytics, filter]);
}

interface SearchResult {
  type: "user" | "receipt" | "setting";
  id: string;
  title: string;
  subtitle: string;
  tab: AdminTab;
}

/**
 * Hook for global search across users, receipts, and settings
 */
export function useAdminSearch(query: string) {
  const users = useQuery(
    api.admin.searchUsers,
    query.length >= 2 ? { searchTerm: query, limit: 5 } : "skip"
  );
  
  const receipts = useQuery(
    api.admin.getRecentReceipts,
    query.length >= 2 ? { searchTerm: query, limit: 5 } : "skip"
  );

  return useMemo(() => {
    if (query.length < 2) return [];

    const results: SearchResult[] = [];

    // Process User Results
    if (users) {
      users.forEach((u: any) => {
        results.push({
          type: "user",
          id: u._id,
          title: u.name,
          subtitle: u.email || "No email",
          tab: "users",
        });
      });
    }

    // Process Receipt Results
    if (receipts) {
      receipts.forEach((r: any) => {
        results.push({
          type: "receipt",
          id: r._id,
          title: r.storeName || "Unknown Store",
          subtitle: `£${r.total?.toFixed(2)} • ${r.userName}`,
          tab: "receipts",
        });
      });
    }

    // Add static setting matches
    const settings = [
      { key: "pricing", label: "Platform Pricing", tab: "settings" as AdminTab },
      { key: "flags", label: "Feature Flags", tab: "settings" as AdminTab },
      { key: "announcements", label: "Announcements", tab: "settings" as AdminTab },
    ];

    settings.forEach(s => {
      if (s.label.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          type: "setting",
          id: s.key,
          title: s.label,
          subtitle: "Dashboard Setting",
          tab: s.tab,
        });
      }
    });

    return results;
  }, [query, users, receipts]);
}
