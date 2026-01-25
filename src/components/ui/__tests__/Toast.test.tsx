import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast, useToast } from '@/components/ui/Toast';
import { renderHook } from '@testing-library/react';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const {
        onMouseEnter,
        onMouseLeave,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        ...rest
      } = props;
      return (
        <div
          {...rest}
          onMouseEnter={onMouseEnter as React.MouseEventHandler}
          onMouseLeave={onMouseLeave as React.MouseEventHandler}
          onTouchStart={onTouchStart as React.TouchEventHandler}
          onTouchMove={onTouchMove as React.TouchEventHandler}
          onTouchEnd={onTouchEnd as React.TouchEventHandler}
        >
          {children}
        </div>
      );
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useReducedMotion: jest.fn(() => false),
}));

// Mock useSwipe
jest.mock('@/lib/hooks/useSwipe', () => ({
  useSwipe: jest.fn(() => ({
    onTouchStart: jest.fn(),
    onTouchMove: jest.fn(),
    onTouchEnd: jest.fn(),
    swipeOffset: 0,
    isSwiping: false,
    swipeDirection: null,
  })),
}));

describe('Toast', () => {
  const mockOnDismiss = jest.fn();
  const mockOnUndo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Visibility', () => {
    it('renders when isVisible is true', () => {
      render(
        <Toast
          message="Test message"
          isVisible={true}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByTestId('toast')).toBeInTheDocument();
    });

    it('does not render when isVisible is false', () => {
      render(
        <Toast
          message="Test message"
          isVisible={false}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });
  });

  describe('Content', () => {
    it('displays the message', () => {
      render(
        <Toast
          message="Item updated"
          isVisible={true}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText('Item updated')).toBeInTheDocument();
    });

    it('renders the icon', () => {
      render(
        <Toast message="Test" isVisible={true} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('toast-icon')).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(
        <Toast message="Test" isVisible={true} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('toast-close')).toBeInTheDocument();
    });
  });

  describe('Undo functionality', () => {
    it('shows undo button when onUndo is provided', () => {
      render(
        <Toast
          message="Test"
          isVisible={true}
          onDismiss={mockOnDismiss}
          onUndo={mockOnUndo}
        />
      );

      expect(screen.getByTestId('toast-undo')).toBeInTheDocument();
    });

    it('does not show undo button when onUndo is not provided', () => {
      render(
        <Toast message="Test" isVisible={true} onDismiss={mockOnDismiss} />
      );

      expect(screen.queryByTestId('toast-undo')).not.toBeInTheDocument();
    });

    it('calls onUndo when undo button is clicked', () => {
      render(
        <Toast
          message="Test"
          isVisible={true}
          onDismiss={mockOnDismiss}
          onUndo={mockOnUndo}
        />
      );

      fireEvent.click(screen.getByTestId('toast-undo'));

      expect(mockOnUndo).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss after undo', () => {
      render(
        <Toast
          message="Test"
          isVisible={true}
          onDismiss={mockOnDismiss}
          onUndo={mockOnUndo}
        />
      );

      fireEvent.click(screen.getByTestId('toast-undo'));

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Close button', () => {
    it('calls onDismiss when close button is clicked', () => {
      render(
        <Toast message="Test" isVisible={true} onDismiss={mockOnDismiss} />
      );

      fireEvent.click(screen.getByTestId('toast-close'));

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('has accessible label', () => {
      render(
        <Toast message="Test" isVisible={true} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
    });
  });

  describe('Auto-dismiss', () => {
    it('auto-dismisses after default duration (3000ms)', () => {
      render(
        <Toast message="Test" isVisible={true} onDismiss={mockOnDismiss} />
      );

      expect(mockOnDismiss).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('auto-dismisses after custom duration', () => {
      render(
        <Toast
          message="Test"
          isVisible={true}
          onDismiss={mockOnDismiss}
          duration={5000}
        />
      );

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockOnDismiss).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('pauses timer on mouse enter', () => {
      render(
        <Toast
          message="Test"
          isVisible={true}
          onDismiss={mockOnDismiss}
          duration={3000}
        />
      );

      fireEvent.mouseEnter(screen.getByTestId('toast'));

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not have dismissed because timer was paused
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });

    it('resumes timer on mouse leave', () => {
      render(
        <Toast
          message="Test"
          isVisible={true}
          onDismiss={mockOnDismiss}
          duration={3000}
        />
      );

      fireEvent.mouseEnter(screen.getByTestId('toast'));

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      fireEvent.mouseLeave(screen.getByTestId('toast'));

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toast types', () => {
    it('renders success toast', () => {
      render(
        <Toast
          message="Success!"
          type="success"
          isVisible={true}
          onDismiss={mockOnDismiss}
        />
      );

      const content = screen.getByTestId('toast-content');
      expect(content).toHaveClass('bg-emerald-50');
    });

    it('renders info toast', () => {
      render(
        <Toast
          message="Info"
          type="info"
          isVisible={true}
          onDismiss={mockOnDismiss}
        />
      );

      const content = screen.getByTestId('toast-content');
      expect(content).toHaveClass('bg-blue-50');
    });

    it('renders warning toast', () => {
      render(
        <Toast
          message="Warning"
          type="warning"
          isVisible={true}
          onDismiss={mockOnDismiss}
        />
      );

      const content = screen.getByTestId('toast-content');
      expect(content).toHaveClass('bg-amber-50');
    });

    it('renders error toast', () => {
      render(
        <Toast
          message="Error"
          type="error"
          isVisible={true}
          onDismiss={mockOnDismiss}
        />
      );

      const content = screen.getByTestId('toast-content');
      expect(content).toHaveClass('bg-red-50');
    });

    it('defaults to success type', () => {
      render(
        <Toast message="Default" isVisible={true} onDismiss={mockOnDismiss} />
      );

      const content = screen.getByTestId('toast-content');
      expect(content).toHaveClass('bg-emerald-50');
    });
  });

  describe('Accessibility', () => {
    it('has alert role', () => {
      render(
        <Toast message="Test" isVisible={true} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live polite', () => {
      render(
        <Toast message="Test" isVisible={true} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('toast')).toHaveAttribute(
        'aria-live',
        'polite'
      );
    });
  });
});

describe('useToast', () => {
  it('returns initial state with toast hidden', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toast.isVisible).toBe(false);
    expect(result.current.toast.message).toBe('');
    expect(result.current.toast.type).toBe('success');
  });

  it('shows toast with message', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Test message');
    });

    expect(result.current.toast.isVisible).toBe(true);
    expect(result.current.toast.message).toBe('Test message');
  });

  it('shows toast with custom type', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Error!', { type: 'error' });
    });

    expect(result.current.toast.type).toBe('error');
  });

  it('shows toast with undo callback', () => {
    const { result } = renderHook(() => useToast());
    const mockUndo = jest.fn();

    act(() => {
      result.current.showToast('Undoable', { onUndo: mockUndo });
    });

    expect(result.current.toast.onUndo).toBe(mockUndo);
  });

  it('hides toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Test');
    });

    expect(result.current.toast.isVisible).toBe(true);

    act(() => {
      result.current.hideToast();
    });

    expect(result.current.toast.isVisible).toBe(false);
  });

  it('preserves message when hiding', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Test message');
    });

    act(() => {
      result.current.hideToast();
    });

    // Message should be preserved for exit animation
    expect(result.current.toast.message).toBe('Test message');
  });
});
