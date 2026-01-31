/**
 * Admin - User Management Tests
 * Tests search, filter, suspend, and admin grant flows
 */

describe("Admin User Management", () => {
  interface User {
    _id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    isSuspended: boolean;
    createdAt: number;
    lastActiveAt: number;
    plan?: string;
  }

  function searchUsers(users: User[], query: string): User[] {
    const q = query.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }

  function filterUsers(
    users: User[],
    filters: { isAdmin?: boolean; isSuspended?: boolean; plan?: string }
  ): User[] {
    let result = users;
    if (filters.isAdmin !== undefined) {
      result = result.filter((u) => u.isAdmin === filters.isAdmin);
    }
    if (filters.isSuspended !== undefined) {
      result = result.filter((u) => u.isSuspended === filters.isSuspended);
    }
    if (filters.plan !== undefined) {
      result = result.filter((u) => u.plan === filters.plan);
    }
    return result;
  }

  function toggleAdmin(user: User, actorId: string): { user: User; logEntry: string } {
    if (user._id === actorId) {
      throw new Error("Cannot change your own admin status");
    }
    const updated = { ...user, isAdmin: !user.isAdmin };
    const action = updated.isAdmin ? "granted" : "revoked";
    return {
      user: updated,
      logEntry: `Admin ${action} for ${user.name} by ${actorId}`,
    };
  }

  function toggleSuspension(user: User): User {
    return { ...user, isSuspended: !user.isSuspended };
  }

  function extendTrial(user: User, days: number): { newExpiry: number } {
    if (days <= 0 || days > 90) {
      throw new Error("Trial extension must be 1-90 days");
    }
    return { newExpiry: Date.now() + days * 24 * 60 * 60 * 1000 };
  }

  const testUsers: User[] = [
    { _id: "u1", name: "Alice Smith", email: "alice@test.com", isAdmin: true, isSuspended: false, createdAt: 1000, lastActiveAt: Date.now(), plan: "premium_monthly" },
    { _id: "u2", name: "Bob Jones", email: "bob@test.com", isAdmin: false, isSuspended: false, createdAt: 2000, lastActiveAt: Date.now(), plan: "free" },
    { _id: "u3", name: "Charlie Brown", email: "charlie@test.com", isAdmin: false, isSuspended: true, createdAt: 3000, lastActiveAt: Date.now() - 86400000 },
    { _id: "u4", name: "Diana Prince", email: "diana@test.com", isAdmin: false, isSuspended: false, createdAt: 4000, lastActiveAt: Date.now(), plan: "premium_annual" },
  ];

  describe("searchUsers", () => {
    it("should find user by name", () => {
      const results = searchUsers(testUsers, "alice");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Alice Smith");
    });

    it("should find user by email", () => {
      const results = searchUsers(testUsers, "bob@test");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Bob Jones");
    });

    it("should be case insensitive", () => {
      const results = searchUsers(testUsers, "CHARLIE");
      expect(results).toHaveLength(1);
    });

    it("should return empty for no matches", () => {
      const results = searchUsers(testUsers, "nobody");
      expect(results).toHaveLength(0);
    });

    it("should match partial names", () => {
      const results = searchUsers(testUsers, "an"); // Diana, Charlie
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("filterUsers", () => {
    it("should filter by admin status", () => {
      const results = filterUsers(testUsers, { isAdmin: true });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Alice Smith");
    });

    it("should filter by suspended status", () => {
      const results = filterUsers(testUsers, { isSuspended: true });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Charlie Brown");
    });

    it("should filter by plan", () => {
      const results = filterUsers(testUsers, { plan: "premium_monthly" });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Alice Smith");
    });

    it("should combine filters", () => {
      const results = filterUsers(testUsers, { isAdmin: false, isSuspended: false });
      expect(results).toHaveLength(2); // Bob and Diana
    });
  });

  describe("toggleAdmin", () => {
    it("should grant admin to non-admin user", () => {
      const result = toggleAdmin(testUsers[1], "u1");
      expect(result.user.isAdmin).toBe(true);
      expect(result.logEntry).toContain("granted");
    });

    it("should revoke admin from admin user", () => {
      const result = toggleAdmin(testUsers[0], "u2");
      expect(result.user.isAdmin).toBe(false);
      expect(result.logEntry).toContain("revoked");
    });

    it("should prevent self-demotion", () => {
      expect(() => toggleAdmin(testUsers[0], "u1")).toThrow("Cannot change your own");
    });
  });

  describe("toggleSuspension", () => {
    it("should suspend active user", () => {
      const result = toggleSuspension(testUsers[1]);
      expect(result.isSuspended).toBe(true);
    });

    it("should unsuspend suspended user", () => {
      const result = toggleSuspension(testUsers[2]);
      expect(result.isSuspended).toBe(false);
    });
  });

  describe("extendTrial", () => {
    it("should extend trial by given days", () => {
      const result = extendTrial(testUsers[1], 14);
      const expectedMin = Date.now() + 13 * 24 * 60 * 60 * 1000;
      expect(result.newExpiry).toBeGreaterThan(expectedMin);
    });

    it("should reject 0 days", () => {
      expect(() => extendTrial(testUsers[1], 0)).toThrow("1-90 days");
    });

    it("should reject negative days", () => {
      expect(() => extendTrial(testUsers[1], -5)).toThrow("1-90 days");
    });

    it("should reject more than 90 days", () => {
      expect(() => extendTrial(testUsers[1], 91)).toThrow("1-90 days");
    });

    it("should accept exactly 90 days", () => {
      const result = extendTrial(testUsers[1], 90);
      expect(result.newExpiry).toBeGreaterThan(Date.now());
    });
  });
});
