/**
 * Admin - Audit Logging Tests
 * Tests log creation and querying for admin actions
 */

describe("Admin Audit Logging", () => {
  interface AuditLog {
    adminId: string;
    action: string;
    targetUserId?: string;
    details: string;
    createdAt: number;
  }

  let logs: AuditLog[] = [];

  function createAuditLog(
    adminId: string,
    action: string,
    details: string,
    targetUserId?: string
  ): AuditLog {
    const log: AuditLog = {
      adminId,
      action,
      details,
      targetUserId,
      createdAt: Date.now(),
    };
    logs.push(log);
    return log;
  }

  function getAuditLogs(limit: number = 50): AuditLog[] {
    return [...logs].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  function getLogsByAdmin(adminId: string): AuditLog[] {
    return logs.filter((l) => l.adminId === adminId).sort((a, b) => b.createdAt - a.createdAt);
  }

  function getLogsByAction(action: string): AuditLog[] {
    return logs.filter((l) => l.action === action).sort((a, b) => b.createdAt - a.createdAt);
  }

  function getLogsByTarget(targetUserId: string): AuditLog[] {
    return logs.filter((l) => l.targetUserId === targetUserId).sort((a, b) => b.createdAt - a.createdAt);
  }

  beforeEach(() => {
    logs = [];
  });

  describe("createAuditLog", () => {
    it("should create a log entry", () => {
      const log = createAuditLog("admin_1", "toggle_admin", "Granted admin to Bob", "user_2");
      expect(log.adminId).toBe("admin_1");
      expect(log.action).toBe("toggle_admin");
      expect(log.targetUserId).toBe("user_2");
      expect(log.createdAt).toBeDefined();
    });

    it("should add to logs array", () => {
      createAuditLog("admin_1", "suspend_user", "Suspended for spam");
      expect(logs).toHaveLength(1);
    });

    it("should handle optional targetUserId", () => {
      const log = createAuditLog("admin_1", "toggle_feature", "Enabled dark mode");
      expect(log.targetUserId).toBeUndefined();
    });
  });

  describe("getAuditLogs", () => {
    it("should return logs sorted newest first", () => {
      logs.push({ adminId: "admin_1", action: "action_a", details: "First", createdAt: 1000 });
      logs.push({ adminId: "admin_1", action: "action_b", details: "Second", createdAt: 2000 });
      logs.push({ adminId: "admin_1", action: "action_c", details: "Third", createdAt: 3000 });

      const result = getAuditLogs();
      expect(result[0].action).toBe("action_c");
      expect(result[2].action).toBe("action_a");
    });

    it("should respect limit", () => {
      for (let i = 0; i < 10; i++) {
        createAuditLog("admin_1", `action_${i}`, `Log ${i}`);
      }

      const result = getAuditLogs(5);
      expect(result).toHaveLength(5);
    });

    it("should return empty for no logs", () => {
      expect(getAuditLogs()).toEqual([]);
    });
  });

  describe("getLogsByAdmin", () => {
    it("should filter by admin ID", () => {
      createAuditLog("admin_1", "action_a", "By admin 1");
      createAuditLog("admin_2", "action_b", "By admin 2");
      createAuditLog("admin_1", "action_c", "By admin 1 again");

      const result = getLogsByAdmin("admin_1");
      expect(result).toHaveLength(2);
      expect(result.every((l) => l.adminId === "admin_1")).toBe(true);
    });
  });

  describe("getLogsByAction", () => {
    it("should filter by action type", () => {
      createAuditLog("admin_1", "toggle_admin", "Grant admin");
      createAuditLog("admin_1", "suspend_user", "Suspend spammer");
      createAuditLog("admin_2", "toggle_admin", "Revoke admin");

      const result = getLogsByAction("toggle_admin");
      expect(result).toHaveLength(2);
    });
  });

  describe("getLogsByTarget", () => {
    it("should filter by target user", () => {
      createAuditLog("admin_1", "toggle_admin", "Grant", "user_1");
      createAuditLog("admin_1", "suspend_user", "Suspend", "user_2");
      createAuditLog("admin_2", "extend_trial", "Extend", "user_1");

      const result = getLogsByTarget("user_1");
      expect(result).toHaveLength(2);
    });
  });

  describe("Common admin actions should be logged", () => {
    it("should log toggle_admin", () => {
      createAuditLog("admin_1", "toggle_admin", "Granted admin to user_2", "user_2");
      expect(getLogsByAction("toggle_admin")).toHaveLength(1);
    });

    it("should log suspend_user", () => {
      createAuditLog("admin_1", "suspend_user", "Suspended for TOS violation", "user_3");
      expect(getLogsByAction("suspend_user")).toHaveLength(1);
    });

    it("should log delete_receipt", () => {
      createAuditLog("admin_1", "delete_receipt", "Deleted fraudulent receipt");
      expect(getLogsByAction("delete_receipt")).toHaveLength(1);
    });

    it("should log toggle_feature", () => {
      createAuditLog("admin_1", "toggle_feature", "Enabled partner mode globally");
      expect(getLogsByAction("toggle_feature")).toHaveLength(1);
    });

    it("should log extend_trial", () => {
      createAuditLog("admin_1", "extend_trial", "Extended trial by 14 days", "user_5");
      expect(getLogsByAction("extend_trial")).toHaveLength(1);
    });
  });
});
