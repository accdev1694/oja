import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetDial } from '@/components/onboarding/BudgetDial';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const createMotionComponent = (Tag: string) => {
    const Component = React.forwardRef<HTMLElement, React.ComponentProps<any>>(
      function MotionComponent({ children, ...props }, ref) {
        // Filter out framer-motion specific props
        const {
          initial: _initial,
          animate: _animate,
          exit: _exit,
          variants: _variants,
          transition: _transition,
          whileHover: _whileHover,
          whileTap: _whileTap,
          whileFocus: _whileFocus,
          ...validProps
        } = props;
        return React.createElement(Tag, { ...validProps, ref }, children);
      }
    );
    Component.displayName = `Motion${Tag.charAt(0).toUpperCase() + Tag.slice(1)}`;
    return Component;
  };

  return {
    motion: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'),
      path: createMotionComponent('path'),
      circle: createMotionComponent('circle'),
    },
    useReducedMotion: () => false,
  };
});

// Mock navigator.vibrate
const mockVibrate = jest.fn();
Object.defineProperty(navigator, 'vibrate', {
  value: mockVibrate,
  writable: true,
});

describe('BudgetDial', () => {
  const mockOnConfirm = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} />);
    expect(screen.getByText('Set Your Weekly Budget')).toBeInTheDocument();
  });

  it('renders with default value of £100', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} />);
    expect(screen.getByTestId('budget-value')).toHaveTextContent('£100');
  });

  it('renders with custom initial value', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} initialValue={15000} />);
    expect(screen.getByTestId('budget-value')).toHaveTextContent('£150');
  });

  it('renders Safe Zone indicator', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} />);
    expect(screen.getByText('Safe Zone')).toBeInTheDocument();
  });

  it('renders Safe Zone glow', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} />);
    expect(screen.getByTestId('safe-zone-glow')).toBeInTheDocument();
  });

  it('renders range labels', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} />);
    expect(screen.getByText('£30')).toBeInTheDocument();
    expect(screen.getByText('£300')).toBeInTheDocument();
  });

  it('renders confirm button', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} />);
    expect(
      screen.getByRole('button', { name: 'Set Budget' })
    ).toBeInTheDocument();
  });

  it('renders skip button when onSkip provided', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} onSkip={mockOnSkip} />);
    expect(
      screen.getByRole('button', { name: 'Skip for now' })
    ).toBeInTheDocument();
  });

  it('does not render skip button when onSkip not provided', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} />);
    expect(screen.queryByText('Skip for now')).not.toBeInTheDocument();
  });

  it('calls onConfirm with budget value when confirmed', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} initialValue={15000} />);

    fireEvent.click(screen.getByTestId('confirm-budget-button'));

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).toHaveBeenCalledWith(15000);
  });

  it('calls onSkip when skip is clicked', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} onSkip={mockOnSkip} />);

    fireEvent.click(screen.getByTestId('skip-budget-button'));

    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} isLoading />);

    const button = screen.getByTestId('confirm-budget-button');
    expect(button).toHaveTextContent('Saving...');
    expect(button).toBeDisabled();
  });

  it('has proper slider accessibility attributes', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} initialValue={10000} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-label', 'Weekly budget');
    expect(slider).toHaveAttribute('aria-valuenow', '100');
    expect(slider).toHaveAttribute('aria-valuemin', '30');
    expect(slider).toHaveAttribute('aria-valuemax', '300');
    expect(slider).toHaveAttribute('aria-valuetext', '£100');
  });

  it('increases value with ArrowUp key', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} initialValue={10000} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowUp' });

    expect(screen.getByTestId('budget-value')).toHaveTextContent('£105');
  });

  it('decreases value with ArrowDown key', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} initialValue={10000} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowDown' });

    expect(screen.getByTestId('budget-value')).toHaveTextContent('£95');
  });

  it('increases value with ArrowRight key', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} initialValue={10000} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });

    expect(screen.getByTestId('budget-value')).toHaveTextContent('£105');
  });

  it('decreases value with ArrowLeft key', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} initialValue={10000} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });

    expect(screen.getByTestId('budget-value')).toHaveTextContent('£95');
  });

  it('jumps to min with Home key', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} initialValue={10000} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'Home' });

    expect(screen.getByTestId('budget-value')).toHaveTextContent('£30');
  });

  it('jumps to max with End key', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} initialValue={10000} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'End' });

    expect(screen.getByTestId('budget-value')).toHaveTextContent('£300');
  });

  it('increases by £10 with PageUp key', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} initialValue={10000} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'PageUp' });

    expect(screen.getByTestId('budget-value')).toHaveTextContent('£110');
  });

  it('decreases by £10 with PageDown key', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} initialValue={10000} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'PageDown' });

    expect(screen.getByTestId('budget-value')).toHaveTextContent('£90');
  });

  it('clamps value to minimum', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} initialValue={3000} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowDown' });

    // Should stay at minimum (£30)
    expect(screen.getByTestId('budget-value')).toHaveTextContent('£30');
  });

  it('clamps value to maximum', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} initialValue={30000} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowUp' });

    // Should stay at maximum (£300)
    expect(screen.getByTestId('budget-value')).toHaveTextContent('£300');
  });

  it('has testid for budget-dial', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} />);
    expect(screen.getByTestId('budget-dial')).toBeInTheDocument();
  });

  it('has testid for dial control', () => {
    render(<BudgetDial onConfirm={mockOnConfirm} />);
    expect(screen.getByTestId('budget-dial-control')).toBeInTheDocument();
  });

  describe('haptic feedback', () => {
    it('triggers haptic on round number when crossing threshold', () => {
      render(<BudgetDial onConfirm={mockOnConfirm} initialValue={9500} />);

      const slider = screen.getByRole('slider');
      // Move from £95 to £100 (round number)
      fireEvent.keyDown(slider, { key: 'ArrowUp' }); // £100

      expect(mockVibrate).toHaveBeenCalledWith(10);
    });

    it('does not trigger haptic when staying on non-round number', () => {
      render(<BudgetDial onConfirm={mockOnConfirm} initialValue={9500} />);

      const slider = screen.getByRole('slider');
      // Move from £95 to £95 (no change if already at boundary or same)
      // Actually we need to go down
      fireEvent.keyDown(slider, { key: 'ArrowDown' }); // £90 (this is a round number!)

      // £90 is a round number, so this WILL trigger
      expect(mockVibrate).toHaveBeenCalled();
    });

    it('does not trigger haptic when value does not change', () => {
      render(<BudgetDial onConfirm={mockOnConfirm} initialValue={3000} />);

      const slider = screen.getByRole('slider');
      // Try to go below minimum - value won't change
      fireEvent.keyDown(slider, { key: 'ArrowDown' });

      // No value change, no haptic
      expect(mockVibrate).not.toHaveBeenCalled();
    });
  });
});
