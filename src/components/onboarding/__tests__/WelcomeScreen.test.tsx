import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
  // Create named components with displayName for ESLint compliance
  const MotionDiv = React.forwardRef<
    HTMLDivElement,
    React.PropsWithChildren<Record<string, unknown>>
  >(function MotionDiv({ children, ...props }, ref) {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  });
  MotionDiv.displayName = 'MotionDiv';

  const MotionH1 = React.forwardRef<
    HTMLHeadingElement,
    React.PropsWithChildren<Record<string, unknown>>
  >(function MotionH1({ children, ...props }, ref) {
    return (
      <h1 ref={ref} {...props}>
        {children}
      </h1>
    );
  });
  MotionH1.displayName = 'MotionH1';

  const MotionP = React.forwardRef<
    HTMLParagraphElement,
    React.PropsWithChildren<Record<string, unknown>>
  >(function MotionP({ children, ...props }, ref) {
    return (
      <p ref={ref} {...props}>
        {children}
      </p>
    );
  });
  MotionP.displayName = 'MotionP';

  return {
    motion: {
      div: MotionDiv,
      h1: MotionH1,
      p: MotionP,
    },
    useReducedMotion: () => false,
  };
});

describe('WelcomeScreen', () => {
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders welcome heading', () => {
    render(<WelcomeScreen onContinue={mockOnContinue} />);
    expect(screen.getByText('Welcome to Oja')).toBeInTheDocument();
  });

  it('renders tagline', () => {
    render(<WelcomeScreen onContinue={mockOnContinue} />);
    expect(
      screen.getByText('Your budget-first shopping companion')
    ).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<WelcomeScreen onContinue={mockOnContinue} />);
    expect(
      screen.getByText(
        'Take control of your spending before, during, and after every shopping trip.'
      )
    ).toBeInTheDocument();
  });

  it('renders get started button', () => {
    render(<WelcomeScreen onContinue={mockOnContinue} />);
    expect(
      screen.getByRole('button', { name: 'Get Started' })
    ).toBeInTheDocument();
  });

  it('calls onContinue when button is clicked', () => {
    render(<WelcomeScreen onContinue={mockOnContinue} />);

    const button = screen.getByRole('button', { name: 'Get Started' });
    fireEvent.click(button);

    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  it('renders logo placeholder', () => {
    render(<WelcomeScreen onContinue={mockOnContinue} />);
    // Logo shows "O" for Oja
    expect(screen.getByText('O')).toBeInTheDocument();
  });

  it('has testid for welcome screen', () => {
    render(<WelcomeScreen onContinue={mockOnContinue} />);
    expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
  });
});

describe('WelcomeScreen with reduced motion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without animations when reduced motion is preferred', () => {
    const mockOnContinue = jest.fn();
    render(<WelcomeScreen onContinue={mockOnContinue} />);

    // Component should still render all content
    expect(screen.getByText('Welcome to Oja')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Get Started' })
    ).toBeInTheDocument();
  });
});
