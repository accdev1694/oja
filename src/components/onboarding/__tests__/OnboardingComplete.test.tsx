import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingComplete } from '@/components/onboarding/OnboardingComplete';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    h1: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <h1 {...props}>{children}</h1>
    ),
    p: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <p {...props}>{children}</p>
    ),
  },
  useReducedMotion: jest.fn(() => false),
}));

// Mock onboardingStorage
jest.mock('@/lib/utils/onboardingStorage', () => ({
  getOnboardingSummary: jest.fn(() => ({
    productsCount: 10,
    budget: 5000,
    currency: 'GBP',
    locationEnabled: true,
  })),
  formatBudget: jest.fn((pence: number | null, _currency: string) =>
    pence === null ? 'Not set' : `£${pence / 100}/week`
  ),
}));

describe('OnboardingComplete', () => {
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} />);

      expect(screen.getByTestId('onboarding-complete')).toBeInTheDocument();
    });

    it('displays the celebration title', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} />);

      expect(screen.getByText('Ready to Shop!')).toBeInTheDocument();
    });

    it('displays the subtitle', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} />);

      expect(
        screen.getByText("Your pantry is all set up. Let's save some money!")
      ).toBeInTheDocument();
    });

    it('displays the celebration icon', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} />);

      expect(screen.getByTestId('celebration-icon')).toBeInTheDocument();
    });

    it('displays the Start Shopping button', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} />);

      expect(
        screen.getByRole('button', { name: 'Start Shopping' })
      ).toBeInTheDocument();
    });
  });

  describe('Summary Display', () => {
    it('displays the onboarding summary card', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} />);

      expect(screen.getByTestId('onboarding-summary')).toBeInTheDocument();
    });

    it('displays products count', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} />);

      expect(screen.getByTestId('products-count')).toHaveTextContent(
        '10 items'
      );
    });

    it('displays budget', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} />);

      expect(screen.getByTestId('budget-display')).toHaveTextContent(
        '£50/week'
      );
    });

    it('displays currency', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} />);

      expect(screen.getByTestId('currency-display')).toHaveTextContent('GBP');
    });

    it('displays location status when enabled', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} />);

      expect(screen.getByTestId('location-status')).toHaveTextContent(
        'Enabled'
      );
    });
  });

  describe('Continue Action', () => {
    it('calls onContinue when button is clicked', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} />);

      fireEvent.click(screen.getByRole('button', { name: 'Start Shopping' }));

      expect(mockOnContinue).toHaveBeenCalledTimes(1);
    });

    it('shows loading state when isLoading is true', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} isLoading />);

      expect(screen.getByRole('button')).toHaveTextContent('Setting up...');
    });

    it('disables button when loading', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} isLoading />);

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Confetti Animation', () => {
    it('shows confetti container when motion is allowed', async () => {
      const { useReducedMotion } = jest.requireMock('framer-motion');
      useReducedMotion.mockReturnValue(false);

      render(<OnboardingComplete onContinue={mockOnContinue} />);

      // Wait for confetti delay
      await waitFor(
        () => {
          expect(screen.getByTestId('confetti-container')).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('does not show confetti when reduced motion is preferred', () => {
      const { useReducedMotion } = jest.requireMock('framer-motion');
      useReducedMotion.mockReturnValue(true);

      render(<OnboardingComplete onContinue={mockOnContinue} />);

      expect(
        screen.queryByTestId('confetti-container')
      ).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has descriptive button text', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} />);

      const button = screen.getByRole('button', { name: 'Start Shopping' });
      expect(button).toBeInTheDocument();
    });

    it('party popper has aria-label', () => {
      render(<OnboardingComplete onContinue={mockOnContinue} />);

      expect(screen.getByLabelText('Party popper')).toBeInTheDocument();
    });

    it('confetti container is hidden from screen readers', async () => {
      const { useReducedMotion } = jest.requireMock('framer-motion');
      useReducedMotion.mockReturnValue(false);

      render(<OnboardingComplete onContinue={mockOnContinue} />);

      await waitFor(
        () => {
          const confetti = screen.getByTestId('confetti-container');
          expect(confetti).toHaveAttribute('aria-hidden', 'true');
        },
        { timeout: 500 }
      );
    });
  });
});

describe('OnboardingComplete with different summary states', () => {
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays location as Skipped when not enabled', () => {
    const { getOnboardingSummary } = jest.requireMock(
      '@/lib/utils/onboardingStorage'
    );
    getOnboardingSummary.mockReturnValue({
      productsCount: 5,
      budget: null,
      currency: 'USD',
      locationEnabled: false,
    });

    render(<OnboardingComplete onContinue={mockOnContinue} />);

    expect(screen.getByTestId('location-status')).toHaveTextContent('Skipped');
  });

  it('displays "Not set" when budget is null', () => {
    const { getOnboardingSummary, formatBudget } = jest.requireMock(
      '@/lib/utils/onboardingStorage'
    );
    getOnboardingSummary.mockReturnValue({
      productsCount: 5,
      budget: null,
      currency: 'USD',
      locationEnabled: false,
    });
    formatBudget.mockReturnValue('Not set');

    render(<OnboardingComplete onContinue={mockOnContinue} />);

    expect(screen.getByTestId('budget-display')).toHaveTextContent('Not set');
  });
});
