import {
  SUBSCRIPTION_STORAGE_KEY,
  createTrialStatus,
  getSubscriptionStatus,
  saveSubscriptionStatus,
  getTrialDaysRemaining,
  getPlanDisplayName,
  getCurrentPlanFeatures,
  hasPremiumAccess,
  isOnPaidPlan,
  formatSubscriptionDate,
  upgradeToPlan,
  cancelSubscription,
  clearSubscriptionData,
} from '@/lib/utils/subscriptionStorage';
import {
  SubscriptionPlan,
  TRIAL_DURATION_DAYS,
  type SubscriptionStatus,
} from '@/lib/types/subscription';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('subscriptionStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('SUBSCRIPTION_STORAGE_KEY', () => {
    it('has correct value', () => {
      expect(SUBSCRIPTION_STORAGE_KEY).toBe('oja_subscription_status');
    });
  });

  describe('createTrialStatus', () => {
    it('creates a trial subscription', () => {
      const status = createTrialStatus();

      expect(status.plan).toBe(SubscriptionPlan.TRIAL);
      expect(status.isActive).toBe(true);
      expect(status.trialStartDate).toBeDefined();
      expect(status.trialEndDate).toBeDefined();
    });

    it('sets trial end date 14 days from now', () => {
      const status = createTrialStatus();
      const startDate = new Date(status.trialStartDate!);
      const endDate = new Date(status.trialEndDate!);

      const diffMs = endDate.getTime() - startDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(TRIAL_DURATION_DAYS);
    });
  });

  describe('getSubscriptionStatus', () => {
    it('creates trial for new users', () => {
      const status = getSubscriptionStatus();

      expect(status.plan).toBe(SubscriptionPlan.TRIAL);
      expect(status.isActive).toBe(true);
    });

    it('returns stored status', () => {
      const mockStatus: SubscriptionStatus = {
        plan: SubscriptionPlan.MONTHLY,
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: null,
        isActive: true,
      };
      localStorage.setItem(
        SUBSCRIPTION_STORAGE_KEY,
        JSON.stringify(mockStatus)
      );

      const status = getSubscriptionStatus();

      expect(status.plan).toBe(SubscriptionPlan.MONTHLY);
    });

    it('downgrades expired trial to free', () => {
      const expiredTrial: SubscriptionStatus = {
        plan: SubscriptionPlan.TRIAL,
        trialStartDate: new Date('2020-01-01').toISOString(),
        trialEndDate: new Date('2020-01-15').toISOString(), // Expired
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        isActive: true,
      };
      localStorage.setItem(
        SUBSCRIPTION_STORAGE_KEY,
        JSON.stringify(expiredTrial)
      );

      const status = getSubscriptionStatus();

      expect(status.plan).toBe(SubscriptionPlan.FREE);
    });

    it('returns trial status if invalid JSON', () => {
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, 'invalid-json');

      const status = getSubscriptionStatus();

      expect(status.plan).toBe(SubscriptionPlan.TRIAL);
    });
  });

  describe('saveSubscriptionStatus', () => {
    it('saves status to localStorage', () => {
      const status: SubscriptionStatus = {
        plan: SubscriptionPlan.ANNUAL,
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: null,
        isActive: true,
      };

      saveSubscriptionStatus(status);

      const stored = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      expect(stored).toBeDefined();
      expect(JSON.parse(stored!).plan).toBe(SubscriptionPlan.ANNUAL);
    });
  });

  describe('getTrialDaysRemaining', () => {
    it('returns 0 for non-trial plans', () => {
      const status: SubscriptionStatus = {
        plan: SubscriptionPlan.FREE,
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        isActive: true,
      };
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(status));

      expect(getTrialDaysRemaining()).toBe(0);
    });

    it('returns days remaining for active trial', () => {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 7);

      const status: SubscriptionStatus = {
        plan: SubscriptionPlan.TRIAL,
        trialStartDate: now.toISOString(),
        trialEndDate: endDate.toISOString(),
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        isActive: true,
      };
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(status));

      expect(getTrialDaysRemaining()).toBe(7);
    });

    it('returns 0 for expired trial', () => {
      const status: SubscriptionStatus = {
        plan: SubscriptionPlan.TRIAL,
        trialStartDate: new Date('2020-01-01').toISOString(),
        trialEndDate: new Date('2020-01-15').toISOString(),
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        isActive: true,
      };
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(status));

      expect(getTrialDaysRemaining()).toBe(0);
    });
  });

  describe('getPlanDisplayName', () => {
    it('returns correct display names', () => {
      expect(getPlanDisplayName(SubscriptionPlan.TRIAL)).toBe('Trial');
      expect(getPlanDisplayName(SubscriptionPlan.FREE)).toBe('Free');
      expect(getPlanDisplayName(SubscriptionPlan.MONTHLY)).toBe('Monthly');
      expect(getPlanDisplayName(SubscriptionPlan.ANNUAL)).toBe('Annual');
    });
  });

  describe('getCurrentPlanFeatures', () => {
    it('returns features for current plan', () => {
      // New user defaults to trial
      const features = getCurrentPlanFeatures();

      expect(features.maxPantryItems).toBeNull(); // Unlimited
      expect(features.priceHistory).toBe(true);
    });
  });

  describe('hasPremiumAccess', () => {
    it('returns true for trial', () => {
      const status: SubscriptionStatus = {
        plan: SubscriptionPlan.TRIAL,
        trialStartDate: new Date().toISOString(),
        trialEndDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        isActive: true,
      };
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(status));

      expect(hasPremiumAccess()).toBe(true);
    });

    it('returns false for free', () => {
      const status: SubscriptionStatus = {
        plan: SubscriptionPlan.FREE,
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        isActive: true,
      };
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(status));

      expect(hasPremiumAccess()).toBe(false);
    });

    it('returns true for paid plans', () => {
      const status: SubscriptionStatus = {
        plan: SubscriptionPlan.MONTHLY,
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: null,
        isActive: true,
      };
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(status));

      expect(hasPremiumAccess()).toBe(true);
    });
  });

  describe('isOnPaidPlan', () => {
    it('returns false for trial', () => {
      expect(isOnPaidPlan()).toBe(false);
    });

    it('returns true for monthly', () => {
      const status: SubscriptionStatus = {
        plan: SubscriptionPlan.MONTHLY,
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: null,
        isActive: true,
      };
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(status));

      expect(isOnPaidPlan()).toBe(true);
    });
  });

  describe('formatSubscriptionDate', () => {
    it('returns N/A for null', () => {
      expect(formatSubscriptionDate(null)).toBe('N/A');
    });

    it('formats date correctly', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const formatted = formatSubscriptionDate(date.toISOString());

      // Format varies by locale, just check it's not N/A
      expect(formatted).not.toBe('N/A');
      expect(formatted).toContain('2024');
    });
  });

  describe('upgradeToPlan', () => {
    it('upgrades to monthly plan', () => {
      upgradeToPlan(SubscriptionPlan.MONTHLY);

      const status = getSubscriptionStatus();
      expect(status.plan).toBe(SubscriptionPlan.MONTHLY);
      expect(status.subscriptionStartDate).toBeDefined();
      expect(status.subscriptionEndDate).toBeDefined();
    });

    it('upgrades to annual plan', () => {
      upgradeToPlan(SubscriptionPlan.ANNUAL);

      const status = getSubscriptionStatus();
      expect(status.plan).toBe(SubscriptionPlan.ANNUAL);
    });
  });

  describe('cancelSubscription', () => {
    it('reverts to free plan', () => {
      upgradeToPlan(SubscriptionPlan.MONTHLY);
      cancelSubscription();

      const status = getSubscriptionStatus();
      expect(status.plan).toBe(SubscriptionPlan.FREE);
      expect(status.subscriptionStartDate).toBeNull();
    });
  });

  describe('clearSubscriptionData', () => {
    it('removes subscription from localStorage', () => {
      saveSubscriptionStatus(createTrialStatus());
      clearSubscriptionData();

      expect(localStorage.getItem(SUBSCRIPTION_STORAGE_KEY)).toBeNull();
    });
  });
});
