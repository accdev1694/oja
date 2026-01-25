import { render, screen, fireEvent } from '@testing-library/react';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import { SubscriptionPlan } from '@/lib/types/subscription';

// Mock subscription storage
jest.mock('@/lib/utils/subscriptionStorage', () => ({
  getSubscriptionStatus: jest.fn(),
  getTrialDaysRemaining: jest.fn(),
  getPlanDisplayName: jest.fn((plan: SubscriptionPlan) => {
    const names: Record<SubscriptionPlan, string> = {
      trial: 'Trial',
      free: 'Free',
      monthly: 'Monthly',
      annual: 'Annual',
    };
    return names[plan];
  }),
  formatSubscriptionDate: jest.fn((date: string | null) =>
    date ? '15 Jun 2024' : 'N/A'
  ),
  hasPremiumAccess: jest.fn(),
}));

const mockStorage = jest.requireMock('@/lib/utils/subscriptionStorage');

describe('SubscriptionStatus', () => {
  const mockOnUpgrade = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading state initially', () => {
      mockStorage.getSubscriptionStatus.mockReturnValue(null);
      mockStorage.getTrialDaysRemaining.mockReturnValue(0);
      mockStorage.hasPremiumAccess.mockReturnValue(false);

      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(screen.getByTestId('subscription-loading')).toBeInTheDocument();
    });
  });

  describe('Trial Plan', () => {
    beforeEach(() => {
      mockStorage.getSubscriptionStatus.mockReturnValue({
        plan: SubscriptionPlan.TRIAL,
        trialStartDate: new Date().toISOString(),
        trialEndDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        isActive: true,
      });
      mockStorage.getTrialDaysRemaining.mockReturnValue(7);
      mockStorage.hasPremiumAccess.mockReturnValue(true);
    });

    it('displays trial badge', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(screen.getByTestId('plan-badge')).toHaveTextContent('Trial');
    });

    it('shows trial days remaining', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(screen.getByTestId('trial-banner')).toBeInTheDocument();
      expect(screen.getByText(/7 days left in your trial/)).toBeInTheDocument();
    });

    it('shows singular day when 1 day left', () => {
      mockStorage.getTrialDaysRemaining.mockReturnValue(1);

      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(screen.getByText(/1 day left in your trial/)).toBeInTheDocument();
    });

    it('shows premium features', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(screen.getByText('Unlimited items')).toBeInTheDocument();
    });

    it('shows View Upgrade Options button', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(
        screen.getByRole('button', { name: 'View Upgrade Options' })
      ).toBeInTheDocument();
    });
  });

  describe('Free Plan', () => {
    beforeEach(() => {
      mockStorage.getSubscriptionStatus.mockReturnValue({
        plan: SubscriptionPlan.FREE,
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        isActive: true,
      });
      mockStorage.getTrialDaysRemaining.mockReturnValue(0);
      mockStorage.hasPremiumAccess.mockReturnValue(false);
    });

    it('displays free badge', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(screen.getByTestId('plan-badge')).toHaveTextContent('Free');
    });

    it('shows free tier banner', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(screen.getByTestId('free-tier-banner')).toBeInTheDocument();
      expect(screen.getByText(/You're on the Free plan/)).toBeInTheDocument();
    });

    it('shows limited features', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(screen.getByText('20 items')).toBeInTheDocument();
    });

    it('shows Upgrade to Premium button', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(
        screen.getByRole('button', { name: 'Upgrade to Premium' })
      ).toBeInTheDocument();
    });
  });

  describe('Monthly Plan', () => {
    beforeEach(() => {
      mockStorage.getSubscriptionStatus.mockReturnValue({
        plan: SubscriptionPlan.MONTHLY,
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        isActive: true,
      });
      mockStorage.getTrialDaysRemaining.mockReturnValue(0);
      mockStorage.hasPremiumAccess.mockReturnValue(true);
    });

    it('displays monthly badge', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(screen.getByTestId('plan-badge')).toHaveTextContent('Monthly');
    });

    it('shows paid plan banner', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(screen.getByTestId('paid-plan-banner')).toBeInTheDocument();
      expect(screen.getByText('Premium member')).toBeInTheDocument();
    });

    it('shows renewal date', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(screen.getByText(/Renews on/)).toBeInTheDocument();
    });

    it('shows Manage Subscription button', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(
        screen.getByRole('button', { name: 'Manage Subscription' })
      ).toBeInTheDocument();
    });
  });

  describe('Annual Plan', () => {
    beforeEach(() => {
      mockStorage.getSubscriptionStatus.mockReturnValue({
        plan: SubscriptionPlan.ANNUAL,
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        isActive: true,
      });
      mockStorage.getTrialDaysRemaining.mockReturnValue(0);
      mockStorage.hasPremiumAccess.mockReturnValue(true);
    });

    it('displays annual badge', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(screen.getByTestId('plan-badge')).toHaveTextContent('Annual');
    });
  });

  describe('Interactions', () => {
    beforeEach(() => {
      mockStorage.getSubscriptionStatus.mockReturnValue({
        plan: SubscriptionPlan.FREE,
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        isActive: true,
      });
      mockStorage.getTrialDaysRemaining.mockReturnValue(0);
      mockStorage.hasPremiumAccess.mockReturnValue(false);
    });

    it('calls onUpgrade when upgrade button clicked', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      fireEvent.click(
        screen.getByRole('button', { name: 'Upgrade to Premium' })
      );

      expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
    });
  });

  describe('Feature Display', () => {
    beforeEach(() => {
      mockStorage.getSubscriptionStatus.mockReturnValue({
        plan: SubscriptionPlan.FREE,
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        isActive: true,
      });
      mockStorage.getTrialDaysRemaining.mockReturnValue(0);
      mockStorage.hasPremiumAccess.mockReturnValue(false);
    });

    it('displays all features', () => {
      render(<SubscriptionStatus onUpgrade={mockOnUpgrade} />);

      expect(screen.getByTestId('feature-pantryItems')).toBeInTheDocument();
      expect(screen.getByTestId('feature-shoppingLists')).toBeInTheDocument();
      expect(screen.getByTestId('feature-receiptScanning')).toBeInTheDocument();
      expect(screen.getByTestId('feature-priceHistory')).toBeInTheDocument();
      expect(screen.getByTestId('feature-insights')).toBeInTheDocument();
      expect(screen.getByTestId('feature-exportData')).toBeInTheDocument();
    });
  });
});
