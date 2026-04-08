/**
 * Admin Auth & Impersonation Tests
 *
 * Tests the admin auth system hardened in the security audit:
 * - admin/helpers.ts: requireAdmin (SIEM logging, suspension), requirePermission, requirePermissionQuery
 * - impersonation.ts: generateImpersonationToken, validateImpersonationToken, startImpersonation
 */

import {
  requireAdmin as adminRequireAdmin,
  requirePermission,
  requirePermissionQuery,
  normalizeClerkId,
  checkRateLimit,
} from "../../convex/admin/helpers";

import {
  generateImpersonationToken,
  validateImpersonationToken,
  startImpersonation,
} from "../../convex/impersonation";

// Mock server types
jest.mock("../../convex/_generated/server", () => ({
  mutation: (args: { handler: unknown }) => args.handler,
  query: (args: { handler: unknown }) => args.handler,
  internalQuery: (args: { handler: unknown }) => args.handler,
  internalMutation: (args: { handler: unknown }) => args.handler,
}));

jest.mock("../../convex/_generated/api", () => ({
  api: {},
  internal: {},
}));

// Mock SIEM logging
const mockLogToSIEM = jest.fn();
jest.mock("../../convex/lib/siem", () => ({
  logToSIEM: (...args: unknown[]) => mockLogToSIEM(...args),
}));

// Mock lib/auth for impersonation (it imports requireAdmin from lib/auth)
const mockLibRequireAdmin = jest.fn();
jest.mock("../../convex/lib/auth", () => ({
  requireAdmin: (...args: unknown[]) => mockLibRequireAdmin(...args),
}));

interface MockDb {
  get: jest.Mock;
  query: jest.Mock;
  withIndex: jest.Mock;
  filter: jest.Mock;
  order: jest.Mock;
  unique: jest.Mock;
  collect: jest.Mock;
  first: jest.Mock;
  insert: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
}

interface MockCtx {
  auth: { getUserIdentity: jest.Mock };
  db: MockDb;
}

function createMockCtx(): MockCtx {
  return {
    auth: {
      getUserIdentity: jest.fn(),
    },
    db: {
      get: jest.fn(),
      query: jest.fn().mockReturnThis(),
      withIndex: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      unique: jest.fn(),
      collect: jest.fn(),
      first: jest.fn(),
      insert: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    },
  };
}

type HandlerFn<TArgs = Record<string, unknown>, TResult = unknown> = (
  ctx: MockCtx,
  args: TArgs
) => Promise<TResult>;

