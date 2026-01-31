/**
 * Subscriptions - Point Expiry Tests
 * Tests 12-month rolling expiry logic for loyalty points
 */

describe("Point Expiry", () => {
  const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

  interface PointTransaction {
    userId: string;
    type: "earned" | "redeemed" | "expired";
    amount: number;
    createdAt: number;
    expiredAmount?: number;
  }

  function isExpirable(transaction: PointTransaction, now: number): boolean {
    if (transaction.type !== "earned") return false;
    const age = now - transaction.createdAt;
    return age > TWELVE_MONTHS_MS;
  }

  function calculateExpirableAmount(transaction: PointTransaction): number {
    if (transaction.type !== "earned") return 0;
    const alreadyExpired = transaction.expiredAmount || 0;
    return Math.max(0, transaction.amount - alreadyExpired);
  }

  function processExpiry(
    transactions: PointTransaction[],
    now: number
  ): { totalExpired: number; affectedTransactions: string[] } {
    let totalExpired = 0;
    const affected: string[] = [];

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (!isExpirable(tx, now)) continue;
      const expirable = calculateExpirableAmount(tx);
      if (expirable > 0) {
        totalExpired += expirable;
        affected.push(`tx_${i}`);
      }
    }

    return { totalExpired, affectedTransactions: affected };
  }

  function deductFromBalance(currentBalance: number, expiredAmount: number): number {
    return Math.max(0, currentBalance - expiredAmount);
  }

  describe("isExpirable", () => {
    it("should return true for earned transactions older than 12 months", () => {
      const tx: PointTransaction = {
        userId: "user_1", type: "earned", amount: 50,
        createdAt: Date.now() - TWELVE_MONTHS_MS - 1000,
      };
      expect(isExpirable(tx, Date.now())).toBe(true);
    });

    it("should return false for recent earned transactions", () => {
      const tx: PointTransaction = {
        userId: "user_1", type: "earned", amount: 50,
        createdAt: Date.now() - 1000,
      };
      expect(isExpirable(tx, Date.now())).toBe(false);
    });

    it("should return false for redeemed transactions", () => {
      const tx: PointTransaction = {
        userId: "user_1", type: "redeemed", amount: 30,
        createdAt: Date.now() - TWELVE_MONTHS_MS - 1000,
      };
      expect(isExpirable(tx, Date.now())).toBe(false);
    });

    it("should return false for already expired transactions", () => {
      const tx: PointTransaction = {
        userId: "user_1", type: "expired", amount: 20,
        createdAt: Date.now() - TWELVE_MONTHS_MS - 1000,
      };
      expect(isExpirable(tx, Date.now())).toBe(false);
    });

    it("should return false for exactly 12 months old", () => {
      const tx: PointTransaction = {
        userId: "user_1", type: "earned", amount: 50,
        createdAt: Date.now() - TWELVE_MONTHS_MS,
      };
      expect(isExpirable(tx, Date.now())).toBe(false);
    });
  });

  describe("calculateExpirableAmount", () => {
    it("should return full amount for unpartially-expired earned transaction", () => {
      const tx: PointTransaction = {
        userId: "user_1", type: "earned", amount: 50, createdAt: 0,
      };
      expect(calculateExpirableAmount(tx)).toBe(50);
    });

    it("should subtract already-expired amount", () => {
      const tx: PointTransaction = {
        userId: "user_1", type: "earned", amount: 50, createdAt: 0,
        expiredAmount: 20,
      };
      expect(calculateExpirableAmount(tx)).toBe(30);
    });

    it("should return 0 for fully expired transaction", () => {
      const tx: PointTransaction = {
        userId: "user_1", type: "earned", amount: 50, createdAt: 0,
        expiredAmount: 50,
      };
      expect(calculateExpirableAmount(tx)).toBe(0);
    });

    it("should return 0 for redeemed transactions", () => {
      const tx: PointTransaction = {
        userId: "user_1", type: "redeemed", amount: 30, createdAt: 0,
      };
      expect(calculateExpirableAmount(tx)).toBe(0);
    });
  });

  describe("processExpiry", () => {
    it("should expire old earned transactions", () => {
      const oldDate = Date.now() - TWELVE_MONTHS_MS - 86400000;
      const transactions: PointTransaction[] = [
        { userId: "user_1", type: "earned", amount: 50, createdAt: oldDate },
        { userId: "user_1", type: "earned", amount: 30, createdAt: oldDate },
      ];

      const result = processExpiry(transactions, Date.now());
      expect(result.totalExpired).toBe(80);
      expect(result.affectedTransactions).toHaveLength(2);
    });

    it("should not expire recent transactions", () => {
      const transactions: PointTransaction[] = [
        { userId: "user_1", type: "earned", amount: 50, createdAt: Date.now() - 1000 },
      ];

      const result = processExpiry(transactions, Date.now());
      expect(result.totalExpired).toBe(0);
      expect(result.affectedTransactions).toHaveLength(0);
    });

    it("should only expire earned, not redeemed", () => {
      const oldDate = Date.now() - TWELVE_MONTHS_MS - 86400000;
      const transactions: PointTransaction[] = [
        { userId: "user_1", type: "earned", amount: 50, createdAt: oldDate },
        { userId: "user_1", type: "redeemed", amount: 30, createdAt: oldDate },
      ];

      const result = processExpiry(transactions, Date.now());
      expect(result.totalExpired).toBe(50);
    });

    it("should handle empty transactions", () => {
      const result = processExpiry([], Date.now());
      expect(result.totalExpired).toBe(0);
    });
  });

  describe("deductFromBalance", () => {
    it("should deduct expired amount", () => {
      expect(deductFromBalance(100, 30)).toBe(70);
    });

    it("should not go below zero", () => {
      expect(deductFromBalance(20, 50)).toBe(0);
    });

    it("should handle zero expiry", () => {
      expect(deductFromBalance(100, 0)).toBe(100);
    });
  });
});
