/**
 * Admin Trial / Subscription Extension Logic Tests
 *
 * Covers the pure guard logic inside:
 *  - extendTrial mutation (rejects on active premium, rejects on non-positive days)
 *  - bulkExtendTrial mutation (skips active subscribers, resets status to trial)
 *  - downgradeSubscription mutation (idempotent on already-free, clears Stripe IDs)
 *  - grantComplimentaryAccess (extends from currentPeriodEnd when active)
 *
 * These tests mirror the real mutation logic from convex/admin/userMgmt.ts but run
 * as pure functions, matching the pattern used in user-management.test.ts.
 */

type Plan = "free" | "premium_monthly" | "premium_annual";
type Status = "active" | "cancelled" | "expired" | "trial";

interface Subscription {
  _id: string;
  userId: string;
  plan: Plan;
  status: Status;
  trialEndsAt?: number;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

const DAY = 24 * 60 * 60 * 1000;

// ── Pure re-implementations of the mutation guards ──────────────────────────

function extendTrialLogic(
  sub: Subscription | null,
  days: number,
  now: number
): Subscription {
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error("days must be a positive integer");
  }

  if (sub && sub.status === "active") {
    throw new Error(
      "Cannot start a trial for an active premium subscriber. Downgrade first if needed."
    );
  }

  const durationMs = days * DAY;

  if (!sub) {
    return {
      _id: "new_sub",
      userId: "user_x",
      plan: "free",
      status: "trial",
      trialEndsAt: now + durationMs,
    };
  }

  const baseEnd = Math.max(sub.trialEndsAt ?? 0, now);
  return {
    ...sub,
    status: "trial",
    trialEndsAt: baseEnd + durationMs,
  };
}

function bulkExtendOne(
  sub: Subscription | null,
  days: number,
  now: number
): { sub: Subscription | null; action: "created" | "extended" | "skipped" } {
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error("days must be a positive integer");
  }

  const duration = days * DAY;

  if (!sub) {
    return {
      sub: {
        _id: "new_sub",
        userId: "user_x",
        plan: "free",
        status: "trial",
        trialEndsAt: now + duration,
      },
      action: "created",
    };
  }

  if (sub.status === "active") {
    return { sub, action: "skipped" };
  }

  const baseEnd = Math.max(sub.trialEndsAt ?? 0, now);
  return {
    sub: {
      ...sub,
      status: "trial",
      trialEndsAt: baseEnd + duration,
    },
    action: "extended",
  };
}

function downgradeLogic(
  sub: Subscription | null,
  now: number
): { sub: Subscription | null; alreadyDowngraded: boolean } {
  // No-op only if already in a terminal ended state. Trial users (free+trial)
  // must still be downgradable so an admin can explicitly revoke a trial.
  if (
    !sub ||
    (sub.plan === "free" && (sub.status === "expired" || sub.status === "cancelled"))
  ) {
    return { sub, alreadyDowngraded: true };
  }

  return {
    sub: {
      ...sub,
      plan: "free",
      status: "expired",
      currentPeriodEnd: now,
      stripeSubscriptionId: undefined,
      stripeCustomerId: undefined,
    },
    alreadyDowngraded: false,
  };
}

