/**
 * Auth Helpers Tests (convex/lib/auth.ts)
 *
 * Tests the core auth functions that were hardened in the security audit:
 * - getCurrentUser: returns user from Clerk identity
 * - requireCurrentUser: blocks unauthenticated + suspended users
 * - requireOwnership: enforces resource ownership
 * - requireAdmin: checks isAdmin flag OR RBAC role assignment
 */

import {
  getCurrentUser,
  requireCurrentUser,
  requireOwnership,
  requireAdmin,
} from "../../convex/lib/auth";

// Mock Convex server types — extract the handler function
jest.mock("../../convex/_generated/server", () => ({
  mutation: (args: { handler: unknown }) => args.handler,
  query: (args: { handler: unknown }) => args.handler,
  internalQuery: (args: { handler: unknown }) => args.handler,
  internalMutation: (args: { handler: unknown }) => args.handler,
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

describe("convex/lib/auth", () => {
  let mockCtx: MockCtx;

  beforeEach(() => {
    mockCtx = createMockCtx();
  });

  describe("getCurrentUser", () => {
    it("should return null when not authenticated", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue(null);

      const result = await getCurrentUser(mockCtx as unknown as Parameters<typeof getCurrentUser>[0]);
      expect(result).toBeNull();
    });

    it("should return user when authenticated", async () => {
      const mockUser = { _id: "user1", clerkId: "clerk_123", name: "Test" };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.unique.mockResolvedValue(mockUser);

      const result = await getCurrentUser(mockCtx as unknown as Parameters<typeof getCurrentUser>[0]);
      expect(result).toEqual(mockUser);
      expect(mockCtx.db.withIndex).toHaveBeenCalledWith("by_clerk_id", expect.any(Function));
    });

    it("should return null when identity exists but no user in DB", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_unknown" });
      mockCtx.db.unique.mockResolvedValue(null);

      const result = await getCurrentUser(mockCtx as unknown as Parameters<typeof getCurrentUser>[0]);
      expect(result).toBeNull();
    });
  });

  describe("requireCurrentUser", () => {
    it("should throw 'Not authenticated' when no identity", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue(null);

      await expect(
        requireCurrentUser(mockCtx as unknown as Parameters<typeof requireCurrentUser>[0])
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw 'Not authenticated' when identity exists but no user in DB", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.unique.mockResolvedValue(null);

      await expect(
        requireCurrentUser(mockCtx as unknown as Parameters<typeof requireCurrentUser>[0])
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw 'Account suspended' for suspended users", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.unique.mockResolvedValue({
        _id: "user1",
        clerkId: "clerk_123",
        suspended: true,
      });

      await expect(
        requireCurrentUser(mockCtx as unknown as Parameters<typeof requireCurrentUser>[0])
      ).rejects.toThrow("Account suspended");
    });

    it("should return user when authenticated and not suspended", async () => {
      const mockUser = { _id: "user1", clerkId: "clerk_123", suspended: false };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.unique.mockResolvedValue(mockUser);

      const result = await requireCurrentUser(
        mockCtx as unknown as Parameters<typeof requireCurrentUser>[0]
      );
      expect(result).toEqual(mockUser);
    });

    it("should return user when suspended field is undefined (not suspended)", async () => {
      const mockUser = { _id: "user1", clerkId: "clerk_123" };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.unique.mockResolvedValue(mockUser);

      const result = await requireCurrentUser(
        mockCtx as unknown as Parameters<typeof requireCurrentUser>[0]
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe("requireOwnership", () => {
    it("should throw when user does not own resource", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.unique.mockResolvedValue({ _id: "user1", clerkId: "clerk_123" });

      await expect(
        requireOwnership(
          mockCtx as unknown as Parameters<typeof requireOwnership>[0],
          "user_other" as Parameters<typeof requireOwnership>[1]
        )
      ).rejects.toThrow("Not authorized");
    });

    it("should return user when they own the resource", async () => {
      const mockUser = { _id: "user1", clerkId: "clerk_123" };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.unique.mockResolvedValue(mockUser);

      const result = await requireOwnership(
        mockCtx as unknown as Parameters<typeof requireOwnership>[0],
        "user1" as Parameters<typeof requireOwnership>[1]
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe("requireAdmin", () => {
    it("should throw when not authenticated", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue(null);

      await expect(
        requireAdmin(mockCtx as unknown as Parameters<typeof requireAdmin>[0])
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw 'Account suspended' for suspended admin", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.unique.mockResolvedValue({
        _id: "user1",
        clerkId: "clerk_123",
        isAdmin: true,
        suspended: true,
      });

      await expect(
        requireAdmin(mockCtx as unknown as Parameters<typeof requireAdmin>[0])
      ).rejects.toThrow("Account suspended");
    });

    it("should return user with isAdmin flag", async () => {
      const adminUser = { _id: "user1", clerkId: "clerk_123", isAdmin: true };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.unique.mockResolvedValue(adminUser);

      const result = await requireAdmin(
        mockCtx as unknown as Parameters<typeof requireAdmin>[0]
      );
      expect(result).toEqual(adminUser);
    });

    it("should return user with RBAC role (no isAdmin flag)", async () => {
      const nonFlagAdmin = { _id: "user1", clerkId: "clerk_123", isAdmin: false };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.unique.mockResolvedValue(nonFlagAdmin);
      // first() for userRoles query returns a role
      mockCtx.db.first.mockResolvedValue({ _id: "role1", userId: "user1", roleId: "adminRole1" });

      const result = await requireAdmin(
        mockCtx as unknown as Parameters<typeof requireAdmin>[0]
      );
      expect(result).toEqual(nonFlagAdmin);
    });

    it("should throw when user has no admin flag and no RBAC role", async () => {
      const regularUser = { _id: "user1", clerkId: "clerk_123", isAdmin: false };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.unique.mockResolvedValue(regularUser);
      mockCtx.db.first.mockResolvedValue(null); // No RBAC role

      await expect(
        requireAdmin(mockCtx as unknown as Parameters<typeof requireAdmin>[0])
      ).rejects.toThrow("Admin privileges required");
    });
  });
});
