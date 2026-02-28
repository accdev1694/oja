import { renderHook } from "@testing-library/react-native";
import { useAdminAuth, useGmvMetrics } from "../../app/(app)/admin/hooks";
import { useQuery } from "convex/react";
import { AnalyticsData } from "../../app/(app)/admin/types";

// Mock convex hooks
jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useAction: jest.fn(),
}));

describe("Admin Dashboard Hooks", () => {
  describe("useAdminAuth", () => {
    it("should return hasPermission true for super_admin", () => {
      (useQuery as jest.Mock).mockReturnValue({
        role: "super_admin",
        permissions: [],
      });

      const { result } = renderHook(() => useAdminAuth());
      expect(result.current.hasPermission("any_permission")).toBe(true);
    });

    it("should check specific permissions for regular admins", () => {
      (useQuery as jest.Mock).mockReturnValue({
        role: "editor",
        permissions: ["view_users", "edit_users"],
      });

      const { result } = renderHook(() => useAdminAuth());
      expect(result.current.hasPermission("view_users")).toBe(true);
      expect(result.current.hasPermission("manage_catalog")).toBe(false);
    });

    it("should return loading state", () => {
      (useQuery as jest.Mock).mockReturnValue(undefined);
      const { result } = renderHook(() => useAdminAuth());
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("useGmvMetrics", () => {
    const mockAnalytics: AnalyticsData = {
      totalUsers: 100,
      newUsersThisWeek: 10,
      newUsersThisMonth: 40,
      activeUsersThisWeek: 50,
      totalLists: 200,
      completedLists: 150,
      totalReceipts: 300,
      receiptsThisWeek: 30,
      receiptsThisMonth: 120,
      totalGMV: 5000,
      gmvThisWeek: 500,
      gmvThisMonth: 2000,
      gmvThisYear: 4000,
      computedAt: Date.now(),
      isPrecomputed: true,
    };

    it("should return week GMV", () => {
      const { result } = renderHook(() => useGmvMetrics(mockAnalytics, "week"));
      expect(result.current).toBe(500);
    });

    it("should return lifetime GMV by default", () => {
      const { result } = renderHook(() => useGmvMetrics(mockAnalytics, "lifetime"));
      expect(result.current).toBe(5000);
    });

    it("should handle null analytics", () => {
      const { result } = renderHook(() => useGmvMetrics(null, "week"));
      expect(result.current).toBe(0);
    });
  });
});
