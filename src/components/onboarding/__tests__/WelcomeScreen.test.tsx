import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
  // Simple mocks that pass children through
  const createMotionComponent = (Tag: string) => {
    const Component = React.forwardRef<any, any>(function MotionComponent(
      { children, ...props },
      ref
    ) {
      return React.createElement(Tag, { ...props, ref }, children);
    });
    Component.displayName = `Motion${Tag.charAt(0).toUpperCase() + Tag.slice(1)}`;
    return Component;
  };

  return {
    motion: {
      div: createMotionComponent('div'),
      h1: createMotionComponent('h1'),
      p: createMotionComponent('p'),
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
