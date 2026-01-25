import {
  SubscriptionPlan,
  PLAN_DISPLAY_NAMES,
  PLAN_PRICES,
  TRIAL_DURATION_DAYS,
  PLAN_FEATURES,
  FEATURES,
  isPaidPlan,
  hasPremiumFeatures,
  getPlanFeatures,
  isFeatureAvailable,
} from '@/lib/types/subscription';

describe('subscription types', () => {
  describe('SubscriptionPlan enum', () => {
    it('has all expected plans', () => {
      expect(SubscriptionPlan.TRIAL).toBe('trial');
      expect(SubscriptionPlan.FREE).toBe('free');
      expect(SubscriptionPlan.MONTHLY).toBe('monthly');
      expect(SubscriptionPlan.ANNUAL).toBe('annual');
    });
  });

  describe('PLAN_DISPLAY_NAMES', () => {
    it('has display names for all plans', () => {
      expect(PLAN_DISPLAY_NAMES[SubscriptionPlan.TRIAL]).toBe('Trial');
      expect(PLAN_DISPLAY_NAMES[SubscriptionPlan.FREE]).toBe('Free');
      expect(PLAN_DISPLAY_NAMES[SubscriptionPlan.MONTHLY]).toBe('Monthly');
      expect(PLAN_DISPLAY_NAMES[SubscriptionPlan.ANNUAL]).toBe('Annual');
    });
  });

  describe('PLAN_PRICES', () => {
    it('has correct prices in pence', () => {
      expect(PLAN_PRICES[SubscriptionPlan.TRIAL]).toBe(0);
      expect(PLAN_PRICES[SubscriptionPlan.FREE]).toBe(0);
      expect(PLAN_PRICES[SubscriptionPlan.MONTHLY]).toBe(299);
      expect(PLAN_PRICES[SubscriptionPlan.ANNUAL]).toBe(2499);
    });
  });

  describe('TRIAL_DURATION_DAYS', () => {
    it('is 14 days', () => {
      expect(TRIAL_DURATION_DAYS).toBe(14);
    });
  });

  describe('PLAN_FEATURES', () => {
    it('trial has unlimited features', () => {
      const features = PLAN_FEATURES[SubscriptionPlan.TRIAL];
      expect(features.maxPantryItems).toBeNull();
      expect(features.maxShoppingLists).toBeNull();
      expect(features.maxReceiptsPerMonth).toBeNull();
      expect(features.priceHistory).toBe(true);
      expect(features.fullInsights).toBe(true);
      expect(features.exportData).toBe(true);
    });

    it('free has limited features', () => {
      const features = PLAN_FEATURES[SubscriptionPlan.FREE];
      expect(features.maxPantryItems).toBe(20);
      expect(features.maxShoppingLists).toBe(2);
      expect(features.maxReceiptsPerMonth).toBe(3);
      expect(features.priceHistory).toBe(false);
      expect(features.fullInsights).toBe(false);
      expect(features.exportData).toBe(false);
    });

    it('monthly has unlimited features', () => {
      const features = PLAN_FEATURES[SubscriptionPlan.MONTHLY];
      expect(features.maxPantryItems).toBeNull();
      expect(features.maxShoppingLists).toBeNull();
      expect(features.maxReceiptsPerMonth).toBeNull();
      expect(features.priceHistory).toBe(true);
    });

    it('annual has unlimited features', () => {
      const features = PLAN_FEATURES[SubscriptionPlan.ANNUAL];
      expect(features.maxPantryItems).toBeNull();
      expect(features.maxShoppingLists).toBeNull();
      expect(features.maxReceiptsPerMonth).toBeNull();
      expect(features.priceHistory).toBe(true);
    });
  });

  describe('FEATURES', () => {
    it('has 6 feature definitions', () => {
      expect(FEATURES).toHaveLength(6);
    });

    it('each feature has required properties', () => {
      FEATURES.forEach((feature) => {
        expect(feature.id).toBeDefined();
        expect(feature.name).toBeDefined();
        expect(feature.description).toBeDefined();
        expect(feature.paidBenefit).toBeDefined();
      });
    });
  });

  describe('isPaidPlan', () => {
    it('returns false for trial', () => {
      expect(isPaidPlan(SubscriptionPlan.TRIAL)).toBe(false);
    });

    it('returns false for free', () => {
      expect(isPaidPlan(SubscriptionPlan.FREE)).toBe(false);
    });

    it('returns true for monthly', () => {
      expect(isPaidPlan(SubscriptionPlan.MONTHLY)).toBe(true);
    });

    it('returns true for annual', () => {
      expect(isPaidPlan(SubscriptionPlan.ANNUAL)).toBe(true);
    });
  });

  describe('hasPremiumFeatures', () => {
    it('returns true for trial', () => {
      expect(hasPremiumFeatures(SubscriptionPlan.TRIAL)).toBe(true);
    });

    it('returns false for free', () => {
      expect(hasPremiumFeatures(SubscriptionPlan.FREE)).toBe(false);
    });

    it('returns true for monthly', () => {
      expect(hasPremiumFeatures(SubscriptionPlan.MONTHLY)).toBe(true);
    });

    it('returns true for annual', () => {
      expect(hasPremiumFeatures(SubscriptionPlan.ANNUAL)).toBe(true);
    });
  });

  describe('getPlanFeatures', () => {
    it('returns features for given plan', () => {
      const trialFeatures = getPlanFeatures(SubscriptionPlan.TRIAL);
      expect(trialFeatures).toBe(PLAN_FEATURES[SubscriptionPlan.TRIAL]);

      const freeFeatures = getPlanFeatures(SubscriptionPlan.FREE);
      expect(freeFeatures).toBe(PLAN_FEATURES[SubscriptionPlan.FREE]);
    });
  });

  describe('isFeatureAvailable', () => {
    it('returns true for boolean features that are true', () => {
      expect(isFeatureAvailable(SubscriptionPlan.TRIAL, 'priceHistory')).toBe(
        true
      );
    });

    it('returns false for boolean features that are false', () => {
      expect(isFeatureAvailable(SubscriptionPlan.FREE, 'priceHistory')).toBe(
        false
      );
    });

    it('returns true for numeric features that are null (unlimited)', () => {
      expect(isFeatureAvailable(SubscriptionPlan.TRIAL, 'maxPantryItems')).toBe(
        true
      );
    });

    it('returns true for numeric features that are > 0', () => {
      expect(isFeatureAvailable(SubscriptionPlan.FREE, 'maxPantryItems')).toBe(
        true
      );
    });
  });
});