function grantComplimentaryLogic(
  sub: Subscription | null,
  months: number,
  now: number
): { sub: Subscription; extended: boolean } {
  if (!Number.isInteger(months) || months <= 0) {
    throw new Error("months must be a positive integer");
  }

  const duration = months * 30 * DAY;

  const hasRemainingTime =
    sub?.status === "active" && sub.currentPeriodEnd != null && sub.currentPeriodEnd > now;
  const baseStart = hasRemainingTime ? sub!.currentPeriodEnd! : now;
  const newEnd = baseStart + duration;
  const extended = baseStart !== now;

  if (sub) {
    return {
      sub: {
        ...sub,
        plan: "premium_annual",
        status: "active",
        currentPeriodStart: extended ? (sub.currentPeriodStart ?? now) : now,
        currentPeriodEnd: newEnd,
      },
      extended,
    };
  }

  return {
    sub: {
      _id: "new_sub",
      userId: "user_x",
      plan: "premium_annual",
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: newEnd,
    },
    extended: false,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("extendTrial mutation logic", () => {
  const NOW = new Date("2026-04-09T12:00:00Z").getTime();

  it("creates a fresh trial subscription when user has none", () => {
    const result = extendTrialLogic(null, 7, NOW);
    expect(result.status).toBe("trial");
    expect(result.trialEndsAt).toBe(NOW + 7 * DAY);
    expect(result.plan).toBe("free");
  });

  it("extends from future trialEndsAt for an active trial", () => {
    const sub: Subscription = {
      _id: "sub1",
      userId: "u1",
      plan: "free",
      status: "trial",
      trialEndsAt: NOW + 3 * DAY,
    };
    const result = extendTrialLogic(sub, 7, NOW);
    expect(result.trialEndsAt).toBe(NOW + 10 * DAY); // 3 existing + 7 new
  });

  it("restarts from now (not past date) for an expired trial", () => {
    const sub: Subscription = {
      _id: "sub1",
      userId: "u1",
      plan: "free",
      status: "expired",
      trialEndsAt: NOW - 10 * DAY,
    };
    const result = extendTrialLogic(sub, 7, NOW);
    expect(result.trialEndsAt).toBe(NOW + 7 * DAY); // from now, not NOW-10+7
    expect(result.status).toBe("trial");
  });

  it("rejects extension on an active premium subscription", () => {
    const sub: Subscription = {
      _id: "sub1",
      userId: "u1",
      plan: "premium_monthly",
      status: "active",
      currentPeriodEnd: NOW + 20 * DAY,
    };
    expect(() => extendTrialLogic(sub, 7, NOW)).toThrow(/active premium/);
  });

  it("rejects days = 0", () => {
    expect(() => extendTrialLogic(null, 0, NOW)).toThrow(/positive integer/);
  });

  it("rejects negative days", () => {
    expect(() => extendTrialLogic(null, -5, NOW)).toThrow(/positive integer/);
  });

  it("rejects non-integer days", () => {
    expect(() => extendTrialLogic(null, 1.5, NOW)).toThrow(/positive integer/);
  });
});

describe("bulkExtendTrial mutation logic", () => {
  const NOW = new Date("2026-04-09T12:00:00Z").getTime();

  it("creates trials for users with no subscription", () => {
    const result = bulkExtendOne(null, 14, NOW);
    expect(result.action).toBe("created");
    expect(result.sub?.trialEndsAt).toBe(NOW + 14 * DAY);
  });

  it("skips active premium subscribers (never downgrades them)", () => {
    const sub: Subscription = {
      _id: "sub1",
      userId: "u1",
      plan: "premium_annual",
      status: "active",
      currentPeriodEnd: NOW + 100 * DAY,
    };
    const result = bulkExtendOne(sub, 14, NOW);
    expect(result.action).toBe("skipped");
    expect(result.sub).toBe(sub); // unchanged
  });

  it("rejects non-positive days (mirrors real mutation guard)", () => {
    expect(() => bulkExtendOne(null, 0, NOW)).toThrow(/positive integer/);
    expect(() => bulkExtendOne(null, -3, NOW)).toThrow(/positive integer/);
    expect(() => bulkExtendOne(null, 2.5, NOW)).toThrow(/positive integer/);
  });

  it("resets status to 'trial' when extending an expired subscription", () => {
    const sub: Subscription = {
      _id: "sub1",
      userId: "u1",
      plan: "free",
      status: "expired",
      trialEndsAt: NOW - 5 * DAY,
    };
    const result = bulkExtendOne(sub, 14, NOW);
    expect(result.action).toBe("extended");
    expect(result.sub?.status).toBe("trial");
    expect(result.sub?.trialEndsAt).toBe(NOW + 14 * DAY); // from now
  });
});

describe("downgradeSubscription mutation logic", () => {
  const NOW = new Date("2026-04-09T12:00:00Z").getTime();

  it("no-ops on null subscription (already downgraded)", () => {
    const result = downgradeLogic(null, NOW);
    expect(result.alreadyDowngraded).toBe(true);
    expect(result.sub).toBeNull();
  });

  it("no-ops on already-free expired subscription", () => {
    const sub: Subscription = {
      _id: "sub1",
      userId: "u1",
      plan: "free",
      status: "expired",
    };
    const result = downgradeLogic(sub, NOW);
    expect(result.alreadyDowngraded).toBe(true);
  });

  it("downgrades an active premium subscription and clears BOTH Stripe IDs", () => {
    const sub: Subscription = {
      _id: "sub1",
      userId: "u1",
      plan: "premium_monthly",
      status: "active",
      currentPeriodEnd: NOW + 20 * DAY,
      stripeCustomerId: "cus_abc123",
      stripeSubscriptionId: "sub_abc123",
    };
    const result = downgradeLogic(sub, NOW);
    expect(result.alreadyDowngraded).toBe(false);
    expect(result.sub?.plan).toBe("free");
    expect(result.sub?.status).toBe("expired");
    expect(result.sub?.stripeCustomerId).toBeUndefined();
    expect(result.sub?.stripeSubscriptionId).toBeUndefined();
  });

  it("downgrades a trial user (admin explicitly revoking an active trial)", () => {
    const sub: Subscription = {
      _id: "sub1",
      userId: "u1",
      plan: "free",
      status: "trial",
      trialEndsAt: NOW + 5 * DAY,
    };
    const result = downgradeLogic(sub, NOW);
    // Trials grant premium features, so "downgrade" on a trial must actually
    // end it. The no-op guard only fires for terminal ended states
    // (free+expired or free+cancelled), never for live trials.
    expect(result.alreadyDowngraded).toBe(false);
    expect(result.sub?.status).toBe("expired");
    expect(result.sub?.plan).toBe("free");
  });

  it("re-applies downgrade on a premium+cancelled record (no-op guard does not fire)", () => {
    const sub: Subscription = {
      _id: "sub1",
      userId: "u1",
      plan: "premium_monthly",
      status: "cancelled",
      stripeCustomerId: "cus_leftover",
      stripeSubscriptionId: "sub_leftover",
    };
    const result = downgradeLogic(sub, NOW);
    expect(result.alreadyDowngraded).toBe(false);
    expect(result.sub?.plan).toBe("free");
    expect(result.sub?.status).toBe("expired");
    expect(result.sub?.stripeCustomerId).toBeUndefined();
    expect(result.sub?.stripeSubscriptionId).toBeUndefined();
  });

  it("re-applies downgrade on a premium+expired record (cleans stale Stripe links)", () => {
    const sub: Subscription = {
      _id: "sub1",
      userId: "u1",
      plan: "premium_annual",
      status: "expired",
      stripeCustomerId: "cus_stale",
      stripeSubscriptionId: "sub_stale",
    };
    const result = downgradeLogic(sub, NOW);
    expect(result.alreadyDowngraded).toBe(false);
    expect(result.sub?.plan).toBe("free");
    expect(result.sub?.stripeCustomerId).toBeUndefined();
    expect(result.sub?.stripeSubscriptionId).toBeUndefined();
  });

  it("no-ops on already-free cancelled subscription", () => {
    const sub: Subscription = {
      _id: "sub1",
      userId: "u1",
      plan: "free",
      status: "cancelled",
    };
    const result = downgradeLogic(sub, NOW);
    expect(result.alreadyDowngraded).toBe(true);
  });
});

describe("grantComplimentaryAccess mutation logic", () => {
  const NOW = new Date("2026-04-09T12:00:00Z").getTime();

  it("starts fresh 12-month period for new user", () => {
    const result = grantComplimentaryLogic(null, 12, NOW);
    expect(result.extended).toBe(false);
    expect(result.sub.currentPeriodEnd).toBe(NOW + 12 * 30 * DAY);
  });

  it("extends from existing currentPeriodEnd for active subscriber (preserves purchased time)", () => {
    const sub: Subscription = {
      _id: "sub1",
      userId: "u1",
      plan: "premium_annual",
      status: "active",
      currentPeriodStart: NOW - 30 * DAY,
      currentPeriodEnd: NOW + 60 * DAY, // 2 months remaining
    };
    const result = grantComplimentaryLogic(sub, 12, NOW);
    expect(result.extended).toBe(true);
    // 60 days remaining + 12*30 days = 60 + 360 = 420 days from NOW
    expect(result.sub.currentPeriodEnd).toBe(NOW + 420 * DAY);
  });

  it("starts from now for an expired subscriber (no time to preserve)", () => {
    const sub: Subscription = {
      _id: "sub1",
      userId: "u1",
      plan: "free",
      status: "expired",
      currentPeriodEnd: NOW - 10 * DAY, // past
    };
    const result = grantComplimentaryLogic(sub, 12, NOW);
    expect(result.extended).toBe(false);
    expect(result.sub.currentPeriodEnd).toBe(NOW + 12 * 30 * DAY);
  });

  it("rejects months = 0", () => {
    expect(() => grantComplimentaryLogic(null, 0, NOW)).toThrow(/positive integer/);
  });

  it("rejects negative months", () => {
    expect(() => grantComplimentaryLogic(null, -1, NOW)).toThrow(/positive integer/);
  });
});