describe("admin/helpers", () => {
  let mockCtx: MockCtx;

  beforeEach(() => {
    mockCtx = createMockCtx();
    mockLogToSIEM.mockReset();
  });

  describe("normalizeClerkId", () => {
    it("should return ID as-is when no pipe", () => {
      expect(normalizeClerkId("user_abc123")).toBe("user_abc123");
    });

    it("should extract last segment after pipe", () => {
      expect(normalizeClerkId("oauth|google|12345")).toBe("12345");
    });

    it("should handle single pipe", () => {
      expect(normalizeClerkId("provider|user_abc")).toBe("user_abc");
    });
  });

  describe("requireAdmin (admin/helpers)", () => {
    it("should throw and log to SIEM when unauthenticated", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue(null);

      await expect(
        adminRequireAdmin(mockCtx as unknown as Parameters<typeof adminRequireAdmin>[0])
      ).rejects.toThrow("Not authenticated");

      expect(mockLogToSIEM).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          action: "admin_access_attempt",
          status: "blocked",
          severity: "medium",
        })
      );
    });

    it("should throw and log to SIEM when user is suspended", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.first.mockResolvedValue({
        _id: "user1",
        clerkId: "clerk_123",
        isAdmin: true,
        suspended: true,
      });

      await expect(
        adminRequireAdmin(mockCtx as unknown as Parameters<typeof adminRequireAdmin>[0])
      ).rejects.toThrow("Account suspended");

      expect(mockLogToSIEM).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          action: "admin_access_attempt",
          severity: "high",
          details: expect.stringContaining("Suspended"),
        })
      );
    });

    it("should return user with isAdmin flag", async () => {
      const adminUser = { _id: "user1", clerkId: "clerk_123", isAdmin: true, mfaEnabled: true };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.first.mockResolvedValueOnce(adminUser); // getCurrentUser
      mockCtx.db.first.mockResolvedValueOnce({ roleId: "role1" }); // userRoles query

      const result = await adminRequireAdmin(
        mockCtx as unknown as Parameters<typeof adminRequireAdmin>[0]
      );
      expect(result).toEqual(adminUser);
    });

    it("should throw when MFA grace period expired", async () => {
      const adminNoMfa = { _id: "user1", clerkId: "clerk_123", isAdmin: true, mfaEnabled: false, adminGrantedAt: Date.now() - 15 * 24 * 60 * 60 * 1000 };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.first.mockResolvedValueOnce(adminNoMfa);
      mockCtx.db.first.mockResolvedValueOnce({ roleId: "role1" });

      await expect(
        adminRequireAdmin(mockCtx as unknown as Parameters<typeof adminRequireAdmin>[0])
      ).rejects.toThrow("MFA required");
    });

    it("should allow admin within MFA grace period", async () => {
      const recentAdmin = { _id: "user1", clerkId: "clerk_123", isAdmin: true, mfaEnabled: false, adminGrantedAt: Date.now() - 1000 };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.first.mockResolvedValueOnce(recentAdmin);
      mockCtx.db.first.mockResolvedValueOnce({ roleId: "role1" });

      const result = await adminRequireAdmin(
        mockCtx as unknown as Parameters<typeof adminRequireAdmin>[0]
      );
      expect(result).toEqual(recentAdmin);
    });

    it("should throw for RBAC admin with expired MFA grace period", async () => {
      const rbacAdmin = { _id: "user1", clerkId: "clerk_123", isAdmin: false, mfaEnabled: false };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.first.mockResolvedValueOnce(rbacAdmin);
      mockCtx.db.first.mockResolvedValueOnce({ roleId: "role1", grantedAt: Date.now() - 15 * 24 * 60 * 60 * 1000 });

      await expect(
        adminRequireAdmin(mockCtx as unknown as Parameters<typeof adminRequireAdmin>[0])
      ).rejects.toThrow("MFA required");
    });

    it("should allow RBAC admin within MFA grace period", async () => {
      const rbacAdmin = { _id: "user1", clerkId: "clerk_123", isAdmin: false, mfaEnabled: false };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.first.mockResolvedValueOnce(rbacAdmin);
      mockCtx.db.first.mockResolvedValueOnce({ roleId: "role1", grantedAt: Date.now() - 1000 });

      const result = await adminRequireAdmin(
        mockCtx as unknown as Parameters<typeof adminRequireAdmin>[0]
      );
      expect(result).toEqual(rbacAdmin);
    });

    it("should return user with RBAC role but no isAdmin flag", async () => {
      const rbacAdmin = { _id: "user1", clerkId: "clerk_123", isAdmin: false, mfaEnabled: true };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.first.mockResolvedValueOnce(rbacAdmin); // getCurrentUser
      mockCtx.db.first.mockResolvedValueOnce({ roleId: "role1" }); // has RBAC role

      const result = await adminRequireAdmin(
        mockCtx as unknown as Parameters<typeof adminRequireAdmin>[0]
      );
      expect(result).toEqual(rbacAdmin);
    });

    it("should throw and log when user has no admin access", async () => {
      const regularUser = { _id: "user1", clerkId: "clerk_123", isAdmin: false };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.first.mockResolvedValueOnce(regularUser); // getCurrentUser
      mockCtx.db.first.mockResolvedValueOnce(null); // no RBAC role

      await expect(
        adminRequireAdmin(mockCtx as unknown as Parameters<typeof adminRequireAdmin>[0])
      ).rejects.toThrow("Admin access required");

      expect(mockLogToSIEM).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          action: "admin_access_attempt",
          severity: "high",
          details: expect.stringContaining("Non-admin"),
        })
      );
    });
  });

  describe("checkRateLimit", () => {
    it("should create new rate limit entry when none exists", async () => {
      mockCtx.db.first.mockResolvedValue(null);

      await checkRateLimit(
        mockCtx as unknown as Parameters<typeof checkRateLimit>[0],
        "user1" as Parameters<typeof checkRateLimit>[1],
        "view_users"
      );

      expect(mockCtx.db.insert).toHaveBeenCalledWith(
        "adminRateLimits",
        expect.objectContaining({
          userId: "user1",
          action: "view_users",
          count: 1,
        })
      );
    });

    it("should throw when general rate limit exceeded", async () => {
      mockCtx.db.first.mockResolvedValue({
        _id: "rl1",
        userId: "user1",
        action: "view_users",
        count: 100, // At limit
        windowStart: Date.now() - 30000, // 30s ago (within window)
      });

      await expect(
        checkRateLimit(
          mockCtx as unknown as Parameters<typeof checkRateLimit>[0],
          "user1" as Parameters<typeof checkRateLimit>[1],
          "view_users"
        )
      ).rejects.toThrow("Rate limit exceeded");
    });

    it("should throw at lower limit for sensitive actions", async () => {
      mockCtx.db.first.mockResolvedValue({
        _id: "rl1",
        userId: "user1",
        action: "delete_receipts",
        count: 10, // Sensitive limit is 10
        windowStart: Date.now() - 30000,
      });

      await expect(
        checkRateLimit(
          mockCtx as unknown as Parameters<typeof checkRateLimit>[0],
          "user1" as Parameters<typeof checkRateLimit>[1],
          "delete_receipts"
        )
      ).rejects.toThrow("Rate limit exceeded");
    });

    it("should reset window when expired", async () => {
      mockCtx.db.first.mockResolvedValue({
        _id: "rl1",
        userId: "user1",
        action: "view_users",
        count: 100, // At limit
        windowStart: Date.now() - 120000, // 2 minutes ago (expired, window is 60s)
      });

      await checkRateLimit(
        mockCtx as unknown as Parameters<typeof checkRateLimit>[0],
        "user1" as Parameters<typeof checkRateLimit>[1],
        "view_users"
      );

      expect(mockCtx.db.patch).toHaveBeenCalledWith("rl1", expect.objectContaining({
        count: 1,
      }));
    });
  });
});

