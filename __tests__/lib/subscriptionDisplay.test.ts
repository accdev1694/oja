import { getSubscriptionDisplay } from "../../convex/lib/subscriptionDisplay";
import type { Doc } from "../../convex/_generated/dataModel";

// Fixed reference time so tests are deterministic
const NOW = new Date("2026-04-09T12:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

function makeSub(overrides: Partial<Doc<"subscriptions">>): Doc<"subscriptions"> {
  return {
    _id: "sub_test" as Doc<"subscriptions">["_id"],
    _creationTime: NOW - 30 * DAY,
    userId: "user_test" as Doc<"subscriptions">["userId"],
    plan: "free",
    status: "trial",
    createdAt: NOW - 30 * DAY,
    updatedAt: NOW - DAY,
    ...overrides,
  } as Doc<"subscriptions">;
}

describe("getSubscriptionDisplay", () => {
  describe("null subscription", () => {
    it("returns free variant for null", () => {
      const result = getSubscriptionDisplay(null, NOW);
      expect(result.variant).toBe("free");
      expect(result.label).toBe("Free");
      expect(result.shortLabel).toBe("Free");
      expect(result.plan).toBe("none");
      expect(result.effectiveStatus).toBe("free");
      expect(result.daysRemaining).toBeUndefined();
    });
  });

  describe("active trial", () => {
    it("shows trial variant with days remaining for fresh trial", () => {
      const sub = makeSub({ status: "trial", trialEndsAt: NOW + 5 * DAY });
      const result = getSubscriptionDisplay(sub, NOW);
      expect(result.variant).toBe("trial");
      expect(result.daysRemaining).toBe(5);
      expect(result.shortLabel).toBe("Trial 5d");
      expect(result.label).toContain("5d left");
      expect(result.effectiveStatus).toBe("trial");
    });

    it("shows trial_expiring variant when ≤2 days left", () => {
      const sub = makeSub({ status: "trial", trialEndsAt: NOW + 2 * DAY });
      const result = getSubscriptionDisplay(sub, NOW);
      expect(result.variant).toBe("trial_expiring");
      expect(result.daysRemaining).toBe(2);
      expect(result.label).toContain("2d left");
    });

    it("shows trial_expiring variant when 1 day left", () => {
      const sub = makeSub({ status: "trial", trialEndsAt: NOW + 1 * DAY });
      const result = getSubscriptionDisplay(sub, NOW);
      expect(result.variant).toBe("trial_expiring");
      expect(result.daysRemaining).toBe(1);
    });

    it("rounds a partial day up to 1 for a live trial ending within the hour", () => {
      // Trial ends in 1 hour — live (not stale). Math.ceil rounds up to 1d so
      // users never see "0d left" on a live trial.
      const sub = makeSub({ status: "trial", trialEndsAt: NOW + 60 * 60 * 1000 });
      const result = getSubscriptionDisplay(sub, NOW);
      expect(result.variant).toBe("trial_expiring");
      expect(result.daysRemaining).toBe(1);
      expect(result.label).toContain("1d left");
    });

    it("handles a trial extended beyond 7 days without producing negative internal fields", () => {
      const sub = makeSub({ status: "trial", trialEndsAt: NOW + 14 * DAY });
      const result = getSubscriptionDisplay(sub, NOW);
      expect(result.variant).toBe("trial");
      expect(result.daysRemaining).toBe(14);
    });
  });

  describe("expired trial (stale status)", () => {
    it("treats trial with past trialEndsAt as expired even if status=trial", () => {
      const sub = makeSub({ status: "trial", trialEndsAt: NOW - 1 * DAY });
      const result = getSubscriptionDisplay(sub, NOW);
      expect(result.variant).toBe("expired");
      expect(result.effectiveStatus).toBe("expired");
      expect(result.label).toBe("Trial expired");
    });

    it("handles trialEndsAt === now as expired", () => {
      const sub = makeSub({ status: "trial", trialEndsAt: NOW });
      const result = getSubscriptionDisplay(sub, NOW);
      expect(result.variant).toBe("expired");
    });
  });

  describe("active premium", () => {
    it("shows premium_monthly variant for active monthly plan", () => {
      const sub = makeSub({
        status: "active",
        plan: "premium_monthly",
        currentPeriodEnd: NOW + 20 * DAY,
      });
      const result = getSubscriptionDisplay(sub, NOW);
      expect(result.variant).toBe("premium_monthly");
      expect(result.label).toBe("Premium Monthly");
      expect(result.daysRemaining).toBe(20);
      expect(result.effectiveStatus).toBe("active");
    });

    it("shows premium_annual variant for active annual plan", () => {
      const sub = makeSub({
        status: "active",
        plan: "premium_annual",
        currentPeriodEnd: NOW + 300 * DAY,
      });
      const result = getSubscriptionDisplay(sub, NOW);
      expect(result.variant).toBe("premium_annual");
      expect(result.label).toBe("Premium Annual");
      expect(result.daysRemaining).toBe(300);
    });

    it("handles active premium with no currentPeriodEnd", () => {
      const sub = makeSub({ status: "active", plan: "premium_monthly", currentPeriodEnd: undefined });
      const result = getSubscriptionDisplay(sub, NOW);
      expect(result.variant).toBe("premium_monthly");
      expect(result.daysRemaining).toBeUndefined();
    });
  });

  describe("cancelled", () => {
    it("shows cancelled variant", () => {
      const sub = makeSub({ status: "cancelled", plan: "premium_monthly" });
      const result = getSubscriptionDisplay(sub, NOW);
      expect(result.variant).toBe("cancelled");
      expect(result.label).toBe("Cancelled");
      expect(result.effectiveStatus).toBe("cancelled");
    });
  });

  describe("expired (explicit)", () => {
    it("shows expired variant for status=expired", () => {
      const sub = makeSub({ status: "expired", plan: "free" });
      const result = getSubscriptionDisplay(sub, NOW);
      expect(result.variant).toBe("expired");
      expect(result.label).toBe("Expired");
      expect(result.effectiveStatus).toBe("expired");
    });
  });

  describe("edge cases", () => {
    it("uses Date.now() by default when nowMs is omitted", () => {
      const sub = makeSub({ status: "trial", trialEndsAt: Date.now() + 3 * DAY });
      const result = getSubscriptionDisplay(sub);
      expect(result.variant).toBe("trial");
      expect(result.daysRemaining).toBeGreaterThanOrEqual(2);
      expect(result.daysRemaining).toBeLessThanOrEqual(3);
    });
  });
});
