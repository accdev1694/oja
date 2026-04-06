/**
 * Users Core Tests (convex/users/core.ts)
 *
 * Tests the user CRUD functions hardened in the security audit:
 * - getByClerkId: only returns own record (auth-gated)
 * - getById: only returns own record (auth-gated)
 * - getCurrent: read-only user lookup
 * - getOrCreate: email normalization, dedup by email, user creation
 * - internalGetByClerkId: no auth (internal-only)
 */

import {
  getByClerkId,
  getById,
  getCurrent,
  getOrCreate,
  internalGetByClerkId,
} from "../../convex/users/core";

jest.mock("../../convex/_generated/server", () => ({
  mutation: (args: { handler: unknown }) => args.handler,
  query: (args: { handler: unknown }) => args.handler,
  internalQuery: (args: { handler: unknown }) => args.handler,
}));

jest.mock("../../convex/_generated/api", () => ({
  api: {},
  internal: {},
}));

jest.mock("../../convex/lib/analytics", () => ({
  trackFunnelEvent: jest.fn(),
  trackActivity: jest.fn(),
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

describe("convex/users/core", () => {
  let mockCtx: MockCtx;

  beforeEach(() => {
    mockCtx = createMockCtx();
  });

  describe("getCurrent", () => {
    it("should return null when not authenticated", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue(null);
      const handler = getCurrent as unknown as HandlerFn<Record<string, never>>;
      const result = await handler(mockCtx, {});
      expect(result).toBeNull();
    });

    it("should return user when authenticated", async () => {
      const mockUser = { _id: "user1", clerkId: "clerk_123" };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.unique.mockResolvedValue(mockUser);

      const handler = getCurrent as unknown as HandlerFn<Record<string, never>>;
      const result = await handler(mockCtx, {});
      expect(result).toEqual(mockUser);
    });
  });

  describe("getByClerkId", () => {
    it("should return null when not authenticated", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue(null);
      const handler = getByClerkId as unknown as HandlerFn<{ clerkId: string }>;
      const result = await handler(mockCtx, { clerkId: "clerk_123" });
      expect(result).toBeNull();
    });

    it("should return null when requesting a different user's record", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_me" });
      const handler = getByClerkId as unknown as HandlerFn<{ clerkId: string }>;
      const result = await handler(mockCtx, { clerkId: "clerk_other" });
      expect(result).toBeNull();
      // Should NOT have queried the DB at all
      expect(mockCtx.db.query).not.toHaveBeenCalled();
    });

    it("should return user when requesting own record", async () => {
      const mockUser = { _id: "user1", clerkId: "clerk_123" };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.unique.mockResolvedValue(mockUser);

      const handler = getByClerkId as unknown as HandlerFn<{ clerkId: string }>;
      const result = await handler(mockCtx, { clerkId: "clerk_123" });
      expect(result).toEqual(mockUser);
    });
  });

  describe("getById", () => {
    it("should return null when not authenticated", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue(null);
      const handler = getById as unknown as HandlerFn<{ id: string }>;
      const result = await handler(mockCtx, { id: "user1" });
      expect(result).toBeNull();
    });

    it("should return null when user not found in DB", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.get.mockResolvedValue(null);

      const handler = getById as unknown as HandlerFn<{ id: string }>;
      const result = await handler(mockCtx, { id: "user_missing" });
      expect(result).toBeNull();
    });

    it("should return null when requesting someone else's record", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_me" });
      mockCtx.db.get.mockResolvedValue({ _id: "user_other", clerkId: "clerk_other" });

      const handler = getById as unknown as HandlerFn<{ id: string }>;
      const result = await handler(mockCtx, { id: "user_other" });
      expect(result).toBeNull();
    });

    it("should return user when requesting own record", async () => {
      const mockUser = { _id: "user1", clerkId: "clerk_123" };
      mockCtx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_123" });
      mockCtx.db.get.mockResolvedValue(mockUser);

      const handler = getById as unknown as HandlerFn<{ id: string }>;
      const result = await handler(mockCtx, { id: "user1" });
      expect(result).toEqual(mockUser);
    });
  });

  describe("internalGetByClerkId", () => {
    it("should return user without auth check", async () => {
      const mockUser = { _id: "user1", clerkId: "clerk_123" };
      mockCtx.db.unique.mockResolvedValue(mockUser);

      const handler = internalGetByClerkId as unknown as HandlerFn<{ clerkId: string }>;
      const result = await handler(mockCtx, { clerkId: "clerk_123" });
      expect(result).toEqual(mockUser);
      // Should NOT call auth
      expect(mockCtx.auth.getUserIdentity).not.toHaveBeenCalled();
    });

    it("should return null when user does not exist", async () => {
      mockCtx.db.unique.mockResolvedValue(null);

      const handler = internalGetByClerkId as unknown as HandlerFn<{ clerkId: string }>;
      const result = await handler(mockCtx, { clerkId: "clerk_nonexistent" });
      expect(result).toBeNull();
    });
  });

  describe("getOrCreate", () => {
    it("should throw when not authenticated", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue(null);
      const handler = getOrCreate as unknown as HandlerFn<{ mfaEnabled?: boolean }>;
      await expect(handler(mockCtx, {})).rejects.toThrow("Not authenticated");
    });

    it("should return existing user when found by Clerk ID", async () => {
      const mockUser = { _id: "user1", clerkId: "clerk_123", mfaEnabled: false };
      mockCtx.auth.getUserIdentity.mockResolvedValue({
        subject: "clerk_123",
        email: "test@example.com",
      });
      mockCtx.db.unique.mockResolvedValue(mockUser);

      const handler = getOrCreate as unknown as HandlerFn<{ mfaEnabled?: boolean }>;
      const result = await handler(mockCtx, {});
      expect(result).toEqual(mockUser);
    });

    it("should normalize email to lowercase on user creation", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue({
        subject: "clerk_new",
        email: "John.Doe@GMAIL.COM",
        name: "John Doe",
      });
      // Not found by Clerk ID
      mockCtx.db.unique.mockResolvedValueOnce(null);
      // Not found by email
      mockCtx.db.unique.mockResolvedValueOnce(null);
      // Insert returns new ID
      mockCtx.db.insert.mockResolvedValue("user_new");
      // Race condition guard: collect returns single user (no duplicates)
      const newUser = { _id: "user_new", clerkId: "clerk_new", email: "john.doe@gmail.com" };
      mockCtx.db.collect.mockResolvedValueOnce([newUser]);
      // get() after insert
      mockCtx.db.get.mockResolvedValue(newUser);

      const handler = getOrCreate as unknown as HandlerFn<{ mfaEnabled?: boolean }>;
      await handler(mockCtx, {});

      // Verify insert was called with lowercase email
      expect(mockCtx.db.insert).toHaveBeenCalledWith(
        "users",
        expect.objectContaining({
          email: "john.doe@gmail.com",
        })
      );
    });

    it("should link existing user when found by email (Clerk ID migration)", async () => {
      const existingUser = { _id: "user1", clerkId: "old_clerk", email: "test@example.com", mfaEnabled: false };
      mockCtx.auth.getUserIdentity.mockResolvedValue({
        subject: "new_clerk_id",
        email: "Test@Example.com",
      });
      // Not found by Clerk ID
      mockCtx.db.unique.mockResolvedValueOnce(null);
      // Found by email
      mockCtx.db.unique.mockResolvedValueOnce(existingUser);

      const handler = getOrCreate as unknown as HandlerFn<{ mfaEnabled?: boolean }>;
      const result = await handler(mockCtx, {});

      // Should have patched the clerkId
      expect(mockCtx.db.patch).toHaveBeenCalledWith("user1", expect.objectContaining({
        clerkId: "new_clerk_id",
      }));
      expect(result).toEqual(existingUser);
    });

    it("should use email prefix as name when identity name is generic", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue({
        subject: "clerk_new",
        email: "jane.smith@example.com",
        name: "User", // Generic placeholder
      });
      mockCtx.db.unique.mockResolvedValueOnce(null); // Not by Clerk
      mockCtx.db.unique.mockResolvedValueOnce(null); // Not by email
      mockCtx.db.insert.mockResolvedValue("user_new");
      // Race condition guard: collect returns single user (no duplicates)
      const newUser = { _id: "user_new", clerkId: "clerk_new", name: "jane.smith" };
      mockCtx.db.collect.mockResolvedValueOnce([newUser]);
      mockCtx.db.get.mockResolvedValue(newUser);

      const handler = getOrCreate as unknown as HandlerFn<{ mfaEnabled?: boolean }>;
      await handler(mockCtx, {});

      expect(mockCtx.db.insert).toHaveBeenCalledWith(
        "users",
        expect.objectContaining({
          name: "jane.smith",
        })
      );
    });

    it("should update MFA status if changed", async () => {
      const mockUser = { _id: "user1", clerkId: "clerk_123", mfaEnabled: false };
      mockCtx.auth.getUserIdentity.mockResolvedValue({
        subject: "clerk_123",
        email: "test@example.com",
      });
      mockCtx.db.unique.mockResolvedValue(mockUser);

      const handler = getOrCreate as unknown as HandlerFn<{ mfaEnabled?: boolean }>;
      await handler(mockCtx, { mfaEnabled: true });

      expect(mockCtx.db.patch).toHaveBeenCalledWith("user1", expect.objectContaining({
        mfaEnabled: true,
      }));
    });
  });
});