describe("impersonation", () => {
  let mockCtx: MockCtx;

  beforeEach(() => {
    mockCtx = createMockCtx();
    mockLibRequireAdmin.mockReset();
  });

  describe("generateImpersonationToken", () => {
    it("should require admin auth", async () => {
      mockLibRequireAdmin.mockRejectedValue(new Error("Admin privileges required"));
      const handler = generateImpersonationToken as unknown as HandlerFn<{ userId: string }>;

      await expect(handler(mockCtx, { userId: "user1" })).rejects.toThrow("Admin privileges required");
    });

    it("should generate token and log audit entry", async () => {
      const adminUser = { _id: "admin1" };
      mockLibRequireAdmin.mockResolvedValue(adminUser);
      mockCtx.db.insert.mockResolvedValue("token1");

      const handler = generateImpersonationToken as unknown as HandlerFn<
        { userId: string },
        { tokenValue: string; expiresAt: number }
      >;
      const result = await handler(mockCtx, { userId: "user1" });

      expect(result.tokenValue).toBeDefined();
      expect(result.expiresAt).toBeGreaterThan(Date.now());
      // Should have inserted both token and audit log
      expect(mockCtx.db.insert).toHaveBeenCalledTimes(2);
      expect(mockCtx.db.insert).toHaveBeenCalledWith(
        "impersonationTokens",
        expect.objectContaining({ userId: "user1", createdBy: "admin1" })
      );
      expect(mockCtx.db.insert).toHaveBeenCalledWith(
        "adminLogs",
        expect.objectContaining({ action: "generate_impersonation_token" })
      );
    });
  });

  describe("validateImpersonationToken", () => {
    it("should require admin auth", async () => {
      mockLibRequireAdmin.mockRejectedValue(new Error("Admin privileges required"));
      const handler = validateImpersonationToken as unknown as HandlerFn<{ tokenValue: string }>;

      await expect(handler(mockCtx, { tokenValue: "abc" })).rejects.toThrow("Admin privileges required");
    });

    it("should return invalid for non-existent token", async () => {
      mockLibRequireAdmin.mockResolvedValue({ _id: "admin1" });
      mockCtx.db.unique.mockResolvedValue(null);

      const handler = validateImpersonationToken as unknown as HandlerFn<
        { tokenValue: string },
        { valid: boolean }
      >;
      const result = await handler(mockCtx, { tokenValue: "nonexistent" });
      expect(result.valid).toBe(false);
    });

    it("should return invalid for expired token", async () => {
      mockLibRequireAdmin.mockResolvedValue({ _id: "admin1" });
      mockCtx.db.unique.mockResolvedValue({
        tokenValue: "abc",
        expiresAt: Date.now() - 1000, // Already expired
        userId: "user1",
      });

      const handler = validateImpersonationToken as unknown as HandlerFn<
        { tokenValue: string },
        { valid: boolean; expired?: boolean }
      >;
      const result = await handler(mockCtx, { tokenValue: "abc" });
      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });

    it("should return valid with user info for active token", async () => {
      mockLibRequireAdmin.mockResolvedValue({ _id: "admin1" });
      mockCtx.db.unique.mockResolvedValue({
        tokenValue: "abc",
        expiresAt: Date.now() + 3600000, // 1 hour from now
        userId: "user1",
      });
      mockCtx.db.get.mockResolvedValue({
        _id: "user1",
        name: "Test User",
        clerkId: "clerk_user1",
      });

      const handler = validateImpersonationToken as unknown as HandlerFn<
        { tokenValue: string },
        { valid: boolean; userId?: string; userName?: string; userClerkId?: string }
      >;
      const result = await handler(mockCtx, { tokenValue: "abc" });
      expect(result.valid).toBe(true);
      expect(result.userId).toBe("user1");
      expect(result.userName).toBe("Test User");
      expect(result.userClerkId).toBe("clerk_user1");
    });
  });

  describe("startImpersonation", () => {
    it("should require admin auth", async () => {
      mockLibRequireAdmin.mockRejectedValue(new Error("Admin privileges required"));
      const handler = startImpersonation as unknown as HandlerFn<{ tokenValue: string }>;

      await expect(handler(mockCtx, { tokenValue: "abc" })).rejects.toThrow("Admin privileges required");
    });

    it("should throw for non-existent token", async () => {
      mockLibRequireAdmin.mockResolvedValue({ _id: "admin1" });
      mockCtx.db.unique.mockResolvedValue(null);

      const handler = startImpersonation as unknown as HandlerFn<{ tokenValue: string }>;
      await expect(handler(mockCtx, { tokenValue: "bad" })).rejects.toThrow("Invalid token");
    });

    it("should throw for expired token", async () => {
      mockLibRequireAdmin.mockResolvedValue({ _id: "admin1" });
      mockCtx.db.unique.mockResolvedValue({
        _id: "token1",
        tokenValue: "abc",
        expiresAt: Date.now() - 1000,
        userId: "user1",
      });

      const handler = startImpersonation as unknown as HandlerFn<{ tokenValue: string }>;
      await expect(handler(mockCtx, { tokenValue: "abc" })).rejects.toThrow("Token expired");
    });

    it("should throw for already-used token", async () => {
      mockLibRequireAdmin.mockResolvedValue({ _id: "admin1" });
      mockCtx.db.unique.mockResolvedValue({
        _id: "token1",
        tokenValue: "abc",
        expiresAt: Date.now() + 3600000,
        usedAt: Date.now() - 5000, // Already used
        userId: "user1",
      });

      const handler = startImpersonation as unknown as HandlerFn<{ tokenValue: string }>;
      await expect(handler(mockCtx, { tokenValue: "abc" })).rejects.toThrow("Token already used");
    });

    it("should activate token and log audit entry on success", async () => {
      const adminUser = { _id: "admin1" };
      mockLibRequireAdmin.mockResolvedValue(adminUser);
      mockCtx.db.unique.mockResolvedValue({
        _id: "token1",
        tokenValue: "abc",
        expiresAt: Date.now() + 3600000,
        userId: "user1",
      });
      mockCtx.db.get.mockResolvedValue({
        _id: "user1",
        clerkId: "clerk_user1",
      });

      const handler = startImpersonation as unknown as HandlerFn<
        { tokenValue: string },
        { success: boolean; userId: string; clerkId: string }
      >;
      const result = await handler(mockCtx, { tokenValue: "abc" });

      expect(result.success).toBe(true);
      expect(result.userId).toBe("user1");
      expect(result.clerkId).toBe("clerk_user1");
      // Should mark token as used
      expect(mockCtx.db.patch).toHaveBeenCalledWith("token1", expect.objectContaining({ usedAt: expect.any(Number) }));
      // Should insert audit log
      expect(mockCtx.db.insert).toHaveBeenCalledWith(
        "adminLogs",
        expect.objectContaining({
          adminUserId: "admin1",
          action: "start_impersonation",
          targetType: "user",
          targetId: "user1",
        })
      );
    });
  });
});
